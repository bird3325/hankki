
# 한끼 (Hankki) 종합 Database 설정 가이드

본 가이드에는 **회원 탈퇴 시 정보 삭제**, **RLS 재귀 방지**, **이미지 정보가 포함된 식단 템플릿**, 그리고 **푸시 알림 구독 정보 관리**를 위한 전체 SQL 스크립트가 포함되어 있습니다.

## 1. 필수 함수 생성 (보안 권한 데이터 삭제)
```sql
-- 현재 로그인한 사용자가 속한 그룹 ID 목록을 가져오는 함수 (재귀 방지용)
CREATE OR REPLACE FUNCTION public.get_my_groups()
RETURNS SETOF uuid AS $$
BEGIN
  RETURN QUERY 
  SELECT group_id FROM public.family_members WHERE user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- [핵심] 회원 탈퇴 및 전체 데이터 삭제 함수
CREATE OR REPLACE FUNCTION public.delete_current_user()
RETURNS void AS $$
DECLARE
  target_user_id uuid;
BEGIN
  target_user_id := auth.uid();
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION '인증되지 않은 요청입니다.';
  END IF;
  DELETE FROM public.profiles WHERE id = target_user_id;
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## 2. 테이블 스키마 설정

### A. Profiles (사용자 프로필)
```sql
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL PRIMARY KEY,
  email text,
  name text,
  full_name text,
  phone_number text,
  avatar_url text DEFAULT 'https://picsum.photos/200/200',
  target_calories integer DEFAULT 2000,
  settings jsonb DEFAULT '{"enableBabyMode": true, "fastingGoal": 16, "notifications": {"mealReminders": true, "familyActivity": true}, "privacy": {"shareCalories": "public", "shareDiaryCalories": true}}',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
```

### B. Push Subscriptions (푸시 알림 구독 정보)
```sql
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  subscription_data jsonb NOT NULL, -- 브라우저 푸시 구독 객체 (endpoint, keys 등)
  device_info text,                -- 구독이 발생한 기기 정보 (User Agent 등)
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, subscription_data)
);
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own subscriptions" ON public.push_subscriptions FOR ALL USING (auth.uid() = user_id);
```

### C. Templates (자주 먹는 식단)
```sql
CREATE TABLE IF NOT EXISTS public.meal_templates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  food_name text NOT NULL,
  nutrition jsonb NOT NULL,
  ingredients text[],
  image_url text,      -- 템플릿용 음식 이미지 URL
  description text,
  ai_description text,
  ai_tip text,
  ingredient_details jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.meal_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own templates" ON public.meal_templates FOR ALL USING (auth.uid() = user_id);
```

### D. Meals (식단 기록)
```sql
CREATE TABLE IF NOT EXISTS public.meals (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  food_name text NOT NULL,
  type text NOT NULL,
  nutrition jsonb NOT NULL,
  image_url text,
  description text,
  ai_description text,
  ai_tip text,
  ingredients text[],
  ingredient_details jsonb,
  location jsonb,
  sharing_level text DEFAULT 'public', 
  share_diary_calories boolean DEFAULT true,
  is_baby_food boolean DEFAULT false,
  baby_id text,
  baby_name text,
  baby_reaction text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.meals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Meals visibility policy" ON public.meals FOR SELECT USING (user_id = auth.uid() OR sharing_level = 'public' OR (sharing_level = 'partners' AND user_id IN (SELECT user_id FROM family_members WHERE group_id IN (SELECT get_my_groups()))));
CREATE POLICY "Users can manage own meals" ON public.meals FOR ALL USING (auth.uid() = user_id);
```

### E. Family Groups & Social
```sql
CREATE TABLE IF NOT EXISTS public.family_groups (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  invite_code text UNIQUE NOT NULL,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL, 
  baby_profile jsonb DEFAULT '[]',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.family_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Groups are viewable by members" ON public.family_groups FOR SELECT USING (id IN (SELECT get_my_groups()));
CREATE POLICY "Users can create groups" ON public.family_groups FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Creators can update groups" ON public.family_groups FOR UPDATE USING (auth.uid() = created_by);

CREATE TABLE IF NOT EXISTS public.family_members (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id uuid REFERENCES public.family_groups(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text DEFAULT 'member', 
  nickname text,
  joined_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(group_id, user_id)
);
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view group members" ON public.family_members FOR SELECT USING (group_id IN (SELECT get_my_groups()));
CREATE POLICY "Users can join groups" ON public.family_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can manage own membership" ON public.family_members FOR UPDATE OR DELETE USING (auth.uid() = user_id);
```

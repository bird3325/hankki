
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface NutritionInfo {
  calories: number;
  carbs: number; // g
  protein: number; // g
  fat: number; // g
}

export interface DetailedIngredient {
  name: string;
  nutritionEstimate: string;
  benefit: string;
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  text: string;
  timestamp: number;
}

export interface LocationInfo {
  latitude: number;
  longitude: number;
  name?: string; // Restaurant name or recognized place
  type?: 'home' | 'restaurant' | 'other';
}

export interface Meal {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string; // Added field for user avatar URL
  image?: string;
  foodName: string;
  type: MealType;
  timestamp: number;
  nutrition: NutritionInfo;
  description?: string;
  aiDescription?: string; // Added field for AI description
  aiTip?: string; // Added field for AI advice
  ingredients?: string[];
  ingredientDetails?: DetailedIngredient[];
  location?: LocationInfo; // Added location info
  likes: string[]; // Array of userIds who liked
  comments: Comment[]; // Array of comment objects
  sharingLevel?: 'public' | 'partners' | 'private'; // Replaced isShared with granular level
  shareDiaryCalories?: boolean; // New field for granular privacy
  isBabyFood?: boolean;
  babyId?: string; // 아기 고유 ID 추가
  babyName?: string; // 어떤 아기의 식단인지 구분용
  babyReaction?: 'good' | 'bad' | 'soso'; // Added field for baby reaction
}

export interface MealTemplate {
  id: string;
  name: string; // Display name for the template
  foodName: string;
  nutrition: NutritionInfo;
  ingredients: string[];
  image?: string; // 템플릿 이미지 필드 추가
  description?: string;
  aiDescription?: string; // AI 분석 내용 보존을 위해 추가
  aiTip?: string;         // AI 팁 보존을 위해 추가
  ingredientDetails?: DetailedIngredient[]; // 재료별 상세 정보 보존을 위해 추가
}

export interface BabyLog {
  id: string;
  timestamp: number;
  imageUrl?: string;
  menuName: string;
  amount: number; // ml or g
  reaction: 'good' | 'bad' | 'soso';
  ingredients: string[];
}

export interface UserProfile {
  id: string;
  email?: string; // 이메일 필드 추가
  name: string;   // 닉네임으로 사용
  fullName?: string; // 실명 추가
  avatar: string;
  targetCalories: number;
  role: 'user' | 'partner' | 'parent';
  ageRange?: string;
  gender?: 'male' | 'female';
  createdAt?: string;
  weight?: number; // kg
  height?: number; // cm
  activityLevel?: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  phoneNumber?: string;
  fastingGoal?: number; // 프로필 정보로 통합
}

export interface BabyProfile {
  id?: string; // 고유 ID 필드 추가
  name: string;
  birthDate: string;
  allergies: string[];
  avatar?: string;
}

export interface AppSettings {
  enableBabyMode: boolean; // Toggle for baby features
  fastingGoal: number; // 공복 목표 시간 (기존 유지하되 프로필과 동기화)
  notifications: {
    mealReminders: boolean;
    mealTimes: {
      breakfast: string;
      lunch: string;
      dinner: string;
    };
    familyActivity: boolean;
    marketing: boolean;
  };
  privacy: {
    shareCalories: 'public' | 'partners' | 'private'; // Updated to 3 levels
    shareDiaryCalories: boolean; // New setting for diary sharing
  };
}

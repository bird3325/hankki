import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Stats from './components/Stats';
import Social from './components/Social';
import Diary from './components/Diary';
import MealEntry from './components/MealEntry';
import MealDetail from './components/MealDetail';
import Profile from './components/Profile';
import FamilyManager from './components/FamilyManager';
import Settings from './components/Settings';
import Login from './components/Login';
import Signup from './components/Signup';
import EditProfile from './components/EditProfile';
import { Meal, UserProfile, BabyProfile, MealTemplate, AppSettings } from './types';
import { useModal } from './components/GlobalModal';
import { supabase, uploadImage, dataURLtoFile } from './lib/supabase';
import { RefreshCw, WifiOff } from 'lucide-react';

const DEFAULT_SETTINGS: AppSettings = {
  enableBabyMode: true,
  fastingGoal: 16,
  notifications: {
    mealReminders: true,
    mealTimes: {
      breakfast: '08:00',
      lunch: '12:00',
      dinner: '18:00'
    },
    familyActivity: true,
    marketing: false,
  },
  privacy: {
    shareCalories: 'public',
    shareDiaryCalories: true
  }
};

const App: React.FC = () => {
  const { showAlert, showConfirm } = useModal();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authView, setAuthView] = useState<'login' | 'signup'>('login');

  const [activeTab, setActiveTab] = useState('dashboard');
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isFamilyManagerOpen, setIsFamilyManagerOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [templates, setTemplates] = useState<MealTemplate[]>([]);
  
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isRecursionErrorShown, setIsRecursionErrorShown] = useState(false);
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [isNetworkError, setIsNetworkError] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const [user, setUser] = useState<UserProfile>({
    id: '',
    email: '',
    name: 'Guest',
    fullName: '',
    avatar: 'https://picsum.photos/200/200',
    targetCalories: 2200,
    role: 'user',
    ageRange: '1995-01-01',
    gender: 'female',
    createdAt: new Date().toISOString(),
    fastingGoal: 16
  });

  const [babyProfiles, setBabyProfiles] = useState<BabyProfile[]>([]);
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);
  const [familyGroupCreatedAt, setFamilyGroupCreatedAt] = useState<string | null>(null);

  const handleDBError = useCallback((message: string) => {
    if (message.includes('infinite recursion')) {
        if (!isRecursionErrorShown) {
            setIsRecursionErrorShown(true);
            setIsMaintenanceMode(true);
            showAlert('데이터베이스 보안 정책 에러가 감지되었습니다.\nDB_GUIDE.md 파일의 SQL을 실행하여 재설정이 필요합니다.', { title: 'DB 설정 필요' });
        }
        console.error('CRITICAL: DB RLS Recursion Error detected.');
    } else if (message.includes('Failed to fetch') || message.includes('fetch')) {
        setIsNetworkError(true);
    } else {
        console.error('DB Error:', message);
    }
  }, [isRecursionErrorShown, showAlert]);

  const fetchMeals = useCallback(async () => {
    if (isMaintenanceMode) return;
    try {
        const { data, error } = await supabase
            .from('meals')
            .select(`
                *,
                profiles!user_id (name, avatar_url, settings),
                meal_likes (user_id),
                meal_comments (
                    id,
                    user_id,
                    text,
                    created_at,
                    profiles!user_id (name)
                )
            `)
            .order('created_at', { ascending: false });

        if (error) {
            handleDBError(error.message);
            throw error;
        }

        if (data) {
            const mappedMeals: Meal[] = data.map((item: any) => {
                let ingredientDetails = [];
                try {
                    ingredientDetails = typeof item.ingredient_details === 'string' 
                        ? JSON.parse(item.ingredient_details) 
                        : (item.ingredient_details || []);
                } catch (e) {
                    console.warn("Failed to parse ingredient_details:", e);
                }

                return {
                    id: item.id,
                    userId: item.user_id,
                    userName: item.profiles?.name || 'Unknown',
                    userAvatar: item.profiles?.avatar_url,
                    image: item.image_url,
                    foodName: item.food_name,
                    type: item.type,
                    timestamp: new Date(item.created_at).getTime(),
                    nutrition: item.nutrition,
                    description: item.description,
                    aiDescription: item.ai_description,
                    // Fix: Map database field ai_tip to Meal interface property aiTip
                    aiTip: item.ai_tip,
                    ingredients: item.ingredients || [],
                    ingredientDetails: ingredientDetails,
                    location: item.location,
                    likes: item.meal_likes ? item.meal_likes.map((l: any) => l.user_id) : [],
                    comments: item.meal_comments ? item.meal_comments.map((c: any) => ({
                        id: c.id,
                        userId: c.user_id,
                        userName: c.profiles?.name || 'Unknown',
                        text: c.text,
                        timestamp: new Date(c.created_at).getTime()
                    })).sort((a: any, b: any) => a.timestamp - b.timestamp) : [],
                    sharingLevel: item.sharing_level,
                    shareDiaryCalories: item.share_diary_calories ?? false,
                    isBabyFood: item.is_baby_food,
                    babyId: item.baby_id,
                    babyName: item.baby_name,
                    babyReaction: item.baby_reaction
                };
            });
            setMeals(mappedMeals);
            setIsNetworkError(false);
        }
    } catch (error: any) {
        if (error.message?.includes('fetch')) setIsNetworkError(true);
    }
  }, [handleDBError, isMaintenanceMode]);

  const fetchFamilyGroup = useCallback(async (userId: string) => {
    if (isMaintenanceMode) return;
    try {
        const { data: memberships, error: memError } = await supabase
            .from('family_members')
            .select('group_id')
            .eq('user_id', userId);

        if (memError) {
            handleDBError(memError.message);
            throw memError;
        }

        if (memberships && memberships.length > 0) {
            const groupIds = memberships.map(m => m.group_id);
            const { data: groupsData, error: grpError } = await supabase
                .from('family_groups')
                .select('*')
                .in('id', groupIds);

            if (grpError) throw grpError;

            if (groupsData) {
                const allBabyProfiles: BabyProfile[] = [];
                groupsData.forEach(group => {
                    if (group.baby_profile) {
                        const profiles = Array.isArray(group.baby_profile) 
                            ? group.baby_profile 
                            : [group.baby_profile];
                        allBabyProfiles.push(...profiles);
                    }
                });
                const uniqueBabyProfiles = Array.from(new Map(allBabyProfiles.map(p => [p.id || p.name, p])).values());
                setBabyProfiles(uniqueBabyProfiles);
                if (groupsData.length > 0) {
                    setFamilyGroupCreatedAt(groupsData[0].created_at);
                }
            }

            const { data: membersData, error: mbrError } = await supabase
                .from('family_members')
                .select(`
                    user_id,
                    role,
                    group_id,
                    nickname,
                    profiles!user_id (name, avatar_url, target_calories)
                `)
                .in('group_id', groupIds);
            
            if (mbrError) throw mbrError;
            
            if (membersData) {
                const allMembersMap = new Map();
                membersData.forEach((m: any) => {
                    const memberId = m.user_id;
                    if (!allMembersMap.has(memberId)) {
                        allMembersMap.set(memberId, {
                            id: m.user_id,
                            name: m.nickname || m.profiles?.name || 'Unknown',
                            avatar: m.profiles?.avatar_url,
                            targetCalories: m.profiles?.target_calories || 2200,
                            role: m.role
                        });
                    }
                });
                setFamilyMembers(Array.from(allMembersMap.values()));
            }
        } else {
            setFamilyMembers([]);
            setBabyProfiles([]);
        }
    } catch (error: any) {
        if (error.message?.includes('fetch')) setIsNetworkError(true);
    }
  }, [handleDBError, isMaintenanceMode]);

  const fetchUserProfile = useCallback(async (userId: string) => {
    if (userId === 'demo-user-id' || isMaintenanceMode) return;
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .maybeSingle();
        
        if (error) {
            if (error.message?.includes('fetch')) setIsNetworkError(true);
            throw error;
        }

        if (data) {
            const dbSettings = data.settings || {};
            const mergedSettings: AppSettings = {
                ...DEFAULT_SETTINGS,
                ...dbSettings,
                notifications: {
                    ...DEFAULT_SETTINGS.notifications,
                    ...(dbSettings.notifications || {}),
                    mealTimes: {
                        ...DEFAULT_SETTINGS.notifications.mealTimes,
                        ...(dbSettings.notifications?.mealTimes || {})
                    }
                },
                privacy: {
                    ...DEFAULT_SETTINGS.privacy,
                    ...(dbSettings.privacy || {})
                }
            };
            
            setUser({
                id: data.id,
                email: data.email,
                name: data.name || 'User',
                fullName: data.full_name || '',
                avatar: data.avatar_url || 'https://picsum.photos/200/200',
                targetCalories: data.target_calories || 2200,
                role: 'user',
                ageRange: data.age_range || '1995-01-01',
                gender: data.gender || 'female',
                createdAt: data.created_at,
                weight: data.weight,
                height: data.height,
                activityLevel: data.activity_level || 'moderate',
                phoneNumber: data.phone_number,
                fastingGoal: mergedSettings.fastingGoal || 16
            } as any);

            setSettings(mergedSettings);
            fetchFamilyGroup(userId);
            setIsNetworkError(false);
        }
    } catch (error: any) {
        console.error('Error fetching profile:', error.message);
    }
  }, [fetchFamilyGroup, isMaintenanceMode]);

  const fetchTemplates = useCallback(async (userId: string) => {
    if (userId === 'demo-user-id' || isMaintenanceMode) return;
    try {
        const { data, error } = await supabase
            .from('meal_templates')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        
        if (data) {
            const mappedTemplates: MealTemplate[] = data.map((t: any) => ({
                id: t.id,
                name: t.name,
                foodName: t.food_name,
                nutrition: t.nutrition,
                ingredients: t.ingredients || [],
                image: t.image_url, 
                description: t.description,
                aiDescription: t.ai_description,
                aiTip: t.ai_tip,
                ingredientDetails: t.ingredient_details
            }));
            setTemplates(mappedTemplates);
        }
    } catch (error: any) {
        console.error('Error fetching templates:', error.message);
    }
  }, [isMaintenanceMode]);

  const refreshAppData = useCallback(async () => {
      setIsRefreshing(true);
      try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
              await Promise.all([
                  fetchUserProfile(session.user.id),
                  fetchMeals(),
                  fetchTemplates(session.user.id)
              ]);
          }
          setIsNetworkError(false);
      } catch (e) {
          setIsNetworkError(true);
      } finally {
          setIsRefreshing(false);
      }
  }, [fetchUserProfile, fetchMeals, fetchTemplates]);

  useEffect(() => {
    const checkSession = async () => {
        try {
            const { data: { session }, error } = await supabase.auth.getSession();
            if (error) {
                if (error.message?.includes('fetch')) setIsNetworkError(true);
                throw error;
            }

            if (session) {
                fetchUserProfile(session.user.id);
                setIsAuthenticated(true);
                fetchMeals();
                fetchTemplates(session.user.id);
            }
        } catch (err) {
            setIsAuthenticated(false);
        }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        fetchUserProfile(session.user.id);
        setIsAuthenticated(true);
        fetchMeals();
        fetchTemplates(session.user.id);
      } else if (user.id !== 'demo-user-id') {
        setIsAuthenticated(false);
        resetState();
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchMeals, fetchUserProfile, fetchTemplates]);

  useEffect(() => {
    if (!isAuthenticated || !user.id || user.id === 'demo-user-id' || isMaintenanceMode) return;

    const channel = supabase
      .channel('db-realtime-feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meals' }, () => fetchMeals())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meal_likes' }, () => fetchMeals())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meal_comments' }, () => fetchMeals())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'family_members' }, () => fetchFamilyGroup(user.id))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'family_groups' }, () => fetchFamilyGroup(user.id))
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [isAuthenticated, user.id, fetchMeals, fetchFamilyGroup, isMaintenanceMode]);

  const resetState = () => {
    setUser({ id: '', email: '', name: 'Guest', fullName: '', avatar: '', targetCalories: 2200, role: 'user', createdAt: new Date().toISOString() });
    setMeals([]);
    setTemplates([]);
    setBabyProfiles([]);
    setFamilyMembers([]);
    setIsMaintenanceMode(false);
    setIsRecursionErrorShown(false);
    setIsNetworkError(false);
  };

  const handleLogin = (userData: any) => {
      if (userData.id === 'demo-user-id') {
          setUser({ ...user, ...userData, createdAt: new Date().toISOString() });
          setIsAuthenticated(true);
          fetchMeals();
      } else {
          fetchUserProfile(userData.id);
          setIsAuthenticated(true);
          fetchMeals();
          fetchTemplates(userData.id);
      }
  };

  const handleSignup = (userData: any) => {
      fetchUserProfile(userData.id);
      setIsAuthenticated(true);
      fetchMeals();
      fetchTemplates(userData.id);
  };

  const handleSaveMeal = async (newMeal: Omit<Meal, 'id'>) => {
    if (user.id === 'demo-user-id') {
        showAlert('데모 계정에서는 식단 저장이 불가능합니다.');
        return;
    }
    let imageUrl = newMeal.image;
    if (newMeal.image && newMeal.image.startsWith('data:')) {
        try {
            const file = dataURLtoFile(newMeal.image, `meal_${Date.now()}.jpg`);
            const uploadedUrl = await uploadImage(file);
            if (uploadedUrl) imageUrl = uploadedUrl;
        } catch (error) { console.error(error); }
    }
    try {
        const { error } = await supabase
            .from('meals')
            .insert([{
                user_id: user.id,
                food_name: newMeal.foodName,
                type: newMeal.type,
                nutrition: newMeal.nutrition,
                image_url: imageUrl,
                description: newMeal.description,
                ai_description: newMeal.aiDescription,
                ai_tip: newMeal.aiTip,
                ingredients: newMeal.ingredients,
                ingredient_details: newMeal.ingredientDetails,
                location: newMeal.location,
                sharing_level: newMeal.sharingLevel,
                share_diary_calories: newMeal.shareDiaryCalories,
                is_baby_food: newMeal.isBabyFood,
                baby_id: newMeal.babyId,
                baby_name: newMeal.babyName,
                baby_reaction: newMeal.babyReaction
            }]);
        if (error) throw error;
        setActiveTab('diary');
    } catch (e: any) {
        showAlert('저장 중 오류가 발생했습니다.');
    }
  };

  const handleUpdateMeal = async (updatedMeal: Meal) => {
    if (user.id === 'demo-user-id') return;
    try {
        const { error } = await supabase
            .from('meals')
            .update({
                food_name: updatedMeal.foodName,
                type: updatedMeal.type,
                nutrition: updatedMeal.nutrition,
                description: updatedMeal.description,
                ingredients: updatedMeal.ingredients,
                ingredient_details: updatedMeal.ingredientDetails,
                location: updatedMeal.location,
                baby_id: updatedMeal.babyId,
                baby_name: updatedMeal.babyName,
                baby_reaction: updatedMeal.babyReaction, 
                sharing_level: updatedMeal.sharingLevel,
                share_diary_calories: updatedMeal.shareDiaryCalories,
                // Fix: Access Meal property isBabyFood instead of is_baby_food
                is_baby_food: updatedMeal.isBabyFood
            })
            .eq('id', updatedMeal.id);
        if (error) throw error;
    } catch (e: any) { console.error(e); }
  };

  const handleDeleteMeal = async (id: string) => {
    if (user.id === 'demo-user-id') return;
    const confirmed = await showConfirm('정말 이 식단 기록을 삭제하시겠습니까?');
    if (confirmed) {
      try {
        await supabase.from('meals').delete().eq('id', id);
        if (selectedMeal?.id === id) setSelectedMeal(null);
      } catch (error: any) { showAlert('삭제 실패'); }
    }
  };

  const handleShareMeal = async (id: string) => {
      if (user.id === 'demo-user-id') return;
      try {
          await supabase.from('meals').update({ sharing_level: 'public' }).eq('id', id);
          showAlert('식단이 공유되었습니다!');
      } catch(e: any) { showAlert('공유 실패'); }
  };

  const handleLikeMeal = async (mealId: string) => {
    if (user.id === 'demo-user-id') return;
    const meal = meals.find(m => m.id === mealId);
    if (!meal) return;
    const isLiked = meal.likes.includes(user.id);
    try {
        if (isLiked) {
            await supabase.from('meal_likes').delete().eq('meal_id', mealId).eq('user_id', user.id);
        } else {
            await supabase.from('meal_likes').insert([{ meal_id: mealId, user_id: user.id }]);
        }
    } catch (error) { console.error(error); }
  };

  const handleAddComment = async (mealId: string, text: string) => {
    if (user.id === 'demo-user-id') return;
    try {
        await supabase.from('meal_comments').insert([{ meal_id: mealId, user_id: user.id, text: text }]);
    } catch (e: any) { console.error(e); }
  };

  const handleSaveTemplate = async (meal: Meal, templateName: string) => {
    if (user.id === 'demo-user-id') return;
    try {
        const { data, error } = await supabase
            .from('meal_templates')
            .insert([{
                user_id: user.id,
                name: templateName,
                food_name: meal.foodName,
                nutrition: meal.nutrition,
                ingredients: meal.ingredients || [],
                image_url: meal.image, 
                ai_description: meal.aiDescription,
                ai_tip: meal.aiTip,
                ingredient_details: meal.ingredientDetails
            }])
            .select().single();

        if (error) throw error;
        if (data) {
            const newTemplate: MealTemplate = { 
                id: data.id, 
                name: data.name, 
                foodName: data.food_name, 
                nutrition: data.nutrition, 
                ingredients: data.ingredients || [],
                image: data.image_url, 
                aiDescription: data.ai_description,
                aiTip: data.ai_tip,
                ingredientDetails: data.ingredient_details
            };
            setTemplates(prev => [newTemplate, ...prev]);
            showAlert('자주 먹는 식단으로 저장되었습니다.');
        }
    } catch (e: any) { 
        console.error(e); 
        showAlert('템플릿 저장 중 오류가 발생했습니다.');
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (user.id === 'demo-user-id') return;
    const confirmed = await showConfirm('이 템플릿을 삭제하시겠습니까?');
    if (confirmed) {
        try {
            await supabase.from('meal_templates').delete().eq('id', id);
            setTemplates(prev => prev.filter(t => t.id !== id));
        } catch (e: any) { console.error(e); }
    }
  };
  
  const handleUpdateProfile = async (updatedUser: UserProfile) => {
    if (user.id === 'demo-user-id') {
        setUser(updatedUser);
        return;
    }
    let avatarUrl = updatedUser.avatar;
    if (avatarUrl && avatarUrl.startsWith('data:')) {
        try {
            const file = dataURLtoFile(avatarUrl, `avatar_${user.id}_${Date.now()}.jpg`);
            const uploadedUrl = await uploadImage(file, 'meal_images'); 
            if (uploadedUrl) avatarUrl = uploadedUrl;
        } catch (error) { console.error(error); }
    }
    
    const newSettings = { ...settings, fastingGoal: updatedUser.fastingGoal || settings.fastingGoal };
    setSettings(newSettings);

    const updateData: any = {
        name: updatedUser.name,
        full_name: updatedUser.fullName,
        target_calories: Number(updatedUser.targetCalories) || 2000,
        avatar_url: avatarUrl,
        age_range: updatedUser.ageRange,
        gender: updatedUser.gender,
        activity_level: updatedUser.activityLevel,
        phone_number: updatedUser.phoneNumber,
        settings: newSettings 
    };
    if (updatedUser.weight !== undefined) updateData.weight = Number(updatedUser.weight);
    if (updatedUser.height !== undefined) updateData.height = Number(updatedUser.height);

    try {
        await supabase.from('profiles').update(updateData).eq('id', updatedUser.id);
        setUser({ ...updatedUser, avatar: avatarUrl });
        await fetchFamilyGroup(updatedUser.id);
        showAlert('프로필이 업데이트되었습니다.');
    } catch (error: any) { showAlert('정보 수정 중 오류가 발생했습니다.'); }
  };
  
  const handleUpdateSettings = async (newSettings: AppSettings) => {
    setSettings(newSettings);
    if (newSettings.fastingGoal !== user.fastingGoal) {
        setUser(prev => ({ ...prev, fastingGoal: newSettings.fastingGoal }));
    }
    if (user.id && user.id !== 'demo-user-id') {
        try { await supabase.from('profiles').update({ settings: newSettings }).eq('id', user.id); } catch (e) { console.error(e); }
    }
  };

  const handleLogout = async () => {
    const confirmed = await showConfirm('로그아웃 하시겠습니까?');
    if (confirmed) {
        if (user.id !== 'demo-user-id') await supabase.auth.signOut();
        setIsAuthenticated(false);
        setAuthView('login');
        resetState();
    }
  };

  const handleDeleteAccount = async () => {
    if (user.id === 'demo-user-id') {
        showAlert('데모 계정은 탈퇴할 수 없습니다.');
        return;
    }

    const confirmed = await showConfirm('정말 한끼에서 탈퇴하시겠습니까?\n모든 식단 기록과 프로필 정보가 영구히 삭제되며 복구할 수 없습니다.', {
        title: '회원 탈퇴 확인',
        confirmText: '탈퇴하기',
        cancelText: '취소'
    });

    if (confirmed) {
        setIsRefreshing(true);
        try {
            const { error: rpcError } = await supabase.rpc('delete_current_user');
            if (rpcError) throw rpcError;
            await supabase.auth.signOut();
            setIsAuthenticated(false);
            setAuthView('login');
            resetState();
            showAlert('탈퇴가 정상적으로 처리되었습니다. 그동안 이용해주셔서 감사합니다.');
        } catch (error: any) {
            console.error('Account deletion error:', error);
            showAlert('탈퇴 처리 중 오류가 발생했습니다. 잠시 후 다시 시도하거나 고객센터로 문의해주세요.');
        } finally {
            setIsRefreshing(false);
        }
    }
  };

  const { cleanStreak, monthlyBurned } = useMemo(() => {
    if (!user.id) return { cleanStreak: 0, monthlyBurned: 0 };
    const myMeals = meals.filter(m => m.userId === user.id && !m.isBabyFood);
    const dailyCalories: Record<string, number> = {};
    myMeals.forEach(m => {
        const dateKey = new Date(m.timestamp).toLocaleDateString('en-CA');
        dailyCalories[dateKey] = (dailyCalories[dateKey] || 0) + m.nutrition.calories;
    });
    let streak = 0;
    const today = new Date();
    let checkDate = new Date(today);
    for (let i = 0; i < 30; i++) {
        const dateKey = checkDate.toLocaleDateString('en-CA');
        const dayCalories = dailyCalories[dateKey] || 0;
        if (dayCalories >= user.targetCalories * 0.8 && dayCalories <= user.targetCalories * 1.1) {
            streak++;
            checkDate.setDate(checkDate.getDate() - 1);
        } else {
            if (i === 0 && dayCalories === 0) { checkDate.setDate(checkDate.getDate() - 1); continue; }
            break;
        }
    }
    // 소모 칼로리 계산 보정: 개별 사용자 목표 칼로리에 경과 일수를 곱하여 계산
    const calculatedMonthlyBurned = user.targetCalories * today.getDate();
    return { cleanStreak: streak, monthlyBurned: calculatedMonthlyBurned };
  }, [meals, user]);

  const handleManageFamily = () => { setIsProfileOpen(false); setIsFamilyManagerOpen(true); };
  const handleBackToProfile = () => { setIsFamilyManagerOpen(false); setIsProfileOpen(true); };
  const handleEditProfile = () => { setIsProfileOpen(false); setIsEditProfileOpen(true); };
  const handleBackToProfileFromEdit = () => { setIsEditProfileOpen(false); setIsProfileOpen(true); };
  const handleOpenSettings = () => { setIsProfileOpen(false); setIsSettingsOpen(true); };
  const handleBackToProfileFromSettings = () => { setIsSettingsOpen(false); setIsProfileOpen(true); };

  if (!isAuthenticated) {
    return authView === 'login' 
      ? <Login onLogin={handleLogin} onSignupClick={() => setAuthView('signup')} />
      : <Signup onSignup={handleSignup} onLoginClick={() => setAuthView('login')} />;
  }

  if (isNetworkError) {
      return (
          <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center animate-[fadeIn_0.3s_ease-out]">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6 text-gray-400">
                  <WifiOff size={40} />
              </div>
              <h2 className="text-2xl font-black text-gray-900 mb-3 tracking-tight">연결 상태를 확인해 주세요</h2>
              <p className="text-gray-500 text-[15px] mb-10 leading-relaxed">
                  서버에 연결할 수 없습니다.<br/>
                  인터넷 연결이 불안정하거나 Supabase 프로젝트가<br/>
                  일시 중지되었을 수 있습니다.
              </p>
              <button 
                onClick={refreshAppData}
                disabled={isRefreshing}
                className="w-full max-w-xs bg-gray-900 text-white py-4 rounded-2xl font-black text-lg shadow-xl shadow-gray-100 flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                  {isRefreshing ? <RefreshCw className="animate-spin" size={20} /> : <RefreshCw size={20} />}
                  다시 시도하기
              </button>
              <button onClick={() => window.location.reload()} className="mt-6 text-sm font-bold text-gray-400 underline">페이지 새로고침</button>
          </div>
      );
  }

  return (
    <>
      <Layout 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        onCameraClick={() => setIsCameraOpen(true)}
        onProfileClick={() => {
          refreshAppData();
          setIsProfileOpen(true);
        }}
        profileImage={user.avatar}
        isRefreshing={isRefreshing}
      >
        {activeTab === 'dashboard' && (
          <Dashboard 
            meals={meals.filter(m => m.userId === user.id)} 
            targetCalories={user.targetCalories} 
            onDelete={handleDeleteMeal}
            onShare={handleShareMeal}
            onUpdateMeal={handleUpdateMeal}
            onMealClick={setSelectedMeal}
            currentUserId={user.id}
            userName={user.name}
            enableBabyMode={settings.enableBabyMode}
            babyProfiles={babyProfiles}
            settings={settings}
          />
        )}
        {activeTab === 'stats' && (
          <Stats 
            meals={meals.filter(m => m.userId === user.id)} 
            targetCalories={user.targetCalories} 
            babyProfiles={babyProfiles}
            enableBabyMode={settings.enableBabyMode}
          />
        )}
        {activeTab === 'social' && (
          <Social 
            allMeals={meals} 
            currentUserId={user.id}
            userAvatar={user.avatar}
            onLike={handleLikeMeal}
            onComment={handleAddComment}
            onUpdateMeal={handleUpdateMeal}
            settings={settings}
            onDelete={handleDeleteMeal}
            babyProfiles={babyProfiles}
            familyMembers={familyMembers}
            cleanStreak={cleanStreak}
            monthlyBurned={monthlyBurned}
            groupCreatedAt={familyGroupCreatedAt}
            onManageFamily={handleManageFamily}
          />
        )}
        {activeTab === 'diary' && (
            <Diary 
                meals={meals} 
                currentUserId={user.id}
                onMealClick={setSelectedMeal} 
                onUpdateMeal={handleUpdateMeal}
                enableBabyMode={settings.enableBabyMode}
                babyProfiles={babyProfiles}
                familyMembers={familyMembers}
                onUpdateBabyProfile={(p) => setBabyProfiles(babyProfiles.map(bp => bp.id === p.id ? p : bp))}
            />
        )}
      </Layout>

      {isCameraOpen && (
        <MealEntry 
            onClose={() => setIsCameraOpen(false)} 
            onSave={handleSaveMeal}
            hasBabyProfile={babyProfiles.length > 0 && settings.enableBabyMode}
            babyProfiles={babyProfiles}
            templates={templates}
            onDeleteTemplate={handleDeleteTemplate}
            initialPrivacySettings={settings.privacy}
        />
      )}

      {selectedMeal && (
        <MealDetail 
          meal={meals.find(m => m.id === selectedMeal.id) || selectedMeal} 
          templates={templates}
          currentUserId={user.id}
          onClose={() => setSelectedMeal(null)}
          onDelete={handleDeleteMeal}
          onShare={handleShareMeal}
          onSaveTemplate={handleSaveTemplate}
          onUpdate={handleUpdateMeal}
        />
      )}

      {isProfileOpen && (
        <Profile 
          user={user} 
          onClose={() => setIsProfileOpen(false)}
          onUpdate={handleUpdateProfile}
          onManageFamily={handleManageFamily}
          onEditProfile={handleEditProfile}
          onSettings={handleOpenSettings}
          onLogout={handleLogout}
        />
      )}
      
      {isFamilyManagerOpen && (
          <FamilyManager 
            user={user}
            babyProfiles={babyProfiles}
            enableBabyMode={settings.enableBabyMode}
            onUpdateBabyProfiles={setBabyProfiles}
            onToggleBabyMode={() => handleUpdateSettings({...settings, enableBabyMode: !settings.enableBabyMode})}
            onBack={handleBackToProfile}
            onClose={() => setIsFamilyManagerOpen(false)}
          />
      )}

      {isEditProfileOpen && (
        <EditProfile 
            user={user}
            email={user.email || '이메일 정보 없음'}
            onSave={handleUpdateProfile}
            onClose={handleBackToProfileFromEdit}
        />
      )}

      {isSettingsOpen && (
        <Settings 
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            onLogout={handleLogout}
            onDeleteAccount={handleDeleteAccount}
            onBack={handleBackToProfileFromSettings}
            onClose={() => setIsSettingsOpen(false)}
        />
      )}
    </>
  );
};

export default App;

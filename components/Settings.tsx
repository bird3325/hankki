
import React, { useState } from 'react';
import { ArrowLeft, Bell, FileText, LogOut, Trash2, ChevronRight, Shield, Baby, Lock, Globe, Users, BookOpen, Clock } from 'lucide-react';
import { AppSettings } from '../types';
import TimePicker from './TimePicker';
import TermsOfService from './TermsOfService';
import PrivacyPolicy from './PrivacyPolicy';
import { useModal } from './GlobalModal';
import { supabase } from '../lib/supabase';

interface SettingsProps {
  settings: AppSettings;
  onUpdateSettings: (settings: AppSettings) => void;
  onLogout: () => void;
  onDeleteAccount: () => void;
  onBack: () => void;
  onClose: () => void;
}

const Settings: React.FC<SettingsProps> = ({
  settings,
  onUpdateSettings,
  onLogout,
  onDeleteAccount,
  onBack,
  onClose
}) => {
  const { showAlert } = useModal();
  const [editingTime, setEditingTime] = useState<{ type: 'breakfast' | 'lunch' | 'dinner', value: string } | null>(null);
  const [currentView, setCurrentView] = useState<'main' | 'terms' | 'privacy'>('main');

  const DEFAULT_TIMES = {
    breakfast: '08:00',
    lunch: '12:00',
    dinner: '18:00'
  };

  const savePushSubscription = async (subscription: PushSubscription) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('push_subscriptions').upsert({
        user_id: user.id,
        subscription_data: JSON.parse(JSON.stringify(subscription)),
        device_info: navigator.userAgent,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id, subscription_data' });

    } catch (error) {
      console.error("Failed to save push subscription:", error);
    }
  };

  const toggleNotification = async (key: keyof typeof settings.notifications) => {
    if (key === 'mealTimes') return;

    const newValue = !settings.notifications[key];

    // UI 상태를 먼저 변경하여 사용자 경험을 개선합니다.
    // 브라우저 권한 이슈로 인해 스위치가 작동하지 않는 현상을 방지합니다.
    onUpdateSettings({
      ...settings,
      notifications: {
        ...settings.notifications,
        [key]: newValue
      }
    });

    // 알림을 켤 때만 브라우저 권한 요청 (비동기로 처리하여 UI 차단을 방지)
    if (newValue) {
      if (!('Notification' in window)) return;

      let permission = Notification.permission;

      if (permission === 'default') {
        try {
          permission = await Notification.requestPermission();
        } catch (e) {
          console.warn("Notification request failed", e);
        }
      }

      // 권한이 거부되었더라도 앱 내 설정은 'ON' 상태를 유지하도록 하여 
      // 추후 브라우저 설정 변경 시 즉시 연동될 수 있게 합니다.
      if (permission === 'granted') {
        try {
          if ('serviceWorker' in navigator) {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: process.env.VAPID_PUBLIC_KEY || 'B...'
            });
            await savePushSubscription(subscription);
          }
        } catch (pushError) {
          console.warn("Push subscription background task failed", pushError);
        }
      }
    }
  };

  const toggleBabyMode = () => {
    onUpdateSettings({
      ...settings,
      enableBabyMode: !settings.enableBabyMode
    });
  };

  const toggleDiaryCalories = () => {
    onUpdateSettings({
      ...settings,
      privacy: {
        ...settings.privacy,
        shareDiaryCalories: !settings.privacy.shareDiaryCalories
      }
    });
  };

  const cycleShareCalories = () => {
    let nextState: 'public' | 'partners' | 'private' = 'public';
    if (settings.privacy.shareCalories === 'public') nextState = 'partners';
    else if (settings.privacy.shareCalories === 'partners') nextState = 'private';

    onUpdateSettings({
      ...settings,
      privacy: {
        ...settings.privacy,
        shareCalories: nextState
      }
    });
  };

  const getPrivacyIcon = () => {
    switch (settings.privacy.shareCalories) {
      case 'public': return <Globe size={18} />;
      case 'partners': return <Users size={18} />;
      case 'private': return <Lock size={18} />;
    }
  };

  const getPrivacyText = () => {
    switch (settings.privacy.shareCalories) {
      case 'public': return '전체공개';
      case 'partners': return '친구만';
      case 'private': return '나만보기';
    }
  };

  const getPrivacyColor = () => {
    switch (settings.privacy.shareCalories) {
      case 'public': return 'bg-brand-500 text-white';
      case 'partners': return 'bg-indigo-500 text-white';
      case 'private': return 'bg-gray-500 text-white';
    }
  };

  const handleSaveTime = (newTime: string) => {
    if (!editingTime) return;

    const currentTimes = settings.notifications.mealTimes || DEFAULT_TIMES;

    onUpdateSettings({
      ...settings,
      notifications: {
        ...settings.notifications,
        mealTimes: {
          ...currentTimes,
          [editingTime.type]: newTime
        }
      }
    });
    setEditingTime(null);
  };

  if (currentView === 'terms') {
    return <TermsOfService onClose={() => setCurrentView('main')} />;
  }

  if (currentView === 'privacy') {
    return <PrivacyPolicy onClose={() => setCurrentView('main')} />;
  }

  const mealTimes = settings.notifications?.mealTimes || DEFAULT_TIMES;

  return (
    <div className="fixed inset-0 bg-white z-50 overflow-y-auto flex flex-col">
      <div className="sticky top-0 bg-white z-10 px-4 py-3 flex items-center justify-between border-b border-gray-100">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft size={24} className="text-gray-700" />
        </button>
        <h1 className="text-[19px] font-bold text-gray-800">앱 설정</h1>
        <div className="w-10"></div>
      </div>

      <div className="p-6 space-y-8">

        <section>
          <h3 className="text-[14px] font-bold text-gray-400 mb-3 px-1">알림 설정</h3>
          <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
            <div className={`p-4 flex items-center justify-between ${settings.notifications?.mealReminders ? 'border-b border-gray-50' : 'border-b border-gray-50'}`}>
              <div className="flex items-center gap-3">
                <Bell size={20} className="text-gray-400" />
                <span className="text-[14px] text-gray-800 font-medium">식사 시간 알림</span>
              </div>
              <button
                onClick={() => toggleNotification('mealReminders')}
                className={`w-11 h-6 rounded-full transition-colors relative ${settings.notifications?.mealReminders ? 'bg-brand-500' : 'bg-gray-200'}`}
              >
                <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${settings.notifications?.mealReminders ? 'left-[calc(100%-1.375rem)]' : 'left-0.5'}`}></div>
              </button>
            </div>

            {settings.notifications?.mealReminders && (
              <div className="bg-gray-50 p-4 space-y-3 animate-[slideDown_0.2s_ease-out]">
                <div className="flex items-center justify-between">
                  <label className="text-[14px] text-gray-600 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-300"></span> 아침
                  </label>
                  <button
                    onClick={() => setEditingTime({ type: 'breakfast', value: mealTimes.breakfast || '08:00' })}
                    className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-[13px] font-medium text-gray-800 hover:border-brand-500 transition-colors"
                  >
                    {mealTimes.breakfast || '08:00'}
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-[14px] text-gray-600 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-400"></span> 점심
                  </label>
                  <button
                    onClick={() => setEditingTime({ type: 'lunch', value: mealTimes.lunch || '12:00' })}
                    className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-[13px] font-medium text-gray-800 hover:border-brand-500 transition-colors"
                  >
                    {mealTimes.lunch || '12:00'}
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-[14px] text-gray-600 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-500"></span> 저녁
                  </label>
                  <button
                    onClick={() => setEditingTime({ type: 'dinner', value: mealTimes.dinner || '18:00' })}
                    className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-[13px] font-medium text-gray-800 hover:border-brand-500 transition-colors"
                  >
                    {mealTimes.dinner || '18:00'}
                  </button>
                </div>
              </div>
            )}

            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-5 flex justify-center"><span className="text-[18px] leading-none">👨‍👩‍👧</span></div>
                <span className="text-[14px] text-gray-800 font-medium">친구 활동 알림</span>
              </div>
              <button
                onClick={() => toggleNotification('familyActivity')}
                className={`w-11 h-6 rounded-full transition-colors relative ${settings.notifications?.familyActivity ? 'bg-brand-500' : 'bg-gray-200'}`}
              >
                <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${settings.notifications?.familyActivity ? 'left-[calc(100%-1.375rem)]' : 'left-0.5'}`}></div>
              </button>
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-[14px] font-bold text-gray-400 mb-3 px-1">프라이버시</h3>
          <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
            <div className="p-4 flex items-center justify-between border-b border-gray-50">
              <div className="flex items-center gap-3">
                <Lock size={20} className="text-gray-400" />
                <div>
                  <span className="text-[14px] text-gray-800 font-medium block">함께 칼로리 공유</span>
                  <span className="text-[12px] text-gray-400">다른 사람에게 공개</span>
                </div>
              </div>
              <button
                onClick={cycleShareCalories}
                className={`px-3 py-1.5 rounded-lg text-[13px] font-bold flex items-center gap-1.5 transition-all shadow-sm ${getPrivacyColor()}`}
              >
                {getPrivacyIcon()}
                {getPrivacyText()}
              </button>
            </div>

            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BookOpen size={20} className="text-gray-400" />
                <div>
                  <span className="text-[14px] text-gray-800 font-medium block">다이어리 칼로리 공유</span>
                  <span className="text-[12px] text-gray-400">
                    {settings.privacy?.shareDiaryCalories ? '초대된 계정에게만 공개' : '공유하지 않음'}
                  </span>
                </div>
              </div>
              <button
                onClick={toggleDiaryCalories}
                className={`w-11 h-6 rounded-full transition-colors relative ${settings.privacy?.shareDiaryCalories ? 'bg-brand-500' : 'bg-gray-200'}`}
              >
                <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${settings.privacy?.shareDiaryCalories ? 'left-[calc(100%-1.375rem)]' : 'left-0.5'}`}></div>
              </button>
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-[14px] font-bold text-gray-400 mb-3 px-1">일반</h3>
          <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">

            <div className="p-4 flex items-center justify-between border-b border-gray-50">
              <div className="flex items-center gap-3">
                <Baby size={20} className="text-gray-400" />
                <span className="text-[14px] text-gray-800 font-medium">아기 이유식 모드</span>
              </div>
              <button
                onClick={toggleBabyMode}
                className={`w-11 h-6 rounded-full transition-colors relative ${settings.enableBabyMode ? 'bg-brand-500' : 'bg-gray-200'}`}
              >
                <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${settings.enableBabyMode ? 'left-[calc(100%-1.375rem)]' : 'left-0.5'}`}></div>
              </button>
            </div>

            <button
              onClick={() => setCurrentView('terms')}
              className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors border-b border-gray-50 text-left"
            >
              <div className="flex items-center gap-3">
                <FileText size={20} className="text-gray-400" />
                <span className="text-[14px] text-gray-800 font-medium">서비스 이용약관</span>
              </div>
              <ChevronRight size={18} className="text-gray-300" />
            </button>
            <button
              onClick={() => setCurrentView('privacy')}
              className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <Shield size={20} className="text-gray-400" />
                <span className="text-[14px] text-gray-800 font-medium">개인정보 처리방침</span>
              </div>
              <ChevronRight size={18} className="text-gray-300" />
            </button>
          </div>
        </section>

        <section>
          <h3 className="text-[14px] font-bold text-gray-400 mb-3 px-1">계정</h3>
          <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
            <button
              onClick={onLogout}
              className="w-full p-4 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-50"
            >
              <LogOut size={20} className="text-gray-400" />
              <span className="text-[14px] text-gray-800 font-medium">로그아웃</span>
            </button>
            <button
              onClick={onDeleteAccount}
              className="w-full p-4 flex items-center gap-3 hover:bg-red-50 transition-colors text-left group"
            >
              <Trash2 size={20} className="text-gray-400 group-hover:text-red-500" />
              <span className="text-[14px] text-gray-800 font-medium group-hover:text-red-500">회원 탈퇴</span>
            </button>
          </div>
        </section>

        <div className="text-center pt-4">
          <p className="text-[12px] text-gray-400">현재 버전 1.0.0</p>
        </div>
      </div>

      {editingTime && (
        <TimePicker
          initialTime={editingTime.value}
          onClose={() => setEditingTime(null)}
          onSave={handleSaveTime}
        />
      )}
    </div>
  );
};

export default Settings;

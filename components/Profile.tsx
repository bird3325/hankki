
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { X, Camera, User, Settings, LogOut, ChevronRight, RefreshCw, Activity, Ruler, Weight, Info, Target, Heart, Edit2, Calendar as CalendarIcon, Check, Clock, ChevronDown } from 'lucide-react';
import { UserProfile } from '../types';

interface ProfileProps {
  user: UserProfile;
  onClose: () => void;
  onUpdate: (updatedUser: UserProfile) => void;
  onManageFamily: () => void;
  onSettings: () => void;
  onEditProfile: () => void;
  onLogout: () => void;
}

const ACTIVITY_LABELS: Record<string, string> = {
  sedentary: '활동 적음 (운동 안함/사무직)',
  light: '가벼운 활동 (주 1-3회 운동)',
  moderate: '보통 활동 (주 3-5회 운동)',
  active: '많은 활동 (주 6-7회 운동)',
  very_active: '매우 많은 활동 (격렬한 운동)'
};

const FASTING_OPTIONS = [4, 8, 12, 14, 16, 18, 20, 22, 24, 32, 36, 48];

const Profile: React.FC<ProfileProps> = ({ user, onClose, onUpdate, onManageFamily, onSettings, onEditProfile, onLogout }) => {
  const [name, setName] = useState(user.name);
  const [fullName, setFullName] = useState(user.fullName || '');
  const [targetCalories, setTargetCalories] = useState(user.targetCalories);
  const [avatar, setAvatar] = useState(user.avatar);
  const [birthDate, setBirthDate] = useState<string>(user.ageRange || '1995-01-01');
  const [gender, setGender] = useState<UserProfile['gender']>(user.gender || 'female');
  const [weight, setWeight] = useState<string>(user.weight ? user.weight.toString() : '');
  const [height, setHeight] = useState<string>(user.height ? user.height.toString() : '');
  const [activityLevel, setActivityLevel] = useState<UserProfile['activityLevel']>(user.activityLevel || 'moderate');
  const [fastingGoal, setFastingGoal] = useState<number>(user.fastingGoal || 16);
  
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isActivityPickerOpen, setIsActivityPickerOpen] = useState(false);
  const [isFastingPickerOpen, setIsFastingPickerOpen] = useState(false);

  const [tempYear, setTempYear] = useState(new Date().getFullYear());
  const [tempMonth, setTempMonth] = useState(new Date().getMonth() + 1);
  const [tempDay, setTempDay] = useState(new Date().getDate());

  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setName(user.name);
    setFullName(user.fullName || '');
    setAvatar(user.avatar);
    setTargetCalories(user.targetCalories);
    setBirthDate(user.ageRange || '1995-01-01');
    setGender(user.gender || 'female');
    setWeight(user.weight ? user.weight.toString() : '');
    setHeight(user.height ? user.height.toString() : '');
    setActivityLevel(user.activityLevel || 'moderate');
    setFastingGoal(user.fastingGoal || 16);
  }, [user]);

  useEffect(() => {
    if (birthDate && birthDate.includes('-')) {
        const [y, m, d] = birthDate.split('-').map(Number);
        setTempYear(y);
        setTempMonth(m);
        setTempDay(d);
    }
  }, [birthDate]);

  const getRecommendedCalories = (g: string, bDate: string, w?: string, h?: string, act?: string) => {
    let age = 30;
    if (bDate && bDate.includes('-')) {
        const birth = new Date(bDate);
        const today = new Date();
        age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
    }

    if (w && h) {
        const weightKg = Number(w);
        const heightCm = Number(h);
        
        let bmr = (10 * weightKg) + (6.25 * heightCm) - (5 * age);
        bmr += (g === 'male' ? 5 : -161);

        let multiplier = 1.2;
        if (act === 'light') multiplier = 1.375;
        if (act === 'moderate') multiplier = 1.55;
        if (act === 'active') multiplier = 1.725;
        if (act === 'very_active') multiplier = 1.9;

        return Math.round(bmr * multiplier);
    }

    let cal = g === 'male' ? 2500 : 2000;
    if (age < 20) cal += 200;
    else if (age > 50) cal -= 200;
    return cal;
  };

  const calculateRecommended = () => {
      return getRecommendedCalories(gender || 'female', birthDate, weight, height, activityLevel);
  };

  useEffect(() => {
    setTargetCalories(calculateRecommended());
    
    if (birthDate && birthDate.includes('-')) {
        const birth = new Date(birthDate);
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;

        let recommendedFasting = 16;
        if (age < 20) recommendedFasting = 12; 
        else if (age < 50) recommendedFasting = 16; 
        else if (age < 70) recommendedFasting = 14; 
        else recommendedFasting = 12; 
        
        setFastingGoal(recommendedFasting);
    }
  }, [gender, birthDate, weight, height, activityLevel]);

  const handleSave = () => {
    onUpdate({
      ...user,
      name,
      fullName,
      targetCalories: Number(targetCalories),
      avatar,
      ageRange: birthDate as any,
      gender,
      weight: weight ? Number(weight) : undefined,
      height: height ? Number(height) : undefined,
      activityLevel,
      fastingGoal
    });
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setAvatar(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const calculateDaysTogether = () => {
      if (!user.createdAt) return 1;
      const start = new Date(user.createdAt).setHours(0,0,0,0);
      const now = new Date().setHours(0,0,0,0);
      const diffTime = Math.abs(now - start);
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1; 
      return diffDays;
  };

  const daysTogether = calculateDaysTogether();

  const years = useMemo(() => {
      const currentYear = new Date().getFullYear();
      const items = [];
      for (let i = currentYear; i >= currentYear - 100; i--) items.push(i);
      return items;
  }, []);

  const monthsList = Array.from({ length: 12 }, (_, i) => i + 1);
  const daysInMonth = useMemo(() => new Date(tempYear, tempMonth, 0).getDate(), [tempYear, tempMonth]);
  const daysList = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const handleConfirmDate = () => {
      const formattedDate = `${tempYear}-${String(tempMonth).padStart(2, '0')}-${String(tempDay).padStart(2, '0')}`;
      setBirthDate(formattedDate);
      setIsDatePickerOpen(false);
  };

  return (
    <div ref={containerRef} className="fixed inset-0 bg-gray-50 z-50 overflow-y-auto flex flex-col font-sans">
      <div className="sticky top-0 bg-white/90 backdrop-blur-md z-20 px-4 py-3 flex items-center justify-between border-b border-gray-200">
        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600">
          <X size={24} />
        </button>
        <h1 className="text-[19px] font-bold text-gray-900">내 정보</h1>
        <button 
          onClick={handleSave} 
          className="text-brand-600 font-bold text-sm px-3 py-1.5 hover:bg-brand-50 rounded-lg transition-colors"
        >
            저장
        </button>
      </div>

      <div className="p-5 space-y-6 pb-6">
        
        <section className="flex flex-col items-center pt-2 pb-4">
            <div className="relative group cursor-pointer mb-3" onClick={handleAvatarClick}>
                <div className="w-28 h-28 rounded-full bg-gray-200 overflow-hidden border-4 border-white shadow-lg group-hover:opacity-90 transition-all">
                    <img src={avatar} alt={name} className="w-full h-full object-cover" />
                </div>
                <button className="absolute bottom-0 right-0 bg-gray-800 text-white p-2.5 rounded-full border-4 border-white shadow-md hover:bg-gray-700 transition-colors">
                    <Camera size={16} />
                </button>
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*"
                    onChange={handleFileChange}
                />
            </div>
            
            <div className="w-full bg-white p-5 rounded-2xl shadow-sm border border-gray-100 mt-2">
                <div className="flex items-center gap-2 mb-4">
                    <Info size={18} className="text-brand-500" />
                    <h3 className="text-[15px] font-bold text-gray-800">기본 정보</h3>
                </div>
                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-[13px] font-bold text-gray-500 ml-1">닉네임</label>
                        <input 
                            type="text" 
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-[14px] focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all text-gray-900 font-medium"
                        />
                    </div>
                    <div className="flex items-center justify-between px-1 pt-2 border-t border-gray-50 mt-2">
                        <span className="text-[13px] text-gray-400">가입일</span>
                        <span className="text-[13px] font-medium text-gray-600 flex items-center gap-1">
                             <Heart size={10} className="text-brand-500 fill-brand-500" /> 
                             함께한 지 {daysTogether}일째
                        </span>
                    </div>
                </div>
            </div>
        </section>

        <section className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-5">
                <Activity size={18} className="text-indigo-500" />
                <h3 className="text-[15px] font-bold text-gray-800">신체 정보</h3>
                <span className="text-[11px] text-gray-400 font-normal ml-auto">*칼로리 계산에 활용됩니다</span>
            </div>

            <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-[13px] font-bold text-gray-500 ml-1">성별</label>
                        <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-200">
                            <button 
                                onClick={() => setGender('male')}
                                className={`flex-1 py-2.5 rounded-lg text-[13px] font-bold transition-all ${
                                    gender === 'male' 
                                    ? 'bg-white text-indigo-600 shadow-sm' 
                                    : 'text-gray-400 hover:text-gray-600'
                                }`}
                            >
                                남성
                            </button>
                            <button 
                                onClick={() => setGender('female')}
                                className={`flex-1 py-2.5 rounded-lg text-[13px] font-bold transition-all ${
                                    gender === 'female' 
                                    ? 'bg-white text-brand-600 shadow-sm' 
                                    : 'text-gray-400 hover:text-gray-600'
                                }`}
                            >
                                여성
                            </button>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[13px] font-bold text-gray-500 ml-1">생년월일</label>
                        <button 
                            onClick={() => setIsDatePickerOpen(true)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-[14px] focus:outline-none focus:border-brand-500 transition-all text-left flex items-center justify-between group h-[46px]"
                        >
                            <span className={`font-medium ${birthDate ? 'text-gray-900' : 'text-gray-400'}`}>
                                {birthDate || "날짜 선택"}
                            </span>
                            <CalendarIcon size={14} className="text-gray-400 group-hover:text-brand-500 transition-colors" />
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-[13px] font-bold text-gray-500 ml-1 flex items-center gap-1">
                            <Ruler size={12} /> 키 (cm)
                        </label>
                        <input 
                            type="number" 
                            value={height}
                            onChange={(e) => setHeight(e.target.value)}
                            placeholder="160"
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-[14px] focus:outline-none focus:border-brand-500 transition-all text-gray-900 font-medium placeholder:text-gray-300"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[13px] font-bold text-gray-500 ml-1 flex items-center gap-1">
                            <Weight size={12} /> 몸무게 (kg)
                        </label>
                        <input 
                            type="number" 
                            value={weight}
                            onChange={(e) => setWeight(e.target.value)}
                            placeholder="50"
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-[14px] focus:outline-none focus:border-brand-500 transition-all text-gray-900 font-medium placeholder:text-gray-300"
                        />
                    </div>
                </div>
            </div>
        </section>

        <section className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
             <div className="flex items-center gap-2 mb-5">
                <Target size={18} className="text-green-500" />
                <h3 className="text-[15px] font-bold text-gray-800">활동 및 목표</h3>
            </div>
            
            <div className="space-y-5">
                <div className="space-y-1.5">
                    <label className="text-[13px] font-bold text-gray-500 ml-1">평소 활동량</label>
                    <button 
                        onClick={() => setIsActivityPickerOpen(true)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-[14px] focus:outline-none focus:border-brand-500 transition-all text-left flex items-center justify-between group"
                    >
                        <span className="text-gray-900 font-medium truncate">{ACTIVITY_LABELS[activityLevel || 'moderate']}</span>
                        <ChevronDown className="text-gray-400 group-hover:text-brand-500 transition-colors" size={16} />
                    </button>
                </div>

                <div className="space-y-3 pt-2">
                    <div className="flex items-center gap-2 ml-1">
                        <Clock size={16} className="text-gray-400" />
                        <label className="text-[13px] font-bold text-gray-500">공복 목표 시간</label>
                        <span className="text-[11px] text-gray-400 font-normal ml-auto">나이에 따른 권장 시간 자동 설정</span>
                    </div>
                    <button 
                        onClick={() => setIsFastingPickerOpen(true)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-[14px] focus:outline-none focus:border-brand-500 transition-all text-left flex items-center justify-between group"
                    >
                        <span className="text-gray-900 font-black">{fastingGoal} 시간</span>
                        <div className="flex items-center gap-1">
                            <span className="text-[13px] text-gray-400 group-hover:text-brand-500 transition-colors">변경하기</span>
                            <ChevronDown className="text-gray-400 group-hover:text-brand-500 transition-colors" size={16} />
                        </div>
                    </button>
                </div>

                <div className="p-4 bg-brand-50 rounded-xl border border-brand-100">
                    <div className="flex justify-between items-end mb-2">
                        <label className="text-[13px] font-bold text-brand-800">하루 목표 칼로리</label>
                    </div>
                    <div className="relative">
                        <input 
                            type="number" 
                            value={targetCalories}
                            onChange={(e) => setTargetCalories(Number(e.target.value))}
                            className="w-full bg-white border border-brand-200 rounded-xl px-4 py-3 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all font-black text-[20px] text-brand-600 text-center"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-[13px] font-bold">kcal</span>
                    </div>
                    <p className="text-[11px] text-brand-600/70 mt-2 text-center">
                        * 신체 정보와 활동량을 기준으로 자동 계산된 권장량입니다.
                    </p>
                </div>
            </div>
        </section>

        <div className="space-y-3 pt-2">
            <button 
                onClick={onManageFamily}
                className="w-full flex items-center justify-between p-4 bg-white hover:bg-gray-50 border border-gray-100 rounded-2xl transition-colors group shadow-sm"
            >
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-indigo-50 text-indigo-500 flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
                        <User size={18} />
                    </div>
                    <span className="text-gray-700 font-bold text-[15px]">친구 관리</span>
                </div>
                <ChevronRight size={18} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
            </button>
            
             <button 
                onClick={onEditProfile}
                className="w-full flex items-center justify-between p-4 bg-white hover:bg-gray-50 border border-gray-100 rounded-2xl transition-colors group shadow-sm"
             >
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center group-hover:bg-orange-100 transition-colors">
                        <Edit2 size={18} />
                    </div>
                    <span className="text-gray-700 font-bold text-[15px]">정보수정</span>
                </div>
                <ChevronRight size={18} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
            </button>

             <button 
                onClick={onSettings}
                className="w-full flex items-center justify-between p-4 bg-white hover:bg-gray-50 border border-gray-100 rounded-2xl transition-colors group shadow-sm"
             >
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center group-hover:bg-gray-200 transition-colors">
                        <Settings size={18} />
                    </div>
                    <span className="text-gray-700 font-bold text-[15px]">앱 설정</span>
                </div>
                <ChevronRight size={18} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
            </button>
        </div>
        
        <button 
            onClick={onLogout}
            className="w-full py-4 text-red-400 text-[15px] font-bold flex items-center justify-center gap-2 mt-4 hover:bg-red-50 rounded-xl transition-colors"
        >
            <LogOut size={16} />
            로그아웃
        </button>

      </div>

      {isDatePickerOpen && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm transition-all duration-300 animate-[fadeIn_0.2s_ease-out]">
              <div className="bg-white w-full max-w-md rounded-t-[40px] p-8 pb-10 space-y-8 animate-[slideUp_0.3s_cubic-bezier(0.16,1,0.3,1)] shadow-2xl">
                  <div className="flex items-center justify-between">
                      <div>
                          <h3 className="text-[25px] font-black text-gray-900 leading-none mb-1">생일 선택</h3>
                          <p className="text-[15px] text-gray-400 font-bold">생년월일을 선택해 주세요</p>
                      </div>
                      <button 
                        onClick={() => setIsDatePickerOpen(false)}
                        className="p-3 bg-gray-50 rounded-full text-gray-400 hover:text-gray-900 transition-colors"
                      >
                          <X size={20} />
                      </button>
                  </div>

                  <div className="bg-brand-50 p-6 rounded-[32px] border border-brand-100 text-center">
                        <p className="text-[13px] font-black text-brand-400 uppercase tracking-widest mb-1">현재 선택</p>
                        <div className="text-[31px] font-black text-brand-600 tracking-tight">
                            {tempYear}년 {tempMonth}월 {tempDay}일
                        </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 h-48 overflow-hidden relative">
                      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-12 bg-gray-50 rounded-2xl -z-10 pointer-events-none border border-gray-100"></div>
                      
                      <div className="overflow-y-auto no-scrollbar snap-y snap-mandatory text-center">
                          <div className="h-20" />
                          {years.map(y => (
                              <button 
                                key={y} 
                                onClick={() => setTempYear(y)}
                                className={`h-12 w-full snap-center flex items-center justify-center text-[19px] font-black transition-all ${tempYear === y ? 'text-brand-600 scale-110' : 'text-gray-300 opacity-50'}`}
                              >
                                  {y}
                              </button>
                          ))}
                          <div className="h-20" />
                      </div>

                      <div className="overflow-y-auto no-scrollbar snap-y snap-mandatory text-center">
                          <div className="h-20" />
                          {monthsList.map(m => (
                              <button 
                                key={m} 
                                onClick={() => setTempMonth(m)}
                                className={`h-12 w-full snap-center flex items-center justify-center text-[19px] font-black transition-all ${tempMonth === m ? 'text-brand-600 scale-110' : 'text-gray-300 opacity-50'}`}
                              >
                                  {m}월
                              </button>
                          ))}
                          <div className="h-20" />
                      </div>

                      <div className="overflow-y-auto no-scrollbar snap-y snap-mandatory text-center">
                          <div className="h-20" />
                          {daysList.map(d => (
                              <button 
                                key={d} 
                                onClick={() => setTempDay(d)}
                                className={`h-12 w-full snap-center flex items-center justify-center text-[19px] font-black transition-all ${tempDay === d ? 'text-brand-600 scale-110' : 'text-gray-300 opacity-50'}`}
                              >
                                  {d}일
                              </button>
                          ))}
                          <div className="h-20" />
                      </div>
                  </div>

                  <button 
                    onClick={handleConfirmDate}
                    className="w-full bg-brand-500 hover:bg-brand-600 text-white py-5 rounded-[24px] font-black text-[19px] shadow-lg shadow-brand-100 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                      <Check size={22} strokeWidth={3} />
                      이 날짜로 설정
                  </button>
              </div>
          </div>
      )}

      {isActivityPickerOpen && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm transition-all duration-300 animate-[fadeIn_0.2s_ease-out]">
              <div className="bg-white w-full max-w-md rounded-t-[40px] p-8 pb-10 space-y-6 animate-[slideUp_0.3s_cubic-bezier(0.16,1,0.3,1)] shadow-2xl">
                  <div className="flex items-center justify-between">
                      <div>
                          <h3 className="text-[25px] font-black text-gray-900 leading-none mb-1">평소 활동량</h3>
                          <p className="text-[15px] text-gray-400 font-bold">자신의 신체 활동 정도를 선택하세요</p>
                      </div>
                      <button 
                        onClick={() => setIsActivityPickerOpen(false)}
                        className="p-3 bg-gray-50 rounded-full text-gray-400 hover:text-gray-900 transition-colors"
                      >
                          <X size={20} />
                      </button>
                  </div>

                  <div className="space-y-3">
                      {Object.entries(ACTIVITY_LABELS).map(([key, label]) => (
                          <button
                            key={key}
                            onClick={() => {
                                setActivityLevel(key as any);
                                setIsActivityPickerOpen(false);
                            }}
                            className={`w-full p-5 rounded-2xl text-left transition-all border flex items-center justify-between group ${
                                activityLevel === key 
                                ? 'bg-brand-50 border-brand-200 shadow-sm' 
                                : 'bg-white border-gray-100 hover:bg-gray-50'
                            }`}
                          >
                              <span className={`font-bold transition-colors ${activityLevel === key ? 'text-brand-600' : 'text-gray-700'}`}>
                                  {label}
                              </span>
                              {activityLevel === key && <Check size={18} className="text-brand-500" strokeWidth={3} />}
                          </button>
                      ))}
                  </div>
              </div>
          </div>
      )}

      {isFastingPickerOpen && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm transition-all duration-300 animate-[fadeIn_0.2s_ease-out]">
              <div className="bg-white w-full max-w-md rounded-t-[40px] p-8 pb-10 space-y-8 animate-[slideUp_0.3s_cubic-bezier(0.16,1,0.3,1)] shadow-2xl">
                  <div className="flex items-center justify-between">
                      <div>
                          <h3 className="text-[25px] font-black text-gray-900 leading-none mb-1">공복 목표 시간</h3>
                          <p className="text-[15px] text-gray-400 font-bold">건강한 하루를 위한 공복 목표를 정하세요</p>
                      </div>
                      <button 
                        onClick={() => setIsFastingPickerOpen(false)}
                        className="p-3 bg-gray-50 rounded-full text-gray-400 hover:text-gray-900 transition-colors"
                      >
                          <X size={20} />
                      </button>
                  </div>

                  <div className="bg-brand-50 p-6 rounded-[32px] border border-brand-100 text-center">
                        <p className="text-[13px] font-black text-brand-400 uppercase tracking-widest mb-1">현재 설정</p>
                        <div className="text-[41px] font-black text-brand-600 tracking-tight">
                            {fastingGoal} <span className="text-[21px] opacity-60">시간</span>
                        </div>
                  </div>

                  <div className="grid grid-cols-4 gap-3 max-h-[240px] overflow-y-auto no-scrollbar py-2">
                      {FASTING_OPTIONS.map((hours) => (
                          <button
                            key={hours}
                            onClick={() => setFastingGoal(hours)}
                            className={`py-4 rounded-xl text-[19px] font-black transition-all ${
                                fastingGoal === hours 
                                ? 'bg-brand-500 text-white shadow-lg shadow-brand-100 scale-105' 
                                : 'bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-600'
                            }`}
                          >
                              {hours}h
                          </button>
                      ))}
                  </div>

                  <button 
                    onClick={() => setIsFastingPickerOpen(false)}
                    className="w-full bg-brand-500 hover:bg-brand-600 text-white py-5 rounded-[24px] font-black text-[19px] shadow-lg shadow-brand-100 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                      <Check size={22} strokeWidth={3} />
                      이 설정으로 변경
                  </button>
              </div>
          </div>
      )}
    </div>
  );
};

export default Profile;

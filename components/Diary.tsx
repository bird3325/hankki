
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Meal, BabyProfile } from '../types';
import { AlertCircle, Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight, ChevronRight as ChevronRightIcon, Globe, Users, Lock, BookOpen, User, Baby, EyeOff, X, Check } from 'lucide-react';
import BabyProfileEditor from './BabyProfileEditor';
import { useModal } from './GlobalModal';

interface DiaryProps {
  meals: Meal[];
  currentUserId: string;
  onMealClick: (meal: Meal) => void;
  onUpdateMeal: (meal: Meal) => void;
  enableBabyMode: boolean;
  babyProfiles: BabyProfile[];
  familyMembers?: any[];
  onUpdateBabyProfile: (profile: BabyProfile) => void;
}

const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: '아침',
  lunch: '점심',
  dinner: '저녁',
  snack: '간식'
};

const Diary: React.FC<DiaryProps> = ({ 
    meals, 
    currentUserId, 
    onMealClick, 
    onUpdateMeal, 
    enableBabyMode, 
    babyProfiles, 
    familyMembers = [],
    onUpdateBabyProfile 
}) => {
  const { showAlert } = useModal();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isBabyEditorOpen, setIsBabyEditorOpen] = useState(false);
  
  // 캘린더 모달 상태
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [calViewDate, setCalViewDate] = useState(new Date());
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  // 날짜 리스트 생성 로직 수정: 과거 30일 ~ 미래 3일까지 한 달치 데이터 생성
  const dateList = useMemo(() => {
    const dates = [];
    const today = new Date();
    // i=30일 전부터 i=-3일 후까지 총 약 34일의 범위를 제공
    for (let i = 30; i >= -3; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      dates.push(d);
    }
    return dates;
  }, []);

  const scrollToDate = (date: Date) => {
    if (scrollRef.current) {
        const index = dateList.findIndex(d => d.toDateString() === date.toDateString());
        if (index >= 0) {
            const container = scrollRef.current;
            const targetElement = container.children[index] as HTMLElement;
            if (targetElement) {
                const containerWidth = container.clientWidth;
                const itemLeft = targetElement.offsetLeft;
                const itemWidth = targetElement.offsetWidth;
                const centerPos = itemLeft + (itemWidth / 2) - (containerWidth / 2);
                container.scrollTo({ left: centerPos, behavior: 'smooth' });
            }
        }
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      scrollToDate(selectedDate);
    }, 100);
    return () => clearTimeout(timer);
  }, [dateList, selectedDate]);

  // 필터링된 현재 날짜의 모든 식단
  const filteredMeals = useMemo(() => meals.filter(meal => {
    const mealDate = new Date(meal.timestamp);
    return mealDate.toDateString() === selectedDate.toDateString();
  }), [meals, selectedDate]);

  // 나의 식단
  const myMealsInDate = useMemo(() => 
    filteredMeals.filter(m => !m.isBabyFood && m.userId === currentUserId).sort((a, b) => b.timestamp - a.timestamp),
  [filteredMeals, currentUserId]);

  // 친구의 식단
  const friendMealsInDate = useMemo(() => {
    const friendIds = familyMembers.map(m => m.id);
    return filteredMeals.filter(m => {
        if (m.isBabyFood || m.userId === currentUserId) return false;
        const isGroupMember = friendIds.includes(m.userId);
        return m.shareDiaryCalories === true && isGroupMember;
    }).sort((a, b) => b.timestamp - a.timestamp);
  }, [filteredMeals, currentUserId, familyMembers]);

  // 아기 식단
  const babyMealsInDate = useMemo(() => 
    filteredMeals.filter(m => m.isBabyFood).sort((a, b) => b.timestamp - a.timestamp),
  [filteredMeals]);

  const babyGroups = useMemo(() => {
    const groups: Record<string, { profile?: BabyProfile; meals: Meal[] }> = {};
    babyMealsInDate.forEach(meal => {
        const profile = babyProfiles.find(b => (b.id && b.id === meal.babyId) || b.name === meal.babyName);
        const key = profile?.id || meal.babyName || 'unknown';
        if (!groups[key]) {
            groups[key] = { profile, meals: [] };
        }
        groups[key].meals.push(meal);
    });
    return Object.entries(groups);
  }, [babyMealsInDate, babyProfiles]);

  // 캘린더 도트 표시용 로직
  const hasDataForDate = (date: Date) => {
      const friendIds = familyMembers.map(m => m.id);
      return meals.some(meal => {
        const mealDate = new Date(meal.timestamp);
        if (mealDate.toDateString() !== date.toDateString()) return false;
        if (meal.userId === currentUserId) return true;
        const isGroupMember = friendIds.includes(meal.userId);
        return meal.shareDiaryCalories === true && isGroupMember;
      });
  };

  const onMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeft(scrollRef.current.scrollLeft);
  };

  const onMouseLeave = () => {
    setIsDragging(false);
  };

  const onMouseUp = () => {
    setIsDragging(false);
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    scrollRef.current.scrollLeft = scrollLeft - walk;
  };

  const getHeaderDate = () => {
      const today = new Date();
      if (selectedDate.toDateString() === today.toDateString()) return '오늘의 기록';
      return `${selectedDate.getMonth() + 1}월 ${selectedDate.getDate()}일 기록`;
  };

  const handleCycleReaction = (e: React.MouseEvent, meal: Meal) => {
      e.stopPropagation();
      if (meal.userId !== currentUserId) return;
      const reactions: ('good' | 'soso' | 'bad')[] = ['good', 'soso', 'bad'];
      const current = meal.babyReaction || 'good';
      const nextIndex = (reactions.indexOf(current as any) + 1) % 3;
      const next = reactions[nextIndex];
      onUpdateMeal({ ...meal, babyReaction: next });
  };

  const renderMealItem = (meal: Meal) => {
    const isMe = meal.userId === currentUserId;
    const canSeeDetails = isMe || meal.isBabyFood || meal.shareDiaryCalories;

    return (
      <div 
          key={meal.id} 
          onClick={() => onMealClick(meal)}
          className={`bg-white p-4 rounded-2xl border shadow-sm flex gap-4 cursor-pointer transition-transform active:scale-[0.98] ${
            isMe ? 'border-gray-100' : 'border-brand-100'
          }`}
      >
          <div className="w-16 h-16 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0">
               {meal.image ? (
                   <img src={meal.image} alt={meal.foodName} className="w-full h-full object-cover" />
               ) : (
                   <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">No Img</div>
               )}
          </div>
          <div className="flex-1">
              <div className="flex justify-between items-start">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                        meal.isBabyFood ? 'bg-indigo-50 text-indigo-600' : (isMe ? 'bg-orange-50 text-orange-600' : 'bg-brand-50 text-brand-600')
                    }`}>
                        {MEAL_TYPE_LABELS[meal.type] || meal.type}
                    </span>
                    {!isMe && !meal.isBabyFood && (
                        <span className="text-[10px] font-black text-brand-500 bg-white border border-brand-100 px-1.5 py-0.5 rounded italic">
                            {meal.userName}
                        </span>
                    )}
                  </div>
                  <span className="text-[13px] text-gray-400 flex items-center gap-1">
                      <Clock size={10} />
                      {new Date(meal.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
              </div>
              <h4 className="font-bold text-gray-800 mt-1 text-[17px]">{meal.foodName}</h4>
              <p className="text-[13px] text-gray-500 mt-0.5 line-clamp-1">{meal.description}</p>
              
              <div className="mt-2 flex items-center flex-wrap gap-2">
                   <div className={`px-2 py-0.5 rounded text-[11px] font-medium flex items-center gap-1 ${canSeeDetails ? 'bg-gray-50 text-gray-500' : 'bg-gray-100 text-gray-400 opacity-60'}`}>
                       {canSeeDetails ? (
                           `${meal.nutrition.calories} kcal`
                       ) : (
                           <><EyeOff size={10} /> 비공개</>
                       )}
                   </div>
                   {isMe && (
                     <>
                        <div className={`px-2 py-0.5 rounded text-[11px] font-bold flex items-center gap-1 ${
                            meal.sharingLevel === 'public' ? 'bg-green-50 text-green-600' :
                            meal.sharingLevel === 'partners' ? 'bg-indigo-50 text-indigo-600' :
                            'bg-gray-100 text-gray-400'
                        }`}>
                            {meal.sharingLevel === 'public' ? <Globe size={10} /> :
                             meal.sharingLevel === 'partners' ? <Users size={10} /> :
                             <Lock size={10} />}
                            {meal.sharingLevel === 'public' ? '전체공개' :
                             meal.sharingLevel === 'partners' ? '친구공개' : '나만보기'}
                        </div>
                     </>
                   )}
                   {meal.isBabyFood && (
                       <div 
                          onClick={(e) => handleCycleReaction(e, meal)}
                          className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                              !isMe ? 'cursor-default' : 'cursor-pointer hover:bg-gray-100'
                          } ${
                              meal.babyReaction === 'good' ? 'bg-green-50 text-green-600' :
                              meal.babyReaction === 'soso' ? 'bg-yellow-50 text-yellow-700 border-yellow-100' :
                              meal.babyReaction === 'bad' ? 'bg-red-50 text-red-600' :
                              'bg-gray-50 text-gray-400'
                          }`}
                       >
                           {meal.babyReaction === 'good' ? '반응 좋음 😊' : 
                            meal.babyReaction === 'soso' ? '반응 보통 😐' : 
                            meal.babyReaction === 'bad' ? '반응 거부 ☹️' : '반응 기록'}
                       </div>
                   )}
              </div>
          </div>
          <button className="self-center text-gray-300 hover:text-gray-500">
              <ChevronRightIcon size={20} />
          </button>
      </div>
    );
  };

  const renderCalendarModal = () => {
    if (!isCalendarOpen) return null;

    const year = calViewDate.getFullYear();
    const month = calViewDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay(); 
    
    const prevMonth = () => setCalViewDate(new Date(year, month - 1, 1));
    const nextMonth = () => setCalViewDate(new Date(year, month + 1, 1));

    const days = [];
    const emptySlots = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
    for (let i = 0; i < emptySlots; i++) {
        days.push(<div key={`empty-${i}`} className="h-10" />);
    }

    for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(year, month, d);
        const isSelected = date.toDateString() === selectedDate.toDateString();
        const isToday = date.toDateString() === new Date().toDateString();
        const hasData = hasDataForDate(date);

        days.push(
            <button 
              key={d} 
              onClick={() => { setSelectedDate(date); setIsCalendarOpen(false); }}
              className={`h-10 w-10 rounded-full flex flex-col items-center justify-center relative transition-all ${
                  isSelected ? 'bg-gray-900 text-white shadow-md' : 'hover:bg-gray-100'
              }`}
            >
                <span className={`text-[14px] font-bold ${isToday && !isSelected ? 'text-brand-500' : ''}`}>{d}</span>
                {hasData && <div className={`w-1 h-1 rounded-full absolute bottom-1.5 ${isSelected ? 'bg-white/40' : 'bg-brand-400'}`}></div>}
            </button>
        );
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6 animate-[fadeIn_0.2s_ease-out]">
            <div className="bg-white w-full max-w-[340px] rounded-[32px] p-6 shadow-2xl animate-[scaleIn_0.2s_ease-out]">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-black text-gray-800">{year}년 {month + 1}월</h3>
                    <div className="flex gap-1">
                        <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><ChevronLeft size={20} className="text-gray-400" /></button>
                        <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><ChevronRight size={20} className="text-gray-400" /></button>
                        <button onClick={() => setIsCalendarOpen(false)} className="p-2 bg-gray-100 text-gray-500 rounded-full ml-1"><X size={18} /></button>
                    </div>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center mb-2">
                    {['월', '화', '수', '목', '금', '토', '일'].map(d => (
                        <span key={d} className="text-[11px] font-bold text-gray-400">{d}</span>
                    ))}
                </div>
                <div className="grid grid-cols-7 gap-1 text-center">{days}</div>
                <button 
                  onClick={() => { setSelectedDate(new Date()); setIsCalendarOpen(false); }}
                  className="w-full mt-6 py-3.5 bg-gray-900 text-white rounded-2xl font-bold text-[14px] active:scale-95 transition-all"
                >오늘로 이동</button>
            </div>
        </div>
    );
  };

  return (
    <div className="space-y-6 pb-6">
      <div className="flex items-center justify-between px-1">
         <h2 className="text-[21px] font-bold text-gray-800">식단 다이어리</h2>
         <button 
            onClick={() => { setCalViewDate(selectedDate); setIsCalendarOpen(true); }}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600"
         >
             <CalendarIcon size={20} />
         </button>
      </div>

      <div 
          ref={scrollRef}
          className="relative flex items-center py-2 overflow-x-auto no-scrollbar gap-2 cursor-grab active:cursor-grabbing select-none px-1 mt-[3px]"
          onMouseDown={onMouseDown}
          onMouseLeave={onMouseLeave}
          onMouseUp={onMouseUp}
          onMouseMove={onMouseMove}
      >
          {dateList.map((date, i) => {
              const isSelected = date.toDateString() === selectedDate.toDateString();
              const isToday = date.toDateString() === new Date().toDateString();
              const hasData = hasDataForDate(date);
              
              return (
                  <div 
                    key={i} 
                    onClick={() => {
                        if (!isDragging) setSelectedDate(date);
                    }}
                    className={`flex flex-col items-center min-w-[46px] py-2 rounded-2xl border transition-all duration-200 cursor-pointer ${
                        isSelected 
                        ? 'bg-gray-900 border-gray-900 text-white shadow-lg scale-105 z-10' 
                        : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                      <span className={`text-[11px] uppercase font-bold tracking-wide ${isSelected ? 'text-gray-400' : 'text-gray-400'}`}>
                          {date.toLocaleDateString('en-US', {weekday: 'short'})}
                      </span>
                      <span className={`text-[19px] font-bold mt-0.5 ${isSelected ? 'text-white' : 'text-gray-800'}`}>
                          {date.getDate()}
                      </span>
                      
                      <div className="mt-1 h-1 flex items-center justify-center">
                        {isToday ? (
                            <div className="w-1 h-1 rounded-full bg-brand-500"></div>
                        ) : hasData ? (
                            <div className={`w-1 h-1 rounded-full ${isSelected ? 'bg-gray-600' : 'bg-gray-300'}`}></div>
                        ) : null}
                      </div>
                  </div>
              )
          })}
      </div>

      <div className="space-y-8">
        <h3 className="text-[15px] font-bold text-gray-500 flex items-center gap-2 mb-2">
            <CalendarIcon size={14} />
            {getHeaderDate()}
        </h3>
        
        {myMealsInDate.length === 0 && friendMealsInDate.length === 0 && babyGroups.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-dashed border-gray-200">
                <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3 text-gray-300">
                    🍽️
                </div>
                <p className="text-gray-400 text-[15px] font-medium">기록된 식단이 없어요.</p>
                {selectedDate.toDateString() === new Date().toDateString() && (
                    <p className="text-brand-500 text-[13px] mt-2 font-bold">첫 끼니를 기록해볼까요?</p>
                )}
            </div>
        ) : (
            <div className="space-y-10">
                {myMealsInDate.length > 0 && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 px-1 text-gray-400">
                            <User size={14} />
                            <span className="text-[13px] font-bold uppercase tracking-wider">나의 식단</span>
                        </div>
                        <div className="space-y-4">
                            {myMealsInDate.map(renderMealItem)}
                        </div>
                    </div>
                )}

                {friendMealsInDate.length > 0 && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 px-1 text-brand-400">
                            <Users size={14} />
                            <span className="text-[13px] font-bold uppercase tracking-wider">친구의 식단</span>
                        </div>
                        <div className="space-y-4">
                            {friendMealsInDate.map(renderMealItem)}
                        </div>
                    </div>
                )}

                {babyGroups.map(([key, group]) => (
                    <div key={key} className="space-y-4">
                        <div className="flex items-center gap-2 px-1 text-indigo-400">
                            <Baby size={14} />
                            <span className="text-[13px] font-bold uppercase tracking-wider">
                                {group.profile?.name || '아이'}의 이유식
                            </span>
                        </div>
                        <div className="space-y-4">
                            {group.meals.map(renderMealItem)}
                        </div>
                    </div>
                ))}
            </div>
        )}
      </div>

      {/* 광고 삽입 공간 (Ad Section) - 히든 처리 */}
      <div className="hidden bg-white p-2 rounded-[32px] shadow-soft border border-gray-100 overflow-hidden min-h-[100px] flex items-center justify-center relative group cursor-pointer transition-all hover:shadow-md">
          <div className="absolute top-2 right-4 text-[9px] font-bold text-gray-300 tracking-widest uppercase">AD</div>
          <div className="w-full h-full bg-gray-50 rounded-[24px] flex flex-col items-center justify-center p-4 border border-dashed border-gray-200">
              <p className="text-gray-400 text-[13px] font-bold mb-1">건강한 생활을 위한 추천 제품</p>
              <p className="text-gray-300 text-[11px]">개인화된 쇼핑 광고가 위치할 공간입니다.</p>
          </div>
      </div>

      {isBabyEditorOpen && (
        <BabyProfileEditor
            initialData={{ name: '', birthDate: '', allergies: [] }}
            onSave={async (data) => {
                onUpdateBabyProfile(data);
                await showAlert('아기 프로필 정보가 저장되었습니다.');
                setIsBabyEditorOpen(false);
            }}
            onClose={() => setIsBabyEditorOpen(false)}
        />
      )}

      {renderCalendarModal()}
    </div>
  );
};

export default Diary;

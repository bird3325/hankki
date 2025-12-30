
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Meal, BabyProfile, AppSettings } from '../types';
import { Clock, Flame, MoreHorizontal, Trash2, Share2, CheckCircle2, ChevronRight, Zap, Info, Baby, Utensils, Smile, Meh, Frown, Sparkles, Heart } from 'lucide-react';

interface DashboardProps {
  meals: Meal[];
  targetCalories: number;
  onDelete: (id: string) => void;
  onShare: (id: string) => void;
  onUpdateMeal: (meal: Meal) => void;
  onMealClick?: (meal: Meal) => void;
  currentUserId?: string;
  userName: string;
  enableBabyMode?: boolean;
  babyProfiles?: BabyProfile[];
  settings: AppSettings;
}

const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: '아침',
  lunch: '점심',
  dinner: '저녁',
  snack: '간식'
};

const SwipeableMealItem: React.FC<{ children: React.ReactNode, onDelete: () => void, onSwipeRight?: () => void }> = ({ children, onDelete, onSwipeRight }) => {
  const [translateX, setTranslateX] = useState(0);
  const startX = useRef(0);
  const startTranslateX = useRef(0);
  const isDragging = useRef(false);

  const handleStart = (clientX: number) => {
    isDragging.current = true;
    startX.current = clientX;
    startTranslateX.current = translateX;
  };

  const handleMove = (clientX: number) => {
    if (!isDragging.current) return;
    const diff = clientX - startX.current;
    let newX = startTranslateX.current + diff;

    if (newX > 100) newX = 100;
    if (newX < -100) newX = -100;
    setTranslateX(newX);
  };

  const handleEnd = () => {
    isDragging.current = false;

    if (translateX > 60) {
      onSwipeRight?.();
      setTranslateX(0);
    } else if (translateX < -40) {
      setTranslateX(-80);
    } else {
      setTranslateX(0);
    }
  };

  return (
    <div className="relative select-none overflow-hidden rounded-[28px]">
      <div className="absolute inset-y-0 left-0 w-24 flex items-center justify-center z-0 pl-4 transition-opacity duration-200" style={{ opacity: translateX > 20 ? 1 : 0 }}>
        <div className="w-12 h-12 bg-brand-50 text-brand-500 rounded-2xl flex items-center justify-center">
          <ChevronRight size={24} />
        </div>
      </div>

      <div className="absolute inset-y-0 right-0 w-24 flex items-center justify-center z-0 pr-4 transition-opacity duration-200" style={{ opacity: translateX < -20 ? 1 : 0 }}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="w-12 h-12 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center shadow-sm hover:bg-red-100 transition-colors"
        >
          <Trash2 size={20} />
        </button>
      </div>

      <div className="relative z-10" style={{ transform: `translateX(${translateX}px)`, transition: isDragging.current ? 'none' : 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)', touchAction: 'pan-y' }}
        onMouseDown={(e) => handleStart(e.clientX)} onMouseMove={(e) => handleMove(e.clientX)} onMouseUp={handleEnd} onMouseLeave={() => isDragging.current && handleEnd()}
        onTouchStart={(e) => handleStart(e.touches[0].clientX)} onTouchMove={(e) => handleMove(e.touches[0].clientX)} onTouchEnd={handleEnd}>
        {children}
      </div>
    </div>
  );
};

const Dashboard: React.FC<DashboardProps> = ({
  meals,
  targetCalories,
  onDelete,
  onShare,
  onUpdateMeal,
  onMealClick,
  currentUserId,
  userName,
  enableBabyMode = true,
  babyProfiles = [],
  settings
}) => {
  const startOfToday = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, []);

  const calculateMonths = (birthDateStr: string) => {
    if (!birthDateStr) return 0;
    const birth = new Date(birthDateStr);
    const now = new Date();
    let diff = (now.getFullYear() - birth.getFullYear()) * 12;
    diff -= birth.getMonth();
    diff += now.getMonth();
    return diff <= 0 ? 0 : diff;
  };

  const getBabyStageLabel = (months: number) => {
    if (months < 6) return '초기';
    if (months < 9) return '중기';
    if (months < 12) return '후기';
    return '유아식';
  };

  const getBabyTargetCalories = (months: number) => {
    if (months < 6) return 600;
    if (months < 12) return 800;
    return 1000;
  };

  const adultMeals = useMemo(() => meals.filter(m => !m.isBabyFood), [meals]);
  const babyMeals = useMemo(() => meals.filter(m => m.isBabyFood), [meals]);

  const todayAdultMeals = useMemo(() => adultMeals.filter(m => m.timestamp >= startOfToday), [adultMeals, startOfToday]);

  const totalCalories = todayAdultMeals.reduce((sum, meal) => sum + meal.nutrition.calories, 0);
  const remaining = Math.max(0, targetCalories - totalCalories);
  const percentage = Math.min((totalCalories / targetCalories) * 100, 100);

  const getFastingData = (mealList: Meal[], isBaby: boolean) => {
    if (!mealList || mealList.length === 0) return null;
    const sorted = [...mealList].sort((a, b) => b.timestamp - a.timestamp);
    const lastMeal = sorted[0];
    const diffMs = Date.now() - lastMeal.timestamp;
    const totalMinutes = Math.floor(diffMs / (1000 * 60));
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;

    const targetFastingHours = isBaby ? 4 : (settings.fastingGoal || 16);
    const progress = Math.min((totalMinutes / (targetFastingHours * 60)) * 100, 100);

    let status = isBaby ? "수유/이유식 간격" : "소화 중";
    let message = isBaby ? "아이의 다음 식사 시간을 체크해주세요." : "몸이 영양소를 흡수하고 있어요.";
    let icon = isBaby ? <Baby size={18} /> : <Zap size={18} />;

    if (!isBaby) {
      if (h >= targetFastingHours * 0.75) {
        status = "지방 연소 중";
        message = "본격적으로 체지방이 분해되는 시간이에요!";
        icon = <Flame size={18} />;
      } else if (h >= targetFastingHours * 0.5) {
        status = "공복 진입";
        message = "혈당이 안정화되고 있습니다.";
        icon = <CheckCircle2 size={18} />;
      }
    } else {
      if (h >= 3) {
        status = "배고픈 시간";
        message = "곧 다음 이유식을 준비할 시간이에요!";
        icon = <Sparkles size={18} />;
      }
    }

    return { hours: h, minutes: m, progress, status, message, icon, targetFastingHours };
  };

  const adultFasting = getFastingData(adultMeals, false);

  const [syncIdx, setSyncIdx] = useState(0);
  const isWidgetDragging = useRef(false);
  const isProgrammaticScroll = useRef(false);
  const widgetStartX = useRef(0);
  const widgetScrollLeftStartFasting = useRef(0);
  const widgetScrollLeftStartCalorie = useRef(0);

  const fastingScrollRef = useRef<HTMLDivElement>(null);
  const calorieScrollRef = useRef<HTMLDivElement>(null);

  const totalSlides = 1 + (enableBabyMode ? babyProfiles.length : 0);

  const handleDragStart = (e: React.MouseEvent) => {
    if (!fastingScrollRef.current || !calorieScrollRef.current) return;
    isWidgetDragging.current = true;
    widgetStartX.current = e.pageX;
    widgetScrollLeftStartFasting.current = fastingScrollRef.current.scrollLeft;
    widgetScrollLeftStartCalorie.current = calorieScrollRef.current.scrollLeft;
    [fastingScrollRef, calorieScrollRef].forEach(ref => {
      if (ref.current) {
        ref.current.style.scrollSnapType = 'none';
        ref.current.style.scrollBehavior = 'auto';
        ref.current.style.cursor = 'grabbing';
      }
    });
  };

  const handleDragMove = (e: React.MouseEvent) => {
    if (!isWidgetDragging.current || !fastingScrollRef.current || !calorieScrollRef.current) return;
    e.preventDefault();
    const walk = (e.pageX - widgetStartX.current);
    fastingScrollRef.current.scrollLeft = widgetScrollLeftStartFasting.current - walk;
    calorieScrollRef.current.scrollLeft = widgetScrollLeftStartCalorie.current - walk;
  };

  const handleDragEnd = () => {
    if (!isWidgetDragging.current) return;
    isWidgetDragging.current = false;
    [fastingScrollRef, calorieScrollRef].forEach(ref => {
      if (ref.current) {
        ref.current.style.scrollSnapType = 'x mandatory';
        ref.current.style.scrollBehavior = 'smooth';
        ref.current.style.cursor = 'grab';
      }
    });
  };

  const handleCycleReaction = (e: React.MouseEvent, meal: Meal) => {
    e.stopPropagation();
    const reactions: ('good' | 'soso' | 'bad')[] = ['good', 'soso', 'bad'];
    const current = meal.babyReaction || 'good';
    const nextIndex = (reactions.indexOf(current as any) + 1) % 3;
    const next = reactions[nextIndex];
    onUpdateMeal({ ...meal, babyReaction: next });
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>, isFasting: boolean) => {
    if (isProgrammaticScroll.current) return;

    const { scrollLeft, clientWidth } = e.currentTarget;
    if (clientWidth === 0) return;

    const index = Math.round(scrollLeft / clientWidth);
    if (index !== syncIdx) {
      setSyncIdx(index);
    }

    const otherRef = isFasting ? calorieScrollRef : fastingScrollRef;
    if (otherRef.current && Math.abs(otherRef.current.scrollLeft - scrollLeft) > 1) {
      isProgrammaticScroll.current = true;
      otherRef.current.scrollLeft = scrollLeft;
      requestAnimationFrame(() => {
        isProgrammaticScroll.current = false;
      });
    }
  };

  return (
    <div className="space-y-6 animate-[fadeIn_0.5s_ease-out] pb-6">
      <div>
        <h2 className="text-[24px] font-bold text-gray-800">
          안녕하세요, <span className="text-brand-500">{userName}님!</span> 👋
        </h2>
        <p className="text-gray-500 text-[14px] mt-1 font-medium">오늘도 건강한 한끼를 기록해보세요.</p>
      </div>

      <div className="relative group">
        <div
          ref={fastingScrollRef}
          className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar gap-0 pb-2 cursor-grab select-none"
          onScroll={(e) => handleScroll(e, true)}
          onMouseDown={handleDragStart}
          onMouseMove={handleDragMove}
          onMouseUp={handleDragEnd}
          onMouseLeave={handleDragEnd}
          style={{ scrollBehavior: 'smooth' }}
        >
          <div className="min-w-full snap-center px-1">
            <div className="bg-white p-6 rounded-[32px] shadow-soft border border-gray-100 relative overflow-hidden h-full min-h-[220px]">
              <div className="absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 rounded-full opacity-5 bg-brand-500"></div>
              <div className="relative z-10 flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-brand-50 text-brand-500">
                    {adultFasting?.icon || <Zap size={18} />}
                  </div>
                  <span className="text-[13px] font-bold text-gray-400 uppercase tracking-wider">나의 공복 상태</span>
                </div>
                <span className="text-[11px] font-bold text-brand-500 bg-brand-50 px-2 py-1 rounded-full">목표 {adultFasting?.targetFastingHours || settings.fastingGoal}h</span>
              </div>
              {adultFasting ? (
                <>
                  <div className="relative z-10 flex items-baseline gap-2 mb-4">
                    <span className="text-[42px] font-black tracking-tight text-gray-900">
                      {adultFasting.hours}<span className="text-[16px] font-bold ml-1 opacity-40">h</span> {adultFasting.minutes}<span className="text-[16px] font-bold ml-1 opacity-40">m</span>
                    </span>
                  </div>
                  <p className="text-[14px] font-medium mb-6 text-gray-500">{adultFasting.message}</p>
                  <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden relative">
                    <div className="absolute top-0 left-0 h-full rounded-full bg-brand-500 transition-all duration-1000" style={{ width: `${adultFasting.progress}%` }}></div>
                  </div>
                </>
              ) : (
                <p className="text-gray-400 text-[14px] py-10 text-center">오늘 첫 식사를 기록하면<br />공복 시간이 계산됩니다.</p>
              )}
            </div>
          </div>

          {enableBabyMode && babyProfiles.map((baby, idx) => {
            const babyMonths = calculateMonths(baby.birthDate);
            const specificBabyMeals = babyMeals.filter(m =>
              (baby.id && m.babyId === baby.id) || (!m.babyId && m.babyName === baby.name)
            );
            const babyFasting = getFastingData(specificBabyMeals, true);

            return (
              <div key={`fasting-baby-${idx}`} className="min-w-full snap-center px-1">
                <div className="bg-indigo-600 p-6 rounded-[32px] shadow-soft border border-indigo-500 text-white relative overflow-hidden h-full min-h-[220px]">
                  <div className="absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 rounded-full opacity-10 bg-white"></div>
                  <div className="relative z-10 flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-white/20 text-white">
                        {babyFasting?.icon || <Baby size={18} />}
                      </div>
                      <span className="text-[13px] font-bold text-indigo-100 uppercase tracking-wider">{baby.name}의 이유식 간격</span>
                    </div>
                    <span className="text-[11px] font-bold text-white bg-white/20 px-2 py-1 rounded-full">{babyMonths}개월 · {getBabyStageLabel(babyMonths)}</span>
                  </div>
                  {babyFasting ? (
                    <>
                      <div className="relative z-10 flex items-baseline gap-2 mb-4">
                        <span className="text-[42px] font-black tracking-tight text-white">
                          {babyFasting.hours}<span className="text-[16px] font-bold ml-1 opacity-60">h</span> {babyFasting.minutes}<span className="text-[16px] font-bold ml-1 opacity-60">m</span>
                        </span>
                      </div>
                      <p className="text-[14px] font-medium mb-6 text-indigo-100">{babyFasting.message}</p>
                      <div className="w-full h-2.5 bg-white/20 rounded-full overflow-hidden relative">
                        <div className="absolute top-0 left-0 h-full rounded-full bg-white transition-all duration-1000" style={{ width: `${babyFasting.progress}%` }}></div>
                      </div>
                    </>
                  ) : (
                    <p className="text-indigo-100/60 text-[14px] py-10 text-center">아이의 식단을 기록하면<br />이유식 간격이 표시됩니다.</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {totalSlides > 1 && (
          <div className="flex justify-center gap-1.5 mt-2">
            {Array.from({ length: totalSlides }).map((_, i) => (
              <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${syncIdx === i ? 'w-4 bg-brand-500' : 'bg-gray-200'}`}></div>
            ))}
          </div>
        )}
      </div>

      <div className="relative">
        <div
          ref={calorieScrollRef}
          className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar gap-0 pb-2 cursor-grab select-none"
          onScroll={(e) => handleScroll(e, false)}
          onMouseDown={handleDragStart}
          onMouseMove={handleDragMove}
          onMouseUp={handleDragEnd}
          onMouseLeave={handleDragEnd}
          style={{ scrollBehavior: 'smooth' }}
        >
          <div className="min-w-full snap-center px-1">
            <div className="bg-white p-6 rounded-[32px] shadow-soft border border-gray-100 h-full">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-gray-800 flex items-center gap-2 text-[15px] uppercase tracking-tight">
                  <Flame size={18} className="text-brand-500" />
                  나의 오늘의 칼로리
                </h3>
                <span className="text-[11px] font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-lg">
                  목표 {targetCalories} kcal
                </span>
              </div>
              <div className="flex items-end justify-between mb-4">
                <div>
                  <span className="text-[32px] font-black text-gray-900 tracking-tight">{totalCalories}</span>
                  <span className="text-[16px] font-bold text-gray-400 ml-1">kcal</span>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Remaining</p>
                  <p className="text-[16px] font-black text-brand-500">{remaining} kcal</p>
                </div>
              </div>
              <div className="w-full bg-gray-100 h-4 rounded-full overflow-hidden mb-2 p-1">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600 transition-all duration-1000 shadow-[0_0_10px_rgba(249,115,22,0.3)]"
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
            </div>
          </div>

          {enableBabyMode && babyProfiles.map((baby, idx) => {
            const babyMonths = calculateMonths(baby.birthDate);
            const babyTarget = getBabyTargetCalories(babyMonths);

            const specificBabyTodayMeals = babyMeals.filter(m =>
              ((baby.id && m.babyId === baby.id) || (!m.babyId && m.babyName === baby.name)) && m.timestamp >= startOfToday
            );
            const specificBabyTotalCalories = specificBabyTodayMeals.reduce((sum, meal) => sum + meal.nutrition.calories, 0);
            const babyProgress = Math.min((specificBabyTotalCalories / babyTarget) * 100, 100);

            return (
              <div key={`calorie-baby-${idx}`} className="min-w-full snap-center px-1">
                <div className="bg-white p-6 rounded-[32px] shadow-soft border border-indigo-50 h-full">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-indigo-900 flex items-center gap-2 text-[15px] uppercase tracking-tight">
                      <Baby size={18} className="text-indigo-500" />
                      {baby.name}의 오늘의 칼로리
                    </h3>
                    <span className="text-[11px] font-bold text-indigo-400 bg-indigo-50 px-2 py-1 rounded-lg">
                      목표 {babyTarget} kcal
                    </span>
                  </div>
                  <div className="flex items-end justify-between mb-4">
                    <div>
                      <span className="text-[32px] font-black text-indigo-900 tracking-tight">{specificBabyTotalCalories}</span>
                      <span className="text-[16px] font-bold text-indigo-300 ml-1">kcal</span>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] font-black text-indigo-300 uppercase tracking-widest mb-0.5">Today Total</p>
                      <p className="text-[16px] font-black text-indigo-500">{specificBabyTodayMeals.length} 끼니</p>
                    </div>
                  </div>
                  <div className="w-full bg-indigo-50 h-4 rounded-full overflow-hidden mb-2 p-1">
                    <div
                      className="h-full rounded-full bg-indigo-500 transition-all duration-1000 shadow-[0_0_10px_rgba(99,102,241,0.3)]"
                      style={{ width: `${babyProgress}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {totalSlides > 1 && (
          <div className="flex justify-center gap-1.5 mt-2">
            {Array.from({ length: totalSlides }).map((_, i) => (
              <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${syncIdx === i ? 'w-4 bg-brand-500' : 'bg-gray-200'}`}></div>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-5 px-1">
          <h3 className="text-[18px] font-bold text-gray-800">최근 기록</h3>
        </div>

        {meals.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-[32px] border-2 border-dashed border-gray-100">
            <div className="w-16 h-16 bg-brand-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Utensils className="text-brand-200" size={32} />
            </div>
            <p className="text-gray-400 text-[14px] font-medium">아직 기록된 식단이 없습니다.</p>
            <p className="text-brand-500 text-[14px] font-bold mt-2">오늘의 첫 끼를 기록해볼까요?</p>
          </div>
        ) : (
          <div className="space-y-4">
            {meals.slice(0, 3).map((meal) => (
              <SwipeableMealItem
                key={meal.id}
                onDelete={() => onDelete(meal.id)}
                onSwipeRight={() => onMealClick?.(meal)}
              >
                <div
                  className={`bg-white p-4 rounded-[28px] border shadow-sm flex items-center gap-4 transition-all hover:shadow-md ${meal.isBabyFood ? 'border-indigo-50' : 'border-gray-100'
                    }`}
                >
                  <div className={`w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0 shadow-inner relative ${meal.isBabyFood ? 'bg-indigo-50' : 'bg-gray-100'
                    }`}>
                    {meal.image ? (
                      <img src={meal.image} alt={meal.foodName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        {meal.isBabyFood ? <Baby size={24} className="text-indigo-200" /> : <Utensils size={24} className="text-gray-200" />}
                      </div>
                    )}
                    {meal.isBabyFood && (
                      <div className="absolute top-0 left-0 bg-indigo-500 text-white p-1 rounded-br-lg">
                        <Baby size={11} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg ${meal.isBabyFood ? 'bg-indigo-100 text-indigo-600' : 'bg-brand-50 text-brand-600'
                        }`}>
                        {MEAL_TYPE_LABELS[meal.type] || meal.type}
                      </span>
                      <span className="text-[11px] font-bold text-gray-300">
                        {new Date(meal.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {meal.isBabyFood && meal.babyName && (
                        <span className="text-[11px] font-bold text-indigo-400 bg-indigo-50 px-1.5 py-0.5 rounded ml-auto">
                          {meal.babyName}
                        </span>
                      )}
                    </div>
                    <h4 className="font-bold text-gray-800 text-[16px] truncate">{meal.foodName}</h4>
                    <div className="flex items-center gap-3 mt-1.5">
                      <div className="flex items-center gap-1 text-[12px] font-bold text-gray-400">
                        <span className="text-brand-400">🔥</span>
                        {meal.nutrition.calories} kcal
                      </div>
                      {meal.isBabyFood && meal.babyReaction && (
                        <div
                          onClick={(e) => handleCycleReaction(e, meal)}
                          className="flex items-center gap-1 text-[12px] font-bold text-indigo-400 hover:text-indigo-600 transition-colors"
                        >
                          {meal.babyReaction === 'good' ? <Smile size={12} /> : meal.babyReaction === 'soso' ? <Meh size={12} /> : <Frown size={12} />}
                          반응 {meal.babyReaction === 'good' ? '좋음' : meal.babyReaction === 'soso' ? '보통' : '거부'}
                        </div>
                      )}
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-gray-300" />
                </div>
              </SwipeableMealItem>
            ))}
          </div>
        )}
      </div>

      {/* 광고 삽입 공간 (Ad Section) - 히든 처리 */}
      <div className="hidden bg-white p-2 rounded-[32px] shadow-soft border border-gray-100 overflow-hidden min-h-[100px] flex items-center justify-center relative group cursor-pointer transition-all hover:shadow-md">
        <div className="absolute top-2 right-4 text-[10px] font-bold text-gray-300 tracking-widest uppercase">AD</div>
        <div className="w-full h-full bg-gray-50 rounded-[24px] flex flex-col items-center justify-center p-4 border border-dashed border-gray-200">
          <p className="text-gray-400 text-[13px] font-bold mb-1">맞춤 건강 식품 추천</p>
          <p className="text-gray-300 text-[11px]">추후 광고 내용이 삽입될 공간입니다.</p>
        </div>
      </div>

      <div className="bg-indigo-50 p-6 rounded-[32px] border border-indigo-100 flex items-start gap-4">
        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm">
          <Sparkles className="text-indigo-500" size={24} />
        </div>
        <div>
          <h4 className="font-bold text-indigo-900 text-[15px] mb-1">한끼 AI 팁</h4>
          <p className="text-[13px] text-indigo-700 leading-relaxed font-medium">
            {meals.length > 0 && meals[0].aiTip
              ? meals[0].aiTip
              : (babyProfiles.length > 0
                ? `${babyProfiles[0].name}의 식단 사진을 찍으면 AI가 맞춤형 영양 팁을 알려드려요!`
                : "식단 사진을 찍으면 AI가 맞춤형 건강 팁을 알려드려요!")}
          </p>
        </div>
      </div>
    </div >
  );
};

export default Dashboard;


import React, { useState, useMemo, useRef, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, AreaChart, Area, CartesianGrid } from 'recharts';
import { Meal, BabyProfile } from '../types';
import { Carrot, AlertTriangle, Utensils, Award, Calendar as CalendarIcon, Sparkles, TrendingUp, ChevronLeft, ChevronRight, X, Check, EyeOff } from 'lucide-react';

interface StatsProps {
  meals: Meal[];
  targetCalories: number;
  babyProfiles: BabyProfile[];
  enableBabyMode: boolean;
}

const COLORS = ['#FF6B6B', '#4ECDC4', '#FFD93D'];

const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: '아침',
  lunch: '점심',
  dinner: '저녁',
  snack: '간식'
};

const Stats: React.FC<StatsProps> = ({ meals, targetCalories, babyProfiles, enableBabyMode }) => {
  const [activeTab, setActiveTab] = useState<'general' | 'baby'>('general');
  const [selectedBabyIdx, setSelectedBabyIdx] = useState(0);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isSwiping, setIsSwiping] = useState(false); 
  
  // 캘린더 모달 상태 관리
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [calViewDate, setCalViewDate] = useState(new Date());

  const scrollRef = useRef<HTMLDivElement>(null);
  const myDateScrollRef = useRef<HTMLDivElement>(null);
  
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeftStart = useRef(0);

  const isStripDragging = useRef(false);
  const stripStartX = useRef(0);
  const stripScrollLeftStart = useRef(0);

  // 날짜 리스트 생성 로직 수정: 과거 30일 ~ 미래 3일까지 생성
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

  // 오늘 날짜 중앙 정렬 함수
  const scrollToToday = (ref: React.RefObject<HTMLDivElement | null>) => {
    const container = ref.current;
    if (!container) return;

    requestAnimationFrame(() => {
      if (container.clientWidth === 0) return;

      const todayIndex = dateList.findIndex(d => d.toDateString() === new Date().toDateString());
      if (todayIndex >= 0) {
        const targetElement = container.children[todayIndex] as HTMLElement;
        if (targetElement) {
          const containerRect = container.getBoundingClientRect();
          const targetRect = targetElement.getBoundingClientRect();
          
          const relativeOffset = targetRect.left - containerRect.left;
          const centerAdjustment = (containerRect.width / 2) - (targetRect.width / 2);
          const scrollAmount = relativeOffset - centerAdjustment;
          
          const originalSnap = container.style.scrollSnapType;
          container.style.scrollSnapType = 'none';
          
          container.scrollBy({
            left: scrollAmount,
            behavior: 'smooth'
          });

          setTimeout(() => {
            if (container) container.style.scrollSnapType = originalSnap;
          }, 500);
        }
      }
    });
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeTab === 'general') {
        scrollToToday(myDateScrollRef);
      }
    }, 350); 
    
    return () => clearTimeout(timer);
  }, [activeTab, isSwiping, dateList]);

  const adultMeals = useMemo(() => meals.filter(m => !m.isBabyFood), [meals]);
  
  const babyProfile = babyProfiles[selectedBabyIdx] || babyProfiles[0];
  const selectedBabyMeals = useMemo(() => {
      return meals.filter(m => 
          m.isBabyFood && 
          ((babyProfile?.id && m.babyId === babyProfile.id) || 
           (!m.babyId && m.babyName === babyProfile?.name))
      );
  }, [meals, babyProfile]);

  const hasDataForDate = (date: Date) => {
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    const end = start + (24 * 60 * 60 * 1000);
    const checkMeals = activeTab === 'general' ? adultMeals : selectedBabyMeals;
    return checkMeals.some(m => m.timestamp >= start && m.timestamp < end);
  };

  const todayMeals = useMemo(() => {
    const start = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate()).getTime();
    const end = start + (24 * 60 * 60 * 1000);
    return adultMeals.filter(m => m.timestamp >= start && m.timestamp < end);
  }, [adultMeals, selectedDate]);

  const totalNutrition = todayMeals.reduce(
    (acc, meal) => ({
      calories: acc.calories + meal.nutrition.calories,
      carbs: acc.carbs + meal.nutrition.carbs,
      protein: acc.protein + meal.nutrition.protein,
      fat: acc.fat + meal.nutrition.fat,
    }),
    { calories: 0, carbs: 0, protein: 0, fat: 0 }
  );
  
  const caloriesByMeal = todayMeals.reduce(
    (acc, meal) => {
        if (acc[meal.type] !== undefined) {
            acc[meal.type] += meal.nutrition.calories;
        }
        return acc;
    },
    { breakfast: 0, lunch: 0, dinner: 0, snack: 0 } as Record<string, number>
  );

  // 모든 식단이 본인 것이거나, 공유 설정이 되어 있는 경우에만 상세 정보 표시
  // Stats에서는 기본적으로 본인 데이터 위주이므로 true로 설정되나, 
  // 확장성을 위해 필터링된 식단 중 접근 권한 확인 로직 포함 가능
  const canSeeDetails = true; 

  // 영양소별 칼로리 계산 반영 (탄수화물 4, 단백질 4, 지방 9)
  const macroData = useMemo(() => [
    { name: '탄수화물', value: Math.round(totalNutrition.carbs * 4), grams: totalNutrition.carbs },
    { name: '단백질', value: Math.round(totalNutrition.protein * 4), grams: totalNutrition.protein },
    { name: '지방', value: Math.round(totalNutrition.fat * 9), grams: totalNutrition.fat },
  ], [totalNutrition]);

  const { weeklyData, weeklySummary, weekRangeLabel } = useMemo(() => {
    const d = new Date(selectedDate);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    
    const weekRangeLabel = `${monday.getMonth() + 1}/${monday.getDate()} ~ ${sunday.getMonth() + 1}/${sunday.getDate()}`;

    const days = ['월', '화', '수', '목', '금', '토', '일'];
    const stats = days.map(dayLabel => ({ day: dayLabel, cal: 0 }));
    let totalWeekCal = 0;
    let activeDays = 0;
    let targetMetDays = 0;

    adultMeals.forEach(meal => {
        if (meal.timestamp >= monday.getTime() && meal.timestamp <= sunday.getTime()) {
            const mealDate = new Date(meal.timestamp);
            const dayIndex = mealDate.getDay() === 0 ? 6 : mealDate.getDay() - 1;
            if (dayIndex >= 0 && dayIndex < 7) {
                if (stats[dayIndex].cal === 0) activeDays++;
                stats[dayIndex].cal += meal.nutrition.calories;
            }
        }
    });

    stats.forEach(s => {
        if (s.cal > 0) {
            totalWeekCal += s.cal;
            if (s.cal >= targetCalories * 0.8 && s.cal <= targetCalories * 1.2) {
                targetMetDays++;
            }
        }
    });

    const avgCal = activeDays > 0 ? Math.round(totalWeekCal / activeDays) : 0;
    let insight = "기록을 시작하면 AI가 일주일의 식단을 분석해 드립니다.";
    if (activeDays > 0) {
        if (avgCal > targetCalories * 1.1) insight = "목표보다 칼로리 섭취가 다소 많습니다.";
        else if (avgCal < targetCalories * 0.8) insight = "에너지 섭취가 다소 부족합니다.";
        else insight = "아주 훌륭한 섭취량을 유지하고 계십니다!";
    }

    return { 
        weeklyData: stats, 
        weeklySummary: { avgCal, activeDays, targetMetDays, insight },
        weekRangeLabel
    };
  }, [adultMeals, selectedDate, targetCalories]);

  const { monthlyData, monthLabel } = useMemo(() => {
    const stats = [];
    const anchorDate = new Date(selectedDate);
    const monthLabel = `${anchorDate.getMonth() + 1}월 분석`;

    for (let i = 3; i >= 0; i--) {
        const d = new Date(anchorDate);
        d.setDate(anchorDate.getDate() - (i * 7));
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(d.setDate(diff));
        monday.setHours(0, 0, 0, 0);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        const weekMeals = adultMeals.filter(m => m.timestamp >= monday.getTime() && m.timestamp <= sunday.getTime());
        const totalCal = weekMeals.reduce((acc, m) => acc + m.nutrition.calories, 0);
        const avgCal = Math.round(totalCal / 7);
        let label = i === 0 ? '선택주' : i === 1 ? '1주전' : `${i}주전`;
        stats.push({ week: label, avg: avgCal });
    }
    return { monthlyData: stats, monthLabel };
  }, [adultMeals, selectedDate]);

  const percentage = Math.min((totalNutrition.calories / targetCalories) * 100, 100);

  const { babyWeeklyData, babyInsight, babyWeekRangeLabel } = useMemo(() => {
    const d = new Date(selectedDate);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    
    const babyWeekRangeLabel = `${monday.getMonth() + 1}/${monday.getDate()} ~ ${sunday.getMonth() + 1}/${sunday.getDate()}`;

    const days = ['월', '화', '수', '목', '금', '토', '일'];
    const stats = days.map(dayLabel => ({ day: dayLabel, count: 0 }));
    let totalIngredients = new Set();

    selectedBabyMeals.forEach(meal => {
        if (meal.timestamp >= monday.getTime() && meal.timestamp <= sunday.getTime()) {
            const mealDate = new Date(meal.timestamp);
            const dayIndex = mealDate.getDay() === 0 ? 6 : mealDate.getDay() - 1;
            if (dayIndex >= 0 && dayIndex < 7) {
                stats[dayIndex].count += 1;
                meal.ingredients?.forEach(i => totalIngredients.add(i));
            }
        }
    });

    let insight = "아이의 이유식 기록을 통해 건강 성장 보고서를 작성해 드립니다.";
    const totalMeals = stats.reduce((acc, s) => acc + s.count, 0);
    if (totalMeals > 0) {
        if (totalIngredients.size >= 10) insight = "다양한 식재료를 경험하고 있네요!";
        else insight = "새로운 재료를 한두 가지씩 추가해보세요.";
    }

    return { babyWeeklyData: stats, babyInsight: insight, babyWeekRangeLabel };
  }, [selectedBabyMeals, selectedDate]);

  const { babyMonthlyData, babyMonthLabel } = useMemo(() => {
    const stats = [];
    const anchorDate = new Date(selectedDate);
    const babyMonthLabel = `${anchorDate.getMonth() + 1}월 리포트`;

    for (let i = 3; i >= 0; i--) {
        const d = new Date(anchorDate);
        d.setDate(anchorDate.getDate() - (i * 7));
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(d.setDate(diff));
        monday.setHours(0, 0, 0, 0);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        const weekMeals = selectedBabyMeals.filter(m => m.timestamp >= monday.getTime() && m.timestamp <= sunday.getTime());
        const totalCal = weekMeals.reduce((acc, m) => acc + m.nutrition.calories, 0);
        const avgCal = Math.round(totalCal / 7);
        let label = i === 0 ? '선택주' : i === 1 ? '1주전' : `${i}주전`;
        stats.push({ week: label, avg: avgCal });
    }
    return { babyMonthlyData: stats, babyMonthLabel };
  }, [selectedBabyMeals, selectedDate]);

  const allIngredients = selectedBabyMeals.flatMap(m => m.ingredients || []);
  const uniqueIngredients = [...new Set(allIngredients)];
  const allergenExposureCount = selectedBabyMeals.filter(m => {
      return m.ingredients?.some(ing => babyProfile?.allergies.some(allergy => ing.includes(allergy) || allergy.includes(ing)));
  }).length;

  const handleTabClick = (tab: 'general' | 'baby') => {
      setActiveTab(tab);
      if (scrollRef.current) {
          const width = scrollRef.current.clientWidth;
          scrollRef.current.scrollTo({ left: tab === 'general' ? 0 : width, behavior: 'smooth' });
      }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
      if (isDragging.current) return;
      const { scrollLeft, clientWidth } = e.currentTarget;
      if (clientWidth === 0) return;
      const index = Math.round(scrollLeft / clientWidth);
      const newTab = index === 0 ? 'general' : 'baby';
      if (newTab !== activeTab) setActiveTab(newTab);
  };

  const handleDragStart = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    isDragging.current = true;
    setIsSwiping(true);
    startX.current = e.pageX - scrollRef.current.offsetLeft;
    scrollLeftStart.current = scrollRef.current.scrollLeft;
    scrollRef.current.style.scrollSnapType = 'none';
    scrollRef.current.style.cursor = 'grabbing';
  };

  const handleDragMove = (e: React.MouseEvent) => {
    if (!isDragging.current || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX.current);
    scrollRef.current.scrollLeft = scrollLeftStart.current - walk;
  };

  const handleDragEnd = () => {
    if (!isDragging.current || !scrollRef.current) return;
    isDragging.current = false;
    setTimeout(() => setIsSwiping(false), 300);
    scrollRef.current.style.scrollSnapType = 'x mandatory';
    scrollRef.current.style.cursor = 'grab';
    const { scrollLeft, clientWidth } = scrollRef.current;
    const index = Math.round(scrollLeft / clientWidth);
    scrollRef.current.scrollTo({ left: index * clientWidth, behavior: 'smooth' });
    setActiveTab(index === 0 ? 'general' : 'baby');
  };

  const shiftDate = (days: number) => {
      const newDate = new Date(selectedDate);
      newDate.setDate(newDate.getDate() + days);
      setSelectedDate(newDate);
  };

  const handleStripDragStart = (e: React.MouseEvent, ref: React.RefObject<HTMLDivElement | null>) => {
    e.stopPropagation();
    if (!ref.current) return;
    isStripDragging.current = true;
    stripStartX.current = e.pageX - ref.current.offsetLeft;
    stripScrollLeftStart.current = ref.current.scrollLeft;
    ref.current.style.scrollSnapType = 'none';
    ref.current.style.cursor = 'grabbing';
  };

  const handleStripDragMove = (e: React.MouseEvent, ref: React.RefObject<HTMLDivElement | null>) => {
    if (!isStripDragging.current || !ref.current) return;
    e.stopPropagation();
    e.preventDefault();
    const x = e.pageX - ref.current.offsetLeft;
    const walk = (x - stripStartX.current) * 1.5;
    ref.current.scrollLeft = stripScrollLeftStart.current - walk;
  };

  const handleStripDragEnd = (ref: React.RefObject<HTMLDivElement | null>) => {
    if (!isStripDragging.current || !ref.current) return;
    isStripDragging.current = false;
    ref.current.style.scrollSnapType = 'x mandatory';
    ref.current.style.cursor = 'default';
  };

  const handlePreventFocus = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  const renderDateStrip = (stripRef: React.RefObject<HTMLDivElement | null>) => (
      <div 
        ref={stripRef} 
        className="flex overflow-x-auto no-scrollbar gap-2 pb-4 pt-1 px-1 snap-x select-none"
        onMouseDown={(e) => handleStripDragStart(e, stripRef)}
        onMouseMove={(e) => handleStripDragMove(e, stripRef)}
        onMouseUp={() => handleStripDragEnd(stripRef)}
        onMouseLeave={() => handleStripDragEnd(stripRef)}
      >
          {dateList.map((date, i) => {
              const isSelected = date.toDateString() === selectedDate.toDateString();
              const isToday = date.toDateString() === new Date().toDateString();
              const hasData = hasDataForDate(date);
              return (
                  <button key={i} onClick={(e) => { e.stopPropagation(); if (!isStripDragging.current) setSelectedDate(date); }}
                    onMouseDown={handlePreventFocus}
                    className={`flex flex-col items-center min-w-[50px] py-2 rounded-2xl border transition-all snap-center focus:outline-none ${
                        isSelected 
                        ? (activeTab === 'general' ? 'bg-brand-500 border-brand-500 text-white shadow-md' : 'bg-indigo-500 border-indigo-500 text-white shadow-md')
                        : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200'
                    }`}
                  >
                      <span className="text-[10px] font-bold uppercase mb-0.5">{date.toLocaleDateString('en-US', {weekday: 'short'})}</span>
                      <span className="text-[15px] font-black">{date.getDate()}</span>
                      <div className="h-1 flex items-center justify-center mt-0.5">
                          {hasData && <div className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white/80' : (activeTab === 'general' ? 'bg-brand-400' : 'bg-indigo-400')}`}></div>}
                          {!hasData && isToday && !isSelected && <div className="w-1 h-1 rounded-full bg-gray-200"></div>}
                      </div>
                  </button>
              );
          })}
      </div>
  );

  const getDisplayDate = () => {
      if (selectedDate.toDateString() === new Date().toDateString()) return '오늘';
      return `${selectedDate.getMonth() + 1}월 ${selectedDate.getDate()}일`;
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
              onMouseDown={handlePreventFocus}
              className={`h-10 w-10 rounded-full flex flex-col items-center justify-center relative transition-all focus:outline-none ${
                  isSelected ? (activeTab === 'general' ? 'bg-brand-500 text-white shadow-md' : 'bg-indigo-500 text-white shadow-md') : 'hover:bg-gray-100'
              }`}
            >
                <span className={`text-[14px] font-bold ${isToday && !isSelected ? 'text-brand-500' : ''}`}>{d}</span>
                {hasData && <div className={`w-1 h-1 rounded-full absolute bottom-1.5 ${isSelected ? 'bg-white' : 'bg-brand-400'}`}></div>}
            </button>
        );
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6 animate-[fadeIn_0.2s_ease-out]">
            <div className="bg-white w-full max-w-[340px] rounded-[32px] p-6 shadow-2xl animate-[scaleIn_0.2s_ease-out]">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-black text-gray-800">{year}년 {month + 1}월</h3>
                    <div className="flex gap-1">
                        <button onClick={prevMonth} onMouseDown={handlePreventFocus} className="p-2 hover:bg-gray-100 rounded-full focus:outline-none"><ChevronLeft size={20} className="text-gray-400" /></button>
                        <button onClick={nextMonth} onMouseDown={handlePreventFocus} className="p-2 hover:bg-gray-100 rounded-full focus:outline-none"><ChevronRight size={20} className="text-gray-400" /></button>
                        <button onClick={() => setIsCalendarOpen(false)} onMouseDown={handlePreventFocus} className="p-2 bg-gray-100 text-gray-500 rounded-full ml-1 focus:outline-none"><X size={18} /></button>
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
                  onMouseDown={handlePreventFocus}
                  className={`w-full mt-6 py-3.5 text-white rounded-2xl font-bold text-[14px] active:scale-95 transition-all focus:outline-none ${activeTab === 'general' ? 'bg-gray-900' : 'bg-indigo-600'}`}
                >오늘로 이동</button>
            </div>
        </div>
    );
  };

  return (
    <div className="space-y-6 animate-[fadeIn_0.5s_ease-out] flex flex-col h-full pb-6">
      {enableBabyMode && (
          <div className="flex bg-gray-100/80 p-1.5 rounded-2xl shrink-0">
              <button onClick={() => handleTabClick('general')}
                  onMouseDown={handlePreventFocus}
                  className={`flex-1 py-3 text-[15px] font-bold rounded-xl transition-all duration-300 focus:outline-none ${
                      activeTab === 'general' ? 'bg-white text-gray-900 shadow-md transform scale-100' : 'text-gray-400'
                  }`}
              >👤 나의 분석</button>
              <button onClick={() => handleTabClick('baby')}
                  onMouseDown={handlePreventFocus}
                  className={`flex-1 py-3 text-[15px] font-bold rounded-xl transition-all duration-300 focus:outline-none ${
                      activeTab === 'baby' ? 'bg-white text-indigo-600 shadow-md transform scale-100' : 'text-gray-400'
                  }`}
              >👶 아이 분석</button>
          </div>
      )}

      <div 
        ref={scrollRef}
        className="flex-1 flex overflow-x-auto no-scrollbar snap-x snap-mandatory select-none items-start cursor-grab"
        onScroll={handleScroll}
        onMouseDown={handleDragStart}
        onMouseMove={handleDragMove}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
      >
        {/* Section 1: My Analysis */}
        <div className="min-w-full snap-center px-1 space-y-6">
            {(activeTab === 'general' || isSwiping) ? (
                <>
                    {renderDateStrip(myDateScrollRef)}
                    <div className="bg-white p-6 rounded-[32px] shadow-soft border border-gray-100">
                        <div className="flex items-center justify-between mb-4 gap-2">
                            <h2 className="text-[19px] font-bold text-gray-800 truncate flex-1">{getDisplayDate()}의 섭취량</h2>
                            <button 
                                onClick={() => { setCalViewDate(selectedDate); setIsCalendarOpen(true); }}
                                onMouseDown={handlePreventFocus}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-300 hover:text-brand-500 shrink-0 focus:outline-none"
                            >
                                <CalendarIcon size={18} />
                            </button>
                        </div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[31px] font-bold text-brand-600">{totalNutrition.calories}</span>
                            <span className="text-gray-400 text-[15px]">/ {targetCalories} kcal</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-3 mb-6 overflow-hidden">
                            <div className="bg-brand-500 h-3 rounded-full transition-all duration-1000 ease-out" style={{ width: `${percentage}%` }}></div>
                        </div>
                        <div 
                          onMouseDown={handlePreventFocus}
                          className="h-48 w-full flex items-center justify-center relative focus:outline-none"
                        >
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie 
                                      data={macroData} 
                                      cx="50%" 
                                      cy="50%" 
                                      innerRadius={55} 
                                      outerRadius={75} 
                                      paddingAngle={8} 
                                      dataKey="value"
                                      stroke="none"
                                    >
                                        {macroData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip 
                                      content={({ active, payload }) => {
                                          if (active && payload && payload.length) {
                                              const data = payload[0].payload;
                                              return (
                                                  <div className="bg-white p-3 rounded-2xl shadow-xl border border-gray-50 flex flex-col gap-1">
                                                      <p className="text-[12px] font-bold text-gray-400">{data.name}</p>
                                                      <p className="text-[16px] font-black text-gray-800">{data.value} <span className="text-[11px] font-normal text-gray-400">kcal</span></p>
                                                      <p className="text-[11px] font-bold text-brand-500">{data.grams}g</p>
                                                  </div>
                                              );
                                          }
                                          return null;
                                      }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                            {/* Center Guide Label */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-0.5">Today</p>
                                <p className="text-[26px] font-black text-gray-800 leading-none">{totalNutrition.calories}</p>
                                <p className="text-[11px] font-bold text-gray-400 mt-0.5">kcal</p>
                            </div>
                        </div>

                        {/* 영양별 칼로리 및 그람수 노출 영역 (아침/점심/저녁 영역 위) */}
                        <div className="flex justify-around py-4 mt-6 border-t border-gray-50 bg-gray-50/50 rounded-[20px] mx-1 relative">
                            {macroData.map((m, idx) => (
                                <div key={idx} className="text-center">
                                    <p className="text-[11px] font-bold text-gray-400 mb-1">{m.name}</p>
                                    {canSeeDetails ? (
                                        <>
                                            <p className="text-[16px] font-black text-gray-800 leading-tight">{m.value}<span className="text-[10px] ml-0.5 opacity-40">kcal</span></p>
                                            <p className="text-[12px] font-bold text-brand-500">{m.grams}g</p>
                                        </>
                                    ) : (
                                        <div className="flex flex-col items-center gap-1 py-1">
                                            <EyeOff size={10} className="text-gray-300" />
                                            <div className="h-1.5 w-8 bg-gray-100 rounded-full"></div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-4 gap-2 mt-4 pt-4 border-t border-gray-100">
                            {Object.entries(caloriesByMeal).map(([type, calories]) => (
                                <div key={type} className="text-center">
                                    <span className="text-[13px] text-gray-400 block mb-1">{MEAL_TYPE_LABELS[type]}</span>
                                    <span className="text-[15px] font-bold text-gray-800">
                                        {canSeeDetails ? Math.round(Number(calories)) : '-'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 광고 삽입 공간 (Ad Section) - 히든 처리 */}
                    <div className="hidden bg-white p-2 rounded-[32px] shadow-soft border border-gray-100 overflow-hidden min-h-[100px] flex items-center justify-center relative group cursor-pointer transition-all hover:shadow-md">
                        <div className="absolute top-2 right-4 text-[9px] font-bold text-gray-300 tracking-widest uppercase">AD</div>
                        <div className="w-full h-full bg-gray-50 rounded-[24px] flex flex-col items-center justify-center p-4 border border-dashed border-gray-200">
                            <p className="text-gray-400 text-[13px] font-bold mb-1">건강한 다이어트 도시락 추천</p>
                            <p className="text-gray-300 text-[11px]">맞춤형 식단 상품 광고가 위치할 공간입니다.</p>
                        </div>
                    </div>
                    
                    <div className="bg-white p-6 rounded-[32px] shadow-soft border border-gray-100">
                        <div className="flex items-center justify-between mb-4 gap-2">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                <Sparkles size={18} className="text-brand-500 shrink-0" />
                                <h2 className="text-[19px] font-bold text-gray-800 truncate">AI 주간 보고서</h2>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <span className="text-[11px] font-bold text-gray-400 whitespace-nowrap">{weekRangeLabel}</span>
                                <div className="flex bg-gray-50 rounded-lg p-0.5 border border-gray-100 items-center">
                                    <button onClick={() => shiftDate(-7)} onMouseDown={handlePreventFocus} className="p-1 hover:bg-white rounded-md text-gray-400 hover:text-brand-500 focus:outline-none"><ChevronLeft size={16} /></button>
                                    <button 
                                        onClick={() => { setCalViewDate(selectedDate); setIsCalendarOpen(true); }}
                                        onMouseDown={handlePreventFocus}
                                        className="p-1 hover:bg-white rounded-md text-gray-300 hover:text-brand-500 focus:outline-none"
                                    ><CalendarIcon size={14} /></button>
                                    <button onClick={() => shiftDate(7)} onMouseDown={handlePreventFocus} className="p-1 hover:bg-white rounded-md text-gray-400 hover:text-brand-500 focus:outline-none"><ChevronRight size={16} /></button>
                                </div>
                            </div>
                        </div>
                        <div 
                          onMouseDown={handlePreventFocus}
                          className="h-48 w-full focus:outline-none"
                        >
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={weeklyData}>
                                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fontSize: 13, fill: '#9CA3AF'}} />
                                    <YAxis hide />
                                    <Tooltip cursor={{fill: '#f3f4f6'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'}} />
                                    <Bar dataKey="cal" fill="#FF6B6B" radius={[6, 6, 0, 0]} barSize={20} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-[32px] shadow-soft border border-gray-100">
                        <div className="flex items-center justify-between mb-4 gap-2">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                <TrendingUp size={18} className="text-orange-500 shrink-0" />
                                <h2 className="text-[19px] font-bold text-gray-800 truncate">월간 섭취 트렌드</h2>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <span className="text-[11px] font-bold text-gray-400 whitespace-nowrap">{monthLabel}</span>
                                <div className="flex bg-gray-50 rounded-lg p-0.5 border border-gray-100 items-center">
                                    <button onClick={() => shiftDate(-28)} onMouseDown={handlePreventFocus} className="p-1 hover:bg-white rounded-md text-gray-400 hover:text-orange-500 focus:outline-none"><ChevronLeft size={16} /></button>
                                    <button 
                                        onClick={() => { setCalViewDate(selectedDate); setIsCalendarOpen(true); }}
                                        onMouseDown={handlePreventFocus}
                                        className="p-1 hover:bg-white rounded-md text-gray-300 hover:text-orange-500 focus:outline-none"
                                    ><CalendarIcon size={14} /></button>
                                    <button onClick={() => shiftDate(28)} onMouseDown={handlePreventFocus} className="p-1 hover:bg-white rounded-md text-gray-400 hover:text-orange-500 focus:outline-none"><ChevronRight size={16} /></button>
                                </div>
                            </div>
                        </div>
                        <div 
                          onMouseDown={handlePreventFocus}
                          className="h-48 w-full focus:outline-none"
                        >
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={monthlyData}>
                                    <defs><linearGradient id="colorCal" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#FB923C" stopOpacity={0.8}/><stop offset="95%" stopColor="#FB923C" stopOpacity={0}/></linearGradient></defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                    <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{fontSize: 13, fill: '#9CA3AF'}} />
                                    <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'}} />
                                    <Area type="monotone" dataKey="avg" stroke="#F97316" fillOpacity={1} fill="url(#colorCal)" strokeWidth={3} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </>
            ) : <div className="h-20" />}
        </div>

        {/* Section 2: Baby Analysis */}
        {enableBabyMode && (
          <div className="min-w-full snap-center px-1 space-y-4">
             {(activeTab === 'baby' || isSwiping) ? (
                 <>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-indigo-50 p-5 rounded-[28px] border border-indigo-100 flex flex-col justify-between h-36 relative overflow-hidden group">
                            <div className="relative z-10">
                                <div className="flex items-center gap-2 mb-2 text-indigo-500"><Carrot size={20} /><span className="text-[13px] font-bold">경험한 식재료</span></div>
                                <p className="text-[31px] font-black text-indigo-900">{uniqueIngredients.length}<span className="text-[15px] font-medium text-indigo-400">개</span></p>
                            </div>
                        </div>
                        <div className="bg-pink-50 p-5 rounded-[28px] border border-pink-100 flex flex-col justify-between h-36 relative overflow-hidden group">
                            <div className="relative z-10">
                                <div className="flex items-center gap-2 mb-2 text-pink-500"><AlertTriangle size={20} /><span className="text-[13px] font-bold">알레르기 체크</span></div>
                                <p className="text-[31px] font-black text-pink-900">{allergenExposureCount}<span className="text-[15px] font-medium text-pink-400">회</span></p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-[32px] shadow-soft border border-gray-100">
                        <div className="flex items-center justify-between mb-4 gap-2">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                <Sparkles size={18} className="text-indigo-500 shrink-0" />
                                <h2 className="text-[19px] font-bold text-gray-800 truncate">주간 이유식 성장 보고서</h2>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <span className="text-[11px] font-bold text-gray-400 whitespace-nowrap">{babyWeekRangeLabel}</span>
                                <div className="flex bg-gray-50 rounded-lg p-0.5 border border-gray-100 items-center">
                                    <button onClick={() => shiftDate(-7)} onMouseDown={handlePreventFocus} className="p-1 hover:bg-white rounded-md text-gray-400 hover:text-indigo-500 focus:outline-none"><ChevronLeft size={16} /></button>
                                    <button onClick={() => { setCalViewDate(selectedDate); setIsCalendarOpen(true); }} onMouseDown={handlePreventFocus} className="p-1 hover:bg-white rounded-md text-gray-300 hover:text-indigo-500 focus:outline-none"><CalendarIcon size={14} /></button>
                                    <button onClick={() => shiftDate(7)} onMouseDown={handlePreventFocus} className="p-1 hover:bg-white rounded-md text-gray-400 hover:text-indigo-500 focus:outline-none"><ChevronRight size={16} /></button>
                                </div>
                            </div>
                        </div>
                        <div 
                          onMouseDown={handlePreventFocus}
                          className="h-48 w-full focus:outline-none"
                        >
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={babyWeeklyData}>
                                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fontSize: 13, fill: '#9CA3AF'}} />
                                    <YAxis hide />
                                    <Bar dataKey="count" fill="#818CF8" radius={[6, 6, 6, 6]} barSize={16} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-[32px] shadow-soft border border-gray-100">
                        <div className="flex items-center justify-between mb-4 gap-2">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                <Utensils className="text-indigo-500 shrink-0" size={20} />
                                <h2 className="text-[19px] font-bold text-gray-800 truncate">월간 리포트 (평균 섭취량)</h2>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <span className="text-[11px] font-bold text-gray-400 whitespace-nowrap">{babyMonthLabel}</span>
                                <div className="flex bg-gray-50 rounded-lg p-0.5 border border-gray-100 items-center">
                                    <button onClick={() => shiftDate(-28)} onMouseDown={handlePreventFocus} className="p-1 hover:bg-white rounded-md text-gray-400 hover:text-indigo-500 focus:outline-none"><ChevronLeft size={16} /></button>
                                    <button onClick={() => { setCalViewDate(selectedDate); setIsCalendarOpen(true); }} onMouseDown={handlePreventFocus} className="p-1 hover:bg-white rounded-md text-gray-300 hover:text-indigo-500 focus:outline-none"><CalendarIcon size={14} /></button>
                                    <button onClick={() => shiftDate(28)} onMouseDown={handlePreventFocus} className="p-1 hover:bg-white rounded-md text-gray-400 hover:text-indigo-500 focus:outline-none"><ChevronRight size={16} /></button>
                                </div>
                            </div>
                        </div>
                        <div 
                          onMouseDown={handlePreventFocus}
                          className="h-48 w-full focus:outline-none"
                        >
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={babyMonthlyData}>
                                    <defs><linearGradient id="colorBabyCal" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#818CF8" stopOpacity={0.8}/><stop offset="95%" stopColor="#818CF8" stopOpacity={0}/></linearGradient></defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                    <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{fontSize: 13, fill: '#9CA3AF'}} />
                                    <Area type="monotone" dataKey="avg" stroke="#6366F1" fillOpacity={1} fill="url(#colorBabyCal)" strokeWidth={3} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                 </>
             ) : <div className="h-20" />}
          </div>
        )}
      </div>

      {renderCalendarModal()}
    </div>
  );
};

export default Stats;

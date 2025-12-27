import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Heart, MessageCircle, Share2, Award, Send, MoreHorizontal, Flame, Leaf, Lock, Globe, Users, Trash2, AlertTriangle, EyeOff, X, Copy, Baby, ThumbsUp, Sparkles, Smile, Meh, Frown, MapPin, ChevronRight } from 'lucide-react';
import { Meal, AppSettings, BabyProfile } from '../types';
import { useModal } from './GlobalModal';

interface SocialProps {
  allMeals: Meal[];
  currentUserId: string;
  userAvatar?: string;
  onLike: (mealId: string) => void;
  onComment: (mealId: string, text: string) => void;
  onDelete: (mealId: string) => void;
  onUpdateMeal: (meal: Meal) => void;
  settings: AppSettings;
  babyProfiles: BabyProfile[];
  familyMembers?: any[];
  cleanStreak?: number;
  monthlyBurned?: number;
  groupCreatedAt?: string | null; 
  onManageFamily: () => void;
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

const Social: React.FC<SocialProps> = ({ 
    allMeals, 
    currentUserId, 
    userAvatar,
    onLike, 
    onComment, 
    onDelete, 
    onUpdateMeal,
    settings, 
    babyProfiles, 
    familyMembers = [],
    cleanStreak = 0,
    monthlyBurned = 0,
    groupCreatedAt,
    onManageFamily
}) => {
  const { showAlert, showConfirm } = useModal();
  const [activeFeedTab, setActiveFeedTab] = useState<'family' | 'baby'>('family');
  const [commentInputs, setCommentInputs] = useState<{[key: string]: string}>({});
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const inputRefs = useRef<{[key: string]: HTMLInputElement | null}>({});
  
  // 하트 애니메이션 상태
  const [heartAnimations, setHeartAnimations] = useState<{[mealId: string]: {id: number, angle: number, dist: number}[]}>({});

  const pageScrollRef = useRef<HTMLDivElement>(null);
  const isPageDragging = useRef(false);
  const [isSwiping, setIsSwiping] = useState(false); 
  const pageStartX = useRef(0);
  const pageScrollLeftStart = useRef(0);

  const isCardDragging = useRef(false);
  const cardStartX = useRef(0);
  const cardScrollLeftStart = useRef(0);

  const sharedMeals = useMemo(() => {
    const friendIds = familyMembers.map(m => m.id);

    return allMeals.filter(meal => {
        if (meal.userId === currentUserId) return true;
        if (meal.sharingLevel === 'private') return false;
        if (meal.sharingLevel === 'public') return true;
        if (meal.sharingLevel === 'partners') {
            return friendIds.includes(meal.userId);
        }
        return false;
    }).sort((a, b) => b.timestamp - a.timestamp);
  }, [allMeals, currentUserId, familyMembers]);

  const familyFeedItems = useMemo(() => sharedMeals.filter(meal => !meal.isBabyFood), [sharedMeals]);
  const babyFeedItems = useMemo(() => sharedMeals.filter(meal => meal.isBabyFood), [sharedMeals]);

  const daysTogether = useMemo(() => {
      if (!groupCreatedAt) return 1;
      const start = new Date(groupCreatedAt).setHours(0,0,0,0);
      const now = new Date().setHours(0,0,0,0);
      const diffTime = Math.abs(now - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
      return diffDays + 1; 
  }, [groupCreatedAt]);

  const myProfile = useMemo(() => familyMembers.find(m => m.id === currentUserId), [familyMembers, currentUserId]);
  const myAvatar = userAvatar || myProfile?.avatar || "https://picsum.photos/200/200";

  const partnerMember = useMemo(() => familyMembers.find(m => m.id !== currentUserId), [familyMembers, currentUserId]);
  const partnerId = partnerMember?.id;
  const partnerName = partnerMember?.name || '짝꿍';
  const partnerAvatar = partnerMember?.avatar || "https://picsum.photos/101/101";

  const startOfWeek = useMemo(() => {
    const now = new Date();
    const day = now.getDay(); 
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); 
    const monday = new Date(now.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday.getTime();
  }, []);

  const myMealCount = allMeals.filter(m => m.userId === currentUserId && !m.isBabyFood && m.timestamp >= startOfWeek).length;
  const partnerMealCount = partnerId ? allMeals.filter(m => m.userId === partnerId && !m.isBabyFood && m.timestamp >= startOfWeek).length : 0;
  
  const babyStats = useMemo(() => {
    return babyProfiles.map(baby => {
      const specificBabyMeals = allMeals.filter(m => 
          m.isBabyFood && 
          ((baby.id && m.babyId === baby.id) || (!m.babyId && m.babyName === baby.name))
      );
      
      const thisWeekMeals = specificBabyMeals.filter(m => m.timestamp >= startOfWeek);
      const countThisWeek = thisWeekMeals.length;
      
      const ingredients = thisWeekMeals.flatMap(m => m.ingredients || []);
      const uniqueIngredientsCount = new Set(ingredients).size;

      let growthStatus = '기록 시작';
      let statusIcon = '🌱';
      if (countThisWeek >= 14) { growthStatus = '폭풍 성장'; statusIcon = '🚀'; }
      else if (countThisWeek >= 7) { growthStatus = '안정적 성장'; statusIcon = '✨'; }
      else if (countThisWeek >= 3) { growthStatus = '꾸준한 실천'; statusIcon = '💪'; }

      const foodNames = thisWeekMeals.map(m => m.foodName);
      const frequency: Record<string, number> = {};
      foodNames.forEach(name => { frequency[name] = (frequency[name] || 0) + 1; });
      
      const bestMenu = foodNames.length > 0 
        ? Object.entries(frequency).sort((a, b) => b[1] - a[1])[0][0]
        : '데이터 분석 중';

      return {
        ...baby,
        countThisWeek,
        uniqueIngredientsCount,
        growthStatus,
        statusIcon,
        bestMenu,
        reportTitle: countThisWeek > 0 ? `${growthStatus} 리포트` : '주간 성장 리포트'
      };
    });
  }, [allMeals, babyProfiles, startOfWeek]);

  const calculateMonthsAtDate = (birthDateStr: string, targetTimestamp: number) => {
    if (!birthDateStr) return 0;
    const birth = new Date(birthDateStr);
    const target = new Date(targetTimestamp);
    let months = (target.getFullYear() - birth.getFullYear()) * 12;
    months -= birth.getMonth();
    months += target.getMonth();
    return months <= 0 ? 0 : months;
  };

  const handleInputChange = (id: string, value: string) => {
    setCommentInputs(prev => ({...prev, [id]: value}));
  };

  const handleSubmitComment = (id: string) => {
    const text = commentInputs[id];
    if (text && text.trim()) {
        onComment(id, text);
        setCommentInputs(prev => ({...prev, [id]: ''}));
    }
  };

  const handleFocusComment = (id: string) => {
    if (inputRefs.current[id]) {
      inputRefs.current[id]?.focus();
    }
  };

  const handleShare = async (meal?: Meal) => {
    const title = '한끼 - 건강한 식단 공유';
    let text = '';
    if (meal) {
        if (meal.isBabyFood) {
            const baby = babyProfiles.find(b => (b.id && b.id === meal.babyId) || b.name === meal.babyName) || babyProfiles[0];
            const ageText = baby ? `${calculateMonthsAtDate(baby.birthDate, meal.timestamp)}개월` : '';
            text = `👶 ${ageText} 우리 아이가 먹은 이유식: ${meal.foodName}\n한끼 앱에서 레시피와 반응을 확인해보세요!`;
        } else {
            text = `${meal.userName}님이 오늘 먹은 맛있는 식단: ${meal.foodName}\n함께 건강한 생활을 시작해봐요!`;
        }
    } else {
        text = `한끼: 사진 한 장으로 끝내는 AI 식단 관리\n가족, 연인과 함께 식단을 공유해보세요.`;
    }
    
    const url = window.location.origin + window.location.pathname;
    
    if (navigator.share) {
        try {
            await navigator.share({ title, text, url });
        } catch (e) {
            console.debug('Native share cancelled or failed', e);
        }
    } else {
         try {
           await navigator.clipboard.writeText(`${text}\n${url}`);
           showAlert('식단 공유 정보가 클립보드에 복사되었습니다.\n원하는 곳에 붙여넣어 주세요!');
         } catch (err) {
           showAlert('클립보드 복사에 실패했습니다. 잠시 후 다시 시도해주세요.');
         }
    }
  };

  const activeMenuMeal = activeMenuId ? allMeals.find(m => m.id === activeMenuId) : null;
  
  const handleMenuAction = async (action: 'delete' | 'report' | 'hide' | 'share') => {
    if (!activeMenuId) return;
    
    if (action === 'delete') {
        const confirmed = await showConfirm('피드에서 이 기록을 삭제하시겠습니까?\n내 다이어리 기록은 삭제되지 않고 안전하게 보관됩니다.');
        if (confirmed) {
            const mealToUpdate = allMeals.find(m => m.id === activeMenuId);
            if (mealToUpdate) {
                onUpdateMeal({ ...mealToUpdate, sharingLevel: 'private' });
                showAlert('피드에서 삭제되었습니다.\n다이어리 탭에서 내 기록을 확인하실 수 있습니다.');
            }
        }
    } 
    else if (action === 'report') { showAlert('신고가 접수되었습니다.\n24시간 이내에 검토됩니다.'); } 
    else if (action === 'hide') { showAlert('이 게시물이 피드에서 숨겨집니다.'); } 
    else if (action === 'share') { handleShare(activeMenuMeal || undefined); }
    setActiveMenuId(null);
  };

  const handlePageTabClick = (tab: 'family' | 'baby') => {
    setActiveFeedTab(tab);
    if (pageScrollRef.current) {
        const width = pageScrollRef.current.clientWidth;
        pageScrollRef.current.scrollTo({
            left: tab === 'family' ? 0 : width,
            behavior: 'smooth'
        });
    }
  };

  const handlePageScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (isPageDragging.current) return;
    const { scrollLeft, clientWidth } = e.currentTarget;
    if (clientWidth === 0) return;
    const index = Math.round(scrollLeft / clientWidth);
    const newTab = index === 0 ? 'family' : 'baby';
    if (newTab !== activeFeedTab) {
        setActiveFeedTab(newTab);
    }
  };

  const handlePageDragStart = (e: React.MouseEvent) => {
    if (!pageScrollRef.current || !settings.enableBabyMode) return;
    isPageDragging.current = true;
    setIsSwiping(true);
    pageStartX.current = e.pageX - pageScrollRef.current.offsetLeft;
    pageScrollLeftStart.current = pageScrollRef.current.scrollLeft;
    pageScrollRef.current.style.scrollSnapType = 'none';
    pageScrollRef.current.style.cursor = 'grabbing';
  };

  const handlePageDragMove = (e: React.MouseEvent) => {
    if (!isPageDragging.current || !pageScrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - pageScrollRef.current.offsetLeft;
    const walk = (x - pageStartX.current);
    pageScrollRef.current.scrollLeft = pageScrollLeftStart.current - walk;
  };

  const handlePageDragEnd = () => {
    if (!isPageDragging.current || !pageScrollRef.current) return;
    isPageDragging.current = false;
    setTimeout(() => setIsSwiping(false), 300);
    pageScrollRef.current.style.scrollSnapType = 'x mandatory';
    pageScrollRef.current.style.cursor = 'grab';
    
    const { scrollLeft, clientWidth } = pageScrollRef.current;
    const index = Math.round(scrollLeft / clientWidth);
    pageScrollRef.current.scrollTo({
        left: index * clientWidth,
        behavior: 'smooth'
    });
    setActiveFeedTab(index === 0 ? 'family' : 'baby');
  };

  const handleTouchStart = () => {
    if (!settings.enableBabyMode) return;
    setIsSwiping(true);
  };

  const handleTouchEnd = () => {
    setTimeout(() => setIsSwiping(false), 300);
  };

  const getEventCoords = (e: any) => {
    if (e.touches && e.touches.length > 0) {
      return { x: e.touches[0].pageX, y: e.touches[0].pageY };
    }
    return { x: e.pageX, y: e.pageY };
  };

  const onCardMouseDown = (e: any) => {
    const container = e.currentTarget as HTMLDivElement;
    const { x } = getEventCoords(e);
    isCardDragging.current = true;
    cardStartX.current = x - container.offsetLeft;
    cardScrollLeftStart.current = container.scrollLeft;
    container.style.scrollSnapType = 'none';
    container.style.cursor = 'grabbing';
  };

  const onCardMouseMove = (e: any) => {
    if (!isCardDragging.current) return;
    const container = e.currentTarget as HTMLDivElement;
    const { x } = getEventCoords(e);
    
    e.stopPropagation();
    
    const dx = x - (cardStartX.current + container.offsetLeft);
    const isAtEnd = container.scrollLeft >= (container.scrollWidth - container.clientWidth - 5);
    const isAtStart = container.scrollLeft <= 5;
    
    if (isAtEnd && dx < -50 && activeFeedTab === 'family' && settings.enableBabyMode) {
        onCardMouseUp(e);
        handlePageTabClick('baby');
        return;
    }
    
    if (isAtStart && dx > 50 && activeFeedTab === 'baby') {
        onCardMouseUp(e);
        handlePageTabClick('family');
        return;
    }

    if (e.cancelable) e.preventDefault();
    container.scrollLeft = cardScrollLeftStart.current - dx;
  };

  const onCardMouseUp = (e: any) => {
    if (!isCardDragging.current) return;
    isCardDragging.current = false;
    const container = e.currentTarget as HTMLDivElement;
    container.style.cursor = 'grab';

    const scrollLeft = container.scrollLeft;
    const firstChild = container.firstElementChild as HTMLElement;
    
    if (firstChild) {
        const itemWidth = firstChild.offsetWidth;
        const gap = 16; 
        const index = Math.round(scrollLeft / (itemWidth + gap));
        
        container.scrollTo({
            left: index * (itemWidth + gap),
            behavior: 'smooth'
        });
        
        setTimeout(() => {
            if (container) container.style.scrollSnapType = 'x mandatory';
        }, 400);
    } else {
        container.style.scrollSnapType = 'x mandatory';
    }
  };

  // 좋아요 클릭 시 폭죽 애니메이션 유도
  const triggerHeartBurst = (mealId: string) => {
      const hearts = Array.from({ length: 12 }).map((_, i) => ({
          id: Date.now() + i,
          angle: Math.random() * 360,
          dist: 60 + Math.random() * 80
      }));
      setHeartAnimations(prev => ({ ...prev, [mealId]: hearts }));
      setTimeout(() => {
          setHeartAnimations(prev => {
              const newState = { ...prev };
              delete newState[mealId];
              return newState;
          });
      }, 1000);
  };

  const handleToggleLike = (meal: Meal) => {
      if (meal.userId === currentUserId) {
          showAlert('내 식단에는 좋아요를 누를 수 없습니다. 😊');
          return;
      }
      
      const isAlreadyLiked = meal.likes.includes(currentUserId);
      if (!isAlreadyLiked) {
          triggerHeartBurst(meal.id);
      }
      
      onLike(meal.id);
  };

  const isMyMeal = activeMenuMeal?.userId === currentUserId;

  const renderStatsCards = (tabType: 'family' | 'baby') => (
    <div 
        onMouseDown={onCardMouseDown}
        onMouseMove={onCardMouseMove}
        onMouseUp={onCardMouseUp}
        onMouseLeave={onCardMouseUp}
        onTouchStart={onCardMouseDown}
        onTouchMove={onCardMouseMove}
        onTouchEnd={onCardMouseUp}
        className="flex gap-4 overflow-x-auto no-scrollbar pb-6 px-1 select-none touch-pan-x cursor-grab active:cursor-grabbing snap-x snap-mandatory"
        style={{ touchAction: 'pan-y' }}
    >
        {tabType === 'family' ? (
            <>
                <div className="min-w-[85%] flex-shrink-0 snap-center bg-gradient-to-br from-violet-500 to-fuchsia-600 p-6 rounded-[28px] shadow-lg shadow-violet-200 text-white flex items-center justify-between relative overflow-hidden transition-transform duration-300 hover:scale-[1.02]">
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
                                <Award size={18} className="text-white" />
                            </div>
                            <span className="text-[13px] font-bold text-violet-100">이번주 기록왕</span>
                        </div>
                        <p className="text-[31px] font-black mb-1">
                            {partnerId ? (myMealCount >= partnerMealCount ? '나' : partnerName) : '나'} 👑
                        </p>
                        <p className="text-[15px] text-violet-100 opacity-90">
                            이번 주 총 {partnerId ? Math.max(myMealCount, partnerMealCount) : myMealCount}끼 기록 달성!
                        </p>
                    </div>
                    <div className="absolute right-[-20px] bottom-[-20px] opacity-20 rotate-12">
                        <Award size={120} />
                    </div>
                </div>
                <div className="min-w-[85%] flex-shrink-0 snap-center bg-white p-6 rounded-[28px] shadow-soft border border-gray-100 flex items-center justify-between relative overflow-hidden transition-transform duration-300 hover:scale-[1.02]">
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="p-1.5 bg-green-100 rounded-lg">
                                <Leaf size={18} className="text-green-600" />
                            </div>
                            <span className="text-[13px] font-bold text-gray-500">클린 식단</span>
                        </div>
                        <p className="text-[31px] font-black text-gray-800 mb-1">{cleanStreak}일 연속 🥗</p>
                        <p className="text-[15px] text-gray-400">목표 칼로리 달성 중!</p>
                    </div>
                    <div className="absolute right-4 bottom-4 w-16 h-16 bg-green-50 rounded-full flex items-center justify-center">
                        <span className="text-4xl">🌿</span>
                    </div>
                </div>
                <div className="min-w-[85%] flex-shrink-0 snap-center bg-white p-6 rounded-[28px] shadow-soft border border-gray-100 flex items-center justify-between relative overflow-hidden transition-transform duration-300 hover:scale-[1.02]">
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="p-1.5 bg-orange-100 rounded-lg">
                                <Flame size={18} className="text-orange-600" />
                            </div>
                            <span className="text-[13px] font-bold text-gray-500">소모 칼로리</span>
                        </div>
                        <p className="text-[31px] font-black text-gray-800 mb-1">{monthlyBurned.toLocaleString()} <span className="text-[15px] font-normal text-gray-400">kcal</span></p>
                        <p className="text-[15px] text-gray-400">이번 달 누적 소모량</p>
                    </div>
                    <div className="absolute right-4 bottom-4 w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center">
                        <span className="text-3xl">🔥</span>
                    </div>
                </div>
            </>
        ) : (
            <>
                {babyStats.map((baby, idx) => (
                    <div key={`baby-combined-${idx}`} className="min-w-[90%] flex-shrink-0 snap-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-6 rounded-[32px] shadow-lg shadow-indigo-100 text-white relative overflow-hidden transition-transform duration-300 hover:scale-[1.01]">
                        <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                        <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-indigo-400/20 rounded-full blur-3xl"></div>

                        <div className="relative z-10 flex flex-col h-full justify-between">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
                                        <Baby size={20} className="text-white" />
                                    </div>
                                    <span className="text-[13px] font-bold text-indigo-50 uppercase tracking-widest">{baby.name}의 {baby.statusIcon} {baby.growthStatus}</span>
                                </div>
                                <div className="bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm">
                                    <span className="text-[11px] font-black uppercase tracking-tighter">{baby.reportTitle}</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 items-end">
                                <div>
                                    <p className="text-[11px] font-bold text-indigo-100 mb-1 opacity-80 uppercase tracking-tighter">식재료 다양성</p>
                                    <p className="text-[37px] font-black leading-none">{baby.uniqueIngredientsCount}<span className="text-[15px] font-medium ml-1">종</span></p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[11px] font-bold text-indigo-100 mb-1 opacity-80 uppercase tracking-tighter">주간 활동량</p>
                                    <p className="text-[19px] font-black truncate leading-tight">{baby.countThisWeek} 끼니</p>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </>
        )}
    </div>
  );

  const renderFeedList = (items: Meal[], tabType: 'family' | 'baby') => (
    <div className="space-y-4">
        <h3 className="text-[19px] font-bold text-gray-800 px-1 flex items-center justify-between">
            {tabType === 'family' ? '친구 피드' : '이유식 피드'}
            <span className="text-[13px] font-normal text-gray-400 bg-gray-100 px-2 py-1.5 rounded-full">최신순</span>
        </h3>
        <div className="space-y-5">
            {items.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-[32px] border-2 border-dashed border-gray-100">
                    <p className="text-gray-300 mb-2 text-4xl">
                        {tabType === 'family' ? '🍲' : '🥣'}
                    </p>
                    <p className="text-gray-400 text-[15px] font-medium mb-1">
                        {tabType === 'family' ? '아직 공유된 친구 식단이 없어요.' : '아직 공유된 이유식 기록이 없어요.'}
                    </p>
                    <p className="text-brand-500 text-[13px] font-bold">오늘의 기록을 공유해보세요!</p>
                </div>
            ) : (
                items.map(meal => {
                    const isLiked = meal.likes.includes(currentUserId);
                    const isMe = meal.userId === currentUserId;
                    // Fix: Access isBabyFood instead of is_baby_food
                    const isBabyFood = meal.isBabyFood;
                    const privacyLevel = meal.sharingLevel || 'public';
                    const activeHearts = heartAnimations[meal.id] || [];
                    
                    const mealBaby = isBabyFood 
                        ? (babyProfiles.find(b => b.id && meal.babyId && b.id === meal.babyId) || 
                           babyProfiles.find(b => b.name === meal.babyName))
                        : null;

                    return (
                        <div key={meal.id} className={`rounded-[32px] overflow-hidden shadow-soft transition-all duration-300 border ${isBabyFood ? 'bg-white border-indigo-100' : 'bg-white border-gray-100'}`}>
                            <div className="p-5 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full overflow-hidden border-2 flex items-center justify-center shadow-sm ${
                                        isBabyFood ? 'border-indigo-100 bg-indigo-50' : (isMe ? 'border-brand-100' : 'border-gray-100')
                                    }`}>
                                         {isBabyFood ? (
                                             <div className="w-full h-full flex items-center justify-center overflow-hidden">
                                                 {mealBaby?.avatar ? (
                                                     <img src={mealBaby.avatar} className="w-full h-full object-cover" alt={mealBaby.name} />
                                                 ) : (
                                                     <span className="text-xl">👶</span>
                                                 )}
                                             </div>
                                         ) : (
                                             <img src={isMe ? myAvatar : (meal.userAvatar || "https://picsum.photos/200/200")} alt={meal.userName} className="w-full h-full object-cover" />
                                         )}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-1.5">
                                            <p className={`text-[15px] font-extrabold leading-none ${isBabyFood ? 'text-indigo-900' : 'text-gray-900'}`}>
                                                {isBabyFood ? (
                                                    <span>
                                                        {mealBaby ? mealBaby.name : (meal.babyName || '아기')}
                                                        <span className="text-[13px] font-medium ml-1 text-indigo-400">
                                                            {mealBaby ? `${calculateMonthsAtDate(mealBaby.birthDate, meal.timestamp)}개월` : '0개월'}
                                                        </span>
                                                    </span>
                                                ) : (
                                                    meal.userName
                                                )}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2 mt-1">
                                            <p className="text-[11px] text-gray-400 font-medium">{new Date(meal.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                                            <span className="w-0.5 h-2 bg-gray-200 rounded-full"></span>
                                            <p className={`text-[11px] font-bold uppercase ${isBabyFood ? 'text-indigo-500' : 'text-brand-500'}`}>
                                                {MEAL_TYPE_LABELS[meal.type] || meal.type}
                                            </p>
                                            {meal.location?.name && (
                                                <>
                                                    <span className="w-0.5 h-2 bg-gray-200 rounded-full"></span>
                                                    <div className="flex items-center gap-0.5 text-[11px] text-gray-500 font-medium">
                                                        <MapPin size={10} />
                                                        <span className="truncate max-w-[80px]">{meal.location.name}</span>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <button onClick={() => setActiveMenuId(meal.id)} className="text-gray-300 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition-colors">
                                    <MoreHorizontal size={20} />
                                </button>
                            </div>
                            <div className="w-full bg-gray-50 relative group select-none">
                                <div className="aspect-square relative overflow-hidden">
                                    {meal.image ? (
                                        <img 
                                            src={meal.image} 
                                            alt={meal.foodName} 
                                            className="w-full h-full object-cover pointer-events-auto" 
                                            onDoubleClick={() => handleToggleLike(meal)}
                                            draggable={false}
                                            onDragStart={(e) => e.preventDefault()}
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-300">No Image</div>
                                    )}

                                    {/* 폭죽 애니메이션 레이어 */}
                                    {activeHearts.map(h => (
                                        <div 
                                            key={h.id}
                                            className="absolute left-1/2 top-1/2 z-20 pointer-events-none transition-all duration-1000 ease-out flex items-center justify-center"
                                            style={{
                                                transform: `translate(calc(-50% + ${Math.cos(h.angle * Math.PI / 180) * h.dist}px), calc(-50% + ${Math.sin(h.angle * Math.PI / 180) * h.dist}px)) scale(2)`,
                                                opacity: 0
                                            }}
                                        >
                                            <Heart className="text-red-500 fill-red-500" size={16} />
                                        </div>
                                    ))}
                                    {activeHearts.length > 0 && (
                                        <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
                                            <Heart className="text-red-500 fill-red-500 animate-[scaleIn_0.3s_ease-out] shadow-glow" size={60} />
                                        </div>
                                    )}
                                </div>
                                <div className="absolute bottom-4 right-4 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-2 border border-white/10 shadow-lg pointer-events-none">
                                    <span className="text-white text-[13px] font-bold mr-1">{meal.foodName}</span>
                                    <span className="w-0.5 h-3 bg-white/20"></span>
                                    
                                    {isMe ? (
                                        <>
                                            {privacyLevel === 'public' && <div className={`w-2 h-2 rounded-full shadow-[0_0_5px_currentColor] bg-brand-50 text-brand-500`}></div>}
                                            {privacyLevel === 'partners' && <Users size={12} className="text-indigo-300" />}
                                            {privacyLevel === 'private' && <Lock size={12} className="text-gray-300" />}
                                            <span className="text-white text-[13px] font-bold tracking-wide">{meal.nutrition.calories} kcal</span>
                                        </>
                                    ) : (
                                        <span className="text-white text-[13px] font-bold tracking-wide">{meal.nutrition.calories} kcal</span>
                                    )}
                                </div>
                            </div>
                            <div className="p-5">
                                <div className="flex items-center gap-5 mb-4">
                                    <button onClick={() => handleToggleLike(meal)} className={`flex items-center gap-1.5 transition-all active:scale-90 ${isLiked ? 'text-red-500' : 'text-gray-400 hover:text-gray-700'}`}>
                                        <Heart className={`w-7 h-7 ${isLiked ? 'fill-current' : ''}`} strokeWidth={1.5} />
                                    </button>
                                    <button onClick={() => handleFocusComment(meal.id)} className="flex items-center gap-1.5 text-gray-400 hover:text-gray-700 transition-colors">
                                        <MessageCircle className="w-7 h-7" strokeWidth={1.5} />
                                    </button>
                                    
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleShare(meal);
                                        }} 
                                        className="ml-auto text-gray-400 hover:text-gray-700 p-1"
                                    >
                                        <Share2 className="w-6 h-6" strokeWidth={1.5} />
                                    </button>
                                </div>
                                <div className="mb-2">
                                    <p className="text-[15px] font-bold text-gray-800">좋아요 {meal.likes.length}개</p>
                                </div>
                                <div className="mb-5">
                                    {isBabyFood && meal.babyReaction && (
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[13px] font-bold ${
                                                meal.babyReaction === 'good' ? 'bg-green-50 text-green-700 border-green-100' :
                                                meal.babyReaction === 'soso' ? 'bg-yellow-50 text-yellow-700 border-yellow-100' :
                                                'bg-red-50 text-red-700 border-red-100'
                                            }`}>
                                                {meal.babyReaction === 'good' && <Smile size={14} />}
                                                {meal.babyReaction === 'soso' && <Meh size={14} />}
                                                {meal.babyReaction === 'bad' && <Frown size={14} />}
                                                <span>{meal.babyReaction === 'good' ? '잘 먹음' : meal.babyReaction === 'soso' ? '보통' : '거부함'}</span>
                                            </div>
                                        </div>
                                    )}
                                    <p className="text-[15px] text-gray-600 font-light">{meal.description}</p>
                                    {meal.ingredients && meal.ingredients.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 mt-3">
                                            {meal.ingredients.map((ing, i) => (
                                                <span key={i} className={`text-[12px] px-2.5 py-1 rounded-full font-medium ${isBabyFood ? 'text-indigo-600 bg-indigo-50 border border-indigo-100' : 'text-brand-600 bg-brand-50 border border-brand-100'}`}>#{ing}</span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-3 pt-4 border-t border-gray-50">
                                    {meal.comments.length > 0 && (
                                        <div className="space-y-2.5">
                                            {meal.comments.slice(-2).map(comment => (
                                                <div key={comment.id} className="flex gap-2.5 text-[15px] group">
                                                    <span className="font-bold text-gray-800 text-[13px] shrink-0">{comment.userName}</span>
                                                    <span className="text-gray-600 text-[13px] group-hover:text-gray-800 transition-colors">{comment.text}</span>
                                                </div>
                                            ))}
                                            {meal.comments.length > 2 && (<button className="text-[13px] text-gray-400 mt-1 hover:text-gray-600">댓글 {meal.comments.length}개 모두 보기</button>)}
                                        </div>
                                    )}
                                    <div className="relative flex items-center gap-3 mt-2">
                                        <div className="w-7 h-7 rounded-full bg-gray-200 overflow-hidden shrink-0 shadow-inner">
                                            <img src={myAvatar} alt="Me" className="w-full h-full object-cover" />
                                        </div>
                                        <div className="flex-1 relative">
                                            <input ref={(el) => { inputRefs.current[meal.id] = el; }} type="text" value={commentInputs[meal.id] || ''} onChange={(e) => handleInputChange(meal.id, e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSubmitComment(meal.id)} placeholder="따뜻한 응원의 한마디..." className="w-full bg-gray-50 border border-gray-100 rounded-full pl-4 pr-10 py-2.5 text-[13px] focus:outline-none focus:bg-white focus:border-brand-300 focus:ring-2 focus:ring-brand-100 transition-all placeholder:text-gray-400" />
                                            <button onClick={() => handleSubmitComment(meal.id)} disabled={!commentInputs[meal.id]?.trim()} className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 text-brand-500 disabled:text-gray-300 transition-colors hover:bg-brand-50 rounded-full"><Send size={14} /></button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })
            )}
        </div>
    </div>
  );

  return (
    <div className="space-y-4 animate-[fadeIn_0.5s_ease-out] flex flex-col pb-6">
      <div className="bg-white p-5 rounded-[24px] shadow-soft border border-gray-100 flex items-center justify-between shrink-0">
        <div className="flex -space-x-3">
            <img className="w-12 h-12 rounded-full border-[3px] border-white bg-gray-200 object-cover shadow-md z-[25]" src={myAvatar} alt="Me" />
            {partnerId && (
                <img 
                    onClick={onManageFamily}
                    className="w-12 h-12 rounded-full border-[3px] border-white bg-gray-200 object-cover shadow-md cursor-pointer hover:scale-105 transition-transform z-[24]" 
                    src={partnerAvatar} 
                    alt={partnerName} 
                />
            )}
            {settings.enableBabyMode && babyProfiles.map((baby, idx) => (
                <div key={baby.id || idx} style={{ zIndex: 20 - idx }} className="w-12 h-12 rounded-full border-[3px] border-white bg-indigo-50 flex items-center justify-center text-xl shadow-md overflow-hidden">
                    {baby.avatar ? (
                        <img src={baby.avatar} alt={baby.name} className="w-full h-full object-cover" />
                    ) : (
                        "👶"
                    )}
                </div>
            ))}
            <div 
                onClick={onManageFamily}
                className="w-12 h-12 rounded-full border-[3px] border-white bg-gray-100 flex items-center justify-center text-gray-400 shadow-md cursor-pointer hover:bg-gray-200 transition-colors z-[10]"
            >
                <Users size={20} />
            </div>
        </div>
        <div className="text-right">
            <p className="text-[13px] text-gray-400 font-medium mb-0.5">함께 건강해지는 중</p>
            <div className="flex items-center justify-end gap-1">
                <Flame size={16} className="text-brand-500 fill-brand-500 animate-pulse" />
                <p className="font-extrabold text-brand-500 text-[19px]">{daysTogether}일째</p>
            </div>
        </div>
      </div>

      {settings.enableBabyMode && (
          <div className="flex bg-gray-100/80 p-1.5 rounded-2xl shrink-0">
              <button 
                  onClick={() => handlePageTabClick('family')}
                  className={`flex-1 py-3 text-[15px] font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 ${
                      activeFeedTab === 'family' 
                      ? 'bg-white text-gray-900 shadow-md transform scale-100' 
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
              >
                  👨‍👩‍👧 친구 피드
              </button>
              <button 
                  onClick={() => handlePageTabClick('baby')}
                  className={`flex-1 py-3 text-[15px] font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 ${
                      activeFeedTab === 'baby' 
                      ? 'bg-white text-indigo-600 shadow-md transform scale-100' 
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
              >
                  👶 이유식 피드
              </button>
          </div>
      )}

      <div 
        ref={pageScrollRef}
        onScroll={handlePageScroll}
        onMouseDown={handlePageDragStart}
        onMouseMove={handlePageDragMove}
        onMouseUp={handlePageDragEnd}
        onMouseLeave={handlePageDragEnd}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className={`flex overflow-x-auto no-scrollbar snap-x snap-mandatory select-none items-start ${settings.enableBabyMode ? 'cursor-grab' : ''}`}
      >
        <div className="min-w-full snap-center px-1 space-y-4">
            {renderStatsCards('family')}
            {(activeFeedTab === 'family' || isSwiping) ? renderFeedList(familyFeedItems, 'family') : <div className="h-20" />}
        </div>

        {settings.enableBabyMode && (
            <div className="min-w-full snap-center px-1 space-y-4">
                {renderStatsCards('baby')}
                {(activeFeedTab === 'baby' || isSwiping) ? renderFeedList(babyFeedItems, 'baby') : <div className="h-20" />}
            </div>
        )}
      </div>

      {activeMenuId && (
          <div className="fixed inset-0 z-[60] flex items-end justify-center" style={{backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)'}} onClick={() => setActiveMenuId(null)}>
              <div className="bg-white w-full max-md rounded-t-[32px] p-6 space-y-4 animate-[slideUp_0.3s_cubic-bezier(0.16,1,0.3,1)] shadow-2xl" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-between mb-2 px-2">
                      <h3 className="font-bold text-[21px] text-gray-800">더보기</h3>
                      <button onClick={() => setActiveMenuId(null)} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-500 transition-colors"><X size={20} /></button>
                  </div>
                  <div className="space-y-3">
                      <button onClick={() => handleMenuAction('share')} className="w-full flex items-center gap-4 p-4 bg-gray-50 rounded-2xl hover:bg-blue-50 transition-colors group">
                          <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-blue-500 shadow-sm group-hover:scale-110 transition-transform"><Share2 size={22} /></div>
                          <div className="text-left"><p className="font-bold text-gray-800 group-hover:text-blue-600 transition-colors">공유하기</p><p className="text-[13px] text-gray-500">외부 링크 복사</p></div>
                      </button>
                      {isMyMeal ? (
                          <button onClick={() => handleMenuAction('delete')} className="w-full flex items-center gap-4 p-4 bg-gray-50 rounded-2xl hover:bg-red-50 transition-colors group">
                              <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-red-500 shadow-sm group-hover:scale-110 transition-transform"><Trash2 size={22} /></div>
                              <div className="text-left"><p className="font-bold text-gray-800 group-hover:text-red-600 transition-colors">피드에서 내리기</p><p className="text-[13px] text-gray-500">다이어리 기록은 유지됩니다</p></div>
                          </button>
                      ) : (
                          <>
                              <button onClick={() => handleMenuAction('report')} className="w-full flex items-center gap-4 p-4 bg-orange-50 rounded-2xl hover:bg-orange-100 transition-colors group">
                                  <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-orange-500 shadow-sm group-hover:scale-110 transition-transform"><AlertTriangle size={22} /></div>
                                  <div className="text-left"><p className="font-bold text-gray-800 group-hover:text-orange-600 transition-colors">신고하기</p><p className="text-[13px] text-gray-500">부적절한 콘텐츠 신고</p></div>
                              </button>
                          </>
                      )}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Social;

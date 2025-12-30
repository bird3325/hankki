
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Clock, Calendar, Share2, Trash2, Baby, CheckCircle2, Sparkles, Heart, MessageCircle, Star, Smile, Meh, Frown, FileText, MapPin, X, Info, Globe, Users, Lock, BookOpen, Check, User, EyeOff } from 'lucide-react';
import { Meal, MealTemplate } from '../types';
import { useModal } from './GlobalModal';

interface MealDetailProps {
    meal: Meal;
    templates: MealTemplate[];
    currentUserId: string;
    onClose: () => void;
    onDelete: (id: string) => void;
    onShare: (id: string) => void;
    onSaveTemplate: (meal: Meal, name: string) => void;
    onUpdate: (meal: Meal) => void;
}

const MEAL_TYPE_LABELS: Record<string, string> = {
    breakfast: '아침',
    lunch: '점심',
    dinner: '저녁',
    snack: '간식'
};

const InlineInput = ({ value, onSave, className, placeholder, inputClassName, autoFocus = true }: any) => {
    const [isEditing, setIsEditing] = useState(false);
    const [tempValue, setTempValue] = useState(value);

    useEffect(() => { setTempValue(value); }, [value]);

    const handleBlur = () => {
        setIsEditing(false);
        if (tempValue !== value) onSave(tempValue);
    };

    if (isEditing) {
        return (
            <input
                autoFocus={autoFocus}
                value={tempValue}
                onChange={(e) => setTempValue(e.target.value)}
                onBlur={handleBlur}
                onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                className={`bg-transparent focus:outline-none ${inputClassName || className}`}
                placeholder={placeholder}
                onClick={(e) => e.stopPropagation()}
            />
        );
    }

    return (
        <span onClick={() => setIsEditing(true)} className={`cursor-pointer hover:opacity-70 transition-opacity ${className}`}>
            {value || placeholder}
        </span>
    );
};

const InlineTextArea = ({ value, onSave, className, placeholder }: any) => {
    const [isEditing, setIsEditing] = useState(false);
    const [tempValue, setTempValue] = useState(value);

    useEffect(() => { setTempValue(value); }, [value]);

    const handleBlur = () => {
        setIsEditing(false);
        if (tempValue !== value) onSave(tempValue);
    };

    if (isEditing) {
        return (
            <textarea
                autoFocus
                value={tempValue}
                onChange={(e) => setTempValue(e.target.value)}
                onBlur={handleBlur}
                className={`w-full bg-transparent focus:outline-none resize-none ${className}`}
                placeholder={placeholder}
                onClick={(e) => e.stopPropagation()}
                rows={4}
            />
        );
    }

    return (
        <div onClick={() => setIsEditing(true)} className={`cursor-pointer hover:bg-gray-50/50 rounded transition-colors whitespace-pre-wrap ${className}`}>
            {value || <span className="text-gray-400">{placeholder}</span>}
        </div>
    );
};

const IngredientsEdit = ({ ingredients, ingredientDetails, onSave }: any) => {
    const [isEditing, setIsEditing] = useState(false);
    const [text, setText] = useState(ingredients ? ingredients.join(', ') : '');

    useEffect(() => { setText(ingredients ? ingredients.join(', ') : ''); }, [ingredients]);

    const handleBlur = () => {
        setIsEditing(false);
        const newIngredients = text.split(',').map((s: string) => s.trim()).filter((s: string) => s);
        if (JSON.stringify(newIngredients) !== JSON.stringify(ingredients)) {
            onSave(newIngredients);
        }
    };

    if (isEditing) {
        return (
            <input
                autoFocus
                value={text}
                onChange={(e) => setText(e.target.value)}
                onBlur={handleBlur}
                onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                className="w-full bg-gray-50 border border-brand-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500"
                placeholder="재료를 쉼표(,)로 구분하여 입력"
            />
        );
    }

    return (
        <div onClick={() => setIsEditing(true)} className="flex flex-wrap gap-2 cursor-pointer min-h-[28px] hover:bg-gray-50 rounded-lg -ml-2 p-2 transition-colors">
            {ingredients && ingredients.length > 0 ? ingredients.map((ing: string, i: number) => {
                const isAIAnalyzed = ingredientDetails?.some((d: any) => d.name === ing);
                return (
                    <span key={i} className={`px-3 py-1 text-[13px] rounded-full border ${isAIAnalyzed
                        ? 'bg-brand-50 text-brand-700 border-brand-100'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                        {ing}
                    </span>
                );
            }) : (
                <span className="text-gray-400 text-sm">재료를 입력해주세요 (클릭하여 수정)</span>
            )}
        </div>
    );
};

const MealDetail: React.FC<MealDetailProps> = ({ meal, templates, currentUserId, onClose, onDelete, onShare, onSaveTemplate, onUpdate }) => {
    const { showAlert } = useModal();
    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [templateName, setTemplateName] = useState('');

    const [localSharingLevel, setLocalSharingLevel] = useState<'public' | 'partners' | 'private'>(meal.sharingLevel || 'public');
    const [localShareDiaryCalories, setLocalShareDiaryCalories] = useState<boolean>(meal.shareDiaryCalories || false);

    const isOwner = currentUserId === meal.userId;
    const isBookmarked = templates.some(t => t.foodName === meal.foodName);

    // 상세 정보를 볼 수 있는지 여부 결정 로직
    const canSeeDetails = isOwner || meal.isBabyFood || meal.shareDiaryCalories;

    const handleDelete = () => {
        onDelete(meal.id);
    };

    const handleShareClick = () => {
        if (isOwner) {
            setLocalSharingLevel(meal.sharingLevel || 'public');
            setLocalShareDiaryCalories(meal.shareDiaryCalories || false);
            setIsShareModalOpen(true);
        } else {
            onShare(meal.id);
        }
    };

    const handleReaction = (reaction: 'good' | 'bad' | 'soso') => {
        if (!isOwner) return;
        const updated = { ...meal, babyReaction: reaction };
        onUpdate(updated);
    };

    const handleOpenTemplateModal = () => {
        setTemplateName(meal.foodName);
        setIsTemplateModalOpen(true);
    };

    const handleSaveTemplateConfirm = () => {
        if (!templateName.trim()) {
            showAlert('템플릿 이름을 입력해주세요.');
            return;
        }
        onSaveTemplate(meal, templateName);
        setIsTemplateModalOpen(false);
    };

    const handleConfirmShareSettings = () => {
        onUpdate({
            ...meal,
            sharingLevel: localSharingLevel,
            shareDiaryCalories: localShareDiaryCalories
        });
        setIsShareModalOpen(false);
        showAlert('공유 설정이 변경되었습니다.');
    };

    const handleUpdateName = (foodName: string) => {
        onUpdate({ ...meal, foodName });
    };

    const handleUpdateLocation = (name: string) => {
        onUpdate({
            ...meal,
            location: meal.location
                ? { ...meal.location, name }
                : { name, latitude: 0, longitude: 0, type: 'other' }
        });
    };

    const handleUpdateDescription = (description: string) => {
        onUpdate({ ...meal, description });
    };

    const handleUpdateIngredients = (ingredients: string[]) => {
        onUpdate({ ...meal, ingredients });
    };

    const handleTypeCycle = () => {
        if (!isOwner) return;
        const types: ('breakfast' | 'lunch' | 'dinner' | 'snack')[] = ['breakfast', 'lunch', 'dinner', 'snack'];
        const currentIndex = types.indexOf(meal.type);
        const nextIndex = (currentIndex + 1) % types.length;
        onUpdate({ ...meal, type: types[nextIndex] });
    };

    const getSharingLevelLabel = (level: string) => {
        switch (level) {
            case 'public': return '전체공개';
            case 'partners': return '친구만';
            case 'private': return '나만보기';
            default: return '비공개';
        }
    };

    return (
        <div className="fixed inset-0 bg-white z-50 overflow-y-auto flex flex-col">
            <div className="sticky top-0 bg-white/80 backdrop-blur-md z-10 px-4 py-3 flex items-center justify-between border-b border-gray-100">
                <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <ArrowLeft size={24} className="text-gray-700" />
                </button>

                <h1 className="text-[18px] font-bold text-gray-800">식단 상세</h1>

                <div className="flex gap-1">
                    {meal.isBabyFood && (
                        <button
                            onClick={handleOpenTemplateModal}
                            className={`p-2 rounded-full transition-colors ${isBookmarked
                                ? 'text-indigo-500 bg-indigo-50 hover:bg-indigo-100'
                                : 'text-gray-400 hover:text-indigo-500 hover:bg-indigo-50'
                                }`}
                        >
                            <Star size={20} className={isBookmarked ? 'fill-indigo-500' : ''} />
                        </button>
                    )}
                    {isOwner && (
                        <button
                            onClick={handleShareClick}
                            className={`p-2 rounded-full transition-colors ${meal.sharingLevel !== 'private'
                                ? 'text-brand-500 bg-brand-50 hover:bg-brand-100'
                                : 'text-gray-400 hover:text-brand-500 hover:bg-brand-50'
                                }`}
                        >
                            <Share2 size={20} className={meal.sharingLevel !== 'private' ? 'fill-brand-500' : ''} />
                        </button>
                    )}
                    {isOwner && (
                        <button onClick={handleDelete} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors">
                            <Trash2 size={20} />
                        </button>
                    )}
                </div>
            </div>

            <div className="flex-1 pb-12">
                <div className="w-full aspect-square bg-gray-100 relative">
                    {meal.image ? (
                        <img src={meal.image} alt={meal.foodName} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300 text-lg">
                            이미지 없음
                        </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-6 pt-20">
                        <div className="flex items-center gap-2 mb-2">
                            {!isOwner && (
                                <span className="bg-white/20 backdrop-blur-md text-white px-2 py-0.5 rounded-md text-[11px] font-black flex items-center gap-1">
                                    <User size={12} fill="currentColor" /> {meal.userName}
                                </span>
                            )}
                            <span
                                onClick={handleTypeCycle}
                                className={`px-2 py-0.5 rounded-md text-[11px] font-bold uppercase ${meal.isBabyFood
                                    ? 'bg-indigo-500 text-white'
                                    : 'bg-brand-500 text-white'
                                    } ${isOwner ? 'cursor-pointer select-none' : ''}`}
                            >
                                {MEAL_TYPE_LABELS[meal.type] || meal.type}
                            </span>
                            {isOwner && meal.sharingLevel !== 'private' && (
                                <span className="bg-white/20 backdrop-blur-sm text-white px-2 py-0.5 rounded-md text-[11px] flex items-center gap-1">
                                    <CheckCircle2 size={12} /> {getSharingLevelLabel(meal.sharingLevel || 'public')}
                                </span>
                            )}
                        </div>

                        <div className="text-[28px] font-bold text-white mb-1">
                            {isOwner ? (
                                <InlineInput
                                    value={meal.foodName}
                                    onSave={handleUpdateName}
                                    inputClassName="w-full bg-black/20 text-white placeholder-white/50 border-b border-white/50"
                                    className="border-b border-transparent hover:border-white/30"
                                    placeholder="음식 이름"
                                />
                            ) : (
                                meal.foodName
                            )}
                        </div>

                        <div className="flex items-center gap-4 text-white/90 text-[13px] mt-2">
                            <div className="flex items-center gap-1">
                                <Heart size={16} className={meal.likes.includes(currentUserId) ? 'fill-red-500 text-red-500' : ''} />
                                <span>{meal.likes.length}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <MessageCircle size={16} />
                                <span>{meal.comments.length}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="px-6 py-6 space-y-8">
                    <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-[13px] text-gray-500">
                        <div className="flex items-center gap-2">
                            <Calendar size={16} />
                            <span>{new Date(meal.timestamp).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Clock size={16} />
                            <span>{new Date(meal.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>

                        <div className="flex items-center gap-2 text-brand-600 bg-brand-50 px-2 py-0.5 rounded-md">
                            <MapPin size={16} />
                            {isOwner ? (
                                <InlineInput
                                    value={meal.location?.name || ''}
                                    onSave={handleUpdateLocation}
                                    placeholder="장소 입력"
                                    inputClassName="bg-transparent border-b border-brand-300 text-brand-700 min-w-[60px]"
                                    className="border-b border-transparent hover:border-brand-300 min-w-[40px] inline-block"
                                />
                            ) : (
                                <span>{meal.location?.name || '장소 정보 없음'}</span>
                            )}
                        </div>

                        {meal.isBabyFood && (
                            <div className="flex items-center gap-2 text-indigo-500 font-medium">
                                <Baby size={16} />
                                <span>이유식</span>
                            </div>
                        )}
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-gray-800 text-[18px]">영양 분석 리포트</h3>
                            {!canSeeDetails && <span className="text-[10px] text-gray-400 font-bold bg-gray-100 px-2 py-1 rounded-md flex items-center gap-1"><Lock size={10} /> 비공개</span>}
                        </div>
                        <div className="grid grid-cols-2 gap-3 mb-3">
                            <div className="col-span-2 bg-brand-50 p-5 rounded-[24px] border border-brand-100 flex justify-between items-center shadow-sm relative overflow-hidden">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-brand-500 rounded-full flex items-center justify-center text-white">
                                        <Sparkles size={14} />
                                    </div>
                                    <span className="text-brand-900 font-bold text-[13px]">오늘의 총 칼로리</span>
                                </div>
                                {canSeeDetails ? (
                                    <span className="text-[28px] font-black text-brand-600">{meal.nutrition.calories} <span className="text-[14px] font-bold text-brand-400">kcal</span></span>
                                ) : (
                                    <span className="text-lg font-bold text-gray-400 italic">비공개 설정됨</span>
                                )}
                                {!canSeeDetails && <div className="absolute inset-0 bg-white/40 backdrop-blur-[2px] flex items-center justify-center"></div>}
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3 relative">
                            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm text-center">
                                <div className="text-[11px] text-gray-400 font-bold uppercase mb-1">탄수화물</div>
                                <div className="font-black text-gray-800 text-[18px]">{canSeeDetails ? `${meal.nutrition.carbs}g` : '-'}</div>
                            </div>
                            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm text-center">
                                <div className="text-[11px] text-gray-400 font-bold uppercase mb-1">단백질</div>
                                <div className="font-black text-gray-800 text-[18px]">{canSeeDetails ? `${meal.nutrition.protein}g` : '-'}</div>
                            </div>
                            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm text-center">
                                <div className="text-[11px] text-gray-400 font-bold uppercase mb-1">지방</div>
                                <div className="font-black text-gray-800 text-[18px]">{canSeeDetails ? `${meal.nutrition.fat}g` : '-'}</div>
                            </div>
                            {!canSeeDetails && <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] rounded-2xl"></div>}
                        </div>
                    </div>

                    {meal.aiTip && canSeeDetails && (
                        <div className="bg-blue-50 p-5 rounded-[24px] border border-blue-100 flex items-start gap-3 shadow-sm transition-transform hover:scale-[1.01]">
                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
                                <Sparkles className="w-6 h-6 text-blue-500" />
                            </div>
                            <div>
                                <h4 className="font-bold text-blue-800 text-[16px] mb-1">한끼 AI의 맞춤형 팁</h4>
                                <p className="text-blue-700 text-[14px] leading-relaxed">
                                    {meal.aiTip}
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="space-y-4">
                        <div className="flex items-center gap-2 px-1">
                            <Info size={16} className="text-brand-500" />
                            <h3 className="font-bold text-gray-800 text-[16px]">재료별 상세 정보</h3>
                        </div>

                        {meal.aiDescription && canSeeDetails && (
                            <div className="bg-gray-50 p-5 rounded-[24px] border border-gray-100 mb-2">
                                <p className="text-gray-600 text-[14px] leading-relaxed">
                                    {meal.aiDescription}
                                </p>
                            </div>
                        )}

                        {canSeeDetails ? (
                            meal.ingredientDetails && meal.ingredientDetails.length > 0 ? (
                                <div className="space-y-3">
                                    {meal.ingredientDetails.map((detail, idx) => (
                                        <div key={idx} className="flex flex-col bg-white p-4 rounded-[20px] border border-gray-100 shadow-sm gap-2">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="font-bold text-gray-800 text-[14px] break-words flex-1 min-w-0">{detail.name}</span>
                                                <span className="text-[11px] font-black text-brand-600 bg-brand-50 px-2 py-1 rounded-lg text-right break-keep">
                                                    {detail.nutritionEstimate}
                                                </span>
                                            </div>
                                            <p className="text-[14px] text-gray-500 leading-normal break-words">{detail.benefit}</p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="bg-gray-50 p-6 rounded-[24px] border border-dashed border-gray-200 text-center">
                                    <p className="text-gray-400 text-xs font-medium">재료별 상세 분석 데이터가 없습니다.</p>
                                </div>
                            )
                        ) : (
                            <div className="bg-gray-50 p-8 rounded-[24px] border border-dashed border-gray-200 text-center">
                                <EyeOff size={24} className="mx-auto text-gray-300 mb-2" />
                                <p className="text-gray-400 text-sm font-medium">상세 재료 및 영양 정보는<br />작성자가 비공개로 설정했습니다.</p>
                            </div>
                        )}

                        {canSeeDetails && (
                            <div className="pt-2">
                                {isOwner ? (
                                    <IngredientsEdit
                                        ingredients={meal.ingredients}
                                        ingredientDetails={meal.ingredientDetails}
                                        onSave={handleUpdateIngredients}
                                    />
                                ) : (
                                    <div className="flex flex-wrap gap-2">
                                        {meal.ingredients && meal.ingredients.length > 0 ? meal.ingredients.map((ing, i) => {
                                            const isAIAnalyzed = meal.ingredientDetails?.some(d => d.name === ing);
                                            return (
                                                <span key={i} className={`px-3 py-1 text-xs rounded-full border ${isAIAnalyzed
                                                    ? 'bg-gray-50 text-gray-600 border-gray-100'
                                                    : 'bg-amber-50 text-amber-700 border-amber-200'
                                                    }`}>
                                                    #{ing}
                                                </span>
                                            );
                                        }) : null}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {meal.isBabyFood && (
                        <div className="bg-indigo-50/50 p-5 rounded-[28px] border border-indigo-100 shadow-sm">
                            <div className="flex items-center gap-2 mb-4">
                                <Baby size={18} className="text-indigo-500" />
                                <h3 className="font-bold text-indigo-900 text-[14px]">오늘의 이유식 반응</h3>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => handleReaction('good')}
                                    disabled={!isOwner}
                                    className={`flex-1 py-4 rounded-2xl flex flex-col items-center gap-2 transition-all ${meal.babyReaction === 'good'
                                        ? 'bg-green-500 text-white shadow-lg shadow-green-100'
                                        : 'bg-white text-gray-400 border border-gray-100 hover:bg-green-50'
                                        } ${!isOwner ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    <Smile size={28} strokeWidth={meal.babyReaction === 'good' ? 2.5 : 1.5} />
                                    <span className="text-[11px] font-black">잘 먹음</span>
                                </button>
                                <button
                                    onClick={() => handleReaction('soso')}
                                    disabled={!isOwner}
                                    className={`flex-1 py-4 rounded-2xl flex flex-col items-center gap-2 transition-all ${meal.babyReaction === 'soso'
                                        ? 'bg-yellow-400 text-white shadow-lg shadow-yellow-100'
                                        : 'bg-white text-gray-400 border border-gray-100 hover:bg-yellow-50'
                                        } ${!isOwner ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    <Meh size={28} strokeWidth={meal.babyReaction === 'soso' ? 2.5 : 1.5} />
                                    <span className="text-[11px] font-black">보통</span>
                                </button>
                                <button
                                    onClick={() => handleReaction('bad')}
                                    disabled={!isOwner}
                                    className={`flex-1 py-4 rounded-2xl flex flex-col items-center gap-2 transition-all ${meal.babyReaction === 'bad'
                                        ? 'bg-red-400 text-white shadow-lg shadow-red-100'
                                        : 'bg-white text-gray-400 border border-gray-100 hover:bg-red-50'
                                        } ${!isOwner ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    <Frown size={28} strokeWidth={meal.babyReaction === 'bad' ? 2.5 : 1.5} />
                                    <span className="text-[11px] font-black">거부함</span>
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="space-y-3">
                        <div className="flex items-center gap-2 px-1">
                            <FileText size={16} className="text-gray-400" />
                            <h3 className="font-bold text-gray-800 text-[16px]">식단 메모</h3>
                        </div>
                        <div className="bg-white p-6 rounded-[24px] border border-gray-100 shadow-soft">
                            {isOwner ? (
                                <InlineTextArea
                                    value={meal.description}
                                    onSave={handleUpdateDescription}
                                    placeholder="오늘의 식사는 어땠나요? 맛이나 느낌을 기록해보세요."
                                    className="text-gray-700 text-[14px] leading-relaxed"
                                />
                            ) : (
                                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-[14px]">
                                    {meal.description || "작성된 메모가 없습니다."}
                                </p>
                            )}
                        </div>
                    </div>

                    {meal.comments.length > 0 && (
                        <div className="pt-6 border-t border-gray-100">
                            <div className="flex items-center justify-between mb-4 px-1">
                                <h3 className="font-bold text-gray-800 text-[14px] flex items-center gap-2">
                                    <MessageCircle size={16} className="text-gray-400" />
                                    응원 댓글 <span className="text-brand-500">{meal.comments.length}</span>
                                </h3>
                            </div>
                            <div className="space-y-4">
                                {meal.comments.map(comment => (
                                    <div key={comment.id} className="flex gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden flex-shrink-0 border border-gray-100">
                                            <img src={`https://picsum.photos/seed/${comment.userId}/100/100`} alt={comment.userName} className="w-full h-full object-cover" />
                                        </div>
                                        <div className="bg-gray-50 px-4 py-3 rounded-2xl rounded-tl-none flex-1">
                                            <span className="font-extrabold text-gray-900 text-[11px] block mb-1">{comment.userName}</span>
                                            <span className="text-gray-700 text-[13px]">{comment.text}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {isTemplateModalOpen && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 animate-[fadeIn_0.2s_ease-out]">
                    <div className="bg-white rounded-2xl w-full max-w-xs p-6 shadow-2xl animate-[scaleIn_0.2s_ease-out]">
                        <h3 className="text-lg font-bold text-gray-800 mb-1">템플릿 저장</h3>
                        <p className="text-sm text-gray-500 mb-4">자주 먹는 식단으로 저장하시겠어요?</p>
                        <div className="mb-4">
                            <label className="block text-xs font-bold text-gray-500 mb-1">템플릿 이름</label>
                            <input
                                type="text"
                                value={templateName}
                                onChange={(e) => setTemplateName(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                                autoFocus
                                onKeyDown={(e) => e.key === 'Enter' && handleSaveTemplateConfirm()}
                                placeholder="예: 소고기 미음"
                            />
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => setIsTemplateModalOpen(false)} className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-600 font-bold text-sm hover:bg-gray-200 transition-colors">취소</button>
                            <button onClick={handleSaveTemplateConfirm} className="flex-1 py-3 rounded-xl bg-indigo-500 text-white font-bold text-sm hover:bg-indigo-600 transition-colors">저장하기</button>
                        </div>
                    </div>
                </div>
            )}

            {isShareModalOpen && (
                <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 backdrop-blur-sm p-0 animate-[fadeIn_0.2s_ease-out]">
                    <div className="bg-white rounded-t-[40px] w-full max-md p-6 pb-8 shadow-2xl animate-[slideUp_0.3s_cubic-bezier(0.16,1,0.3,1)]">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-xl font-black text-gray-900 leading-none mb-1">공유 설정</h3>
                                <p className="text-xs text-gray-400 font-bold">이 식단을 누구와 공유할까요?</p>
                            </div>
                            <button onClick={() => setIsShareModalOpen(false)} className="p-2 bg-gray-50 rounded-full text-gray-400 hover:text-gray-900 transition-colors">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="space-y-4 mb-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">함께 칼로리 공유</label>
                                {[
                                    { id: 'public', label: '전체공개', sub: '모든 친구에게 공유', icon: <Globe size={18} />, color: 'bg-green-100 text-green-600', active: 'bg-green-50 border-green-200' },
                                    { id: 'partners', label: '친구만', sub: '파트너/가족에게만 공유', icon: <Users size={18} />, color: 'bg-indigo-100 text-indigo-600', active: 'bg-indigo-50 border-indigo-200' },
                                    { id: 'private', label: '나만보기', sub: '공유하지 않음', icon: <Lock size={18} />, color: 'bg-gray-100 text-gray-400', active: 'bg-gray-50 border-gray-200' }
                                ].map((level) => {
                                    const isSelected = localSharingLevel === level.id;
                                    return (
                                        <button
                                            key={level.id}
                                            onClick={() => setLocalSharingLevel(level.id as any)}
                                            className={`w-full p-3.5 rounded-[20px] border transition-all flex items-center justify-between group ${isSelected ? level.active : 'bg-white border-gray-100 hover:bg-gray-50'}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isSelected ? level.color : 'bg-gray-50 text-gray-400'}`}>
                                                    {level.icon}
                                                </div>
                                                <div className="text-left">
                                                    <h4 className={`font-bold text-sm ${isSelected ? 'text-gray-900' : 'text-gray-500'}`}>{level.label}</h4>
                                                    <p className={`text-[11px] ${isSelected ? 'text-gray-600 opacity-70' : 'text-gray-400'}`}>{level.sub}</p>
                                                </div>
                                            </div>
                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-brand-500 border-brand-500' : 'bg-white border-gray-200'}`}>
                                                {isSelected && <Check size={12} className="text-white" strokeWidth={4} />}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="pt-4 border-t border-gray-100 space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">다이어리 상세 공유</label>
                                <button
                                    onClick={() => setLocalShareDiaryCalories(!localShareDiaryCalories)}
                                    className={`w-full p-4 rounded-[20px] border transition-all flex items-center justify-between ${localShareDiaryCalories ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-100 hover:bg-gray-50'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${localShareDiaryCalories ? 'bg-blue-100 text-blue-600' : 'bg-gray-50 text-gray-400'}`}>
                                            {localShareDiaryCalories ? <BookOpen size={18} /> : <Lock size={18} />}
                                        </div>
                                        <div className="text-left">
                                            <h4 className={`font-bold text-sm ${localShareDiaryCalories ? 'text-blue-900' : 'text-gray-500'}`}>다이어리 기록 공개</h4>
                                            <p className={`text-[11px] ${localShareDiaryCalories ? 'text-blue-600 opacity-70' : 'text-gray-400'}`}>초대된 친구들이 내 식단 상세 내용을 볼 수 있게 합니다</p>
                                        </div>
                                    </div>
                                    <div className={`w-10 h-5 rounded-full transition-colors relative ${localShareDiaryCalories ? 'bg-brand-500' : 'bg-gray-200'}`}>
                                        <div className={`w-3.5 h-3.5 bg-white rounded-full absolute top-0.75 transition-transform ${localShareDiaryCalories ? 'left-[calc(100%-1.1rem)]' : 'left-0.75'}`}></div>
                                    </div>
                                </button>
                            </div>
                        </div>

                        <button
                            onClick={handleConfirmShareSettings}
                            className="w-full bg-gray-900 text-white py-4 rounded-[20px] font-black text-base shadow-xl shadow-gray-100 transition-all active:scale-[0.98]"
                        >
                            확인
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MealDetail;

declare global {
    interface Window {
        ReactNativeWebView?: {
            postMessage: (message: string) => void;
        };
        Toaster?: {
            postMessage: (message: string) => void;
        };
        receiveImageFromApp?: (base64Image: string) => void;
        receiveLocationFromApp?: (locationData: any) => void;
    }
}

import React, { useState, useRef, useEffect } from 'react';
import { Camera, X, Check, Loader2, Sparkles, AlertCircle, Baby, Bookmark, Trash2, ArrowLeft, AlertTriangle, Users, Lock, PenTool, BookOpen, Globe, Pencil, MapPin, Plus, Info, Image as ImageIcon, RefreshCw, Smile, Meh, Frown } from 'lucide-react';
import { analyzeFoodImage, fileToGenerativePart, recalculateNutrition } from '../services/geminiService';
import { Meal, MealType, MealTemplate, AppSettings, BabyProfile } from '../types';
import { useModal } from './GlobalModal';

interface MealEntryProps {
    onClose: () => void;
    onSave: (meal: Omit<Meal, 'id'>) => void | Promise<void>;
    hasBabyProfile: boolean;
    babyProfiles: BabyProfile[];
    templates: MealTemplate[];
    onDeleteTemplate: (id: string) => void;
    initialPrivacySettings: AppSettings['privacy'];
}

const MealEntry: React.FC<MealEntryProps> = ({
    onClose,
    onSave,
    hasBabyProfile,
    babyProfiles,
    templates,
    onDeleteTemplate,
    initialPrivacySettings
}) => {
    const { showAlert } = useModal();
    const [step, setStep] = useState<'capture' | 'analyzing' | 'review' | 'templates' | 'manual'>('capture');
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [imageFileBase64, setImageFileBase64] = useState<string | null>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);
    const albumInputRef = useRef<HTMLInputElement>(null);
    const [analysisResult, setAnalysisResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [isBabyFood, setIsBabyFood] = useState(false);
    const [selectedBabyIndex, setSelectedBabyIndex] = useState(0);
    const [babyReaction, setBabyReaction] = useState<'good' | 'soso' | 'bad'>('good');
    const [location, setLocation] = useState<{ latitude: number; longitude: number } | undefined>(undefined);

    // Review Step Editable States
    const [editName, setEditName] = useState('');
    const [editCalories, setEditCalories] = useState<number>(0);
    const [memo, setMemo] = useState('');
    const [editIngredients, setEditIngredients] = useState<string[]>([]);
    const [newIngredient, setNewIngredient] = useState('');
    const [editLocationName, setEditLocationName] = useState('');

    // Loading States
    const [isRecalculating, setIsRecalculating] = useState(false);
    const [analysisProgress, setAnalysisProgress] = useState(-1);

    // Privacy States
    const [sharingLevel, setSharingLevel] = useState<'public' | 'partners' | 'private'>(initialPrivacySettings.shareCalories);
    const [shareDiaryCalories, setShareDiaryCalories] = useState(initialPrivacySettings.shareDiaryCalories);

    // Manual Entry State
    const [manualForm, setManualForm] = useState({
        foodName: '',
        description: '',
        calories: '',
        carbs: '',
        protein: '',
        fat: ''
    });

    // Animation effect for analysis checklist
    useEffect(() => {
        let interval: ReturnType<typeof setInterval>;
        if (step === 'analyzing' || isRecalculating) {
            setAnalysisProgress(-1);
            interval = setInterval(() => {
                setAnalysisProgress(prev => {
                    if (prev < 3) return prev + 1;
                    return prev;
                });
            }, 800);
        }
        return () => clearInterval(interval);
    }, [step, isRecalculating]);

    const getCurrentLocation = (): Promise<{ latitude: number; longitude: number } | undefined> => {
        return new Promise((resolve) => {
            // 1. Try Native App Location via Message (Priority)
            if (window.ReactNativeWebView) {
                console.log("Requesting location from Native App...");

                // Create a temporary handler for the response
                const handleLocationResponse = (locationData: any) => {
                    console.log("Received location from Native App:", locationData);
                    if (locationData && locationData.latitude && locationData.longitude) {
                        resolve({
                            latitude: locationData.latitude,
                            longitude: locationData.longitude
                        });
                    } else {
                        resolve(undefined);
                    }
                };

                // Assign to global window object so the native app can call it
                window.receiveLocationFromApp = handleLocationResponse;

                // Send request message
                window.ReactNativeWebView.postMessage('get_location');

                // Fallback timeout in case app doesn't respond quickly
                setTimeout(() => {
                    if (window.receiveLocationFromApp === handleLocationResponse) {
                        console.warn("Native app location request timed out, trying web geolocation...");
                        // Clean up and fall through to web geolocation
                        window.receiveLocationFromApp = undefined;
                        tryWebGeolocation(resolve);
                    }
                }, 3000);
                return;
            }

            // 2. Web Geolocation (Fallback)
            tryWebGeolocation(resolve);
        });
    };

    const tryWebGeolocation = (resolve: (loc: { latitude: number; longitude: number } | undefined) => void) => {
        if (!navigator.geolocation) {
            resolve(undefined);
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (position) => {
                resolve({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                });
            },
            (error) => {
                console.warn("Geolocation error:", error);
                resolve(undefined);
            },
            { timeout: 5000, enableHighAccuracy: false }
        );
    };

    const handleImageAnalysis = React.useCallback(async (base64: string, type: string = 'image/jpeg') => {
        try {
            setStep('analyzing');
            setError(null);

            // 입력 데이터 정제: Data URL 형식이 포함되어 있는지 확인
            let finalBase64 = base64;
            let finalType = type;

            if (base64.startsWith('data:')) {
                const parts = base64.split(',');
                if (parts.length > 1) {
                    finalBase64 = parts[1];
                    const mimeMatch = parts[0].match(/data:(.*?);/);
                    if (mimeMatch) finalType = mimeMatch[1];
                }
            }

            setImageFileBase64(finalBase64);
            setImagePreview(`data:${finalType};base64,${finalBase64}`);

            // Fetch location properly before analysis
            const loc = await getCurrentLocation();
            console.log("Location for analysis:", loc);
            setLocation(loc);

            const result = await analyzeFoodImage(finalBase64, loc);
            setAnalysisProgress(4);
            await new Promise(resolve => setTimeout(resolve, 500));

            setAnalysisResult(result);
            setEditName(result.foodName);
            setEditCalories(result.calories);
            setMemo('');
            setEditIngredients(result.ingredients || []);
            setEditLocationName(result.locationName || '');

            setStep('review');
        } catch (err) {
            console.error("Analysis Error:", err);
            setError('이미지를 분석하는 중 오류가 발생했습니다.');
            setStep('capture');
        }
    }, [analyzeFoodImage, getCurrentLocation]);

    useEffect(() => {
        // React Native 앱으로부터 Base64 이미지 데이터를 수신하는 전역 함수 등록
        window.receiveImageFromApp = (base64Image: string) => {
            try {
                console.log("React Native 앱으로부터 이미지를 성공적으로 받았습니다.");
                handleImageAnalysis(base64Image);
            } catch (e) {
                console.error("receiveImageFromApp 함수 실행 중 오류 발생:", e);
            }
        };

        const handleMessage = (event: MessageEvent) => {
            try {
                const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
                if (data && (data.type === 'image' || data.type === 'camera' || data.type === 'album')) {
                    if (data.base64) {
                        handleImageAnalysis(data.base64, data.mimeType || 'image/jpeg');
                    }
                }
            } catch (e) { }
        };

        window.addEventListener('message', handleMessage);
        document.addEventListener('message', handleMessage as any);

        return () => {
            window.removeEventListener('message', handleMessage);
            document.removeEventListener('message', handleMessage as any);
            // 언마운트 시 전역 함수 정리
            delete window.receiveImageFromApp;
        };
    }, [handleImageAnalysis]);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64String = reader.result as string;
                const base64 = base64String.split(',')[1];
                handleImageAnalysis(base64, file.type);
            };
            reader.readAsDataURL(file);
            e.target.value = '';
        }
    };

    const handleReanalyze = async () => {
        if (!imageFileBase64) return;

        setStep('analyzing');
        setError(null);
        try {
            const loc = await getCurrentLocation();
            setLocation(loc);

            const result = await analyzeFoodImage(imageFileBase64, loc);
            setAnalysisProgress(4);
            await new Promise(resolve => setTimeout(resolve, 500));

            setAnalysisResult(result);
            setEditName(result.foodName);
            setEditCalories(result.calories);
            setEditIngredients(result.ingredients || []);
            setEditLocationName(result.locationName || '');

            setStep('review');
        } catch (err) {
            setError('재분석 중 오류가 발생했습니다.');
            setStep('review');
        }
    };

    const getMealType = (): MealType => {
        const hour = new Date().getHours();
        if (hour >= 6 && hour < 10) return 'breakfast';
        if (hour >= 11 && hour < 15) return 'lunch';
        if (hour >= 17 && hour < 21) return 'dinner';
        return 'snack';
    };

    const handleSave = async () => {
        if (!analysisResult) return;

        const currentIngredientsJSON = JSON.stringify([...editIngredients].sort());
        const lastAnalyzedIngredientsJSON = JSON.stringify([...(analysisResult.ingredients || [])].sort());
        const hasIngredientsChanged = currentIngredientsJSON !== lastAnalyzedIngredientsJSON;

        let finalNutrition = {
            calories: editCalories,
            carbs: analysisResult.carbs,
            protein: analysisResult.protein,
            fat: analysisResult.fat
        };

        if (hasIngredientsChanged && imageFileBase64) {
            setIsRecalculating(true);
            try {
                const newNutrition = await recalculateNutrition(imageFileBase64, editIngredients);
                finalNutrition = newNutrition;
                setAnalysisProgress(4);
                await new Promise(resolve => setTimeout(resolve, 500));
            } catch (recalcError) {
                console.error("Auto-recalculation failed, saving with old data", recalcError);
            }
        }

        try {
            const selectedBaby = babyProfiles[selectedBabyIndex];
            await onSave({
                userId: 'current-user',
                userName: '나',
                foodName: editName || analysisResult.foodName,
                nutrition: finalNutrition,
                type: getMealType(),
                image: imagePreview || undefined,
                description: memo,
                aiDescription: analysisResult.description,
                aiTip: analysisResult.aiTip,
                ingredients: editIngredients,
                ingredientDetails: analysisResult.ingredientDetails || [],
                location: location ? {
                    ...location,
                    name: editLocationName,
                    type: analysisResult.locationType
                } : undefined,
                timestamp: Date.now(),
                likes: [],
                comments: [],
                isBabyFood: isBabyFood,
                babyId: isBabyFood ? selectedBaby?.id : undefined,
                babyName: isBabyFood ? selectedBaby?.name : undefined,
                babyReaction: isBabyFood ? babyReaction : undefined,
                sharingLevel: sharingLevel,
                shareDiaryCalories: shareDiaryCalories
            });
            setIsRecalculating(false);
            await showAlert('식단 기록이 성공적으로 저장되었습니다!');
            onClose();
        } catch (e) {
            console.error(e);
            setError('저장 중 오류가 발생했습니다.');
            setIsRecalculating(false);
        }
    };

    // '사진 촬영' 버튼 클릭 시 호출할 함수
    const requestCameraFromApp = () => {
        console.log("requestCameraFromApp 호출됨. Toaster 존재 여부:", !!(window as any).Toaster);
        // 앱의 웹뷰 환경인지 확인 (Flutter Webview 채널 'Toaster')
        if ((window as any).Toaster) {
            console.log("Toaster.postMessage('open_camera') 전송 시도");
            (window as any).Toaster.postMessage('open_camera');
        } else if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage('open_camera');
        } else {
            cameraInputRef.current?.click();
        }
    };

    // '앨범에서 선택' 버튼 클릭 시 호출할 함수
    const requestAlbumFromApp = () => {
        // 앱의 웹뷰 환경인지 확인 (Flutter Webview 채널 'Toaster')
        if ((window as any).Toaster) {
            (window as any).Toaster.postMessage('open_album'); // 'open_album'으로 수정
        } else if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage('open_album');
        } else {
            albumInputRef.current?.click();
        }
    };

    const handleAddIngredient = () => {
        if (newIngredient.trim()) {
            if (!editIngredients.includes(newIngredient.trim())) {
                setEditIngredients([...editIngredients, newIngredient.trim()]);
            }
            setNewIngredient('');
        }
    };

    const handleRemoveIngredient = (index: number) => {
        const newIngredients = [...editIngredients];
        newIngredients.splice(index, 1);
        setEditIngredients(newIngredients);
    };

    const handleManualSave = async () => {
        if (!manualForm.foodName.trim()) {
            setError('음식 이름을 입력해주세요.');
            return;
        }

        const selectedBaby = babyProfiles[selectedBabyIndex];
        await onSave({
            userId: 'current-user',
            userName: '나',
            foodName: manualForm.foodName,
            nutrition: {
                calories: Number(manualForm.calories) || 0,
                carbs: Number(manualForm.carbs) || 0,
                protein: Number(manualForm.protein) || 0,
                fat: Number(manualForm.fat) || 0
            },
            type: getMealType(),
            description: manualForm.description,
            ingredients: [],
            timestamp: Date.now(),
            likes: [],
            comments: [],
            isBabyFood: isBabyFood,
            babyId: isBabyFood ? selectedBaby?.id : undefined,
            babyName: isBabyFood ? selectedBaby?.name : undefined,
            babyReaction: isBabyFood ? babyReaction : undefined,
            sharingLevel: sharingLevel,
            shareDiaryCalories: shareDiaryCalories
        });
        await showAlert('식단 기록이 저장되었습니다!');
        onClose();
    };

    const handleSelectTemplate = (template: MealTemplate) => {
        const mockAnalysisResult = {
            foodName: template.foodName,
            calories: template.nutrition.calories,
            carbs: template.nutrition.carbs,
            protein: template.nutrition.protein,
            fat: template.nutrition.fat,
            description: template.aiDescription || '템플릿에서 불러온 식단입니다.',
            ingredients: template.ingredients,
            ingredientDetails: template.ingredientDetails || [],
            aiTip: template.aiTip || '자주 먹는 식단으로 균형 잡힌 영양 섭취를 유지하세요!',
            locationName: '',
            locationType: 'home'
        };

        setAnalysisResult(mockAnalysisResult);
        setEditName(template.foodName);
        setEditCalories(template.nutrition.calories);
        setMemo('');
        setEditIngredients(template.ingredients);
        setEditLocationName('');
        setImagePreview(template.image || null); // 템플릿 이미지 미리보기에 적용
        setImageFileBase64(null); // 템플릿 이미지는 서버 URL이므로 Base64는 비움
        setIsBabyFood(true);
        setStep('review');
    };

    const cycleSharingLevel = () => {
        if (sharingLevel === 'public') setSharingLevel('partners');
        else if (sharingLevel === 'partners') setSharingLevel('private');
        else setSharingLevel('public');
    };

    const getSharingLevelConfig = () => {
        switch (sharingLevel) {
            case 'public':
                return {
                    icon: <Globe size={20} />,
                    label: '함께 칼로리 공유',
                    subLabel: '전체공개 (모든 친구에게 공유)',
                    colorClass: 'bg-green-100 text-green-600',
                    borderClass: 'bg-green-50 border-green-200',
                    textClass: 'text-green-900',
                    subTextClass: 'text-green-600',
                    checkClass: 'bg-green-500 border-green-500'
                };
            case 'partners':
                return {
                    icon: <Users size={20} />,
                    label: '함께 칼로리 공유',
                    subLabel: '친구만 (파트너/가족만)',
                    colorClass: 'bg-indigo-100 text-indigo-600',
                    borderClass: 'bg-indigo-50 border-indigo-200',
                    textClass: 'text-indigo-900',
                    subTextClass: 'text-indigo-600',
                    checkClass: 'bg-indigo-500 border-indigo-500'
                };
            case 'private':
                return {
                    icon: <Lock size={20} />,
                    label: '함께 칼로리 공유',
                    subLabel: '나만보기 (공유 안함)',
                    colorClass: 'bg-gray-100 text-gray-400',
                    borderClass: 'bg-white border-gray-200 hover:bg-gray-50',
                    textClass: 'text-gray-700',
                    subTextClass: 'text-gray-400',
                    checkClass: 'border-gray-300'
                };
        }
    };

    const sharingConfig = getSharingLevelConfig();

    if (step === 'analyzing' || isRecalculating) {
        const checklistItems = [
            "음식 종류 분석",
            "재료 구성 확인",
            "영양 성분 계산",
            "칼로리 측정",
            "AI 코멘트 생성"
        ];
        const totalSteps = checklistItems.length;
        const progressPercent = Math.min((Math.max(0, analysisProgress + 1) / totalSteps), 0.95);

        return (
            <div className="fixed inset-0 bg-white z-[60] flex flex-col items-center justify-center p-6 animate-[fadeIn_0.3s_ease-out]">
                {/* 분석 애니메이션 섹션 */}
                <div className="relative mb-12 w-56 h-56 flex items-center justify-center">
                    <div className="absolute w-52 h-52 rounded-full border-2 border-blue-100 animate-pulse opacity-50"></div>
                    <div className="absolute w-48 h-48 rounded-full border-2 border-blue-50 animate-pulse delay-150 opacity-30"></div>

                    <svg viewBox="0 0 100 100" className="absolute w-full h-full z-20">
                        <circle cx="50" cy="50" r="46" stroke="#f3f4f6" strokeWidth="3" fill="none" />
                        <circle
                            cx="50" cy="50" r="46"
                            stroke="#3b82f6"
                            strokeWidth="3"
                            fill="none"
                            strokeDasharray="289"
                            strokeDashoffset={289 - (289 * progressPercent)}
                            className="transition-all duration-700 ease-in-out"
                            strokeLinecap="round"
                            transform="rotate(-90 50 50)"
                        />
                    </svg>

                    <div className="relative w-40 h-40 rounded-full overflow-hidden border-[6px] border-white shadow-2xl bg-gray-50 z-10">
                        {imagePreview ? (
                            <img src={imagePreview} alt="analyzing" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                                <Camera size={40} />
                            </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-b from-blue-400/0 via-blue-400/30 to-blue-400/0 h-1/4 w-full animate-[slideDown_2s_infinite] -translate-y-full blur-sm"></div>
                    </div>

                    <div className="absolute inset-0 bg-blue-100/40 rounded-full -z-0 scale-95 blur-2xl animate-pulse"></div>
                </div>

                <div className="text-center mb-12 space-y-3">
                    <div className="flex items-center justify-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce"></div>
                        <p className="text-blue-600 font-black text-xs tracking-widest uppercase">AI ANALYZING</p>
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce delay-75"></div>
                    </div>
                    <h2 className="text-2xl font-black text-gray-900 leading-tight">
                        촬영하신 식단을<br />
                        꼼꼼하게 분석하고 있어요
                    </h2>
                </div>

                <div className="w-full max-w-xs space-y-3">
                    {checklistItems.map((item, index) => {
                        const isCompleted = index <= analysisProgress;
                        const isCurrent = index === analysisProgress + 1;
                        return (
                            <div key={index} className="flex items-center gap-4 group transition-all duration-300">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-500 ${isCompleted
                                    ? 'bg-blue-500 shadow-md shadow-blue-100'
                                    : (isCurrent ? 'bg-white border-2 border-blue-500 shadow-lg' : 'bg-gray-50 border border-gray-100')
                                    }`}>
                                    {isCompleted ? (
                                        <Check size={16} className="text-white" strokeWidth={3} />
                                    ) : isCurrent ? (
                                        <Loader2 size={16} className="text-blue-500 animate-spin" />
                                    ) : (
                                        <div className="w-1.5 h-1.5 rounded-full bg-gray-200" />
                                    )}
                                </div>
                                <span className={`text-base font-bold transition-colors duration-300 ${isCompleted ? 'text-gray-800' : (isCurrent ? 'text-blue-600' : 'text-gray-300')
                                    }`}>
                                    {item}
                                </span>
                            </div>
                        );
                    })}
                </div>
                <button
                    onClick={() => {
                        if (isRecalculating) setIsRecalculating(false);
                        else setStep('capture');
                    }}
                    className="absolute top-6 right-6 p-3 bg-gray-100/50 hover:bg-gray-100 rounded-full text-gray-400 transition-colors"
                >
                    <X size={24} />
                </button>
            </div>
        );
    }

    if (step === 'templates') {
        return (
            <div className="fixed inset-0 bg-white z-50 overflow-y-auto flex flex-col">
                <div className="sticky top-0 bg-white z-10 px-4 py-3 flex items-center justify-between border-b border-gray-100">
                    <button onClick={() => setStep('capture')} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <ArrowLeft size={24} className="text-gray-700" />
                    </button>
                    <h1 className="text-lg font-bold text-gray-800">자주 먹는 이유식</h1>
                    <div className="w-10"></div>
                </div>
                <div className="p-4 space-y-4">
                    {templates.length === 0 ? (
                        <div className="text-center py-20">
                            <Bookmark size={48} className="mx-auto text-gray-200 mb-4" />
                            <p className="text-gray-400 font-medium">저장된 템플릿이 없습니다.</p>
                            <p className="text-sm text-gray-400 mt-2">식단 상세 화면에서<br />자주 먹는 메뉴를 저장해보세요!</p>
                        </div>
                    ) : (
                        templates.map(template => (
                            <div key={template.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                                <div className="flex items-center gap-3 flex-1 cursor-pointer" onClick={() => handleSelectTemplate(template)}>
                                    {template.image && (
                                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                                            <img src={template.image} alt={template.name} className="w-full h-full object-cover" />
                                        </div>
                                    )}
                                    <div className="min-w-0 flex-1">
                                        <h3 className="font-bold text-gray-800 truncate">{template.name}</h3>
                                        <p className="text-sm text-gray-500 mt-0.5">{template.foodName} · {template.nutrition.calories}kcal</p>
                                        {template.ingredients.length > 0 && (
                                            <p className="text-xs text-indigo-500 mt-1 truncate">{template.ingredients.join(', ')}</p>
                                        )}
                                    </div>
                                </div>
                                <button onClick={() => onDeleteTemplate(template.id)} className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg ml-2 transition-colors">
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        );
    }

    const renderPrivacyControls = () => (
        <div className="space-y-3">
            <div onClick={cycleSharingLevel} className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${sharingConfig.borderClass}`}>
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${sharingConfig.colorClass}`}>{sharingConfig.icon}</div>
                    <div>
                        <h4 className={`font-bold text-sm ${sharingConfig.textClass}`}>{sharingConfig.label}</h4>
                        <p className={`text-xs ${sharingConfig.subTextClass}`}>{sharingConfig.subLabel}</p>
                    </div>
                </div>
                <div className={`w-6 h-6 rounded-full border flex items-center justify-center transition-colors ${sharingConfig.checkClass}`}>
                    {sharingLevel !== 'private' && <Check size={14} className="text-white" />}
                </div>
            </div>
            <div onClick={() => setShareDiaryCalories(!shareDiaryCalories)} className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${shareDiaryCalories ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${shareDiaryCalories ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                        {shareDiaryCalories ? <BookOpen size={20} /> : <Lock size={20} />}
                    </div>
                    <div>
                        <h4 className={`font-bold text-sm ${shareDiaryCalories ? 'text-blue-900' : 'text-gray-700'}`}>다이어리 칼로리 공유</h4>
                        <p className={`text-xs ${shareDiaryCalories ? 'text-blue-600' : 'text-gray-400'}`}>{shareDiaryCalories ? '파트너에게 상세 정보를 공개합니다' : '나만 볼 수 있습니다'}</p>
                    </div>
                </div>
                <div className={`w-6 h-6 rounded-full border flex items-center justify-center transition-colors ${shareDiaryCalories ? 'bg-blue-500 border-blue-500' : 'border-gray-300'}`}>
                    {shareDiaryCalories && <Check size={14} className="text-white" />}
                </div>
            </div>
        </div>
    );

    if (step === 'manual') {
        return (
            <div className="fixed inset-0 bg-gray-50 z-50 overflow-y-auto">
                <div className="bg-white px-4 py-3 flex justify-between items-center shadow-sm sticky top-0 z-10">
                    <button onClick={() => setStep('capture')} className="p-2 hover:bg-gray-100 rounded-full text-gray-500"><ArrowLeft size={24} /></button>
                    <h2 className="font-bold text-lg text-gray-800">직접 입력</h2>
                    <button onClick={handleManualSave} className="text-brand-600 font-bold px-2 py-1 rounded-lg hover:bg-brand-50 transition-colors">저장</button>
                </div>
                <div className="p-5 space-y-6 pb-24">
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                        <div className="space-y-1">
                            <label className="text-sm font-bold text-gray-700 ml-1">음식 이름 <span className="text-red-500">*</span></label>
                            <input type="text" value={manualForm.foodName} onChange={(e) => setManualForm({ ...manualForm, foodName: e.target.value })} placeholder="예: 닭가슴살 샐러드" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all" autoFocus />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-bold text-gray-700 ml-1">메모</label>
                            <textarea value={manualForm.description} onChange={(e) => setManualForm({ ...manualForm, description: e.target.value })} placeholder="맛이나 특이사항을 기록해보세요" rows={3} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all resize-none" />
                        </div>
                    </div>
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Sparkles size={16} className="text-brand-500" />영양 성분 (선택)</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className="text-xs font-bold text-gray-500 mb-1 block">총 칼로리 (kcal)</label>
                                <input type="number" value={manualForm.calories} onChange={(e) => setManualForm({ ...manualForm, calories: e.target.value })} placeholder="0" className="w-full bg-brand-50 border border-brand-100 text-brand-900 font-bold rounded-xl px-4 py-3 focus:outline-none focus:border-brand-500 transition-all" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 mb-1 block">탄수화물 (g)</label>
                                <input type="number" value={manualForm.carbs} onChange={(e) => setManualForm({ ...manualForm, carbs: e.target.value })} placeholder="0" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-gray-400 transition-all" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 mb-1 block">단백질 (g)</label>
                                <input type="number" value={manualForm.protein} onChange={(e) => setManualForm({ ...manualForm, protein: e.target.value })} placeholder="0" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-gray-400 transition-all" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 mb-1 block">지방 (g)</label>
                                <input type="number" value={manualForm.fat} onChange={(e) => setManualForm({ ...manualForm, fat: e.target.value })} placeholder="0" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-gray-400 transition-all" />
                            </div>
                        </div>
                    </div>
                    {renderPrivacyControls()}
                    {hasBabyProfile && (
                        <div className="space-y-3">
                            <div onClick={() => setIsBabyFood(!isBabyFood)} className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${isBabyFood ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-gray-200 hover:bg-gray-200'}`}>
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isBabyFood ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-400'}`}><Baby size={20} /></div>
                                    <div>
                                        <h4 className={`font-bold ${isBabyFood ? 'text-indigo-900' : 'text-gray-700'}`}>이유식으로 기록하기</h4>
                                        <p className={`text-xs ${isBabyFood ? 'text-indigo-600' : 'text-gray-400'}`}>{isBabyFood ? '아이 식단 다이어리에 저장됩니다' : '일반 식단으로 저장됩니다'}</p>
                                    </div>
                                </div>
                                <div className={`w-6 h-6 rounded-full border flex items-center justify-center transition-colors ${isBabyFood ? 'bg-indigo-500 border-indigo-500' : 'border-gray-300'}`}>{isBabyFood && <Check size={14} className="text-white" />}</div>
                            </div>
                            {isBabyFood && (
                                <div className="bg-indigo-50/50 p-5 rounded-[28px] border border-indigo-100 shadow-sm animate-[fadeIn_0.3s_ease-out]">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Baby size={18} className="text-indigo-500" />
                                        <h3 className="font-bold text-indigo-900 text-sm">오늘의 이유식 반응</h3>
                                    </div>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => setBabyReaction('good')}
                                            className={`flex-1 py-4 rounded-2xl flex flex-col items-center gap-2 transition-all ${babyReaction === 'good'
                                                ? 'bg-green-500 text-white shadow-lg shadow-green-100'
                                                : 'bg-white text-gray-400 border border-gray-100 hover:bg-green-50'
                                                }`}
                                        >
                                            <Smile size={28} strokeWidth={babyReaction === 'good' ? 2.5 : 1.5} />
                                            <span className="text-[11px] font-black">잘 먹음</span>
                                        </button>
                                        <button
                                            onClick={() => setBabyReaction('soso')}
                                            className={`flex-1 py-4 rounded-2xl flex flex-col items-center gap-2 transition-all ${babyReaction === 'soso'
                                                ? 'bg-yellow-400 text-white shadow-lg shadow-yellow-100'
                                                : 'bg-white text-gray-400 border border-gray-100 hover:bg-yellow-50'
                                                }`}
                                        >
                                            <Meh size={28} strokeWidth={babyReaction === 'soso' ? 2.5 : 1.5} />
                                            <span className="text-[11px] font-black">보통</span>
                                        </button>
                                        <button
                                            onClick={() => setBabyReaction('bad')}
                                            className={`flex-1 py-4 rounded-2xl flex flex-col items-center gap-2 transition-all ${babyReaction === 'bad'
                                                ? 'bg-red-400 text-white shadow-lg shadow-red-100'
                                                : 'bg-white text-gray-400 border border-gray-100 hover:bg-red-50'
                                                }`}
                                        >
                                            <Frown size={28} strokeWidth={babyReaction === 'bad' ? 2.5 : 1.5} />
                                            <span className="text-[11px] font-black">거부함</span>
                                        </button>
                                    </div>
                                </div>
                            )}
                            {isBabyFood && babyProfiles.length > 1 && (
                                <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                                    {babyProfiles.map((b, i) => (
                                        <button key={i} onClick={() => setSelectedBabyIndex(i)} className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${selectedBabyIndex === i ? 'bg-indigo-500 text-white shadow-md' : 'bg-white border border-gray-200 text-gray-400'}`}>
                                            {b.name}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    if (step === 'review' && analysisResult) {
        const detectedAllergens = editIngredients.filter((ing: string) =>
            babyProfiles[selectedBabyIndex]?.allergies?.some(allergy => ing.includes(allergy) || allergy.includes(ing))
        );

        return (
            <div className="fixed inset-0 bg-gray-50 z-50 overflow-y-auto">
                <div className="bg-white p-4 flex justify-between items-center shadow-sm sticky top-0 z-10">
                    <button onClick={() => setStep('capture')} className="text-gray-500"><X /></button>
                    <h2 className="font-bold text-lg">기록 확인</h2>
                    <button onClick={handleSave} className="text-brand-600 font-bold">저장</button>
                </div>

                <div className="p-4 space-y-6 pb-24">
                    <div className="w-full h-64 bg-gray-200 rounded-2xl overflow-hidden shadow-md flex items-center justify-center relative group">
                        {imagePreview ? (
                            <img src={imagePreview} alt="Food" className="w-full h-full object-cover" />
                        ) : (
                            <div className="flex flex-col items-center text-gray-400">
                                <Camera size={48} className="mb-2 opacity-50" /><span className="text-sm font-medium">사진 없음</span>
                            </div>
                        )}
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-5">
                        <div className="space-y-1">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-bold text-gray-700 ml-1">
                                    음식 이름 <span className="text-red-500">*</span>
                                </label>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={handleReanalyze}
                                        className="flex items-center gap-1 text-[11px] font-bold text-brand-500 bg-brand-50 px-2 py-1.5 rounded-lg hover:bg-brand-100 transition-colors"
                                    >
                                        <RefreshCw size={12} /> 다시 분석
                                    </button>
                                    <div className="bg-brand-50 text-brand-700 px-3 py-1.5 rounded-xl text-sm font-bold flex items-center gap-1 border border-brand-100 shadow-sm">
                                        <input
                                            type="number" value={editCalories}
                                            onChange={(e) => setEditCalories(Number(e.target.value))}
                                            className="bg-transparent w-12 text-right focus:outline-none"
                                        />
                                        <span className="text-[10px] opacity-70 font-medium">kcal</span>
                                    </div>
                                </div>
                            </div>
                            <input
                                type="text" value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="w-full text-2xl font-bold text-gray-800 border-b border-gray-200 focus:border-brand-500 focus:outline-none bg-transparent py-1 transition-colors"
                            />
                        </div>

                        <div className="grid grid-cols-3 gap-4 pt-2">
                            <div className="text-center p-3 bg-gray-50 rounded-xl">
                                <p className="text-xs text-gray-400 mb-1">탄수화물</p>
                                <p className="font-bold text-gray-800 text-sm">{analysisResult.carbs}g</p>
                            </div>
                            <div className="text-center p-3 bg-gray-50 rounded-xl">
                                <p className="text-xs text-gray-400 mb-1">단백질</p>
                                <p className="font-bold text-gray-800 text-sm">{analysisResult.protein}g</p>
                            </div>
                            <div className="text-center p-3 bg-gray-50 rounded-xl">
                                <p className="text-xs text-gray-400 mb-1">지방</p>
                                <p className="font-bold text-gray-800 text-sm">{analysisResult.fat}g</p>
                            </div>
                        </div>

                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-start gap-3">
                            <Sparkles className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                            <div>
                                <h4 className="font-bold text-blue-800 text-sm">AI 꿀팁</h4>
                                <p className="text-blue-700 text-xs mt-1 leading-relaxed">{analysisResult.aiTip || "분석된 꿀팁이 없어요."}</p>
                            </div>
                        </div>

                        {analysisResult.ingredientDetails && analysisResult.ingredientDetails.length > 0 && (
                            <div className="pt-2">
                                <h4 className="text-xs font-bold text-gray-400 mb-3 flex items-center gap-1"><Info size={12} /> 재료별 영양 분석</h4>
                                <div className="space-y-2">
                                    {analysisResult.ingredientDetails.map((detail: any, idx: number) => (
                                        <div key={idx} className="flex flex-col bg-gray-50 p-3 rounded-xl gap-1">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="font-bold text-gray-800 text-sm flex-1 min-w-0 break-words">{detail.name}</span>
                                                <span className="text-[10px] font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-lg text-right break-keep">
                                                    {detail.nutritionEstimate}
                                                </span>
                                            </div>
                                            <p className="text-[13px] text-gray-500 break-words leading-relaxed">{detail.benefit}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="text-xs font-bold text-gray-400">분석된 재료</h4>
                            </div>
                            <div className="flex flex-wrap gap-2 mb-2">
                                {editIngredients.map((ing: string, i: number) => {
                                    const isAllergic = babyProfiles[selectedBabyIndex]?.allergies?.some(allergy => ing.includes(allergy) || allergy.includes(ing));
                                    return (
                                        <span key={i} className={`px-2.5 py-1 text-xs rounded-lg font-medium flex items-center gap-1 ${isAllergic
                                            ? 'bg-red-100 text-red-600 border border-red-200'
                                            : 'bg-gray-100 text-gray-600'
                                            }`}>
                                            {isAllergic && <AlertTriangle size={10} />}
                                            #{ing}
                                            <button onClick={() => handleRemoveIngredient(i)} className="ml-1 text-gray-400 hover:text-red-500"><X size={12} /></button>
                                        </span>
                                    );
                                })}
                            </div>
                            <div className="flex gap-2 mb-3">
                                <input type="text" value={newIngredient} onChange={(e) => setNewIngredient(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleAddIngredient()} placeholder="재료 추가" className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-brand-500 flex-1" />
                                <button onClick={handleAddIngredient} className="px-2 bg-brand-50 text-brand-600 rounded-lg hover:bg-brand-100"><Plus size={14} /></button>
                            </div>
                        </div>

                        <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                            <span className="text-[10px] font-bold text-gray-400 block mb-2">AI 음식 설명</span>
                            <p className="text-sm text-gray-600 leading-relaxed">{analysisResult.description}</p>
                        </div>

                        <div className="space-y-4 pt-2">
                            <div>
                                <label className="text-xs font-bold text-gray-400 mb-1 flex items-center gap-1">식단 메모 <PenTool size={10} /></label>
                                <textarea value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="오늘 식사에 대한 메모를 남겨보세요" rows={3} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all resize-none" />
                            </div>
                            {location && (
                                <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg border border-gray-100">
                                    <MapPin size={16} className={analysisResult.locationType === 'home' ? 'text-green-500' : 'text-red-500'} />
                                    <input type="text" value={editLocationName} onChange={(e) => setEditLocationName(e.target.value)} placeholder="장소명 입력" className="bg-transparent border-b border-gray-300 focus:border-brand-500 focus:outline-none w-full text-xs" />
                                </div>
                            )}
                        </div>
                    </div>

                    {detectedAllergens.length > 0 && (
                        <div className="bg-red-50 p-4 rounded-xl border border-red-200 flex items-start gap-3 animate-pulse">
                            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                            <div>
                                <h4 className="font-bold text-red-800 text-sm">알레르기 주의!</h4>
                                <p className="text-red-700 text-xs mt-1">{babyProfiles[selectedBabyIndex]?.name}가 주의해야 할 <strong>{detectedAllergens.join(', ')}</strong> 성분이 포함되어 있습니다.</p>
                            </div>
                        </div>
                    )}
                    {renderPrivacyControls()}
                    {hasBabyProfile && (
                        <div className="space-y-3">
                            <div onClick={() => setIsBabyFood(!isBabyFood)} className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${isBabyFood ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isBabyFood ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-400'}`}><Baby size={20} /></div>
                                    <div>
                                        <h4 className={`font-bold ${isBabyFood ? 'text-indigo-900' : 'text-gray-700'}`}>이유식으로 기록하기</h4>
                                        <p className={`text-xs ${isBabyFood ? 'text-indigo-600' : 'text-gray-400'}`}>{isBabyFood ? '아이 식단 다이어리에 저장됩니다' : '일반 식단으로 저장됩니다'}</p>
                                    </div>
                                </div>
                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isBabyFood ? 'bg-indigo-500 border-indigo-500' : 'border-gray-300'}`}>{isBabyFood && <Check size={14} className="text-white" strokeWidth={4} />}</div>
                            </div>
                            {isBabyFood && (
                                <div className="bg-indigo-50/50 p-5 rounded-[28px] border border-indigo-100 shadow-sm animate-[fadeIn_0.3s_ease-out]">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Baby size={18} className="text-indigo-500" />
                                        <h3 className="font-bold text-indigo-900 text-sm">오늘의 이유식 반응</h3>
                                    </div>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => setBabyReaction('good')}
                                            className={`flex-1 py-4 rounded-2xl flex flex-col items-center gap-2 transition-all ${babyReaction === 'good'
                                                ? 'bg-green-500 text-white shadow-lg shadow-green-100'
                                                : 'bg-white text-gray-400 border border-gray-100 hover:bg-green-50'
                                                }`}
                                        >
                                            <Smile size={28} strokeWidth={babyReaction === 'good' ? 2.5 : 1.5} />
                                            <span className="text-[11px] font-black">잘 먹음</span>
                                        </button>
                                        <button
                                            onClick={() => setBabyReaction('soso')}
                                            className={`flex-1 py-4 rounded-2xl flex flex-col items-center gap-2 transition-all ${babyReaction === 'soso'
                                                ? 'bg-yellow-400 text-white shadow-lg shadow-yellow-100'
                                                : 'bg-white text-gray-400 border border-gray-100 hover:bg-yellow-50'
                                                }`}
                                        >
                                            <Meh size={28} strokeWidth={babyReaction === 'soso' ? 2.5 : 1.5} />
                                            <span className="text-[11px] font-black">보통</span>
                                        </button>
                                        <button
                                            onClick={() => setBabyReaction('bad')}
                                            className={`flex-1 py-4 rounded-2xl flex flex-col items-center gap-2 transition-all ${babyReaction === 'bad'
                                                ? 'bg-red-400 text-white shadow-lg shadow-red-100'
                                                : 'bg-white text-gray-400 border border-gray-100 hover:bg-red-50'
                                                }`}
                                        >
                                            <Frown size={28} strokeWidth={babyReaction === 'bad' ? 2.5 : 1.5} />
                                            <span className="text-[11px] font-black">거부함</span>
                                        </button>
                                    </div>
                                </div>
                            )}
                            {isBabyFood && babyProfiles.length > 1 && (
                                <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                                    {babyProfiles.map((b, i) => (
                                        <button key={i} onClick={() => setSelectedBabyIndex(i)} className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${selectedBabyIndex === i ? 'bg-indigo-500 text-white shadow-md' : 'bg-white border border-gray-200 text-gray-400'}`}>
                                            {b.name}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-end pb-12">
            <button onClick={onClose} className="absolute top-6 right-6 text-white p-2"><X size={32} /></button>
            <div className="w-full px-6 space-y-3">
                <div className="text-white text-center mb-6">
                    <h2 className="text-2xl font-bold mb-2">오늘 무엇을 드셨나요?</h2>
                    <p className="text-gray-300">사진을 찍으면 AI가 자동으로 분석해드려요.</p>
                </div>
                {error && <div className="bg-red-500/80 text-white p-3 rounded-lg flex items-center gap-2 text-sm mb-4"><AlertCircle size={16} /> {error}</div>}

                <button
                    onClick={requestCameraFromApp}
                    className="w-full bg-brand-500 hover:bg-brand-600 text-white py-4 rounded-2xl font-bold text-lg shadow-lg shadow-brand-500/30 flex items-center justify-center gap-3 transition-transform active:scale-95"
                >
                    <Camera size={24} />사진 촬영
                </button>
                <input type="file" ref={cameraInputRef} className="hidden" accept="image/*" capture="environment" onChange={handleFileChange} />

                <button
                    onClick={requestAlbumFromApp}
                    className="w-full bg-white text-gray-800 py-4 rounded-2xl font-bold text-lg shadow-lg flex items-center justify-center gap-3 transition-transform active:scale-95"
                >
                    <ImageIcon size={24} className="text-brand-500" />앨범에서 선택
                </button>
                <input type="file" ref={albumInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />

                {hasBabyProfile && <button onClick={() => setStep('templates')} className="w-full bg-indigo-500 hover:bg-indigo-600 text-white py-4 rounded-2xl font-bold text-lg shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-3 transition-transform active:scale-95"><Baby size={24} />자주 먹는 이유식 불러오기</button>}
                <button onClick={() => setStep('manual')} className="w-full bg-white/10 text-white py-4 rounded-2xl font-medium text-sm backdrop-blur-sm flex items-center justify-center gap-2 hover:bg-white/20 transition-colors"><PenTool size={16} />직접 입력하기</button>
            </div>
        </div>
    );
};

export default MealEntry;

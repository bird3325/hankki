
import React, { useState } from 'react';
import AuthLayout from './AuthLayout';
import { Mail, Lock, User, ArrowLeft, MessageCircle, Smile, Smartphone, Check, Baby, Sparkles } from 'lucide-react';
import { useModal } from './GlobalModal';
import { supabase } from '../lib/supabase';

interface SignupProps {
  onSignup: (user: any) => void;
  onLoginClick: () => void;
}

const Signup: React.FC<SignupProps> = ({ onSignup, onLoginClick }) => {
  const { showAlert } = useModal();
  const [realName, setRealName] = useState('');
  const [nickname, setNickname] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isBabyMode, setIsBabyMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!realName || !nickname || !phoneNumber || !email || !password || !confirmPassword) {
        showAlert('모든 필드를 입력해주세요.');
        return;
    }

    if (password !== confirmPassword) {
        showAlert('비밀번호가 일치하지 않습니다.');
        return;
    }
    
    setIsLoading(true);
    const normalizedEmail = email.trim().toLowerCase();
    const defaultAvatar = 'https://picsum.photos/200/200';
    
    try {
        // 1. Auth 회원가입
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: normalizedEmail,
            password,
            options: {
                data: {
                    full_name: realName,
                    nickname: nickname,
                    phone_number: phoneNumber,
                    enable_baby_mode: isBabyMode ? 'true' : 'false'
                }
            }
        });

        if (authError) throw authError;

        if (authData.user) {
            // 2. profiles 테이블 데이터 삽입
            const { error: profileError } = await supabase
                .from('profiles')
                .upsert({
                    id: authData.user.id,
                    email: normalizedEmail,
                    name: nickname,
                    full_name: realName,
                    phone_number: phoneNumber,
                    avatar_url: defaultAvatar,
                    settings: {
                        enableBabyMode: isBabyMode,
                        fastingGoal: 16,
                        notifications: { 
                            mealReminders: true, 
                            familyActivity: true,
                            marketing: false,
                            mealTimes: {
                                breakfast: '08:00',
                                lunch: '12:00',
                                dinner: '18:00'
                            }
                        },
                        privacy: { shareCalories: 'public', shareDiaryCalories: true }
                    }
                });

            if (profileError) {
                console.error('Profile creation error:', profileError);
            }

            if (authData.session) {
                onSignup({ 
                    id: authData.user.id, 
                    email: normalizedEmail, 
                    name: nickname 
                });
                showAlert('한끼에 오신 것을 환영합니다!');
            } else {
                showAlert('회원가입 신청이 완료되었습니다!\n이메일함에서 인증 링크를 클릭한 후 로그인해주세요.', {
                    confirmText: '확인'
                }).then(() => {
                    onLoginClick();
                });
            }
        }
    } catch (error: any) {
        console.error('Signup error:', error.message);
        let msg = '회원가입 실패: ' + (error.message || '오류가 발생했습니다.');
        
        if (error.message.includes('User already registered')) {
            msg = '이미 등록된 이메일 주소입니다.\n로그인을 진행하거나 다른 이메일을 사용해주세요.';
        }
        showAlert(msg);
    } finally {
        setIsLoading(false);
    }
  };

  const handleSocialSignup = async (provider: 'kakao') => {
    setIsLoading(true);
    try {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: provider,
          options: { redirectTo: window.location.origin }
        });
        if (error) throw error;
    } catch (error: any) {
        showAlert('소셜 로그인 실패: ' + error.message);
        setIsLoading(false);
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    if (value.length <= 11) {
        setPhoneNumber(value.replace(/^(\d{2,3})(\d{3,4})(\d{4})$/, `$1-$2-$3`));
    }
  };

  return (
    <AuthLayout 
      title="한끼 시작하기" 
      subtitle="가족과 함께하는 스마트한 식단 관리"
    >
      <button 
        onClick={onLoginClick}
        className="absolute top-6 left-6 p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
      >
        <ArrowLeft size={24} />
      </button>

      <div className="space-y-3 mb-8">
        <button 
            onClick={() => handleSocialSignup('kakao')}
            className="w-full flex items-center justify-center gap-2 py-4 bg-[#FEE500] text-[#3C1E1E] rounded-2xl hover:opacity-90 transition-opacity active:scale-[0.98] shadow-sm"
        >
            <MessageCircle size={20} fill="currentColor" />
            <span className="font-bold text-base">카카오로 간편하게 시작</span>
        </button>
      </div>

      <div className="relative mb-8">
        <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
        </div>
        <div className="relative flex justify-center text-sm">
            <span className="px-3 bg-white text-gray-400 font-medium">또는 직접 입력</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 ml-1">이름</label>
                <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                        <User size={18} />
                    </div>
                    <input 
                        type="text" 
                        value={realName}
                        onChange={(e) => setRealName(e.target.value)}
                        placeholder="실명"
                        className="w-full bg-gray-50 border border-gray-200 rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:border-brand-500 transition-all text-sm"
                    />
                </div>
            </div>
            <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 ml-1">닉네임</label>
                <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                        <Smile size={18} />
                    </div>
                    <input 
                        type="text" 
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value)}
                        placeholder="별명"
                        className="w-full bg-gray-50 border border-gray-200 rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:border-brand-500 transition-all text-sm"
                    />
                </div>
            </div>
        </div>

        <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 ml-1">휴대폰 번호</label>
            <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <Smartphone size={18} />
                </div>
                <input 
                    type="tel" 
                    value={phoneNumber}
                    onChange={handlePhoneChange}
                    placeholder="010-0000-0000"
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:border-brand-500 transition-all text-sm"
                />
            </div>
        </div>

        <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 ml-1">이메일</label>
            <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <Mail size={18} />
                </div>
                <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@email.com"
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:border-brand-500 transition-all text-sm"
                />
            </div>
        </div>

        <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 ml-1">비밀번호</label>
            <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <Lock size={18} />
                </div>
                <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="8자 이상 입력"
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:border-brand-500 transition-all text-sm"
                />
            </div>
        </div>

        <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 ml-1">비밀번호 확인</label>
            <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <Lock size={18} />
                </div>
                <input 
                    type="password" 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="한 번 더 입력"
                    className={`w-full bg-gray-50 border rounded-2xl pl-12 pr-4 py-4 focus:outline-none transition-all text-sm ${
                        confirmPassword && password !== confirmPassword 
                        ? 'border-red-300 focus:border-red-500' 
                        : 'border-gray-200 focus:border-brand-500'
                    }`}
                />
            </div>
        </div>

        <div className="pt-2">
            <label className="block text-xs font-bold text-gray-500 mb-2 ml-1">서비스 설정</label>
            <div 
                onClick={() => setIsBabyMode(!isBabyMode)}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                    isBabyMode 
                    ? 'bg-indigo-50 border-indigo-200 shadow-sm' 
                    : 'bg-white border-gray-100 hover:bg-gray-200'
                }`}
            >
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                        isBabyMode ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-400'
                    }`}>
                        <Baby size={22} />
                    </div>
                    <div>
                        <div className="flex items-center gap-1.5">
                            <span className={`text-sm font-bold ${isBabyMode ? 'text-indigo-900' : 'text-gray-700'}`}>아이 이유식 모드</span>
                            {isBabyMode && <Sparkles size={14} className="text-indigo-500 animate-pulse" />}
                        </div>
                        <p className={`text-[10px] leading-tight mt-0.5 ${isBabyMode ? 'text-indigo-600' : 'text-gray-400'}`}>
                            아이의 성장 단계별 식단과 알러지 체크 기능을 제공합니다.
                        </p>
                    </div>
                </div>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                    isBabyMode ? 'bg-indigo-500 border-indigo-500' : 'bg-white border-gray-300'
                }`}>
                    {isBabyMode && <Check size={14} className="text-white" strokeWidth={4} />}
                </div>
            </div>
        </div>
        
        <div className="pt-4">
            <button 
                type="submit"
                disabled={isLoading}
                className="w-full bg-brand-500 text-white font-bold text-lg py-4 rounded-2xl shadow-lg shadow-brand-500/30 hover:bg-brand-600 transition-all active:scale-[0.98] disabled:opacity-70 flex justify-center items-center"
            >
                {isLoading ? (
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                    '회원가입'
                )}
            </button>
        </div>
      </form>

      <div className="mt-8 text-center">
        <p className="text-gray-500 text-sm">
            이미 계정이 있으신가요?{' '}
            <button 
                onClick={onLoginClick}
                className="text-brand-600 font-bold hover:underline"
            >
                로그인
            </button>
        </p>
      </div>
    </AuthLayout>
  );
};

export default Signup;


import React, { useState, useEffect } from 'react';
import AuthLayout from './AuthLayout';
import { Mail, Lock, ChevronRight, MessageCircle, Check, Eye, EyeOff, ArrowLeft, Smartphone, Search, ShieldCheck, KeyRound } from 'lucide-react';
import { useModal } from './GlobalModal';
import { supabase } from '../lib/supabase';

interface LoginProps {
    onLogin: (user: any) => void;
    onSignupClick: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin, onSignupClick }) => {
    const { showAlert } = useModal();
    const [view, setView] = useState<'login' | 'findId' | 'findPassword'>('login');

    // Login Form States
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [saveId, setSaveId] = useState(false);
    const [keepLogin, setKeepLogin] = useState(true);
    const [isLoading, setIsLoading] = useState(false);

    // Recovery States
    const [recoveryPhone, setRecoveryPhone] = useState('');
    const [recoveryEmail, setRecoveryEmail] = useState('');
    const [foundId, setFoundId] = useState<string | null>(null);

    // Find Password Detailed States
    const [pwStep, setPwStep] = useState<'email' | 'verify' | 'reset'>('email');
    const [verifyPassword, setVerifyPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [passwordHint, setPasswordHint] = useState(''); // 비밀번호 힌트 상태

    // Load saved email on mount
    useEffect(() => {
        const savedEmail = localStorage.getItem('savedEmail');
        if (savedEmail) {
            setEmail(savedEmail);
            setSaveId(true);
        }
    }, []);

    // 앱으로부터 카카오 인증 토큰을 받는 함수 등록
    useEffect(() => {
        // 앱으로부터 카카오 인증 토큰을 받는 함수
        (window as any).handleKakaoLoginSuccess = function (token: string) {
            console.log('앱으로부터 받은 카카오 토큰:', token);
            // TODO: 이 토큰을 백엔드 서버로 보내 최종 로그인을 완료하세요.
            // 예: fetch('/api/auth/kakao', { 
            //   method: 'POST',
            //   headers: { 'Content-Type': 'application/json' },
            //   body: JSON.stringify({ token }) 
            // });
        };

        // 컴포넌트 언마운트 시 정리
        return () => {
            delete (window as any).handleKakaoLoginSuccess;
        };
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim() || !password) {
            showAlert('이메일과 비밀번호를 입력해주세요.');
            return;
        }

        setIsLoading(true);
        const normalizedEmail = email.trim().toLowerCase();

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: normalizedEmail,
                password: password,
            });

            if (error) {
                if (error.message === 'Invalid login credentials') {
                    throw new Error('이메일 또는 비밀번호가 일치하지 않습니다.');
                } else if (error.message.includes('Email not confirmed')) {
                    throw new Error('이메일 인증이 완료되지 않았습니다.');
                }
                throw error;
            }

            if (data?.user) {
                if (saveId) localStorage.setItem('savedEmail', normalizedEmail);
                else localStorage.removeItem('savedEmail');

                const { data: profile } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', data.user.id)
                    .maybeSingle();

                onLogin(profile || {
                    id: data.user.id,
                    email: data.user.email,
                    name: profile?.name || normalizedEmail.split('@')[0]
                });
            }
        } catch (error: any) {
            showAlert(error.message || '로그인 중 오류가 발생했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSocialLogin = async (provider: 'kakao' | 'google') => {
        // React Native WebView 환경인지 확인
        if ((window as any).ReactNativeWebView) {
            // React Native 앱 환경: 앱으로 메시지 전송
            if (provider === 'kakao') {
                (window as any).ReactNativeWebView.postMessage('kakao_login');
            } else if (provider === 'google') {
                (window as any).ReactNativeWebView.postMessage('google_login');
            }
            return;
        }

        // 일반 웹 환경: 기존 OAuth 플로우 사용
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

    const handleFindId = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!recoveryPhone.trim()) {
            showAlert('가입 시 입력한 휴대폰 번호를 입력해주세요.');
            return;
        }

        setIsLoading(true);
        try {
            const cleanPhone = recoveryPhone.replace(/[^0-9]/g, '');
            const formattedPhone = cleanPhone.replace(/^(\d{2,3})(\d{3,4})(\d{4})$/, `$1-$2-$3`);

            const { data, error } = await supabase
                .from('profiles')
                .select('email')
                .eq('phone_number', formattedPhone)
                .maybeSingle();

            if (error) throw error;
            if (data && data.email) {
                setFoundId(data.email);
            } else {
                showAlert('입력하신 번호로 등록된 계정을 찾을 수 없습니다.');
            }
        } catch (err: any) {
            showAlert('조회 중 오류가 발생했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    // --- Find Password Step Handlers ---

    const handleCheckEmailExists = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!recoveryEmail.trim()) {
            showAlert('이메일 주소를 입력해주세요.');
            return;
        }

        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('email')
                .eq('email', recoveryEmail.trim().toLowerCase())
                .maybeSingle();

            if (error) throw error;
            if (!data) {
                showAlert('가입되지 않은 이메일 주소입니다.');
                return;
            }

            // 실제 비밀번호는 DB에서 가져올 수 없으므로(해시화), 
            // 본 예시에서는 흐름을 구현하기 위해 이메일의 앞부분 등을 활용한 힌트 시뮬레이션을 수행합니다.
            // 실제 서비스에서는 '마지막으로 사용한 비밀번호 일부' 등의 메타데이터가 있을 때 노출 가능합니다.
            setPasswordHint(recoveryEmail.split('@')[0] + "pass123");
            setPwStep('verify');
        } catch (err) {
            showAlert('확인 중 오류가 발생했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyCurrentPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!verifyPassword) {
            showAlert('비밀번호를 입력해주세요.');
            return;
        }

        setIsLoading(true);
        try {
            const { error } = await supabase.auth.signInWithPassword({
                email: recoveryEmail.trim().toLowerCase(),
                password: verifyPassword
            });

            if (error) {
                throw new Error('비밀번호가 일치하지 않습니다. 다시 확인해주세요.');
            }

            setPwStep('reset');
        } catch (err: any) {
            showAlert(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword.length < 6) {
            showAlert('비밀번호는 6자 이상이어야 합니다.');
            return;
        }
        if (newPassword !== confirmNewPassword) {
            showAlert('비밀번호가 서로 일치하지 않습니다.');
            return;
        }

        setIsLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (error) throw error;

            showAlert('비밀번호가 성공적으로 변경되었습니다.\n새로운 비밀번호로 로그인해주세요.');
            setView('login');
            setPwStep('email');
            setVerifyPassword('');
            setNewPassword('');
            setConfirmNewPassword('');
        } catch (err: any) {
            showAlert('변경 실패: ' + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/[^0-9]/g, '');
        if (value.length <= 11) {
            setRecoveryPhone(value.replace(/^(\d{2,3})(\d{3,4})(\d{4})$/, `$1-$2-$3`));
        }
    };

    // 마스킹 헬퍼: 뒷 3자리 제외 노출
    const getMaskedHint = (hint: string) => {
        if (!hint) return "";
        if (hint.length <= 3) return "***";
        return hint.slice(0, -3);
    };

    // --- Rendering Sub-Views ---

    if (view === 'findId') {
        return (
            <AuthLayout title="아이디 찾기" subtitle={`가입 시 등록한 휴대폰 번호로\n아이디(이메일)를 찾을 수 있습니다.`}>
                <button onClick={() => { setView('login'); setFoundId(null); }} className="absolute top-8 left-6 p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
                    <ArrowLeft size={24} />
                </button>

                {!foundId ? (
                    <form onSubmit={handleFindId} className="space-y-6">
                        <div className="relative group">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-500 transition-colors">
                                <Smartphone size={20} />
                            </div>
                            <input
                                type="tel"
                                value={recoveryPhone}
                                onChange={handlePhoneChange}
                                placeholder="휴대폰 번호 (010-0000-0000)"
                                className="w-full bg-gray-50 border-2 border-transparent rounded-2xl pl-12 pr-4 py-4 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:bg-white focus:border-brand-500 transition-all font-medium"
                                autoFocus
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-brand-500 text-white font-bold text-lg py-4 rounded-2xl shadow-lg shadow-brand-500/30 hover:bg-brand-600 transition-all active:scale-[0.98] disabled:opacity-70 flex justify-center items-center gap-2"
                        >
                            {isLoading ? <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <span>아이디 찾기</span>}
                        </button>
                    </form>
                ) : (
                    <div className="space-y-8 animate-[scaleIn_0.3s_ease-out]">
                        <div className="bg-brand-50 p-8 rounded-3xl border border-brand-100 text-center">
                            <p className="text-brand-600 text-sm font-bold mb-2">회원님의 아이디를 찾았습니다!</p>
                            <div className="text-xl font-black text-gray-900 tracking-tight break-all">
                                {foundId}
                            </div>
                        </div>
                        <button
                            onClick={() => { setEmail(foundId); setView('login'); setFoundId(null); }}
                            className="w-full bg-brand-500 text-white font-bold text-lg py-4 rounded-2xl shadow-lg hover:bg-brand-600 transition-all flex justify-center items-center gap-2"
                        >
                            <span>이 아이디로 로그인하기</span>
                            <ChevronRight size={20} />
                        </button>
                    </div>
                )}
            </AuthLayout>
        );
    }

    if (view === 'findPassword') {
        const getSubtitle = () => {
            if (pwStep === 'email') return '가입하신 이메일 주소를 입력해주세요.';
            if (pwStep === 'verify') return '비밀번호를 기억하고 계신가요?\n뒷 3자리가 가려진 힌트를 참고하여 입력해 주세요.';
            return '새로운 비밀번호를 설정해 주세요.';
        };

        return (
            <AuthLayout title="비밀번호 찾기" subtitle={getSubtitle()}>
                <button
                    onClick={() => {
                        if (pwStep === 'email') setView('login');
                        else if (pwStep === 'verify') setPwStep('email');
                        else setPwStep('verify');
                    }}
                    className="absolute top-8 left-6 p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
                >
                    <ArrowLeft size={24} />
                </button>

                {pwStep === 'email' && (
                    <form onSubmit={handleCheckEmailExists} className="space-y-6">
                        <div className="relative group">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-500 transition-colors">
                                <Mail size={20} />
                            </div>
                            <input
                                type="email"
                                value={recoveryEmail}
                                onChange={(e) => setRecoveryEmail(e.target.value)}
                                placeholder="가입하신 이메일 주소"
                                className="w-full bg-gray-50 border-2 border-transparent rounded-2xl pl-12 pr-4 py-4 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:bg-white focus:border-brand-500 transition-all font-medium"
                                autoFocus
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-brand-500 text-white font-bold text-lg py-4 rounded-2xl shadow-lg shadow-brand-500/30 hover:bg-brand-600 transition-all active:scale-[0.98] disabled:opacity-70 flex justify-center items-center gap-2"
                        >
                            {isLoading ? <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <span>확인</span>}
                        </button>
                    </form>
                )}

                {pwStep === 'verify' && (
                    <form onSubmit={handleVerifyCurrentPassword} className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
                        <div className="bg-brand-50 p-6 rounded-3xl border border-brand-100 text-center mb-2">
                            <p className="text-brand-600 text-xs font-bold mb-2 uppercase tracking-widest">Password Hint</p>
                            <div className="text-2xl font-black text-gray-800 tracking-[0.1em]">
                                {getMaskedHint(passwordHint)}<span className="text-brand-400">***</span>
                            </div>
                            <p className="text-[11px] text-gray-400 mt-3">본인 확인을 위해 기존 비밀번호를 입력해주세요.</p>
                        </div>

                        <div className="relative group">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-500 transition-colors">
                                <Lock size={20} />
                            </div>
                            <input
                                type="password"
                                value={verifyPassword}
                                onChange={(e) => setVerifyPassword(e.target.value)}
                                placeholder="기존 비밀번호 전체 입력"
                                className="w-full bg-gray-50 border-2 border-transparent rounded-2xl pl-12 pr-4 py-4 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:bg-white focus:border-brand-500 transition-all font-medium"
                                autoFocus
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-gray-900 text-white font-bold text-lg py-4 rounded-2xl shadow-lg hover:bg-black transition-all active:scale-[0.98] flex justify-center items-center gap-2"
                        >
                            {isLoading ? <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <span>비밀번호 검증</span>}
                        </button>
                    </form>
                )}

                {pwStep === 'reset' && (
                    <form onSubmit={handleResetPassword} className="space-y-5 animate-[fadeIn_0.3s_ease-out]">
                        <div className="bg-green-50 p-4 rounded-2xl border border-green-100 flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-green-500 shadow-sm">
                                <ShieldCheck size={20} />
                            </div>
                            <p className="text-green-700 text-sm font-bold">인증이 완료되었습니다.<br />새 비밀번호를 설정하세요.</p>
                        </div>

                        <div className="relative group">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-500 transition-colors">
                                <KeyRound size={20} />
                            </div>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="새 비밀번호 (6자 이상)"
                                className="w-full bg-gray-50 border-2 border-transparent rounded-2xl pl-12 pr-4 py-4 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:bg-white focus:border-brand-500 transition-all font-medium"
                                autoFocus
                            />
                        </div>

                        <div className="relative group">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-500 transition-colors">
                                <Check size={20} />
                            </div>
                            <input
                                type="password"
                                value={confirmNewPassword}
                                onChange={(e) => setConfirmNewPassword(e.target.value)}
                                placeholder="새 비밀번호 확인"
                                className="w-full bg-gray-50 border-2 border-transparent rounded-2xl pl-12 pr-4 py-4 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:bg-white focus:border-brand-500 transition-all font-medium"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-brand-500 text-white font-bold text-lg py-4 rounded-2xl shadow-lg shadow-brand-500/30 hover:bg-brand-600 transition-all active:scale-[0.98] disabled:opacity-70 flex justify-center items-center gap-2"
                        >
                            {isLoading ? <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <span>비밀번호 재설정 완료</span>}
                        </button>
                    </form>
                )}
            </AuthLayout>
        );
    }

    // --- Main Login View ---

    return (
        <AuthLayout
            title="다시 만나서 반가워요!"
            subtitle={`한끼와 함께 건강한 식단 관리를\n시작해보세요.`}
        >
            <div className="space-y-3 mb-8">
                <button
                    onClick={() => handleSocialLogin('kakao')}
                    className="w-full flex items-center justify-center gap-2.5 py-4 bg-[#FEE500] text-[#3C1E1E] rounded-2xl hover:bg-[#FDD835] transition-colors active:scale-[0.98] shadow-sm relative overflow-hidden group"
                >
                    <MessageCircle size={22} fill="currentColor" className="relative z-10" />
                    <span className="font-bold text-[15px] relative z-10">카카오로 3초 만에 시작하기</span>
                </button>

                <button
                    onClick={() => handleSocialLogin('google')}
                    className="w-full flex items-center justify-center gap-2 py-4 bg-white border border-gray-200 rounded-2xl hover:bg-gray-50 transition-colors text-gray-700 font-bold text-[15px] shadow-sm active:scale-[0.98]"
                >
                    <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="G" className="w-5 h-5" />
                    <span>Google로 계속하기</span>
                </button>
            </div>

            <div className="relative mb-8">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-100"></div>
                </div>
                <div className="relative flex justify-center text-[11px] text-gray-300 uppercase tracking-widest">
                    <span className="px-3 bg-white/50 backdrop-blur-sm font-black">또는</span>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-4">
                    <div className="relative group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-500 transition-colors">
                            <Mail size={20} />
                        </div>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="이메일 주소"
                            className="w-full bg-gray-50 border-2 border-transparent rounded-2xl pl-12 pr-4 py-4 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:bg-white focus:border-brand-500 focus:shadow-[0_0_0_4px_rgba(249,115,22,0.1)] transition-all font-medium"
                        />
                    </div>

                    <div className="relative group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-500 transition-colors">
                            <Lock size={20} />
                        </div>
                        <input
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="비밀번호"
                            className="w-full bg-gray-50 border-2 border-transparent rounded-2xl pl-12 pr-12 py-4 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:bg-white focus:border-brand-500 focus:shadow-[0_0_0_4px_rgba(249,115,22,0.1)] transition-all font-medium"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    </div>
                </div>

                <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setSaveId(!saveId)}
                                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${saveId ? 'bg-brand-500 border-brand-500' : 'border-gray-200'}`}
                            >
                                {saveId && <Check size={14} className="text-white" strokeWidth={4} />}
                            </button>
                            <span className="text-sm text-gray-500 font-medium cursor-pointer" onClick={() => setSaveId(!saveId)}>아이디 저장</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setKeepLogin(!keepLogin)}
                                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${keepLogin ? 'bg-brand-500 border-brand-500' : 'border-gray-200'}`}
                            >
                                {keepLogin && <Check size={14} className="text-white" strokeWidth={4} />}
                            </button>
                            <span className="text-sm text-gray-500 font-medium cursor-pointer" onClick={() => setKeepLogin(!keepLogin)}>상태 유지</span>
                        </div>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-brand-500 text-white font-bold text-lg py-4 rounded-2xl shadow-lg shadow-brand-500/30 hover:bg-brand-600 transition-all active:scale-[0.98] disabled:opacity-70 flex justify-center items-center gap-2"
                >
                    {isLoading ? (
                        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                        <>
                            <span>로그인</span>
                            <ChevronRight size={20} />
                        </>
                    )}
                </button>
            </form>

            <div className="mt-8">
                <div className="flex justify-center items-center gap-3">
                    <button
                        type="button"
                        onClick={() => setView('findId')}
                        className="text-sm text-gray-400 hover:text-brand-500 font-medium transition-colors"
                    >
                        아이디 찾기
                    </button>
                    <span className="text-[10px] text-gray-200">|</span>
                    <button
                        type="button"
                        onClick={() => { setView('findPassword'); setPwStep('email'); }}
                        className="text-sm text-gray-400 hover:text-brand-500 font-medium transition-colors"
                    >
                        비밀번호 찾기
                    </button>
                </div>
            </div>

            <div className="mt-6 space-y-4">
                <p className="text-center text-gray-500 text-sm">
                    아직 계정이 없으신가요?{' '}
                    <button
                        onClick={onSignupClick}
                        className="text-brand-600 font-bold hover:underline"
                    >
                        회원가입
                    </button>
                </p>
            </div>
        </AuthLayout>
    );
};

export default Login;

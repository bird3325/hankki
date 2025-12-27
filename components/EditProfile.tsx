
import React, { useState, useRef } from 'react';
import { ArrowLeft, Camera, Mail, Smartphone, Smile, Lock, Check, User } from 'lucide-react';
import { UserProfile } from '../types';
import { useModal } from './GlobalModal';
import { supabase } from '../lib/supabase';

interface EditProfileProps {
  user: UserProfile;
  onSave: (updatedUser: UserProfile) => void;
  onClose: () => void;
  email?: string; 
}

const EditProfile: React.FC<EditProfileProps> = ({ user, onSave, onClose, email }) => {
  const { showAlert } = useModal();
  const [name, setName] = useState(user.name); // 닉네임
  const [fullName, setFullName] = useState(user.fullName || ''); // 실명 추가
  const [phoneNumber, setPhoneNumber] = useState(user.phoneNumber || '');
  const [avatar, setAvatar] = useState(user.avatar);
  
  // Password Change State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    if (value.length <= 11) {
        setPhoneNumber(value.replace(/^(\d{2,3})(\d{3,4})(\d{4})$/, `$1-$2-$3`));
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
        showAlert('닉네임을 입력해주세요.');
        return;
    }
    if (!fullName.trim()) {
        showAlert('실명(이름)을 입력해주세요.');
        return;
    }

    if (newPassword) {
        if (newPassword !== confirmPassword) {
            showAlert('비밀번호가 일치하지 않습니다.');
            return;
        }
        if (newPassword.length < 6) {
            showAlert('비밀번호는 6자 이상이어야 합니다.');
            return;
        }

        try {
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) throw error;
            setNewPassword('');
            setConfirmPassword('');
        } catch (e: any) {
            showAlert('비밀번호 변경 실패: ' + e.message);
            return;
        }
    }

    onSave({
        ...user,
        name,
        fullName,
        phoneNumber,
        avatar
    });
  };

  return (
    <div className="fixed inset-0 bg-white z-[60] overflow-y-auto flex flex-col animate-[slideInRight_0.3s_ease-out]">
      {/* Header */}
      <div className="sticky top-0 bg-white z-10 px-4 py-3 flex items-center justify-between border-b border-gray-100">
        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft size={24} className="text-gray-700" />
        </button>
        <h1 className="text-lg font-bold text-gray-800">회원정보 수정</h1>
        <button 
            onClick={handleSave}
            className="text-brand-600 font-bold text-sm px-3 py-1.5 hover:bg-brand-50 rounded-lg transition-colors"
        >
            저장
        </button>
      </div>

      <div className="p-6 space-y-8">
        {/* Avatar Section */}
        <div className="flex flex-col items-center py-4">
            <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
                <div className="w-28 h-28 rounded-full bg-gray-100 overflow-hidden border-4 border-white shadow-lg group-hover:opacity-90 transition-all">
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
            <p className="text-xs text-gray-400 mt-3">프로필 사진 변경</p>
        </div>

        {/* Inputs Section */}
        <div className="space-y-6">
            {/* Real Name Field Added */}
            <div className="space-y-1">
                <label className="text-sm font-bold text-gray-700 ml-1">이름 (실명)</label>
                <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                        <User size={20} />
                    </div>
                    <input 
                        type="text" 
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="이름"
                        className="w-full bg-gray-50 border border-gray-200 rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
                    />
                </div>
            </div>

            <div className="space-y-1">
                <label className="text-sm font-bold text-gray-700 ml-1">닉네임</label>
                <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                        <Smile size={20} />
                    </div>
                    <input 
                        type="text" 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="별명"
                        className="w-full bg-gray-50 border border-gray-200 rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
                    />
                </div>
            </div>

            <div className="space-y-1">
                <label className="text-sm font-bold text-gray-700 ml-1">휴대폰 번호</label>
                <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                        <Smartphone size={20} />
                    </div>
                    <input 
                        type="tel" 
                        value={phoneNumber}
                        onChange={handlePhoneChange}
                        placeholder="010-0000-0000"
                        className="w-full bg-gray-50 border border-gray-200 rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
                    />
                </div>
            </div>

            <div className="space-y-1">
                <label className="text-sm font-bold text-gray-700 ml-1">이메일 계정</label>
                <div className="relative opacity-70">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                        <Mail size={20} />
                    </div>
                    <input 
                        type="email" 
                        value={email || 'email@example.com'}
                        disabled
                        className="w-full bg-gray-100 border border-gray-200 rounded-2xl pl-12 pr-4 py-4 text-gray-500 cursor-not-allowed"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                        <Lock size={16} />
                    </div>
                </div>
                <p className="text-[10px] text-gray-400 ml-2 pt-1">* 이메일 주소는 변경할 수 없습니다.</p>
            </div>
            
            <div className="pt-4 border-t border-gray-50">
                <h3 className="text-sm font-bold text-gray-400 mb-4 px-1">비밀번호 변경 (선택)</h3>
                <div className="space-y-6">
                    <div className="space-y-1">
                        <label className="text-sm font-bold text-gray-700 ml-1">새 비밀번호</label>
                        <div className="relative">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                                <Lock size={20} />
                            </div>
                            <input 
                                type="password" 
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="변경할 비밀번호 (6자 이상)"
                                className="w-full bg-gray-50 border border-gray-200 rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
                            />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-sm font-bold text-gray-700 ml-1">비밀번호 확인</label>
                        <div className="relative">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                                <Check size={20} />
                            </div>
                            <input 
                                type="password" 
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="비밀번호 재입력"
                                className={`w-full bg-gray-50 border rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:ring-1 transition-all ${
                                    confirmPassword && newPassword !== confirmPassword 
                                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                                    : 'border-gray-200 focus:border-brand-500 focus:ring-brand-500'
                                }`}
                            />
                        </div>
                        {confirmPassword && newPassword !== confirmPassword && (
                            <p className="text-xs text-red-500 ml-1">비밀번호가 일치하지 않습니다.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default EditProfile;

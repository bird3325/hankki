
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ArrowLeft, Camera, X, Plus, Check, Calendar as CalendarIcon, ChevronDown } from 'lucide-react';
import { useModal } from './GlobalModal';

interface BabyProfileData {
  name: string;
  birthDate: string; // YYYY-MM-DD
  allergies: string[];
  avatar?: string;
  id?: string;
}

interface BabyProfileEditorProps {
  initialData: BabyProfileData;
  onSave: (data: BabyProfileData) => void | Promise<void>;
  onClose: () => void;
}

const COMMON_ALLERGENS = ['계란', '우유', '땅콩', '대두', '밀', '새우', '게', '복숭아', '토마토'];

const BabyProfileEditor: React.FC<BabyProfileEditorProps> = ({ initialData, onSave, onClose }) => {
  const { showAlert } = useModal();
  const [name, setName] = useState(initialData.name);
  const [birthDate, setBirthDate] = useState(initialData.birthDate);
  const [allergies, setAllergies] = useState<string[]>(initialData.allergies);
  const [avatar, setAvatar] = useState<string | undefined>(initialData.avatar);
  const [customAllergy, setCustomAllergy] = useState('');
  const [months, setMonths] = useState(0);
  
  // Date Picker Modal State
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [tempYear, setTempYear] = useState(new Date().getFullYear());
  const [tempMonth, setTempMonth] = useState(new Date().getMonth() + 1);
  const [tempDay, setTempDay] = useState(new Date().getDate());

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (birthDate) {
      const birth = new Date(birthDate);
      const now = new Date();
      let diff = (now.getFullYear() - birth.getFullYear()) * 12;
      diff -= birth.getMonth();
      diff += now.getMonth();
      setMonths(diff <= 0 ? 0 : diff);

      // Initialize Temp Date for picker
      setTempYear(birth.getFullYear());
      setTempMonth(birth.getMonth() + 1);
      setTempDay(birth.getDate());
    } else {
        const today = new Date();
        setTempYear(today.getFullYear());
        setTempMonth(today.getMonth() + 1);
        setTempDay(today.getDate());
    }
  }, [birthDate]);

  const handleSave = async () => {
    if (!name.trim()) {
      await showAlert('아이 이름을 입력해주세요.');
      return;
    }
    if (!birthDate) {
        await showAlert('생년월일을 입력해주세요.');
        return;
    }
    onSave({ ...initialData, name, birthDate, allergies, avatar });
  };

  const toggleAllergy = (allergen: string) => {
    if (allergies.includes(allergen)) {
      setAllergies(allergies.filter(a => a !== allergen));
    } else {
      setAllergies([...allergies, allergen]);
    }
  };

  const addCustomAllergy = () => {
    if (customAllergy.trim() && !allergies.includes(customAllergy.trim())) {
      setAllergies([...allergies, customAllergy.trim()]);
      setCustomAllergy('');
    }
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

  // --- Date Picker Logic ---
  const years = useMemo(() => {
      const currentYear = new Date().getFullYear();
      const items = [];
      for (let i = currentYear; i >= currentYear - 10; i--) items.push(i);
      return items;
  }, []);

  const monthsList = Array.from({ length: 12 }, (_, i) => i + 1);
  
  const daysInMonth = useMemo(() => {
      return new Date(tempYear, tempMonth, 0).getDate();
  }, [tempYear, tempMonth]);

  const daysList = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const handleConfirmDate = () => {
      const formattedDate = `${tempYear}-${String(tempMonth).padStart(2, '0')}-${String(tempDay).padStart(2, '0')}`;
      setBirthDate(formattedDate);
      setIsDatePickerOpen(false);
  };

  return (
    <div className="fixed inset-0 bg-white z-[70] overflow-y-auto flex flex-col animate-[slideUp_0.3s_ease-out]">
      {/* Header */}
      <div className="sticky top-0 bg-white z-10 px-4 py-3 flex items-center justify-between border-b border-gray-100">
        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft size={24} className="text-gray-700" />
        </button>
        <h1 className="text-lg font-bold text-gray-800">아기 프로필</h1>
        <button onClick={handleSave} className="text-indigo-600 font-bold text-sm px-4 py-2 hover:bg-indigo-50 rounded-full transition-colors">
            저장
        </button>
      </div>

      <div className="p-6 space-y-8">
        {/* Avatar */}
        <div className="flex flex-col items-center">
            <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
                <div className="w-28 h-28 rounded-full bg-indigo-50 overflow-hidden border-4 border-white shadow-xl flex items-center justify-center text-4xl">
                    {avatar ? (
                        <img src={avatar} alt="Baby" className="w-full h-full object-cover" />
                    ) : (
                        "👶"
                    )}
                </div>
                <button className="absolute bottom-0 right-0 bg-indigo-600 text-white p-2.5 rounded-full border-4 border-white shadow-md hover:bg-indigo-700 transition-colors">
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
            <p className="text-xs text-gray-400 mt-4 font-medium tracking-wide">프로필 사진</p>
        </div>

        {/* Basic Info */}
        <div className="space-y-6">
            <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 ml-1">아이 이름 / 태명</label>
                <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-[20px] px-5 py-4 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium"
                    placeholder="예: 우리 우주"
                />
            </div>

            <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 ml-1">생년월일</label>
                <button 
                    onClick={() => setIsDatePickerOpen(true)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-[20px] px-5 py-4 flex items-center justify-between hover:bg-gray-100 transition-all group"
                >
                    <div className="flex items-center gap-3">
                        <CalendarIcon size={20} className="text-indigo-400 group-hover:text-indigo-500 transition-colors" />
                        <span className={`font-bold ${birthDate ? 'text-gray-900' : 'text-gray-400'}`}>
                            {birthDate ? (
                                `${tempYear}년 ${tempMonth}월 ${tempDay}일`
                            ) : "날짜를 선택해 주세요"}
                        </span>
                    </div>
                    {birthDate && (
                        <span className="bg-indigo-500 text-white text-[11px] font-black px-3 py-1 rounded-full shadow-sm">
                            {months}개월
                        </span>
                    )}
                </button>
            </div>
        </div>

        {/* Allergies */}
        <div className="space-y-4 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-gray-700">알레르기 주의 식품</label>
                <span className="text-[11px] text-gray-400 font-bold uppercase tracking-widest">Safety Check</span>
            </div>
            
            {/* Common Allergens Chips */}
            <div className="flex flex-wrap gap-2">
                {COMMON_ALLERGENS.map(allergen => (
                    <button
                        key={allergen}
                        onClick={() => toggleAllergy(allergen)}
                        className={`px-4 py-2 rounded-2xl text-sm font-bold transition-all border ${
                            allergies.includes(allergen)
                            ? 'bg-red-500 border-red-500 text-white shadow-md shadow-red-100'
                            : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                        }`}
                    >
                        {allergen}
                    </button>
                ))}
            </div>

            {/* Custom Input */}
            <div className="bg-gray-50 p-5 rounded-[24px] space-y-4 border border-gray-100">
                <div className="flex flex-wrap gap-2">
                    {allergies.length === 0 && (
                        <span className="text-sm text-gray-400 font-medium italic">등록된 정보가 없습니다.</span>
                    )}
                    {allergies.map(allergen => (
                        <span key={allergen} className="inline-flex items-center gap-1.5 bg-white border border-red-100 text-red-500 px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm">
                            {allergen}
                            <button onClick={() => toggleAllergy(allergen)} className="hover:bg-red-50 rounded-full p-0.5 transition-colors">
                                <X size={12} strokeWidth={3} />
                            </button>
                        </span>
                    ))}
                </div>
                
                <div className="flex gap-2">
                    <input 
                        type="text"
                        value={customAllergy}
                        onChange={(e) => setCustomAllergy(e.target.value)}
                        placeholder="기타 알레르기 직접 입력"
                        className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 font-medium"
                        onKeyPress={(e) => e.key === 'Enter' && addCustomAllergy()}
                    />
                    <button 
                        onClick={addCustomAllergy}
                        className="bg-gray-200 text-gray-600 p-2.5 rounded-xl hover:bg-gray-300 transition-colors"
                    >
                        <Plus size={20} strokeWidth={3} />
                    </button>
                </div>
            </div>
        </div>

        <div className="bg-indigo-50 p-5 rounded-[24px] border border-indigo-100/50 flex gap-4">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center flex-shrink-0 shadow-sm">
                <span className="text-lg">💡</span>
            </div>
            <div>
                <h4 className="font-bold text-indigo-900 text-sm mb-1">안전한 이유식 기록</h4>
                <p className="text-xs text-indigo-700/80 leading-relaxed font-medium">
                    등록된 알레르기 식품은 식단 분석 시 AI가 자동으로 체크하여 알려드립니다. 아이의 건강을 위해 꼼꼼히 기록해 주세요.
                </p>
            </div>
        </div>
      </div>

      {/* --- Custom Date Picker Modal --- */}
      {isDatePickerOpen && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm transition-all duration-300 animate-[fadeIn_0.2s_ease-out]">
              <div className="bg-white w-full max-w-md rounded-t-[40px] p-8 pb-10 space-y-8 animate-[slideUp_0.3s_cubic-bezier(0.16,1,0.3,1)] shadow-2xl">
                  {/* Modal Header */}
                  <div className="flex items-center justify-between">
                      <div>
                          <h3 className="text-2xl font-black text-gray-900 leading-none mb-1">생일 선택</h3>
                          <p className="text-sm text-gray-400 font-bold">아이의 생년월일을 선택해 주세요</p>
                      </div>
                      <button 
                        onClick={() => setIsDatePickerOpen(false)}
                        className="p-3 bg-gray-50 rounded-full text-gray-400 hover:text-gray-900 transition-colors"
                      >
                          <X size={20} />
                      </button>
                  </div>

                  {/* Selected Preview Area */}
                  <div className="bg-indigo-50 p-6 rounded-[32px] border border-indigo-100 text-center">
                        <p className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-1">Current Selection</p>
                        <div className="text-3xl font-black text-indigo-600 tracking-tight">
                            {tempYear}년 {tempMonth}월 {tempDay}일
                        </div>
                  </div>

                  {/* Wheel Picker Container */}
                  <div className="grid grid-cols-3 gap-4 h-48 overflow-hidden relative">
                      {/* Highlight Overlay */}
                      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-12 bg-gray-50 rounded-2xl -z-10 pointer-events-none border border-gray-100"></div>
                      
                      {/* Year Picker */}
                      <div className="overflow-y-auto no-scrollbar snap-y snap-mandatory text-center">
                          <div className="h-20" /> {/* Top Spacer */}
                          {years.map(y => (
                              <button 
                                key={y} 
                                onClick={() => setTempYear(y)}
                                className={`h-12 w-full snap-center flex items-center justify-center text-lg font-black transition-all ${tempYear === y ? 'text-indigo-600 scale-110' : 'text-gray-300 opacity-50'}`}
                              >
                                  {y}
                              </button>
                          ))}
                          <div className="h-20" /> {/* Bottom Spacer */}
                      </div>

                      {/* Month Picker */}
                      <div className="overflow-y-auto no-scrollbar snap-y snap-mandatory text-center">
                          <div className="h-20" />
                          {monthsList.map(m => (
                              <button 
                                key={m} 
                                onClick={() => setTempMonth(m)}
                                className={`h-12 w-full snap-center flex items-center justify-center text-lg font-black transition-all ${tempMonth === m ? 'text-indigo-600 scale-110' : 'text-gray-300 opacity-50'}`}
                              >
                                  {m}월
                              </button>
                          ))}
                          <div className="h-20" />
                      </div>

                      {/* Day Picker */}
                      <div className="overflow-y-auto no-scrollbar snap-y snap-mandatory text-center">
                          <div className="h-20" />
                          {daysList.map(d => (
                              <button 
                                key={d} 
                                onClick={() => setTempDay(d)}
                                className={`h-12 w-full snap-center flex items-center justify-center text-lg font-black transition-all ${tempDay === d ? 'text-indigo-600 scale-110' : 'text-gray-300 opacity-50'}`}
                              >
                                  {d}일
                              </button>
                          ))}
                          <div className="h-20" />
                      </div>
                  </div>

                  {/* Confirm Button */}
                  <button 
                    onClick={handleConfirmDate}
                    className="w-full bg-indigo-500 hover:bg-indigo-600 text-white py-5 rounded-[24px] font-black text-lg shadow-lg shadow-indigo-100 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                      <Check size={22} strokeWidth={3} />
                      이 날짜로 설정
                  </button>
              </div>
          </div>
      )}
    </div>
  );
};

export default BabyProfileEditor;

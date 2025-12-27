import React, { useState, useEffect } from 'react';
import { X, Check, ChevronDown } from 'lucide-react';

interface TimePickerProps {
  initialTime: string;
  onClose: () => void;
  onSave: (time: string) => void;
}

const TimePicker: React.FC<TimePickerProps> = ({ initialTime, onClose, onSave }) => {
  // 24h string to state
  const [initialH, initialM] = initialTime.split(':').map(Number);
  
  const [period, setPeriod] = useState<'AM' | 'PM'>(initialH >= 12 ? 'PM' : 'AM');
  const [hour, setHour] = useState<number>(initialH % 12 || 12);
  const [minute, setMinute] = useState<number>(initialM);
  const [activeTab, setActiveTab] = useState<'hour' | 'minute'>('hour');

  const handleSave = () => {
    let h24 = hour;
    if (period === 'PM' && h24 !== 12) h24 += 12;
    if (period === 'AM' && h24 === 12) h24 = 0;
    const timeStr = `${h24.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    onSave(timeStr);
  };

  const handleHourSelect = (h: number) => {
    setHour(h);
    setActiveTab('minute'); // Auto-switch to minute for UX flow
  };

  const handleMinuteSelect = (m: number) => {
    setMinute(m);
  };

  // Generate grids
  const hours = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const minutes = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-[fadeIn_0.2s_ease-out]">
      <div className="bg-white rounded-[32px] w-full max-w-[340px] shadow-2xl overflow-hidden animate-[scaleIn_0.2s_ease-out]">
        
        {/* Header Title */}
        <div className="px-6 pt-6 flex justify-between items-center">
            <h3 className="text-lg font-bold text-gray-800">시간 설정</h3>
            <button onClick={onClose} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-500 transition-colors">
                <X size={18} />
            </button>
        </div>

        {/* Digital Display Area */}
        <div className="px-6 py-6 flex flex-col items-center">
            <div className="flex items-end gap-2 mb-6">
                {/* AM/PM Toggle */}
                <div className="flex flex-col bg-gray-100 p-1 rounded-xl mr-2">
                    <button 
                        onClick={() => setPeriod('AM')}
                        className={`px-3 py-2 text-xs font-bold rounded-lg transition-all ${period === 'AM' ? 'bg-white text-brand-600 shadow-sm' : 'text-gray-400'}`}
                    >
                        AM
                    </button>
                    <button 
                        onClick={() => setPeriod('PM')}
                        className={`px-3 py-2 text-xs font-bold rounded-lg transition-all ${period === 'PM' ? 'bg-white text-brand-600 shadow-sm' : 'text-gray-400'}`}
                    >
                        PM
                    </button>
                </div>

                {/* Time Display */}
                <div className="flex items-center gap-1">
                    <button 
                        onClick={() => setActiveTab('hour')}
                        className={`text-6xl font-black tracking-tight leading-none transition-colors ${activeTab === 'hour' ? 'text-brand-500' : 'text-gray-300'}`}
                    >
                        {hour.toString().padStart(2, '0')}
                    </button>
                    <span className="text-6xl font-black text-gray-200 leading-none pb-2">:</span>
                    <button 
                        onClick={() => setActiveTab('minute')}
                        className={`text-6xl font-black tracking-tight leading-none transition-colors ${activeTab === 'minute' ? 'text-brand-500' : 'text-gray-300'}`}
                    >
                        {minute.toString().padStart(2, '0')}
                    </button>
                </div>
            </div>

            {/* Selection Grid */}
            <div className="w-full bg-gray-50 rounded-2xl p-4">
                <div className="text-xs font-bold text-gray-400 mb-3 text-center">
                    {activeTab === 'hour' ? '시간을 선택하세요' : '분을 선택하세요'}
                </div>
                
                <div className="grid grid-cols-4 gap-3">
                    {activeTab === 'hour' ? (
                        hours.map(h => (
                            <button
                                key={h}
                                onClick={() => handleHourSelect(h)}
                                className={`h-12 rounded-xl text-lg font-bold transition-all active:scale-95 ${
                                    hour === h 
                                    ? 'bg-brand-500 text-white shadow-lg shadow-brand-200' 
                                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-100'
                                }`}
                            >
                                {h}
                            </button>
                        ))
                    ) : (
                        minutes.map(m => (
                            <button
                                key={m}
                                onClick={() => handleMinuteSelect(m)}
                                className={`h-12 rounded-xl text-lg font-bold transition-all active:scale-95 ${
                                    minute === m 
                                    ? 'bg-brand-500 text-white shadow-lg shadow-brand-200' 
                                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-100'
                                }`}
                            >
                                {m.toString().padStart(2, '0')}
                            </button>
                        ))
                    )}
                </div>
            </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-2">
            <button 
                onClick={handleSave}
                className="w-full bg-brand-500 hover:bg-brand-600 text-white text-lg font-bold py-4 rounded-2xl shadow-lg shadow-brand-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
                <Check size={20} strokeWidth={3} />
                완료
            </button>
        </div>

      </div>
    </div>
  );
};

export default TimePicker;
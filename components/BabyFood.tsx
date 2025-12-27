import React, { useState } from 'react';
import { Baby, Plus, Smile, Frown, Meh, AlertCircle } from 'lucide-react';
import { BabyLog } from '../types';

const BabyFood: React.FC = () => {
  const [logs, setLogs] = useState<BabyLog[]>([
    {
      id: '1',
      timestamp: Date.now() - 3600000 * 4,
      menuName: '소고기 미음',
      amount: 80,
      reaction: 'good',
      ingredients: ['쌀', '소고기'],
    },
    {
      id: '2',
      timestamp: Date.now() - 3600000 * 28,
      menuName: '브로콜리 퓨레',
      amount: 40,
      reaction: 'bad',
      ingredients: ['브로콜리'],
    }
  ]);

  const getReactionIcon = (reaction: string) => {
    switch (reaction) {
      case 'good': return <Smile className="w-5 h-5 text-green-500" />;
      case 'bad': return <Frown className="w-5 h-5 text-red-500" />;
      default: return <Meh className="w-5 h-5 text-yellow-500" />;
    }
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Baby Profile Card */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-3xl shadow-sm border border-blue-100">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-3xl shadow-sm border-2 border-white">
            👶
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">우주 (8개월)</h2>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs rounded-full flex items-center gap-1 font-medium">
                <AlertCircle size={10} /> 계란 알러지 주의
              </span>
              <span className="px-2 py-0.5 bg-white text-gray-600 text-xs rounded-full border border-gray-200">
                중기 이유식
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Add Button */}
      <button className="w-full bg-indigo-500 hover:bg-indigo-600 text-white p-4 rounded-xl flex items-center justify-center gap-2 font-semibold shadow-lg shadow-indigo-200 transition-all">
        <Plus size={20} />
        이유식 기록하기
      </button>

      {/* Recent Logs */}
      <div>
        <h3 className="text-lg font-bold text-gray-800 mb-4 px-1">최근 기록</h3>
        <div className="space-y-3">
          {logs.map(log => (
            <div key={log.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-xl">
                    🥣
                </div>
                <div>
                  <h4 className="font-bold text-gray-800">{log.menuName}</h4>
                  <div className="text-xs text-gray-500 mt-1 flex gap-2">
                    <span>{new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    <span>•</span>
                    <span>{log.amount}ml</span>
                  </div>
                  <div className="text-xs text-indigo-400 mt-1">
                    {log.ingredients.join(', ')}
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-center gap-1">
                {getReactionIcon(log.reaction)}
                <span className="text-[10px] text-gray-400 capitalize">{log.reaction}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      
       {/* Recommendation / Commerce Teaser */}
       <div className="bg-amber-50 p-5 rounded-2xl border border-amber-100 mt-6">
        <h4 className="font-bold text-amber-800 mb-2">우주를 위한 추천 🥕</h4>
        <p className="text-sm text-amber-700 mb-3">
            알러지 걱정 없는 <strong>유기농 당근 퓨레</strong> 특가!
        </p>
        <button className="text-xs bg-amber-200 text-amber-800 px-3 py-1.5 rounded-lg font-bold hover:bg-amber-300 transition-colors">
            제품 보러가기
        </button>
       </div>
    </div>
  );
};

export default BabyFood;

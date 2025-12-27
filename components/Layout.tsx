
import React from 'react';
import { Home, PieChart, Users, Calendar, Camera, Plus, RefreshCw } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onCameraClick: () => void;
  onProfileClick: () => void;
  profileImage?: string;
  isRefreshing?: boolean;
}

const Layout: React.FC<LayoutProps> = ({ 
  children, 
  activeTab, 
  onTabChange, 
  onCameraClick, 
  onProfileClick,
  profileImage,
  isRefreshing
}) => {
  const tabs = [
    { id: 'dashboard', icon: Home, label: '투데이' },
    { id: 'stats', icon: PieChart, label: '분석' },
    { id: 'camera', icon: Plus, label: '기록', isAction: true },
    { id: 'social', icon: Users, label: '함께' },
    { id: 'diary', icon: Calendar, label: '다이어리' },
  ];

  // 클릭 시 브라우저 기본 포커스 효과(검은 박스) 방지 로직
  const handlePreventFocus = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  return (
    <div className="min-h-screen bg-gray-50 max-w-md mx-auto relative shadow-2xl overflow-hidden flex flex-col font-sans">
      {/* Header - Glassmorphism */}
      <header className="fixed top-0 w-full max-w-md z-30 px-6 py-4 flex items-center justify-between transition-all duration-300 bg-white/80 backdrop-blur-md border-b border-gray-100/50">
        <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-tr from-brand-500 to-brand-400 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-glow">H</div>
            <h1 className="text-xl font-extrabold text-gray-800 tracking-tight">한끼</h1>
        </div>
        <button 
          onClick={onProfileClick}
          onMouseDown={handlePreventFocus}
          disabled={isRefreshing}
          className={`w-9 h-9 rounded-full bg-gray-100 overflow-hidden border-2 border-white shadow-sm transition-all active:scale-105 focus:outline-none ring-2 ring-transparent focus:ring-brand-200 ${isRefreshing ? 'opacity-80' : 'hover:scale-105'}`}
        >
           {isRefreshing ? (
             <div className="w-full h-full flex items-center justify-center bg-white/50">
               <RefreshCw size={16} className="text-brand-500 animate-spin" />
             </div>
           ) : (
             <img src={profileImage || "https://picsum.photos/100/100"} alt="Profile" className="w-full h-full object-cover" />
           )}
        </button>
      </header>

      {/* Main Content - Added padding top for fixed header */}
      <main className="flex-1 overflow-y-auto p-5 pt-20 pb-24 no-scrollbar">
        {children}
      </main>

      {/* Bottom Navigation - Floating Glass */}
      <nav className="fixed bottom-0 w-full max-w-md z-30 bg-white/90 backdrop-blur-lg border-t border-gray-100 px-6 pb-safe pt-2 flex justify-between items-end shadow-[0_-5px_20px_rgba(0,0,0,0.03)]">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          if (tab.isAction) {
            return (
              <div key={tab.id} className="relative -top-6">
                <button
                  onClick={onCameraClick}
                  onMouseDown={handlePreventFocus}
                  className="bg-gradient-to-tr from-brand-500 to-brand-400 text-white p-4 rounded-full shadow-glow hover:shadow-lg hover:scale-105 transition-all duration-300 active:scale-95 focus:outline-none flex items-center justify-center"
                >
                  <Camera size={26} strokeWidth={2.5} />
                </button>
              </div>
            );
          }

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              onMouseDown={handlePreventFocus}
              className={`flex flex-col items-center gap-1.5 p-2 min-w-[60px] transition-all duration-200 focus:outline-none group mb-1`}
            >
              <div className={`transition-all duration-200 ${isActive ? '-translate-y-1' : ''}`}>
                <Icon 
                    size={24} 
                    strokeWidth={isActive ? 2.5 : 2} 
                    className={`transition-colors duration-200 ${isActive ? 'text-brand-600 fill-brand-100/20' : 'text-gray-400 group-hover:text-gray-600'}`} 
                />
              </div>
              <span className={`text-[10px] font-bold transition-colors duration-200 ${
                isActive ? 'text-brand-600' : 'text-gray-400'
              }`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default Layout;

import React from 'react';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ children, title, subtitle }) => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50/50 to-white flex flex-col px-6 py-10 animate-[fadeIn_0.5s_ease-out]">
      <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-tr from-brand-500 to-brand-400 rounded-3xl mb-6 shadow-glow transform rotate-3">
            <span className="text-4xl font-black text-white">H</span>
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 mb-3 tracking-tight">{title}</h1>
          {subtitle && <p className="text-gray-500 text-sm whitespace-pre-line leading-relaxed">{subtitle}</p>}
        </div>
        {children}
      </div>
      <div className="text-center py-6">
        <p className="text-[10px] text-gray-300 font-medium tracking-wide uppercase">© 2025 Hankki. All rights reserved.</p>
      </div>
    </div>
  );
};

export default AuthLayout;
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface ModalOptions {
  title?: string;
  message: string;
  type?: 'alert' | 'confirm' | 'prompt';
  confirmText?: string;
  cancelText?: string;
  placeholder?: string;
  defaultValue?: string;
}

interface ModalContextType {
  showAlert: (message: string, options?: Omit<ModalOptions, 'message' | 'type'>) => Promise<void>;
  showConfirm: (message: string, options?: Omit<ModalOptions, 'message' | 'type'>) => Promise<boolean>;
  showPrompt: (message: string, options?: Omit<ModalOptions, 'message' | 'type'>) => Promise<string | null>;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a GlobalModalProvider');
  }
  return context;
};

export const GlobalModalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ModalOptions | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [resolvePromise, setResolvePromise] = useState<(value: any) => void>(() => {});

  const openModal = useCallback((opts: ModalOptions): Promise<any> => {
    setOptions(opts);
    setInputValue(opts.defaultValue || '');
    setIsOpen(true);
    return new Promise((resolve) => {
      setResolvePromise(() => resolve);
    });
  }, []);

  const showAlert = useCallback((message: string, opts?: Omit<ModalOptions, 'message' | 'type'>) => {
    return openModal({ message, type: 'alert', ...opts });
  }, [openModal]);

  const showConfirm = useCallback((message: string, opts?: Omit<ModalOptions, 'message' | 'type'>) => {
    return openModal({ message, type: 'confirm', ...opts });
  }, [openModal]);

  const showPrompt = useCallback((message: string, opts?: Omit<ModalOptions, 'message' | 'type'>) => {
    return openModal({ message, type: 'prompt', ...opts });
  }, [openModal]);

  const handleConfirm = () => {
    setIsOpen(false);
    if (options?.type === 'prompt') {
      resolvePromise(inputValue);
    } else if (options?.type === 'confirm') {
      resolvePromise(true);
    } else {
      resolvePromise(undefined);
    }
  };

  const handleCancel = () => {
    setIsOpen(false);
    if (options?.type === 'prompt') {
      resolvePromise(null);
    } else if (options?.type === 'confirm') {
      resolvePromise(false);
    } else {
      resolvePromise(undefined);
    }
  };

  return (
    <ModalContext.Provider value={{ showAlert, showConfirm, showPrompt }}>
      {children}
      {isOpen && options && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6 animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-white rounded-[28px] w-full max-w-sm shadow-2xl p-6 animate-[scaleIn_0.2s_ease-out]">
            {options.title && (
              <h3 className="text-lg font-bold text-gray-800 mb-2">{options.title}</h3>
            )}
            <p className="text-gray-600 mb-6 whitespace-pre-line text-sm leading-relaxed font-medium">{options.message}</p>
            
            {options.type === 'prompt' && (
              <div className="mb-6">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={options.placeholder}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-brand-500 transition-colors text-sm"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
                />
              </div>
            )}

            <div className="flex gap-3">
              {options.type !== 'alert' && (
                <button
                  onClick={handleCancel}
                  className="flex-1 py-3.5 rounded-xl bg-gray-100 text-gray-600 font-bold text-sm hover:bg-gray-200 transition-colors"
                >
                  {options.cancelText || '취소'}
                </button>
              )}
              <button
                onClick={handleConfirm}
                className={`flex-1 py-3.5 rounded-xl text-white font-bold text-sm transition-colors shadow-lg ${
                    options.type === 'alert' 
                    ? 'bg-brand-500 hover:bg-brand-600 shadow-brand-200' 
                    : 'bg-brand-500 hover:bg-brand-600 shadow-brand-200'
                }`}
              >
                {options.confirmText || '확인'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ModalContext.Provider>
  );
};
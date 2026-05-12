
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { CheckCircle, AlertCircle, Info, X, AlertTriangle } from 'lucide-react';

type ToastType = 'SUCCESS' | 'ERROR' | 'INFO' | 'WARNING';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  addToast: (message: string, type?: ToastType) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: ToastType = 'INFO') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    // Auto dismiss after 4 seconds
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      
      {/* Toast Container - Fixed Top Right */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`
              pointer-events-auto min-w-[300px] max-w-md bg-white rounded-lg shadow-xl border-l-4 p-4 flex items-start gap-3 transform transition-all duration-300 animate-slide-in
              ${toast.type === 'SUCCESS' ? 'border-emerald-500' : ''}
              ${toast.type === 'ERROR' ? 'border-red-500' : ''}
              ${toast.type === 'WARNING' ? 'border-amber-500' : ''}
              ${toast.type === 'INFO' ? 'border-blue-500' : ''}
            `}
          >
            <div className="shrink-0 mt-0.5">
              {toast.type === 'SUCCESS' && <CheckCircle className="w-5 h-5 text-emerald-500" />}
              {toast.type === 'ERROR' && <AlertCircle className="w-5 h-5 text-red-500" />}
              {toast.type === 'WARNING' && <AlertTriangle className="w-5 h-5 text-amber-500" />}
              {toast.type === 'INFO' && <Info className="w-5 h-5 text-blue-500" />}
            </div>
            
            <div className="flex-1">
              <h4 className={`text-sm font-bold mb-0.5
                ${toast.type === 'SUCCESS' ? 'text-emerald-800' : ''}
                ${toast.type === 'ERROR' ? 'text-red-800' : ''}
                ${toast.type === 'WARNING' ? 'text-amber-800' : ''}
                ${toast.type === 'INFO' ? 'text-blue-800' : ''}
              `}>
                {toast.type === 'SUCCESS' ? 'Succès' : toast.type === 'ERROR' ? 'Erreur' : toast.type === 'WARNING' ? 'Attention' : 'Information'}
              </h4>
              <p className="text-sm text-gray-600 leading-snug">{toast.message}</p>
            </div>

            <button 
              onClick={() => removeToast(toast.id)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(100%); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-slide-in {
          animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>
    </ToastContext.Provider>
  );
};

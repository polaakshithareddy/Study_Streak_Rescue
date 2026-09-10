import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message, type = 'info', duration = 3500) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  const toast = {
    success: (msg, dur) => addToast(msg, 'success', dur),
    error: (msg, dur) => addToast(msg, 'error', dur),
    info: (msg, dur) => addToast(msg, 'info', dur),
    warning: (msg, dur) => addToast(msg, 'warning', dur)
  };

  const getToastStyles = (type) => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-emerald-950/90 text-emerald-100 border-emerald-800 shadow-emerald-950/50',
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
        };
      case 'error':
        return {
          bg: 'bg-rose-950/90 text-rose-100 border-rose-800 shadow-rose-950/50',
          icon: <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
        };
      case 'warning':
        return {
          bg: 'bg-amber-950/90 text-amber-100 border-amber-800 shadow-amber-950/50',
          icon: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
        };
      default:
        return {
          bg: 'bg-slate-900/90 text-slate-100 border-slate-700 shadow-slate-950/50',
          icon: <Info className="w-5 h-5 text-blue-400 shrink-0" />
        };
    }
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* Toast Notification Container */}
      <div className="fixed top-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((t) => {
          const style = getToastStyles(t.type);
          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-center justify-between gap-3 p-3.5 rounded-xl border backdrop-blur-md shadow-xl transition-all duration-300 animate-in slide-in-from-top-5 duration-200 ${style.bg}`}
            >
              <div className="flex items-center gap-3">
                {style.icon}
                <span className="text-xs font-semibold leading-snug">{t.message}</span>
              </div>
              <button
                onClick={() => removeToast(t.id)}
                className="text-slate-400 hover:text-white p-1 rounded-md transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

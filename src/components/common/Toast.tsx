import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, RotateCcw } from 'lucide-react';

export interface ToastOptions {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  duration?: number;
}

interface ToastContextValue {
  showToast: (options: ToastOptions | string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toast, setToast] = useState<ToastOptions | null>(null);
  const timerRef = useRef<number | null>(null);

  const showToast = useCallback((options: ToastOptions | string) => {
    const opts: ToastOptions = typeof options === 'string' ? { message: options } : options;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    setToast(opts);
    const timeout = opts.duration || 5000;
    timerRef.current = window.setTimeout(() => {
      setToast(null);
    }, timeout);
  }, []);

  const handleAction = () => {
    if (toast?.onAction) {
      toast.onAction();
    }
    setToast(null);
  };

  const handleDismiss = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    setToast(null);
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <AnimatePresence>
        {toast && (
          <div className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-50 pointer-events-none px-4 w-full max-w-sm">
            <motion.div
              initial={{ y: 24, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 24, opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 450, damping: 28 }}
              className="pointer-events-auto bg-white/80 backdrop-blur-[24px] border border-white/80 shadow-glass rounded-full px-5 py-3 flex items-center justify-between gap-3 text-sm text-graphite"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <CheckCircle2 size={16} className="text-[#96BD1E] shrink-0" />
                <span className="truncate text-xs font-normal">{toast.message}</span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {toast.actionLabel && (
                  <button
                    type="button"
                    onClick={handleAction}
                    className="inline-flex items-center gap-1 text-xs font-medium text-graphite hover:underline px-2.5 py-1 rounded-full bg-black/5 hover:bg-black/10 transition-colors"
                  >
                    <RotateCcw size={12} />
                    <span>{toast.actionLabel}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="text-secondary hover:text-graphite p-1 rounded-full hover:bg-black/5"
                  aria-label="Dismiss toast"
                >
                  <X size={14} />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </ToastContext.Provider>
  );
};

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from 'lucide-react';

const ToastContext = createContext();

const STYLES = {
  success: { icon: CheckCircle2, ring: 'border-emerald-200 dark:border-emerald-800', iconColor: 'text-emerald-500' },
  error: { icon: XCircle, ring: 'border-rose-200 dark:border-rose-800', iconColor: 'text-rose-500' },
  info: { icon: Info, ring: 'border-brand-200 dark:border-brand-800', iconColor: 'text-brand-500' },
  warning: { icon: AlertTriangle, ring: 'border-amber-200 dark:border-amber-800', iconColor: 'text-amber-500' },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const toast = useCallback(
    (message, type = 'info', opts = {}) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((t) => [...t.slice(-4), { id, message, type, duration: opts.duration || 4200 }]);
      if (opts.duration !== 0) {
        setTimeout(() => dismiss(id), opts.duration || 4200);
      }
    },
    [dismiss]
  );

  const value = useMemo(
    () => ({
      toast,
      success: (m, o) => toast(m, 'success', o),
      error: (m, o) => toast(m, 'error', o),
      info: (m, o) => toast(m, 'info', o),
      warning: (m, o) => toast(m, 'warning', o),
    }),
    [toast]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-3 top-3 z-[100] flex w-[calc(100%-1.5rem)] max-w-sm flex-col gap-2">
        {toasts.map((t) => {
          const s = STYLES[t.type] || STYLES.info;
          const Icon = s.icon;
          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-start gap-3 rounded-xl border bg-white/95 p-3.5 shadow-lift backdrop-blur animate-fade-in dark:bg-slate-900/95 ${s.ring}`}
              role="status"
            >
              <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${s.iconColor}`} />
              <p className="flex-1 text-sm font-medium text-slate-800 dark:text-slate-100">{t.message}</p>
              <button
                onClick={() => dismiss(t.id)}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
                aria-label="Dismiss notification"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
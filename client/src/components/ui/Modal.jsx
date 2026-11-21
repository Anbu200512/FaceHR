import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import clsx from 'clsx';

const SIZES = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-3xl',
  xl: 'max-w-5xl',
};

export default function Modal({ open, onClose, title, subtitle, children, footer, size = 'md', bodyClassName = '', panelClassName = '' }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div
        className={clsx(
          'relative z-10 flex max-h-[calc(100dvh-1.5rem)] w-full flex-col rounded-2xl bg-white shadow-lift animate-slide-up dark:bg-slate-900 sm:max-h-[calc(100dvh-2rem)] sm:w-[calc(100%-2rem)]',
          SIZES[size] || SIZES.md,
          panelClassName
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b px-5 py-4 dark:border-slate-700">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">{title}</h2>
            {subtitle && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-300">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 dark:text-slate-300 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className={clsx('min-h-0 overflow-y-auto', !/(?:^|\s)!?p[xytrbl]?-\S+/.test(bodyClassName) && 'px-4 py-4 sm:px-5', bodyClassName)}>{children}</div>
        {footer && <div className="border-t px-5 py-4 dark:border-slate-700">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}

import clsx from 'clsx';

const VARIANTS = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  ghost: 'btn-ghost',
  danger: 'btn-danger',
  success: 'btn-success',
};

export default function Button({ variant = 'primary', size, className, loading, children, disabled, ...props }) {
  return (
    <button
      className={clsx(VARIANTS[variant] || VARIANTS.primary, size === 'sm' && 'px-3 py-2 text-xs', className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  );
}

export function Spinner({ className }) {
  return (
    <span className={clsx('relative inline-flex shrink-0', className)} aria-hidden="true">
      <span className="absolute inset-0 rounded-full border-2 border-current opacity-20" />
      <span className="absolute inset-0 animate-spin rounded-full border-2 border-current border-t-transparent border-r-transparent" />
    </span>
  );
}

export function FullScreenLoader({ label = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 animate-fade-in">
      <div className="relative flex h-14 w-14 items-center justify-center">
        <span className="absolute h-full w-full animate-ping rounded-full bg-brand-500/15 dark:bg-brand-400/10" />
        <span className="absolute h-11 w-11 animate-spin rounded-full border-[3px] border-slate-200 border-t-brand-600 border-r-brand-500 dark:border-slate-700 dark:border-t-brand-400 dark:border-r-brand-500" />
        <span className="h-2.5 w-2.5 rounded-full bg-brand-600 shadow-sm dark:bg-brand-400" />
      </div>
      <div className="flex flex-col items-center gap-1">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</p>
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-500 [animation-delay:-0.3s]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-500 [animation-delay:-0.15s]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-500" />
        </div>
      </div>
    </div>
  );
}
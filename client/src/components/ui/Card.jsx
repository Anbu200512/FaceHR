import clsx from 'clsx';

export function Card({ children, className, onClick }) {
  return (
    <div className={clsx('card', onClick && 'cursor-pointer transition hover:shadow-lift', className)} onClick={onClick}>
      {children}
    </div>
  );
}

const ICON_BG = {
  indigo: 'bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400',
  emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400',
  amber: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400',
  rose: 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400',
  sky: 'bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400',
  violet: 'bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400',
};

export function StatCard({ label, value, icon: Icon, tone = 'indigo', sub, loading }) {
  return (
    <Card className="flex items-center gap-4 p-5">
      <div className={clsx('flex h-12 w-12 shrink-0 items-center justify-center rounded-xl', ICON_BG[tone] || ICON_BG.indigo)}>
        {Icon && <Icon className="h-6 w-6" />}
      </div>
      <div className="min-w-0">
        {loading ? (
          <>
            <div className="h-3 w-16 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
            <div className="mt-2 h-6 w-10 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
          </>
        ) : (
          <>
            <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
            <p className="mt-0.5 text-2xl font-bold text-slate-900 dark:text-slate-100">{value ?? '—'}</p>
            {sub && <p className="truncate text-xs text-slate-400">{sub}</p>}
          </>
        )}
      </div>
    </Card>
  );
}
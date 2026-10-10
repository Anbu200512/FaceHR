import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ page, pageSize, total, onPageChange, onPageSizeChange }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  const btn =
    'flex h-9 w-9 items-center justify-center rounded-lg border text-sm font-semibold transition disabled:opacity-40 enabled:hover:bg-slate-50 dark:enabled:hover:bg-slate-800';

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t px-4 py-3 dark:border-slate-700 sm:flex-row">
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Showing <span className="font-semibold text-slate-700 dark:text-slate-200">{from}–{to}</span> of{' '}
        <span className="font-semibold text-slate-700 dark:text-slate-200">{total}</span>
      </p>
      <div className="flex items-center gap-2">
        {onPageSizeChange && (
          <Select size current={pageSize} onChange={onPageSizeChange} />
        )}
        <button className={btn} disabled={page <= 1} onClick={() => onPageChange(page - 1)} aria-label="Previous page">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="px-1 text-xs font-medium text-slate-600 dark:text-slate-300">
          {page} / {totalPages}
        </span>
        <button className={btn} disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} aria-label="Next page">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function Select({ size, current, onChange }) {
  return (
    <select
      value={size}
      onChange={(e) => onChange(Number(e.target.value))}
      className="rounded-lg border bg-white px-2 py-1.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300"
      aria-label="Rows per page"
    >
      {[10, 25, 50].map((n) => (
        <option key={n} value={n}>{n} / page</option>
      ))}
    </select>
  );
}
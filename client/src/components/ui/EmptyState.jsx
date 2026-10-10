import { SearchX } from 'lucide-react';

export default function EmptyState({ title = 'No records found', message, icon: Icon, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      {Icon ? <Icon className="h-12 w-12 text-slate-300 dark:text-slate-600" /> : <SearchX className="h-12 w-12 text-slate-300 dark:text-slate-600" />}
      <div>
        <p className="font-semibold text-slate-700 dark:text-slate-200">{title}</p>
        {message && <p className="mt-1 max-w-sm text-sm text-slate-400">{message}</p>}
      </div>
      {action}
    </div>
  );
}
import clsx from 'clsx';
import { Check } from 'lucide-react';

export default function StepBar({ steps, current, visited, onChange }) {
  return (
    <div className="overflow-x-auto pb-2">
      <ol className="flex min-w-max items-center gap-1.5">
        {steps.map((step, i) => {
          const isDone = visited.has(i);
          const isActive = i === current;
          const clickable = i < current || isDone;
          return (
            <li key={step.id} className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => clickable && onChange(i)}
                disabled={!clickable}
                className={clsx(
                  'flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3 transition',
                  clickable && 'hover:bg-slate-100 dark:hover:bg-slate-800',
                  !clickable && 'cursor-not-allowed opacity-60'
                )}
                title={step.label}
              >
                <span
                  className={clsx(
                    'relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition',
                    isDone && 'bg-brand-600 text-white',
                    isActive && !isDone && 'bg-brand-600 text-white ring-4 ring-brand-600/20',
                    !isDone && !isActive && 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                  )}
                >
                  {isDone ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </span>
                <span
                  className={clsx(
                    'whitespace-nowrap text-xs font-semibold',
                    isActive ? 'text-brand-700 dark:text-brand-300' : isDone ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400'
                  )}
                >
                  {step.label}
                </span>
              </button>
              {i < steps.length - 1 && (
                <span
                  className={clsx('h-px w-5 shrink-0', i < current ? 'bg-brand-500' : 'bg-slate-200 dark:bg-slate-700')}
                />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
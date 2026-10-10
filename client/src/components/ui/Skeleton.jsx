import clsx from 'clsx';

export function Skeleton({ className }) {
  return <div className={clsx('animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700', className)} />;
}

export function SkeletonRow({ cols = 6 }) {
  return (
    <tr className="border-b dark:border-slate-700">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="td">
          <Skeleton className="h-4 w-full max-w-[120px]" />
        </td>
      ))}
    </tr>
  );
}

export function SkeletonGrid({ count = 4 }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card p-5">
          <div className="flex items-center gap-4">
            <Skeleton className="h-12 w-12 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-6 w-12" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
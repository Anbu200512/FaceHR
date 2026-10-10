import { UserPlus, LogOut, CalendarRange, CalendarCheck2, Plane } from 'lucide-react';
import clsx from 'clsx';
import { Card } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';

const ITEMS = [
  { key: 'newJoiners', label: 'New Joiners', caption: 'Joined this month', icon: UserPlus, tone: 'emerald' },
  { key: 'resignations', label: 'Resignations', caption: 'Departed this month', icon: LogOut, tone: 'rose' },
  { key: 'pendingLeaves', label: 'Leave Requests', caption: 'Pending approval', icon: CalendarRange, tone: 'amber' },
  { key: 'onLeaveToday', label: 'Attendance', caption: 'On leave today', icon: Plane, tone: 'sky' },
  { key: 'upcomingApprovedLeaves', label: 'Upcoming Leaves', caption: 'Approved, starting soon', icon: CalendarCheck2, tone: 'violet' },
];

const TONES = {
  indigo: 'bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400',
  emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400',
  amber: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400',
  rose: 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400',
  sky: 'bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400',
  violet: 'bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400',
};

export default function HRActivitySummary({ hr, loading }) {
  return (
    <div className="min-w-0">
      <div className="mb-3">
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">HR Activity Summary</h2>
        <p className="text-xs text-slate-400">Recent workforce activity</p>
      </div>

      <Card className="p-5">
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-6 w-8" />
              </div>
            ))}
          </div>
        ) : (
          <ul className="space-y-4">
            {ITEMS.map(({ key, label, caption, icon: Icon, tone }) => (
              <li key={key} className="flex items-center gap-3">
                <div className={clsx('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', TONES[tone] || TONES.indigo)}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">{label}</p>
                  <p className="truncate text-xs text-slate-400">{caption}</p>
                </div>
                <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{hr?.[key] ?? 0}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
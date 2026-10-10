import { Link } from 'react-router-dom';
import { CalendarCheck2, CheckCheck, CalendarClock, Inbox, ArrowRight } from 'lucide-react';
import clsx from 'clsx';
import { Card } from '../ui/Card';

const TONES = {
  indigo: 'bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400',
  rose: 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400',
  emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400',
  amber: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400',
};

function LeaveMetric({ icon: Icon, label, value, sub, tone = 'indigo', loading }) {
  return (
    <Card className="flex items-center gap-4 p-5">
      <div className={clsx('flex h-12 w-12 shrink-0 items-center justify-center rounded-xl', TONES[tone] || TONES.indigo)}>
        <Icon className="h-6 w-6" />
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

export default function MonthlyLeave({ data, loading }) {
  return (
    <section className="mt-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Monthly Leave</h2>
          <p className="text-xs text-slate-400">Annual leave allocation and usage for {data?.year || new Date().getFullYear()}</p>
        </div>
        <Link to="/admin/leaves" className="flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline dark:text-brand-400">
          Manage leaves <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <LeaveMetric loading={loading} icon={CalendarCheck2} label="Total Leave" value={data?.total} sub={`${data?.allowance} days per employee · ${data?.year}`} tone="indigo" />
        <LeaveMetric loading={loading} icon={CheckCheck} label="Leave Used" value={data?.used} sub="days approved this year" tone="rose" />
        <LeaveMetric loading={loading} icon={CalendarClock} label="Leave Remaining" value={data?.remaining} sub="days still available" tone="emerald" />
        <LeaveMetric loading={loading} icon={Inbox} label="Pending Requests" value={data?.pending} sub="requests awaiting review" tone="amber" />
      </div>
    </section>
  );
}
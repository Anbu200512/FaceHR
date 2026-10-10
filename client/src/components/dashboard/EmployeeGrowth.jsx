import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, UserPlus, LogOut, ArrowUpDown } from 'lucide-react';
import clsx from 'clsx';
import { Card } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';

export default function EmployeeGrowth({ trend, hr, loading }) {
  const months = trend || [];
  const newJoiners = hr?.newJoiners ?? 0;
  const resignations = hr?.resignations ?? 0;
  const netChange = newJoiners - resignations;

  const metrics = [
    { label: 'New Joiners', value: newJoiners, icon: UserPlus, tone: 'emerald' },
    { label: 'Resignations', value: resignations, icon: LogOut, tone: 'rose' },
    { label: 'Net Change', value: netChange >= 0 ? `+${netChange}` : netChange, icon: ArrowUpDown, tone: netChange >= 0 ? 'indigo' : 'rose' },
  ];

  const TONE_TXT = {
    emerald: 'text-emerald-600 dark:text-emerald-400',
    rose: 'text-rose-600 dark:text-rose-400',
    indigo: 'text-brand-600 dark:text-brand-400',
  };

  return (
    <div className="min-w-0">
      <div className="mb-3">
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Employee Growth</h2>
        <p className="text-xs text-slate-400">Joiners, resignations and net change — last 6 months</p>
      </div>

      <Card className="p-5">
        {loading ? (
          <div className="space-y-4">
            <div className="flex gap-4 text-2xl font-bold text-slate-800 dark:text-slate-100">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 flex-1" />)}
            </div>
            <Skeleton className="h-48 w-full" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {metrics.map(({ label, value, icon: Icon, tone }) => (
                <div key={label} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                  <div className="flex items-center gap-2">
                    <Icon className={clsx('h-4 w-4', TONE_TXT[tone])} />
                    <p className="truncate text-xs text-slate-400">{label}</p>
                  </div>
                  <p className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
                </div>
              ))}
            </div>

            {months.length === 0 ? (
              <div className="mt-4 flex flex-col items-center gap-1.5 rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center dark:border-slate-700">
                <TrendingUp className="h-5 w-5 text-slate-300 dark:text-slate-600" />
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No growth data yet</p>
                <p className="text-xs text-slate-400">Monthly joiners and resignations will be charted here.</p>
              </div>
            ) : (
              <div className="mt-4 h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={months} margin={{ top: 5, right: 5, left: -22, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-slate-200 dark:stroke-slate-700" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Area type="monotone" dataKey="newJoiners" name="New Joiners" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.35} />
                    <Area type="monotone" dataKey="resignations" name="Resignations" stackId="1" stroke="#ef4444" fill="#ef4444" fillOpacity={0.35} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
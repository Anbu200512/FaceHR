import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { LogOut } from 'lucide-react';
import { Card } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';

const LABELS = { Other: 'Others' };
const REASON_ORDER = ['Better Opportunity', 'Salary', 'Personal Reason', 'Relocation', 'Others'];
const COLORS = {
  Salary: '#2563eb',
  'Better Opportunity': '#10b981',
  'Personal Reason': '#f59e0b',
  Relocation: '#ef4444',
  Others: '#06b6d4',
};

export default function ResignationOverview({ data, loading }) {
  const rows = data || [];
  const total = rows.reduce((s, r) => s + r.count, 0);

  const chartData = rows
    .map((r) => ({ ...r, reason: LABELS[r.reason] || r.reason }))
    .filter((r) => r.count > 0);
  const listData = REASON_ORDER.map((reason) => ({
    reason,
    count: rows.find((r) => (LABELS[r.reason] || r.reason) === reason)?.count || 0,
    percent: rows.find((r) => (LABELS[r.reason] || r.reason) === reason)?.percent || 0,
  }));

  return (
    <div className="min-w-0">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
            <LogOut className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Resignation Overview</h2>
            <p className="text-xs text-slate-400">Resignation requests by reason this month</p>
          </div>
        </div>
        {!loading && (
          <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {total} {total === 1 ? 'request' : 'requests'}
          </span>
        )}
      </div>

      <Card className="overflow-hidden p-5">
        {loading ? (
          <div className="flex flex-col items-center gap-4">
            <Skeleton className="h-44 w-44 rounded-full" />
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-3 w-40" />)}
            </div>
          </div>
        ) : total === 0 ? (
          <div className="flex flex-col items-center rounded-2xl bg-slate-50/80 py-5 dark:bg-slate-800/30">
            <div className="relative h-44 w-44 rounded-full border-[27px] border-slate-200/80 shadow-inner dark:border-slate-700">
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                <p className="text-[10px] uppercase tracking-wide text-slate-400">Total</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">0</p>
                <p className="text-[10px] uppercase tracking-wide text-slate-400">This Month</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center rounded-2xl bg-slate-50/80 py-5 dark:bg-slate-800/30">
            <div className="relative h-44 w-44 drop-shadow-sm">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={chartData} dataKey="count" nameKey="reason" innerRadius={55} outerRadius={82} paddingAngle={2} strokeWidth={0}>
                    {chartData.map((d, i) => (
                      <Cell key={i} fill={COLORS[d.reason] || '#94a3b8'} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name, p) => [`${value} (${p.payload.percent}%)`, name]} contentStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                <p className="text-[10px] uppercase tracking-wide text-slate-400">Total</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{total}</p>
                <p className="text-[10px] uppercase tracking-wide text-slate-400">This Month</p>
              </div>
            </div>

            <ul className="mt-4 w-full space-y-2">
              {listData.map((item) => (
                <li key={item.reason} className="flex items-center gap-3 text-sm">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: COLORS[item.reason] || '#94a3b8' }} />
                  <span className="flex-1 font-medium text-slate-600 dark:text-slate-300">{item.reason}</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100">{item.count}</span>
                  <span className="w-14 text-right text-xs text-slate-400">{item.percent}%</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>
    </div>
  );
}

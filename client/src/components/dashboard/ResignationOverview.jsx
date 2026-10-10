import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { LogOut } from 'lucide-react';
import { Card } from '../ui/Card';
import EmptyState from '../ui/EmptyState';
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
      <div className="mb-3">
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Resignation Overview</h2>
        <p className="text-xs text-slate-400">Resignation requests by reason this month</p>
      </div>

      <Card className="p-5">
        {loading ? (
          <div className="flex flex-col items-center gap-4">
            <Skeleton className="h-44 w-44 rounded-full" />
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-3 w-40" />)}
            </div>
          </div>
        ) : total === 0 ? (
          <EmptyState icon={LogOut} title="No resignations this month" message="Resignation requests submitted by employees will be shown here." />
        ) : (
          <div className="flex flex-col items-center">
            <div className="relative h-44 w-44">
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
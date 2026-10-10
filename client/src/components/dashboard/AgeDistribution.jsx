import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Cake } from 'lucide-react';
import { Card } from '../ui/Card';
import EmptyState from '../ui/EmptyState';
import { Skeleton } from '../ui/Skeleton';

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function AgeDistribution({ data, loading }) {
  const all = data || [];
  const chartData = all.filter((d) => d.count > 0).map((d) => ({ ...d, value: d.count }));
  const total = chartData.reduce((s, d) => s + d.value, 0);

  return (
    <div className="min-w-0">
      <div className="mb-3">
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Employee Age Distribution</h2>
        <p className="text-xs text-slate-400">Age groups across the selected workforce</p>
      </div>

      <Card className="p-5">
        {loading ? (
          <div className="flex flex-col items-center gap-4">
            <Skeleton className="h-44 w-44 rounded-full" />
            <div className="flex flex-wrap justify-center gap-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-3 w-20" />)}
            </div>
          </div>
        ) : total === 0 ? (
          <EmptyState icon={Cake} title="No age data" message="Age distribution will appear once employees have a date of birth." />
        ) : (
          <div className="flex flex-col items-center">
            <div className="relative h-44 w-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={82} paddingAngle={2} strokeWidth={0}>
                    {chartData.map((d, i) => (
                      <Cell key={`${d.name}-${i}`} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} employees`, null]} contentStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{total}</p>
                <p className="text-[10px] uppercase tracking-wide text-slate-400">Employees</p>
              </div>
            </div>

            <ul className="mt-4 flex flex-wrap justify-center gap-x-5 gap-y-1.5">
              {chartData.map((d, i) => (
                <li key={d.name} className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="font-medium">{d.name}</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100">{d.count}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>
    </div>
  );
}
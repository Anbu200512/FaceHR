import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Card } from '../ui/Card';
import EmptyState from '../ui/EmptyState';
import { Skeleton } from '../ui/Skeleton';

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#8b5cf6', '#ec4899', '#84cc16'];

export default function DonutChartSection({ title, description, icon: Icon, rows, loading, emptyTitle, emptyMessage }) {
  const data = (rows || [])
    .filter((r) => (r.employees ?? 0) > 0)
    .map((r) => ({ ...r, value: r.employees }));

  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="min-w-0">
      <div className="mb-3">
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">{title}</h2>
        <p className="text-xs text-slate-400">{description}</p>
      </div>

      <Card className="p-5">
        {loading ? (
          <div className="flex flex-col items-center gap-4">
            <Skeleton className="h-44 w-44 rounded-full" />
            <div className="flex flex-wrap justify-center gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-3 w-20" />
              ))}
            </div>
          </div>
        ) : data.length === 0 ? (
          <EmptyState icon={Icon} title={emptyTitle} message={emptyMessage} />
        ) : (
          <div className="flex flex-col items-center">
            <div className="relative h-48 w-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={60}
                    outerRadius={88}
                    paddingAngle={2}
                    strokeWidth={0}
                  >
                    {data.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [`${value} employees`, null]}
                    contentStyle={{ fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">{total}</p>
                <p className="text-[11px] uppercase tracking-wide text-slate-400">Employees</p>
              </div>
            </div>

            <ul className="mt-4 flex flex-wrap justify-center gap-x-5 gap-y-1.5">
              {data.map((d, i) => (
                <li key={d.id ?? `item-${i}`} className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="font-medium">{d.name}</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100">{d.value}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>
    </div>
  );
}
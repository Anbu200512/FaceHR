import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { MapPin, Briefcase, Users } from 'lucide-react';
import { Card } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';

const PALETTES = {
  location: ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#8b5cf6', '#ec4899', '#84cc16'],
  department: ['#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#ef4444', '#2563eb', '#84cc16'],
  gender: { Male: '#2563eb', Female: '#ec4899', Other: '#8b5cf6' },
};

function MiniDonut({ title, subtitle, icon: Icon, data, palette }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const colorOf = (name, i) => (Array.isArray(palette) ? palette[i % palette.length] : palette[name] || '#94a3b8');

  return (
    <div className="flex flex-col rounded-xl border border-slate-200 p-4 dark:border-slate-700">
      <div className="mb-2 flex items-center gap-2">
        <Icon className="h-4 w-4 text-brand-500" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</p>
          <p className="text-xs text-slate-400">{subtitle}</p>
        </div>
      </div>

      {total === 0 ? (
        <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-slate-200 py-6 text-center text-xs text-slate-400 dark:border-slate-700">
          No employees yet
        </div>
      ) : (
        <div className="flex flex-1 items-center gap-3">
          <div className="relative h-28 w-28 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} dataKey="value" nameKey="name" innerRadius={32} outerRadius={50} paddingAngle={2} strokeWidth={0}>
                  {data.map((d, i) => (
                    <Cell key={`${d.name}-${i}`} fill={colorOf(d.name, i)} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{total}</p>
              <p className="text-[9px] uppercase tracking-wide text-slate-400">Total</p>
            </div>
          </div>
          <ul className="min-w-0 flex-1 space-y-1.5">
            {data.map((d, i) => (
              <li key={d.name} className="flex items-center gap-1.5 text-sm">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: colorOf(d.name, i) }} />
                <span className="truncate font-medium text-slate-600 dark:text-slate-300">{d.name}</span>
                <span className="ml-auto font-bold text-slate-800 dark:text-slate-100">{d.value}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function EmployeeOverview({ departments, locations, hr, loading }) {
  const deptData = (departments || []).filter((d) => d.id !== null).map((d) => ({ name: d.name, value: d.employees }));
  const locData = (locations || []).map((l) => ({ name: l.name, value: l.employees }));
  const genderData = [
    { name: 'Male', value: hr?.male || 0 },
    { name: 'Female', value: hr?.female || 0 },
    { name: 'Other', value: hr?.other || 0 },
  ].filter((g) => g.value > 0);

  return (
    <div className="min-w-0">
      <div className="mb-3">
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Employee Overview</h2>
        <p className="text-xs text-slate-400">Workforce composition by location, gender and department</p>
      </div>

      <Card className="p-5">
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                <Skeleton className="h-28 w-28 rounded-full" />
                <Skeleton className="h-3 w-24" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-3">
            <MiniDonut title="By Location" subtitle="Employees per office" icon={MapPin} data={locData} palette={PALETTES.location} />
            <MiniDonut title="By Gender" subtitle="Gender split" icon={Users} data={genderData} palette={PALETTES.gender} />
            <MiniDonut title="By Department" subtitle="Workforce by team" icon={Briefcase} data={deptData} palette={PALETTES.department} />
          </div>
        )}
      </Card>
    </div>
  );
}
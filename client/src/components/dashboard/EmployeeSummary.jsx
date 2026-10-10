import { Users, UserPlus, LogOut, CalendarDays } from 'lucide-react';
import { StatCard } from '../ui/Card';

export default function EmployeeSummary({ hr, loading }) {
  return (
    <section>
      <div className="mb-3">
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Employee Summary</h2>
        <p className="text-xs text-slate-400">Workforce composition across the organisation</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Employees" value={hr?.totalEmployees ?? 0} icon={Users} tone="indigo" loading={loading} />
        <StatCard label="New Joiners This Month" value={hr?.newJoiners ?? 0} icon={UserPlus} tone="emerald" loading={loading} />
        <StatCard label="Resignations This Month" value={hr?.resignations ?? 0} icon={LogOut} tone="rose" loading={loading} />
        <StatCard label="Average Age" value={hr?.averageAge != null ? `${hr.averageAge} yrs` : '—'} icon={CalendarDays} tone="violet" loading={loading} />
      </div>
    </section>
  );
}
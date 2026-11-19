import { CalendarDays, Coffee } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../hooks/useApi';
import PageHeader from '../../components/PageHeader';
import { Card } from '../../components/ui/Card';
import { Skeleton } from '../../components/ui/Skeleton';

const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function EmployeeWeekOff() {
  const { user } = useAuth();
  const { data, loading } = useApi(async () => {
    const res = await api.get(`/employees/${user.employee}`);
    return res.data.data;
  }, [user.employee]);

  const emp = data || user?.employeeData || {};
  const w = emp.weekOff || {};
  const weeklyOffDay = w.weeklyOffDay || '';
  const secondWeeklyOffDay = w.secondWeeklyOffDay || '';
  const workingDays = Array.isArray(w.workingDays) && w.workingDays.length
    ? w.workingDays
    : WEEK_DAYS.filter((d) => d !== weeklyOffDay && d !== secondWeeklyOffDay);

  return (
    <div className="space-y-6">
      <PageHeader title="Week Off" description="Your weekly off schedule (view only). Contact admin if changes are needed." />
      <Card className="overflow-hidden p-0">
        <div className="border-b border-slate-200 bg-gradient-to-r from-brand-50 to-white px-5 py-5 dark:border-slate-700 dark:from-slate-800/60 dark:to-slate-900 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-white p-2.5 text-brand-600 shadow-sm dark:bg-slate-900 dark:text-brand-400">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Weekly schedule</h2>
              <p className="text-sm text-slate-500 dark:text-slate-300">Configured by your admin</p>
            </div>
          </div>
        </div>
        <div className="p-5 sm:p-6">
          {loading && !data ? (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-6 w-24" />
                </div>
                <div className="space-y-2 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-6 w-24" />
                </div>
              </div>
              <div className="space-y-3">
                <Skeleton className="h-3 w-24" />
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-7 w-20 rounded-full" />)}
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-700 dark:bg-slate-800/40">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-300">Primary week off</p>
                  <p className="mt-2 text-lg font-bold text-slate-900 dark:text-slate-100">{weeklyOffDay || 'Not set'}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-700 dark:bg-slate-800/40">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-300">Second week off</p>
                  <p className="mt-2 text-lg font-bold text-slate-900 dark:text-slate-100">{secondWeeklyOffDay || 'None'}</p>
                </div>
              </div>

              <div className="mt-6">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-300">Working days</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {workingDays.length ? workingDays.map((d) => (
                    <span key={d} className="inline-flex items-center rounded-full bg-brand-50 px-3 py-1 text-sm font-medium text-brand-700 ring-1 ring-inset ring-brand-200 dark:bg-brand-500/10 dark:text-brand-300 dark:ring-brand-500/30">{d}</span>
                  )) : <span className="text-sm text-slate-500 dark:text-slate-300">No working days set.</span>}
                </div>
              </div>

              <div className="mt-6 flex items-start gap-2 rounded-xl border border-dashed border-slate-200 px-4 py-3 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">
                <Coffee className="mt-0.5 h-4 w-4 shrink-0 text-slate-400 dark:text-slate-300" />
                <span>Week off is managed by your admin. Contact HR/admin for changes.</span>
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}

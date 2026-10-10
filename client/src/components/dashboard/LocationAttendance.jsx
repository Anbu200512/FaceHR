import { MapPin } from 'lucide-react';
import { Card } from '../ui/Card';
import EmptyState from '../ui/EmptyState';
import { Skeleton } from '../ui/Skeleton';

export default function LocationAttendance({ rows, loading }) {
  const list = rows || [];

  return (
    <div className="min-w-0">
      <div className="mb-3">
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Location-wise Attendance</h2>
        <p className="text-xs text-slate-400">Attendance status across office locations</p>
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="space-y-4 p-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-full" />
              </div>
            ))}
          </div>
        ) : list.length === 0 ? (
          <EmptyState icon={MapPin} title="No locations" message="No office locations match the current filters." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-xs uppercase tracking-wide text-slate-400 dark:border-slate-700">
                  <th className="px-4 py-3 font-medium">Location</th>
                  <th className="px-4 py-3 text-right font-medium">Employees</th>
                  <th className="px-4 py-3 text-right font-medium">Present</th>
                  <th className="px-4 py-3 text-right font-medium">Late</th>
                  <th className="px-4 py-3 text-right font-medium">On Leave</th>
                  <th className="px-4 py-3 text-right font-medium">Absent</th>
                  <th className="px-4 py-3 font-medium">Attendance</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-slate-700">
                {list.map((r) => {
                  const presentPct = r.employees > 0 ? Math.round(((r.present + r.late) / r.employees) * 100) : 0;
                  return (
                    <tr key={r.id ?? 'unassigned'} className="align-middle">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                            <MapPin className="h-3.5 w-3.5" />
                          </span>
                          <span className="font-medium text-slate-800 dark:text-slate-100">{r.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-800 dark:text-slate-100">{r.employees}</td>
                      <td className="px-4 py-3 text-right text-emerald-600 dark:text-emerald-400">{r.present}</td>
                      <td className="px-4 py-3 text-right text-amber-600 dark:text-amber-400">{r.late}</td>
                      <td className="px-4 py-3 text-right text-sky-600 dark:text-sky-400">{r.onLeave}</td>
                      <td className="px-4 py-3 text-right text-rose-600 dark:text-rose-400">{r.absent}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                            <div
                              className="h-full rounded-full bg-emerald-500"
                              style={{ width: `${Math.min(100, presentPct)}%` }}
                            />
                          </div>
                          <span className="w-12 text-xs text-slate-400">{presentPct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
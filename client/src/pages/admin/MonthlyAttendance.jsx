import { useState } from 'react';
import { CalendarRange, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import api from '../../services/api';
import { formatDuration } from '../../services/format';
import PageHeader from '../../components/PageHeader';
import { Card } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import { SkeletonGrid } from '../../components/ui/Skeleton';
import { useToast } from '../../context/ToastContext';
import { extractError } from '../../services/api';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function MonthlyAttendance() {
  const toast = useToast();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const { data: list } = await api.get('/employees?page=1&pageSize=300&status=Active');
      const emps = list.data;
      const summaries = await Promise.all(
        emps.map(async (e) => {
          try {
            const { data } = await api.get(`/attendance/${e._id}?year=${year}&month=${month}`);
            return { ...e, monthly: data.data };
          } catch {
            return null;
          }
        })
      );
      setData({ rows: summaries.filter(Boolean) });
    } catch (err) {
      toast.error(extractError(err, 'Could not load monthly attendance'));
    } finally {
      setLoading(false);
    }
  };

  const shift = (delta) => {
    let m = month + delta;
    let y = year;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    setMonth(m);
    setYear(y);
  };

  return (
    <div>
      <PageHeader title="Monthly Attendance" description="Summarised attendance for every employee for the selected month.">
        <Button variant="secondary" onClick={fetchAll} loading={loading}><RefreshCw className="h-4 w-4" /> Load</Button>
      </PageHeader>

      <Card className="mb-5 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => shift(-1)}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="flex items-center gap-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
              <CalendarRange className="h-4 w-4 text-slate-400" />
              {MONTHS[month]} {year}
            </span>
            <Button variant="ghost" onClick={() => shift(1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
          <button onClick={() => { setMonth(now.getMonth()); setYear(now.getFullYear()); fetchAll(); }} className="btn-ghost text-xs">Today</button>
          {!data && (
            <button onClick={fetchAll} className="ml-auto btn-secondary text-sm">
              <RefreshCw className="h-4 w-4" /> Generate month report
            </button>
          )}
        </div>
      </Card>

      {!data && !loading && (
        <Card><EmptyState icon={CalendarRange} title="No data loaded" message="Pick a month and hit “Generate month report”." /></Card>
      )}
      {loading && !data && <SkeletonGrid count={6} />}

      {data && (
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b px-5 py-3 dark:border-slate-700">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{MONTHS[month]} {year}</p>
            <p className="text-xs text-slate-400">{data.rows.length} employees</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead className="border-b bg-slate-50 dark:bg-slate-800/60">
                <tr>
                  <th className="th">Employee</th>
                  <th className="th">Present</th>
                  <th className="th">Late</th>
                  <th className="th">Absent</th>
                  <th className="th">Leave</th>
                  <th className="th">Total hours</th>
                  <th className="th">Attendance %</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r) => {
                  const s = r.monthly.summary;
                  const working = Math.max(1, s.presentDays + s.absentDays + s.lateDays);
                  const pct = Math.round(((s.presentDays + s.lateDays) / working) * 100);
                  return (
                    <tr key={r._id} className="border-b transition last:border-0 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/50">
                      <td className="td">
                        <p className="font-semibold text-slate-800 dark:text-slate-100">{r.firstName} {r.lastName}</p>
                        <p className="text-xs text-slate-400">{r.employeeId} · {r.department?.name || '—'}</p>
                      </td>
                      <td className="td text-emerald-600">{s.presentDays}</td>
                      <td className="td text-amber-600">{s.lateDays}</td>
                      <td className="td text-rose-600">{s.absentDays}</td>
                      <td className="td text-sky-600">{s.leaveDays}</td>
                      <td className="td">{formatDuration(s.totalHours)}</td>
                      <td className="td"><Badge tone={pct >= 90 ? 'emerald' : pct >= 75 ? 'amber' : 'rose'}>{pct}%</Badge></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
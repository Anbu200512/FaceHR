import { useEffect, useState } from 'react';
import { Users, UserCheck, UserMinus, AlarmClock, Plane, RefreshCw, CalendarDays } from 'lucide-react';
import api, { extractError } from '../../services/api';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import { toDateKey, formatDate } from '../../services/format';
import PageHeader from '../../components/PageHeader';
import { Card, StatCard } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import { SkeletonGrid } from '../../components/ui/Skeleton';
import AttendanceCard from '../../components/attendance/AttendanceCard';

export default function TodayAttendance() {
  const toast = useToast();
  const today = new Date();
  const [date, setDate] = useState(toDateKey(today));
  const [department, setDepartment] = useState('');

  const depts = useApi(async () => {
    const { data } = await api.get('/departments');
    return data.data;
  });

  const { data, loading, error, refetch } = useApi(async () => {
    const sp = new URLSearchParams();
    if (date) sp.set('date', date);
    if (department) sp.set('department', department);
    const { data } = await api.get(`/attendance/today?${sp.toString()}`);
    return data.data;
  }, [date, department]);

  useEffectError(error, toast);

  const totals = data?.totals;
  const rows = data?.rows || [];

  return (
    <div>
      <PageHeader title="Today's Attendance" description="Live snapshot of who is in, late, away or on leave.">
        <Button variant="secondary" onClick={refetch}><RefreshCw className="h-4 w-4" /> Refresh</Button>
      </PageHeader>

      <Card className="mb-5 p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" max={toDateKey(new Date())} />
          </div>
          <div>
            <label className="label">Department</label>
            <select value={department} onChange={(e) => setDepartment(e.target.value)} className="input">
              <option value="">All Departments</option>
              {depts.data?.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
            </select>
          </div>
        </div>
      </Card>

      {loading && !data ? (
        <SkeletonGrid count={5} />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
          <StatCard label="Total Employees" value={totals?.totalEmployees} icon={Users} tone="indigo" />
          <StatCard label="Present" value={totals?.present} icon={UserCheck} tone="emerald" />
          <StatCard label="Absent" value={totals?.absent} icon={UserMinus} tone="rose" />
          <StatCard label="Late" value={totals?.late} icon={AlarmClock} tone="amber" />
          <StatCard label="On Leave" value={totals?.onLeave} icon={Plane} tone="sky" />
        </div>
      )}

      <div className="mt-6 mb-3">
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
          Attendance for {formatDate(date, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </h2>
      </div>

      {!loading && rows.length === 0 ? (
        <Card>
          <EmptyState
            icon={CalendarDays}
            title="No employees found"
            message="No active employees match the selected filters on this date."
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {(loading ? Array.from({ length: 6 }) : rows).map((row, i) =>
            loading ? (
              <Card key={i} className="h-56 animate-pulse" />
            ) : (
              <AttendanceCard key={row.employee._id} row={row} />
            )
          )}
        </div>
      )}
    </div>
  );
}

function useEffectError(error, toast) {
  useEffect(() => {
    if (error) toast.error(extractError(error, 'Could not load today\'s attendance'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error]);
}
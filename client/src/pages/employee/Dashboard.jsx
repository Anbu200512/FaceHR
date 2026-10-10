import { useState } from 'react';
import { Link } from 'react-router-dom';
import { LogIn, LogOut, CalendarDays, History, Plane, Briefcase, Clock3 } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../hooks/useApi';
import { usePolling } from '../../hooks/useDebounce';
import { greeting, formatDate, formatTime, formatDuration } from '../../services/format';
import { resolveAsset } from '../../services/format';
import PageHeader from '../../components/PageHeader';
import AttendanceCalendar from '../../components/attendance/AttendanceCalendar';
import { Card } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Avatar from '../../components/Avatar';
import { Skeleton } from '../../components/ui/Skeleton';

export default function EmployeeHome() {
  const { user } = useAuth();
  const emp = user?.employeeData || {};
  const now = new Date();

  const today = usePolling(async () => {
    const { data } = await api.get('/attendance/today');
    return data.data.rows?.[0]?.record || null;
  }, { interval: 45000 });

  const monthly = useApi(async () => {
    const { data } = await api.get(`/attendance/${user.employee}?year=${now.getFullYear()}&month=${now.getMonth()}`);
    return data.data;
  }, [user.employee]);

  const balance = useApi(async () => {
    const { data } = await api.get('/leaves/balance');
    return data.data;
  }, []);

  const rec = today.data;

  const actions = [
    {
      to: '/employee/attendance',
      label: rec?.checkInTime && !rec.checkOutTime ? 'Check Out' : 'Check In',
      icon: rec?.checkInTime && !rec.checkOutTime ? LogOut : LogIn,
      tone: 'bg-emerald-600 text-white',
    },
    { to: '/employee/history', label: 'My History', icon: History, tone: 'bg-brand-600 text-white' },
    { to: '/employee/leave', label: 'Apply Leave', icon: Plane, tone: 'bg-sky-600 text-white' },
    { to: '/employee/profile', label: 'My Profile', icon: Briefcase, tone: 'bg-violet-600 text-white' },
  ];

  return (
    <div>
      <PageHeader
        title={`${greeting()}, ${user?.name?.split(' ')[0]} 👋`}
        description={`Today is ${formatDate(new Date())}.`}
      />

      {/* Today status */}
      {today.loading && !rec ? (
        <Skeleton className="mb-6 h-44 rounded-2xl" />
      ) : (
        <Card className="mb-6 overflow-hidden">
          <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <Avatar name={user?.name} src={resolveAsset(emp.profilePhoto)} size="lg" />
              <div className="min-w-0">
                <p className="truncate font-bold text-slate-900 dark:text-slate-100">{emp.firstName} {emp.lastName}</p>
                <p className="text-xs text-slate-400">{emp.designation?.name || '—'} · {emp.department?.name || '—'}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {rec?.status ? <Badge>{rec.status}</Badge> : <Badge>Not Checked In</Badge>}
                  {rec?.faceVerified && <Badge>Face Verified</Badge>}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-center sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                <p className="flex items-center justify-center gap-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                  <Clock3 className="h-3.5 w-3.5" /> Check-in
                </p>
                <p className="mt-1 font-mono text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  {rec?.checkInTime ? formatTime(rec.checkInTime) : '—'}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                <p className="flex items-center justify-center gap-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                  <Clock3 className="h-3.5 w-3.5" /> Duration
                </p>
                <p className="mt-1 font-mono text-lg font-bold text-slate-700 dark:text-slate-200">
                  {rec?.checkOutTime ? formatDuration(rec.workingHoursMinutes) : (rec?.checkInTime ? 'In office' : '—')}
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {actions.map((a) => (
          <Link key={a.to} to={a.to} className="card flex items-center gap-3 p-4 transition hover:shadow-lift">
            <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${a.tone}`}><a.icon className="h-4.5 w-4.5" /></div>
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{a.label}</span>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="border-b px-5 py-4 dark:border-slate-700">
            <h2 className="font-bold text-slate-900 dark:text-slate-100">This Month</h2>
          </div>
          <div className="grid grid-cols-2 gap-px sm:grid-cols-4">
            <div className="p-5"><p className="text-xs font-medium text-slate-400">Present</p><p className="mt-1 text-2xl font-bold text-emerald-600">{monthly.data?.summary?.presentDays ?? '…'}</p></div>
            <div className="p-5"><p className="text-xs font-medium text-slate-400">Late</p><p className="mt-1 text-2xl font-bold text-amber-600">{monthly.data?.summary?.lateDays ?? '…'}</p></div>
            <div className="p-5"><p className="text-xs font-medium text-slate-400">Absent</p><p className="mt-1 text-2xl font-bold text-rose-600">{monthly.data?.summary?.absentDays ?? '…'}</p></div>
            <div className="p-5"><p className="text-xs font-medium text-slate-400">Hours</p><p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">{monthly.data?.summary ? formatDuration(monthly.data.summary.totalHours) : '…'}</p></div>
          </div>
          <div className="flex justify-end border-t px-5 py-3 dark:border-slate-700">
            <Link to="/employee/history" className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-400">View full history →</Link>
          </div>
        </Card>

        <Card>
          <div className="border-b px-5 py-4 dark:border-slate-700">
            <h2 className="font-bold text-slate-900 dark:text-slate-100">Leave Balance</h2>
          </div>
          {balance.data ? (
            <div className="p-5">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-4xl font-bold text-slate-900 dark:text-slate-100">{balance.data.remaining}</p>
                  <p className="text-xs text-slate-400">remaining of {balance.data.allowance} days</p>
                </div>
                <CalendarDays className="h-8 w-8 text-sky-500" />
              </div>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between text-slate-600 dark:text-slate-300"><span>Used</span><span className="font-semibold">{balance.data.used}</span></div>
                <div className="flex justify-between text-slate-600 dark:text-slate-300"><span>Pending</span><span className="font-semibold">{balance.data.pending}</span></div>
              </div>
              {Object.keys(balance.data.breakdown || {}).length > 0 && (
                <div className="mt-4 border-t pt-3 dark:border-slate-700">
                  {Object.entries(balance.data.breakdown).map(([type, days]) => (
                    <div key={type} className="flex justify-between py-0.5 text-xs text-slate-500 dark:text-slate-400">
                      <span>{type}</span><span className="font-semibold">{days}d</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="p-5 text-sm text-slate-400">Loading…</div>
          )}
        </Card>
      </div>

      {/* My Attendance calendar */}
      <div className="mt-6">
        <AttendanceCalendar />
      </div>
    </div>
  );
}
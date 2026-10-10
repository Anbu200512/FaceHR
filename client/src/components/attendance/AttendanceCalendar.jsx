import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../hooks/useApi';
import { formatDuration, MONTH_NAMES } from '../../services/format';
import { Card } from '../ui/Card';
import Badge from '../ui/Badge';
import { Skeleton } from '../ui/Skeleton';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const TONES = { Present: 'emerald', Late: 'amber', 'Half Day': 'violet', Absent: 'rose', 'On Leave': 'sky', Weekend: 'slate' };
const STATUS_LIST = ['Present', 'Late', 'Half Day', 'Absent', 'On Leave', 'Weekend'];

function dot(status) {
  const map = { Present: 'bg-emerald-500', Late: 'bg-amber-500', 'Half Day': 'bg-violet-500', Absent: 'bg-rose-500', 'On Leave': 'bg-sky-500', Leave: 'bg-sky-500' };
  return map[status] || 'bg-slate-200';
}

export default function AttendanceCalendar({ className }) {
  const { user } = useAuth();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selected, setSelected] = useState(null);

  const { data, loading } = useApi(async () => {
    const res = await api.get(`/attendance/${user.employee}?year=${year}&month=${month}`);
    return res.data.data;
  }, [user.employee, year, month]);

  const shift = (d) => {
    let m = month + d;
    let y = year;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    setMonth(m);
    setYear(y);
    setSelected(null);
  };

  const firstWeekday = new Date(year, month, 1).getDay();
  const s = data?.summary;

  return (
    <Card className={className}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <CalendarCheck className="h-5 w-5 text-brand-600 dark:text-brand-400" />
          <h2 className="font-bold text-slate-900 dark:text-slate-100">My Attendance</h2>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => shift(-1)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800" aria-label="Previous month">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-28 text-center text-sm font-bold text-slate-800 dark:text-slate-100">
            {MONTH_NAMES[month]} {year}
          </span>
          <button onClick={() => shift(1)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800" aria-label="Next month">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="px-5 pt-4">
        {s ? (
          <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
            <span><b className="text-emerald-600">{s.presentDays}</b> present</span>
            <span><b className="text-amber-600">{s.lateDays}</b> late</span>
            <span><b className="text-rose-600">{s.absentDays}</b> absent</span>
            <span><b className="text-sky-600">{s.leaveDays}</b> leave</span>
            <span className="font-semibold text-slate-700 dark:text-slate-200">{s.totalHours ? formatDuration(s.totalHours) : '0h'} worked</span>
          </div>
        ) : (
          <div className="mb-4 h-4" />
        )}

        {loading && !data ? (
          <div className="grid grid-cols-7 gap-1.5">
            {Array.from({ length: 28 }).map((_, i) => (
              <Skeleton key={i} className="h-10 rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {WEEKDAYS.map((d) => (
              <div key={d} className="py-0.5 text-center text-[9px] font-bold uppercase tracking-wide text-slate-400">{d}</div>
            ))}
            {Array.from({ length: firstWeekday }).map((_, i) => (
              <div key={`pad-${i}`} />
            ))}
            {data?.days?.map((d) => (
              <button
                key={d.date}
                onClick={() => setSelected(selected?.date === d.date ? null : d)}
                className={`relative flex h-7 items-center justify-center rounded-md text-xs font-semibold transition ${
                  selected?.date === d.date
                    ? 'bg-brand-600 text-white shadow'
                    : d.isWeekend
                      ? 'text-slate-300 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                      : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                {d.day}
                <span className={`absolute bottom-0.5 h-1 w-1 rounded-full ${dot(d.status)}`} />
              </button>
            ))}
          </div>
        )}

        {selected && (
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-slate-200 px-4 py-2.5 dark:border-slate-700">
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <span className={`h-2 w-2 rounded-full ${dot(selected.status)}`} />
              <b className="text-slate-700 dark:text-slate-200">
                {new Date(selected.date).toLocaleDateString(undefined, { weekday: 'short', day: '2-digit', month: 'short' })}
              </b>
            </span>
            <span className="text-[11px] uppercase tracking-wide text-slate-400">In</span>
            <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
              {selected.record?.checkInTime ? new Date(selected.record.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
            </span>
            <span className="text-[11px] uppercase tracking-wide text-slate-400">Out</span>
            <span className="font-mono text-xs font-bold text-rose-600 dark:text-rose-400">
              {selected.record?.checkOutTime ? new Date(selected.record.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
            </span>
            <span className="text-[11px] uppercase tracking-wide text-slate-400">Hours</span>
            <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-200">
              {selected.record?.workingHoursMinutes ? formatDuration(selected.record.workingHoursMinutes) : '—'}
            </span>
            <Badge tone={TONES[selected.status]} className="ml-auto">{selected.status}</Badge>
          </div>
        )}

        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-xs">
            <thead>
              <tr className="border-b text-left text-[9px] font-bold uppercase tracking-wide text-slate-400 dark:border-slate-700">
                <th className="py-1.5 pr-3">Date</th>
                <th className="py-1.5 pr-3">Status</th>
                <th className="py-1.5 pr-3">Check-in</th>
                <th className="py-1.5 pr-3">Check-out</th>
                <th className="py-1.5 text-right">Total Hours</th>
              </tr>
            </thead>
            <tbody>
              {(data?.days || []).map((d) => (
                <tr
                  key={d.date}
                  onClick={() => setSelected(selected?.date === d.date ? null : d)}
                  className={`cursor-pointer border-b transition last:border-0 dark:border-slate-700/60 ${
                    selected?.date === d.date ? 'bg-brand-50 dark:bg-brand-500/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <td className="py-1.5 pr-3 font-semibold text-slate-700 dark:text-slate-200">
                    {new Date(d.date).toLocaleDateString(undefined, { weekday: 'short', day: '2-digit', month: 'short' })}
                  </td>
                  <td className="py-1.5 pr-3">
                    <span className={`inline-flex items-center gap-1.5 font-medium ${d.isWeekend ? 'text-slate-400' : 'text-slate-600 dark:text-slate-300'}`}>
                      <span className={`h-2 w-2 rounded-full ${dot(d.status)}`} /> {d.status}
                    </span>
                  </td>
                  <td className="py-1.5 pr-3 font-mono text-slate-600 dark:text-slate-300">
                    {d.record?.checkInTime ? new Date(d.record.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                  </td>
                  <td className="py-1.5 pr-3 font-mono text-slate-600 dark:text-slate-300">
                    {d.record?.checkOutTime ? new Date(d.record.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                  </td>
                  <td className="py-1.5 text-right font-mono font-semibold text-slate-700 dark:text-slate-200">
                    {d.record?.workingHoursMinutes ? formatDuration(d.record.workingHoursMinutes) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t py-3 dark:border-slate-700">
          <div className="flex flex-wrap gap-2.5">
            {STATUS_LIST.map((st) => (
              <span key={st} className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
                <span className={`h-2 w-2 rounded-full ${dot(st)}`} /> {st}
              </span>
            ))}
          </div>
          <Link to="/employee/history" className="text-xs font-medium text-brand-600 hover:underline dark:text-brand-400">
            Full history →
          </Link>
        </div>
      </div>
    </Card>
  );
}
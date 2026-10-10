import { useState } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../hooks/useApi';
import { formatDuration } from '../../services/format';
import PageHeader from '../../components/PageHeader';
import { Card } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { SkeletonGrid } from '../../components/ui/Skeleton';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const TONES = { Present: 'emerald', Late: 'amber', 'Half Day': 'violet', Absent: 'rose', 'On Leave': 'sky', Weekend: 'slate' };

export default function History() {
  const { user } = useAuth();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selected, setSelected] = useState(null);

  const { data, loading } = useApi(async () => {
    const { data } = await api.get(`/attendance/${user.employee}?year=${year}&month=${month}`);
    return data.data;
  }, [user.employee, year, month]);

  const shift = (d) => {
    let m = month + d, y = year;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    setMonth(m); setYear(y); setSelected(null);
  };

  const firstWeekday = new Date(year, month, 1).getDay();
  const s = data?.summary;

  return (
    <div>
      <PageHeader title="My Attendance History" description="A complete month-by-month view of your attendance." />

      <Card className="mb-5 flex flex-wrap items-center gap-3 p-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => shift(-1)}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{MONTHS[month]} {year}</span>
          <Button variant="ghost" onClick={() => shift(1)}><ChevronRight className="h-4 w-4" /></Button>
        </div>
        <div className="text-xs text-slate-400">
          {s && (
            <>
              <b className="text-emerald-600">{s.presentDays}</b> present · <b className="text-amber-600">{s.lateDays}</b> late ·{' '}
              <b className="text-rose-600">{s.absentDays}</b> absent · <b className="text-sky-600">{s.leaveDays}</b> leave ·{' '}
              <b className="text-slate-700 dark:text-slate-200">{s.totalHours ? formatDuration(s.totalHours) : '0h'}</b> worked
            </>
          )}
        </div>
      </Card>

      {loading && !data ? (
        <SkeletonGrid count={3} />
      ) : (
        <>
          <Card className="overflow-hidden">
            <div className="grid grid-cols-7 gap-px bg-slate-100 text-center dark:bg-slate-700/60">
              {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d) => (
                <div key={d} className="bg-white px-2 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:bg-slate-800/80">{d}</div>
              ))}
              {Array.from({ length: firstWeekday }).map((_, i) => <div key={`pad-${i}`} className="bg-white px-2 py-3 dark:bg-slate-800/80" />)}
              {data?.days?.map((d) => (
                <button
                  key={d.date}
                  onClick={() => setSelected(d)}
                  className={`bg-white px-1 py-2.5 text-center transition dark:bg-slate-800/80 ${d.isWeekend ? 'bg-slate-50/90 dark:bg-slate-800/40' : ''}`}
                >
                  <span className={`text-xs font-semibold ${d.isWeekend ? 'text-slate-300 dark:text-slate-500' : 'text-slate-700 dark:text-slate-200'}`}>
                    {d.day}
                  </span>
                  <span
                    className={`mx-auto mt-1 block h-1.5 w-1.5 rounded-full ${TONE_DOT(d.status)}`}
                  />
                </button>
              ))}
            </div>
          </Card>

          {selected && (
            <Card className="mt-6">
              <div className="border-b px-5 py-4 dark:border-slate-700">
                <h2 className="font-bold text-slate-900 dark:text-slate-100">
                  {new Date(selected.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </h2>
              </div>
              <div className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-4">
                <div className="rounded-xl border border-slate-200 p-4 text-center dark:border-slate-700">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Status</p>
                  <div className="mt-1"><Badge tone={TONES[selected.status]}>{selected.status}</Badge></div>
                </div>
                <div className="rounded-xl border border-slate-200 p-4 text-center dark:border-slate-700">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Check-in</p>
                  <p className="mt-1 font-mono font-bold text-slate-800 dark:text-slate-100">
                    {selected.record?.checkInTime ? new Date(selected.record.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 p-4 text-center dark:border-slate-700">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Check-out</p>
                  <p className="mt-1 font-mono font-bold text-slate-800 dark:text-slate-100">
                    {selected.record?.checkOutTime ? new Date(selected.record.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 p-4 text-center dark:border-slate-700">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Working</p>
                  <p className="mt-1 font-mono font-bold text-slate-800 dark:text-slate-100">
                    {selected.record?.workingHoursMinutes ? formatDuration(selected.record.workingHoursMinutes) : '—'}
                  </p>
                </div>
              </div>
              {/* Legend */}
              <div className="flex flex-wrap gap-3 border-t px-5 py-3 dark:border-slate-700">
                {['Present', 'Late', 'Absent', 'On Leave', 'Half Day', 'Weekend'].map((st) => (
                  <span key={st} className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <span className={`h-2 w-2 rounded-full ${TONE_DOT(st)}`} /> {st}
                  </span>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function TONE_DOT(status) {
  const map = { Present: 'bg-emerald-500', Late: 'bg-amber-500', 'Half Day': 'bg-violet-500', Absent: 'bg-rose-500', 'On Leave': 'bg-sky-500', Leave: 'bg-sky-500' };
  return map[status] || 'bg-slate-200';
}
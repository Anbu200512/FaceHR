import { useEffect, useState } from 'react';
import { Search, X, Save, CalendarCheck, AlertTriangle } from 'lucide-react';
import api, { extractError } from '../../services/api';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import { formatDate, formatTime, formatDuration, toDateKey } from '../../services/format';
import PageHeader from '../../components/PageHeader';
import { Card } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import TimeInput from '../../components/ui/TimeInput';
import { SkeletonRow } from '../../components/ui/Skeleton';
import { ATTENDANCE_STATUSES } from '../../services/static';

const NO_TIMES = ['Absent', 'On Leave'];
const pad = (n) => String(n).padStart(2, '0');

function isoToTimeKey(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function ManualAttendance() {
  const toast = useToast();
  const todayKey = toDateKey(new Date());

  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [employee, setEmployee] = useState(null);
  const [date, setDate] = useState(todayKey);
  const [record, setRecord] = useState(null);
  const [recordLoading, setRecordLoading] = useState(false);
  const [recordLoaded, setRecordLoaded] = useState(false);

  const [status, setStatus] = useState('Present');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  // Debounce the employee search.
  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const emps = useApi(async () => {
    if (!query) return [];
    const { data } = await api.get(
      `/employees?page=1&pageSize=100&status=Active&search=${encodeURIComponent(query)}`
    );
    return data.data || [];
  }, [query]);

  const results = query && !employee ? emps.data || [] : [];

  const isWeekendDay = (() => {
    if (!date) return false;
    const d = new Date(`${date}T00:00:00`);
    return d.getDay() === 0 || d.getDay() === 6;
  })();

  const loadRecord = async (empId, dayKey) => {
    if (!empId || !dayKey) {
      setRecord(null);
      setRecordLoaded(false);
      return;
    }
    setRecordLoading(true);
    try {
      const d = new Date(`${dayKey}T00:00:00`);
      const { data } = await api.get(
        `/attendance/${empId}?year=${d.getFullYear()}&month=${d.getMonth()}`
      );
      const day = (data.data.days || []).find((x) => x.date === dayKey);
      const rec = day?.record || null;
      setRecord(rec);
      setRecordLoaded(true);
      // Prefill the form from the stored record (or sensible defaults).
      setStatus(rec?.status || 'Present');
      setCheckIn(isoToTimeKey(rec?.checkInTime));
      setCheckOut(isoToTimeKey(rec?.checkOutTime));
      setNote(rec?.note || '');
    } catch (err) {
      setRecord(null);
      setRecordLoaded(false);
      toast.error(extractError(err, 'Could not load attendance for that day'));
    } finally {
      setRecordLoading(false);
    }
  };

  useEffect(() => {
    setRecord(null);
    setRecordLoaded(false);
    loadRecord(employee?._id, date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employee?._id, date]);

  const hideTimes = NO_TIMES.includes(status);

  const handleSkip = () => {
    // Discard edits and restore whatever is stored (or blank defaults).
    setStatus(record?.status || 'Present');
    setCheckIn(isoToTimeKey(record?.checkInTime));
    setCheckOut(isoToTimeKey(record?.checkOutTime));
    setNote(record?.note || '');
    toast.info('Changes discarded');
  };

  const handleSave = async () => {
    if (!employee) return;
    if (!date) { toast.error('Please pick a date'); return; }
    if (!hideTimes && !checkIn) { toast.error('Check-in time is required for this status'); return; }
    if (!hideTimes && checkOut && checkOut <= checkIn) {
      toast.error('Check-out time must be after check-in time');
      return;
    }

    setBusy(true);
    try {
      const payload = { date, status, note: note.trim() || undefined };
      if (!hideTimes) {
        payload.checkIn = checkIn;
        if (checkOut) payload.checkOut = checkOut;
      }
      const { data } = await api.put(`/attendance/admin/${employee._id}/mark`, payload);
      toast.success(data.message || 'Attendance saved');
      await loadRecord(employee._id, date);
    } catch (err) {
      toast.error(extractError(err, 'Failed to save attendance'));
    } finally {
      setBusy(false);
    }
  };

  const clearEmployee = () => {
    setEmployee(null);
    setSearch('');
    setQuery('');
    setRecord(null);
    setRecordLoaded(false);
    setStatus('Present');
    setCheckIn('');
    setCheckOut('');
    setNote('');
  };

  return (
    <div>
      <PageHeader
        title="Manual Attendance"
        description="Create or edit any employee's attendance for a past date or today — no face photo required."
      />

      <Card className="mb-5 p-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="relative">
            <label className="label">Employee</label>
            {employee ? (
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800/60">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {employee.firstName} {employee.lastName}
                  </p>
                  <p className="truncate text-xs text-slate-400">
                    {employee.employeeId}
                    {employee.department?.name ? ` · ${employee.department.name}` : ''}
                  </p>
                </div>
                <button
                  onClick={clearEmployee}
                  className="ml-2 rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600 dark:hover:bg-slate-700"
                  aria-label="Clear employee"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name or employee ID…"
                    className="input pl-9"
                    aria-label="Search employees"
                  />
                </div>
                {query && (
                  <div className="mt-2 max-h-56 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700">
                    {emps.loading ? (
                      <div className="p-2">
                        <SkeletonRow cols={2} />
                      </div>
                    ) : results.length === 0 ? (
                      <p className="px-3 py-2.5 text-sm text-slate-400">No active employees found.</p>
                    ) : (
                      results.map((emp) => (
                        <button
                          key={emp._id}
                          onClick={() => setEmployee(emp)}
                          className="flex w-full items-center justify-between px-3 py-2.5 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/60"
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium text-slate-700 dark:text-slate-200">
                              {emp.firstName} {emp.lastName}
                            </span>
                            <span className="block truncate text-xs text-slate-400">
                              {emp.employeeId}
                              {emp.department?.name ? ` · ${emp.department.name}` : ''}
                            </span>
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          <div>
            <label className="label">Date</label>
            <input
              type="date"
              value={date}
              max={todayKey}
              onChange={(e) => setDate(e.target.value)}
              className="input"
            />
            <p className="mt-1.5 text-xs text-slate-400">Past dates and today are allowed. Future dates are blocked.</p>
          </div>
        </div>

        {isWeekendDay && (
          <p className="mt-3 flex items-start gap-1.5 text-xs text-amber-600 dark:text-amber-400">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            This is a weekend. Stored records are saved correctly, but the monthly calendar still displays weekends as “Weekend”.
          </p>
        )}
      </Card>

      {!employee ? (
        <Card>
          <EmptyState
            title="Select an employee to begin"
            message="Search for an employee above, then review or correct their attendance for the chosen date."
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {/* Current record */}
          <Card className="p-5">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              <CalendarCheck className="h-4 w-4" /> Current record
            </h3>
            {recordLoading ? (
              <div className="space-y-2">
                <SkeletonRow cols={2} />
                <SkeletonRow cols={3} />
              </div>
            ) : !recordLoaded ? (
              <EmptyState title="Pick a date" message="Choose a date to see what's stored for this employee." />
            ) : !record ? (
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">No record stored</p>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  Nothing is saved for {formatDate(`${date}T00:00:00`)} yet. Saving will create one.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge>{record.status}</Badge>
                  <span className="text-xs text-slate-400">
                    {record.faceVerified ? 'Face verified' : 'Manually marked'}
                  </span>
                </div>
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-xs text-slate-400">Check-in</dt>
                    <dd className="font-semibold text-slate-700 dark:text-slate-200">
                      {record.checkInTime ? formatTime(record.checkInTime) : '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-400">Check-out</dt>
                    <dd className="font-semibold text-slate-700 dark:text-slate-200">
                      {record.checkOutTime ? formatTime(record.checkOutTime) : '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-400">Working hours</dt>
                    <dd className="font-semibold text-slate-700 dark:text-slate-200">
                      {record.workingHoursMinutes ? formatDuration(record.workingHoursMinutes) : '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-400">Late by</dt>
                    <dd className="font-semibold text-slate-700 dark:text-slate-200">
                      {record.lateMinutes ? `${record.lateMinutes}m` : '—'}
                    </dd>
                  </div>
                </dl>
                {record.note && (
                  <div>
                    <p className="text-xs text-slate-400">Note</p>
                    <p className="text-sm text-slate-600 dark:text-slate-300">{record.note}</p>
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Edit form */}
          <Card className="p-5">
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {record ? 'Edit attendance' : 'Mark attendance'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="label">Status</label>
                <select value={status} onChange={(e) => setStatus(e.target.value)} className="input">
                  {ATTENDANCE_STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {!hideTimes && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Check-in *</label>
                    <TimeInput value={checkIn} onChange={setCheckIn} />
                  </div>
                  <div>
                    <label className="label">Check-out</label>
                    <TimeInput value={checkOut} onChange={setCheckOut} />
                  </div>
                </div>
              )}

              <div>
                <label className="label">
                  Note <span className="font-normal text-slate-400">(optional — skip if not needed)</span>
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder="e.g. Forgot to check in — arrived at 10:15"
                  className="input resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button variant="ghost" onClick={handleSkip} disabled={busy}>
                  Skip
                </Button>
                <Button variant="primary" onClick={handleSave} loading={busy}>
                  <Save className="h-4 w-4" /> Save
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

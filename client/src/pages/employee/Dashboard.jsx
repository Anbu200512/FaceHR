import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LogIn, LogOut, CalendarDays, History, Plane, Briefcase, Clock3, CheckCircle2, AlertCircle } from 'lucide-react';
import api, { extractError } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../hooks/useApi';
import { usePolling } from '../../hooks/useDebounce';
import { greeting, formatDate, formatTime, formatDuration, resolveAsset } from '../../services/format';
import { fetchMyAttendanceSettings, resolveGeoGate } from '../../services/attendanceSettings';
import { useToast } from '../../context/ToastContext';
import PageHeader from '../../components/PageHeader';
import { Card } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Avatar from '../../components/Avatar';
import { Skeleton } from '../../components/ui/Skeleton';
import FaceCapture from '../../components/FaceCapture';
import Modal from '../../components/ui/Modal';

function formatClock(hhmm) {
  if (!hhmm || typeof hhmm !== 'string') return '-';
  const [hStr, mStr] = hhmm.split(':');
  const h = Number(hStr);
  const m = Number(mStr || 0);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return hhmm;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

export default function EmployeeHome() {
  const { user } = useAuth();
  const toast = useToast();
  const emp = user?.employeeData || {};
  const now = new Date();

  const today = usePolling(async () => {
    const { data } = await api.get('/attendance/today', { noCache: true });
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

  const [punchMode, setPunchMode] = useState(null);
  const [punching, setPunching] = useState(false);
  const [punchError, setPunchError] = useState(null);
  const [punchStatus, setPunchStatus] = useState(null);
  const [punchLocation, setPunchLocation] = useState(null);
  const [punchMeta, setPunchMeta] = useState(null);
  const [inlineCapture, setInlineCapture] = useState(false);
  const [captureKey, setCaptureKey] = useState(0);
  const [liveNow, setLiveNow] = useState(Date.now());
  const [office, setOffice] = useState(null);

  const rec = today.data;
  const canCheckIn = !rec?.checkInTime;
  const canCheckOut = Boolean(rec?.checkInTime && !rec?.checkOutTime);

  useEffect(() => {
    let active = true;
    fetchMyAttendanceSettings()
      .then((s) => { if (active) setOffice(s.office || null); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!rec?.checkInTime || rec?.checkOutTime) return undefined;
    setLiveNow(Date.now());
    const t = setInterval(() => setLiveNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, [rec?.checkInTime, rec?.checkOutTime]);

  const liveMinutes = rec?.checkInTime && !rec?.checkOutTime
    ? Math.max(0, Math.round((liveNow - new Date(rec.checkInTime).getTime()) / 60000))
    : 0;

  const startPunch = async (nextMode) => {
    if (punching) return;
    const allowed = nextMode === 'checkin' ? canCheckIn : canCheckOut;
    if (!allowed) return;
    setPunchMode(nextMode);
    setPunchError(null);
    setPunchStatus(null);
    setPunchLocation(null);
    setPunchMeta(null);
    setInlineCapture(false);
    setPunching(true);
    try {
      const s = await fetchMyAttendanceSettings();
      setOffice(s.office || null);
      setPunchStatus({ stage: 'verifying', message: s.geoEnabled === false ? 'Preparing attendance…' : 'Verifying your location…' });
      const geo = await resolveGeoGate(s);
      if (!geo.ok) {
        setPunchStatus(null);
        setPunchError(geo);
        return;
      }
      setPunchLocation(geo.location);
      const meta = { distance: geo.distance ?? null, allowed: geo.allowed ?? null, name: s.location?.name };
      setPunchMeta(meta);
      if (s.faceEnabled === false) {
        const endpoint = nextMode === 'checkin' ? 'check-in' : 'check-out';
        const { data } = await api.post(`/attendance/${endpoint}`, { location: geo.location });
        setPunchStatus(null);
        await today.refetch();
        const d = data.data || {};
        const msg = nextMode === 'checkin'
          ? `Checked in ${formatTime(d.checkInTime)}${d.status === 'Late' ? ` • Late${d.lateMinutes ? ` by ${d.lateMinutes} min` : ''}` : ' • On time'}`
          : `Checked out ${formatTime(d.checkOutTime)} • ${formatDuration(d.workingHoursMinutes)}`;
        toast.success(msg);
      } else {
        setPunchStatus(null);
        setCaptureKey((k) => k + 1);
        setInlineCapture(true);
      }
    } catch (err) {
      setPunchStatus(null);
      setPunchError({
        code: err?.response?.data?.code || 'UNKNOWN',
        message: extractError(err, 'Could not verify your location. Please try again.'),
      });
    } finally {
      setPunching(false);
    }
  };

  const submitPunch = async ({ blob, descriptor }) => {
    const fd = new FormData();
    fd.append('image', blob, 'face.jpg');
    fd.append('descriptor', JSON.stringify(Array.from(descriptor)));
    if (punchLocation) {
      fd.append('location', JSON.stringify({ latitude: punchLocation.latitude, longitude: punchLocation.longitude }));
    }
    try {
      const endpoint = punchMode === 'checkin' ? 'check-in' : 'check-out';
      const { data } = await api.post(`/attendance/${endpoint}`, fd);
      await today.refetch();
      return { ok: true, message: data.message, data: data.data, summary: data.summary };
    } catch (err) {
      return {
        ok: false,
        message: err?.response?.data?.message || extractError(err, 'Verification failed. Please try again.'),
        code: err?.response?.data?.code,
      };
    }
  };

  const actions = [
    { to: '/employee/history', label: 'My History', icon: History, tone: 'bg-brand-600 text-white' },
    { to: '/employee/leave', label: 'Apply Leave', icon: Plane, tone: 'bg-sky-600 text-white' },
    { to: '/employee/profile', label: 'My Profile', icon: Briefcase, tone: 'bg-violet-600 text-white' },
  ];

  const durationDisplay = rec?.checkOutTime
    ? formatDuration(rec.workingHoursMinutes)
    : rec?.checkInTime
      ? formatDuration(liveMinutes)
      : '-';

  const shiftLabel = office ? `${formatClock(office.officeStartTime)} – ${formatClock(office.officeEndTime)}` : null;
  const graceLabel = office ? (office.lateEnabled === false ? 'Late marking off' : `${Number(office.graceMinutes || 0)} min grace`) : null;

  return (
    <div>
      <PageHeader
        title={`${greeting()}, ${user?.name?.split(' ')[0] || 'there'}`}
        description={`Today is ${formatDate(new Date())}.${shiftLabel ? ` Shift: ${shiftLabel}${graceLabel ? ` (${graceLabel})` : ''}.` : ''}`}
      />

      {today.loading && !rec ? (
        <Skeleton className="mb-6 h-56 rounded-2xl" />
      ) : (
        <Card className="mb-6 overflow-hidden">
          <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <Avatar name={user?.name} src={resolveAsset(emp.profilePhoto)} size="lg" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-slate-900 dark:text-slate-100">
                  {[emp.firstName, emp.middleName, emp.lastName].filter(Boolean).join(' ') || user?.name}
                </p>
                <p className="break-words text-xs text-slate-400 dark:text-slate-300">
                  {emp.designation?.name || '-'} • {emp.department?.name || '-'}
                  {emp.employmentType ? ` • ${emp.employmentType}` : ''}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {rec?.status ? <Badge>{rec.status}</Badge> : <Badge>Not Checked In</Badge>}
                  {rec?.faceVerified && <Badge>Face Verified</Badge>}
                  {rec?.status === 'Late' && rec?.lateMinutes ? <Badge>Late by {rec.lateMinutes} min</Badge> : null}
                </div>
              </div>
            </div>
            <div className="grid w-full grid-cols-1 gap-4 text-center sm:w-auto sm:min-w-[260px] sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                <p className="flex items-center justify-center gap-1 text-[11px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-300">
                  <Clock3 className="h-3.5 w-3.5" /> Check-in
                </p>
                <p className="mt-1 font-mono text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  {rec?.checkInTime ? formatTime(rec.checkInTime) : '-'}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                <p className="flex items-center justify-center gap-1 text-[11px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-300">
                  <Clock3 className="h-3.5 w-3.5" /> Duration
                </p>
                <p className="mt-1 font-mono text-lg font-bold text-slate-700 dark:text-slate-200">
                  {durationDisplay}
                </p>
                {rec?.checkInTime && !rec?.checkOutTime && (
                  <p className="mt-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">Live</p>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {canCheckOut ? (
          <button
            type="button"
            onClick={() => startPunch('checkout')}
            disabled={punching}
            className="card flex items-center gap-3 p-4 text-left transition hover:shadow-lift disabled:cursor-not-allowed disabled:opacity-60"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-600 text-white">
              <LogOut className="h-4.5 w-4.5" />
            </div>
            <span className="min-w-0 break-words text-xs font-semibold text-slate-700 dark:text-slate-200">
              {punching && punchMode === 'checkout' ? 'Checking out…' : 'Check Out'}
            </span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => startPunch('checkin')}
            disabled={punching || (!canCheckIn && !canCheckOut)}
            className="card flex items-center gap-3 p-4 text-left transition hover:shadow-lift disabled:cursor-not-allowed disabled:opacity-60"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white">
              <LogIn className="h-4.5 w-4.5" />
            </div>
            <span className="min-w-0 break-words text-xs font-semibold text-slate-700 dark:text-slate-200">
              {punching && punchMode === 'checkin' ? 'Checking in…' : !canCheckIn && !canCheckOut ? 'Attendance Completed' : 'Check In'}
            </span>
          </button>
        )}
        {actions.map((a) => (
          <Link key={a.to} to={a.to} className="card flex items-center gap-3 p-4 transition hover:shadow-lift">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${a.tone}`}>
              <a.icon className="h-4.5 w-4.5" />
            </div>
            <span className="min-w-0 break-words text-xs font-semibold text-slate-700 dark:text-slate-200">{a.label}</span>
          </Link>
        ))}
      </div>

            <Modal
        open={(!inlineCapture && !!punchStatus && punchStatus.stage === 'verifying') || !!punchError}
        onClose={() => {
          if (punchStatus?.stage === 'verifying') return;
          setPunchError(null);
          setPunchStatus(null);
        }}
        title={punchError ? "Couldn't mark attendance" : 'Verifying location'}
        size="sm"
      >
        {punchStatus?.stage === 'verifying' && !punchError && (
          <div className="flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300">
            <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent" />
            <span>{punchStatus.message}</span>
          </div>
        )}
        {punchError && (
          <div className={`flex gap-2 rounded-xl border px-4 py-3 text-sm ${punchError.code === 'OUTSIDE_ALLOWED_AREA' ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-400' : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400'}`}>
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div><p className="font-medium">Couldn't mark attendance</p><p className="mt-0.5">{punchError.message}</p></div>
          </div>
        )}
      </Modal>

<Modal
        open={inlineCapture}
        onClose={() => {
          setInlineCapture(false);
          setPunchStatus(null);
          today.refetch();
        }}
        title={punchMode === 'checkout' ? 'Check Out' : 'Check In'}
        subtitle="Look at the camera. Your face will be verified automatically."
        size="md"
        panelClassName="sm:max-h-[calc(100dvh-2rem)]"
        bodyClassName="p-3 sm:p-4"
      >
        <FaceCapture
          key={`${punchMode}-${captureKey}`}
          mode="attendance"
          embedded
          autoCloseOnSuccess
          onCaptured={submitPunch}
          onClose={(result) => {
            setInlineCapture(false);
            setPunchStatus(null);
            today.refetch();
            if (result?.ok) {
              const d = result.data || {};
              const msg = punchMode === 'checkin'
                ? `Checked in ${formatTime(d.checkInTime)}${d.status === 'Late' ? ` • Late${d.lateMinutes ? ` by ${d.lateMinutes} min` : ''}` : ' • On time'}`
                : `Checked out ${formatTime(d.checkOutTime)} • ${formatDuration(d.workingHoursMinutes)}`;
              toast.success(msg);
            }
          }}
        />
      </Modal>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="border-b px-5 py-4 dark:border-slate-700">
            <h2 className="font-bold text-slate-900 dark:text-slate-100">This Month</h2>
          </div>
          {monthly.data ? (
            <div className="grid grid-cols-2 gap-px sm:grid-cols-4">
              <div className="p-5"><p className="text-xs font-medium text-slate-400 dark:text-slate-300">Present</p><p className="mt-1 text-2xl font-bold text-emerald-600">{monthly.data.summary?.presentDays ?? 0}</p></div>
              <div className="p-5"><p className="text-xs font-medium text-slate-400 dark:text-slate-300">Late</p><p className="mt-1 text-2xl font-bold text-amber-600">{monthly.data.summary?.lateDays ?? 0}</p></div>
              <div className="p-5"><p className="text-xs font-medium text-slate-400 dark:text-slate-300">Absent</p><p className="mt-1 text-2xl font-bold text-rose-600">{monthly.data.summary?.absentDays ?? 0}</p></div>
              <div className="p-5"><p className="text-xs font-medium text-slate-400 dark:text-slate-300">Hours</p><p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">{formatDuration(monthly.data.summary?.totalHours || 0)}</p></div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-8 w-12" />
                </div>
              ))}
            </div>
          )}
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
                  <p className="text-xs text-slate-400 dark:text-slate-300">remaining of {balance.data.allowance} days</p>
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
                    <div key={type} className="flex justify-between py-0.5 text-xs text-slate-500 dark:text-slate-300">
                      <span>{type}</span><span className="font-semibold">{days}d</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4 p-5">
              <div className="flex items-end justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-10 w-16" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-8 w-8 rounded-lg" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

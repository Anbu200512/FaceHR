import { useState, useEffect, useCallback } from 'react';
import { LogIn, LogOut, Clock3, MapPin, CheckCircle2, AlertCircle } from 'lucide-react';
import api, { extractError } from '../../services/api';
import { usePolling } from '../../hooks/useDebounce';
import { formatTime, formatDuration } from '../../services/format';
import { fetchMyAttendanceSettings, resolveGeoGate } from '../../services/attendanceSettings';
import PageHeader from '../../components/PageHeader';
import { Card } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
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

export default function FaceAttendance() {
  const [mode, setMode] = useState(null);
  const [record, setRecord] = useState(null);
  const [dupHint, setDupHint] = useState(null);
  const [settings, setSettings] = useState(null);
  const [office, setOffice] = useState(null);
  const [inlineCapture, setInlineCapture] = useState(false);
  const [gating, setGating] = useState(false);
  const [gateError, setGateError] = useState(null);
  const [gateStatus, setGateStatus] = useState(null);
  const [capturedLocation, setCapturedLocation] = useState(null);
  const [gateMeta, setGateMeta] = useState(null);
  const [punchResult, setPunchResult] = useState(null);
  const [captureKey, setCaptureKey] = useState(0);

  const loadSettings = useCallback(async () => {
    try {
      const s = await fetchMyAttendanceSettings();
      setSettings(s);
      setOffice(s.office || null);
    } catch (_e) {
      // keep last known settings
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const today = usePolling(async () => {
    const { data } = await api.get('/attendance/today', { noCache: true });
    return data.data.rows?.[0]?.record || null;
  }, { interval: 30000 });

  const rec = today.data || record;
  const canCheckIn = !rec?.checkInTime;
  const canCheckOut = Boolean(rec?.checkInTime && !rec?.checkOutTime);

  const startAction = async (nextMode) => {
    if (gating) return;
    const allowed = nextMode === 'checkin' ? canCheckIn : canCheckOut;
    if (!allowed) return;

    setMode(nextMode);
    setDupHint(null);
    setGateError(null);
    setGateStatus(null);
    setCapturedLocation(null);
    setGateMeta(null);
    setPunchResult(null);
    setInlineCapture(false);
    setGating(true);
    try {
      const s = await fetchMyAttendanceSettings();
      setSettings(s);
      setOffice(s.office || null);
      setGateStatus({ stage: 'verifying', message: s.geoEnabled === false ? 'Preparing attendance…' : 'Verifying your location…' });

      const geo = await resolveGeoGate(s);
      if (!geo.ok) {
        setGateStatus(null);
        setGateError(geo);
        return;
      }

      setCapturedLocation(geo.location);
      const meta = { distance: geo.distance ?? null, allowed: geo.allowed ?? null, location: geo.location || null, name: s.location?.name };
      setGateMeta(meta);
      if (s.faceEnabled === false) {
        const endpoint = nextMode === 'checkin' ? 'check-in' : 'check-out';
        const { data } = await api.post(`/attendance/${endpoint}`, { location: geo.location });
        setRecord(data.data || null);
        setGateStatus(null);
        setPunchResult({ ok: true, data: data.data, message: data.message, mode: nextMode, geo: meta });
        today.refetch?.();
      } else {
        setGateStatus({ stage: 'verified', message: s.geoEnabled === false ? 'Opening camera…' : `Location verified${geo.distance != null ? ` (${geo.distance} m from site)` : ''}. Opening camera…` });
        setCaptureKey((k) => k + 1);
        setInlineCapture(true);
      }
    } catch (err) {
      setGateStatus(null);
      setGateError({
        code: err?.response?.data?.code || 'UNKNOWN',
        message: extractError(err, 'Could not verify your location. Please try again.'),
      });
    } finally {
      setGating(false);
    }
  };

  const submit = async ({ blob, descriptor }) => {
    const fd = new FormData();
    fd.append('image', blob, 'face.jpg');
    fd.append('descriptor', JSON.stringify(Array.from(descriptor)));
    if (capturedLocation) {
      fd.append('location', JSON.stringify({ latitude: capturedLocation.latitude, longitude: capturedLocation.longitude }));
    }
    try {
      const endpoint = mode === 'checkin' ? 'check-in' : 'check-out';
      const { data } = await api.post(`/attendance/${endpoint}`, fd);
      setRecord(data.data || null);
      setPunchResult({ ok: true, data: data.data, message: data.message, summary: data.summary, mode, geo: gateMeta });
      today.refetch?.();
      return { ok: true, message: data.message, data: data.data, summary: data.summary };
    } catch (err) {
      const code = err?.response?.data?.code;
      const message = err?.response?.data?.message || extractError(err, 'Verification failed. Please try again.');
      if (code === 'ALREADY_CHECKED_IN' || code === 'COMPLETED' || code === 'NOT_CHECKED_IN') {
        setDupHint({ code, message, record: err?.response?.data?.data });
      }
      return { ok: false, message, code };
    }
  };

  const shiftLabel = office
    ? `${formatClock(office.officeStartTime)} – ${formatClock(office.officeEndTime)}`
    : '—';
  const graceLabel = office
    ? (office.lateEnabled === false ? 'Late marking off' : `${Number(office.graceMinutes || 0)} min grace`)
    : null;

  return (
    <div>
      <PageHeader
        title="Face Attendance"
        description={`${new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}`}
      />

      {office && (
        <Card className="mb-4 max-w-lg p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
              <Clock3 className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-300">Today’s shift window</p>
              <p className="mt-0.5 font-semibold text-slate-800 dark:text-slate-100">{shiftLabel}</p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-300">
                {graceLabel}{office.lateEnabled !== false ? ' • Check in after start + grace is marked late' : ''}
              </p>
            </div>
          </div>
        </Card>
      )}

      <Card className="mb-6 max-w-lg">
        <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => startAction('checkin')}
              loading={gating && mode === 'checkin'}
              disabled={gating || !canCheckIn}
              className="bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <LogIn className="h-4 w-4" /> Check In
            </Button>
            <Button
              onClick={() => startAction('checkout')}
              loading={gating && mode === 'checkout'}
              disabled={gating || !canCheckOut}
              className="bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <LogOut className="h-4 w-4" /> Check Out
            </Button>
          </div>
          {rec?.checkInTime && (
            <div className="text-sm text-slate-500 dark:text-slate-300">
              In: <span className="font-semibold text-slate-700 dark:text-slate-200">{formatTime(rec.checkInTime)}</span>
              {rec.checkOutTime && (
                <> • Out: <span className="font-semibold text-slate-700 dark:text-slate-200">{formatTime(rec.checkOutTime)}</span></>
              )}
            </div>
          )}
        </div>
        <div className="border-t px-5 py-3 dark:border-slate-700">
          {rec?.status ? (
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-300">
              Today&apos;s status: <Badge>{rec.status}</Badge>
              {rec.faceVerified && <Badge>Face Verified</Badge>}
              {rec.status === 'Late' && rec.lateMinutes ? <Badge>Late by {rec.lateMinutes} min</Badge> : null}
              {rec.workingHoursMinutes ? <Badge>Worked {formatDuration(rec.workingHoursMinutes)}</Badge> : null}
            </div>
          ) : (
            <p className="text-xs text-slate-400 dark:text-slate-300">You haven&apos;t checked in today yet.</p>
          )}
        </div>
      </Card>

            <Modal
        open={(!inlineCapture && !!gateStatus) || !!gateError || (!!punchResult?.ok && !inlineCapture)}
        onClose={() => {
          if (gateStatus?.stage === 'verifying') return;
          setGateError(null);
          setPunchResult(null);
          setGateStatus(null);
        }}
        title={gateError ? "Couldn't mark attendance" : punchResult?.ok ? 'Attendance marked' : gateStatus?.stage === 'verified' ? 'Location verified' : 'Verifying location'}
        size="sm"
      >
        {gateStatus && !gateError && !punchResult?.ok && (
          <div className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm ${gateStatus.stage === 'verified' ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400' : 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300'}`}>
            {gateStatus.stage === 'verifying' && <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent" />}
            {gateStatus.stage === 'verified' && <CheckCircle2 className="h-4 w-4 shrink-0" />}
            <span>{gateStatus.message}</span>
          </div>
        )}
        {gateError && (
          <div className={`flex gap-2 rounded-xl border px-4 py-3 text-sm ${gateError.code === 'OUTSIDE_ALLOWED_AREA' ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-400' : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400'}`}>
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div><p className="font-medium">Couldn't mark attendance</p><p className="mt-0.5">{gateError.message}</p></div>
          </div>
        )}
        {punchResult?.ok && !gateError && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{punchResult.message || 'Attendance marked successfully.'}</p>
                <div className="mt-2 grid gap-1 text-xs sm:grid-cols-2">
                  {punchResult.mode === 'checkin' ? (
                    <><p>Check-in: <span className="font-semibold">{formatTime(punchResult.data?.checkInTime)}</span></p><p>Status: <span className="font-semibold">{punchResult.data?.status === 'Late' ? `Late${punchResult.data?.lateMinutes ? ` by ${punchResult.data.lateMinutes} min` : ''}` : 'On time'}</span></p></>
                  ) : (
                    <><p>Check-out: <span className="font-semibold">{formatTime(punchResult.data?.checkOutTime)}</span></p><p>Total worked: <span className="font-semibold">{formatDuration(punchResult.data?.workingHoursMinutes)}</span></p></>
                  )}
                  {punchResult.geo?.distance != null && punchResult.geo?.allowed != null && (
                    <p className="inline-flex items-start gap-1.5 sm:col-span-2"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span>Location verified: {punchResult.geo.distance} m (allowed {punchResult.geo.allowed} m){punchResult.geo.name ? ` - ${punchResult.geo.name}` : ''}</span></p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

<Modal
        open={inlineCapture && settings?.faceEnabled !== false}
        onClose={() => {
          setInlineCapture(false);
          setGateStatus(null);
          today.refetch?.();
        }}
        title={mode === 'checkout' ? 'Check Out' : 'Check In'}
        subtitle="Look at the camera. Your face will be verified automatically."
        size="md"
        panelClassName="sm:max-h-[calc(100dvh-2rem)]"
        bodyClassName="p-3 sm:p-4"
      >
        <FaceCapture
          key={`${mode}-${captureKey}`}
          mode="attendance"
          embedded
          onCaptured={submit}
          onClose={() => {
            setInlineCapture(false);
            setGateStatus(null);
            today.refetch?.();
          }}
          successExtra={(data) => {
            const geo = gateMeta;
            return (
              <div className="mx-auto max-w-sm space-y-1 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-left text-xs text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400">
                {mode === 'checkin' ? (
                  <p>Check-in: <span className="font-semibold">{formatTime(data?.checkInTime)}</span> - <span className="font-semibold">{data?.status === 'Late' ? `Late${data?.lateMinutes ? ` by ${data.lateMinutes} min` : ''}` : 'On time'}</span></p>
                ) : (
                  <p>Check-out: <span className="font-semibold">{formatTime(data?.checkOutTime)}</span> - Total <span className="font-semibold">{formatDuration(data?.workingHoursMinutes)}</span></p>
                )}
                {geo?.distance != null && geo?.allowed != null && (
                  <p className="inline-flex items-start gap-1.5"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />Location verified: {geo.distance} m (allowed {geo.allowed} m)</p>
                )}
              </div>
            );
          }}
          failureExtra={({ code }) =>
            dupHint && code === dupHint.code ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-500/10 dark:text-amber-400">
                <p className="font-semibold">{dupHint.message}</p>
                {dupHint.code === 'ALREADY_CHECKED_IN' && canCheckOut && (
                  <div className="mt-2 flex justify-center">
                    <Button size="sm" onClick={() => { setInlineCapture(false); startAction('checkout'); }} className="bg-rose-600 text-white hover:bg-rose-700">
                      <LogOut className="h-4 w-4" /> Check Out Instead
                    </Button>
                  </div>
                )}
                {dupHint.code === 'NOT_CHECKED_IN' && canCheckIn && (
                  <div className="mt-2 flex justify-center">
                    <Button size="sm" onClick={() => { setInlineCapture(false); startAction('checkin'); }} className="bg-emerald-600 text-white hover:bg-emerald-700">
                      <LogIn className="h-4 w-4" /> Check In Instead
                    </Button>
                  </div>
                )}
              </div>
            ) : null
          }
        />
      </Modal>
    </div>
  );
}

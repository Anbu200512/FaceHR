import { useState, useEffect, useCallback } from 'react';
import { LogIn, LogOut, CalendarCheck2 } from 'lucide-react';
import api, { extractError } from '../../services/api';
import { usePolling } from '../../hooks/useDebounce';
import { formatTime, formatDuration } from '../../services/format';
import { fetchMyAttendanceSettings, resolveGeoGate } from '../../services/attendanceSettings';
import PageHeader from '../../components/PageHeader';
import { Card } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import FaceCapture from '../../components/FaceCapture';

export default function FaceAttendance() {
  const [mode, setMode] = useState(null); // 'checkin' | 'checkout'
  const [record, setRecord] = useState(null);
  const [dupHint, setDupHint] = useState(null);
  const [settings, setSettings] = useState(null);
  const [inlineCapture, setInlineCapture] = useState(false);
  const [gating, setGating] = useState(false);
  const [gateError, setGateError] = useState(null);
  const [capturedLocation, setCapturedLocation] = useState(null);
  const [captureKey, setCaptureKey] = useState(0);

  const loadSettings = useCallback(async () => {
    try {
      setSettings(await fetchMyAttendanceSettings());
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
    setCapturedLocation(null);
    setInlineCapture(false);
    setGating(true);
    try {
      const s = await fetchMyAttendanceSettings();
      setSettings(s);

      // Automatically calculate/verify location (no manual "check location" step)
      const geo = await resolveGeoGate(s);
      if (!geo.ok) {
        setGateError(geo);
        return;
      }

      setCapturedLocation(geo.location);
      if (s.faceEnabled === false) {
        const endpoint = nextMode === 'checkin' ? 'check-in' : 'check-out';
        const { data } = await api.post(`/attendance/${endpoint}`, { location: geo.location });
        setRecord(data.data || null);
        setGateError({ code: 'SUCCESS', message: data.message || 'Attendance marked successfully.' });
        today.refresh?.();
      } else {
        // Open camera inline on this page (no modal/new panel)
        setCaptureKey((k) => k + 1);
        setInlineCapture(true);
      }
    } catch (err) {
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
      today.refresh?.();
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

  return (
    <div>
      <PageHeader
        title="Face Attendance"
        description={`${new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}`}
      />

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
            <div className="text-sm text-slate-500 dark:text-slate-400">
              In: <span className="font-semibold text-slate-700 dark:text-slate-200">{formatTime(rec.checkInTime)}</span>
              {rec.checkOutTime && (
                <> · Out: <span className="font-semibold text-slate-700 dark:text-slate-200">{formatTime(rec.checkOutTime)}</span></>
              )}
            </div>
          )}
        </div>
        <div className="border-t px-5 py-3 dark:border-slate-700">
          {rec?.status ? (
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              Today's status: <Badge>{rec.status}</Badge>
              {rec.faceVerified && <Badge>Face Verified</Badge>}
              {rec.workingHoursMinutes ? <Badge>Worked {formatDuration(rec.workingHoursMinutes)}</Badge> : null}
            </div>
          ) : (
            <p className="text-xs text-slate-400">You haven't checked in today yet.</p>
          )}
        </div>
      </Card>

      {gateError && (
        <div className="mx-auto mb-6 max-w-lg">
          <div
            className={`rounded-xl border px-4 py-3 text-sm ${
              gateError.code === 'SUCCESS'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400'
                : gateError.code === 'OUTSIDE_ALLOWED_AREA'
                ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-400'
                : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400'
            }`}
          >
            {gateError.message}
          </div>
        </div>
      )}

      {settings && settings.faceEnabled === false && !gateError && !inlineCapture && (
        <div className="mx-auto mb-6 max-w-lg">
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-300">
            <CalendarCheck2 className="h-4 w-4" /> Tap Check In or Check Out — your location is verified automatically if required.
          </div>
        </div>
      )}

      {inlineCapture && settings?.faceEnabled !== false && (
        <div className="mx-auto max-w-lg">
          <FaceCapture
            key={`${mode}-${captureKey}`}
            mode="attendance"
            onCaptured={submit}
            onClose={() => {
              setInlineCapture(false);
              today.refresh?.();
            }}
            successExtra={(data) => (
              <div className="mx-auto max-w-sm rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-xs text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400">
                {mode === 'checkin' ? (
                  <>Checked in at <span className="font-mono font-bold">{formatTime(data?.checkInTime)}</span> · {data?.status === 'Late' ? 'Marked Late' : 'On time'}.</>
                ) : (
                  <>Checked out at <span className="font-mono font-bold">{formatTime(data?.checkOutTime)}</span> · Total <span className="font-bold">{formatDuration(data?.workingHoursMinutes)}</span>.</>
                )}
              </div>
            )}
            failureExtra={({ code }) =>
              dupHint && code === dupHint.code ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-500/10 dark:text-amber-400">
                  <p className="font-semibold">{dupHint.message}</p>
                  {dupHint.code === 'ALREADY_CHECKED_IN' && canCheckOut && (
                    <div className="mt-2 flex justify-center">
                      <Button size="sm" onClick={() => startAction('checkout')} className="bg-rose-600 text-white hover:bg-rose-700">
                        <LogOut className="h-4 w-4" /> Check Out Instead
                      </Button>
                    </div>
                  )}
                  {dupHint.code === 'NOT_CHECKED_IN' && canCheckIn && (
                    <div className="mt-2 flex justify-center">
                      <Button size="sm" onClick={() => startAction('checkin')} className="bg-emerald-600 text-white hover:bg-emerald-700">
                        <LogIn className="h-4 w-4" /> Check In Instead
                      </Button>
                    </div>
                  )}
                </div>
              ) : null
            }
          />
        </div>
      )}
    </div>
  );
}

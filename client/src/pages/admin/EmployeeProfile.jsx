import { useEffect, useState,
  ImmigrationSectionView,
} from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Pencil,
  ScanFace,
  Mail,
  Phone,
  CalendarDays,
  Briefcase,
  Trash2,
  Send,
  LogIn,
  LogOut,
  MapPin,
  Clock,
} from 'lucide-react';
import api, { extractError } from '../../services/api';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import { resolveAsset, formatDate, formatDuration, formatTime, formatLocation, toDateKey } from '../../services/format';
import PageHeader from '../../components/PageHeader';
import { Card } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button, { FullScreenLoader } from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Modal from '../../components/ui/Modal';
import Avatar from '../../components/Avatar';
import FaceCapture from '../../components/FaceCapture';
import EmployeeSectionEditor from '../../components/employeeProfile/SectionEditors';
import { ADMIN_PROFILE_TABS } from '../../components/employeeForm/constants';
import { fetchAttendanceSettings, resolveGeoGate } from '../../services/attendanceSettings';
import clsx from 'clsx';

function captureLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => resolve(null),
      { timeout: 5000, enableHighAccuracy: true }
    );
  });
}

export default function EmployeeProfile({ faceMode }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [registerMode, setRegisterMode] = useState(Boolean(faceMode));
  const [removeOpen, setRemoveOpen] = useState(false);
  const [removeBusy, setRemoveBusy] = useState(false);
  const [tab, setTab] = useState('contact');
  const [sendOpen, setSendOpen] = useState(false);
  const [sendBusy, setSendBusy] = useState(false);
  const [actionMode, setActionMode] = useState(null); // null | 'checkin' | 'checkout'
  const [actionBusy, setActionBusy] = useState(false);
  const [capturedLocation, setCapturedLocation] = useState(null);
  const [todayTick, setTodayTick] = useState(0);

  const { data, loading, refetch } = useApi(async () => {
    const { data } = await api.get(`/employees/${id}`);
    return data.data;
  }, [id]);

  useEffect(() => {
    if (faceMode) setRegisterMode(true);
  }, [faceMode]);

  const submitFace = async ({ blob, descriptor }) => {
    const fd = new FormData();
    fd.append('employeeId', id);
    fd.append('image', blob, 'face.jpg');
    fd.append('descriptor', JSON.stringify(Array.from(descriptor)));
    const { data } = await api.post('/face/register', fd);
    toast.success('Face registered successfully');
    setRegisterMode(false);
    await refetch();
    return { ok: true, message: data.message, data: data.data };
  };

  const removeFace = async () => {
    setRemoveBusy(true);
    try {
      await api.delete(`/face/${id}`);
      toast.success('Face profile removed');
      setRemoveOpen(false);
      refetch();
    } catch (err) {
      toast.error(extractError(err, 'Could not remove face profile'));
    } finally {
      setRemoveBusy(false);
    }
  };

  const submitAttendance = async ({ blob, descriptor }) => {
    const fd = new FormData();
    fd.append('image', blob, 'face.jpg');
    fd.append('descriptor', JSON.stringify(Array.from(descriptor)));
    const location = capturedLocation || (await captureLocation());
    if (location) fd.append('location', JSON.stringify(location));
    const endpoint = actionMode === 'checkin' ? 'check-in' : 'check-out';
    const { data } = await api.post(`/attendance/admin/${id}/${endpoint}`, fd);
    setTodayTick((n) => n + 1);
    return { ok: true, message: data.message, data: data.data, summary: data.summary };
  };

  const requestAction = async (mode) => {
    setActionBusy(true);
    try {
      const s = await fetchAttendanceSettings();
      if (s.faceEnabled === false) {
        toast.error('Face attendance is currently disabled by your administrator.');
        return;
      }
      const geo = await resolveGeoGate(s);
      if (!geo.ok) {
        toast.error(geo.message);
        return;
      }
      setCapturedLocation(geo.location);
      setActionMode(mode);
    } catch (err) {
      toast.error(extractError(err, 'Could not verify attendance settings. Please try again.'));
    } finally {
      setActionBusy(false);
    }
  };

  const sendLogin = async () => {
    setSendBusy(true);
    try {
      const { data } = await api.post(`/employees/${id}/send-login`);
      if (data.emailSent) {
        toast.success(`Login credentials sent to ${emp?.email}`);
      } else {
        toast.success('Email service is not configured — temporary password generated below.');
        if (data.generatedPassword) {
          toast.info(`Temporary password: ${data.generatedPassword}`, { duration: 0 });
        }
      }
      setSendOpen(false);
    } catch (err) {
      toast.error(extractError(err, 'Could not send login details'));
    } finally {
      setSendBusy(false);
    }
  };

  if (loading) return <FullScreenLoader label="Loading employee profile…" />;
  const emp = data;
  if (!emp) return <EmptyState title="Employee not found" />;

  const hasFace = Boolean(emp.face);

  if (registerMode) {
    return (
      <div>
        <PageHeader title={`Face Registration · ${emp.firstName} ${emp.lastName}`} description="Help the employee position their face clearly. Only a single photo and a biometric descriptor are stored — never video.">
          <Button variant="ghost" onClick={() => setRegisterMode(false)}>
            <ArrowLeft className="h-4 w-4" /> Back to Profile
          </Button>
        </PageHeader>
        <FaceCapture
          mode="register"
          onCaptured={submitFace}
          onClose={() => navigate(`/admin/employees/${id}`)}
        />
        <div className="mx-auto mt-4 max-w-lg rounded-xl border border-brand-100 bg-brand-50/60 p-4 text-xs leading-relaxed text-brand-700 dark:border-brand-500/20 dark:bg-brand-500/5 dark:text-brand-300">
          <p className="font-semibold">Privacy notice</p>
          <p className="mt-1">
            Your face photo and a one-time biometric embedding are stored solely for attendance verification.
            No video stream is recorded or retained, and the images are never shared.
          </p>
        </div>
      </div>
    );
  }

  const fullName = [emp.firstName, emp.middleName, emp.lastName].filter(Boolean).join(' ');
  const mobile = emp.contact?.mobileNumber || emp.phone || '—';
  const statusColor = emp.status === 'Active' ? 'emerald' : 'slate';

  return (
    <div>
      <PageHeader title="Employee Profile" description={`${emp.employeeId} · joined ${formatDate(emp.joiningDate)}`}>
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <Button variant="secondary" onClick={() => setSendOpen(true)}>
          <Send className="h-4 w-4" /> Send Login Details
        </Button>
        <Link to={`/admin/employees/${emp._id}/edit`}>
          <Button variant="secondary"><Pencil className="h-4 w-4" /> Edit</Button>
        </Link>
      </PageHeader>

      {/* Header summary */}
      <Card className="mb-6">
        <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center">
          <Avatar name={fullName} src={resolveAsset(emp.profilePhoto)} size="xl" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{fullName}</h2>
              <Badge tone={statusColor}>{emp.status}</Badge>
              {emp.exEmployee && <Badge>Ex Employee</Badge>}
            </div>
            <p className="font-mono text-xs font-semibold text-brand-600 dark:text-brand-400">{emp.employeeId}</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {emp.designation?.name || 'No designation'} · {emp.department?.name || 'No department'}{emp.office?.name ? ` · ${emp.office.name}` : ''}
            </p>
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <span className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <Mail className="h-4 w-4 text-slate-400" /> {emp.email || '—'}
              </span>
              <span className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <Phone className="h-4 w-4 text-slate-400" /> {mobile}
              </span>
              <span className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <CalendarDays className="h-4 w-4 text-slate-400" /> DOJ {formatDate(emp.joiningDate)}
              </span>
              <span className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <Briefcase className="h-4 w-4 text-slate-400" /> {emp.employmentType}
              </span>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Face + attendance cards */}
        <div className="space-y-6 lg:col-span-3">
          <div className="grid gap-6 xl:grid-cols-2">
            <FaceStatusCard emp={emp} hasFace={hasFace} onRegister={() => setRegisterMode(true)} onRemove={() => setRemoveOpen(true)} />
            <AttendanceSummary emp={emp} />
          </div>
        </div>
      </div>

      <EmployeeActionsCard
        emp={emp}
        reloadKey={todayTick}
        busy={actionBusy}
        onCheckIn={() => requestAction('checkin')}
        onCheckOut={() => requestAction('checkout')}
      />

      {/* Section navigation */}
      <div className="sticky top-16 z-10 mb-6 -mx-4 bg-surface-light px-4 py-2 dark:bg-surface-dark sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="overflow-x-auto">
          <div className="flex min-w-max gap-1 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            {ADMIN_PROFILE_TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={clsx(
                  'inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 py-2 text-xs font-semibold transition',
                  tab === t.id
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
                )}
              >
                <t.icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Section content */}
      <EmployeeSectionEditor key={tab} section={tab} emp={emp} onSaved={refetch} />

      <Modal
        open={!!actionMode}
        onClose={() => setActionMode(null)}
        title={actionMode === 'checkin' ? 'Face Check In' : 'Face Check Out'}
        subtitle={`Mark ${fullName} (${emp.employeeId}) — the employee needs to face this camera so their identity is verified.`}
      >
        <FaceCapture
          key={`admin-${actionMode}-${todayTick}`}
          mode="attendance"
          onCaptured={submitAttendance}
          onClose={() => setActionMode(null)}
          successExtra={(data) => (
            <div className="mx-auto max-w-sm rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-xs text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400">
              {actionMode === 'checkin' ? (
                <>Checked in at <span className="font-mono font-bold">{formatTime(data?.checkInTime)}</span> · {data?.status === 'Late' ? 'Marked Late' : 'On time'}.</>
              ) : (
                <>Checked out at <span className="font-mono font-bold">{formatTime(data?.checkOutTime)}</span> · Total <span className="font-bold">{formatDuration(data?.workingHoursMinutes)}</span>.</>
              )}
            </div>
          )}
        />
        <p className="mt-3 text-center text-xs text-slate-400">
          The server re-checks the company geofence and face record before attendance is accepted — a device outside the allowed radius is blocked.
        </p>
      </Modal>

      <ConfirmDialog
        open={removeOpen}
        onClose={() => setRemoveOpen(false)}
        onConfirm={removeFace}
        loading={removeBusy}
        title="Remove face profile?"
        message="The employee will need to re-register before using face attendance again."
        confirmLabel="Remove Face"
      />

      <ConfirmDialog
        open={sendOpen}
        onClose={() => setSendOpen(false)}
        onConfirm={sendLogin}
        loading={sendBusy}
        tone="primary"
        title="Send login details?"
        message={`A new temporary password will be generated and the employee account login details will be emailed to ${emp.email || 'the employee’s work email'}.`}
        confirmLabel="Send Login Details"
      />
    </div>
  );
}

function FaceStatusCard({ emp, hasFace, onRegister, onRemove }) {
  return (
    <Card>
      <div className="flex items-center justify-between border-b px-5 py-4 dark:border-slate-700">
        <h3 className="font-bold text-slate-900 dark:text-slate-100">Face Recognition Status</h3>
      </div>
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <ScanFace className={`h-8 w-8 ${hasFace ? 'text-emerald-500' : 'text-slate-300 dark:text-slate-600'}`} />
          <div>
            <p className="font-semibold text-slate-800 dark:text-slate-100">
              {hasFace ? 'Face Registered' : 'Face Not Registered'}
            </p>
            <p className="text-xs text-slate-400">
              {hasFace
                ? `Linked to faceId ${emp.face?.faceId?.slice(0, 8)}… · Registered on ${formatDate(emp.face?.updatedAt)}`
                : 'This employee cannot use face attendance yet.'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {hasFace ? (
            <>
              <Button variant="secondary" onClick={onRemove}>
                <Trash2 className="h-4 w-4" /> Remove
              </Button>
              <Button onClick={onRegister}>
                <ScanFace className="h-4 w-4" /> Re-register
              </Button>
            </>
          ) : (
            <Button onClick={onRegister}>
              <ScanFace className="h-4 w-4" /> Register Face
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

function AttendanceSummary({ emp }) {
  const now = new Date();
  const { data, loading } = useApi(async () => {
    const { data } = await api.get(`/attendance/${emp._id}?year=${now.getFullYear()}&month=${now.getMonth()}`);
    return data.data;
  }, [emp._id]);

  const s = data?.summary;

  return (
    <Card>
      <div className="border-b px-5 py-4 dark:border-slate-700">
        <h3 className="font-bold text-slate-900 dark:text-slate-100">Attendance Highlights</h3>
      </div>
      <div className="grid grid-cols-2 gap-px sm:grid-cols-5">
        {[
          ['Present', s?.presentDays],
          ['Late', s?.lateDays],
          ['Absent', s?.absentDays],
          ['Leave', s?.leaveDays],
          ['Hours', s?.totalHours ? formatDuration(s.totalHours) : '—'],
        ].map(([label, val]) => (
          <div key={label} className="p-4">
            <p className="text-xs font-medium text-slate-400">{label}</p>
            <p className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">{val ?? (loading ? '…' : '—')}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function EmployeeActionsCard({ emp, reloadKey, busy, onCheckIn, onCheckOut }) {
  const now = new Date();
  const today = toDateKey(now);
  const { data, loading } = useApi(async () => {
    const { data } = await api.get(`/attendance/${emp._id}?year=${now.getFullYear()}&month=${now.getMonth()}`);
    return data.data;
  }, [emp._id, reloadKey]);

  const day = (data?.days || []).find((d) => d.date === today);
  const rec = day?.record || null;

  const checkInLoc = formatLocation(rec?.checkInLocation);
  const checkOutLoc = formatLocation(rec?.checkOutLocation);

  const canCheckIn = !rec?.checkInTime;
  const canCheckOut = Boolean(rec?.checkInTime && !rec?.checkOutTime);

  return (
    <Card className="mb-6">
      <div className="flex items-center justify-between border-b px-5 py-4 dark:border-slate-700">
        <h3 className="font-bold text-slate-900 dark:text-slate-100">Employee Actions</h3>
        <Badge>{rec?.status || day?.status || 'Not Marked Yet'}</Badge>
      </div>
      <div className="flex flex-col gap-5 p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <ActionDetail icon={LogIn} label="Check In Today" value={rec ? formatTime(rec.checkInTime) : 'Not checked in'} sub={checkInLoc || 'No GPS location captured'} />
          <ActionDetail icon={LogOut} label="Check Out Today" value={rec?.checkOutTime ? formatTime(rec.checkOutTime) : '—'} sub={checkOutLoc || 'No GPS location captured'} />
          <ActionDetail icon={Clock} label="Worked Today" value={rec?.workingHoursMinutes ? formatDuration(rec.workingHoursMinutes) : '—'} sub={rec?.faceVerified ? 'Face verified' : 'No record yet'} />
        </div>
        <div className="flex flex-col gap-3 border-t pt-4 dark:border-slate-700 sm:flex-row sm:items-end sm:justify-between">
          <p className="max-w-md text-xs text-slate-400">
            Mark today's attendance on this employee's behalf. The employee's face is verified against their registered profile on this device before any record is created.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={onCheckIn} disabled={!canCheckIn || loading || busy} loading={busy} variant="secondary">
              <LogIn className="h-4 w-4" /> Check In
            </Button>
            <Button onClick={onCheckOut} disabled={!canCheckOut || loading || busy} loading={busy} variant="secondary">
              <LogOut className="h-4 w-4" /> Check Out
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

function ActionDetail({ icon: Icon, label, value, sub }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
        <p className="mt-0.5 text-sm font-semibold text-slate-800 dark:text-slate-100">{value}</p>
        <p className="mt-0.5 truncate text-xs text-slate-400">{sub}</p>
      </div>
    </div>
  );
}
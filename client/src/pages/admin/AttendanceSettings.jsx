import { useEffect, useState } from 'react';
import { Save, MapPin, MapPinned, ScanFace, LocateFixed, RefreshCw } from 'lucide-react';
import { extractError } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { fetchAttendanceSettings, saveAttendanceSettings } from '../../services/attendanceSettings';
import PageHeader from '../../components/PageHeader';
import { Card } from '../../components/ui/Card';
import Button, { FullScreenLoader } from '../../components/ui/Button';
import GeofenceMap from '../../components/GeofenceMap';
import LocationPickerModal from '../../components/LocationPickerModal';

function ToggleRow({ label, description, checked, onChange }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-700">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{label}</p>
        {description && <p className="mt-0.5 text-xs leading-relaxed text-slate-400">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${checked ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}
      >
        <span className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
      </button>
    </div>
  );
}

function toForm(settings) {
  return {
    faceEnabled: settings.faceEnabled !== false,
    geoEnabled: settings.geoEnabled !== false,
    name: settings.location?.name || '',
    latitude: settings.location?.latitude,
    longitude: settings.location?.longitude,
    allowedRadius: Number(settings.location?.allowedRadius) || 100,
  };
}

const sameNumber = (a, b) => Number.isFinite(Number(a)) && Number.isFinite(Number(b)) && Number(a) === Number(b);

export default function AttendanceSettings() {
  const toast = useToast();

  // saved = the values last confirmed in the backend (source of truth).
  // form  = the values currently being edited.
  const [saved, setSaved] = useState(null);
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [pickerOpen, setPickerOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const settings = await fetchAttendanceSettings();
      const next = toForm(settings);
      setSaved(next);
      setForm(next);
    } catch (err) {
      setLoadError(extractError(err, 'Could not load attendance settings. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((er) => ({ ...er, [k]: undefined }));
  };

  const lat = Number(form?.latitude);
  const lng = Number(form?.longitude);
  const hasValidCenter = Number.isFinite(lat) && Number.isFinite(lng);
  const mapCenter = hasValidCenter ? { lat, lng } : {};

  const hasUnsavedChanges =
    !!saved &&
    !!form &&
    (saved.faceEnabled !== form.faceEnabled ||
      saved.geoEnabled !== form.geoEnabled ||
      saved.name !== form.name ||
      !sameNumber(saved.latitude, form.latitude) ||
      !sameNumber(saved.longitude, form.longitude) ||
      !sameNumber(saved.allowedRadius, form.allowedRadius));

  const save = async () => {
    const blank = (v) => v === '' || v === null || v === undefined;
    const errs = {};
    if (blank(form?.latitude) || !Number.isFinite(lat) || lat < -90 || lat > 90) errs.latitude = 'Latitude must be between -90 and 90';
    if (blank(form?.longitude) || !Number.isFinite(lng) || lng < -180 || lng > 180) errs.longitude = 'Longitude must be between -180 and 180';
    if (blank(form?.allowedRadius) || !Number.isFinite(Number(form.allowedRadius)) || Number(form.allowedRadius) <= 0 || Number(form.allowedRadius) > 10000)
      errs.allowedRadius = 'Enter a value between 1 and 10,000';
    setErrors(errs);
    if (Object.keys(errs).length) {
      toast.error('Please fix the highlighted fields.');
      return;
    }

    setSaving(true);
    try {
      const { message, attendance } = await saveAttendanceSettings({
        faceEnabled: form.faceEnabled,
        geoEnabled: form.geoEnabled,
        location: {
          name: form.name,
          latitude: lat,
          longitude: lng,
          allowedRadius: Math.round(Number(form.allowedRadius)),
        },
      });
      const next = toForm(attendance);
      setSaved(next);
      setForm(next);
      toast.success(message || 'Attendance settings updated successfully.');
    } catch (err) {
      // Keep the user's unsaved values on screen; only the backend response counts as saved.
      toast.error(extractError(err, 'Failed to update attendance settings. Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div>
        <PageHeader title="Attendance Settings" description="Company-wide face attendance and geolocation rules." />
        <FullScreenLoader label="Loading attendance settings..." />
      </div>
    );
  }

  if (loadError) {
    return (
      <div>
        <PageHeader title="Attendance Settings" description="Company-wide face attendance and geolocation rules." />
        <Card className="flex flex-col items-center gap-4 px-6 py-10 text-center">
          <p className="max-w-md text-sm text-slate-500 dark:text-slate-400">{loadError}</p>
          <Button type="button" onClick={load}>
            <RefreshCw className="h-4 w-4" /> Retry
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <PageHeader title="Attendance Settings" description="Company-wide face attendance and geolocation rules. Changes apply to every employee immediately." />

      <div className="grid min-w-0 gap-6 xl:grid-cols-2">
        <div className="min-w-0">
          <Card className="flex h-full flex-col">
            <div className="border-b px-5 py-4 dark:border-slate-700">
              <h2 className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100">
                <ScanFace className="h-5 w-5 text-brand-600 dark:text-brand-400" /> Attendance &amp; Location Verification
              </h2>
            </div>
            <div className="flex-1 space-y-3 p-5">
              <ToggleRow
                label="Face Attendance"
                description="Employees verify their identity with face recognition before checking in or out."
                checked={form.faceEnabled}
                onChange={(v) => set('faceEnabled', v)}
              />
              <ToggleRow
                label="Geo Location Verification"
                description="Verify the device GPS against the company geofence before attendance is accepted."
                checked={form.geoEnabled}
                onChange={(v) => set('geoEnabled', v)}
              />
              <p className="pt-2 text-xs leading-relaxed text-slate-400">
                {form.faceEnabled === false
                  ? 'Face attendance is disabled — the attendance camera will not open for any employee until this is turned on.'
                  : 'When face attendance is on, the camera opens only after a successful identity check.'}
                {form.geoEnabled && ' The GPS location is always re-verified by the server; a device outside the geofence is blocked.'}
              </p>
            </div>
          </Card>
        </div>

        <div className="min-w-0">
          <Card className="flex h-full flex-col">
            <div className="border-b px-5 py-4 dark:border-slate-700">
              <h2 className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100">
                <MapPinned className="h-5 w-5 text-brand-600 dark:text-brand-400" /> Company Geofence
              </h2>
            </div>
            <div className="flex-1 space-y-5 p-5">
              <div>
                <label className="label">Company Location Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  placeholder="e.g. Nuvox Technologies"
                  className="input"
                />
              </div>

              <div className="grid min-w-0 grid-cols-2 gap-4">
                <div className="min-w-0">
                  <label className="label">Latitude</label>
                  <input
                    type="number"
                    step="any"
                    value={form.latitude}
                    onChange={(e) => set('latitude', e.target.value)}
                    placeholder="13.0866"
                    className="input"
                  />
                  {errors.latitude && <p className="mt-1 text-xs text-rose-500">{errors.latitude}</p>}
                </div>
                <div className="min-w-0">
                  <label className="label">Longitude</label>
                  <input
                    type="number"
                    step="any"
                    value={form.longitude}
                    onChange={(e) => set('longitude', e.target.value)}
                    placeholder="80.1916"
                    className="input"
                  />
                  {errors.longitude && <p className="mt-1 text-xs text-rose-500">{errors.longitude}</p>}
                </div>
              </div>

              <div>
                <label className="label">Allowed Attendance Radius (meters)</label>
                <input
                  type="range"
                  min="1"
                  max="1000"
                  step="1"
                  value={Number(form.allowedRadius) > 1000 ? 1000 : Number(form.allowedRadius) || 1}
                  onChange={(e) => set('allowedRadius', e.target.value)}
                  className="w-full accent-[#2543eb]"
                />
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <input
                    type="number"
                    min="1"
                    max="10000"
                    step="1"
                    value={form.allowedRadius}
                    onChange={(e) => set('allowedRadius', e.target.value)}
                    className="input w-32"
                  />
                  <span className="text-xs text-slate-400">meters</span>
                  {errors.allowedRadius && <p className="text-xs text-rose-500">{errors.allowedRadius}</p>}
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  Employees must be within {Math.round(Number(form.allowedRadius) || 100)} meters of the location below to mark attendance.
                </p>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="label mb-0">Location Map</p>
                  <Button type="button" size="sm" variant="secondary" onClick={() => setPickerOpen(true)}>
                    <LocateFixed className="h-4 w-4" /> Select Company Location
                  </Button>
                </div>
                <p className="mb-2 text-xs text-slate-400">
                  Pick the exact spot on the map — the blue circle shows the allowed radius that is applied to everyone.
                </p>
                {hasValidCenter ? (
                  <GeofenceMap
                    center={mapCenter}
                    radius={Math.min(Math.max(Number(form.allowedRadius) || 1, 1), 10000)}
                    height={300}
                    interactive
                    onPick={(pick) => {
                      set('latitude', pick.lat);
                      set('longitude', pick.lng);
                    }}
                  />
                ) : (
                  <div className="flex h-[300px] items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-400 dark:border-slate-700 dark:bg-slate-800/60">
                    Enter a valid latitude and longitude to preview the geofence.
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col-reverse items-stretch gap-3 border-t px-5 py-4 dark:border-slate-700 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-slate-400">
                <MapPin className="mr-1 inline h-3.5 w-3.5" /> Only one company location is used and only an admin can change it.
                {hasUnsavedChanges && (
                  <span className="ml-2 inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                    Unsaved changes
                  </span>
                )}
              </p>
              <Button type="button" onClick={save} loading={saving} disabled={saving}>
                <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Attendance Settings'}
              </Button>
            </div>
          </Card>
        </div>
      </div>

      <LocationPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onConfirm={(pick) => {
          set('latitude', pick.lat);
          set('longitude', pick.lng);
        }}
        initial={hasValidCenter ? { latitude: lat, longitude: lng } : { latitude: 13.0866182, longitude: 80.1916159 }}
      />
    </div>
  );
}
import { useState } from 'react';
import { Save, ScanFace, AlarmClock, Clock3, ToggleLeft } from 'lucide-react';
import api, { extractError } from '../../services/api';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import PageHeader from '../../components/PageHeader';
import { Card } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';

export default function Settings() {
  const toast = useToast();
  const { data, refetch } = useApi(async () => {
    const { data } = await api.get('/settings');
    return data.data;
  });
  const s = data?.settings;

  const [officeStartTime, setOfficeStartTime] = useState('09:30');
  const [halfDay, setHalfDay] = useState(4);
  const [lateEnabled, setLateEnabled] = useState(true);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedKey, setSavedKey] = useState(null);

  if (s && !ready) {
    setOfficeStartTime(s.officeStartTime || '09:30');
    setHalfDay(Number(s.halfDayThresholdHours ?? 4));
    setLateEnabled(s.lateEnabled !== false);
    setReady(true);
  }

  const save = async (key, value) => {
    setSaving(true);
    try {
      await api.put('/settings', { key, value });
      setSavedKey(key);
      toast.success('Setting updated');
      setTimeout(() => setSavedKey(null), 2000);
      refetch();
    } catch (err) {
      toast.error(extractError(err, 'Could not save setting'));
    } finally {
      setSaving(false);
    }
  };

  const face = data?.face;

  return (
    <div>
      <PageHeader title="Settings" description="Configure attendance rules and review the recognition backend." />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="border-b px-5 py-4 dark:border-slate-700">
            <h2 className="font-bold text-slate-900 dark:text-slate-100">Attendance Rules</h2>
          </div>
          <div className="space-y-6 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <label className="label flex items-center gap-1.5"><AlarmClock className="h-4 w-4 text-slate-400" /> Office start time</label>
                <p className="mt-1 text-xs text-slate-400">Employees checking in after this are marked Late.</p>
              </div>
              <div className="flex items-center gap-2">
                <input type="time" value={officeStartTime} onChange={(e) => setOfficeStartTime(e.target.value)} className="input" />
                <Button size="sm" onClick={() => save('officeStartTime', officeStartTime)} loading={saving && savedKey === 'officeStartTime'} disabled={saving}>Save</Button>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <label className="label flex items-center gap-1.5"><Clock3 className="h-4 w-4 text-slate-400" /> Half-day threshold</label>
                <p className="mt-1 text-xs text-slate-400">Under this many hours, a completed day is recorded as Half Day.</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <input type="number" min="1" max="16" step="0.5" value={halfDay} onChange={(e) => setHalfDay(e.target.value)} className="input w-24 pr-8" />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">hrs</span>
                </div>
                <Button size="sm" onClick={() => save('halfDayThresholdHours', halfDay)} loading={saving && savedKey === 'halfDayThresholdHours'} disabled={saving}>Save</Button>
              </div>
            </div>

            <div className="flex items-center justify-between border-t pt-5 dark:border-slate-700">
              <div>
                <p className="font-semibold text-slate-800 dark:text-slate-100">Mark employees as Late</p>
                <p className="mt-1 text-xs text-slate-400">Disable to treat every check-in as on time.</p>
              </div>
              <button
                onClick={() => { const next = !lateEnabled; setLateEnabled(next); save('lateEnabled', next); }}
                className={`relative h-7 w-12 rounded-full transition ${lateEnabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}
              >
                <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${lateEnabled ? 'left-6' : 'left-1'}`} />
              </button>
            </div>
          </div>
        </Card>

        <Card>
          <div className="border-b px-5 py-4 dark:border-slate-700">
            <h2 className="font-bold text-slate-900 dark:text-slate-100">Face Recognition Backend</h2>
          </div>
          <div className="space-y-4 p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ScanFace className="h-6 w-6 text-brand-600 dark:text-brand-400" />
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-100">Recognition engine</p>
                  <p className="text-xs text-slate-400">Descriptors are computed in the employee's browser and matched server-side.</p>
                </div>
              </div>
              <Badge tone={face?.available ? 'emerald' : 'amber'}>
                {face?.available ? 'Active' : 'Fallback'}
              </Badge>
            </div>
            <dl className="grid grid-cols-2 gap-3 rounded-xl border border-slate-200 p-4 text-sm dark:border-slate-700">
              <div>
                <dt className="text-xs font-medium text-slate-400">Backend</dt>
                <dd className="mt-0.5 font-mono text-xs font-semibold text-slate-800 dark:text-slate-100">{face?.backend || 'none'}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-400">Match threshold</dt>
                <dd className="mt-0.5 font-mono text-xs font-semibold text-slate-800 dark:text-slate-100">{face?.threshold ?? 0.6}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-400">Model dir</dt>
                <dd className="mt-0.5 truncate font-mono text-xs text-slate-600 dark:text-slate-300" title={face?.modelDir}>{face?.modelDir || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-400">Status</dt>
                <dd className="mt-0.5 truncate text-xs text-slate-600 dark:text-slate-300" title={face?.error}>{face?.error || (face?.available ? 'ready' : 'client-side mode')}</dd>
              </div>
            </dl>
            <p className="flex items-start gap-2 text-xs leading-relaxed text-slate-400">
              <ToggleLeft className="mt-0.5 h-4 w-4 shrink-0" />
              When the optional native TensorFlow backend isn't available, the server still validates every matching step using the descriptor sent from the browser — no recognized fallback lowers security.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
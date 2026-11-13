import { useState } from 'react';
import { CalendarClock, Send } from 'lucide-react';
import api, { extractError } from '../../services/api';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import { formatDate, formatTime, toInputDate } from '../../services/format';
import PageHeader from '../../components/PageHeader';
import { Card } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import { Input, Textarea } from '../../components/ui/Form';

const TONES = { Pending: 'amber', Approved: 'emerald', Rejected: 'rose' };

export default function MyRegularizations() {
  const toast = useToast();
  const today = toInputDate(new Date());
  const [form, setForm] = useState({ date: today, checkIn: '', checkOut: '', reason: '' });
  const [submitting, setSubmitting] = useState(false);

  const mine = useApi(async () => {
    const { data } = await api.get('/regularizations/mine');
    return data.data || [];
  });

  const submit = async () => {
    if (!form.date) { toast.error('Choose the date to correct'); return; }
    if (!form.checkIn && !form.checkOut) { toast.error('Enter a check-in or check-out time'); return; }
    setSubmitting(true);
    try {
      await api.post('/regularizations', {
        date: form.date,
        checkIn: form.checkIn || undefined,
        checkOut: form.checkOut || undefined,
        reason: form.reason.trim(),
      });
      toast.success('Regularization request submitted');
      setForm({ date: today, checkIn: '', checkOut: '', reason: '' });
      mine.refetch();
    } catch (err) {
      toast.error(extractError(err, 'Could not submit request'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <PageHeader title="Attendance Regularization" description="Request a correction when you forget to check in or check out." />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <div className="border-b px-5 py-4 dark:border-slate-700">
            <h2 className="font-bold text-slate-900 dark:text-slate-100">New Request</h2>
          </div>
          <div className="space-y-4 p-5">
            <Input label="Date *" type="date" max={today} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Check-in" type="time" value={form.checkIn} onChange={(e) => setForm({ ...form, checkIn: e.target.value })} />
              <Input label="Check-out" type="time" value={form.checkOut} onChange={(e) => setForm({ ...form, checkOut: e.target.value })} />
            </div>
            <Textarea label="Reason" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} rows={3} placeholder="Explain what happened (optional)..." />
            <Button className="w-full" onClick={submit} loading={submitting}>
              <Send className="h-4 w-4" /> Submit Request
            </Button>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <div className="border-b px-5 py-4 dark:border-slate-700">
            <h2 className="font-bold text-slate-900 dark:text-slate-100">My Requests</h2>
          </div>
          {mine.loading && !mine.data ? (
            <div className="space-y-3 p-5">
              {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />)}
            </div>
          ) : !mine.data?.length ? (
            <EmptyState icon={CalendarClock} title="No requests yet" message="Your regularization requests will appear here." />
          ) : (
            <ul className="divide-y dark:divide-slate-700">
              {mine.data.map((r) => (
                <li key={r._id} className="flex items-center gap-4 px-5 py-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400">
                    <CalendarClock className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-800 dark:text-slate-100">{formatDate(r.date)}</p>
                    <p className="text-xs text-slate-400">
                      In: {r.requestedCheckIn ? formatTime(r.requestedCheckIn) : '—'} • Out: {r.requestedCheckOut ? formatTime(r.requestedCheckOut) : '—'}
                    </p>
                    {r.reason && <p className="mt-1 truncate text-xs text-slate-500">{r.reason}</p>}
                    {r.adminNote && <p className="mt-1 text-xs font-medium text-rose-500">Note: {r.adminNote}</p>}
                  </div>
                  <Badge tone={TONES[r.status] || 'slate'}>{r.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

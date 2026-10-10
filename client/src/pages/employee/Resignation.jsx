import { useState } from 'react';
import { FileSignature, CalendarDays, MessageSquareText, Send, AlertCircle } from 'lucide-react';
import api, { extractError } from '../../services/api';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import { formatDate } from '../../services/format';
import { RESIGNATION_REASONS } from '../../services/static';
import PageHeader from '../../components/PageHeader';
import { Card } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';

const STATUS_TONES = { Pending: 'amber', Approved: 'emerald', Rejected: 'rose' };

export default function Resignation() {
  const toast = useToast();
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({ reason: RESIGNATION_REASONS[0], resignationDate: today, feedback: '', comments: '' });
  const [submitting, setSubmitting] = useState(false);

  const mine = useApi(async () => {
    const { data } = await api.get('/resignations/mine');
    return data.data;
  });

  const hasPending = (mine.data || []).some((r) => r.status === 'Pending');

  const submit = async () => {
    if (!form.resignationDate) { toast.error('Please choose your resignation date'); return; }
    setSubmitting(true);
    try {
      await api.post('/resignations', form);
      toast.success('Resignation request submitted. HR will review it.');
      setForm({ ...form, feedback: '', comments: '' });
      await mine.refetch();
    } catch (err) {
      toast.error(extractError(err, 'Could not submit resignation request'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <PageHeader title="Resignation" description="Submit your resignation request to HR." />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-1">
          <Card className="p-5">
            <div className="flex gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/10">
                <AlertCircle className="h-5 w-5" />
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Submitting this request notifies HR with your reason and intended date. A resignation is official only after HR approves it.
              </p>
            </div>
          </Card>

          <Card>
            <div className="border-b px-5 py-4 dark:border-slate-700">
              <h2 className="font-bold text-slate-900 dark:text-slate-100">Submit Request</h2>
            </div>
            <div className="space-y-4 p-5">
              <div>
                <label className="label">Resignation reason</label>
                <select value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} className="input">
                  {RESIGNATION_REASONS.map((r) => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Resignation date</label>
                <div className="relative">
                  <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input type="date" min={today} value={form.resignationDate} onChange={(e) => setForm({ ...form, resignationDate: e.target.value })} className="input pl-9" />
                </div>
              </div>
              <div>
                <label className="label">Employee feedback</label>
                <div className="relative">
                  <MessageSquareText className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <textarea value={form.feedback} onChange={(e) => setForm({ ...form, feedback: e.target.value })} rows={3} className="input pl-9" placeholder="Tell us what could have been better…" />
                </div>
              </div>
              <div>
                <label className="label">Additional comments <span className="text-xs text-slate-400">(optional)</span></label>
                <textarea value={form.comments} onChange={(e) => setForm({ ...form, comments: e.target.value })} rows={3} className="input" placeholder="Anything else you would like to add…" />
              </div>
              {hasPending && (
                <p className="text-xs text-amber-600 dark:text-amber-400">You already have a pending resignation request awaiting HR review.</p>
              )}
              <Button className="w-full" onClick={submit} loading={submitting} disabled={hasPending}>
                <Send className="h-4 w-4" /> Submit Request
              </Button>
            </div>
          </Card>
        </div>

        <Card className="lg:col-span-2">
          <div className="border-b px-5 py-4 dark:border-slate-700">
            <h2 className="font-bold text-slate-900 dark:text-slate-100">My Requests</h2>
          </div>
          {mine.loading && !mine.data ? (
            <div className="space-y-3 p-5">
              {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />)}
            </div>
          ) : mine.data?.length === 0 ? (
            <EmptyState icon={FileSignature} title="No resignation requests yet" message="Your requests will appear here." />
          ) : (
            <ul className="divide-y dark:divide-slate-700">
              {mine.data?.map((r) => (
                <li key={r._id} className="flex flex-wrap items-start gap-4 px-5 py-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10">
                    <FileSignature className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-800 dark:text-slate-100">{r.reason}</p>
                    <p className="text-xs text-slate-400">Effective {formatDate(r.resignationDate)} · submitted {formatDate(r.createdAt)}</p>
                    {r.feedback && <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{r.feedback}</p>}
                    {r.comments && <p className="mt-1 text-xs text-slate-400">{r.comments}</p>}
                    {r.adminNote && <p className="mt-1 text-xs text-rose-500">{r.adminNote}</p>}
                  </div>
                  <Badge tone={STATUS_TONES[r.status]}>{r.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
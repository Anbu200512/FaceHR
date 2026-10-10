import { useState } from 'react';
import { CalendarDays, CalendarPlus } from 'lucide-react';
import api, { extractError } from '../../services/api';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import { formatDate } from '../../services/format';
import { LEAVE_TYPES } from '../../services/static';
import PageHeader from '../../components/PageHeader';
import { Card } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';

const TONES = { Pending: 'amber', Approved: 'emerald', Rejected: 'rose' };

export default function MyLeaves() {
  const toast = useToast();
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({ leaveType: 'Casual Leave', startDate: today, endDate: today, reason: '' });
  const [submitting, setSubmitting] = useState(false);

  const balance = useApi(async () => {
    const { data } = await api.get('/leaves/balance');
    return data.data;
  });
  const mine = useApi(async () => {
    const { data } = await api.get('/leaves/mine');
    return data.data;
  });

  const apply = async () => {
    if (!form.startDate || !form.endDate) { toast.error('Please choose start and end dates'); return; }
    setSubmitting(true);
    try {
      await api.post('/leaves', form);
      toast.success('Leave request submitted');
      setForm({ ...form, reason: '', startDate: today, endDate: today });
      await Promise.all([mine.refetch(), balance.refetch()]);
    } catch (err) {
      toast.error(extractError(err, 'Could not submit leave request'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <PageHeader title="My Leaves" description="Apply for leave and track your requests." />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-1">
          <Card>
            <div className="border-b px-5 py-4 dark:border-slate-700">
              <h2 className="font-bold text-slate-900 dark:text-slate-100">Balance</h2>
            </div>
            {balance.data ? (
              <div className="p-5">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-4xl font-bold text-slate-900 dark:text-slate-100">{balance.data.remaining}</p>
                    <p className="text-xs text-slate-400">of {balance.data.allowance} days ({balance.data.year})</p>
                  </div>
                  <CalendarDays className="h-8 w-8 text-sky-500" />
                </div>
                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between text-slate-600 dark:text-slate-300"><span>Used</span><span className="font-semibold">{balance.data.used}</span></div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-300"><span>Pending</span><span className="font-semibold">{balance.data.pending}</span></div>
                </div>
              </div>
            ) : (
              <div className="p-5 text-sm text-slate-400">Loading…</div>
            )}
          </Card>

          <Card>
            <div className="border-b px-5 py-4 dark:border-slate-700">
              <h2 className="font-bold text-slate-900 dark:text-slate-100">Request Leave</h2>
            </div>
            <div className="space-y-4 p-5">
              <div>
                <label className="label">Leave type</label>
                <select value={form.leaveType} onChange={(e) => setForm({ ...form, leaveType: e.target.value })} className="input">
                  {LEAVE_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">From</label>
                  <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="input" />
                </div>
                <div>
                  <label className="label">To</label>
                  <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className="input" />
                </div>
              </div>
              <div>
                <label className="label">Reason</label>
                <textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} rows={3} className="input" placeholder="Brief reason for the request…" />
              </div>
              <Button className="w-full" onClick={apply} loading={submitting}>
                <CalendarPlus className="h-4 w-4" /> Submit Request
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
            <EmptyState title="No leave requests yet" message="Your requests will appear here." />
          ) : (
            <ul className="divide-y dark:divide-slate-700">
              {mine.data?.map((l) => (
                <li key={l._id} className="flex items-center gap-4 px-5 py-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sm font-bold text-sky-600 dark:bg-sky-500/10">
                    {l.days}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-800 dark:text-slate-100">{l.leaveType}</p>
                    <p className="text-xs text-slate-400">{formatDate(l.startDate)} → {formatDate(l.endDate)} · {l.days} day(s)</p>
                    {l.reason && <p className="mt-1 truncate text-xs text-slate-500">{l.reason}</p>}
                    {l.adminNote && <p className="mt-1 text-xs text-rose-500">{l.adminNote}</p>}
                  </div>
                  <Badge tone={TONES[l.status]}>{l.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
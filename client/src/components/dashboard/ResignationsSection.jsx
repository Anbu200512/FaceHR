import { useState } from 'react';
import { Check, X, Eye, MessageSquareText } from 'lucide-react';
import api, { extractError } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { formatDate, formatDateTime } from '../../services/format';
import { Card } from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import EmptyState from '../ui/EmptyState';
import Modal from '../ui/Modal';
import Avatar from '../Avatar';
import { Skeleton } from '../ui/Skeleton';

const STATUS_TONES = { Pending: 'amber', Approved: 'emerald', Rejected: 'rose' };

export default function ResignationsSection({ rows, loading, refetch, title = 'Resignation Requests', description = 'Submitted by employees' }) {
  const toast = useToast();
  const [review, setReview] = useState(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const pending = (rows || []).filter((r) => r.status === 'Pending').length;

  const openReview = (item, action) => {
    setReview({ item, action });
    setNote('');
  };

  const submitReview = async () => {
    setBusy(true);
    try {
      const payload = note ? { adminNote: note } : {};
      await api.put(`/resignations/${review.item._id}/${review.action}`, payload);
      toast.success(review.action === 'approve' ? 'Resignation request approved' : 'Resignation request rejected');
      setReview(null);
      refetch?.();
    } catch (err) {
      toast.error(extractError(err, 'Could not update request'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-w-0">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">{title}</h2>
          <p className="text-xs text-slate-400">{description}</p>
        </div>
        {pending > 0 && <Badge tone="amber">{pending} pending</Badge>}
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="space-y-4 p-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : !rows || rows.length === 0 ? (
          <EmptyState title="No resignation requests" message="Requests submitted by employees will appear here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-xs uppercase tracking-wide text-slate-400 dark:border-slate-700">
                  <th className="px-4 py-3 font-medium">Employee</th>
                  <th className="px-4 py-3 font-medium">Reason</th>
                  <th className="px-4 py-3 font-medium">Resignation date</th>
                  <th className="px-4 py-3 font-medium">Submitted</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-slate-700">
                {rows.map((r) => (
                  <tr key={r._id} className="align-middle">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Avatar
                          src={r.employee?.profilePhoto}
                          name={`${r.employee?.firstName || ''} ${r.employee?.lastName || ''}`}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-800 dark:text-slate-100">
                            {r.employee?.firstName} {r.employee?.lastName}
                          </p>
                          <p className="truncate text-xs text-slate-400">{r.employee?.department?.name || 'No department'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-700 dark:text-slate-200">{r.reason}</p>
                      {r.feedback && <p className="max-w-[220px] truncate text-xs text-slate-400" title={r.feedback}>“{r.feedback}”</p>}
                      {r.adminNote && <p className="max-w-[220px] truncate text-xs text-rose-500" title={r.adminNote}>Note: {r.adminNote}</p>}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{formatDate(r.resignationDate)}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{formatDateTime(r.createdAt)}</td>
                    <td className="px-4 py-3"><Badge tone={STATUS_TONES[r.status]}>{r.status}</Badge></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" onClick={() => openReview(r, 'view')}>
                          <Eye className="h-4 w-4" /> View
                        </Button>
                        {r.status === 'Pending' && (
                          <>
                            <Button size="sm" variant="secondary" onClick={() => openReview(r, 'approve')}>
                              <Check className="h-4 w-4" /> Approve
                            </Button>
                            <Button size="sm" variant="danger" onClick={() => openReview(r, 'reject')}>
                              <X className="h-4 w-4" /> Reject
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        open={!!review}
        onClose={() => setReview(null)}
        title={review?.action === 'approve' ? 'Approve Resignation' : review?.action === 'reject' ? 'Reject Resignation' : 'Resignation Request'}
        size="md"
      >
        {review && (
          <div className="space-y-4">
            <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
              <div className="flex items-center gap-2">
                <Avatar
                  src={review.item.employee?.profilePhoto}
                  name={`${review.item.employee?.firstName || ''} ${review.item.employee?.lastName || ''}`}
                  size="sm"
                />
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800 dark:text-slate-100">
                    {review.item.employee?.firstName} {review.item.employee?.lastName}
                    <span className="font-normal text-slate-400"> · {review.item.employee?.department?.name || 'No department'}</span>
                  </p>
                  <p className="text-xs text-slate-400">Submitted {formatDateTime(review.item.createdAt)}</p>
                </div>
              </div>
              <div className="mt-3 grid gap-1.5">
                <p><span className="font-semibold">Reason:</span> {review.item.reason}</p>
                <p><span className="font-semibold">Resignation date:</span> {formatDate(review.item.resignationDate)}</p>
                {review.item.feedback && <p><span className="font-semibold">Feedback:</span> {review.item.feedback}</p>}
                {review.item.comments && <p className="text-xs text-slate-400">{review.item.comments}</p>}
                {review.item.adminNote && <p className="text-xs text-rose-500"><span className="font-semibold">Admin note:</span> {review.item.adminNote}</p>}
              </div>
            </div>

            {review.action === 'view' ? (
              <div className="flex justify-end pt-2">
                <Button variant="primary" onClick={() => setReview(null)}>Close</Button>
              </div>
            ) : (
              <>
                <div>
                  <label className="label">Admin note {review.action === 'reject' && '(recommended)'}</label>
                  <div className="relative">
                    <MessageSquareText className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} className="input pl-9" placeholder="Optional note to the employee…" />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="ghost" onClick={() => setReview(null)}>Cancel</Button>
                  <Button variant={review.action === 'approve' ? 'primary' : 'danger'} onClick={submitReview} loading={busy}>
                    {review.action === 'approve' ? 'Approve' : 'Reject'}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
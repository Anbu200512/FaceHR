import { useState } from 'react';
import { Check, X, Search, MessageSquareText } from 'lucide-react';
import api, { extractError } from '../../services/api';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import { formatDate, formatTime, resolveAsset } from '../../services/format';
import PageHeader from '../../components/PageHeader';
import { Card } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import Pagination from '../../components/ui/Pagination';
import Modal from '../../components/ui/Modal';
import Avatar from '../../components/Avatar';

const STATUS_TONES = { Pending: 'amber', Approved: 'emerald', Rejected: 'rose' };

export default function Regularizations() {
  const toast = useToast();
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [review, setReview] = useState(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const { data, loading, refetch } = useApi(() => {
    const sp = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (status) sp.set('status', status);
    if (search) sp.set('search', search);
    return api.get(`/regularizations?${sp.toString()}`).then((r) => r.data);
  }, [page, pageSize, status, search]);

  const openReview = (row, action) => { setReview({ row, action }); setNote(''); };

  const submitReview = async () => {
    if (!review) return;
    setBusy(true);
    try {
      const payload = note.trim() ? { adminNote: note.trim() } : {};
      await api.put(`/regularizations/${review.row._id}/${review.action}`, payload);
      toast.success(review.action === 'approve' ? 'Regularization approved' : 'Regularization rejected');
      setReview(null);
      setNote('');
      refetch();
    } catch (err) {
      toast.error(extractError(err, 'Could not update request'));
    } finally {
      setBusy(false);
    }
  };

  const rows = data?.data || [];
  const meta = data?.meta || {};

  return (
    <div>
      <PageHeader title="Attendance Regularizations" description="Review employee requests to correct missed check-in or check-out times." />

      <Card className="mb-5 p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="relative sm:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by employee name or ID..."
              className="input pl-9"
            />
          </div>
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="input"
          >
            <option value="">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-slate-50 dark:bg-slate-800/60">
              <tr>
                <th className="th">Employee</th>
                <th className="th">Date</th>
                <th className="th">Requested</th>
                <th className="th">Reason</th>
                <th className="th">Status</th>
                <th className="th text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b dark:border-slate-700">
                    <td colSpan={6} className="h-12 animate-pulse bg-slate-100 dark:bg-slate-800" />
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr><td colSpan={6}><EmptyState title="No regularization requests" message="Employee requests will appear here." /></td></tr>
              ) : rows.map((r) => (
                <tr key={r._id} className="border-b last:border-0 dark:border-slate-700">
                  <td className="td">
                    <div className="flex items-center gap-2">
                      <Avatar name={`${r.employee?.firstName || ''} ${r.employee?.lastName || ''}`} src={resolveAsset(r.employee?.profilePhoto)} size="sm" />
                      <div>
                        <p className="font-semibold text-slate-800 dark:text-slate-100">{r.employee?.firstName} {r.employee?.lastName}</p>
                        <p className="text-xs text-slate-400">{r.employeeId || r.employee?.employeeId || '—'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="td">{formatDate(r.date)}</td>
                  <td className="td text-xs">
                    <div>In: <span className="font-medium text-slate-700 dark:text-slate-200">{r.requestedCheckIn ? formatTime(r.requestedCheckIn) : '—'}</span></div>
                    <div>Out: <span className="font-medium text-slate-700 dark:text-slate-200">{r.requestedCheckOut ? formatTime(r.requestedCheckOut) : '—'}</span></div>
                  </td>
                  <td className="td max-w-[220px]"><p className="truncate text-sm text-slate-500" title={r.reason || ''}>{r.reason || '—'}</p></td>
                  <td className="td"><Badge tone={STATUS_TONES[r.status] || 'slate'}>{r.status}</Badge></td>
                  <td className="td">
                    <div className="flex justify-end gap-2">
                      {r.status === 'Pending' ? (
                        <>
                          <Button size="sm" variant="secondary" onClick={() => openReview(r, 'approve')}><Check className="h-4 w-4" /> Approve</Button>
                          <Button size="sm" variant="danger" onClick={() => openReview(r, 'reject')}><X className="h-4 w-4" /> Reject</Button>
                        </>
                      ) : (
                        <span className="max-w-[180px] text-right text-xs text-slate-400" title={r.adminNote || ''}>
                          {r.reviewedBy?.name ? `by ${r.reviewedBy.name}` : 'Reviewed'}{r.adminNote ? ` • ${r.adminNote}` : ''}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length > 0 && (
          <Pagination
            page={meta.page || page}
            pageSize={pageSize}
            total={meta.total || 0}
            onPageChange={setPage}
            onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
          />
        )}
      </Card>

      <Modal
        open={!!review}
        onClose={() => !busy && setReview(null)}
        title={review?.action === 'approve' ? 'Approve Regularization' : 'Reject Regularization'}
        size="sm"
      >
        {review && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              <span className="font-semibold text-slate-800 dark:text-slate-100">{review.row.employee?.firstName} {review.row.employee?.lastName}</span>
              {' • '}{formatDate(review.row.date)}
              {' • '}In {review.row.requestedCheckIn ? formatTime(review.row.requestedCheckIn) : '—'}
              {' / '}Out {review.row.requestedCheckOut ? formatTime(review.row.requestedCheckOut) : '—'}
            </p>
            {review.row.reason && (
              <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
                <span className="font-medium text-slate-700 dark:text-slate-200">Reason: </span>{review.row.reason}
              </div>
            )}
            <div>
              <label className="label">Admin note {review.action === 'reject' && '(recommended)'}</label>
              <div className="relative">
                <MessageSquareText className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  className="input pl-9"
                  placeholder="Add a note for the employee (optional)..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setReview(null)} disabled={busy}>Cancel</Button>
              <Button variant={review.action === 'approve' ? 'primary' : 'danger'} onClick={submitReview} loading={busy}>
                {review.action === 'approve' ? 'Approve' : 'Reject'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}





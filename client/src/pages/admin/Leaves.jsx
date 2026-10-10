import { useState } from 'react';
import { Check, X, Search, MessageSquareText } from 'lucide-react';
import api, { extractError } from '../../services/api';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import { formatDate } from '../../services/format';
import PageHeader from '../../components/PageHeader';
import { Card } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import Pagination from '../../components/ui/Pagination';
import Modal from '../../components/ui/Modal';
import Avatar from '../../components/Avatar';

const STATUS_TONES = { Pending: 'amber', Approved: 'emerald', Rejected: 'rose' };

export default function Leaves() {
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
    return api.get(`/leaves?${sp.toString()}`).then((r) => r.data);
  }, [page, pageSize, status, search]);

  const openReview = (leave, action) => {
    setReview({ leave, action });
    setNote('');
  };

  const submitReview = async () => {
    setBusy(true);
    try {
      const payload = note ? { adminNote: note } : {};
      await api.put(`/leaves/${review.leave._id}/${review.action}`, payload);
      toast.success(review.action === 'approve' ? 'Leave approved' : 'Leave rejected');
      setReview(null);
      refetch();
    } catch (err) {
      toast.error(extractError(err, 'Could not update leave'));
    } finally {
      setBusy(false);
    }
  };

  const rows = data?.data || [];
  const meta = data?.meta || {};

  return (
    <div>
      <PageHeader title="Leave Management" description="Review and respond to leave requests." />

      <Card className="mb-5 p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="relative sm:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search by name or employee ID…" className="input pl-9" />
          </div>
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="input">
            <option value="">All Statuses</option>
            <option>Pending</option>
            <option>Approved</option>
            <option>Rejected</option>
          </select>
        </div>
      </Card>

      <Card className="hidden overflow-hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-slate-50 dark:bg-slate-800/60">
              <tr>
                <th className="th">Employee</th>
                <th className="th">Leave Type</th>
                <th className="th">Dates</th>
                <th className="th">Days</th>
                <th className="th">Reason</th>
                <th className="th">Status</th>
                <th className="th text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b dark:border-slate-700">
                    <td colSpan={7} className="h-12 animate-pulse bg-slate-100 dark:bg-slate-800" />
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr><td colSpan={7}><EmptyState title="No leave requests" message="Requests from employees will appear here." /></td></tr>
              ) : rows.map((l) => (
                <tr key={l._id} className="border-b transition last:border-0 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/50">
                  <td className="td">
                    <div className="flex items-center gap-2">
                      <Avatar name={`${l.employee.firstName} ${l.employee.lastName}`} size="sm" />
                      <div>
                        <p className="font-semibold text-slate-800 dark:text-slate-100">{l.employee.firstName} {l.employee.lastName}</p>
                        <p className="text-xs text-slate-400">{l.employeeId}</p>
                      </div>
                    </div>
                  </td>
                  <td className="td">{l.leaveType}</td>
                  <td className="td">{formatDate(l.startDate)} → {formatDate(l.endDate)}</td>
                  <td className="td">{l.days}</td>
                  <td className="td max-w-[220px]"><p className="truncate text-sm text-slate-500" title={l.reason}>{l.reason || '—'}</p></td>
                  <td className="td"><Badge tone={STATUS_TONES[l.status]}>{l.status}</Badge></td>
                  <td className="td">
                    <div className="flex justify-end gap-2">
                      {l.status === 'Pending' ? (
                        <>
                          <Button size="sm" variant="secondary" onClick={() => openReview(l, 'approve')}>
                            <Check className="h-4 w-4" /> Approve
                          </Button>
                          <Button size="sm" variant="danger" onClick={() => openReview(l, 'reject')}>
                            <X className="h-4 w-4" /> Reject
                          </Button>
                        </>
                      ) : (
                        <span className="text-xs text-slate-400">
                          {l.reviewedBy?.name ? `Reviewed by ${l.reviewedBy.name}` : '—'}
                          {l.adminNote ? ` · ${l.adminNote}` : ''}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length > 0 && <Pagination page={meta.page} pageSize={pageSize} total={meta.total} onPageChange={setPage} onPageSizeChange={(s) => { setPageSize(s); setPage(1); }} />}
      </Card>

      {/* Mobile */}
      <div className="space-y-3 md:hidden">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <Card key={i} className="h-28 animate-pulse" />)
        ) : rows.length === 0 ? (
          <Card><EmptyState title="No leave requests" /></Card>
        ) : rows.map((l) => (
          <Card key={l._id} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Avatar name={`${l.employee.firstName} ${l.employee.lastName}`} size="sm" />
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-100">{l.employee.firstName} {l.employee.lastName}</p>
                  <p className="text-xs text-slate-400">{l.employeeId}</p>
                </div>
              </div>
              <Badge tone={STATUS_TONES[l.status]}>{l.status}</Badge>
            </div>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
              <span className="font-semibold">{l.leaveType}</span> · {l.days} day(s)
            </p>
            <p className="text-xs text-slate-400">{formatDate(l.startDate)} → {formatDate(l.endDate)}</p>
            {l.reason && <p className="mt-2 truncate text-xs text-slate-500">{l.reason}</p>}
            {l.status === 'Pending' && (
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="secondary" className="flex-1" onClick={() => openReview(l, 'approve')}><Check className="h-4 w-4" /> Approve</Button>
                <Button size="sm" variant="danger" className="flex-1" onClick={() => openReview(l, 'reject')}><X className="h-4 w-4" /> Reject</Button>
              </div>
            )}
          </Card>
        ))}
        {rows.length > 0 && <Pagination page={meta.page} pageSize={pageSize} total={meta.total} onPageChange={setPage} onPageSizeChange={(s) => { setPageSize(s); setPage(1); }} />}
      </div>

      <Modal
        open={!!review}
        onClose={() => setReview(null)}
        title={review?.action === 'approve' ? 'Approve Leave' : 'Reject Leave'}
        size="sm"
      >
        {review && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {review.leave.employee.firstName} {review.leave.employee.lastName} · <span className="font-semibold">{review.leave.leaveType}</span> · {review.leave.days} day(s) · {formatDate(review.leave.startDate)} → {formatDate(review.leave.endDate)}
            </p>
            <div>
              <label className="label">Admin note {review.action === 'reject' && '(recommended)'}</label>
              <div className="relative">
                <MessageSquareText className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} className="input pl-9" placeholder="Optional note to the employee…" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setReview(null)}>Cancel</Button>
              <Button
                variant={review.action === 'approve' ? 'primary' : 'danger'}
                onClick={submitReview}
                loading={busy}
              >
                {review.action === 'approve' ? 'Approve' : 'Reject'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
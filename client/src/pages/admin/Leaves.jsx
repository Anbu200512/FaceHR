import { useMemo, useState } from 'react';
import { Search, Check, X, StickyNote, MessageSquareText } from 'lucide-react';
import api from '../../services/api';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import { formatDate, resolveAsset } from '../../services/format';
import PageHeader from '../../components/PageHeader';
import { Card } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import Pagination from '../../components/ui/Pagination';
import Modal from '../../components/ui/Modal';
import Avatar from '../../components/Avatar';
import { Skeleton, SkeletonRow } from '../../components/ui/Skeleton';

const STATUS_TONES = { Pending: 'amber', Approved: 'emerald', Rejected: 'rose' };

export default function Leaves() {
  const toast = useToast();
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [review, setReview] = useState(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const { data, loading, refetch } = useApi(() => {
    const sp = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (status) sp.set('status', status);
    return api.get(`/leaves?${sp.toString()}`).then((r) => r.data);
  }, [page, pageSize, status]);

  const rows = useMemo(() => {
    const list = data?.data || [];
    if (!search) return list;
    const q = search.toLowerCase();
    return list.filter((l) =>
      `${l.employee.firstName} ${l.employee.middleName || ''} ${l.employee.lastName} ${l.employeeId} ${l.leaveType}`.toLowerCase().includes(q)
    );
  }, [data, search]);
  const meta = data?.meta || {};

  const openReview = (leave, action) => {
    setReview({ leave, action });
    setNote('');
  };

  const submitReview = async () => {
    if (!review) return;
    setBusy(true);
    try {
      await api.put(`/leaves/${review.leave._id}`, {
        status: review.action === 'approve' ? 'Approved' : 'Rejected',
        adminNote: note,
      });
      toast.success(`Leave ${review.action === 'approve' ? 'approved' : 'rejected'}`);
      setReview(null);
      refetch();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update leave');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader title="Leave Requests" description="Review, approve or reject leave requests from employees." />

      <Card className="mb-5 p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-300" />
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search employee or leave type..." className="input pl-9" />
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
          <table className="w-full min-w-[860px]">
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
                Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} cols={7} />)
              ) : rows.length === 0 ? (
                <tr><td colSpan={7}><EmptyState title="No leave requests" message="Requests from employees will appear here." /></td></tr>
              ) : rows.map((l) => {
                const name = [l.employee.firstName, l.employee.middleName, l.employee.lastName].filter(Boolean).join(' ');
                return (
                <tr key={l._id} className="border-b transition last:border-0 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/50">
                  <td className="td">
                    <div className="flex items-center gap-2">
                      <Avatar name={name} src={resolveAsset(l.employee?.profilePhoto)} size="sm" />
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 dark:text-slate-100">{name}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-300">{l.employeeId}</p>
                      </div>
                    </div>
                  </td>
                  <td className="td">{l.leaveType}</td>
                  <td className="td">{formatDate(l.startDate)} → {formatDate(l.endDate)}</td>
                  <td className="td">{l.days}</td>
                  <td className="td max-w-[220px]"><p className="truncate text-sm text-slate-500 dark:text-slate-300" title={l.reason}>{l.reason || '-'}</p></td>
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
                        <span className="text-xs text-slate-400 dark:text-slate-300">
                          {l.reviewedBy?.name ? `Reviewed by ${l.reviewedBy.name}` : '-'}
                          {l.adminNote ? ` · ${l.adminNote}` : ''}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );})}
            </tbody>
          </table>
        </div>
        {rows.length > 0 && <Pagination page={meta.page} pageSize={pageSize} total={meta.total} onPageChange={setPage} onPageSizeChange={(s) => { setPageSize(s); setPage(1); }} />}
      </Card>

      <div className="space-y-3 md:hidden">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="space-y-3 p-4">
              <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
              <Skeleton className="h-3 w-40" />
            </Card>
          ))
        ) : rows.length === 0 ? (
          <Card><EmptyState title="No leave requests" /></Card>
        ) : rows.map((l) => {
          const name = [l.employee.firstName, l.employee.middleName, l.employee.lastName].filter(Boolean).join(' ');
          return (
          <Card key={l._id} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Avatar name={name} src={resolveAsset(l.employee?.profilePhoto)} size="sm" />
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800 dark:text-slate-100">{name}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-300">{l.employeeId}</p>
                </div>
              </div>
              <Badge tone={STATUS_TONES[l.status]}>{l.status}</Badge>
            </div>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
              <span className="font-semibold">{l.leaveType}</span> · {l.days} day(s)
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-300">{formatDate(l.startDate)} → {formatDate(l.endDate)}</p>
            {l.reason && <p className="mt-2 truncate text-xs text-slate-500 dark:text-slate-300">{l.reason}</p>}
            {l.status === 'Pending' && (
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="secondary" className="flex-1" onClick={() => openReview(l, 'approve')}><Check className="h-4 w-4" /> Approve</Button>
                <Button size="sm" variant="danger" className="flex-1" onClick={() => openReview(l, 'reject')}><X className="h-4 w-4" /> Reject</Button>
              </div>
            )}
          </Card>
        );})}
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
              {[review.leave.employee.firstName, review.leave.employee.middleName, review.leave.employee.lastName].filter(Boolean).join(' ')} · <span className="font-semibold">{review.leave.leaveType}</span> · {review.leave.days} day(s) · {formatDate(review.leave.startDate)} → {formatDate(review.leave.endDate)}
            </p>
            <div>
              <label className="label">Admin note {review.action === 'reject' && '(recommended)'}</label>
              <div className="relative">
                <MessageSquareText className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400 dark:text-slate-300" />
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
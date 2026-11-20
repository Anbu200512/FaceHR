import { useState } from 'react';
import { Search, Eye, Check, X } from 'lucide-react';
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
import { SkeletonRow } from '../../components/ui/Skeleton';
import { Textarea } from '../../components/ui/Form';

const STATUS_TONES = { Pending: 'amber', Approved: 'emerald', Rejected: 'rose' };

export default function Regularizations() {
  const toast = useToast();
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [busy, setBusy] = useState(false);
  const [viewRow, setViewRow] = useState(null);
  const [note, setNote] = useState('');

  const { data, loading, refetch } = useApi(() => {
    const sp = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (status) sp.set('status', status);
    if (search) sp.set('search', search);
    return api.get(`/regularizations?${sp.toString()}`).then((r) => r.data);
  }, [page, pageSize, status, search]);

  const rows = data?.data || [];
  const meta = data?.meta || {};

  const openRow = (r) => {
    setViewRow(r);
    setNote(r.adminNote || '');
  };

  const closeRow = () => {
    if (busy) return;
    setViewRow(null);
    setNote('');
  };

  const review = async (id, action) => {
    setBusy(true);
    try {
      await api.put(`/regularizations/${id}/${action}`, { adminNote: note.trim() });
      toast.success(`Regularization ${action === 'approve' ? 'approved' : 'rejected'}`);
      setViewRow(null);
      setNote('');
      refetch();
    } catch (err) {
      if (action === 'approve' && err.response?.data?.code === 'OVERWRITE_CONFIRMATION_REQUIRED') {
        const ok = window.confirm(err.response?.data?.message || 'Attendance already has verified punch data for this day. Overwrite it?');
        if (ok) {
          try {
            await api.put(`/regularizations/${id}/approve`, { adminNote: note.trim(), force: true });
            toast.success('Regularization approved');
            setViewRow(null);
            setNote('');
            refetch();
          } catch (e) {
            toast.error(extractError(e, 'Could not approve request'));
          }
        }
      } else {
        toast.error(extractError(err, `Could not ${action} request`));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader title="Attendance Regularizations" description="Review employee requests to correct missed check-in or check-out times." />

      <Card className="mb-5 p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="relative sm:col-span-2 lg:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-300" />
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
          <table className="w-full min-w-[720px]">
            <thead className="border-b bg-slate-50 dark:bg-slate-800/60">
              <tr>
                <th className="th">Employee</th>
                <th className="th">Date</th>
                <th className="th">Requested</th>
                <th className="th">Reason</th>
                <th className="th">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} cols={5} />)
              ) : rows.length === 0 ? (
                <tr><td colSpan={5}><EmptyState title="No regularization requests" message="Employee requests will appear here." /></td></tr>
              ) : rows.map((r) => {
                const name = [r.employee?.firstName, r.employee?.middleName, r.employee?.lastName].filter(Boolean).join(' ') || 'Employee';
                return (
                <tr key={r._id || r.id} className="border-b last:border-0 dark:border-slate-700">
                  <td className="td">
                    <div className="flex items-center gap-2">
                      <Avatar name={name} src={resolveAsset(r.employee?.profilePhoto)} size="sm" />
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 dark:text-slate-100">{name}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-300">{r.employeeId || r.employee?.employeeId || ''}</p>
                      </div>
                    </div>
                  </td>
                  <td className="td">{formatDate(r.date)}</td>
                  <td className="td text-xs">
                    <div>In: <span className="font-medium text-slate-700 dark:text-slate-200">{r.requestedCheckIn ? formatTime(r.requestedCheckIn) : '-'}</span></div>
                    <div>Out: <span className="font-medium text-slate-700 dark:text-slate-200">{r.requestedCheckOut ? formatTime(r.requestedCheckOut) : '-'}</span></div>
                  </td>
                  <td className="td max-w-[220px]">
                    <Button size="sm" variant="ghost" className="px-2" onClick={() => openRow(r)}>
                      <Eye className="h-4 w-4" /> {r.status === 'Pending' ? 'Review' : 'View'}
                    </Button>
                  </td>
                  <td className="td"><Badge tone={STATUS_TONES[r.status] || 'slate'}>{r.status}</Badge></td>
                </tr>
              );})}
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
        open={!!viewRow}
        onClose={closeRow}
        title={viewRow?.status === 'Pending' ? 'Review Regularization' : 'Regularization Details'}
        size="sm"
      >
        {viewRow && (() => {
          const name = [viewRow.employee?.firstName, viewRow.employee?.middleName, viewRow.employee?.lastName].filter(Boolean).join(' ') || 'Employee';
          const id = viewRow._id || viewRow.id;
          const pending = viewRow.status === 'Pending';
          return (
          <div className="space-y-4 text-sm">
            <div className="space-y-2">
              <p><span className="font-medium text-slate-700 dark:text-slate-200">Employee:</span> {name} ({viewRow.employeeId || viewRow.employee?.employeeId || '-'})</p>
              <p><span className="font-medium text-slate-700 dark:text-slate-200">Date:</span> {formatDate(viewRow.date)}</p>
              <p><span className="font-medium text-slate-700 dark:text-slate-200">Requested:</span> In {viewRow.requestedCheckIn ? formatTime(viewRow.requestedCheckIn) : '-'} / Out {viewRow.requestedCheckOut ? formatTime(viewRow.requestedCheckOut) : '-'}</p>
              <p><span className="font-medium text-slate-700 dark:text-slate-200">Status:</span> <Badge tone={STATUS_TONES[viewRow.status] || 'slate'}>{viewRow.status}</Badge></p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
              <p className="mb-1 text-xs font-semibold uppercase text-slate-400 dark:text-slate-300">Reason</p>
              <p className="whitespace-pre-wrap break-words text-slate-700 dark:text-slate-200">{viewRow.reason || 'No reason provided'}</p>
            </div>
            {pending ? (
              <Textarea
                label="Admin Note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder="Add a note (optional)..."
              />
            ) : viewRow.adminNote ? (
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
                <p className="mb-1 text-xs font-semibold uppercase text-slate-400 dark:text-slate-300">Admin Note</p>
                <p className="whitespace-pre-wrap break-words text-slate-700 dark:text-slate-200">{viewRow.adminNote}</p>
              </div>
            ) : null}
            {pending && (
              <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
                <Button variant="danger" onClick={() => review(id, 'reject')} disabled={busy} loading={busy}>
                  <X className="h-4 w-4" /> Reject
                </Button>
                <Button variant="success" onClick={() => review(id, 'approve')} disabled={busy} loading={busy}>
                  <Check className="h-4 w-4" /> Approve
                </Button>
              </div>
            )}
          </div>
        );})()}
      </Modal>
    </div>
  );
}

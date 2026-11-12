import { useState } from 'react';
import { Plus, Eye, Trash2, BadgeCheck, Wallet } from 'lucide-react';
import api, { extractError } from '../../services/api';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import { MONTH_OPTIONS } from '../../services/static';
import PageHeader from '../../components/PageHeader';
import { Card } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import { Input, Select, Textarea } from '../../components/ui/Form';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

const monthName = (m) => MONTH_OPTIONS[(m || 1) - 1];
const money = (value, currency = 'INR') => {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency || 'INR', maximumFractionDigits: 0 }).format(value || 0);
  } catch {
    return `${currency || 'INR'} ${Number(value || 0).toLocaleString()}`;
  }
};

export default function Payroll() {
  const toast = useToast();
  const now = new Date();
  const [genOpen, setGenOpen] = useState(false);
  const [genForm, setGenForm] = useState({ month: now.getMonth() + 1, year: now.getFullYear(), notes: '' });
  const [busy, setBusy] = useState(false);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const runs = useApi(async () => {
    const { data } = await api.get('/payroll');
    return data.data;
  });

  const yearOptions = [];
  for (let y = now.getFullYear(); y >= now.getFullYear() - 4; y -= 1) yearOptions.push(y);

  const generate = async () => {
    setBusy(true);
    try {
      const { data } = await api.post('/payroll/generate', {
        month: Number(genForm.month),
        year: Number(genForm.year),
        notes: genForm.notes,
      });
      toast.success(data.message || 'Payroll generated');
      setGenOpen(false);
      setDetail(data.data);
      runs.refetch();
    } catch (err) {
      toast.error(extractError(err, 'Could not generate payroll'));
    } finally {
      setBusy(false);
    }
  };

  const openDetail = async (id) => {
    setDetail({ id, loading: true });
    setDetailLoading(true);
    try {
      const { data } = await api.get(`/payroll/${id}`);
      setDetail(data.data);
    } catch (err) {
      toast.error(extractError(err, 'Could not load payroll'));
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const markPaid = async (id) => {
    setBusy(true);
    try {
      await api.put(`/payroll/${id}/pay`);
      toast.success('Payroll marked as paid');
      runs.refetch();
      if (detail?.id === id) openDetail(id);
    } catch (err) {
      toast.error(extractError(err, 'Could not update payroll'));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await api.delete(`/payroll/${deleteId}`);
      toast.success('Payroll run deleted');
      setDeleteId(null);
      runs.refetch();
    } catch (err) {
      toast.error(extractError(err, 'Could not delete payroll'));
    } finally {
      setBusy(false);
    }
  };

  const rows = runs.data || [];

  return (
    <div>
      <PageHeader title="Payroll" description="Generate monthly payroll, review payslips and mark salaries as paid.">
        <Button size="sm" onClick={() => setGenOpen(true)}><Plus className="h-4 w-4" /> Generate Payroll</Button>
      </PageHeader>

      <Card className="overflow-hidden">
        {runs.loading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-12 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />)}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState icon={Wallet} title="No payroll runs yet" message="Generate payroll for a month to create payslips." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-slate-50 dark:bg-slate-800/60">
                <tr>
                  <th className="th">Period</th>
                  <th className="th">Employees</th>
                  <th className="th">Gross</th>
                  <th className="th">Deductions</th>
                  <th className="th">Net</th>
                  <th className="th">Status</th>
                  <th className="th text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r._id} className="border-b last:border-0 dark:border-slate-700">
                    <td className="td font-semibold text-slate-800 dark:text-slate-100">{monthName(r.month)} {r.year}</td>
                    <td className="td">{r._count?.payslips ?? '—'}</td>
                    <td className="td">{money(r.totalGross)}</td>
                    <td className="td">{money(r.totalDeductions)}</td>
                    <td className="td font-semibold">{money(r.totalNet)}</td>
                    <td className="td"><Badge tone={r.status === 'Paid' ? 'emerald' : 'sky'}>{r.status}</Badge></td>
                    <td className="td">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openDetail(r._id)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-brand-600 dark:text-slate-400 dark:hover:bg-slate-800" title="View">
                          <Eye className="h-4 w-4" />
                        </button>
                        {r.status !== 'Paid' && (
                          <button onClick={() => markPaid(r._id)} className="rounded-lg p-1.5 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600 dark:text-slate-400 dark:hover:bg-emerald-500/10" title="Mark paid">
                            <BadgeCheck className="h-4 w-4" />
                          </button>
                        )}
                        {r.status !== 'Paid' && (
                          <button onClick={() => setDeleteId(r._id)} className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600 dark:text-slate-400 dark:hover:bg-rose-500/10" title="Delete">
                            <Trash2 className="h-4 w-4" />
                          </button>
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

      {/* Generate modal */}
      <Modal open={genOpen} onClose={() => setGenOpen(false)} title="Generate Payroll" subtitle="Payslips are recalculated from salary, attendance, leaves and holidays." size="sm">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Select label="Month" value={genForm.month} onChange={(e) => setGenForm({ ...genForm, month: e.target.value })} options={MONTH_OPTIONS.map((m, i) => ({ value: i + 1, label: m }))} />
            <Select label="Year" value={genForm.year} onChange={(e) => setGenForm({ ...genForm, year: e.target.value })} options={yearOptions.map((y) => ({ value: y, label: String(y) }))} />
          </div>
          <Textarea label="Notes (optional)" value={genForm.notes} onChange={(e) => setGenForm({ ...genForm, notes: e.target.value })} rows={2} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setGenOpen(false)}>Cancel</Button>
            <Button onClick={generate} loading={busy}>Generate</Button>
          </div>
        </div>
      </Modal>

      {/* Detail modal */}
      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail?.id ? `Payroll · ${monthName(detail.month)} ${detail.year}` : 'Payroll'}
        subtitle={detail?.id ? `${detail.payslips?.length || 0} payslips · ${detail.status}` : undefined}
        size="xl"
      >
        {detailLoading || !detail?.id ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-10 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />)}
          </div>
        ) : (
          <>
            <div className="mb-4 grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60"><p className="text-xs text-slate-400">Gross</p><p className="font-bold">{money(detail.totalGross)}</p></div>
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60"><p className="text-xs text-slate-400">Deductions</p><p className="font-bold">{money(detail.totalDeductions)}</p></div>
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60"><p className="text-xs text-slate-400">Net</p><p className="font-bold">{money(detail.totalNet)}</p></div>
            </div>
            <div className="overflow-x-auto rounded-xl border dark:border-slate-700">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-800/60">
                  <tr>
                    <th className="th">Employee</th>
                    <th className="th">Present</th>
                    <th className="th">LOP</th>
                    <th className="th">Gross</th>
                    <th className="th">Deductions</th>
                    <th className="th">Net</th>
                    <th className="th">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.payslips?.map((p) => (
                    <tr key={p._id} className="border-b last:border-0 dark:border-slate-700">
                      <td className="td">
                        <p className="font-semibold text-slate-800 dark:text-slate-100">{p.employee?.firstName} {p.employee?.lastName}</p>
                        <p className="text-xs text-slate-400">{p.employeeId}{p.employee?.department?.name ? ` · ${p.employee.department.name}` : ''}</p>
                      </td>
                      <td className="td">{p.presentDays}/{p.workingDays}</td>
                      <td className="td">{p.lopDays}</td>
                      <td className="td">{money(p.gross, p.currency)}</td>
                      <td className="td">{money(p.deductions, p.currency)}</td>
                      <td className="td font-semibold">{money(p.netPay, p.currency)}</td>
                      <td className="td"><Badge tone={p.status === 'Paid' ? 'emerald' : 'sky'}>{p.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {detail.status !== 'Paid' && (
              <div className="mt-4 flex justify-end">
                <Button onClick={() => markPaid(detail.id)} loading={busy}>
                  <BadgeCheck className="h-4 w-4" /> Mark all as paid
                </Button>
              </div>
            )}
          </>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={remove}
        loading={busy}
        title="Delete payroll run?"
        message="All payslips in this run will be deleted. This cannot be undone."
        confirmLabel="Delete"
      />
    </div>
  );
}

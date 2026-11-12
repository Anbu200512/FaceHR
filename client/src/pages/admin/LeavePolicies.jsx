import { useState } from 'react';
import { Plus, Pencil, Trash2, SlidersHorizontal } from 'lucide-react';
import api, { extractError } from '../../services/api';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import { LEAVE_TYPES, LEAVE_ACCRUALS } from '../../services/static';
import PageHeader from '../../components/PageHeader';
import { Card } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import { Input, Select } from '../../components/ui/Form';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

const emptyForm = { leaveType: '', annualAllowance: 12, accrual: 'yearly', carryForward: false, maxCarryForward: 0, active: true };

export default function LeavePolicies() {
  const toast = useToast();
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const { data, loading, refetch } = useApi(async () => {
    const { data } = await api.get('/leave-policies');
    return data.data;
  });

  const openNew = () => { setForm(emptyForm); setModal({ editing: false }); };
  const openEdit = (p) => {
    setForm({
      leaveType: p.leaveType,
      annualAllowance: p.annualAllowance,
      accrual: p.accrual,
      carryForward: p.carryForward,
      maxCarryForward: p.maxCarryForward,
      active: p.active,
    });
    setModal({ editing: true, id: p._id });
  };

  const submit = async () => {
    if (!form.leaveType.trim()) { toast.error('Leave type is required'); return; }
    setBusy(true);
    try {
      const payload = {
        ...form,
        annualAllowance: Number(form.annualAllowance) || 0,
        maxCarryForward: Number(form.maxCarryForward) || 0,
      };
      if (modal.editing) {
        await api.put(`/leave-policies/${modal.id}`, payload);
        toast.success('Policy updated');
      } else {
        await api.post('/leave-policies', payload);
        toast.success('Policy created');
      }
      setModal(null);
      refetch();
    } catch (err) {
      toast.error(extractError(err, 'Could not save policy'));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await api.delete(`/leave-policies/${deleteId}`);
      toast.success('Policy deleted');
      setDeleteId(null);
      refetch();
    } catch (err) {
      toast.error(extractError(err, 'Could not delete policy'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader title="Leave Policies" description="Configure allowances, accrual and carry-forward per leave type.">
        <Button size="sm" onClick={openNew}><Plus className="h-4 w-4" /> New Policy</Button>
      </PageHeader>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-12 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />)}
          </div>
        ) : !data?.length ? (
          <EmptyState icon={SlidersHorizontal} title="No leave policies" message="Create policies to drive leave balances." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-slate-50 dark:bg-slate-800/60">
                <tr>
                  <th className="th">Leave Type</th>
                  <th className="th">Annual Allowance</th>
                  <th className="th">Accrual</th>
                  <th className="th">Carry Forward</th>
                  <th className="th">Status</th>
                  <th className="th text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.map((p) => (
                  <tr key={p._id} className="border-b last:border-0 dark:border-slate-700">
                    <td className="td font-semibold text-slate-800 dark:text-slate-100">{p.leaveType}</td>
                    <td className="td">{p.annualAllowance === 0 ? 'Unlimited' : `${p.annualAllowance} days`}</td>
                    <td className="td capitalize">{p.accrual}</td>
                    <td className="td">{p.carryForward ? `Yes · max ${p.maxCarryForward}` : 'No'}</td>
                    <td className="td"><Badge tone={p.active ? 'emerald' : 'rose'}>{p.active ? 'Active' : 'Inactive'}</Badge></td>
                    <td className="td">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openEdit(p)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-brand-600 dark:text-slate-400 dark:hover:bg-slate-800">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => setDeleteId(p._id)} className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600 dark:text-slate-400 dark:hover:bg-rose-500/10">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.editing ? 'Edit Leave Policy' : 'New Leave Policy'} size="sm">
        <div className="space-y-4">
          <div>
            <label className="label">Leave type *</label>
            <input
              value={form.leaveType}
              onChange={(e) => setForm({ ...form, leaveType: e.target.value })}
              className="input"
              placeholder="Casual Leave"
              list="leave-type-options"
            />
            <datalist id="leave-type-options">
              {LEAVE_TYPES.map((t) => <option key={t} value={t} />)}
            </datalist>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Annual allowance" type="number" min="0" value={form.annualAllowance} onChange={(e) => setForm({ ...form, annualAllowance: e.target.value })} hint="0 = unlimited" />
            <Select label="Accrual" value={form.accrual} onChange={(e) => setForm({ ...form, accrual: e.target.value })} options={LEAVE_ACCRUALS} />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <input type="checkbox" checked={form.carryForward} onChange={(e) => setForm({ ...form, carryForward: e.target.checked })} className="h-4 w-4 rounded border-slate-300" />
            Allow carry-forward from the previous year
          </label>
          {form.carryForward && (
            <Input label="Max carry-forward days" type="number" min="0" value={form.maxCarryForward} onChange={(e) => setForm({ ...form, maxCarryForward: e.target.value })} />
          )}
          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="h-4 w-4 rounded border-slate-300" />
            Active
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setModal(null)}>Cancel</Button>
            <Button onClick={submit} loading={busy}>Save</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={remove}
        loading={busy}
        title="Delete leave policy?"
        message="Employees will fall back to the default allowance for this leave type."
        confirmLabel="Delete"
      />
    </div>
  );
}

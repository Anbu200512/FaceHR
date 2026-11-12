import { useState } from 'react';
import { Plus, Pencil, Trash2, CalendarDays } from 'lucide-react';
import api, { extractError } from '../../services/api';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import { formatDate, toInputDate } from '../../services/format';
import { HOLIDAY_TYPES } from '../../services/static';
import PageHeader from '../../components/PageHeader';
import { Card } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import { Input, Select, Textarea } from '../../components/ui/Form';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

const emptyForm = { name: '', date: '', type: 'Public', description: '', active: true };

export default function Holidays() {
  const toast = useToast();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const { data, loading, refetch } = useApi(async () => {
    const { data } = await api.get(`/holidays?year=${year}`);
    return data.data;
  }, [year]);

  const openNew = () => { setForm(emptyForm); setModal({ editing: false }); };
  const openEdit = (h) => {
    setForm({
      name: h.name,
      date: toInputDate(h.date),
      type: h.type,
      description: h.description || '',
      active: h.active,
    });
    setModal({ editing: true, id: h._id });
  };

  const submit = async () => {
    if (!form.name.trim() || !form.date) { toast.error('Name and date are required'); return; }
    setBusy(true);
    try {
      if (modal.editing) {
        await api.put(`/holidays/${modal.id}`, form);
        toast.success('Holiday updated');
      } else {
        await api.post('/holidays', form);
        toast.success('Holiday added');
      }
      setModal(null);
      refetch();
    } catch (err) {
      toast.error(extractError(err, 'Could not save holiday'));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await api.delete(`/holidays/${deleteId}`);
      toast.success('Holiday deleted');
      setDeleteId(null);
      refetch();
    } catch (err) {
      toast.error(extractError(err, 'Could not delete holiday'));
    } finally {
      setBusy(false);
    }
  };

  const years = [];
  for (let y = currentYear + 1; y >= currentYear - 3; y -= 1) years.push(y);

  return (
    <div>
      <PageHeader title="Holiday Calendar" description="Define public holidays so leave and payroll skip them automatically.">
        <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="input w-auto">
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <Button size="sm" onClick={openNew}><Plus className="h-4 w-4" /> Add Holiday</Button>
      </PageHeader>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-12 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />)}
          </div>
        ) : !data?.length ? (
          <EmptyState icon={CalendarDays} title="No holidays" message="Add the public holidays for this year." />
        ) : (
          <div className="divide-y dark:divide-slate-700">
            {data.map((h) => (
              <div key={h._id} className="flex items-center gap-4 px-5 py-3.5">
                <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400">
                  <span className="text-sm font-bold leading-none">{new Date(h.date).getDate()}</span>
                  <span className="text-[10px] uppercase">{new Date(h.date).toLocaleString(undefined, { month: 'short' })}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-800 dark:text-slate-100">{h.name}</p>
                  <p className="text-xs text-slate-400">
                    {formatDate(h.date)} · {new Date(h.date).toLocaleDateString(undefined, { weekday: 'long' })}
                    {h.description ? ` · ${h.description}` : ''}
                  </p>
                </div>
                <Badge tone={h.active ? undefined : 'rose'}>{h.active ? h.type : 'Inactive'}</Badge>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(h)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-brand-600 dark:text-slate-400 dark:hover:bg-slate-800">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => setDeleteId(h._id)} className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600 dark:text-slate-400 dark:hover:bg-rose-500/10">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.editing ? 'Edit Holiday' : 'Add Holiday'} size="sm">
        <div className="space-y-4">
          <Input label="Holiday name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Diwali" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Date *" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            <Select label="Type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} options={HOLIDAY_TYPES} />
          </div>
          <Textarea label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="h-4 w-4 rounded border-slate-300" />
            Active (counts in leave and payroll calculations)
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
        title="Delete holiday?"
        message="This holiday will no longer be excluded from leave or payroll."
        confirmLabel="Delete"
      />
    </div>
  );
}

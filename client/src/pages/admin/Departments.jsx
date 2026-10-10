import { useState } from 'react';
import { Plus, Pencil, Trash2, Users } from 'lucide-react';
import api, { extractError } from '../../services/api';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import PageHeader from '../../components/PageHeader';
import { Card } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import { Input } from '../../components/ui/Form';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Avatar from '../../components/Avatar';

export default function Departments() {
  const [tab, setTab] = useState('departments');

  return (
    <div>
      <PageHeader title="Organization Structure" description="Manage departments and designations." />
      <div className="mb-5 flex gap-1 rounded-xl border border-slate-200 p-1 dark:border-slate-700" style={{ width: 'max-content' }}>
        {['departments', 'designations'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-1.5 text-sm font-semibold capitalize transition ${tab === t ? 'bg-brand-600 text-white' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'}`}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === 'departments' ? <DepartmentsTab /> : <DesignationsTab />}
    </div>
  );
}

/* ---------------- Departments ---------------- */
function DepartmentsTab() {
  const toast = useToast();
  const { data, loading, refetch } = useApi(async () => {
    const { data } = await api.get('/departments');
    return data.data;
  });
  const employees = useApi(async () => {
    const { data } = await api.get('/employees?page=1&pageSize=300&status=Active');
    return data.data;
  });

  const [modal, setModal] = useState(null);
  const [name, setName] = useState('');
  const [head, setHead] = useState('');
  const [busy, setBusy] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const openNew = () => { setName(''); setHead(''); setModal({ editing: false }); };
  const openEdit = (d) => { setName(d.name); setHead(d.head?._id || ''); setModal({ editing: true, id: d._id }); };

  const submit = async () => {
    if (!name.trim()) { toast.error('Department name is required'); return; }
    setBusy(true);
    try {
      if (modal.editing) {
        await api.put(`/departments/${modal.id}`, { name: name.trim(), head: head || undefined });
        toast.success('Department updated');
      } else {
        await api.post('/departments', { name: name.trim(), head: head || undefined });
        toast.success('Department created');
      }
      setModal(null);
      refetch();
    } catch (err) {
      toast.error(extractError(err, 'Could not save department'));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await api.delete(`/departments/${deleteId}`);
      toast.success('Department deleted');
      setDeleteId(null);
      refetch();
    } catch (err) {
      toast.error(extractError(err, 'Could not delete department'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <Card className="mb-4 flex items-center justify-between p-4">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {loading ? 'Loading…' : `${data?.length || 0} departments`}
        </p>
        <Button size="sm" onClick={openNew}><Plus className="h-4 w-4" /> New Department</Button>
      </Card>

      {!loading && data?.length === 0 ? (
        <Card><EmptyState icon={Users} title="No departments yet" message="Create your first department." /></Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data?.map((d) => (
            <Card key={d._id} className="p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-bold text-slate-900 dark:text-slate-100">{d.name}</h3>
                  {d.head ? (
                    <div className="mt-2 flex items-center gap-2">
                      <Avatar name={`${d.head.firstName} ${d.head.lastName}`} size="xs" />
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Head: <span className="font-medium text-slate-700 dark:text-slate-200">{d.head.firstName} {d.head.lastName}</span>
                      </p>
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-slate-400">No head assigned</p>
                  )}
                </div>
                <div className="flex shrink-0 gap-1">
                  <button onClick={() => openEdit(d)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-brand-600 dark:text-slate-400 dark:hover:bg-slate-800">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => setDeleteId(d._id)} className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600 dark:text-slate-400 dark:hover:bg-rose-500/10">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {d.employeeCount > 0 && <div className="mt-3"><Badge>{d.employeeCount} members</Badge></div>}
            </Card>
          ))}
        </div>
      )}

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.editing ? 'Edit Department' : 'New Department'} size="sm">
        <div className="space-y-4">
          <Input label="Department name *" value={name} onChange={(e) => setName(e.target.value)} placeholder="Engineering" />
          <div>
            <label className="label">Department head</label>
            <select value={head} onChange={(e) => setHead(e.target.value)} className="input">
              <option value="">— None —</option>
              {(employees.data || []).map((e) => (
                <option key={e._id} value={e._id}>{e.firstName} {e.lastName} ({e.employeeId})</option>
              ))}
            </select>
          </div>
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
        title="Delete department?"
        message="Departments with employees assigned cannot be deleted."
        confirmLabel="Delete"
      />
    </div>
  );
}

/* ---------------- Designations ---------------- */
function DesignationsTab() {
  const toast = useToast();
  const { data, loading, refetch } = useApi(async () => {
    const { data } = await api.get('/designations');
    return data.data;
  });

  const [modal, setModal] = useState(null);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const openNew = () => { setName(''); setModal({ editing: false }); };
  const openEdit = (d) => { setName(d.name); setModal({ editing: true, id: d._id }); };

  const submit = async () => {
    if (!name.trim()) { toast.error('Designation name is required'); return; }
    setBusy(true);
    try {
      if (modal.editing) await api.put(`/designations/${modal.id}`, { name: name.trim() });
      else await api.post('/designations', { name: name.trim() });
      toast.success('Saved');
      setModal(null);
      refetch();
    } catch (err) {
      toast.error(extractError(err, 'Could not save designation'));
    } finally { setBusy(false); }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await api.delete(`/designations/${deleteId}`);
      toast.success('Designation deleted');
      setDeleteId(null);
      refetch();
    } catch (err) {
      toast.error(extractError(err, 'Could not delete designation'));
    } finally { setBusy(false); }
  };

  return (
    <div>
      <Card className="mb-4 flex items-center justify-between p-4">
        <p className="text-sm text-slate-500 dark:text-slate-400">{loading ? 'Loading…' : `${data?.length || 0} designations`}</p>
        <Button size="sm" onClick={openNew}><Plus className="h-4 w-4" /> New Designation</Button>
      </Card>

      {!loading && data?.length === 0 ? (
        <Card><EmptyState icon={Users} title="No designations yet" message="Create your first designation." /></Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data?.map((d) => (
            <Card key={d._id} className="flex items-center justify-between p-4">
              <span className="font-semibold text-slate-800 dark:text-slate-100">{d.name}</span>
              <div className="flex gap-1">
                <button onClick={() => openEdit(d)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-brand-600 dark:text-slate-400 dark:hover:bg-slate-800">
                  <Pencil className="h-4 w-4" />
                </button>
                <button onClick={() => setDeleteId(d._id)} className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600 dark:text-slate-400 dark:hover:bg-rose-500/10">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.editing ? 'Edit Designation' : 'New Designation'} size="sm">
        <div className="space-y-4">
          <Input label="Designation name *" value={name} onChange={(e) => setName(e.target.value)} placeholder="Software Engineer" />
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
        title="Delete designation?"
        message="Designations in use by employees cannot be deleted."
        confirmLabel="Delete"
      />
    </div>
  );
}
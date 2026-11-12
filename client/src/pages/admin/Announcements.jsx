import { useState } from 'react';
import { Plus, Pencil, Trash2, Megaphone } from 'lucide-react';
import api, { extractError } from '../../services/api';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import { formatDateTime } from '../../services/format';
import { ANNOUNCEMENT_PRIORITIES, ANNOUNCEMENT_AUDIENCES } from '../../services/static';
import PageHeader from '../../components/PageHeader';
import { Card } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import { Input, Select, Textarea } from '../../components/ui/Form';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

const emptyForm = {
  title: '',
  message: '',
  priority: 'normal',
  audience: 'all',
  departmentId: '',
  published: true,
  expiresAt: '',
};

function toLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function Announcements() {
  const toast = useToast();
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const list = useApi(async () => {
    const { data } = await api.get('/announcements');
    return data.data;
  });
  const departments = useApi(async () => {
    const { data } = await api.get('/departments');
    return data.data;
  });

  const openNew = () => { setForm(emptyForm); setModal({ editing: false }); };
  const openEdit = (a) => {
    setForm({
      title: a.title,
      message: a.message,
      priority: a.priority,
      audience: a.audience,
      departmentId: a.department?._id || a.departmentId || '',
      published: a.published,
      expiresAt: toLocalInput(a.expiresAt),
    });
    setModal({ editing: true, id: a._id });
  };

  const submit = async () => {
    if (!form.title.trim() || !form.message.trim()) { toast.error('Title and message are required'); return; }
    if (form.audience === 'department' && !form.departmentId) { toast.error('Choose a department'); return; }
    setBusy(true);
    try {
      const payload = { ...form, expiresAt: form.expiresAt || null };
      if (modal.editing) {
        await api.put(`/announcements/${modal.id}`, payload);
        toast.success('Announcement updated');
      } else {
        await api.post('/announcements', payload);
        toast.success('Announcement published');
      }
      setModal(null);
      list.refetch();
    } catch (err) {
      toast.error(extractError(err, 'Could not save announcement'));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await api.delete(`/announcements/${deleteId}`);
      toast.success('Announcement deleted');
      setDeleteId(null);
      list.refetch();
    } catch (err) {
      toast.error(extractError(err, 'Could not delete announcement'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader title="Announcements" description="Share company-wide or department notices with employees.">
        <Button size="sm" onClick={openNew}><Plus className="h-4 w-4" /> New Announcement</Button>
      </PageHeader>

      {list.loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <Card key={i} className="h-28 animate-pulse" />)}
        </div>
      ) : !list.data?.length ? (
        <Card><EmptyState icon={Megaphone} title="No announcements yet" message="Publish a notice for your team." /></Card>
      ) : (
        <div className="space-y-3">
          {list.data.map((a) => (
            <Card key={a._id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-slate-900 dark:text-slate-100">{a.title}</h3>
                    {a.priority === 'high' && <Badge tone="rose">Important</Badge>}
                    {!a.published && <Badge tone="amber">Draft</Badge>}
                    <Badge tone="sky">{a.audience === 'all' ? 'Everyone' : a.department?.name || 'Department'}</Badge>
                  </div>
                  <p className="mt-2 whitespace-pre-line text-sm text-slate-600 dark:text-slate-300">{a.message}</p>
                  <p className="mt-2 text-xs text-slate-400">
                    {a.author?.name ? `By ${a.author.name} · ` : ''}{formatDateTime(a.createdAt)}
                    {a.expiresAt ? ` · Expires ${formatDateTime(a.expiresAt)}` : ''}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button onClick={() => openEdit(a)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-brand-600 dark:text-slate-400 dark:hover:bg-slate-800">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => setDeleteId(a._id)} className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600 dark:text-slate-400 dark:hover:bg-rose-500/10">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.editing ? 'Edit Announcement' : 'New Announcement'}>
        <div className="space-y-4">
          <Input label="Title *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Office closed on Friday" />
          <Textarea label="Message *" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} rows={5} placeholder="Write the announcement…" />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Priority" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} options={ANNOUNCEMENT_PRIORITIES} />
            <Select label="Audience" value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })} options={ANNOUNCEMENT_AUDIENCES} />
          </div>
          {form.audience === 'department' && (
            <div>
              <label className="label">Department *</label>
              <select value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })} className="input">
                <option value="">— Select department —</option>
                {(departments.data || []).map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
              </select>
            </div>
          )}
          <Input label="Expires at (optional)" type="datetime-local" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} />
          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} className="h-4 w-4 rounded border-slate-300" />
            Published (visible to employees)
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
        title="Delete announcement?"
        message="This announcement will be removed for everyone."
        confirmLabel="Delete"
      />
    </div>
  );
}

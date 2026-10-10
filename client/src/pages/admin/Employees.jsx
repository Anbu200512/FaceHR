import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Plus,
  Search,
  Eye,
  Pencil,
  Power,
  ScanFace,
  Send,
} from 'lucide-react';
import api, { extractError } from '../../services/api';
import { useApi } from '../../hooks/useApi';
import { useDebounce } from '../../hooks/useDebounce';
import { useToast } from '../../context/ToastContext';
import { resolveAsset, formatDate } from '../../services/format';
import PageHeader from '../../components/PageHeader';
import { Card } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import Pagination from '../../components/ui/Pagination';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { SkeletonRow } from '../../components/ui/Skeleton';
import Avatar from '../../components/Avatar';

export default function Employees() {
  const toast = useToast();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const rawSearch = params.get('search') || '';
  const [search, setSearch] = useState(rawSearch);
  const debounced = useDebounce(search, 350);
  const [department, setDepartment] = useState(params.get('department') || '');
  const [designation, setDesignation] = useState(params.get('designation') || '');
  const [branch, setBranch] = useState(params.get('branch') || '');
  const [status, setStatus] = useState(params.get('status') || '');
  const [page, setPage] = useState(parseInt(params.get('page'), 10) || 1);
  const [pageSize, setPageSize] = useState(25);
  const [deactivateId, setDeactivateId] = useState(null);
  const [sendId, setSendId] = useState(null);
  const [sendName, setSendName] = useState('');
  const [busy, setBusy] = useState(false);

  const depts = useApi(async () => {
    const { data } = await api.get('/departments');
    return data.data;
  });

  const designations = useApi(async () => {
    const { data } = await api.get('/designations');
    return data.data;
  });

  const branches = useApi(async () => {
    const { data } = await api.get('/locations');
    return data.data;
  });

  useEffect(() => {
    const sp = new URLSearchParams();
    if (debounced) sp.set('search', debounced);
    if (department) sp.set('department', department);
    if (designation) sp.set('designation', designation);
    if (branch) sp.set('branch', branch);
    if (status) sp.set('status', status);
    if (page > 1) sp.set('page', String(page));
    setParams(sp, { replace: true });
  }, [debounced, department, designation, branch, status, page, setParams]);

  const { data, loading, refetch } = useApi(() => {
    const sp = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (debounced) sp.set('search', debounced);
    if (department) sp.set('department', department);
    if (designation) sp.set('designation', designation);
    if (branch) sp.set('branch', branch);
    if (status) sp.set('status', status);
    return api.get(`/employees?${sp.toString()}`).then((r) => r.data);
  }, [page, pageSize, debounced, department, designation, branch, status]);

  const onPageChange = (p) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeactivate = async () => {
    setBusy(true);
    try {
      await api.delete(`/employees/${deactivateId}`);
      toast.success('Employee deactivated');
      setDeactivateId(null);
      refetch();
    } catch (err) {
      toast.error(extractError(err, 'Could not deactivate employee'));
    } finally {
      setBusy(false);
    }
  };

  const handleSendLogin = async () => {
    setBusy(true);
    try {
      const { data } = await api.post(`/employees/${sendId}/send-login`);
      if (data.emailSent) {
        toast.success(`Login credentials sent to ${sendName}'s work email.`);
      } else {
        toast.success('Email service is not configured — temporary password generated.');
        if (data.generatedPassword) {
          toast.info(`Temporary password for ${sendName}: ${data.generatedPassword}`, { duration: 0 });
        }
      }
      setSendId(null);
    } catch (err) {
      toast.error(extractError(err, 'Could not send login details'));
    } finally {
      setBusy(false);
    }
  };

  const rows = data?.data || [];
  const meta = data?.meta || {};

  return (
    <div>
      <PageHeader
        title="Employees"
        description="Manage your team, profiles and face registration."
      >
        <Link to="/admin/employees/new">
          <Button>
            <Plus className="h-4 w-4" /> Add Employee
          </Button>
        </Link>
      </PageHeader>

      {/* Filters */}
      <Card className="mb-5 p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <div className="relative sm:col-span-2 lg:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by name, employee ID, email or phone…"
              className="input pl-9"
            />
          </div>
          <select value={department} onChange={(e) => { setDepartment(e.target.value); setPage(1); }} className="input">
            <option value="">All Departments</option>
            {depts.data?.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
          </select>
          <select value={designation} onChange={(e) => { setDesignation(e.target.value); setPage(1); }} className="input">
            <option value="">All Designations</option>
            {designations.data?.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
          </select>
          <select value={branch} onChange={(e) => { setBranch(e.target.value); setPage(1); }} className="input">
            <option value="">All Branches</option>
            {branches.data?.filter((l) => l.active).map((l) => <option key={l._id} value={l._id}>{l.name}</option>)}
          </select>
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="input">
            <option value="">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
      </Card>

      {/* Desktop table */}
      <Card className="hidden overflow-hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-slate-50 dark:bg-slate-800/60">
              <tr>
                <th className="th">Employee ID</th>
                <th className="th">Name</th>
                <th className="th">Work Email</th>
                <th className="th">Department</th>
                <th className="th">Designation</th>
                <th className="th">Mobile</th>
                <th className="th">Date of Joining</th>
                <th className="th">Status</th>
                <th className="th text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} cols={9} />)
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={9}>
                    <EmptyState title="No employees found" message="Try a different search or filter, or add a new employee." />
                  </td>
                </tr>
              ) : (
                rows.map((emp) => {
                  const mobile = emp.contact?.mobileNumber || emp.phone || '—';
                  return (
                    <tr key={emp._id} className="border-b transition last:border-0 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/50">
                      <td className="td font-mono text-xs font-semibold text-brand-600 dark:text-brand-400">{emp.employeeId}</td>
                      <td className="td">
                        <div className="flex items-center gap-3">
                          <Avatar name={`${emp.firstName} ${emp.lastName}`} src={resolveAsset(emp.profilePhoto)} size="sm" />
                          <button onClick={() => navigate(`/admin/employees/${emp._id}`)} className="font-semibold text-slate-800 hover:text-brand-600 dark:text-slate-100 dark:hover:text-brand-400">
                            {emp.firstName} {emp.lastName}
                          </button>
                        </div>
                      </td>
                      <td className="td">{emp.email || '—'}</td>
                      <td className="td">{emp.department?.name || '—'}</td>
                      <td className="td">{emp.designation?.name || '—'}</td>
                      <td className="td">{mobile}</td>
                      <td className="td">{formatDate(emp.joiningDate)}</td>
                      <td className="td">
                        <div className="flex flex-wrap items-center gap-1">
                          <Badge>{emp.status}</Badge>
                          {emp.face ? <Badge>Face</Badge> : null}
                        </div>
                      </td>
                      <td className="td">
                        <div className="flex justify-end gap-1">
                          <IconBtn title="View profile" onClick={() => navigate(`/admin/employees/${emp._id}`)}><Eye className="h-4 w-4" /></IconBtn>
                          <IconBtn title="Edit" onClick={() => navigate(`/admin/employees/${emp._id}/edit`)}><Pencil className="h-4 w-4" /></IconBtn>
                          {!emp.face && (
                            <IconBtn title="Register face" onClick={() => navigate(`/admin/employees/${emp._id}/face`)}><ScanFace className="h-4 w-4" /></IconBtn>
                          )}
                          <IconBtn title="Send login details" onClick={() => { setSendId(emp._id); setSendName(`${emp.firstName} ${emp.lastName}`); }}><Send className="h-4 w-4" /></IconBtn>
                          <IconBtn title="Deactivate" danger onClick={() => setDeactivateId(emp._id)}><Power className="h-4 w-4" /></IconBtn>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {rows.length > 0 && <Pagination page={page} pageSize={pageSize} total={meta.total} onPageChange={onPageChange} onPageSizeChange={(s) => { setPageSize(s); setPage(1); }} />}
      </Card>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <Card key={i} className="h-32 animate-pulse" />)
        ) : rows.length === 0 ? (
          <Card><EmptyState title="No employees found" /></Card>
        ) : (
          rows.map((emp) => (
            <Card key={emp._id} className="p-4" onClick={() => navigate(`/admin/employees/${emp._id}`)}>
              <div className="flex items-start gap-3">
                <Avatar name={`${emp.firstName} ${emp.lastName}`} src={resolveAsset(emp.profilePhoto)} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-slate-800 dark:text-slate-100">
                    {emp.firstName} {emp.lastName}
                  </p>
                  <p className="text-xs text-slate-400">{emp.employeeId} · {emp.department?.name || 'No dept'}</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {emp.designation?.name || '—'} · {emp.contact?.mobileNumber || emp.phone || '—'}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Badge>{emp.status}</Badge>
                    {emp.face ? <Badge>Face</Badge> : null}
                  </div>
                </div>
                <div className="flex shrink-0 gap-0.5" onClick={(e) => e.stopPropagation()}>
                  <IconBtn title="Edit" onClick={() => navigate(`/admin/employees/${emp._id}/edit`)}><Pencil className="h-4 w-4" /></IconBtn>
                  <IconBtn title="Send login details" onClick={() => { setSendId(emp._id); setSendName(`${emp.firstName} ${emp.lastName}`); }}><Send className="h-4 w-4" /></IconBtn>
                  <IconBtn title="Deactivate" danger onClick={() => setDeactivateId(emp._id)}><Power className="h-4 w-4" /></IconBtn>
                </div>
              </div>
            </Card>
          ))
        )}
        {rows.length > 0 && <Pagination page={page} pageSize={pageSize} total={meta.total} onPageChange={onPageChange} onPageSizeChange={(s) => { setPageSize(s); setPage(1); }} />}
      </div>

      <ConfirmDialog
        open={!!deactivateId}
        onClose={() => setDeactivateId(null)}
        onConfirm={handleDeactivate}
        loading={busy}
        title="Deactivate employee?"
        message="The employee will be marked inactive and cannot sign in. Attendance history is preserved."
        confirmLabel="Deactivate"
      />

      <ConfirmDialog
        open={!!sendId}
        onClose={() => setSendId(null)}
        onConfirm={handleSendLogin}
        loading={busy}
        tone="primary"
        title="Send login details?"
        message={`A new temporary password will be generated and the account login details will be emailed to this employee's work email.`}
        confirmLabel="Send Login Details"
      />
    </div>
  );
}

function IconBtn({ children, onClick, title, danger }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`rounded-lg p-1.5 transition ${danger ? 'text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10' : 'text-slate-500 hover:bg-slate-100 hover:text-brand-600 dark:text-slate-400 dark:hover:bg-slate-800'}`}
    >
      {children}
    </button>
  );
}
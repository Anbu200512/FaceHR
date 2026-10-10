import { useState } from 'react';
import { Search, RefreshCw, Download, Eye } from 'lucide-react';
import api from '../../services/api';
import { useApi } from '../../hooks/useApi';
import {
  resolveAsset,
  formatDate,
  formatTime,
  formatDuration,
} from '../../services/format';
import { exportAttendanceToCsv } from '../../services/export';
import PageHeader from '../../components/PageHeader';
import { Card } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import Pagination from '../../components/ui/Pagination';
import { SkeletonRow } from '../../components/ui/Skeleton';
import Modal from '../../components/ui/Modal';

const STATUS = ['Present', 'Late', 'Half Day', 'Absent', 'On Leave'];

export default function Attendance() {
  const [date, setDate] = useState('');
  const [department, setDepartment] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [view, setView] = useState(null);
  const [depts, setDepts] = useState([]);

  const deptsApi = useApi(async () => {
    const { data } = await api.get('/departments');
    setDepts(data.data);
    return data.data;
  });

  // Absent / On Leave are computed at read-time, so they only work against a single date.
  const derivedStatus = status === 'Absent' || status === 'On Leave';
  const effectiveStatus = derivedStatus ? undefined : status;

  const { data, loading, refetch } = useApi(async () => {
    if (derivedStatus) {
      const sp = new URLSearchParams({ date: date || undefined });
      if (department) sp.set('department', department);
      const { data } = await api.get(`/attendance/today?${sp.toString()}`);
      const rows = data.data.rows || [];
      const filtered = rows.filter((r) => r.status === status);
      if (search) {
        const q = search.toLowerCase();
        const match = (v) => String(v || '').toLowerCase().includes(q);
        return {
          data: filtered.filter((r) =>
            match(r.employee.firstName) || match(r.employee.lastName) || match(r.employee.employeeId)
          ),
          meta: { total: 0, page: 1, pageSize, totalPages: 1 },
        };
      }
      return { data: filtered, meta: { total: filtered.length, page: 1, pageSize, totalPages: 1 } };
    }
    const sp = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (date) sp.set('date', date);
    if (department) sp.set('department', department);
    if (effectiveStatus) sp.set('status', effectiveStatus);
    if (search) sp.set('search', search);
    const { data } = await api.get(`/attendance?${sp.toString()}`);
    return data;
  }, [page, pageSize, date, department, effectiveStatus, status, search, derivedStatus]);

  const rows = data?.data || [];
  const meta = data?.meta || { page: 1, pageSize, totalPages: 1, total: rows.length };

  const handleExport = async () => {
    const payload = rows.map((r) => ({
      employeeId: r.employee.employeeId,
      employeeName: `${r.employee.firstName} ${r.employee.lastName}`,
      department: r.employee.department?.name || '—',
      date: formatDate(r.date),
      checkIn: r.checkInTime ? formatTime(r.checkInTime) : '—',
      checkOut: r.checkOutTime ? formatTime(r.checkOutTime) : '—',
      hours: r.workingHoursMinutes ? formatDuration(r.workingHoursMinutes) : '—',
      status: r.status,
    }));
    exportAttendanceToCsv(payload, `attendance-${date || 'export'}`);
  };

  return (
    <div>
      <PageHeader title="Attendance Records" description="Review all check-ins, check-outs and daily status across your team.">
        <Button variant="secondary" onClick={() => refetch()}><RefreshCw className="h-4 w-4" /> Refresh</Button>
        <Button onClick={handleExport} disabled={!rows.length}><Download className="h-4 w-4" /> Export CSV</Button>
      </PageHeader>

      <Card className="mb-5 p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Employee or ID…" className="input pl-9" />
          </div>
          <input type="date" value={date} onChange={(e) => { setDate(e.target.value); setPage(1); }} className="input" title="Date" />
          <select value={department} onChange={(e) => { setDepartment(e.target.value); setPage(1); }} className="input">
            <option value="">All Departments</option>
            {depts.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
          </select>
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="input">
            <option value="">All Statuses</option>
            {STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <button
            onClick={() => { setSearch(''); setDate(''); setDepartment(''); setStatus(''); setPage(1); }}
            className="btn-ghost text-sm"
          >
            Clear filters
          </button>
        </div>
        {derivedStatus && !date && (
          <p className="mt-3 text-xs text-amber-600 dark:text-amber-400">
            “{status}” is computed per day. Select a date to see who was {status.toLowerCase()} on that day.
          </p>
        )}
      </Card>

      <Card className="hidden overflow-hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-slate-50 dark:bg-slate-800/60">
              <tr>
                <th className="th">Employee</th>
                <th className="th">Date</th>
                <th className="th">Check-in</th>
                <th className="th">Check-out</th>
                <th className="th">Working hours</th>
                <th className="th">Status</th>
                <th className="th">Verification</th>
                <th className="th text-right">Photos</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} cols={8} />)
              ) : rows.length === 0 ? (
                <tr><td colSpan={8}><EmptyState title="No records found" message="Adjust the filters or pick another date." /></td></tr>
              ) : (
                rows.map((r) => (
                  <tr key={r._id || `${r.employee._id}-${r.date}`} className="border-b transition last:border-0 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/50">
                    <td className="td">
                      <p className="font-semibold text-slate-800 dark:text-slate-100">{r.employee.firstName} {r.employee.lastName}</p>
                      <p className="text-xs text-slate-400">{r.employeeId || r.employee.employeeId}</p>
                    </td>
                    <td className="td">{formatDate(r.date)}</td>
                    <td className="td">{r.checkInTime ? formatTime(r.checkInTime) : '—'}</td>
                    <td className="td">{r.checkOutTime ? formatTime(r.checkOutTime) : '—'}</td>
                    <td className="td">{r.workingHoursMinutes ? formatDuration(r.workingHoursMinutes) : '—'}</td>
                    <td className="td"><Badge>{r.status}</Badge></td>
                    <td className="td">
                      {r.faceVerified ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Verified
                        </span>
                      ) : <span className="text-xs text-slate-400">Manual</span>}
                    </td>
                    <td className="td">
                      <div className="flex justify-end gap-1.5">
                        {r.checkInPhoto && <PhotoThumb src={resolveAsset(r.checkInPhoto)} label={`Check-in · ${formatTime(r.checkInTime)}`} onView={() => setView({ src: resolveAsset(r.checkInPhoto), label: `Check-in · ${formatTime(r.checkInTime)}` })} />}
                        {r.checkOutPhoto && <PhotoThumb src={resolveAsset(r.checkOutPhoto)} label={`Check-out · ${formatTime(r.checkOutTime)}`} onView={() => setView({ src: resolveAsset(r.checkOutPhoto), label: `Check-out · ${formatTime(r.checkOutTime)}` })} />}
                        {!r.checkInPhoto && !r.checkOutPhoto && <span className="text-xs text-slate-300">—</span>}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {rows.length > 0 && !derivedStatus && (
          <Pagination page={meta.page} pageSize={pageSize} total={meta.total} onPageChange={setPage} onPageSizeChange={(s) => { setPageSize(s); setPage(1); }} />
        )}
      </Card>

      {/* Mobile */}
      <div className="space-y-3 md:hidden">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <Card key={i} className="h-24 animate-pulse" />)
        ) : rows.length === 0 ? (
          <Card><EmptyState title="No records found" /></Card>
        ) : (
          rows.map((r) => (
            <Card key={r._id || `${r.employee._id}-${r.date}`} className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-100">{r.employee.firstName} {r.employee.lastName}</p>
                  <p className="text-xs text-slate-400">{formatDate(r.date)} · {r.employeeId}</p>
                </div>
                <Badge>{r.status}</Badge>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-500 dark:text-slate-400">
                <div>In: <span className="font-semibold text-slate-700 dark:text-slate-200">{r.checkInTime ? formatTime(r.checkInTime) : '—'}</span></div>
                <div>Out: <span className="font-semibold text-slate-700 dark:text-slate-200">{r.checkOutTime ? formatTime(r.checkOutTime) : '—'}</span></div>
                <div className="col-span-2">Hours: <span className="font-semibold text-slate-700 dark:text-slate-200">{r.workingHoursMinutes ? formatDuration(r.workingHoursMinutes) : '—'}</span></div>
              </div>
              {(r.checkInPhoto || r.checkOutPhoto) && (
                <div className="mt-3 flex gap-2">
                  {r.checkInPhoto && <PhotoThumb src={resolveAsset(r.checkInPhoto)} label={`Check-in`} onView={() => setView({ src: resolveAsset(r.checkInPhoto), label: 'Check-in' })} />}
                  {r.checkOutPhoto && <PhotoThumb src={resolveAsset(r.checkOutPhoto)} label={`Check-out`} onView={() => setView({ src: resolveAsset(r.checkOutPhoto), label: 'Check-out' })} />}
                </div>
              )}
            </Card>
          ))
        )}
        {rows.length > 0 && !derivedStatus && (
          <Pagination page={meta.page} pageSize={pageSize} total={meta.total} onPageChange={setPage} onPageSizeChange={(s) => { setPageSize(s); setPage(1); }} />
        )}
      </div>

      <Modal open={!!view} onClose={() => setView(null)} title={view?.label} size="sm">
        {view && <img src={view.src} alt={view.label} className="w-full rounded-xl object-contain" />}
      </Modal>
    </div>
  );
}

function PhotoThumb({ src, label, onView }) {
  return (
    <button onClick={onView} title={label} className="group relative">
      <img src={src} alt={label} className="h-9 w-9 rounded-lg object-cover ring-1 ring-black/5" />
      <span className="absolute inset-0 hidden items-center justify-center rounded-lg bg-black/40 group-hover:flex">
        <Eye className="h-3.5 w-3.5 text-white" />
      </span>
    </button>
  );
}
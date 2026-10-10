import { useState } from 'react';
import {
  LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Legend, BarChart, Bar,
} from 'recharts';
import { Download, FileText } from 'lucide-react';
import api, { extractError } from '../../services/api';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import { formatDuration, toDateKey } from '../../services/format';
import { exportAttendanceToCsv, exportAttendanceToPdf } from '../../services/export';
import PageHeader from '../../components/PageHeader';
import { Card, StatCard } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import { SkeletonGrid } from '../../components/ui/Skeleton';

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#8b5cf6'];

const STATUS_TONES = { Present: 'emerald', Late: 'amber', 'Half Day': 'violet', Absent: 'rose', 'On Leave': 'sky' };

export default function Reports() {
  const toast = useToast();
  const now = new Date();
  const [from, setFrom] = useState(toDateKey(new Date(now.getFullYear(), now.getMonth(), 1)));
  const [to, setTo] = useState(toDateKey(now));
  const [department, setDepartment] = useState('');
  const [employee, setEmployee] = useState('');
  const [detail, setDetail] = useState(false);

  const depts = useApi(async () => {
    const { data } = await api.get('/departments');
    return data.data;
  });
  const emps = useApi(async () => {
    const { data } = await api.get('/employees?page=1&pageSize=300&status=Active');
    return data.data;
  });

  const { data, loading, refetch } = useApi(() => {
    const sp = new URLSearchParams();
    if (from) sp.set('from', from);
    if (to) sp.set('to', to);
    if (department) sp.set('department', department);
    if (employee) sp.set('employee', employee);
    return api.get(`/attendance/report?${sp.toString()}`).then((r) => r.data.data);
  }, [from, to, department, employee]);

  const s = data?.summary;

  const pieData = s ? [
    { name: 'Present', value: s.presentDays },
    { name: 'Late', value: s.lateDays },
    { name: 'Absent', value: s.absentDays },
    { name: 'Leave', value: s.leaveDays },
    { name: 'Half Day', value: s.halfDays },
  ].filter((d) => d.value > 0) : [];

  const handleExport = (format) => {
    if (!data || !data.rows.length) { toast.error('No rows to export. Enable “Include detail rows”.'); return; }
    const summary = {
      range: { from: data.summary.range.from, to: data.summary.range.to },
    };
    if (format === 'csv') exportAttendanceToCsv(data.rows, `facehr-report-${summary.range.from}-${summary.range.to}`);
    else exportAttendanceToPdf(data.rows, summary);
  };

  return (
    <div>
      <PageHeader title="Reports & Analytics" description="Visualise attendance trends and export detailed records.">
        <Button variant="secondary" onClick={() => handleExport('csv')} disabled={!data?.rows?.length}><Download className="h-4 w-4" /> CSV</Button>
        <Button onClick={() => handleExport('pdf')} disabled={!data?.rows?.length}><FileText className="h-4 w-4" /> PDF</Button>
      </PageHeader>

      <Card className="mb-5 p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          <div><label className="label">From</label><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="input" /></div>
          <div><label className="label">To</label><input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="input" /></div>
          <div>
            <label className="label">Department</label>
            <select value={department} onChange={(e) => setDepartment(e.target.value)} className="input">
              <option value="">All</option>
              {depts.data?.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Employee</label>
            <select value={employee} onChange={(e) => setEmployee(e.target.value)} className="input">
              <option value="">All</option>
              {(emps.data || []).map((e) => <option key={e._id} value={e._id}>{e.firstName} {e.lastName}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
              <input type="checkbox" checked={detail} onChange={(e) => setDetail(e.target.checked)} className="h-4 w-4 accent-brand-600" />
              Include detail rows
            </label>
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-400">Ranges are limited to 92 days.</p>
      </Card>

      {loading && !data ? (
        <SkeletonGrid count={6} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
            <StatCard label="Employees" value={s?.employeesIncluded} />
            <StatCard label="Working days" value={s?.totalWorkingDays} />
            <StatCard label="Present days" value={s?.presentDays} tone="emerald" />
            <StatCard label="Late days" value={s?.lateDays} tone="amber" />
            <StatCard label="Absent days" value={s?.absentDays} tone="rose" />
            <StatCard label="Avg hours" value={s?.averageWorkingHours} />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-5">
            <Card className="lg:col-span-3">
              <div className="border-b px-5 py-4 dark:border-slate-700"><h2 className="font-bold text-slate-900 dark:text-slate-100">Attendance Trend</h2></div>
              <div className="h-72 p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data?.trend || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="present" stroke="#10b981" strokeWidth={2} dot={{ r: 2 }} />
                    <Line type="monotone" dataKey="late" stroke="#f59e0b" strokeWidth={2} dot={{ r: 2 }} />
                    <Line type="monotone" dataKey="absent" stroke="#ef4444" strokeWidth={2} dot={{ r: 2 }} />
                    <Line type="monotone" dataKey="leave" stroke="#06b6d4" strokeWidth={2} dot={{ r: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="lg:col-span-2">
              <div className="border-b px-5 py-4 dark:border-slate-700"><h2 className="font-bold text-slate-900 dark:text-slate-100">Status Breakdown</h2></div>
              <div className="h-72 p-4">
                {pieData.length === 0 ? (
                  <EmptyState title="No data" message="Narrow the range or add attendance to see a breakdown." />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95} paddingAngle={2} label>
                        {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card>
          </div>

          <Card className="mt-6">
            <div className="border-b px-5 py-4 dark:border-slate-700"><h2 className="font-bold text-slate-900 dark:text-slate-100">Attendance by Department</h2></div>
            <div className="h-72 p-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.byDepartment || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="present" fill="#10b981" />
                  <Bar dataKey="absent" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Detail table */}
          {detail && (
            <Card className="mt-6 overflow-hidden">
              <div className="flex items-center justify-between border-b px-5 py-4 dark:border-slate-700">
                <h2 className="font-bold text-slate-900 dark:text-slate-100">Detail Rows ({data?.rows?.length || 0})</h2>
                <Badge tone="indigo">Showing up to 1000</Badge>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px]">
                  <thead className="border-b bg-slate-50 dark:bg-slate-800/60">
                    <tr>
                      <th className="th">Employee</th>
                      <th className="th">Department</th>
                      <th className="th">Date</th>
                      <th className="th">Check-in</th>
                      <th className="th">Check-out</th>
                      <th className="th">Hours</th>
                      <th className="th">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.rows?.slice(0, 50).map((r, idx) => (
                      <tr key={idx} className="border-b last:border-0 dark:border-slate-700">
                        <td className="td"><p className="font-semibold text-slate-800 dark:text-slate-100">{r.employeeName}</p><p className="text-xs text-slate-400">{r.employeeId}</p></td>
                        <td className="td">{r.department}</td>
                        <td className="td">{r.date}</td>
                        <td className="td">{new Date(r.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                        <td className="td">{r.checkOut ? new Date(r.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                        <td className="td">{formatDuration(r.workingHoursMinutes)}</td>
                        <td className="td"><Badge tone={STATUS_TONES[r.status]}>{r.status}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
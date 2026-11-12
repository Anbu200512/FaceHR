import { useState } from 'react';
import { Wallet, Eye } from 'lucide-react';
import api, { extractError } from '../../services/api';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import { MONTH_OPTIONS } from '../../services/static';
import PageHeader from '../../components/PageHeader';
import { Card } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import Modal from '../../components/ui/Modal';

const monthName = (m) => MONTH_OPTIONS[(m || 1) - 1];
const money = (value, currency = 'INR') => {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency || 'INR', maximumFractionDigits: 0 }).format(value || 0);
  } catch {
    return `${currency || 'INR'} ${Number(value || 0).toLocaleString()}`;
  }
};

export default function Payslips() {
  const toast = useToast();
  const [detail, setDetail] = useState(null);
  const [loadingId, setLoadingId] = useState(null);

  const list = useApi(async () => {
    const { data } = await api.get('/payroll/mine');
    return data.data;
  });

  const open = async (id) => {
    setLoadingId(id);
    try {
      const { data } = await api.get(`/payroll/payslips/${id}`);
      setDetail(data.data);
    } catch (err) {
      toast.error(extractError(err, 'Could not load payslip'));
    } finally {
      setLoadingId(null);
    }
  };

  const rows = list.data || [];

  return (
    <div>
      <PageHeader title="My Payslips" description="View your monthly salary statements." />

      {list.loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Card key={i} className="h-20 animate-pulse" />)}
        </div>
      ) : rows.length === 0 ? (
        <Card><EmptyState icon={Wallet} title="No payslips yet" message="Payslips appear here once payroll is processed." /></Card>
      ) : (
        <div className="space-y-3">
          {rows.map((p) => (
            <Card key={p._id} className="flex items-center gap-4 p-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                <Wallet className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-800 dark:text-slate-100">{monthName(p.month)} {p.year}</p>
                <p className="text-xs text-slate-400">{p.presentDays}/{p.workingDays} days present · {p.lopDays} LOP</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-slate-900 dark:text-slate-100">{money(p.netPay, p.currency)}</p>
                <Badge tone={p.status === 'Paid' ? 'emerald' : 'sky'}>{p.status}</Badge>
              </div>
              <Button size="sm" variant="secondary" onClick={() => open(p._id)} loading={loadingId === p._id}>
                <Eye className="h-4 w-4" /> View
              </Button>
            </Card>
          ))}
        </div>
      )}

      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail ? `Payslip · ${monthName(detail.month)} ${detail.year}` : 'Payslip'} size="md">
        {detail && (
          <div className="space-y-4">
            <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/60">
              <p className="font-bold text-slate-900 dark:text-slate-100">{detail.employee?.firstName} {detail.employee?.lastName}</p>
              <p className="text-xs text-slate-400">{detail.employeeId}{detail.employee?.department?.name ? ` · ${detail.employee.department.name}` : ''}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl border p-3 dark:border-slate-700">
                <p className="mb-2 text-xs font-semibold uppercase text-slate-400">Earnings</p>
                <Row label="Basic" value={money(detail.basic, detail.currency)} />
                <Row label="HRA" value={money(detail.hra, detail.currency)} />
                <Row label="Special allowance" value={money(detail.specialAllowance, detail.currency)} />
                <Row label="Other allowance" value={money(detail.otherAllowance, detail.currency)} />
                <div className="mt-2 flex justify-between border-t pt-2 font-semibold dark:border-slate-700"><span>Gross</span><span>{money(detail.gross, detail.currency)}</span></div>
              </div>
              <div className="rounded-xl border p-3 dark:border-slate-700">
                <p className="mb-2 text-xs font-semibold uppercase text-slate-400">Deductions</p>
                <Row label="Base deductions" value={money(detail.breakdown?.deductions?.base ?? 0, detail.currency)} />
                <Row label={`Loss of pay (${detail.lopDays}d)`} value={money(detail.lopAmount, detail.currency)} />
                <Row label="PF" value={money(detail.pf, detail.currency)} />
                <Row label="Tax" value={money(detail.tax, detail.currency)} />
                <div className="mt-2 flex justify-between border-t pt-2 font-semibold dark:border-slate-700"><span>Total</span><span>{money(detail.deductions, detail.currency)}</span></div>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-3 dark:bg-emerald-500/10">
              <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Net Pay</span>
              <span className="text-lg font-bold text-emerald-700 dark:text-emerald-300">{money(detail.netPay, detail.currency)}</span>
            </div>
            <div className="text-xs text-slate-400">
              Attendance: {detail.presentDays} present · {detail.breakdown?.paidLeaveDays || 0} paid leave · {detail.lopDays} loss of pay · {detail.workingDays} working days
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function Row({ label, value }) {
  return <div className="flex justify-between py-0.5 text-slate-600 dark:text-slate-300"><span>{label}</span><span>{value}</span></div>;
}

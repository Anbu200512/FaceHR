import { CalendarDays, CalendarCheck2, CalendarX2, AlarmClock, Clock } from 'lucide-react';
import { Card } from '../ui/Card';
import Badge from '../ui/Badge';
import Avatar from '../Avatar';
import { formatDuration } from '../../services/format';

function Metric({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
      <Icon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
      <span>{label}</span>
      <span className="ml-auto font-bold text-slate-800 dark:text-slate-100">{value}</span>
    </div>
  );
}

export default function MonthlyAttendanceCard({ row }) {
  const emp = row.employee;
  const m = row.month;
  const name = `${emp.firstName} ${emp.lastName}`.trim();
  const dept = emp.department?.name || 'No department';
  const office = emp.office?.name;

  return (
    <Card className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center gap-3 border-b px-5 py-4 dark:border-slate-700">
        <Avatar name={name} src={emp.profilePhoto} size="md" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">{name}</p>
          <p className="truncate text-xs text-slate-400">{emp.employeeId} · {dept}{office ? ` · ${office}` : ''}</p>
        </div>
        <Badge>{row.status}</Badge>
      </div>
      <div className="grid flex-1 grid-cols-2 gap-x-4 gap-y-2 p-5 lg:grid-cols-3">
        <Metric icon={CalendarCheck2} label="Present" value={m?.presentDays ?? 0} />
        <Metric icon={AlarmClock} label="Late" value={m?.lateDays ?? 0} />
        <Metric icon={CalendarX2} label="Absent" value={m?.absentDays ?? 0} />
        <Metric icon={CalendarDays} label="On leave" value={m?.leaveDays ?? 0} />
        <Metric icon={CalendarDays} label="Days worked" value={(m?.presentDays ?? 0) + (m?.lateDays ?? 0)} />
        <Metric icon={Clock} label="Hours" value={formatDuration(m?.workingMinutes)} />
      </div>
    </Card>
  );
}
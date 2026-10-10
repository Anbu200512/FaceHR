import { Link } from 'react-router-dom';
import { CalendarDays, ArrowRight } from 'lucide-react';
import { Card } from '../ui/Card';
import EmptyState from '../ui/EmptyState';
import Button from '../ui/Button';
import AttendanceCard from '../attendance/AttendanceCard';
import MonthlyAttendanceCard from './MonthlyAttendanceCard';
import { MONTH_NAMES } from '../../services/format';

export default function EmployeeAttendanceSection({ data, loading, year, month }) {
  const rows = data?.attendance || [];
  const mode = data?.attendanceMode || 'day';
  const isCurrentMonth = data?.isCurrentMonth;
  const empty = !loading && rows.length === 0;

  let title = 'Attendance';
  let description = 'Latest check-ins across the organization';
  if (mode === 'month') {
    title = `${MONTH_NAMES[month - 1]} ${year} Attendance`;
    description = `Monthly attendance summary for ${MONTH_NAMES[month - 1]} ${year}`;
  } else if (isCurrentMonth) {
    title = "Today’s Attendance";
    description = 'Live snapshot of who is in, late, away or on leave today';
  }

  return (
    <div className="min-w-0">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          {isCurrentMonth && mode === 'day' ? (
            <Link to="/admin/attendance/today" className="group inline-block">
              <h2 className="text-base font-bold text-slate-900 group-hover:text-brand-600 dark:text-slate-100 dark:group-hover:text-brand-400">
                {title}
              </h2>
              <p className="text-xs text-slate-400">{description}</p>
            </Link>
          ) : (
            <>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">{title}</h2>
              <p className="text-xs text-slate-400">{description}</p>
            </>
          )}
        </div>
        {mode === 'day' && isCurrentMonth && (
          <Link to="/admin/attendance/today">
            <Button variant="secondary" size="sm">
              View All <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        )}
      </div>

      {empty ? (
        <Card>
          <EmptyState
            icon={CalendarDays}
            title="No attendance data"
            message="No attendance data available for the selected filters."
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {(loading ? Array.from({ length: 6 }) : rows).map((row, i) =>
            loading ? (
              <Card key={i} className="h-56 animate-pulse" />
            ) : mode === 'month' ? (
              <MonthlyAttendanceCard key={row.employee._id} row={row} />
            ) : (
              <AttendanceCard key={row.employee._id} row={row} />
            )
          )}
        </div>
      )}
    </div>
  );
}
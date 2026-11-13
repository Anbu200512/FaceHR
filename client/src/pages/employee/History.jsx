import PageHeader from '../../components/PageHeader';
import AttendanceCalendar from '../../components/attendance/AttendanceCalendar';

export default function History() {
  return (
    <div>
      <PageHeader
        title="My Attendance History"
        description="Month-by-month attendance with every check-in and check-out time."
      />
      <AttendanceCalendar showFooterLink={false} />
    </div>
  );
}

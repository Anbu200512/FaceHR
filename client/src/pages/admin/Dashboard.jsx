import { useEffect, useMemo, useState } from 'react';
import { Users, UserCheck, AlarmClock, Plane, UserMinus } from 'lucide-react';
import api from '../../services/api';
import { useApi } from '../../hooks/useApi';
import { greeting } from '../../services/format';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { extractError } from '../../services/api';
import PageHeader from '../../components/PageHeader';
import { StatCard } from '../../components/ui/Card';
import { SkeletonGrid } from '../../components/ui/Skeleton';
import FilterBar from '../../components/dashboard/FilterBar';
import LocationAttendance from '../../components/dashboard/LocationAttendance';
import AgeDistribution from '../../components/dashboard/AgeDistribution';
import EmployeeSummary from '../../components/dashboard/EmployeeSummary';
import ResignationOverview from '../../components/dashboard/ResignationOverview';
import HRActivitySummary from '../../components/dashboard/HRActivitySummary';
import ResignationsSection from '../../components/dashboard/ResignationsSection';
import RecentActivity from '../../components/dashboard/RecentActivity';

export default function Dashboard() {
  const { user } = useAuth();
  const toast = useToast();

  const now = new Date();
  const [filters, setFilters] = useState({
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    location: null,
    department: null,
  });

  const query = useMemo(() => {
    const p = new URLSearchParams({ year: String(filters.year), month: String(filters.month) });
    if (filters.location) p.set('location', filters.location);
    if (filters.department) p.set('department', filters.department);
    return p.toString();
  }, [filters.year, filters.month, filters.location, filters.department]);

  const locations = useApi(async () => {
    const { data } = await api.get('/locations');
    return data.data;
  }, []);

  const departments = useApi(async () => {
    const { data } = await api.get('/departments');
    return data.data;
  }, []);

  const dashboard = useApi(async () => {
    const { data } = await api.get(`/dashboard?${query}`);
    return data.data;
  }, [query]);

  useEffect(() => {
    if (dashboard.error) toast.error(extractError(dashboard.error, 'Could not load dashboard'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashboard.error]);

  const d = dashboard.data;
  const s = d?.summary;
  const loading = dashboard.loading && !d;

  return (
    <div>
      <PageHeader
        title={`${greeting()}, ${user?.name?.split(' ')[0]} 👋`}
        description="Here's what's happening across your organization."
      />

      <FilterBar
        value={filters}
        onChange={setFilters}
        locations={locations.data || []}
        departments={departments.data || []}
        loading={(locations.loading || departments.loading) && !locations.data}
      />

      {loading ? (
        <div className="mt-6">
          <SkeletonGrid count={5} />
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
          <StatCard label="Total Employees" value={s?.totalEmployees} icon={Users} tone="indigo" loading={loading} />
          <StatCard label="Present Today" value={s?.present} icon={UserCheck} tone="emerald" loading={loading} />
          <StatCard label="Late Today" value={s?.late} icon={AlarmClock} tone="amber" loading={loading} />
          <StatCard label="On Leave" value={s?.onLeave} icon={Plane} tone="sky" loading={loading} />
          <StatCard label="Absent Today" value={s?.absent} icon={UserMinus} tone="rose" loading={loading} />
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <LocationAttendance rows={d?.locations} loading={loading} />
        </div>
        <div className="lg:col-span-2">
          <AgeDistribution data={d?.ageDistribution} loading={loading} />
        </div>
      </div>

      <div className="mt-6">
        <EmployeeSummary hr={d?.hr} loading={loading} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <ResignationOverview data={d?.resignationBreakdown} loading={loading} />
        <HRActivitySummary hr={d?.hr} loading={loading} />
      </div>

      <div className="mt-6">
        <ResignationsSection rows={d?.resignations} loading={loading} refetch={dashboard.refetch} />
      </div>

      <div>
        <RecentActivity
          year={filters.year}
          month={filters.month}
          location={filters.location}
          department={filters.department}
        />
      </div>
    </div>
  );
}
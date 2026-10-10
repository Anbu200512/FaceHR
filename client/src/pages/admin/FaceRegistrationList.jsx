import { useNavigate } from 'react-router-dom';
import { ScanFace, CheckCircle2, Users } from 'lucide-react';
import api from '../../services/api';
import { useApi } from '../../hooks/useApi';
import { resolveAsset } from '../../services/format';
import PageHeader from '../../components/PageHeader';
import { Card } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import { FullScreenLoader } from '../../components/ui/Button';
import Avatar from '../../components/Avatar';
import { useToast } from '../../context/ToastContext';

export default function FaceRegistrationList() {
  const navigate = useNavigate();
  const toast = useToast();
  const { data, loading, refetch } = useApi(async () => {
    const { data } = await api.get('/employees?page=1&pageSize=500');
    return data.data;
  });

  const noFace = (data || []).filter((e) => e.status === 'Active' && !e.face);
  const registered = (data || []).filter((e) => e.face).length;

  if (loading) return <FullScreenLoader label="Loading employees…" />;

  return (
    <div>
      <PageHeader
        title="Face Registration"
        description="Register facial profiles so employees can check in with their face."
      >
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          <span>{registered} registered · <span className="font-semibold text-slate-900 dark:text-slate-100">{noFace.length} pending</span></span>
        </div>
      </PageHeader>

      {noFace.length === 0 ? (
        <Card>
          <EmptyState
            icon={Users}
            title="All employees registered"
            message="Every active employee has a face profile. New hires will appear here once added."
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {noFace.map((emp) => (
            <Card key={emp._id} className="flex items-center gap-4 p-5">
              <Avatar name={`${emp.firstName} ${emp.lastName}`} src={resolveAsset(emp.profilePhoto)} size="md" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-slate-800 dark:text-slate-100">
                  {emp.firstName} {emp.lastName}
                </p>
                <p className="text-xs text-slate-400">
                  {emp.employeeId} · {emp.department?.name || 'No dept'}
                </p>
                <div className="mt-1.5"><Badge>Not Registered</Badge></div>
              </div>
              <Button size="sm" onClick={() => navigate(`/admin/employees/${emp._id}/face`)}>
                <ScanFace className="h-4 w-4" /> Register
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
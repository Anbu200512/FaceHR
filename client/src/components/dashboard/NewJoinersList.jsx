import { UserPlus, MapPin } from 'lucide-react';
import { Card } from '../ui/Card';
import Badge from '../ui/Badge';
import Avatar from '../Avatar';
import EmptyState from '../ui/EmptyState';
import { Skeleton } from '../ui/Skeleton';
import { formatDate } from '../../services/format';

export default function NewJoinersList({ rows, loading }) {
  const list = rows || [];

  return (
    <div className="min-w-0">
      <div className="mb-3">
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">New Joiners This Month</h2>
        <p className="text-xs text-slate-400">Employees who joined this month</p>
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="space-y-4 p-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-40" />
                </div>
              </div>
            ))}
          </div>
        ) : list.length === 0 ? (
          <EmptyState icon={UserPlus} title="No new joiners" message="Employees who joined this month will appear here." />
        ) : (
          <ul className="divide-y dark:divide-slate-700">
            {list.map((e) => (
              <li key={e._id} className="flex items-center gap-3 px-5 py-3">
                <Avatar src={e.profilePhoto} name={`${e.firstName || ''} ${e.lastName || ''}`} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-slate-800 dark:text-slate-100">
                    {e.firstName} {e.lastName}
                  </p>
                  <p className="flex items-center gap-1 truncate text-xs text-slate-400">
                    {e.department?.name || 'No department'}
                    {e.office?.name && (
                      <span className="inline-flex items-center gap-0.5"><MapPin className="h-3 w-3" /> {e.office.name}</span>
                    )}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium text-slate-600 dark:text-slate-300">{formatDate(e.joiningDate)}</p>
                  <Badge tone="emerald">Joined</Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
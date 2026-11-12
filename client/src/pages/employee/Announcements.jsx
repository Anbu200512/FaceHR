import { Megaphone } from 'lucide-react';
import api from '../../services/api';
import { useApi } from '../../hooks/useApi';
import { formatDateTime } from '../../services/format';
import PageHeader from '../../components/PageHeader';
import { Card } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';

export default function Announcements() {
  const list = useApi(async () => {
    const { data } = await api.get('/announcements');
    return data.data;
  });

  return (
    <div>
      <PageHeader title="Announcements" description="Company news and notices from HR." />

      {list.loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <Card key={i} className="h-28 animate-pulse" />)}
        </div>
      ) : !list.data?.length ? (
        <Card><EmptyState icon={Megaphone} title="No announcements" message="Notices from HR will appear here." /></Card>
      ) : (
        <div className="space-y-3">
          {list.data.map((a) => (
            <Card key={a._id} className={`p-5 ${a.priority === 'high' ? 'border-l-4 border-l-rose-500' : ''}`}>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-bold text-slate-900 dark:text-slate-100">{a.title}</h3>
                {a.priority === 'high' && <Badge tone="rose">Important</Badge>}
                {a.audience === 'department' && <Badge tone="sky">{a.department?.name || 'Department'}</Badge>}
              </div>
              <p className="mt-2 whitespace-pre-line text-sm text-slate-600 dark:text-slate-300">{a.message}</p>
              <p className="mt-2 text-xs text-slate-400">
                {a.author?.name ? `By ${a.author.name} · ` : ''}{formatDateTime(a.createdAt)}
                {a.expiresAt ? ` · Valid until ${formatDateTime(a.expiresAt)}` : ''}
              </p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

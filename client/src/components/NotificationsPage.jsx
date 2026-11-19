import { useState } from 'react';
import { Bell, Check, CheckCheck, Trash2, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api, { extractError } from '../services/api';
import { useApi } from '../hooks/useApi';
import { useToast } from '../context/ToastContext';
import { formatDateTime } from '../services/format';
import PageHeader from './PageHeader';
import { Card } from './ui/Card';
import Button from './ui/Button';
import EmptyState from './ui/EmptyState';
import { Skeleton } from './ui/Skeleton';
import ConfirmDialog from './ui/ConfirmDialog';

export default function NotificationsPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const [busyId, setBusyId] = useState(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const list = useApi(async () => {
    const { data } = await api.get('/notifications?limit=100');
    return Array.isArray(data.data) ? data.data : [];
  }, []);

  const items = list.data || [];
  const unreadCount = items.filter((n) => !n.read).length;

  const markRead = async (id) => {
    setBusyId(id);
    try {
      await api.put(`/notifications/${id}/read`);
      await list.refetch();
    } catch (err) {
      toast.error(extractError(err, 'Could not mark notification as read'));
    } finally {
      setBusyId(null);
    }
  };

  const markAllRead = async () => {
    setBulkBusy(true);
    try {
      await api.put('/notifications/read-all');
      toast.success('All notifications marked as read');
      await list.refetch();
    } catch (err) {
      toast.error(extractError(err, 'Could not mark all as read'));
    } finally {
      setBulkBusy(false);
    }
  };

  const remove = async (id) => {
    setBusyId(id);
    try {
      await api.delete(`/notifications/${id}`);
      toast.success('Notification deleted');
      setDeleteTarget(null);
      await list.refetch();
    } catch (err) {
      toast.error(extractError(err, 'Could not delete notification'));
    } finally {
      setBusyId(null);
    }
  };

  const openItem = async (n) => {
    const nid = n.id || n._id;
    if (!n.read && nid) {
      try { await api.put(`/notifications/${nid}/read`); } catch (_e) { /* ignore */ }
    }
    if (n.link) {
      navigate(n.link);
    } else {
      list.refetch();
    }
  };

  return (
    <div>
      <PageHeader title="Notifications" description="Stay updated with attendance, leave, and account activity.">
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="secondary" onClick={markAllRead} loading={bulkBusy} disabled={unreadCount === 0 || list.loading}>
            <CheckCheck className="h-4 w-4" /> Mark all read
          </Button>
        </div>
      </PageHeader>

      {list.loading && !list.data ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="space-y-2 p-4">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-5/6" />
              <Skeleton className="h-3 w-24" />
            </Card>
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card>
          <EmptyState icon={Bell} title="No notifications" message="You're all caught up. New updates will appear here." />
        </Card>
      ) : (
        <div className="space-y-3">
          {unreadCount > 0 && (
            <p className="text-sm text-slate-500 dark:text-slate-300">{unreadCount} unread notification{unreadCount === 1 ? '' : 's'}</p>
          )}
          {items.map((n) => {
            const nid = n.id || n._id;
            const busy = busyId === nid;
            return (
              <Card key={nid} className={`p-4 ${n.read ? 'opacity-80' : 'border-l-4 border-l-brand-500'}`}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <button
                    type="button"
                    onClick={() => openItem(n)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="flex items-start gap-2">
                      {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-500" aria-hidden="true" />}
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm font-semibold ${n.read ? 'text-slate-700 dark:text-slate-200' : 'text-slate-900 dark:text-slate-100'}`}>{n.title}</p>
                        {n.message && <p className="mt-1 whitespace-pre-line text-sm text-slate-600 dark:text-slate-300">{n.message}</p>}
                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 dark:text-slate-300">
                          <span>{formatDateTime(n.createdAt)}</span>
                          {n.link && (
                            <span className="inline-flex items-center gap-1 text-brand-600 dark:text-brand-400">
                              <ExternalLink className="h-3 w-3" /> Open
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                  <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                    {!n.read && (
                      <Button size="xs" variant="secondary" onClick={() => markRead(nid)} loading={busy} disabled={bulkBusy || !nid}>
                        <Check className="h-3.5 w-3.5" /> Mark read
                      </Button>
                    )}
                    <Button size="xs" variant="ghost" onClick={() => setDeleteTarget(n)} loading={busy} disabled={bulkBusy || !nid} className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400 dark:hover:bg-rose-500/10">
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => !busyId && setDeleteTarget(null)}
        onConfirm={() => remove(deleteTarget?.id || deleteTarget?._id)}
        loading={!!busyId && busyId === (deleteTarget?.id || deleteTarget?._id)}
        title="Delete notification?"
        message={deleteTarget ? `Delete "${deleteTarget.title || 'this notification'}"? This action cannot be undone.` : 'This action cannot be undone.'}
        confirmLabel="Delete"
      />
    </div>
  );
}
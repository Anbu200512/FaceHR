import { useState } from 'react';
import {
  Activity,
  LogIn,
  LogOut,
  Inbox,
  CheckCircle2,
  XCircle,
  UserPlus,
  ScanFace,
  RefreshCw,
} from 'lucide-react';
import clsx from 'clsx';
import api from '../../services/api';
import { useApi } from '../../hooks/useApi';
import { Card } from '../ui/Card';
import Badge from '../ui/Badge';
import Avatar from '../Avatar';
import EmptyState from '../ui/EmptyState';
import Button from '../ui/Button';
import { Skeleton } from '../ui/Skeleton';

const TYPE_META = {
  'check-in': { icon: LogIn, tone: 'emerald' },
  'check-out': { icon: LogOut, tone: 'sky' },
  'leave-submitted': { icon: Inbox, tone: 'amber' },
  'leave-approved': { icon: CheckCircle2, tone: 'emerald' },
  'leave-rejected': { icon: XCircle, tone: 'rose' },
  'employee-added': { icon: UserPlus, tone: 'indigo' },
  'face-registered': { icon: ScanFace, tone: 'violet' },
};

const DEFAULT_META = { icon: Activity, tone: 'slate' };

const TONE_BG = {
  emerald: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400',
  sky: 'bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400',
  amber: 'bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400',
  rose: 'bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400',
  indigo: 'bg-brand-100 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400',
  violet: 'bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400',
  slate: 'bg-slate-100 text-slate-500 dark:bg-slate-700/50 dark:text-slate-400',
};

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { day: '2-digit', month: 'short' });
}

export default function RecentActivity({ year, month, location, department }) {
  const { data, loading, refetch } = useApi(async () => {
    const sp = new URLSearchParams({ limit: '15' });
    if (year) sp.set('year', year);
    if (month) sp.set('month', month);
    if (location) sp.set('location', location);
    if (department) sp.set('department', department);
    const { data } = await api.get(`/activity?${sp.toString()}`);
    return data.data;
  }, [year, month, location, department]);

  return (
    <section className="mt-6">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Recent Activity</h2>
          <p className="text-xs text-slate-400">Latest events from the organization</p>
        </div>
        <Button variant="ghost" size="sm" onClick={refetch}>
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      <Card className="overflow-hidden">
        {loading && !data ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-40" />
                  <Skeleton className="h-2 w-52" />
                </div>
              </div>
            ))}
          </div>
        ) : !data || data.length === 0 ? (
          <EmptyState
            icon={Activity}
            title="No recent activity"
            message="Check-ins, leave requests and other events will appear here as they happen."
          />
        ) : (
          <ul className="divide-y dark:divide-slate-700">
            {data.map((ev) => {
              const meta = TYPE_META[ev.type] || DEFAULT_META;
              const Icon = meta.icon;
              const name = `${ev.employee?.firstName || ''} ${ev.employee?.lastName || ''}`.trim() || 'Someone';
              return (
                <li key={ev.id} className="flex items-start gap-3 px-5 py-3">
                  <div className={clsx('mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full', TONE_BG[meta.tone] || TONE_BG.slate)}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <Avatar name={name} src={ev.employee?.profilePhoto} size="sm" className="hidden sm:flex" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-slate-700 dark:text-slate-200">
                      <span className="font-semibold text-slate-900 dark:text-slate-100">{name}</span>{' '}
                      <span>{ev.description}</span>
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">{timeAgo(ev.time)}</p>
                  </div>
                  {ev.status && <Badge>{ev.status}</Badge>}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </section>
  );
}
import { Link } from 'react-router-dom';
import { CalendarDays, CalendarClock, Inbox, PartyPopper, Sun, ArrowRight, Hourglass } from 'lucide-react';
import { Card } from '../ui/Card';
import Badge from '../ui/Badge';
import Avatar from '../Avatar';
import { formatDate } from '../../services/format';
import { Skeleton } from '../ui/Skeleton';

function daysAway(date) {
  const start = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((start - today) / 86400000);
}

function ItemRow({ src, name, sub, badge }) {
  return (
    <li className="flex items-center gap-3 py-2.5">
      <Avatar name={name} src={src} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{name}</p>
        <p className="truncate text-xs text-slate-400">{sub}</p>
      </div>
      {badge}
    </li>
  );
}

function CompactEmpty({ icon: Icon, title, message }) {
  return (
    <div className="flex flex-col items-center gap-1.5 rounded-xl border border-dashed border-slate-200 px-4 py-5 text-center dark:border-slate-700">
      <Icon className="h-5 w-5 text-slate-300 dark:text-slate-600" />
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
      <p className="text-xs text-slate-400">{message}</p>
    </div>
  );
}

export default function UpcomingNext({ data, loading }) {
  const upcoming = data?.upcoming || [];
  const pendingList = data?.pendingList || [];
  const birthdays = data?.birthdays || [];

  return (
    <section>
      <div className="mb-3">
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Upcoming</h2>
        <p className="text-xs text-slate-400">Upcoming leaves, birthdays and other HR activities</p>
      </div>

      <Card className="overflow-hidden">
        <div className="divide-y dark:divide-slate-700">
          <section>
            <div className="flex items-center gap-2 px-5 pt-4">
              <CalendarClock className="h-4 w-4 text-brand-500" />
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Upcoming Leave</h3>
            </div>
            <ul className="px-5 pb-2 pt-1">
              {loading ? (
                Array.from({ length: 2 }).map((_, i) => (
                  <li key={i} className="flex items-center gap-3 py-2.5">
                    <Skeleton className="h-9 w-9 rounded-full" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3 w-32" />
                      <Skeleton className="h-2 w-44" />
                    </div>
                  </li>
                ))
              ) : upcoming.length === 0 ? (
                <li className="py-2.5">
                  <CompactEmpty icon={CalendarDays} title="No upcoming leave" message="No approved leave starts soon." />
                </li>
              ) : (
                upcoming.map((l) => (
                  <ItemRow
                    key={l._id}
                    src={l.employee?.profilePhoto}
                    name={`${l.employee?.firstName || ''} ${l.employee?.lastName || ''}`.trim()}
                    sub={`${l.leaveType} · starts in ${Math.max(0, daysAway(l.startDate))}d · ${formatDate(l.startDate)}`}
                    badge={<Badge tone="emerald">Approved</Badge>}
                  />
                ))
              )}
            </ul>
          </section>

          <section className="pt-3">
            <div className="flex items-center gap-2 px-5">
              <Inbox className="h-4 w-4 text-amber-500" />
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Pending Approvals</h3>
            </div>
            <ul className="px-5 pb-2 pt-1">
              {loading ? (
                Array.from({ length: 2 }).map((_, i) => (
                  <li key={i} className="flex items-center gap-3 py-2.5">
                    <Skeleton className="h-9 w-9 rounded-full" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3 w-32" />
                      <Skeleton className="h-2 w-44" />
                    </div>
                  </li>
                ))
              ) : pendingList.length === 0 ? (
                <li className="py-2.5">
                  <CompactEmpty icon={Hourglass} title="Nothing pending" message="All leave requests have been reviewed." />
                </li>
              ) : (
                pendingList.map((l) => (
                  <ItemRow
                    key={l._id}
                    src={l.employee?.profilePhoto}
                    name={`${l.employee?.firstName || ''} ${l.employee?.lastName || ''}`.trim()}
                    sub={`${l.leaveType} · ${formatDate(l.startDate)} → ${formatDate(l.endDate)}`}
                    badge={<Badge tone="amber">Pending</Badge>}
                  />
                ))
              )}
            </ul>
            {pendingList.length > 0 && (
              <div className="px-5 pb-3">
                <Link to="/admin/leaves?status=Pending" className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline dark:text-brand-400">
                  Review all <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            )}
          </section>

          <section className="pt-3">
            <div className="flex items-center gap-2 px-5">
              <PartyPopper className="h-4 w-4 text-violet-500" />
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Birthdays &amp; Events</h3>
            </div>
            <ul className="px-5 pb-2 pt-1">
              {loading ? (
                <li className="flex items-center gap-3 py-2.5">
                  <Skeleton className="h-9 w-9 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3 w-32" />
                    <Skeleton className="h-2 w-40" />
                  </div>
                </li>
              ) : birthdays.length === 0 ? (
                <li className="py-2.5">
                  <CompactEmpty icon={PartyPopper} title="No upcoming birthdays" message="Birthdays in the next 7 days will show here." />
                </li>
              ) : (
                birthdays.map((b) => (
                  <ItemRow
                    key={b._id}
                    src={b.employee?.profilePhoto}
                    name={b.name}
                    sub={`Turns ${b.age} · in ${b.days}d · ${formatDate(b.date)}`}
                    badge={<Badge tone="violet">🎂</Badge>}
                  />
                ))
              )}
            </ul>
          </section>

          <section className="px-5 py-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <CompactEmpty icon={CalendarDays} title="No upcoming holidays" message="Holidays are not configured yet." />
              <CompactEmpty icon={Sun} title="Weekend &amp; events" message="Company events are not tracked yet." />
            </div>
          </section>
        </div>
      </Card>
    </section>
  );
}
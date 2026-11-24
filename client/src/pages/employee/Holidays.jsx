import { useState } from 'react';
import { CalendarDays } from 'lucide-react';
import api from '../../services/api';
import { useApi } from '../../hooks/useApi';
import { formatDate } from '../../services/format';
import PageHeader from '../../components/PageHeader';
import { Card } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import HolidayCalendar from '../../components/holiday/HolidayCalendar';

export default function Holidays() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(now.getMonth());

  const list = useApi(async () => {
    const { data } = await api.get(`/holidays?year=${year}`);
    return data.data || [];
  }, [year]);

  const holidays = list.data || [];
  const years = [];
  for (let y = currentYear + 1; y >= currentYear - 3; y -= 1) years.push(y);
  const moveMonth = (delta) => {
    const next = new Date(year, month + delta, 1);
    setYear(next.getFullYear());
    setMonth(next.getMonth());
  };

  return (
    <div>
      <PageHeader title="Holiday Calendar" description="View public holidays and mandatory Sunday leave." />

      <div className="mb-6">
        <HolidayCalendar
          year={year}
          month={month}
          holidays={holidays}
          yearOptions={years}
          onPrevMonth={() => moveMonth(-1)}
          onNextMonth={() => moveMonth(1)}
          onYearChange={setYear}
          onMonthChange={setMonth}
          readOnly
        />
      </div>

      <Card className="overflow-hidden">
        <div className="border-b px-5 py-4 dark:border-slate-700"><h3 className="font-bold text-slate-900 dark:text-slate-100">Holidays in {year}</h3></div>
        {list.loading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4"><Skeleton className="h-11 w-11 rounded-xl" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-40" /><Skeleton className="h-3 w-56" /></div><Skeleton className="h-6 w-16 rounded-full" /></div>
            ))}
          </div>
        ) : !holidays.length ? (
          <EmptyState icon={CalendarDays} title="No holidays" message="No public holidays published for this year. Sundays remain mandatory weekly leave." />
        ) : (
          <div className="divide-y dark:divide-slate-700">
            {holidays.map((h) => (
              <div key={h._id} className="flex items-center gap-4 px-5 py-3.5">
                <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400">
                  <span className="text-sm font-bold leading-none">{new Date(h.date).getDate()}</span>
                  <span className="text-[10px] uppercase">{new Date(h.date).toLocaleString(undefined, { month: 'short' })}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-800 dark:text-slate-100">{h.name}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-300">{formatDate(h.date)} · {new Date(h.date).toLocaleDateString(undefined, { weekday: 'long' })}{h.description ? ` · ${h.description}` : ''}</p>
                </div>
                <Badge tone="sky">{h.type}</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

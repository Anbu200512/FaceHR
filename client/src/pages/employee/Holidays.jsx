import { useState } from 'react';
import { CalendarDays } from 'lucide-react';
import api from '../../services/api';
import { useApi } from '../../hooks/useApi';
import { formatDate } from '../../services/format';
import PageHeader from '../../components/PageHeader';
import { Card } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';

export default function Holidays() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);

  const list = useApi(async () => {
    const { data } = await api.get(`/holidays?year=${year}`);
    return data.data;
  }, [year]);

  const years = [];
  for (let y = currentYear + 1; y >= currentYear - 3; y -= 1) years.push(y);

  return (
    <div>
      <PageHeader title="Holiday Calendar" description="Public holidays for the year.">
        <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="input w-auto">
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </PageHeader>

      <Card className="overflow-hidden">
        {list.loading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-12 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />)}
          </div>
        ) : !list.data?.length ? (
          <EmptyState icon={CalendarDays} title="No holidays" message="Holidays for this year have not been published yet." />
        ) : (
          <div className="divide-y dark:divide-slate-700">
            {list.data.map((h) => (
              <div key={h._id} className="flex items-center gap-4 px-5 py-3.5">
                <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400">
                  <span className="text-sm font-bold leading-none">{new Date(h.date).getDate()}</span>
                  <span className="text-[10px] uppercase">{new Date(h.date).toLocaleString(undefined, { month: 'short' })}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-800 dark:text-slate-100">{h.name}</p>
                  <p className="text-xs text-slate-400">
                    {formatDate(h.date)} · {new Date(h.date).toLocaleDateString(undefined, { weekday: 'long' })}
                    {h.description ? ` · ${h.description}` : ''}
                  </p>
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

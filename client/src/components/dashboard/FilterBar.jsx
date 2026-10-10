import { ChevronLeft, ChevronRight, Calendar, MapPin, Building2, RotateCcw } from 'lucide-react';
import { Card } from '../ui/Card';
import Button from '../ui/Button';
import { MONTH_NAMES } from '../../services/format';

export default function FilterBar({ value, onChange, locations = [], departments = [], loading }) {
  const years = [];
  const current = new Date().getFullYear();
  for (let y = current - 2; y <= current + 1; y++) years.push(y);

  const shiftMonth = (delta) => {
    const total = value.year * 12 + (value.month - 1) + delta;
    const clamped = Math.min(current * 12 + 11, Math.max((current - 2) * 12, total));
    onChange({ ...value, year: Math.floor(clamped / 12), month: (clamped % 12) + 1 });
  };

  const resetToCurrent = () =>
    onChange({ ...value, year: current, month: new Date().getMonth() + 1 });

  return (
    <Card className="mb-5 p-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex items-end gap-2">
          <div>
            <label className="label">Month</label>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => shiftMonth(-1)}
                className="flex h-10 w-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                aria-label="Previous month"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <select
                value={value.month}
                onChange={(e) => onChange({ ...value, month: Number(e.target.value) })}
                className="input w-36"
              >
                {MONTH_NAMES.map((name, i) => (
                  <option key={name} value={i + 1}>{name}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => shiftMonth(1)}
                className="flex h-10 w-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                aria-label="Next month"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div>
            <label className="label">Year</label>
            <select
              value={value.year}
              onChange={(e) => onChange({ ...value, year: Number(e.target.value) })}
              className="input w-24"
            >
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="label">
            <MapPin className="mr-1 inline h-3 w-3" /> Location
          </label>
          <select
            value={value.location || ''}
            onChange={(e) => onChange({ ...value, location: e.target.value || null })}
            className="input w-full sm:w-48"
            disabled={loading}
          >
            <option value="">All Locations</option>
            {locations.map((l) => <option key={l._id} value={l._id}>{l.name}</option>)}
          </select>
        </div>

        <div>
          <label className="label">
            <Building2 className="mr-1 inline h-3 w-3" /> Department
          </label>
          <select
            value={value.department || ''}
            onChange={(e) => onChange({ ...value, department: e.target.value || null })}
            className="input w-full sm:w-48"
            disabled={loading}
          >
            <option value="">All Departments</option>
            {departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
          </select>
        </div>

        <Button variant="ghost" size="sm" onClick={resetToCurrent} className="mb-0.5">
          <Calendar className="h-4 w-4" /> This Month
        </Button>
      </div>
    </Card>
  );
}
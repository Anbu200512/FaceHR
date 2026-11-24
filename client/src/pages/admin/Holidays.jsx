import { useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, CalendarDays, CalendarRange } from 'lucide-react';
import api, { extractError } from '../../services/api';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import { formatDate, toDateKey, toInputDate } from '../../services/format';
import { HOLIDAY_TYPES } from '../../services/static';
import PageHeader from '../../components/PageHeader';
import { Card } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import { Input, Select, Textarea } from '../../components/ui/Form';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import HolidayCalendar from '../../components/holiday/HolidayCalendar';

const emptyForm = { name: '', date: '', type: 'Public', description: '', active: true };
const emptyBulk = { name: '', from: '', to: '', type: 'Public', description: '', active: true, pattern: 'all', interval: 7, alternateDays: 1, weekdays: [0], alternateWeekday: 6 };
const WEEKDAY_OPTIONS = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];
const BULK_PATTERNS = [
  { value: 'all', label: 'All days in range' },
  { value: 'every_n', label: 'Every N days are leave' },
  { value: 'alternate', label: 'Alternate N days are leave' },
  { value: 'weekly_days', label: 'Every selected weekdays (e.g. every Sunday)' },
  { value: 'alternate_weekday', label: 'Alternate weekday (e.g. alternate Saturdays)' },
];

export default function Holidays() {
  const toast = useToast();
  const now = new Date();
  const currentYear = now.getFullYear();
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(now.getMonth());
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulk, setBulk] = useState(emptyBulk);
  const [busy, setBusy] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const { data, loading, refetch } = useApi(async () => {
    const { data } = await api.get(`/holidays?year=${year}`);
    return data.data;
  }, [year]);

  const holidays = data || [];
  const holidayByDate = useMemo(() => {
    const map = new Map();
    holidays.forEach((h) => {
      const key = toInputDate(h.date);
      if (key) map.set(key, h);
    });
    return map;
  }, [holidays]);

  const openNew = (dateKey = '') => { setForm({ ...emptyForm, date: dateKey }); setModal({ editing: false }); };
  const openBulk = (dateKey = '') => {
    const from = dateKey || toDateKey(new Date(year, month, 1));
    const to = dateKey || toDateKey(new Date(year, month + 1, 0));
    setBulk({ ...emptyBulk, from, to });
    setBulkOpen(true);
  };
  const openEdit = (h) => {
    setForm({
      name: h.name,
      date: toInputDate(h.date),
      type: h.type,
      description: h.description || '',
      active: h.active,
    });
    setModal({ editing: true, id: h._id });
  };

  const submit = async () => {
    if (!form.name.trim() || !form.date) { toast.error('Name and date are required'); return; }
    setBusy(true);
    try {
      if (modal.editing) {
        await api.put(`/holidays/${modal.id}`, form);
        toast.success('Holiday updated');
      } else {
        await api.post('/holidays', form);
        toast.success('Holiday added');
      }
      setModal(null);
      refetch();
    } catch (err) {
      toast.error(extractError(err, 'Could not save holiday'));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await api.delete(`/holidays/${deleteId}`);
      toast.success('Holiday deleted');
      setDeleteId(null);
      refetch();
    } catch (err) {
      toast.error(extractError(err, 'Could not delete holiday'));
    } finally {
      setBusy(false);
    }
  };

  const buildBulkDates = () => {
    const from = new Date(`${bulk.from}T00:00:00`);
    const to = new Date(`${bulk.to}T00:00:00`);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) return [];
    const interval = Math.max(2, Math.floor(Number(bulk.interval) || 2));
    const alternateDays = Math.max(1, Math.floor(Number(bulk.alternateDays) || 1));
    const weekdays = Array.isArray(bulk.weekdays) ? bulk.weekdays.map(Number).filter((d) => d >= 0 && d <= 6) : [];
    const alternateWeekday = Math.max(0, Math.min(6, Math.floor(Number(bulk.alternateWeekday) || 0)));
    const dates = [];
    let cursor = new Date(from);
    let dayIndex = 0;
    let weekdayOccurrence = 0;
    while (cursor <= to) {
      const weekday = cursor.getDay();
      let include = false;
      if (bulk.pattern === 'all') include = true;
      else if (bulk.pattern === 'every_n') include = dayIndex % interval === 0;
      else if (bulk.pattern === 'alternate') include = (dayIndex % (alternateDays * 2)) < alternateDays;
      else if (bulk.pattern === 'weekly_days') include = weekdays.includes(weekday);
      else if (bulk.pattern === 'alternate_weekday') {
        if (weekday === alternateWeekday) {
          include = weekdayOccurrence % 2 === 0;
          weekdayOccurrence += 1;
        }
      }
      if (include) dates.push(toDateKey(cursor));
      cursor.setDate(cursor.getDate() + 1);
      dayIndex += 1;
    }
    return dates;
  };

  const bulkPreview = useMemo(() => buildBulkDates(), [bulk]);

  const submitBulk = async () => {
    if (!bulk.name.trim()) { toast.error('Holiday name is required'); return; }
    if (!bulk.from || !bulk.to) { toast.error('From and To dates are required'); return; }
    const dates = buildBulkDates();
    if (!dates.length) { toast.error('No dates matched the selected pattern/range'); return; }
    setBusy(true);
    try {
      const payload = {
        ...bulk,
        name: bulk.name.trim(),
        description: String(bulk.description || '').trim(),
        interval: Math.max(2, Math.floor(Number(bulk.interval) || 2)),
        alternateDays: Math.max(1, Math.floor(Number(bulk.alternateDays) || 1)),
        weekdays: Array.isArray(bulk.weekdays) ? bulk.weekdays.map(Number).filter((d) => d >= 0 && d <= 6) : [],
        alternateWeekday: Math.max(0, Math.min(6, Math.floor(Number(bulk.alternateWeekday) || 0))),
      };
      const { data } = await api.post('/holidays/bulk', payload);
      const created = data?.created ?? 0;
      const skipped = data?.skipped ?? 0;
      toast.success(`Leave days marked: ${created} added${skipped ? `, ${skipped} skipped` : ''}`);
      setBulkOpen(false);
      refetch();
    } catch (err) {
      toast.error(extractError(err, 'Could not mark leave days'));
    } finally {
      setBusy(false);
    }
  };

  const years = [];
  for (let y = currentYear + 2; y >= currentYear - 3; y -= 1) years.push(y);

  const onDayClick = (day, key, existing) => {
    if (new Date(year, month, day).getDay() === 0) {
      toast.info('Every Sunday is a mandatory weekly leave and cannot be changed.');
      return;
    }
    if (existing) openEdit(existing);
    else openNew(key);
  };

  const moveMonth = (delta) => {
    const next = new Date(year, month + delta, 1);
    setYear(next.getFullYear());
    setMonth(next.getMonth());
  };

  return (
    <div>
      <PageHeader title="Holiday Calendar" description="Manage public holidays and recurring leave days. Sundays are mandatory leave.">
        <Button variant="secondary" size="sm" onClick={() => openBulk()}><CalendarRange className="h-4 w-4" /> Mark Leave Pattern</Button>
        <Button size="sm" onClick={() => openNew()}><Plus className="h-4 w-4" /> Add Holiday</Button>
      </PageHeader>

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
          onDayClick={onDayClick}
        />
      </div>

      <Card className="overflow-hidden">
        <div className="border-b px-5 py-4 dark:border-slate-700">
          <h3 className="font-bold text-slate-900 dark:text-slate-100">Holidays in {year}</h3>
        </div>
        {loading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                <Skeleton className="h-11 w-11 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-56" />
                </div>
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            ))}
          </div>
        ) : !holidays.length ? (
          <EmptyState icon={CalendarDays} title="No holidays" message="Click any date in the calendar above to mark a holiday." />
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
                  <p className="text-xs text-slate-400 dark:text-slate-300">
                    {formatDate(h.date)} · {new Date(h.date).toLocaleDateString(undefined, { weekday: 'long' })}
                    {h.description ? ` · ${h.description}` : ''}
                  </p>
                </div>
                <Badge tone={h.active ? undefined : 'rose'}>{h.active ? h.type : 'Inactive'}</Badge>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(h)} className="rounded-lg p-1.5 text-slate-500 dark:text-slate-300 hover:bg-slate-100 hover:text-brand-600 dark:hover:bg-slate-800">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => setDeleteId(h._id)} className="rounded-lg p-1.5 text-slate-500 dark:text-slate-300 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.editing ? 'Edit Holiday' : 'Add Holiday'} size="sm">
        <div className="space-y-4">
          <Input label="Holiday name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Diwali / Leave day" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input label="Date *" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            <Select label="Type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} options={HOLIDAY_TYPES} />
          </div>
          <Textarea label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 dark:bg-slate-800" />
            Active (counts in leave and payroll calculations)
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setModal(null)}>Cancel</Button>
            <Button onClick={submit} loading={busy}>{modal?.editing ? 'Save Changes' : 'Add Holiday'}</Button>
          </div>
        </div>
      </Modal>

      <Modal open={bulkOpen} onClose={() => setBulkOpen(false)} title="Mark Leave Days Pattern" subtitle="Create holidays/leave days by pattern. Existing dates are skipped safely." size="md">
        <div className="space-y-4">
          <Input label="Leave/holiday name *" value={bulk.name} onChange={(e) => setBulk({ ...bulk, name: e.target.value })} placeholder="Weekly Off / Site Leave" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input label="From date *" type="date" value={bulk.from} onChange={(e) => setBulk({ ...bulk, from: e.target.value })} />
            <Input label="To date *" type="date" value={bulk.to} onChange={(e) => setBulk({ ...bulk, to: e.target.value })} />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Select label="Pattern" value={bulk.pattern} onChange={(e) => setBulk({ ...bulk, pattern: e.target.value })} options={BULK_PATTERNS} />
            <Select label="Type" value={bulk.type} onChange={(e) => setBulk({ ...bulk, type: e.target.value })} options={HOLIDAY_TYPES} />
          </div>

          {bulk.pattern === 'every_n' && (
            <Input label="Every N days are leave" type="number" min="2" value={bulk.interval} onChange={(e) => setBulk({ ...bulk, interval: e.target.value })} hint="Example: 7 means day 1 leave, next 6 working, then leave." />
          )}
          {bulk.pattern === 'alternate' && (
            <Input label="Alternate leave block (days)" type="number" min="1" value={bulk.alternateDays} onChange={(e) => setBulk({ ...bulk, alternateDays: e.target.value })} hint="Example: 1 means 1 day leave, 1 day work, repeat. 2 means 2 leave, 2 work." />
          )}
          {bulk.pattern === 'weekly_days' && (
            <div>
              <label className="label">Weekdays to mark as leave</label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {WEEKDAY_OPTIONS.map((d) => {
                  const checked = (bulk.weekdays || []).includes(d.value);
                  return (
                    <label key={d.value} className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-sm ${checked ? 'border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-500/40 dark:bg-brand-500/10 dark:text-brand-300' : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300'}`}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          const next = new Set(bulk.weekdays || []);
                          if (e.target.checked) next.add(d.value); else next.delete(d.value);
                          setBulk({ ...bulk, weekdays: Array.from(next).sort((a, b) => a - b) });
                        }}
                        className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 dark:bg-slate-800"
                      />
                      {d.label}
                    </label>
                  );
                })}
              </div>
              <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-300">Example: select Sunday to mark every Sunday as leave.</p>
            </div>
          )}
          {bulk.pattern === 'alternate_weekday' && (
            <Select
              label="Alternate weekday"
              value={String(bulk.alternateWeekday)}
              onChange={(e) => setBulk({ ...bulk, alternateWeekday: Number(e.target.value) })}
              options={WEEKDAY_OPTIONS.map((d) => ({ value: String(d.value), label: d.label }))}
              hint="Example: Saturday means 1st Saturday leave, 2nd working, 3rd leave..."
            />
          )}

          <Textarea label="Description" value={bulk.description} onChange={(e) => setBulk({ ...bulk, description: e.target.value })} rows={2} />
          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <input type="checkbox" checked={bulk.active} onChange={(e) => setBulk({ ...bulk, active: e.target.checked })} className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 dark:bg-slate-800" />
            Active (counts in leave and payroll calculations)
          </label>

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
            <p><span className="font-semibold text-slate-800 dark:text-slate-100">{bulkPreview.length}</span> date(s) will be marked.</p>
            <p className="mt-1 text-slate-500 dark:text-slate-400">Existing holidays on the same date are skipped automatically.</p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setBulkOpen(false)}>Cancel</Button>
            <Button onClick={submitBulk} loading={busy}>Mark Leave Days</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={remove}
        loading={busy}
        title="Delete holiday?"
        message="This holiday will no longer be excluded from leave or payroll."
        confirmLabel="Delete"
      />
    </div>
  );
}

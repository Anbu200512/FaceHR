import { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { toDateKey, toInputDate } from '../../services/format';

const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function HolidayCalendar({
  year,
  month,
  holidays = [],
  onPrevMonth,
  onNextMonth,
  onYearChange,
  onMonthChange,
  onDayClick,
  readOnly = false,
  yearOptions = [],
}) {
  const holidayByDate = useMemo(() => {
    const map = new Map();
    holidays.forEach((h) => {
      const key = toInputDate(h.date);
      if (key) map.set(key, h);
    });
    return map;
  }, [holidays]);

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) cells.push(d);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-4 dark:border-slate-700 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{MONTHS[month]} {year}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Sundays are mandatory leave.{readOnly ? '' : ' Click a date to add or edit a holiday.'}</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onPrevMonth} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800" aria-label="Previous month"><ChevronLeft className="h-4 w-4" /></button>
          <select value={month} onChange={(e) => onMonthChange(Number(e.target.value))} className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
            {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
          </select>
          <select value={year} onChange={(e) => onYearChange(Number(e.target.value))} className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
            {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <button type="button" onClick={onNextMonth} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800" aria-label="Next month"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>

      <div className="px-4 py-3 sm:px-5">
        <div className="mb-3 flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
          <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-amber-500" />Sunday leave</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-brand-500" />Holiday</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-slate-300 dark:bg-slate-600" />Normal day</span>
        </div>

        <div className="grid grid-cols-7 border-l border-t border-slate-200 dark:border-slate-700">
          {WEEK_DAYS.map((d) => (
            <div key={d} className="border-b border-r border-slate-200 bg-slate-50 px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-300">{d}</div>
          ))}
          {cells.map((day, idx) => {
            if (!day) {
              return <div key={`empty-${idx}`} className="min-h-[92px] border-b border-r border-slate-200 bg-slate-50/40 dark:border-slate-700 dark:bg-slate-800/20 sm:min-h-[104px]" />;
            }
            const dateObj = new Date(year, month, day);
            const key = toDateKey(dateObj);
            const h = holidayByDate.get(key);
            const sunday = dateObj.getDay() === 0;
            const isToday = key === toDateKey(new Date());
            const clickable = !readOnly && !sunday;
            const CellTag = clickable ? 'button' : 'div';
            return (
              <CellTag
                key={key}
                type={clickable ? 'button' : undefined}
                onClick={clickable ? () => onDayClick?.(day, key, h || null) : undefined}
                className={`min-h-[92px] border-b border-r border-slate-200 p-2 text-left align-top sm:min-h-[104px] dark:border-slate-700 ${sunday ? 'bg-amber-50/70 dark:bg-amber-500/10' : h ? 'bg-brand-50/60 dark:bg-brand-500/10' : 'bg-white dark:bg-slate-900'} ${clickable ? 'cursor-pointer transition hover:bg-slate-50 dark:hover:bg-slate-800/70' : ''} ${isToday ? 'relative z-[1] ring-1 ring-inset ring-brand-500' : ''}`}
                title={sunday ? 'Every Sunday is mandatory leave' : h ? `${h.name}${readOnly ? '' : ' - click to edit'}` : readOnly ? '' : 'Click to mark holiday'}
              >
                <div className="flex items-center justify-between">
                  <span className={`inline-flex h-7 w-7 items-center justify-center rounded-md text-sm font-medium ${sunday ? 'bg-amber-500 text-white' : h ? 'bg-brand-600 text-white dark:bg-brand-500' : isToday ? 'bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300' : 'text-slate-700 dark:text-slate-200'}`}>{day}</span>
                  {(h || sunday) && <span className={`h-2 w-2 rounded-full ${sunday ? 'bg-amber-500' : h?.active ? 'bg-brand-500' : 'bg-slate-400'}`} />}
                </div>
                <div className="mt-2 min-h-[32px]">
                  {sunday ? (
                    <p className="text-[11px] font-medium leading-4 text-amber-700 dark:text-amber-300">Sunday Leave</p>
                  ) : h ? (
                    <>
                      <p className="truncate text-[11px] font-medium leading-4 text-brand-700 dark:text-brand-300">{h.name}</p>
                      <p className="truncate text-[10px] text-slate-500 dark:text-slate-400">{h.active ? h.type : 'Inactive'}</p>
                    </>
                  ) : null}
                </div>
              </CellTag>
            );
          })}
        </div>
      </div>
    </div>
  );
}

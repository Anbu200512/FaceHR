import { useEffect, useState } from 'react';
import clsx from 'clsx';

const pad = (n) => String(n).padStart(2, '0');

function parse(hhmm) {
  if (!hhmm || !/^\d{1,2}:\d{2}$/.test(hhmm)) return { h: '', m: '', ap: '' };
  const [h, m] = hhmm.split(':').map(Number);
  const ap = h >= 12 ? 'PM' : 'AM';
  let h12 = h % 12;
  if (h12 === 0) h12 = 12;
  return { h: String(h12), m: pad(m), ap };
}

function toHHMM({ h, m, ap }) {
  if (!h || !m || !ap) return '';
  let hour = Number(h) % 12;
  if (ap === 'PM') hour += 12;
  return `${pad(hour)}:${m}`;
}

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1));
const MINUTES = Array.from({ length: 60 }, (_, i) => pad(i));

/**
 * 12-hour time picker with explicit AM/PM. Emits 24-hour `HH:MM` via onChange
 * (the format the API expects); empty string when any part is unset.
 */
export default function TimeInput({ value, onChange, className, placeholder, disabled, ...rest }) {
  const [parts, setParts] = useState(() => parse(value));

  useEffect(() => {
    setParts(parse(value));
  }, [value]);

  const emit = (patch) => {
    const merged = { ...parts, ...patch };
    setParts(merged);
    onChange?.(toHHMM(merged));
  };

  const empty = !parts.h || !parts.m || !parts.ap;

  return (
    <div
      className={clsx(
        'flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2 py-1.5 dark:border-slate-700 dark:bg-slate-900',
        disabled && 'opacity-60',
        className
      )}
      {...rest}
    >
      <select
        aria-label="Hour"
        value={parts.h}
        disabled={disabled}
        onChange={(e) => emit({ h: e.target.value })}
        className={clsx('w-14 border-0 bg-transparent py-0.5 text-sm font-semibold text-slate-700 outline-none dark:text-slate-200', empty && 'text-slate-400')}
      >
        <option value="">hh</option>
        {HOURS.map((h) => <option key={h} value={h}>{h}</option>)}
      </select>
      <span className="text-sm font-semibold text-slate-400">:</span>
      <select
        aria-label="Minute"
        value={parts.m}
        disabled={disabled}
        onChange={(e) => emit({ m: e.target.value })}
        className={clsx('w-14 border-0 bg-transparent py-0.5 text-sm font-semibold text-slate-700 outline-none dark:text-slate-200', empty && 'text-slate-400')}
      >
        <option value="">mm</option>
        {MINUTES.map((m) => <option key={m} value={m}>{m}</option>)}
      </select>
      <select
        aria-label="AM or PM"
        value={parts.ap}
        disabled={disabled}
        onChange={(e) => emit({ ap: e.target.value })}
        className={clsx('w-16 border-0 bg-transparent py-0.5 text-sm font-bold text-slate-700 outline-none dark:text-slate-200', empty && 'text-slate-400')}
      >
        <option value="">—</option>
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>
    </div>
  );
}

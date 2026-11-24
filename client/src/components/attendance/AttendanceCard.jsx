import { useState } from 'react';
import { CalendarDays, Clock, LogIn, LogOut, MapPin } from 'lucide-react';
import clsx from 'clsx';
import { Card } from '../ui/Card';
import Badge from '../ui/Badge';
import Avatar from '../Avatar';
import {
  formatTime,
  formatDuration,
  formatLocation,
  formatDate,
  resolveAsset,
} from '../../services/format';

function Detail({ icon: Icon, label, value }) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400 dark:text-slate-300">
        {Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
        <span className="truncate">{label}</span>
      </div>
      <p className={clsx('mt-1 truncate text-sm', value ? 'font-semibold text-slate-800 dark:text-slate-100' : 'text-slate-300 dark:text-slate-300')}>
        {value || '-'}
      </p>
    </div>
  );
}

function Photo({ src, label }) {
  const url = src ? resolveAsset(src) : null;
  const [broken, setBroken] = useState(false);
  if (!url) return null;
  return (
    <div className="min-w-0 flex-1">
      {broken ? (
        <div className="flex h-28 w-full items-center justify-center rounded-xl bg-amber-50 text-xs text-amber-600 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/30">
          Photo missing on server
        </div>
      ) : (
        <img
          src={url}
          alt={label}
          loading="lazy"
          className="h-28 w-full rounded-xl object-cover"
          onError={() => setBroken(true)}
        />
      )}
      <p className="mt-1 text-xs font-medium text-slate-400 dark:text-slate-300">{label}</p>
    </div>
  );
}

export default function AttendanceCard({ row }) {
  const emp = row.employee;
  const rec = row.record;
  const name = `${[emp.firstName, emp.middleName, emp.lastName].filter(Boolean).join(" ")}`.trim();
  const dept = emp.department?.name || emp.department || 'No department';
  const office = emp.office?.name;

  const checkInLocation = formatLocation(rec?.checkInLocation);
  const checkOutLocation = formatLocation(rec?.checkOutLocation);

  const photos = [];
  if (rec?.checkInPhoto) photos.push({ src: rec.checkInPhoto, label: 'Check-in photo' });
  if (rec?.checkOutPhoto) photos.push({ src: rec.checkOutPhoto, label: 'Check-out photo' });

  return (
    <Card className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center gap-3 border-b px-5 py-4 dark:border-slate-700">
        <Avatar name={name} src={emp.profilePhoto} size="md" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">{name}</p>
          <p className="truncate text-xs text-slate-400 dark:text-slate-300">
            {emp.employeeId} · {dept}
            {office ? ` · ${office}` : ''}
          </p>
        </div>
        <Badge>{row.status}</Badge>
      </div>

      {rec ? (
        <div className="flex flex-1 flex-col gap-4 p-5">
          {photos.length > 0 && (
            <div className="flex gap-3">
              {photos.map((p) => (
                <Photo key={p.label} src={p.src} label={p.label} />
              ))}
            </div>
          )}
          <div className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-3">
            <Detail icon={LogIn} label="Check in" value={formatTime(rec.checkInTime)} />
            <Detail icon={LogOut} label="Check out" value={formatTime(rec.checkOutTime)} />
            <Detail icon={Clock} label="Hours" value={formatDuration(rec.workingHoursMinutes)} />
            <Detail icon={CalendarDays} label="Date" value={formatDate(rec.date)} />
            <Detail icon={MapPin} label="Check-in location" value={checkInLocation || 'Location not available'} />
            <Detail icon={MapPin} label="Check-out location" value={checkOutLocation || 'Location not available'} />
          </div>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center px-5 py-8">
          <div className="text-center">
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-300">No attendance record</p>
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-300">No check-in captured for this day.</p>
          </div>
        </div>
      )}
    </Card>
  );
}
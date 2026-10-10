import { Plus, Trash2, UploadCloud, X } from 'lucide-react';
import Button from '../../ui/Button';
import { Card } from '../../ui/Card';
import { Input } from '../../ui/Form';

export function AddressFields({ value = {}, onChange, className }) {
  const set = (field) => (e) => onChange({ ...value, [field]: e.target.value });
  return (
    <div className={className}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Address Line 1" name="line1" value={value.line1 || ''} onChange={set('line1')} placeholder="House no, street" className="sm:col-span-2" />
        <Input label="Address Line 2" name="line2" value={value.line2 || ''} onChange={set('line2')} placeholder="Area, landmark" />
        <Input label="City" name="city" value={value.city || ''} onChange={set('city')} placeholder="City" />
        <Input label="State" name="state" value={value.state || ''} onChange={set('state')} placeholder="State" />
        <Input label="Country" name="country" value={value.country || ''} onChange={set('country')} placeholder="Country" />
        <Input label="Pincode" name="pincode" value={value.pincode || ''} onChange={set('pincode')} placeholder="PIN / Zip" />
      </div>
    </div>
  );
}

export function SectionCard({ title, subtitle, icon: Icon, children }) {
  return (
    <Card>
      <div className="flex items-start gap-3 border-b px-5 py-4 dark:border-slate-700">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
          {Icon && <Icon className="h-4.5 w-4.5" />}
        </div>
        <div>
          <h3 className="font-bold text-slate-900 dark:text-slate-100">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
        </div>
      </div>
      <div className="p-5">{children}</div>
    </Card>
  );
}

export function EntryCard({ index, title, onRemove, children }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700">
      <div className="flex items-center justify-between border-b px-4 py-3 dark:border-slate-700">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</p>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10"
            title="Remove entry"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="grid gap-4 p-4 sm:grid-cols-2">{children}</div>
    </div>
  );
}

export function ListEditor({ addLabel, onAdd, children }) {
  return (
    <div className="space-y-4">
      {children}
      <Button type="button" variant="ghost" size="sm" onClick={onAdd}>
        <Plus className="h-4 w-4" /> {addLabel}
      </Button>
    </div>
  );
}

export function UploadChip({ name, sizeLabel, onRemove, meta, children }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/60">
      <div className="flex min-w-0 items-center gap-2.5">
        <UploadCloud className="h-4 w-4 shrink-0 text-brand-500" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">{name}</p>
          {sizeLabel && <p className="truncate text-xs text-slate-400">{sizeLabel}</p>}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {meta}
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10"
            title="Remove file"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

export function FilePicker({ accept, onSelect, children }) {
  return (
    <label className="btn-secondary cursor-pointer text-xs">
      {children}
      <input
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onSelect(file);
          e.target.value = '';
        }}
      />
    </label>
  );
}

export function CheckboxField({ label, checked, onChange, hint }) {
  return (
    <label className="flex items-center gap-2.5 text-sm text-slate-700 dark:text-slate-200">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
      />
      <span className="min-w-0">
        <span className="font-medium">{label}</span>
        {hint && <span className="ml-1 text-xs font-normal text-slate-400">{hint}</span>}
      </span>
    </label>
  );
}
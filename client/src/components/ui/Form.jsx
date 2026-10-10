import clsx from 'clsx';

export function Input({ label, error, hint, className, register, name, ...props }) {
  return (
    <div className={className}>
      {label && <label className="label" htmlFor={name || props.id}>{label}</label>}
      <input
        id={name || props.id}
        className={clsx('input', error && 'border-rose-400 focus:border-rose-400 focus:ring-rose-100')}
        {...(register ? register(name) : {})}
        {...props}
      />
      {hint && !error && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
      {error && <p className="mt-1 text-xs font-medium text-rose-500">{error}</p>}
    </div>
  );
}

export function Select({ label, error, hint, className, options = [], placeholder, register, name, children, ...props }) {
  return (
    <div className={className}>
      {label && <label className="label" htmlFor={name || props.id}>{label}</label>}
      <select
        id={name || props.id}
        className={clsx('input appearance-none', error && 'border-rose-400')}
        {...(register ? register(name) : {})}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => {
          if (typeof o === 'string') return <option key={o} value={o}>{o}</option>;
          return <option key={o.value ?? o.label} value={o.value}>{o.label}</option>;
        })}
        {children}
      </select>
      {error && <p className="mt-1 text-xs font-medium text-rose-500">{error}</p>}
    </div>
  );
}

export function Textarea({ label, error, hint, className, register, name, ...props }) {
  return (
    <div className={className}>
      {label && <label className="label" htmlFor={name || props.id}>{label}</label>}
      <textarea
        id={name || props.id}
        className={clsx('input min-h-[90px]', error && 'border-rose-400')}
        {...(register ? register(name) : {})}
        {...props}
      />
      {error && <p className="mt-1 text-xs font-medium text-rose-500">{error}</p>}
    </div>
  );
}
import { ScanFace } from 'lucide-react';
import clsx from 'clsx';

export default function Logo({ size = 'md', className, showText = true }) {
  const sizes = {
    sm: { box: 'h-8 w-8 rounded-lg', icon: 'h-4.5 w-4.5', text: 'text-base' },
    md: { box: 'h-9 w-9 rounded-xl', icon: 'h-5 w-5', text: 'text-lg' },
    lg: { box: 'h-12 w-12 rounded-2xl', icon: 'h-6 w-6', text: 'text-2xl' },
  };
  const s = sizes[size] || sizes.md;
  return (
    <div className={clsx('flex items-center gap-2.5', className)}>
      <div className={clsx('flex items-center justify-center bg-brand-600 shadow-sm', s.box)}>
        <ScanFace className={clsx('text-white', s.icon)} />
      </div>
      {showText && (
        <div className="leading-tight">
          <span className={clsx('font-extrabold tracking-tight text-slate-900 dark:text-white', s.text)}>
            Face<span className="text-brand-600 dark:text-brand-400">HR</span>
          </span>
        </div>
      )}
    </div>
  );
}
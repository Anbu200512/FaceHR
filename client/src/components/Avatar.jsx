import { resolveAsset, initials } from '../services/format';
import clsx from 'clsx';

export default function Avatar({ user, src, name, size = 'md', className }) {
  const sizes = {
    xs: 'h-7 w-7 text-[10px]',
    sm: 'h-9 w-9 text-xs',
    md: 'h-11 w-11 text-sm',
    lg: 'h-16 w-16 text-lg',
    xl: 'h-24 w-24 text-2xl',
  };
  const img = src ?? (user?.profilePhoto ?? user?.photoUrl ?? null);
  const displayName = name || user?.name || user?.fullName || '?';
  const resolved = img ? resolveAsset(img) : null;

  if (resolved) {
    return (
      <img
        src={resolved}
        alt={displayName}
        loading="lazy"
        className={clsx('shrink-0 rounded-full object-cover', sizes[size], className)}
      />
    );
  }
  return (
    <div
      className={clsx(
        'flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 font-bold text-white',
        sizes[size],
        className
      )}
    >
      {initials(displayName)}
    </div>
  );
}
import { useState } from 'react';
import { resolveAsset, initials } from '../services/format';
import clsx from 'clsx';

export default function Avatar({ user, src, name, size = 'md', className, onClick, title }) {
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
  const [broken, setBroken] = useState(false);
  const clickable = typeof onClick === 'function';

  const base = clsx(
    'shrink-0 rounded-full',
    sizes[size],
    clickable && 'cursor-pointer transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2',
    className
  );

  if (resolved && !broken) {
    const image = (
      <img
        src={resolved}
        alt={displayName}
        loading="lazy"
        onError={() => setBroken(true)}
        className={clsx(base, 'object-cover')}
      />
    );
    return clickable ? (
      <button type="button" onClick={onClick} title={title || 'View photo'} className="rounded-full">
        {image}
      </button>
    ) : (
      image
    );
  }

  const fallback = (
    <div
      className={clsx(
        base,
        'flex items-center justify-center bg-gradient-to-br from-brand-500 to-brand-700 font-bold text-white'
      )}
    >
      {initials(displayName)}
    </div>
  );
  return clickable ? (
    <button type="button" onClick={onClick} title={title || displayName} className="rounded-full">
      {fallback}
    </button>
  ) : (
    fallback
  );
}
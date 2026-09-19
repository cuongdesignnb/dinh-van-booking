'use client';

import { Heart } from 'lucide-react';
import { useEffect, useState } from 'react';

const KEY = 'dvb:favorites';

const read = (): string[] => {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
};

export function FavoriteButton({ id, name }: { id: string; name: string }) {
  // Always start unselected so server and client markup match; sync after hydration.
  const [saved, setSaved] = useState(false);
  const [burst, setBurst] = useState(0);

  useEffect(() => {
    setSaved(read().includes(id));
    const sync = (e: StorageEvent) => e.key === KEY && setSaved(read().includes(id));
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, [id]);

  const toggle = () => {
    const next = !saved;
    setSaved(next);
    if (next) setBurst((b) => b + 1);
    try {
      const list = new Set(read());
      if (next) list.add(id);
      else list.delete(id);
      localStorage.setItem(KEY, JSON.stringify([...list]));
    } catch {
      /* storage unavailable: keep in-memory state only */
    }
  };

  return (
    <button
      type="button"
      className="fav"
      aria-pressed={saved}
      aria-label={saved ? `Bỏ lưu ${name}` : `Lưu ${name}`}
      onClick={toggle}
    >
      <Heart size={22} strokeWidth={2} aria-hidden="true" className="fav__icon" />
      {burst > 0 && (
        <span key={burst} className="fav__burst" aria-hidden="true">
          {Array.from({ length: 8 }, (_, i) => (
            <i key={i} style={{ '--i': i } as React.CSSProperties} />
          ))}
        </span>
      )}
    </button>
  );
}

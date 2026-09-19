'use client';

import { Heart } from 'lucide-react';
import { useState } from 'react';
import { useFavorite, type FavoriteNs } from '@/lib/favorites';

export function FavoriteButton({
  id,
  name,
  ns = 'stay',
  className = 'fav',
}: {
  id: string;
  name: string;
  ns?: FavoriteNs;
  className?: string;
}) {
  const [saved, toggle] = useFavorite(ns, id);
  const [burst, setBurst] = useState(0);

  return (
    <button
      type="button"
      className={className}
      aria-pressed={saved}
      aria-label={saved ? `Bỏ lưu ${name}` : `Lưu ${name}`}
      onClick={(e) => {
        e.stopPropagation();
        if (toggle()) setBurst((b) => b + 1);
      }}
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

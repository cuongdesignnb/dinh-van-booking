import type { ReactNode } from 'react';
import { LeafSprig } from '@/components/ui/Decor';

type TrustIcon = 'leaf' | 'heart' | 'shield' | 'users';
type TrustItem = { id: string; icon: TrustIcon; lines: string[] };

// Commercial claims must come from managed content, never from a UI fixture.
const trustItems: TrustItem[] = [];

/** Filled glyphs to match the solid icons in the mockup. */
const glyphs: Record<(typeof trustItems)[number]['icon'], ReactNode> = {
  leaf: (
    <svg viewBox="0 0 28 28" aria-hidden="true" focusable="false">
      <path
        d="M24.5 3.5C13.8 3.1 5.4 8.6 4.6 18.3c-.1 1.5 0 3 .4 4.4 1.2-4.4 4.4-8.3 9-10.4-3.7 2.8-6.1 6.5-7.1 11 1.5.6 3.1.8 4.7.7 8.9-.7 13.1-9.4 12.9-20.5Z"
        fill="currentColor"
      />
      <path d="M4 26c1.5-5 4.5-9.2 9-12.4" stroke="#fffefa" strokeWidth="1.4" fill="none" strokeLinecap="round" />
    </svg>
  ),
  heart: (
    <svg viewBox="0 0 28 28" aria-hidden="true" focusable="false">
      <path
        d="M14 24.3S3.8 18.2 2.9 11.2C2.3 6.9 5.3 4 8.7 4.2c2.3.1 4.1 1.6 5.3 3.4 1.2-1.8 3-3.3 5.3-3.4 3.4-.2 6.4 2.7 5.8 7C24.2 18.2 14 24.3 14 24.3Z"
        fill="currentColor"
      />
    </svg>
  ),
  shield: (
    <svg viewBox="0 0 28 28" aria-hidden="true" focusable="false">
      <path d="M14 2.5 4 6.3v7.3c0 6.2 4.2 10.6 10 12.4 5.8-1.8 10-6.2 10-12.4V6.3L14 2.5Z" fill="currentColor" />
      <path
        className="trust__check"
        d="m9.2 14.2 3.3 3.3 6.4-6.8"
        stroke="#fffefa"
        strokeWidth="2.2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength="1"
      />
    </svg>
  ),
  users: (
    <svg viewBox="0 0 28 28" aria-hidden="true" focusable="false">
      <circle cx="14" cy="8.2" r="3.6" fill="currentColor" />
      <circle cx="6.6" cy="10.4" r="2.8" fill="currentColor" />
      <circle cx="21.4" cy="10.4" r="2.8" fill="currentColor" />
      <path d="M8 22.5c0-4 2.7-7.3 6-7.3s6 3.3 6 7.3H8Z" fill="currentColor" />
      <path d="M1.8 21.5c0-3.3 2-5.9 4.8-5.9 1.1 0 2.1.4 2.9 1.1-1.2 1.5-1.9 3.3-2.1 4.8H1.8Z" fill="currentColor" />
      <path d="M26.2 21.5c0-3.3-2-5.9-4.8-5.9-1.1 0-2.1.4-2.9 1.1 1.2 1.5 1.9 3.3 2.1 4.8h5.6Z" fill="currentColor" />
    </svg>
  ),
};

export function TrustStrip() {
  if (!trustItems.length) return null;

  return (
    <section className="trust" aria-label="Cam kết của Đinh Vân Booking">
      <LeafSprig className="trust__leaf trust__leaf--l" />
      <LeafSprig className="trust__leaf trust__leaf--r" />
      <ul className="trust__list">
        {trustItems.map((item, i) => (
          <li
            key={item.id}
            className={`trust__item trust__item--${item.icon}`}
            data-reveal="pop"
            style={{ '--d': `${1000 + i * 110}ms` } as React.CSSProperties}
          >
            <span className="trust__icon">{glyphs[item.icon]}</span>
            <span className="trust__text">
              {item.lines.map((l) => (
                <span key={l}>{l}</span>
              ))}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

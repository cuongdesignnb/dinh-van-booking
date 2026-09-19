import { siteConfig } from '@/config/site';

/** Mountain + forest mark. Kept as SVG so it stays crisp at any size. */
export function DinhVanMark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 36"
      width="64"
      height="36"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="dvb-mark-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2e6d3b" />
          <stop offset="1" stopColor="#153524" />
        </linearGradient>
      </defs>
      <path
        className="mark-peak"
        d="M1 32 L19 9 L25 16 L33 3 L50 26 L55 21 L63 32 Z"
        fill="url(#dvb-mark-g)"
      />
      <path
        d="M33 3 L29 10 L32 9 L34 12 L36 9 L38 11 Z M19 9 L16.5 13 L19 12.2 L21 14 Z"
        fill="#fffefa"
        opacity="0.9"
      />
      <path
        d="M6 32 C14 26 22 27 30 30 C38 33 46 28 58 29 L60 32 Z"
        fill="#8eaa79"
      />
      <g fill="#153524">
        <path d="M11 32 l3 -7 l3 7 Z" />
        <path d="M15 32 l2.4 -5.5 l2.4 5.5 Z" />
        <path d="M44 32 l2.6 -6 l2.6 6 Z" />
        <path d="M48 32 l2 -4.5 l2 4.5 Z" />
      </g>
    </svg>
  );
}

export function BrandLogo({ variant = 'header' }: { variant?: 'header' | 'footer' }) {
  return (
    <span className={`brand brand--${variant}`}>
      <DinhVanMark className="brand__mark" />
      <span className="brand__text">
        <span className="brand-wordmark">{siteConfig.name}</span>
        <span className="brand__tagline">{siteConfig.tagline}</span>
      </span>
    </span>
  );
}

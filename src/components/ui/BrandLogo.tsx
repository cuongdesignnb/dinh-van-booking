'use client';

import { useSiteData } from '@/components/site/SiteDataProvider';
import Image from '@/components/ui/ManagedImage';

/** Round mountain mark: deep green disc, white karst peaks and a river line. */
export function CucPhuongMark({ className, size = 52, onDark = false }: { className?: string; size?: number; onDark?: boolean }) {
  return (
    <svg className={className} viewBox="0 0 64 64" width={size} height={size} aria-hidden="true" focusable="false">
      <circle cx="32" cy="32" r="32" fill="#1f4d3a" />
      <circle cx="32" cy="32" r={onDark ? 30.5 : 28.5} fill="none" stroke="#fff" strokeOpacity={onDark ? 0.9 : 0.22} strokeWidth={onDark ? 2 : 1} />
      <path d="M9 42 21.5 24.5l6 7.5L37 18l18 24Z" fill="#fff" />
      <path d="M37 18 33.4 23.3l3.3-1.2 2.4 2.9 1.6-2.4Z M21.5 24.5l-3 4.2 2.6-.8 2 1.9Z" fill="#1f4d3a" fillOpacity="0.28" />
      <path d="M27.5 32 31 36.5l3.6-4.2L39 38" fill="none" stroke="#1f4d3a" strokeOpacity="0.35" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13 47.5c5.5-2.6 10.5-2.6 15.6-.6 5 2 10.4 2 16.4-.8 1.6-.7 3.2-1.1 5-1.2" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

export function BrandLogo({ variant = 'header' }: { variant?: 'header' | 'footer' | 'drawer' }) {
  const site = useSiteData();
  const logo = site.publicSite.media?.logo;
  if (!logo?.src && !site.name && !site.tagline) return null;
  return (
    <span className={`brand brand--${variant}`}>
      {logo?.src
        ? <Image className="brand__mark brand__mark--img" src={logo.src} alt={logo.alt ?? site.name} width={logo.width ?? 600} height={logo.height ?? 200} unoptimized />
        : <CucPhuongMark className="brand__mark" onDark={variant === 'footer'} />}
      <span className="brand__text">
        {site.name && <span className="brand__name">{site.name}</span>}
        {site.tagline && <span className="brand__tagline">{site.tagline}</span>}
      </span>
    </span>
  );
}

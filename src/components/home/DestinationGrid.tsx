import { ArrowRight } from 'lucide-react';
import Image from '@/components/ui/ManagedImage';
import Link from 'next/link';
import { SmallLeaf } from '@/components/ui/Decor';
import type { Destination } from '@/data/destinations';
import type { PublicRecord } from '@/lib/public-content';

export function DestinationGrid({ destinations, config }: { destinations: Destination[]; config: PublicRecord }) {
  const title = typeof config.title === 'string' ? config.title.trim() : '';
  const subtitle = typeof config.subtitle === 'string' ? config.subtitle.trim() : '';
  const ctaLabel = typeof config.ctaLabel === 'string' ? config.ctaLabel.trim() : '';
  const ctaTarget = typeof config.ctaTarget === 'string' ? config.ctaTarget.trim() : '';
  const limit = typeof config.limit === 'number' && config.limit > 0 ? Math.min(config.limit, 12) : 6;
  const visibleDestinations = destinations.slice(0, limit);
  if (config.enabled !== true || !title || !visibleDestinations.length) return null;
  return (
    <section className="explore" id="diem-den" aria-labelledby="explore-title">
      <div
        className="section-head section-head--tight"
        data-reveal="fade-up"
        style={{ '--d': '1700ms' } as React.CSSProperties}
      >
        <div>
          <h2 className="section-title" id="explore-title">
            {title} <SmallLeaf className="section-title__leaf" />
          </h2>
          {subtitle && <p className="section-sub">{subtitle}</p>}
        </div>
        {ctaLabel && ctaTarget && <Link href={ctaTarget} className="link-more">{ctaLabel} <ArrowRight size={15} strokeWidth={2} aria-hidden="true" /></Link>}
      </div>
      <ul className="destination-grid">
        {visibleDestinations.map((d, i) => (
          <li key={d.id} data-reveal="card" style={{ '--d': `${1800 + i * 90}ms` } as React.CSSProperties}>
            <Link href={d.publicPath ?? (d.slug ? `/diem-den/${d.slug}` : '/diem-den')} className="dest">
              <span className="dest__media">
                <Image
                  src={(d.homeImage ?? d.image).src}
                  alt={(d.homeImage ?? d.image).alt}
                  fill
                  sizes="(max-width: 767px) 46vw, 176px"
                  className="dest__img"
                />
              </span>
              <span className="dest__name">{d.name}</span>
              <span className="dest__sub">{d.subtitle}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

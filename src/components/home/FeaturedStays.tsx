import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { SmallLeaf } from '@/components/ui/Decor';
import type { Stay } from '@/data/stays';
import { StayCard } from './StayCard';
import type { PublicRecord } from '@/lib/public-content';
import type { ReactNode } from 'react';

export function FeaturedStays({ stays, config, promo = null }: { stays: Stay[]; config: PublicRecord; promo?: ReactNode }) {
  const title = typeof config.title === 'string' ? config.title.trim() : '';
  const subtitle = typeof config.subtitle === 'string' ? config.subtitle.trim() : '';
  const ctaLabel = typeof config.ctaLabel === 'string' ? config.ctaLabel.trim() : '';
  const ctaTarget = typeof config.ctaTarget === 'string' ? config.ctaTarget.trim() : '';
  const limit = typeof config.limit === 'number' && config.limit > 0 ? Math.min(config.limit, 12) : 6;
  const visibleStays = stays.slice(0, limit);
  const showMain = config.enabled === true && !!title && visibleStays.length > 0;
  if (!showMain && !promo) return null;
  return (
    <section className={`featured content-shell${showMain ? '' : ' featured--promo-only'}${promo ? '' : ' featured--main-only'}`} id={showMain ? 'phong-nghi' : undefined} aria-labelledby={showMain ? 'featured-title' : undefined}>
      {showMain && <div className="featured__main">
        <div className="section-head" data-reveal="fade-up" style={{ '--d': '1100ms' } as React.CSSProperties}>
          <div>
            <h2 className="section-title" id="featured-title">
              {title} <SmallLeaf className="section-title__leaf" />
            </h2>
            {subtitle && <p className="section-sub">{subtitle}</p>}
          </div>
          {ctaLabel && ctaTarget && <Link href={ctaTarget} className="link-more">{ctaLabel} <ArrowRight size={15} strokeWidth={2} aria-hidden="true" /></Link>}
        </div>
        <div className="stay-grid" data-count={visibleStays.length}>
          {visibleStays.map((s, i) => (
            <StayCard key={s.id} stay={s} index={i} wide={visibleStays.length === 1} />
          ))}
        </div>
      </div>}
      {promo}
    </section>
  );
}

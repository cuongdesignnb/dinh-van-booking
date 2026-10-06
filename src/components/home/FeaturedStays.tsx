import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import type { Stay } from '@/data/stays';
import type { PublicRecord } from '@/lib/public-content';
import { publicText } from '@/lib/public-content';
import { SectionLeaf } from './HomeArt';
import { StayCard } from './StayCard';

export function FeaturedStays({ stays, config }: { stays: Stay[]; config: PublicRecord }) {
  const title = publicText(config.title);
  const subtitle = publicText(config.subtitle);
  const ctaLabel = publicText(config.ctaLabel);
  const ctaTarget = publicText(config.ctaTarget);
  const limit = typeof config.limit === 'number' && config.limit > 0 ? Math.min(config.limit, 12) : 4;
  const visible = stays.slice(0, limit);
  if (config.enabled !== true || !title || !visible.length) return null;
  return (
    <section className="hf cp-shell" id="noi-bat" aria-labelledby="featured-title">
      <div className="cp-head">
        <div className="cp-head__title">
          <SectionLeaf className="cp-head__icon" />
          <div>
            <h2 id="featured-title">{title}</h2>
            {subtitle && <p className="cp-head__sub">{subtitle}</p>}
          </div>
        </div>
        {ctaLabel && ctaTarget && <Link href={ctaTarget} className="link-more">{ctaLabel} <ArrowRight size={17} strokeWidth={2.2} aria-hidden="true" /></Link>}
      </div>
      <div className="hf__row" data-count={visible.length}>
        {visible.map((stay) => <StayCard key={stay.id} stay={stay} />)}
      </div>
    </section>
  );
}

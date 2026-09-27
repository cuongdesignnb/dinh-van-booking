import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { Combo } from '@/data/combos';
import type { PublicRecord } from '@/lib/public-content';

export function HomeCombos({ combos, config }: { combos: Combo[]; config: PublicRecord }) {
  const title = typeof config.title === 'string' ? config.title.trim() : '';
  const subtitle = typeof config.subtitle === 'string' ? config.subtitle.trim() : '';
  const ctaLabel = typeof config.ctaLabel === 'string' ? config.ctaLabel.trim() : '';
  const ctaTarget = typeof config.ctaTarget === 'string' ? config.ctaTarget.trim() : '';
  const limit = typeof config.limit === 'number' && config.limit > 0 ? Math.min(config.limit, 12) : 3;
  const items = combos.slice(0, limit);
  if (config.enabled !== true || !title || !items.length) return null;
  return (
    <section className="home-combos content-shell" aria-labelledby="home-combos-title">
      <div className="section-head">
        <div>
          <h2 className="section-title" id="home-combos-title">{title}</h2>
          {subtitle && <p className="section-sub">{subtitle}</p>}
        </div>
        {ctaLabel && ctaTarget && <Link href={ctaTarget} className="link-more">{ctaLabel}<ArrowRight size={15} aria-hidden="true" /></Link>}
      </div>
      <ul className="home-combos__grid">
        {items.map((combo) => (
          <li key={combo.id}>
            <Link className="home-combos__card" href={combo.publicPath ?? `/combo-du-lich/${combo.slug}`}>
              <span className="home-combos__media"><Image src={combo.image.src} alt={combo.image.alt} fill sizes="(max-width: 767px) 100vw, 33vw" unoptimized /></span>
              <span className="home-combos__copy"><strong>{combo.title}</strong>{combo.subtitle && <span>{combo.subtitle}</span>}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

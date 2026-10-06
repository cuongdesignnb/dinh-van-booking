import { ArrowRight, MapPin } from 'lucide-react';
import Image from '@/components/ui/ManagedImage';
import Link from 'next/link';
import type { Destination } from '@/data/destinations';
import type { PublicRecord } from '@/lib/public-content';
import { publicText } from '@/lib/public-content';
import { SectionLeaf } from './HomeArt';

export function DestinationGrid({ destinations, config }: { destinations: Destination[]; config: PublicRecord }) {
  const title = publicText(config.title);
  const subtitle = publicText(config.subtitle);
  const ctaLabel = publicText(config.ctaLabel);
  const ctaTarget = publicText(config.ctaTarget);
  const limit = typeof config.limit === 'number' && config.limit > 0 ? Math.min(config.limit, 12) : 4;
  const items = destinations.slice(0, limit);
  if (config.enabled !== true || !title || !items.length) return null;
  return (
    <section className="hx cp-shell" id="diem-den" aria-labelledby="explore-title">
      <div className="cp-head">
        <div className="cp-head__title">
          <SectionLeaf className="cp-head__icon" />
          <div><h2 id="explore-title">{title}</h2>{subtitle && <p className="cp-head__sub">{subtitle}</p>}</div>
        </div>
        {ctaLabel && ctaTarget && <Link href={ctaTarget} className="link-more">{ctaLabel} <ArrowRight size={17} aria-hidden="true" /></Link>}
      </div>
      <ul className="hx__grid hx__grid--four">
        {items.map((d) => {
          const image = d.homeImage ?? d.image;
          return (
            <li key={d.id}>
              <Link href={d.publicPath ?? (d.slug ? `/diem-den/${d.slug}` : '/diem-den')} className="hx__card">
                <span className="hx__media"><Image src={image.src} alt={image.alt} fill sizes="(max-width: 767px) 100vw, 320px" /></span>
                <span className="hx__body">
                  <strong className="hx__name">{d.name}</strong>
                  {d.subtitle && <span className="hx__meta"><MapPin size={15} aria-hidden="true" />{d.subtitle}</span>}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

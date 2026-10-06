import Image from '@/components/ui/ManagedImage';
import Link from 'next/link';
import { ArrowRight, CalendarDays } from 'lucide-react';
import type { Combo } from '@/data/combos';
import type { PublicRecord } from '@/lib/public-content';
import { publicText } from '@/lib/public-content';
import { formatVnd } from '@/lib/format';
import { SectionLeaf } from './HomeArt';

export function HomeCombos({ combos, config }: { combos: Combo[]; config: PublicRecord }) {
  const title = publicText(config.title);
  const subtitle = publicText(config.subtitle);
  const ctaLabel = publicText(config.ctaLabel);
  const ctaTarget = publicText(config.ctaTarget);
  const limit = typeof config.limit === 'number' && config.limit > 0 ? Math.min(config.limit, 12) : 3;
  const items = combos.slice(0, limit);
  if (config.enabled !== true || !title || !items.length) return null;
  return (
    <section className="hx cp-shell" aria-labelledby="home-combos-title">
      <div className="cp-head">
        <div className="cp-head__title">
          <SectionLeaf className="cp-head__icon" />
          <div><h2 id="home-combos-title">{title}</h2>{subtitle && <p className="cp-head__sub">{subtitle}</p>}</div>
        </div>
        {ctaLabel && ctaTarget && <Link href={ctaTarget} className="link-more">{ctaLabel} <ArrowRight size={17} aria-hidden="true" /></Link>}
      </div>
      <ul className="hx__grid">
        {items.map((combo) => (
          <li key={combo.id}>
            <Link className="hx__card" href={combo.publicPath ?? `/combo-du-lich/${combo.slug}`}>
              <span className="hx__media"><Image src={combo.image.src} alt={combo.image.alt} fill sizes="(max-width: 767px) 100vw, 420px" unoptimized /></span>
              <span className="hx__body">
                {(combo.durationDays > 0 || combo.durationNights > 0) && <span className="hx__meta"><CalendarDays size={15} aria-hidden="true" />{[combo.durationDays > 0 ? `${combo.durationDays} ngày` : '', combo.durationNights > 0 ? `${combo.durationNights} đêm` : ''].filter(Boolean).join(' ')}</span>}
                <strong className="hx__name">{combo.title}</strong>
                {combo.subtitle && <span className="hx__text">{combo.subtitle}</span>}
                {combo.fromPriceVnd != null && combo.fromPriceVnd > 0 && <span className="hx__price">Từ <strong>{formatVnd(combo.fromPriceVnd)}</strong>{combo.priceUnit && <> / {combo.priceUnit}</>}</span>}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

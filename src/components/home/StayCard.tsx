import { ArrowRight, Star } from 'lucide-react';
import Image from '@/components/ui/ManagedImage';
import Link from 'next/link';
import { FavoriteButton } from '@/components/ui/FavoriteButton';
import type { Stay } from '@/data/stays';
import { fromPrice } from '@/lib/catalog/pricing';
import { formatVnd } from '@/lib/format';

const PinCheck = () => (
  <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false" className="stay__meta-icon">
    <circle cx="8" cy="8" r="7" fill="currentColor" />
    <path d="m4.8 8.2 2.2 2.2 4.2-4.4" stroke="#fff" strokeWidth="1.7" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const Sprig = () => (
  <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false" className="stay__meta-icon">
    <path d="M13.8 2.2C8 2 3.6 5 3.2 10.2c0 .8 0 1.6.2 2.4.7-2.4 2.4-4.4 4.9-5.6-2 1.5-3.3 3.5-3.8 5.9.8.3 1.7.4 2.5.4 4.8-.4 7-5 6.8-11.1Z" fill="currentColor" />
    <path d="M2 14.5c.9-2.8 2.5-5 5-6.8" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" />
  </svg>
);

export function StayCard({ stay, index }: { stay: Stay; index: number }) {
  const home = stay.home ?? { image: stay.image, location: stay.location, tags: [stay.highlights[0], stay.highlights[1]] };
  return (
    <article
      className="stay"
      data-reveal="card"
      data-tilt
      style={{ '--d': `${1200 + index * 120}ms` } as React.CSSProperties}
      aria-labelledby={`${stay.id}-name`}
    >
      <div className="stay__media">
        <Image
          src={home.image.src}
          alt={home.image.alt}
          fill
          sizes="(max-width: 767px) 92vw, 255px"
          className="stay__img"
          style={home.image.position ? { objectPosition: home.image.position } : undefined}
        />
        {stay.badge && <span className="stay__badge">{stay.badge}</span>}
        <FavoriteButton id={stay.id} name={stay.name} />
      </div>
      <div className="stay__body">
        <h3 className="stay__name" id={`${stay.id}-name`}><Link href={`/phong-nghi/${stay.slug}`}>{stay.name}</Link></h3>
        {stay.reviewCount > 0 && <p className="stay__rating"><Star size={14} className="star" aria-hidden="true" /><strong>{stay.rating.toFixed(1)}</strong><span>({stay.reviewCount} đánh giá)</span></p>}
        <p className="stay__meta">
          <PinCheck />
          {home.location}
        </p>
        <p className="stay__meta stay__meta--tags">
          {home.tags.length > 0 && <Sprig />}
          {home.tags.map((tag, index) => <span key={`${tag}-${index}`}>{index > 0 && <i aria-hidden="true">•</i>}{tag}</span>)}
        </p>
        <div className="stay__foot">
          <p className="stay__price">{fromPrice(stay) > 0 ? <>Từ <strong>{formatVnd(fromPrice(stay))}</strong> <span>/ đêm</span></> : <strong>Liên hệ để nhận giá</strong>}</p>
          <Link href={fromPrice(stay) > 0 ? `/phong-nghi/${stay.slug}` : '/lien-he'} className="btn btn--primary btn--sm btn-arrow">
            {fromPrice(stay) > 0 ? 'Xem chi tiết' : 'Liên hệ'} <ArrowRight size={14} strokeWidth={2.3} aria-hidden="true" />
            <span className="sr-only"> {stay.name}</span>
          </Link>
        </div>
      </div>
    </article>
  );
}

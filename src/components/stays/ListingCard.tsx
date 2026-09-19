import { ArrowRight, MapPin, Star } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { AmenityIcon } from '@/components/shared/AmenityIcon';
import { FavoriteButton } from '@/components/ui/FavoriteButton';
import { fromPrice, type Stay } from '@/data/stays';
import { formatRating, formatVnd } from '@/lib/format';

/**
 * Listing card (grid) and row (list). The name and CTA are the only links;
 * the heart is a sibling button, so nothing interactive is nested.
 */
export function ListingCard({
  stay,
  query,
  variant = 'grid',
  index = 0,
}: {
  stay: Stay;
  query: string;
  variant?: 'grid' | 'list';
  index?: number;
}) {
  const href = `/phong-nghi/${stay.slug}${query ? `?${query}` : ''}`;
  return (
    <article
      className={`lcard lcard--${variant}`}
      aria-labelledby={`${stay.id}-t`}
      data-tilt={variant === 'grid' || undefined}
      data-reveal="card"
      style={{ '--d': `${index * 60}ms` } as React.CSSProperties}
    >
      <div className="lcard__media">
        <Image
          src={stay.image.src}
          alt={stay.image.alt}
          fill
          sizes={variant === 'grid' ? '(max-width: 767px) 92vw, (max-width: 1279px) 30vw, 206px' : '240px'}
          className="lcard__img"
        />
        {stay.badge && <span className="lcard__badge">{stay.badge}</span>}
        <FavoriteButton id={stay.id} name={stay.name} className="fav lcard__fav" />
      </div>
      <div className="lcard__body">
        <h3 className="lcard__name" id={`${stay.id}-t`} title={stay.name}>
          <Link href={href}>{stay.name}</Link>
        </h3>
        <p className="lcard__rating">
          <Star size={13} className="star" aria-hidden="true" />
          <strong>{formatRating(stay.rating)}</strong>
          <span>({stay.reviewCount} đánh giá)</span>
        </p>
        <p className="lcard__loc">
          <MapPin size={12} aria-hidden="true" />
          {stay.location}
        </p>
        <ul className="lcard__feat" aria-label="Tiện ích nổi bật">
          {stay.cardFeatures.map((f) => (
            <li key={f.label}>
              <AmenityIcon id={f.icon} size={13} />
              {f.label}
            </li>
          ))}
        </ul>
        <p className="lcard__sum">{stay.cardSummary}</p>
        <div className="lcard__foot">
          <p className="lcard__price">
            Từ <strong>{formatVnd(fromPrice(stay))}</strong> <span>/ đêm</span>
          </p>
          <Link href={href} className="btn btn--primary btn--sm btn-arrow">
            Xem chi tiết <ArrowRight size={13} strokeWidth={2.3} aria-hidden="true" />
            <span className="sr-only"> {stay.name}</span>
          </Link>
        </div>
      </div>
    </article>
  );
}

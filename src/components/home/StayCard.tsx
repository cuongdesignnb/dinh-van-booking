import { MapPin, Star, UsersRound } from 'lucide-react';
import Image from '@/components/ui/ManagedImage';
import Link from 'next/link';
import { FavoriteButton } from '@/components/ui/FavoriteButton';
import type { Stay } from '@/data/stays';
import { fromPrice, hasContactOnlyRooms } from '@/lib/catalog/pricing';
import { stayContactHref } from '@/lib/contact/stay-contact';
import { formatRating, formatVnd } from '@/lib/format';
import { AvailabilityBadge } from '@/components/shared/AvailabilityBadge';

/** Guest range across published room types, e.g. "2 - 6 khách". */
function guestRange(stay: Stay): string | null {
  const capacities = stay.roomTypes.map((room) => room.capacity).filter((value) => Number.isFinite(value) && value > 0);
  if (!capacities.length) return null;
  const min = Math.min(...capacities);
  const max = Math.max(...capacities);
  return min === max ? `${max} khách` : `${min} - ${max} khách`;
}

/**
 * One card for the homepage and /phong-nghi. Every line is optional and only
 * rendered from real published fields; nothing is filled in when missing.
 */
export function StayCard({ stay, query = '', contactHref, headingLevel = 3, priority = false }: {
  stay: Stay;
  query?: string;
  contactHref?: string;
  headingLevel?: 2 | 3;
  priority?: boolean;
}) {
  const image = stay.home?.image ?? stay.image;
  const href = `/phong-nghi/${stay.slug}${query ? `?${query}` : ''}`;
  const price = fromPrice(stay);
  const distinctPrices = new Set(stay.roomTypes.map((room) => room.pricePerNight).filter((value) => value > 0)).size;
  const guests = guestRange(stay);
  const summary = (stay.cardSummary || stay.tagline || '').trim();
  const location = (stay.home?.location || stay.location || '').trim();
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  const rated = stay.reviewCount > 0 && stay.rating > 0;
  return (
    <article className="sc" aria-labelledby={`${stay.id}-name`}>
      <div className="sc__media">
        <Image src={image.src} alt={image.alt} fill priority={priority} sizes="(max-width: 767px) 82vw, (max-width: 1199px) 45vw, 320px" className="sc__img" style={image.position ? { objectPosition: image.position } : undefined} />
        <AvailabilityBadge status={stay.availabilityStatus} className="sc__status" />
        <FavoriteButton id={stay.id} name={stay.name} className="sc__fav" />
        {rated && <p className="sc__rating" aria-label={`Đánh giá ${formatRating(stay.rating)} trên 5 từ ${stay.reviewCount} lượt`}>
          <Star size={14} aria-hidden="true" />
          <span aria-hidden="true"><strong>{formatRating(stay.rating)}</strong> ({stay.reviewCount})</span>
        </p>}
      </div>
      <div className="sc__body">
        <Heading className="sc__name" id={`${stay.id}-name`}>
          <Link href={price > 0 ? href : (contactHref ?? stayContactHref(stay.slug))} className="sc__link">{stay.name}</Link>
        </Heading>
        {summary && <p className="sc__summary">{summary}</p>}
        {(guests || location) && <ul className="sc__facts">
          {guests && <li><UsersRound size={16} aria-hidden="true" />{guests}</li>}
          {location && <li><MapPin size={16} aria-hidden="true" />{location}</li>}
        </ul>}
        <p className="sc__price">
          {price > 0
            ? <>{distinctPrices > 1 && <span className="sc__from">Từ </span>}<strong>{formatVnd(price)}</strong> <span className="sc__unit">/ đêm</span></>
            : <strong className="sc__contact">Liên hệ để nhận giá</strong>}
          {price > 0 && hasContactOnlyRooms(stay) && <small>Một số hạng phòng cần liên hệ giá</small>}
        </p>
      </div>
    </article>
  );
}

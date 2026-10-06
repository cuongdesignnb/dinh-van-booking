'use client';

import { ArrowRight, MessageSquareQuote, Star } from 'lucide-react';
import Image from '@/components/ui/ManagedImage';
import type { Review } from '@/data/types';
import { openDialog } from '@/lib/events';
import type { PublicRecord } from '@/lib/public-content';
import { publicText } from '@/lib/public-content';

const formatDate = (value?: string) => {
  const match = /^(\d{4})-(\d{2})/.exec(value ?? '');
  return match ? `Tháng ${Number(match[2])}/${match[1]}` : '';
};

/** Published reviews only; the whole block is hidden when there are none. */
export function Testimonials({ testimonials, config }: { testimonials: Review[]; config: PublicRecord }) {
  const title = publicText(config.title);
  const ctaLabel = publicText(config.ctaLabel);
  const limit = typeof config.limit === 'number' && config.limit > 0 ? Math.min(config.limit, 6) : 2;
  const visible = testimonials.slice(0, limit);
  if (config.enabled !== true || !title || !visible.length) return null;
  return (
    <section className="ht" aria-labelledby="reviews-title">
      <div className="ht__head">
        <h2 id="reviews-title" className="ht__title"><MessageSquareQuote size={24} strokeWidth={1.9} aria-hidden="true" />{title}</h2>
        {ctaLabel && testimonials.length > visible.length && <button type="button" className="link-more" aria-haspopup="dialog" onClick={() => openDialog({ type: 'reviews', title, items: testimonials.map(({ id, author, quote, context, rating }) => ({ id, author, quote, context, rating })) })}>{ctaLabel} <ArrowRight size={16} aria-hidden="true" /></button>}
      </div>
      <ul className="ht__list">
        {visible.map((review) => {
          const meta = [review.context, formatDate(review.date)].filter(Boolean).join(' · ');
          const stars = Math.max(0, Math.min(5, Math.round(review.rating)));
          return (
            <li key={review.id} className="ht__card">
              <span className="ht__avatar" aria-hidden="true">
                {review.avatar ? <Image src={review.avatar.src} alt="" width={64} height={64} /> : review.author.trim().charAt(0).toUpperCase()}
              </span>
              <figure className="ht__body">
                <blockquote>“{review.quote}”</blockquote>
                <figcaption>
                  <span className="ht__who"><strong>{review.author}</strong>{meta && <small>{meta}</small>}</span>
                  {stars > 0 && <span className="ht__stars" role="img" aria-label={`${stars} trên 5 sao`}>
                    {Array.from({ length: stars }, (_, index) => <Star key={index} size={15} aria-hidden="true" />)}
                  </span>}
                </figcaption>
              </figure>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

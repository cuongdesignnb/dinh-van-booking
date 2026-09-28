'use client';

import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import Image from '@/components/ui/ManagedImage';
import { useState } from 'react';
import type { ImageAsset } from '@/data/types';
import { openDialog } from '@/lib/events';
import type { PublicRecord } from '@/lib/public-content';

type Testimonial = { id: string; quote: string; author: string; context?: string; avatar: ImageAsset | null };

export function Testimonials({ testimonials, config }: { testimonials: Testimonial[]; config: PublicRecord }) {
  const title = typeof config.title === 'string' ? config.title.trim() : '';
  const ctaLabel = typeof config.ctaLabel === 'string' ? config.ctaLabel.trim() : '';
  const limit = typeof config.limit === 'number' && config.limit > 0 ? Math.min(config.limit, 20) : 3;
  const visible = testimonials.slice(0, limit);
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState<'next' | 'prev'>('next');
  const t = visible[index] ?? null;
  const go = (delta: number) => {
    if (!visible.length) return;
    setDir(delta > 0 ? 'next' : 'prev');
    setIndex((i) => (i + delta + visible.length) % visible.length);
  };

  if (config.enabled !== true || !title || !visible.length) return null;

  return (
    <section className="reviews" aria-labelledby="reviews-title" aria-roledescription="carousel">
      <div className="section-head section-head--tight" data-reveal="fade-up" style={{ '--d': '1500ms' } as React.CSSProperties}>
        <h2 className="section-title section-title--sm" id="reviews-title">{title}</h2>
        {ctaLabel && <button type="button" className="link-more" aria-haspopup="dialog" onClick={() => openDialog({ type: 'reviews' })}>{ctaLabel} <ArrowRight size={15} strokeWidth={2} aria-hidden="true" /></button>}
      </div>
      {t ? (
        <div className="review-card" data-reveal="card" style={{ '--d': '1600ms' } as React.CSSProperties}>
          <button type="button" className="icon-btn review-card__nav" onClick={() => go(-1)} aria-label="Nhận xét trước">
            <ChevronLeft size={17} aria-hidden="true" />
          </button>
          <div key={t.id} className="review-card__slide" data-dir={dir} role="group" aria-roledescription="slide" aria-label={`${index + 1} / ${visible.length}`} aria-live="polite">
            <span className="review-card__avatar">
              {t.avatar ? <Image src={t.avatar.src} alt={t.avatar.alt} width={62} height={62} /> : <span className="review-card__initial" aria-hidden="true">{(t.context ?? t.author).charAt(0)}</span>}
            </span>
            <div className="review-card__body">
              <blockquote className="review-card__quote">“{t.quote}”</blockquote>
              <p className="review-card__author">{t.author}</p>
              {t.context && <p className="review-card__context">{t.context}</p>}
            </div>
          </div>
          <div className="review-card__dots">
            {visible.map((x, i) => (
              <button key={x.id} type="button" className="dot-btn" aria-label={`Xem nhận xét ${i + 1}`} aria-current={i === index ? 'true' : undefined} onClick={() => { setDir(i > index ? 'next' : 'prev'); setIndex(i); }} />
            ))}
          </div>
          <button type="button" className="icon-btn review-card__nav" onClick={() => go(1)} aria-label="Nhận xét tiếp theo">
            <ChevronRight size={17} aria-hidden="true" />
          </button>
        </div>
      ) : null}
    </section>
  );
}

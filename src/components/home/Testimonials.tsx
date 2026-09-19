'use client';

import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';
import { testimonials } from '@/data/home-fixtures';
import { openDialog } from '@/lib/events';

export function Testimonials() {
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState<'next' | 'prev'>('next');
  const t = testimonials[index];
  const go = (delta: number) => {
    setDir(delta > 0 ? 'next' : 'prev');
    setIndex((i) => (i + delta + testimonials.length) % testimonials.length);
  };

  return (
    <section className="reviews" aria-labelledby="reviews-title" aria-roledescription="carousel">
      <div
        className="section-head section-head--tight"
        data-reveal="fade-up"
        style={{ '--d': '1500ms' } as React.CSSProperties}
      >
        <h2 className="section-title section-title--sm" id="reviews-title">
          Khách hàng nói về Đinh Vân Booking
        </h2>
        <button
          type="button"
          className="link-more"
          aria-haspopup="dialog"
          onClick={() => openDialog({ type: 'reviews' })}
        >
          Xem thêm <ArrowRight size={15} strokeWidth={2} aria-hidden="true" />
        </button>
      </div>
      <div className="review-card" data-reveal="card" style={{ '--d': '1600ms' } as React.CSSProperties}>
        <button type="button" className="icon-btn review-card__nav" onClick={() => go(-1)} aria-label="Nhận xét trước">
          <ChevronLeft size={17} aria-hidden="true" />
        </button>
        <div
          key={t.id}
          className="review-card__slide"
          data-dir={dir}
          role="group"
          aria-roledescription="slide"
          aria-label={`${index + 1} / ${testimonials.length}`}
          aria-live="polite"
        >
          <span className="review-card__avatar">
            {t.avatar ? (
              <Image src={t.avatar} alt="" width={62} height={62} />
            ) : (
              <span className="review-card__initial" aria-hidden="true">
                {t.context.charAt(0)}
              </span>
            )}
          </span>
          <div className="review-card__body">
            <blockquote className="review-card__quote">“{t.quote}”</blockquote>
            <p className="review-card__author">{t.author}</p>
            <p className="review-card__context">{t.context}</p>
          </div>
        </div>
        <div className="review-card__dots">
          {testimonials.map((x, i) => (
            <button
              key={x.id}
              type="button"
              className="dot-btn"
              aria-label={`Xem nhận xét ${i + 1}`}
              aria-current={i === index ? 'true' : undefined}
              onClick={() => {
                setDir(i > index ? 'next' : 'prev');
                setIndex(i);
              }}
            />
          ))}
        </div>
        <button
          type="button"
          className="icon-btn review-card__nav"
          onClick={() => go(1)}
          aria-label="Nhận xét tiếp theo"
        >
          <ChevronRight size={17} aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}

'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import Image from '@/components/ui/ManagedImage';
import { useState } from 'react';
import type { Review } from '@/data/types';
import { Stars } from './Stars';

/** A window of review cards with its own prev/next (independent of result paging). */
export function ReviewsStrip({ reviews, perPage = 3, className = '' }: { reviews: Review[]; perPage?: number; className?: string }) {
  const [start, setStart] = useState(0);
  const [dir, setDir] = useState<'next' | 'prev'>('next');
  const max = Math.max(0, reviews.length - perPage);
  const shown = reviews.slice(start, start + perPage);
  const go = (delta: number) => {
    setDir(delta > 0 ? 'next' : 'prev');
    setStart((s) => Math.min(max, Math.max(0, s + delta)));
  };
  return (
    <div className={`rstrip ${className}`}>
      <ul className="rstrip__list" data-dir={dir} key={start} aria-live="polite">
        {shown.map((r) => (
          <li key={r.id} className="rcard">
            <span className="rcard__avatar">
              {r.avatar ? (
                <Image src={r.avatar.src} alt="" width={46} height={46} />
              ) : (
                <span aria-hidden="true">{r.author.charAt(0)}</span>
              )}
            </span>
            <div className="rcard__body">
              <blockquote className="rcard__quote">“{r.quote}”</blockquote>
              <p className="rcard__author">{r.author}</p>
              <p className="rcard__rating">
                <Stars value={r.rating} size={11} />
                <span className="sr-only">Đánh giá </span>
                {r.rating.toFixed(1)}
              </p>
            </div>
          </li>
        ))}
      </ul>
      <div className="rstrip__nav">
        <button type="button" className="round-btn" onClick={() => go(-1)} disabled={start === 0} aria-label="Nhận xét trước">
          <ChevronLeft size={16} aria-hidden="true" />
        </button>
        <button type="button" className="round-btn" onClick={() => go(1)} disabled={start >= max} aria-label="Nhận xét tiếp theo">
          <ChevronRight size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

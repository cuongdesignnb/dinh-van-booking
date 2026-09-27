'use client';

import { ArrowRight } from 'lucide-react';
import Image from 'next/image';
import { useId, useState } from 'react';
import { Stars } from '@/components/shared/Stars';
import { Modal } from '@/components/ui/Modal';
import type { Review } from '@/data/types';

export function ComboReviews({ reviews, title }: { reviews: Review[]; title: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  if (!reviews.length || !title) return null;
  const card = (r: Review) => (
    <li key={r.id} className="creview">
      {r.avatar && <Image src={r.avatar.src} alt="" width={55} height={55} className="creview__avatar" />}
      <div>
        <blockquote className="creview__quote">“{r.quote}”</blockquote>
        <p className="creview__by">
          <Stars value={r.rating} size={13} />
          <span className="sr-only">{r.rating} trên 5 sao — </span>
          <strong>{r.author}</strong>
        </p>
        {r.context && <p className="creview__ctx">{r.context}</p>}
      </div>
    </li>
  );
  return (
    <section className="combo-reviews" aria-labelledby={`${id}-t`}>
      <div className="combo-reviews__head">
        <h2 id={`${id}-t`}>{title}</h2>
        <button type="button" className="link-more" aria-haspopup="dialog" onClick={() => setOpen(true)}>
          Xem tất cả <ArrowRight size={14} aria-hidden="true" />
        </button>
      </div>
      <ul className="combo-reviews__list">{reviews.map(card)}</ul>
      <Modal open={open} onClose={() => setOpen(false)} labelledBy={`${id}-d`}>
        <h2 id={`${id}-d`} className="dialog__title">{title}</h2>
        <ul className="combo-reviews__all">{reviews.map(card)}</ul>
      </Modal>
    </section>
  );
}

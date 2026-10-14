'use client';

import { ArrowRight, BadgeCheck, MessageSquareReply, PenLine, Star } from 'lucide-react';
import { useEffect, useId, useMemo, useState } from 'react';
import Image from '@/components/ui/ManagedImage';
import { Modal } from '@/components/ui/Modal';
import type { ImageAsset, Review } from '@/data/types';
import { GalleryDialog } from './PropertyGallery';
import { ReviewForm } from './ReviewForm';

const PREVIEW = 4;

function Stars({ value, size = 15 }: { value: number; size?: number }) {
  return (
    <span className="srev-stars" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star key={star} size={size} data-on={star <= Math.round(value) || undefined} />
      ))}
    </span>
  );
}

function when(review: Review): string {
  if (review.date) {
    const [year, month] = review.date.split('-');
    return `Lưu trú ${month}/${year}`;
  }
  if (review.createdAt) return new Date(review.createdAt).toLocaleDateString('vi-VN');
  return '';
}

function ReviewCard({ review, onPhoto }: { review: Review; onPhoto: (photos: ImageAsset[], index: number) => void }) {
  const photos = review.photos ?? [];
  return (
    <article className="srev-card">
      <header className="srev-card__head">
        <span className="srev-card__avatar" aria-hidden="true">{review.author.trim().slice(0, 1).toUpperCase()}</span>
        <div>
          <p className="srev-card__name">
            {review.author}
            {review.verified && <span className="srev-card__verified"><BadgeCheck size={14} aria-hidden="true" /> Đã đặt qua website</span>}
          </p>
          <p className="srev-card__meta">
            <Stars value={review.rating} size={13} />
            <span className="sr-only">{review.rating} trên 5 sao</span>
            {when(review) && <span>{when(review)}</span>}
          </p>
        </div>
      </header>
      <p className="srev-card__body">{review.quote}</p>
      {photos.length > 0 && (
        <ul className="srev-card__photos">
          {photos.map((photo, index) => (
            <li key={photo.src}>
              <button type="button" onClick={() => onPhoto(photos, index)} aria-label={`Xem ảnh ${index + 1} của ${review.author}`}>
                <Image src={photo.src} alt={photo.alt} fill sizes="88px" unoptimized />
              </button>
            </li>
          ))}
        </ul>
      )}
      {review.ownerReply && (
        <div className="srev-card__reply">
          <p className="srev-card__reply-title"><MessageSquareReply size={14} aria-hidden="true" /> Phản hồi từ chủ nhà</p>
          <p>{review.ownerReply}</p>
        </div>
      )}
    </article>
  );
}

/** Stay page reviews: summary, distribution, cards with photos and owner replies, and the write form. */
export function StayReviews({ reviews, rating, count, title, stayName, slug }: {
  reviews: Review[];
  rating: number;
  count: number;
  title?: string;
  stayName: string;
  slug: string;
}) {
  const uid = useId();
  const [formOpen, setFormOpen] = useState(false);
  const [source, setSource] = useState<'website' | 'invite'>('website');
  const [allOpen, setAllOpen] = useState(false);
  const [sort, setSort] = useState<'new' | 'high' | 'low' | 'photos'>('new');
  const [gallery, setGallery] = useState<{ photos: ImageAsset[]; index: number | null }>({ photos: [], index: null });

  // Review-request links (?danh-gia=1&nguon=loi-moi) open the form straight away.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('nguon') === 'loi-moi') setSource('invite');
    if (params.get('danh-gia') === '1') {
      setFormOpen(true);
      document.getElementById('danh-gia')?.scrollIntoView({ block: 'start' });
    }
  }, []);

  const distribution = useMemo(() => [5, 4, 3, 2, 1].map((star) => ({ star, total: reviews.filter((review) => review.rating === star).length })), [reviews]);
  const sorted = useMemo(() => {
    const list = [...reviews];
    if (sort === 'high') list.sort((a, b) => b.rating - a.rating);
    else if (sort === 'low') list.sort((a, b) => a.rating - b.rating);
    else if (sort === 'photos') list.sort((a, b) => (b.photos?.length ?? 0) - (a.photos?.length ?? 0));
    return list;
  }, [reviews, sort]);
  const openPhoto = (photos: ImageAsset[], index: number) => setGallery({ photos, index });
  const total = Math.max(count, reviews.length);

  return (
    <section className="stp-section srev" id="danh-gia" aria-labelledby={`${uid}-t`}>
      <div className="srev__head">
        <h2 className="stp-h2" id={`${uid}-t`} tabIndex={-1}>{title || 'Đánh giá của khách'}</h2>
        <button type="button" className="btn btn--outline srev__write" onClick={() => setFormOpen(true)}>
          <PenLine size={16} aria-hidden="true" /> Viết đánh giá
        </button>
      </div>

      {total > 0 ? (
        <>
          <div className="srev__summary">
            <div className="srev__score">
              <strong>{rating.toFixed(1)}</strong>
              <Stars value={rating} size={18} />
              <span>{total} đánh giá</span>
            </div>
            <ul className="srev__bars" aria-label="Phân bố số sao">
              {distribution.map(({ star, total: n }) => (
                <li key={star}>
                  <span>{star} <Star size={12} aria-hidden="true" /></span>
                  <span className="srev__bar"><span style={{ width: reviews.length ? `${(n / reviews.length) * 100}%` : 0 }} /></span>
                  <span className="srev__bar-n">{n}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="srev__list">
            {reviews.slice(0, PREVIEW).map((review) => <ReviewCard key={review.id} review={review} onPhoto={openPhoto} />)}
          </div>
          {reviews.length > PREVIEW && (
            <button type="button" className="link-more srev__more" aria-haspopup="dialog" onClick={() => setAllOpen(true)}>
              Xem tất cả {total} đánh giá <ArrowRight size={14} aria-hidden="true" />
            </button>
          )}
        </>
      ) : (
        <div className="srev__empty">
          <Stars value={0} size={20} />
          <p>Chưa có đánh giá nào cho {stayName}. Nếu bạn đã lưu trú tại đây, hãy là người đầu tiên chia sẻ trải nghiệm.</p>
        </div>
      )}

      <Modal open={allOpen} onClose={() => setAllOpen(false)} labelledBy={`${uid}-all`} size="lg">
        <h2 id={`${uid}-all`} className="dialog__title">Đánh giá về {stayName}</h2>
        <label className="dialog__sort">
          Sắp xếp:{' '}
          <select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)}>
            <option value="new">Mới nhất</option>
            <option value="high">Điểm cao nhất</option>
            <option value="low">Điểm thấp nhất</option>
            <option value="photos">Có ảnh trước</option>
          </select>
        </label>
        <div className="srev__list srev__list--all">
          {sorted.map((review) => <ReviewCard key={review.id} review={review} onPhoto={openPhoto} />)}
        </div>
      </Modal>

      <GalleryDialog images={gallery.photos} index={gallery.index} onIndex={(index) => setGallery((current) => ({ ...current, index }))} name={`Ảnh khách chia sẻ — ${stayName}`} />
      <ReviewForm open={formOpen} onClose={() => setFormOpen(false)} stayName={stayName} slug={slug} source={source} />
    </section>
  );
}

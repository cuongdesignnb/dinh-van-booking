'use client';

import {
  ArrowRight,
  Bath,
  Coffee,
  CigaretteOff,
  Heart,
  Laptop,
  MessageCircle,
  Share2,
  Snowflake,
  SprayCan,
  Star,
  Wifi,
} from 'lucide-react';
import Image from 'next/image';
import { useId, useState, type ElementType } from 'react';
import { BrandIcon } from '@/components/ui/BrandIcons';
import { SmallLeaf } from '@/components/ui/Decor';
import { Modal } from '@/components/ui/Modal';
import type { Host, Review } from '@/data/types';
import { formatShort } from '@/lib/dates';
import { openDialog } from '@/lib/events';
import { useFavorite } from '@/lib/favorites';

export function ShareSave({ id, name }: { id: string; name: string }) {
  const [saved, toggle] = useFavorite('stay', id);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [manual, setManual] = useState(false);
  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: name, url });
        setStatus({ ok: true, text: 'Đã mở hộp chia sẻ.' });
        return;
      }
      await navigator.clipboard.writeText(url);
      setStatus({ ok: true, text: 'Đã sao chép liên kết.' });
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') return;
      setStatus({ ok: false, text: 'Không sao chép được tự động.' });
      setManual(true);
    }
  };
  return (
    <div className="share-save">
      <button type="button" className="share-save__btn" onClick={share}>
        <Share2 size={17} aria-hidden="true" /> Chia sẻ
      </button>
      <button
        type="button"
        className="share-save__btn share-save__btn--save"
        aria-pressed={saved}
        onClick={toggle}
        aria-label={saved ? `Bỏ lưu ${name}` : `Lưu ${name}`}
      >
        <Heart size={20} aria-hidden="true" /> {saved ? 'Đã lưu' : 'Lưu'}
      </button>
      <p className="share-save__status" role="status" data-ok={status?.ok || undefined}>
        {status?.text}
      </p>
      {manual && (
        <label className="share-save__manual">
          <span className="sr-only">Liên kết trang</span>
          <input readOnly value={typeof window !== 'undefined' ? window.location.href : ''} onFocus={(e) => e.currentTarget.select()} />
        </label>
      )}
    </div>
  );
}

export function HostCard({ host }: { host: Host }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <section className="host" aria-labelledby={`${id}-t`}>
      <span className="host__avatar">
        <Image src={host.avatar.src} alt="" width={70} height={70} />
      </span>
      <h2 className="host__name" id={`${id}-t`}>
        Chủ nhà: {host.name}
      </h2>
      <p className="host__tag">{host.tagline}</p>
      <blockquote className="host__quote">“{host.quote}”</blockquote>
      <button type="button" className="link-more host__more" aria-haspopup="dialog" onClick={() => setOpen(true)}>
        Xem hồ sơ chủ nhà <ArrowRight size={14} aria-hidden="true" />
      </button>
      <Modal open={open} onClose={() => setOpen(false)} labelledBy={`${id}-d`}>
        <div className="host-dialog">
          <Image src={host.avatar.src} alt="" width={84} height={84} className="host-dialog__avatar" />
          <div>
            <h2 id={`${id}-d`} className="dialog__title">
              {host.name}
            </h2>
            <p className="dialog__lead">{host.tagline}</p>
          </div>
        </div>
        <p>{host.bio}</p>
      </Modal>
    </section>
  );
}

const AMENITY_ICON: Record<string, ElementType> = {
  wifi: Wifi,
  ac: Snowflake,
  bath: Bath,
  toiletries: SprayCan,
  balcony: BalconyIcon,
  desk: Laptop,
  breakfast: Coffee,
  nosmoke: CigaretteOff,
};

const AMENITY_LABELS: Record<string, string> = {
  wifi: 'Wi-Fi',
  breakfast: 'Bữa sáng',
  view: 'View',
  kitchen: 'Bếp',
  family: 'Phù hợp gia đình',
  parking: 'Chỗ đậu xe',
  eco: 'Thân thiện môi trường',
  pool: 'Hồ bơi',
};

function BalconyIcon({ size = 20 }: { size?: number; strokeWidth?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M3 20h18M4 20V13l5-5 4 4 3-3 4 4v7" strokeLinejoin="round" />
      <path d="M4 16h16" />
    </svg>
  );
}

export function Amenities({ amenities }: { amenities: string[] }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const items = amenities.map((icon) => ({ icon, label: AMENITY_LABELS[icon] ?? icon })).filter((item) => item.icon);
  if (!items.length) return null;
  return (
    <section className="amen" aria-labelledby={`${id}-t`}>
      <div className="dsec-head">
        <h2 className="dsec-title" id={`${id}-t`}>
          Tiện nghi nổi bật <SmallLeaf className="section-title__leaf" />
        </h2>
        <button type="button" className="link-more" aria-haspopup="dialog" onClick={() => setOpen(true)}>
          Xem tất cả <ArrowRight size={14} aria-hidden="true" />
        </button>
      </div>
      <ul className="amen__list">
        {items.slice(0, 8).map((a) => {
          const Icon = AMENITY_ICON[a.icon] ?? Wifi;
          return (
            <li key={a.icon} className={`amen__chip amen__chip--${a.icon}`}>
              <Icon size={20} strokeWidth={1.7} aria-hidden="true" />
              {a.label}
            </li>
          );
        })}
      </ul>
      <Modal open={open} onClose={() => setOpen(false)} labelledBy={`${id}-d`}>
        <h2 id={`${id}-d`} className="dialog__title">
          Tất cả tiện nghi
        </h2>
        <ul className="amen-groups">
          {items.map((item) => (
            <li key={item.icon}>{item.label}</li>
          ))}
        </ul>
      </Modal>
    </section>
  );
}

export function ReviewCards({ reviews, total }: { reviews: Review[]; total: number }) {
  const [open, setOpen] = useState(false);
  const [sort, setSort] = useState<'new' | 'rating'>('new');
  const id = useId();
  const sorted = [...reviews].sort((a, b) =>
    sort === 'rating' ? b.rating - a.rating : (b.date ?? '').localeCompare(a.date ?? ''),
  );
  const card = (r: Review) => (
    <article className="dreview" key={r.id}>
      <div className="dreview__head">
        {r.avatar && <Image src={r.avatar.src} alt="" width={35} height={35} className="dreview__avatar" />}
        <div>
          <p className="dreview__name">{r.author}</p>
          <p className="dreview__meta">
            <Star size={14} className="star" aria-hidden="true" />
            <b>{r.rating.toFixed(1)}</b>
            <span className="sr-only"> trên 5</span>
            {r.date && <span className="dreview__date">{formatShort(r.date)}</span>}
          </p>
        </div>
      </div>
      <p className="dreview__quote">“{r.quote}”</p>
      {r.photos && (
        <ul className="dreview__photos">
          {r.photos.map((p) => (
            <li key={p.src}>
              <Image src={p.src} alt={p.alt} fill sizes="60px" />
            </li>
          ))}
        </ul>
      )}
    </article>
  );
  return (
    <section className="dreviews" aria-labelledby={`${id}-t`}>
      <div className="dsec-head">
        <h2 className="dsec-title" id={`${id}-t`}>
          Đánh giá của khách hàng <SmallLeaf className="section-title__leaf" />
        </h2>
        <button type="button" className="link-more" aria-haspopup="dialog" onClick={() => setOpen(true)}>
          Xem tất cả {total} đánh giá <ArrowRight size={14} aria-hidden="true" />
        </button>
      </div>
      <div className="dreviews__list">{reviews.slice(0, 3).map(card)}</div>
      <Modal open={open} onClose={() => setOpen(false)} labelledBy={`${id}-d`} size="lg">
        <h2 id={`${id}-d`} className="dialog__title">
          Đánh giá của khách hàng
        </h2>
        {reviews.length === 0 && <p className="dialog__pending">Chưa có đánh giá đã được công bố.</p>}
        <label className="dialog__sort">
          Sắp xếp:{' '}
          <select value={sort} onChange={(e) => setSort(e.target.value as 'new' | 'rating')}>
            <option value="new">Mới nhất</option>
            <option value="rating">Điểm cao nhất</option>
          </select>
        </label>
        <div className="dreviews__all">{sorted.map(card)}</div>
      </Modal>
    </section>
  );
}

export function SupportCard() {
  return (
    <section className="support" aria-labelledby="support-t">
      <Image src="/images/dinh-van-booking/people/advisor-support.webp" alt="" width={75} height={118} className="support__img" />
      <div className="support__body">
        <h2 className="support__title" id="support-t">
          Cần tư vấn thêm?
        </h2>
        <p className="support__text">
          Đinh Vân luôn sẵn sàng hỗ trợ bạn chọn phòng phù hợp và gợi ý lịch trình thú vị nhất!
        </p>
        <p className="support__script handwritten" aria-hidden="true">
          Đi để thấy
          <br /> thiên nhiên thật tuyệt!
        </p>
        <div className="support__actions">
          <button type="button" className="btn btn--light support__btn" aria-haspopup="dialog" onClick={() => openDialog({ type: 'contact', channel: 'zalo' })}>
            <BrandIcon name="zalo" size={14} /> Chat Zalo
          </button>
          <button type="button" className="btn btn--primary support__btn" aria-haspopup="dialog" onClick={() => openDialog({ type: 'contact', channel: 'phone' })}>
            Gọi cho mình
          </button>
          <button
            type="button"
            className="btn btn--primary support__wide"
            aria-haspopup="dialog"
            onClick={() => openDialog({ type: 'contact', channel: 'chat' })}
          >
            <MessageCircle size={16} aria-hidden="true" /> Nhắn tin ngay
          </button>
        </div>
      </div>
    </section>
  );
}

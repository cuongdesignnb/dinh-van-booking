'use client';

import {
  ArrowRight,
  Bath,
  Coffee,
  CigaretteOff,
  Heart,
  Laptop,
  Share2,
  Snowflake,
  SprayCan,
  Star,
  Wifi,
} from 'lucide-react';
import Image from '@/components/ui/ManagedImage';
import { useId, useState, type ElementType } from 'react';
import { BrandIcon } from '@/components/ui/BrandIcons';
import { SmallLeaf } from '@/components/ui/Decor';
import { Modal } from '@/components/ui/Modal';
import { useSiteData } from '@/components/site/SiteDataProvider';
import { RichContentRenderer } from '@/components/content/RichContentRenderer';
import type { RichDocument } from '@/lib/content/rich-document';
import { publicAsset, publicSetting, publicText, richDocumentHasContent } from '@/lib/public-content';
import type { Host, Review } from '@/data/types';
import { formatShort } from '@/lib/dates';
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

function BalconyIcon({ size = 20 }: { size?: number; strokeWidth?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M3 20h18M4 20V13l5-5 4 4 3-3 4 4v7" strokeLinejoin="round" />
      <path d="M4 16h16" />
    </svg>
  );
}

export function Amenities({ amenities, labels, title }: { amenities: string[]; labels?: Record<string, string>; title?: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const items = amenities.map((icon) => ({ icon, label: labels?.[icon] ?? icon })).filter((item) => item.icon);
  if (!items.length) return null;
  return (
    <section className="amen" aria-labelledby={`${id}-t`}>
      <div className="dsec-head">
        <h2 className="dsec-title" id={`${id}-t`}>
          {title || 'Tiện nghi'} <SmallLeaf className="section-title__leaf" />
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

export function ReviewCards({ reviews, total, title }: { reviews: Review[]; total: number; title?: string }) {
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
  if (!reviews.length) return null;
  return (
    <section className="dreviews" aria-labelledby={`${id}-t`}>
      <div className="dsec-head">
        <h2 className="dsec-title" id={`${id}-t`}>
          {title || 'Đánh giá'} <SmallLeaf className="section-title__leaf" />
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
  const site = useSiteData();
  const config = publicSetting(site.publicSite, 'home.contactPanel');
  const image = publicAsset(site.publicSite, config.imageMediaId);
  const title = publicText(config.title);
  const name = publicText(config.advisorName);
  const role = publicText(config.advisorRole);
  const zaloLabel = publicText(config.zaloCtaLabel);
  const phoneLabel = publicText(config.phoneCtaLabel);
  const note = publicText(config.note);
  if (config.enabled !== true || !title) return null;
  return (
    <section className="support" aria-labelledby="support-t">
      {image?.src && <Image src={image.src} alt={image.alt ?? title} width={image.width ?? 1200} height={image.height ?? 800} className="support__img" unoptimized />}
      <div className="support__body">
        <h2 className="support__title" id="support-t">
          {title}
        </h2>
        {richDocumentHasContent(config.description) && <div className="support__text"><RichContentRenderer document={config.description as RichDocument} /></div>}
        {(name || role) && <p className="support__script handwritten">{[name, role].filter(Boolean).join(' — ')}</p>}
        {note && <p className="support__script handwritten">{note}</p>}
        <div className="support__actions">
          {site.contact.zaloUrl && zaloLabel && <a className="btn btn--light support__btn" href={site.contact.zaloUrl} target="_blank" rel="noopener noreferrer"><BrandIcon name="zalo" size={14} /> {zaloLabel}</a>}
          {site.contact.phone && phoneLabel && <a className="btn btn--primary support__btn" href={`tel:${site.contact.phone}`}>{phoneLabel}</a>}
        </div>
      </div>
    </section>
  );
}

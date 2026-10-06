'use client';

import {
  ArrowRight,
  Camera,
  CircleCheck,
  CirclePlus,
  Eye,
  Footprints,
  House,
  Landmark,
  Leaf,
  LayoutGrid,
  MapPin,
  Mountain,
  Sailboat,
  Search,
  Soup,
  Sunrise,
  TreePine,
  Users,
  UtensilsCrossed,
} from 'lucide-react';
import Image from '@/components/ui/ManagedImage';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useId, useMemo, useRef, useState } from 'react';
import { FavoriteButton } from '@/components/ui/FavoriteButton';
import { Modal } from '@/components/ui/Modal';
import { RichContentRenderer } from '@/components/content/RichContentRenderer';
import {
  DESTINATION_CATEGORIES,
} from '@/lib/catalog/constants';
import type { Destination, DestinationCategory, TipIcon } from '@/data/destinations';
import { readParam } from '@/lib/selection';
import type { PublicRecord } from '@/lib/public-content';
import { publicText, richDocumentHasContent } from '@/lib/public-content';
import type { RichDocument } from '@/lib/content/rich-document';

function MonkeyIcon({ size = 15 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="10" fill="currentColor" />
      <circle cx="9" cy="11" r="1.4" fill="#fff" />
      <circle cx="15" cy="11" r="1.4" fill="#fff" />
      <path d="M9 15.5c1.8 1.4 4.2 1.4 6 0" stroke="#fff" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </svg>
  );
}

const TIP_ICON: Record<TipIcon, (p: { size: number }) => React.ReactNode> = {
  monkey: MonkeyIcon,
  walk: (p) => <Footprints {...p} />,
  center: (p) => <House {...p} />,
  boat: (p) => <Sailboat {...p} />,
  camera: (p) => <Camera {...p} />,
  leaf: (p) => <Leaf {...p} fill="currentColor" />,
  check: (p) => <CircleCheck {...p} />,
  search: (p) => <Search {...p} />,
  plus: (p) => <CirclePlus {...p} />,
  mountain: (p) => <Mountain {...p} />,
  sun: (p) => <Sunrise {...p} />,
  pin: (p) => <MapPin {...p} />,
  view: (p) => <Eye {...p} />,
  food: (p) => <Leaf {...p} />,
  goat: (p) => <Mountain {...p} fill="currentColor" />,
  dish: (p) => <Soup {...p} />,
};

function CategoryIcon({ id }: { id: DestinationCategory | 'all' }) {
  const p = { size: 20, 'aria-hidden': true as const };
  switch (id) {
    case 'all':
      return <LayoutGrid {...p} />;
    case 'thien-nhien':
      return <TreePine {...p} fill="currentColor" />;
    case 'van-hoa':
      return <Landmark {...p} />;
    case 'check-in':
      return <Camera {...p} />;
    case 'am-thuc':
      return <UtensilsCrossed {...p} />;
    case 'gia-dinh':
      return <Users {...p} fill="currentColor" />;
  }
}

/** Category filter + destination cards + detail dialog (URL: ?loai=, ?d=). */
export function DestinationExplorer({ destinations, config }: { destinations: Destination[]; config: PublicRecord }) {
  const listTitle = publicText(config.listTitle);
  const advisorCtaLabel = publicText(config.advisorCtaLabel);
  const hasCatalog = destinations.length > 0;
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const raw = readParam(params, 'loai');
  const category = (DESTINATION_CATEGORIES.some((c) => c.id === raw) ? raw : 'all') as DestinationCategory | 'all';
  const openId = readParam(params, 'd');
  const open = openId ? (destinations.find((destination) => destination.id === openId || destination.name === openId) ?? null) : null;
  const pushed = useRef(false);
  const [all, setAll] = useState(false);

  const list = useMemo(
    () => destinations.filter((d) => category === 'all' || d.tags.includes(category)),
    [category, destinations],
  );

  const setQuery = (patch: Record<string, string | null>, mode: 'push' | 'replace' = 'push') => {
    const p = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v === null) p.delete(k);
      else p.set(k, v);
    }
    const url = p.toString() ? `${pathname}?${p}` : pathname;
    // Shallow update: Next.js keeps useSearchParams in sync without a server round-trip.
    if (mode === 'push') window.history.pushState(null, '', url);
    else window.history.replaceState(null, '', url);
  };
  const openDest = (id: string) => {
    pushed.current = true;
    setAll(false);
    setQuery({ d: id });
  };
  const closeDest = () => {
    if (!open) return;
    if (pushed.current) {
      pushed.current = false;
      router.back();
    } else setQuery({ d: null }, 'replace');
  };

  let body;
  if (!list.length) {
    const emptyTitle = hasCatalog ? 'Không có điểm đến phù hợp với bộ lọc' : publicText(config.emptyTitle) || 'Chưa có điểm đến được công bố';
    body = (
      <div className="state-box catalog-empty-state" role="status">
        {!hasCatalog && <span className="catalog-empty-state__icon" aria-hidden="true"><MapPin size={27} strokeWidth={1.6} /></span>}
        <h3>{emptyTitle}</h3>
        {!hasCatalog && richDocumentHasContent(config.emptyDescription) && <div><RichContentRenderer document={config.emptyDescription as RichDocument} /></div>}
        {category !== 'all' && <button type="button" className="btn btn--light" onClick={() => setQuery({ loai: null })}>Xem tất cả điểm đến</button>}
      </div>
    );
  }
  else
    body = (
      <ul className="dest-grid">
        {list.map((d, i) => (
          <li key={d.id} className="dcard" data-reveal="card" data-tilt style={{ '--d': `${i * 70}ms` } as React.CSSProperties}>
            <div className="dcard__media">
              <Image src={d.image.src} alt={d.image.alt} fill sizes="(max-width: 767px) 92vw, (max-width: 1279px) 30vw, 224px" className="dcard__img" />
              <span className={`dcard__badge dcard__badge--${d.tags[0]}`}>{d.badge}</span>
              <FavoriteButton ns="destination" id={d.id} name={d.name} className="fav dcard__fav" />
            </div>
            <div className="dcard__body">
              <h3 className="dcard__title">{d.name}</h3>
              <p className="dcard__sum">{d.summary}</p>
              <ul className="dcard__tips">
                {d.tips.map((t) => (
                  <li key={t.text}>
                    {TIP_ICON[t.icon]({ size: 15 })}
                    {t.text}
                  </li>
                ))}
              </ul>
              <button type="button" className="btn btn--primary dcard__cta btn-arrow" aria-haspopup="dialog" onClick={() => openDest(d.id)}>
                Xem chi tiết <ArrowRight size={14} strokeWidth={2.3} aria-hidden="true" />
                <span className="sr-only"> {d.name}</span>
              </button>
            </div>
          </li>
        ))}
      </ul>
    );

  return (
    <>
      {hasCatalog && <div className="dest-filters">
        <div className="dest-filters__inner content-shell">
          <div className="dest-chips" role="group" aria-label="Lọc điểm đến theo nhóm">
            {DESTINATION_CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                className="combo-chip dest-chip"
                aria-pressed={category === c.id}
                onClick={() => setQuery({ loai: c.id === 'all' ? null : c.id })}
              >
                <CategoryIcon id={c.id} />
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </div>}

      <section className={`dest-list content-shell${hasCatalog ? '' : ' dest-list--empty'}`} aria-labelledby={listTitle ? 'dest-title' : undefined}>
        <div className="dest-list__head">
          <div>
            {listTitle && <h2 className="section-title" id="dest-title">{listTitle}</h2>}
            {richDocumentHasContent(config.listSubtitle) && <div className="section-sub"><RichContentRenderer document={config.listSubtitle as RichDocument} /></div>}
          </div>
          {hasCatalog && <button type="button" className="link-more dest-list__all" aria-haspopup="dialog" onClick={() => setAll(true)}>
            Xem tất cả điểm đến <ArrowRight size={15} aria-hidden="true" />
          </button>}
        </div>
        <p className="sr-only" aria-live="polite">
          {list.length} điểm đến
        </p>
        {body}
      </section>

      {hasCatalog && <AllDestinations destinations={destinations} open={all} onClose={() => setAll(false)} onPick={openDest} />}
      <DestinationDialog destination={open} onClose={closeDest} advisorCtaLabel={advisorCtaLabel} />
    </>
  );
}

function AllDestinations({ destinations, open, onClose, onPick }: { destinations: Destination[]; open: boolean; onClose: () => void; onPick: (id: string) => void }) {
  const id = useId();
  const [q, setQ] = useState('');
  const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase();
  const shown = destinations.filter((d) => norm(`${d.name} ${d.summary}`).includes(norm(q.trim())));
  return (
    <Modal open={open} onClose={onClose} labelledBy={id} className="dialog--drawer">
      <h2 id={id} className="dialog__title">
        Tất cả điểm đến
      </h2>
      <label className="field">
        <span className="field__label">Tìm điểm đến</span>
        <input className="field__input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ví dụ: hồ, hang, ẩm thực…" data-autofocus />
      </label>
      <p className="dialog__lead" aria-live="polite">
        {shown.length} điểm đến
      </p>
      <ul className="dialog__list">
        {shown.map((d) => (
          <li key={d.id}>
            <button type="button" className="list-card" onClick={() => onPick(d.id)}>
              <span className="list-card__img">
                <Image src={d.image.src} alt="" fill sizes="96px" />
              </span>
              <span className="list-card__text">
                <strong>{d.name}</strong>
                <span>{d.subtitle}</span>
              </span>
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
    </Modal>
  );
}

export function DestinationDialog({ destination, onClose, advisorCtaLabel }: { destination: Destination | null; onClose: () => void; advisorCtaLabel: string }) {
  const id = useId();
  const [copied, setCopied] = useState<string | null>(null);
  const d = destination;
  return (
    <Modal open={!!d} onClose={onClose} labelledBy={id} size="lg">
      {d && (
        <>
          <div className="dialog__media">
            <Image src={d.image.src} alt={d.image.alt} fill sizes="(max-width: 820px) 100vw, 820px" />
          </div>
          <p className={`dcard__badge dcard__badge--inline dcard__badge--${d.tags[0]}`}>{d.badge}</p>
          <h2 id={id} className="dialog__title">
            {d.name}
          </h2>
          <p className="dialog__lead">{d.summary}</p>
          {d.body ? <RichContentRenderer document={d.body} /> : <p>{d.description}</p>}
          <div className="combo-d__incl">
            <section>
              <h3 className="combo-d__h">Hoạt động gợi ý</h3>
              <ul>
                {d.activities.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </section>
            <section>
              <h3 className="combo-d__h">Lưu ý khi tham quan</h3>
              <ul>
                {d.notes.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </section>
          </div>
          <div className="dialog__actions">
            {d.slug && <Link className="btn btn--light" href={d.publicPath ?? `/diem-den/${d.slug}`}>
              Xem trang điểm đến <ArrowRight size={16} aria-hidden="true" />
            </Link>}
            {advisorCtaLabel && <Link className="btn btn--primary" href={d.slug ? `/lien-he?intent=destination&item=${encodeURIComponent(d.slug)}` : '/lien-he?intent=destination'} data-autofocus>
              {advisorCtaLabel} <ArrowRight size={16} aria-hidden="true" />
            </Link>}
            <Link className="btn btn--light" href="/phong-nghi">
              Tìm phòng nghỉ
            </Link>
            <FavoriteButton ns="destination" id={d.id} name={d.name} className="btn btn--light dest-save" />
            <button
              type="button"
              className="btn btn--light"
              onClick={async () => {
                const url = `${window.location.origin}${d.publicPath ?? `/diem-den/${d.slug ?? d.id}`}`;
                const canShare = typeof navigator.share === 'function';
                try {
                  if (canShare) await navigator.share({ title: d.name, url });
                  else await navigator.clipboard.writeText(url);
                  setCopied(canShare ? 'Đã mở hộp chia sẻ.' : 'Đã sao chép liên kết.');
                } catch (e) {
                  if ((e as Error)?.name !== 'AbortError') setCopied(`Không sao chép được. Liên kết: ${url}`);
                }
              }}
            >
              Chia sẻ
            </button>
            <span className="dialog__copied" role="status">
              {copied}
            </span>
          </div>
        </>
      )}
    </Modal>
  );
}

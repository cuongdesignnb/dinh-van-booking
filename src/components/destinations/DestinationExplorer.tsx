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
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useId, useMemo, useRef, useState } from 'react';
import { SmallLeaf } from '@/components/ui/Decor';
import { FavoriteButton } from '@/components/ui/FavoriteButton';
import { DemoNote, Modal } from '@/components/ui/Modal';
import {
  DESTINATION_CATEGORIES,
  destinations,
  destinationsById,
  featuredDestinations,
  type Destination,
  type DestinationCategory,
  type TipIcon,
} from '@/data/destinations';
import { readParam } from '@/lib/selection';

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
export function DestinationExplorer() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const raw = readParam(params, 'loai');
  const category = (DESTINATION_CATEGORIES.some((c) => c.id === raw) ? raw : 'all') as DestinationCategory | 'all';
  const openId = readParam(params, 'd');
  const open = openId ? (destinationsById.get(openId) ?? null) : null;
  const pushed = useRef(false);
  const [all, setAll] = useState(false);
  const demo = readParam(params, 'demo');

  const list = useMemo(
    () => featuredDestinations.filter((d) => category === 'all' || d.tags.includes(category)),
    [category],
  );

  const setQuery = (patch: Record<string, string | null>, mode: 'push' | 'replace' = 'push') => {
    const p = new URLSearchParams(params);
    p.delete('demo');
    for (const [k, v] of Object.entries(patch)) {
      if (v === null) p.delete(k);
      else p.set(k, v);
    }
    const url = p.toString() ? `${pathname}?${p}` : pathname;
    if (mode === 'push') router.push(url, { scroll: false });
    else router.replace(url, { scroll: false });
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
  if (demo === 'error')
    body = (
      <div className="state-box" role="alert">
        <p>
          <strong>Chưa tải được danh sách điểm đến.</strong>
        </p>
        <button type="button" className="btn btn--primary" onClick={() => setQuery({}, 'replace')}>
          Thử lại
        </button>
      </div>
    );
  else if (demo === 'loading')
    body = (
      <ul className="dest-grid" aria-hidden="true">
        {Array.from({ length: 6 }, (_, i) => (
          <li key={i} className="dcard">
            <div className="dcard__media skeleton" />
            <div className="dcard__body">
              <span className="skeleton skeleton--line" />
              <span className="skeleton skeleton--block" />
            </div>
          </li>
        ))}
      </ul>
    );
  else if (!list.length)
    body = (
      <div className="state-box" role="status">
        <p>
          <strong>Chưa có điểm đến trong nhóm này.</strong>
        </p>
        <button type="button" className="btn btn--light" onClick={() => setQuery({ loai: null })}>
          Xem tất cả điểm đến
        </button>
      </div>
    );
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
      <div className="dest-filters">
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
          <p className="dest-filters__msg">
            <SmallLeaf className="dest-filters__leaf" />
            Những điểm đến không chỉ để ngắm, mà để cảm nhận
          </p>
        </div>
      </div>

      <section className="dest-list content-shell" aria-labelledby="dest-title">
        <div className="dest-list__head">
          <div>
            <h2 className="section-title" id="dest-title">
              Những điểm đến nổi bật <SmallLeaf className="section-title__leaf" />
            </h2>
            <p className="section-sub">
              Khám phá vẻ đẹp nguyên sơ, những giá trị văn hóa đặc sắc và trải nghiệm khó quên tại Cúc Phương - Ninh Bình.
            </p>
          </div>
          <button type="button" className="link-more dest-list__all" aria-haspopup="dialog" onClick={() => setAll(true)}>
            Xem tất cả điểm đến <ArrowRight size={15} aria-hidden="true" />
          </button>
        </div>
        <p className="sr-only" aria-live="polite">
          {list.length} điểm đến
        </p>
        {body}
      </section>

      <AllDestinations open={all} onClose={() => setAll(false)} onPick={openDest} />
      <DestinationDialog destination={open} onClose={closeDest} />
    </>
  );
}

function AllDestinations({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (id: string) => void }) {
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

export function DestinationDialog({ destination, onClose }: { destination: Destination | null; onClose: () => void }) {
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
          <p>{d.description}</p>
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
          <DemoNote>
            Liên hệ để được tư vấn thông tin phù hợp thời điểm đi (giờ mở cửa, vé, đường đi). Nội dung trên là mô tả mẫu,
            chưa phải hướng dẫn du lịch đã kiểm chứng.
          </DemoNote>
          <div className="dialog__actions">
            <Link className="btn btn--primary" href={`/lien-he?intent=destination&item=${d.id}`} data-autofocus>
              Nhờ Đinh Vân gợi ý lịch trình <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <Link className="btn btn--light" href="/phong-nghi">
              Tìm phòng nghỉ
            </Link>
            <FavoriteButton ns="destination" id={d.id} name={d.name} className="btn btn--light dest-save" />
            <button
              type="button"
              className="btn btn--light"
              onClick={async () => {
                const url = `${window.location.origin}/diem-den?d=${d.id}`;
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

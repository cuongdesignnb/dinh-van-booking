'use client';

import { ArrowRight, BedDouble, Camera, Car, Leaf, Mountain, Sun, Utensils, Waves } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { LeafSprig, SmallLeaf } from '@/components/ui/Decor';
import { DemoNote, Modal } from '@/components/ui/Modal';
import { destinations, itineraries, seasons, type ItineraryStop, type Season } from '@/data/destinations';

const STOP_ICON: Record<ItineraryStop['icon'], typeof Car> = {
  car: Car,
  leaf: Leaf,
  food: Utensils,
  mountain: Mountain,
  water: Waves,
  camera: Camera,
  bed: BedDouble,
  sun: Sun,
};

export function ItineraryTabs() {
  const uid = useId();
  const [active, setActive] = useState(0);
  const [full, setFull] = useState(false);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const byKeyboard = useRef(false);
  // Move focus after React has re-rendered the roving tabindex.
  useEffect(() => {
    if (byKeyboard.current) tabs.current[active]?.focus();
    byKeyboard.current = false;
  }, [active]);
  const onKey = (e: KeyboardEvent) => {
    const n = itineraries.length;
    const cur = tabs.current.findIndex((t) => t === document.activeElement);
    const from = cur >= 0 ? cur : active;
    const map: Record<string, number> = {
      ArrowRight: (from + 1) % n,
      ArrowLeft: (from - 1 + n) % n,
      Home: 0,
      End: n - 1,
    };
    if (e.key in map) {
      e.preventDefault();
      byKeyboard.current = true;
      setActive(map[e.key]);
    }
  };
  const it = itineraries[active];
  const stops = it.days.flatMap((d) => d.stops);
  return (
    <section className="itin" aria-labelledby={`${uid}-t`}>
      <LeafSprig className="itin__leaf" />
      <div className="dsec-head">
        <h2 className="dsec-title" id={`${uid}-t`}>
          Gợi ý lịch trình khám phá <SmallLeaf className="section-title__leaf" />
        </h2>
        <button type="button" className="link-more" aria-haspopup="dialog" onClick={() => setFull(true)}>
          Xem thêm <ArrowRight size={14} aria-hidden="true" />
        </button>
      </div>
      <p className="dsec-sub">Những hành trình được nhiều du khách yêu thích, để dễ dàng lựa chọn và trải nghiệm.</p>
      <div className="itin__tabs" role="tablist" aria-label="Độ dài lịch trình" onKeyDown={onKey}>
        {itineraries.map((t, i) => (
          <button
            key={t.id}
            ref={(el) => {
              tabs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`${uid}-tab-${i}`}
            aria-selected={active === i}
            aria-controls={`${uid}-panel`}
            tabIndex={active === i ? 0 : -1}
            className="itin__tab"
            onClick={() => setActive(i)}
          >
            <strong>{t.label}</strong>
            <span>{t.sub}</span>
          </button>
        ))}
      </div>
      <div className="itin__panel" role="tabpanel" id={`${uid}-panel`} aria-labelledby={`${uid}-tab-${active}`} tabIndex={0}>
        <ol className="itin__timeline" key={it.id}>
          {it.days.map((day) => (
            <li key={day.title ?? 'd'} className="itin__day">
              {day.title && <p className="itin__daytitle">{day.title}</p>}
              <ol>
                {day.stops.map((s, i) => {
                  const Icon = STOP_ICON[s.icon];
                  return (
                    <li key={`${s.time}-${s.title}`} className="itin__stop" style={{ '--i': i } as React.CSSProperties}>
                      <span className="itin__time">{s.time}</span>
                      <Icon className="itin__ic" size={22} strokeWidth={1.8} aria-hidden="true" fill={s.icon === 'leaf' || s.icon === 'car' || s.icon === 'mountain' ? 'currentColor' : 'none'} />
                      <span className="itin__text">
                        {s.title}
                        {s.detail && <small>{s.detail}</small>}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </li>
          ))}
        </ol>
        <figure className="itin__photo">
          <Image src="/images/dinh-van-booking/pages/itinerary-photo.webp" alt="Du khách đeo balô đi bộ trên đường rừng" fill sizes="132px" />
        </figure>
        <p className="itin__script handwritten" aria-hidden="true">
          Một ngày
          <br /> đủ để yêu thêm
          <br /> thiên nhiên Việt Nam
          <svg viewBox="0 0 24 24" width="20" height="20" focusable="false">
            <path
              d="M12 20.5s-7.5-4.6-8.9-9.4C2 7.4 4.6 4.5 7.6 4.9c1.9.2 3.4 1.6 4.4 3.3 1-1.7 2.5-3.1 4.4-3.3 3-.4 5.6 2.5 4.5 6.2-1.4 4.8-8.9 9.4-8.9 9.4Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
            />
          </svg>
        </p>
      </div>
      <p className="sr-only">{stops.length} điểm dừng trong lịch trình {it.label}. Giờ giấc chỉ mang tính gợi ý.</p>

      <Modal open={full} onClose={() => setFull(false)} labelledBy={`${uid}-d`} size="lg">
        <h2 id={`${uid}-d`} className="dialog__title">
          Lịch trình {it.label}
        </h2>
        <DemoNote>Lịch trình gợi ý mẫu; thời gian di chuyển thực tế cần được tư vấn theo điểm xuất phát và mùa.</DemoNote>
        {it.days.map((day) => (
          <section key={day.title ?? 'd'} className="itin-full">
            {day.title && <h3 className="combo-d__h">{day.title}</h3>}
            <ul>
              {day.stops.map((s) => (
                <li key={`${s.time}-${s.title}`}>
                  <b>{s.time}</b> — {s.title}
                  {s.detail ? ` (${s.detail})` : ''}
                </li>
              ))}
            </ul>
          </section>
        ))}
        <div className="dialog__actions">
          <Link className="btn btn--primary" href={`/lien-he?intent=destination&item=vuon-quoc-gia-cuc-phuong`}>
            Nhờ Đinh Vân điều chỉnh lịch trình <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </Modal>
    </section>
  );
}

export function Seasons() {
  const uid = useId();
  const [open, setOpen] = useState<Season | null>(null);
  return (
    <section className="seasons" aria-labelledby={`${uid}-t`}>
      <LeafSprig className="seasons__leaf" />
      <h2 className="dsec-title" id={`${uid}-t`}>
        Du lịch theo mùa <SmallLeaf className="section-title__leaf" />
      </h2>
      <p className="dsec-sub">Mỗi mùa ở Cúc Phương - Ninh Bình đều mang một vẻ đẹp riêng.</p>
      <ul className="seasons__grid">
        {seasons.map((s) => (
          <li key={s.id}>
            <button type="button" className="season" aria-haspopup="dialog" onClick={() => setOpen(s)}>
              <span className="season__media">
                <Image src={s.image.src} alt={s.image.alt} fill sizes="(max-width: 767px) 46vw, 168px" />
              </span>
              <span className="season__name">
                {s.name} ({s.months})
              </span>
              <span className="season__sum">{s.summary}</span>
            </button>
          </li>
        ))}
      </ul>
      <Modal open={!!open} onClose={() => setOpen(null)} labelledBy={`${uid}-d`}>
        {open && (
          <>
            <div className="dialog__media">
              <Image src={open.image.src} alt={open.image.alt} fill sizes="600px" />
            </div>
            <h2 id={`${uid}-d`} className="dialog__title">
              {open.name} ({open.months})
            </h2>
            <p>{open.summary}</p>
            <ul className="season-tips">
              {open.tips.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
            <DemoNote>Thông tin mùa là gợi ý chung, không phải dự báo thời tiết. Hãy hỏi Đinh Vân trước chuyến đi.</DemoNote>
            <div className="dialog__actions">
              <Link className="btn btn--primary" href="/lien-he?intent=destination&item=vuon-quoc-gia-cuc-phuong" data-autofocus>
                Hỏi thời điểm phù hợp <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
          </>
        )}
      </Modal>
    </section>
  );
}

function MapIcon({ id }: { id: string }) {
  if (id === 'vuon-quoc-gia-cuc-phuong')
    return (
      <svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true">
        <path d="M16 3c-5 0-8 4-8 8 0 2 1 3.5 2 4.5-2 1.2-3 3.3-3 5.5 0 4 3.6 6 9 6s9-2 9-6c0-2.2-1-4.3-3-5.5 1-1 2-2.5 2-4.5 0-4-3-8-8-8Z" fill="#1f4d2a" />
        <path d="M16 12v18M16 18l-4-3M16 21l4-3" stroke="#e8efe0" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      </svg>
    );
  if (id === 'ho-yen-quang')
    return (
      <svg viewBox="0 0 32 32" width="30" height="24" aria-hidden="true">
        <path d="M3 10c4-3 6 3 10 0s6-3 10 0 5 2 6 0M3 17c4-3 6 3 10 0s6-3 10 0 5 2 6 0M3 24c4-3 6 3 10 0s6-3 10 0 5 2 6 0" stroke="#1f7fd0" strokeWidth="3" fill="none" strokeLinecap="round" />
      </svg>
    );
  if (id === 'trang-an')
    return (
      <svg viewBox="0 0 40 28" width="36" height="26" aria-hidden="true">
        <path d="M2 16c2-6 5-12 8-12s3 6 4 8c1-4 3-9 6-9s4 7 5 9c1-2 2-5 4-5 3 0 6 6 9 9Z" fill="#1c2a20" />
        <path d="M4 21h32l-4 5H8Z" fill="#1f4d2a" />
      </svg>
    );
  return (
    <svg viewBox="0 0 36 28" width="34" height="26" aria-hidden="true">
      <path d="M1 27C3 16 7 4 13 4c4 0 5 6 6 9 1-4 3-8 6-8 5 0 8 11 10 22Z" fill="#1c2a20" />
      <path d="M12 27c0-6 1-10 3-10s3 4 3 10" fill="#f4f6ee" />
    </svg>
  );
}

/** Illustrated map. Pins are placed from fixture percentages — not coordinates. */
export function LocalMap() {
  const uid = useId();
  const pathname = usePathname();
  const params = useSearchParams();
  const [big, setBig] = useState(false);
  const pins = destinations.filter((d) => d.mapPos);
  const openDest = (id: string) => {
    setBig(false);
    const p = new URLSearchParams(params);
    p.set('d', id);
    window.history.pushState(null, '', `${pathname}?${p}`);
  };
  const canvas = (large: boolean) => (
    <div className={`lmap${large ? ' lmap--large' : ''}`}>
      <Image src="/images/dinh-van-booking/pages/map-destinations.webp" alt="" fill sizes={large ? '780px' : '495px'} className="lmap__bg" />
      <svg className="lmap__routes" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <path d="M10 26 C 22 40, 30 50, 24 70 S 12 88, 14 90" />
        <path d="M11 30 C 25 34, 28 42, 26 60" />
        <path d="M30 96 C 40 80, 44 72, 52 62 S 60 52, 62 46" />
      </svg>
      <span className="lmap__area lmap__area--cp" aria-hidden="true">
        Cúc Phương
      </span>
      <span className="lmap__area lmap__area--nb" aria-hidden="true">
        Ninh Bình
      </span>
      <span className="lmap__north" aria-hidden="true">
        N
        <svg viewBox="0 0 16 16" width="14" height="14">
          <circle cx="8" cy="8" r="7" fill="none" stroke="#1c2a20" strokeWidth="1.3" />
          <path d="M8 2l2.5 7h-5Z" fill="#1c2a20" />
        </svg>
      </span>
      <span className="lmap__badge">Bản đồ minh họa</span>
      {pins.map((d) => (
        <button
          key={d.id}
          type="button"
          className="lmap__pin"
          style={{ left: `${d.mapPos!.x}%`, top: `${d.mapPos!.y}%` }}
          onClick={() => openDest(d.id)}
          aria-label={`${d.name} — xem chi tiết`}
        >
          <MapIcon id={d.id} />
          <span className="lmap__label">{d.name === 'Vườn quốc gia Cúc Phương' ? 'Vườn quốc gia Cúc Phương' : d.name}</span>
        </button>
      ))}
      {!large && (
        <p className="lmap__script handwritten" aria-hidden="true">
          “Mỗi cung đường
          <br /> đều dẫn đến
          <br /> những điều tuyệt vời”
        </p>
      )}
    </div>
  );
  return (
    <section className="lmap-card" aria-labelledby={`${uid}-t`}>
      <LeafSprig className="lmap-card__leaf" />
      <div className="dsec-head">
        <h2 className="dsec-title" id={`${uid}-t`}>
          Bản đồ khám phá địa phương <SmallLeaf className="section-title__leaf" />
        </h2>
        <button type="button" className="link-more" aria-haspopup="dialog" onClick={() => setBig(true)}>
          Xem bản đồ lớn <ArrowRight size={14} aria-hidden="true" />
        </button>
      </div>
      <p className="dsec-sub">Dễ dàng định vị và lên kế hoạch cho hành trình của bạn.</p>
      {canvas(false)}
      <Modal open={big} onClose={() => setBig(false)} labelledBy={`${uid}-d`} size="xl">
        <h2 id={`${uid}-d`} className="dialog__title">
          Bản đồ khám phá địa phương
        </h2>
        <DemoNote>Bản đồ minh họa — vị trí chỉ mang tính tương đối, chưa dùng để chỉ đường.</DemoNote>
        {canvas(true)}
        <ul className="map-list">
          {pins.map((d) => (
            <li key={d.id}>
              <button type="button" className="map-list__item" onClick={() => openDest(d.id)}>
                <strong>{d.name}</strong>
                <span>{d.subtitle}</span>
              </button>
            </li>
          ))}
        </ul>
      </Modal>
    </section>
  );
}

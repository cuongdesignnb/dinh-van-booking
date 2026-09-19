'use client';

import { ArrowRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useId, useState } from 'react';
import { DemoNote, Modal } from '@/components/ui/Modal';
import { fromPrice, type Stay } from '@/data/stays';
import { formatVnd } from '@/lib/format';

function Pin() {
  return (
    <svg viewBox="0 0 24 32" width="22" height="30" aria-hidden="true" focusable="false">
      <path d="M12 1C6 1 1.5 5.6 1.5 11.4 1.5 19.2 12 31 12 31s10.5-11.8 10.5-19.6C22.5 5.6 18 1 12 1Z" fill="#1c4a28" />
      <circle cx="12" cy="11.5" r="4.3" fill="#e9f0e1" />
    </svg>
  );
}

/** Illustrated map: pins are placed from fixture percentages, not coordinates. */
function MapCanvas({
  stays,
  active,
  onSelect,
  query,
  large,
}: {
  stays: Stay[];
  active: Stay | null;
  onSelect: (id: string) => void;
  query: string;
  large?: boolean;
}) {
  return (
    <div className={`smap${large ? ' smap--large' : ''}`}>
      <Image src="/images/dinh-van-booking/pages/map-stays.webp" alt="" fill sizes={large ? '720px' : '266px'} className="smap__bg" />
      <span className="smap__label" aria-hidden="true">
        Vườn quốc gia
        <br />
        Cúc Phương
      </span>
      <span className="smap__badge">Bản đồ minh họa</span>
      {stays.map((s) => (
        <button
          key={s.id}
          type="button"
          className="smap__pin"
          data-active={active?.id === s.id || undefined}
          style={{ left: `${s.mapPin.x}%`, top: `${s.mapPin.y}%` }}
          aria-label={`Xem ${s.name} trên bản đồ`}
          aria-pressed={active?.id === s.id}
          onClick={() => onSelect(s.id)}
        >
          <Pin />
        </button>
      ))}
      {active && (
        <div
          className="smap__pop"
          style={{ left: `${Math.min(active.mapPin.x, large ? 70 : 40)}%`, top: `${active.mapPin.y}%` }}
        >
          <Link href={`/phong-nghi/${active.slug}${query ? `?${query}` : ''}`} className="smap__pop-name">
            {active.name}
          </Link>
          <span>
            Từ <b>{formatVnd(fromPrice(active))}</b> / đêm
          </span>
        </div>
      )}
    </div>
  );
}

export function StayMapCard({ stays, query }: { stays: Stay[]; query: string }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const active = stays.find((s) => s.id === activeId) ?? stays[0] ?? null;
  return (
    <section className="side-card map-card" aria-labelledby={`${titleId}-card`} data-reveal="slide-left">
      <h2 className="side-card__title" id={`${titleId}-card`}>
        Xem vị trí trên bản đồ
      </h2>
      <MapCanvas stays={stays} active={active} onSelect={setActiveId} query={query} />
      <button type="button" className="btn btn--primary map-card__cta btn-shine" aria-haspopup="dialog" onClick={() => setOpen(true)}>
        Xem bản đồ lớn <ArrowRight size={14} strokeWidth={2.3} aria-hidden="true" />
      </button>

      <Modal open={open} onClose={() => setOpen(false)} labelledBy={titleId} size="lg">
        <h2 id={titleId} className="dialog__title">
          Bản đồ chỗ nghỉ
        </h2>
        <DemoNote>Bản đồ minh họa — vị trí các điểm chỉ mang tính tương đối, chưa dùng để chỉ đường.</DemoNote>
        <MapCanvas stays={stays} active={active} onSelect={setActiveId} query={query} large />
        <ul className="map-list" aria-label="Danh sách chỗ nghỉ trên bản đồ">
          {stays.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                className="map-list__item"
                aria-pressed={active?.id === s.id}
                onClick={() => setActiveId(s.id)}
                data-autofocus={active?.id === s.id || undefined}
              >
                <strong>{s.name}</strong>
                <span>
                  {s.location} · Từ {formatVnd(fromPrice(s))}
                </span>
              </button>
              <Link href={`/phong-nghi/${s.slug}${query ? `?${query}` : ''}`} className="map-list__link">
                Chi tiết <span className="sr-only">{s.name}</span>
                <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      </Modal>
    </section>
  );
}

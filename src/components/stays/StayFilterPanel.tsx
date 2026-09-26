'use client';

import { ChevronDown, RotateCcw, Star } from 'lucide-react';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { AMENITIES, STAY_TYPES } from '@/lib/catalog/constants';
import type { AmenityId, StayType } from '@/data/types';
import { formatVnd } from '@/lib/format';
import { PRICE_BOUNDS, RATING_OPTIONS, type StayFilters } from '@/lib/stay-filters';

type Counts = {
  types: Record<StayType, number>;
  amenities: Record<AmenityId, number>;
  rating: Record<number, number>;
};

interface Props {
  value: StayFilters;
  counts: Counts;
  onChange: (patch: Partial<StayFilters>) => void;
  onReset: () => void;
  /** Hide the heading row (the mobile drawer has its own). */
  bare?: boolean;
}

export function StayFilterPanel({ value, counts, onChange, onReset, bare }: Props) {
  const uid = useId();
  const toggle = <T extends string>(list: T[], id: T) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  return (
    <div className="filters">
      {!bare && (
        <div className="filters__head">
          <h2 className="filters__title">Bộ lọc tìm kiếm</h2>
          <button
            type="button"
            className="filters__reset"
            onClick={onReset}
            title="Xóa bộ lọc và sắp xếp; giữ nguyên ngày và số khách"
          >
            <RotateCcw size={12} strokeWidth={2.4} aria-hidden="true" /> Đặt lại
          </button>
        </div>
      )}

      <div className="filters__group filters__group--price">
        <h3 className="filters__gtitle" id={`${uid}-price`}>
          Khoảng giá (đêm)
        </h3>
        <PriceSlider
          labelledBy={`${uid}-price`}
          min={value.priceMin}
          max={value.priceMax}
          onChange={(priceMin, priceMax) => onChange({ priceMin, priceMax })}
        />
      </div>

      <Group title="Loại lưu trú">
        {STAY_TYPES.map((t) => (
          <Check
            key={t.id}
            label={t.label}
            count={counts.types[t.id]}
            checked={value.types.includes(t.id)}
            onChange={() => onChange({ types: toggle(value.types, t.id) })}
          />
        ))}
      </Group>

      <Group title="Tiện ích nổi bật">
        {AMENITIES.map((a) => (
          <Check
            key={a.id}
            label={a.label}
            count={counts.amenities[a.id]}
            checked={value.amenities.includes(a.id)}
            onChange={() => onChange({ amenities: toggle(value.amenities, a.id) })}
          />
        ))}
      </Group>

      <Group title="Đánh giá" hint="Chọn một mức; bấm lại để bỏ chọn">
        {RATING_OPTIONS.map((r) => {
          const checked = value.minRating === r;
          return (
            <label key={r} className="fcheck">
              <input
                type="radio"
                name={`${uid}-rating`}
                checked={checked}
                onChange={() => onChange({ minRating: r })}
                onClick={() => checked && onChange({ minRating: null })}
                onKeyDown={(e) => {
                  if (checked && (e.key === ' ' || e.key === 'Enter')) {
                    e.preventDefault();
                    onChange({ minRating: null });
                  }
                }}
              />
              <span className="fcheck__box" aria-hidden="true" />
              <span className="fcheck__label">
                <Star size={14} className="star" aria-hidden="true" />
                Từ {r.toFixed(1)} trở lên
              </span>
              <span className="fcheck__count">({counts.rating[r]})</span>
            </label>
          );
        })}
      </Group>
    </div>
  );
}

function Group({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  const uid = useId();
  const [open, setOpen] = useState(true);
  return (
    <div className="filters__group">
      <h3 className="filters__gtitle">
        <button type="button" aria-expanded={open} aria-controls={uid} onClick={() => setOpen(!open)}>
          {title}
          <ChevronDown size={16} className="filters__chev" aria-hidden="true" />
        </button>
      </h3>
      <fieldset id={uid} className="filters__list" hidden={!open}>
        <legend className="sr-only">
          {title}
          {hint ? ` — ${hint}` : ''}
        </legend>
        {children}
      </fieldset>
    </div>
  );
}

function Check({
  label,
  count,
  checked,
  onChange,
}: {
  label: string;
  count: number;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="fcheck" data-empty={count === 0 && !checked ? '' : undefined}>
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span className="fcheck__box" aria-hidden="true" />
      <span className="fcheck__label">{label}</span>
      <span className="fcheck__count">({count})</span>
    </label>
  );
}

/** Two native range inputs sharing one track: mouse, touch and keyboard. */
export function PriceSlider({
  min,
  max,
  onChange,
  labelledBy,
}: {
  min: number;
  max: number;
  onChange: (min: number, max: number) => void;
  labelledBy?: string;
}) {
  const [draft, setDraft] = useState<[number, number] | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [a, b] = draft ?? [min, max];
  const span = PRICE_BOUNDS.max - PRICE_BOUNDS.min;
  const frac = (v: number) => (v - PRICE_BOUNDS.min) / span;
  const latest = useRef(draft);
  latest.current = draft;
  // Commit once the user pauses (keyboard) or releases (pointer); one URL change, not one per step.
  const commit = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const d = latest.current;
    if (d && (d[0] !== min || d[1] !== max)) onChange(d[0], d[1]);
  };
  const schedule = (next: [number, number]) => {
    setDraft(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(commit, 450);
  };
  // Drop the draft once the applied filter catches up (or is reset elsewhere).
  useEffect(() => {
    setDraft((d) => (d && d[0] === min && d[1] === max ? null : d && !timer.current ? null : d));
  }, [min, max]);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);
  const common = {
    min: PRICE_BOUNDS.min,
    max: PRICE_BOUNDS.max,
    step: PRICE_BOUNDS.step,
    onPointerUp: commit,
    onBlur: commit,
  };
  return (
    <div className="pslider" role="group" aria-labelledby={labelledBy}>
      <div className="pslider__track" style={{ '--a': frac(a), '--b': frac(b) } as React.CSSProperties}>
        <input
          type="range"
          {...common}
          value={a}
          aria-label="Giá tối thiểu"
          aria-valuetext={formatVnd(a)}
          onChange={(e) => schedule([Math.min(Number(e.target.value), b - PRICE_BOUNDS.step), b])}
        />
        <input
          type="range"
          {...common}
          value={b}
          aria-label="Giá tối đa"
          aria-valuetext={b >= PRICE_BOUNDS.max ? `${formatVnd(b)} trở lên` : formatVnd(b)}
          onChange={(e) => schedule([a, Math.max(Number(e.target.value), a + PRICE_BOUNDS.step)])}
        />
      </div>
      <p className="pslider__text" aria-live="polite">
        Từ {formatVnd(a)} đến {formatVnd(b)}
        {b >= PRICE_BOUNDS.max ? '+' : ''}
      </p>
    </div>
  );
}

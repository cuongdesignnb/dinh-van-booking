'use client';

import {
  ArrowUpDown,
  CalendarDays,
  ChevronDown,
  House,
  LayoutGrid,
  Search,
  Tag,
  UserRound,
} from 'lucide-react';
import { useCallback, useEffect, useId, useRef, useState, type ReactNode, type RefObject } from 'react';
import { DateRangePicker } from '@/components/ui/DateRangePicker';
import { GuestPicker } from '@/components/ui/GuestPicker';
import { Popover } from '@/components/ui/Popover';
import { AMENITIES, STAY_TYPES } from '@/lib/catalog/constants';
import type { AmenityId, StayType } from '@/data/types';
import { formatShort } from '@/lib/dates';
import { onFocusSearch } from '@/lib/events';
import { formatVnd } from '@/lib/format';
import { dateError, type Selection } from '@/lib/selection';
import { PRICE_BOUNDS, SORT_OPTIONS, type StayFilters } from '@/lib/stay-filters';

type Field = 'in' | 'out' | 'guests' | 'price' | 'types' | 'amenities' | 'sort';

const compact = (v: number) =>
  v === 0 ? '0đ' : v >= 1_000_000 ? `${String(Math.round(v / 100_000) / 10).replace('.', ',')}tr` : `${v / 1000}k`;

export const priceLabel = (f: Pick<StayFilters, 'priceMin' | 'priceMax'>) =>
  f.priceMin === PRICE_BOUNDS.min && f.priceMax === PRICE_BOUNDS.max
    ? 'Tất cả'
    : `${compact(f.priceMin)} – ${f.priceMax === PRICE_BOUNDS.max ? `${compact(f.priceMax)}+` : compact(f.priceMax)}`;

const multiLabel = (ids: string[], all: { id: string; label: string }[], unit: string) =>
  ids.length === 0 ? 'Tất cả' : ids.length === 1 ? all.find((a) => a.id === ids[0])!.label : `${ids.length} ${unit}`;

export const PRICE_PRESETS = [
  { label: 'Tất cả mức giá', min: PRICE_BOUNDS.min, max: PRICE_BOUNDS.max },
  { label: 'Dưới 700.000đ', min: PRICE_BOUNDS.min, max: 700000 },
  { label: '700.000đ – 1.000.000đ', min: 700000, max: 1000000 },
  { label: 'Từ 1.000.000đ trở lên', min: 1000000, max: PRICE_BOUNDS.max },
];

interface Props {
  selection: Selection;
  filters: StayFilters;
  onSearch: (sel: Selection) => void;
  onFilters: (patch: Partial<StayFilters>) => void;
}

export function StaySearchBar({ selection, filters, onSearch, onFilters }: Props) {
  const uid = useId();
  const [sel, setSel] = useState(selection);
  const [open, setOpen] = useState<Field | null>(null);
  const [error, setError] = useState<{ field: 'in' | 'out'; message: string } | null>(null);
  const [pulse, setPulse] = useState(0);
  const refs = {
    in: useRef<HTMLButtonElement>(null),
    out: useRef<HTMLButtonElement>(null),
    guests: useRef<HTMLButtonElement>(null),
    price: useRef<HTMLButtonElement>(null),
    types: useRef<HTMLButtonElement>(null),
    amenities: useRef<HTMLButtonElement>(null),
    sort: useRef<HTMLButtonElement>(null),
  } satisfies Record<Field, RefObject<HTMLButtonElement | null>>;
  const formRef = useRef<HTMLFormElement>(null);

  const selKey = JSON.stringify(selection);
  // Re-sync the draft only when the applied selection really changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setSel(selection), [selKey]);

  useEffect(
    () =>
      onFocusSearch(() => {
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        formRef.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
        refs.in.current?.focus({ preventScroll: true });
        setPulse((p) => p + 1);
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const close = useCallback(
    (reason?: 'escape' | 'outside' | 'tab') => {
      setOpen((cur) => {
        if (cur && reason !== 'outside' && reason !== 'tab') {
          const key = cur === 'out' ? 'out' : cur;
          requestAnimationFrame(() => refs[key].current?.focus());
        }
        return null;
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (sel.checkIn || sel.checkOut) {
      const err = dateError(sel);
      if (err) {
        setError(err);
        refs[err.field].current?.focus();
        return;
      }
    }
    setError(null);
    onSearch(sel);
  };

  const field = (
    key: Field,
    label: string,
    value: string,
    icon: ReactNode,
    opts: { chevron?: boolean; filled?: boolean; invalid?: boolean } = {},
  ) => (
    <div className={`sbar__field sbar__field--${key}`}>
      <span className="sbar__icon" aria-hidden="true">
        {icon}
      </span>
      <button
        ref={refs[key]}
        type="button"
        className="sbar__trigger"
        aria-haspopup="dialog"
        aria-expanded={open === key}
        aria-controls={`${uid}-${key === 'out' ? 'in' : key}`}
        data-invalid={opts.invalid || undefined}
        aria-describedby={opts.invalid ? `${uid}-err` : undefined}
        aria-labelledby={`${uid}-${key}-l ${uid}-${key}-v`}
        onClick={() => setOpen(open === key ? null : key)}
      >
        <span className="sbar__label" id={`${uid}-${key}-l`}>
          {label}
        </span>
        <span className="sbar__value" id={`${uid}-${key}-v`} data-filled={opts.filled || undefined}>
          {value}
        </span>
        {opts.chevron && <ChevronDown className="sbar__chev" size={17} aria-hidden="true" />}
      </button>
    </div>
  );

  const priceActive = filters.priceMin !== PRICE_BOUNDS.min || filters.priceMax !== PRICE_BOUNDS.max;

  return (
    <form
      ref={formRef}
      className="sbar"
      id="tim-phong"
      role="search"
      aria-label="Tìm phòng nghỉ"
      onSubmit={submit}
      noValidate
      data-pulse={pulse ? (pulse % 2 ? 'a' : 'b') : undefined}
    >
      <div className="sbar__fields">
        {field('in', 'Ngày nhận phòng', sel.checkIn ? formatShort(sel.checkIn) : 'Chọn ngày', <CalendarDays size={22} strokeWidth={1.8} />, {
          filled: !!sel.checkIn,
          invalid: error?.field === 'in',
        })}
        {field('out', 'Ngày trả phòng', sel.checkOut ? formatShort(sel.checkOut) : 'Chọn ngày', <CalendarDays size={22} strokeWidth={1.8} />, {
          filled: !!sel.checkOut,
          invalid: error?.field === 'out',
        })}
        {field('guests', 'Số khách', `${sel.adults + sel.children} khách${sel.rooms > 1 ? `, ${sel.rooms} phòng` : ''}`, <UserRound size={22} strokeWidth={1.8} />, {
          chevron: true,
        })}
        {field('price', 'Khoảng giá', priceLabel(filters), <Tag size={21} strokeWidth={1.8} />, {
          chevron: true,
          filled: priceActive,
        })}
        {field('types', 'Loại lưu trú', multiLabel(filters.types, STAY_TYPES, 'loại'), <House size={22} strokeWidth={1.8} />, {
          chevron: true,
          filled: filters.types.length > 0,
        })}
        {field('amenities', 'Tiện ích', multiLabel(filters.amenities, AMENITIES, 'tiện ích'), <LayoutGrid size={22} strokeWidth={1.8} />, {
          chevron: true,
          filled: filters.amenities.length > 0,
        })}
        {field('sort', 'Sắp xếp', SORT_OPTIONS.find((o) => o.id === filters.sort)!.label, <ArrowUpDown size={20} strokeWidth={1.8} />, {
          chevron: true,
        })}
      </div>
      <button type="submit" className="sbar__submit btn-shine" data-magnetic>
        <Search size={21} strokeWidth={2} aria-hidden="true" />
        <span>Tìm phòng</span>
      </button>

      {error && (
        <p id={`${uid}-err`} className="sbar__error" role="alert">
          {error.message}
        </p>
      )}

      <Popover
        id={`${uid}-in`}
        label="Chọn ngày lưu trú"
        anchorRef={open === 'out' ? refs.out : refs.in}
        open={open === 'in' || open === 'out'}
        onClose={close}
      >
        <DateRangePicker
          checkIn={sel.checkIn}
          checkOut={sel.checkOut}
          field={open === 'out' ? 'out' : 'in'}
          onFieldChange={(f) => setOpen(f)}
          onChange={(checkIn, checkOut) => {
            setSel((s) => ({ ...s, checkIn, checkOut }));
            setError(null);
          }}
          onDone={() => close()}
        />
      </Popover>

      <Popover id={`${uid}-guests`} label="Chọn số khách" anchorRef={refs.guests} open={open === 'guests'} onClose={close}>
        <GuestPicker
          adults={sel.adults}
          childCount={sel.children}
          rooms={sel.rooms}
          onChange={(adults, children, rooms) => setSel((s) => ({ ...s, adults, children, rooms: rooms ?? s.rooms }))}
          onDone={() => close()}
        />
      </Popover>

      <Popover id={`${uid}-price`} label="Chọn khoảng giá" anchorRef={refs.price} open={open === 'price'} onClose={close}>
        <PricePanel
          filters={filters}
          onApply={(min, max) => {
            onFilters({ priceMin: min, priceMax: max });
            close();
          }}
        />
      </Popover>

      <Popover id={`${uid}-types`} label="Chọn loại lưu trú" anchorRef={refs.types} open={open === 'types'} onClose={close}>
        <CheckPanel<StayType>
          title="Loại lưu trú"
          options={STAY_TYPES}
          value={filters.types}
          onApply={(types) => {
            onFilters({ types });
            close();
          }}
        />
      </Popover>

      <Popover
        id={`${uid}-amenities`}
        label="Chọn tiện ích"
        anchorRef={refs.amenities}
        open={open === 'amenities'}
        onClose={close}
      >
        <CheckPanel<AmenityId>
          title="Tiện ích"
          options={AMENITIES}
          value={filters.amenities}
          onApply={(amenities) => {
            onFilters({ amenities });
            close();
          }}
        />
      </Popover>

      <Popover id={`${uid}-sort`} label="Sắp xếp kết quả" anchorRef={refs.sort} open={open === 'sort'} onClose={close} align="end">
        <fieldset className="opt-list">
          <legend className="opt-list__title">Sắp xếp theo</legend>
          {SORT_OPTIONS.map((o) => (
            <label key={o.id} className="opt">
              <input
                type="radio"
                name={`${uid}-sort`}
                checked={filters.sort === o.id}
                onChange={() => {
                  onFilters({ sort: o.id });
                  close();
                }}
              />
              <span>{o.label}</span>
            </label>
          ))}
        </fieldset>
      </Popover>
    </form>
  );
}

function PricePanel({ filters, onApply }: { filters: StayFilters; onApply: (min: number, max: number) => void }) {
  const uid = useId();
  const [min, setMin] = useState(String(filters.priceMin));
  const [max, setMax] = useState(filters.priceMax === PRICE_BOUNDS.max ? '' : String(filters.priceMax));
  const [err, setErr] = useState<string | null>(null);
  const apply = (a: number, b: number) => {
    if (!Number.isFinite(a) || !Number.isFinite(b) || a < PRICE_BOUNDS.min || b < a) {
      setErr('Khoảng giá chưa hợp lệ: giá tối thiểu từ 0đ và không lớn hơn giá tối đa.');
      return;
    }
    onApply(a, Math.min(b, PRICE_BOUNDS.max));
  };
  return (
    <div className="opt-list">
      <p className="opt-list__title">Khoảng giá (đêm)</p>
      <div className="opt-list__presets">
        {PRICE_PRESETS.map((p) => (
          <button key={p.label} type="button" className="chip-btn" onClick={() => onApply(p.min, p.max)}>
            {p.label}
          </button>
        ))}
      </div>
      <div className="opt-list__range">
        <label className="field">
          <span className="field__label">Từ (đ)</span>
          <input
            className="field__input"
            inputMode="numeric"
            value={min}
            aria-describedby={err ? `${uid}-e` : undefined}
            onChange={(e) => setMin(e.target.value.replace(/\D/g, ''))}
          />
        </label>
        <label className="field">
          <span className="field__label">Đến (đ)</span>
          <input
            className="field__input"
            inputMode="numeric"
            value={max}
            placeholder="Không giới hạn"
            aria-describedby={err ? `${uid}-e` : undefined}
            onChange={(e) => setMax(e.target.value.replace(/\D/g, ''))}
          />
        </label>
      </div>
      <p className="opt-list__hint">
        {formatVnd(PRICE_BOUNDS.min)} – {formatVnd(PRICE_BOUNDS.max)}+
      </p>
      {err && (
        <p id={`${uid}-e`} className="field__error" role="alert">
          {err}
        </p>
      )}
      <div className="calendar__foot">
        <button type="button" className="text-btn" onClick={() => onApply(PRICE_BOUNDS.min, PRICE_BOUNDS.max)}>
          Xóa
        </button>
        <button
          type="button"
          className="text-btn text-btn--strong"
          onClick={() => apply(Number(min || PRICE_BOUNDS.min), max ? Number(max) : PRICE_BOUNDS.max)}
        >
          Áp dụng
        </button>
      </div>
    </div>
  );
}

function CheckPanel<T extends string>({
  title,
  options,
  value,
  onApply,
}: {
  title: string;
  options: { id: T; label: string }[];
  value: T[];
  onApply: (v: T[]) => void;
}) {
  const [draft, setDraft] = useState<T[]>(value);
  return (
    <fieldset className="opt-list">
      <legend className="opt-list__title">{title}</legend>
      {options.map((o) => (
        <label key={o.id} className="opt">
          <input
            type="checkbox"
            checked={draft.includes(o.id)}
            onChange={(e) => setDraft((d) => (e.target.checked ? [...d, o.id] : d.filter((x) => x !== o.id)))}
          />
          <span>{o.label}</span>
        </label>
      ))}
      <div className="calendar__foot">
        <button type="button" className="text-btn" onClick={() => setDraft([])}>
          Bỏ chọn
        </button>
        <button type="button" className="text-btn text-btn--strong" onClick={() => onApply(draft)}>
          Áp dụng
        </button>
      </div>
    </fieldset>
  );
}

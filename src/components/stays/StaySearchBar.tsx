'use client';

import { CalendarDays, ChevronDown, Search, UserRound } from 'lucide-react';
import { useCallback, useEffect, useId, useRef, useState, type ReactNode, type RefObject } from 'react';
import { DateRangePicker } from '@/components/ui/DateRangePicker';
import { GuestPicker } from '@/components/ui/GuestPicker';
import { Popover } from '@/components/ui/Popover';
import { formatShort } from '@/lib/dates';
import { onFocusSearch } from '@/lib/events';
import { dateError, type Selection } from '@/lib/selection';
import { PRICE_BOUNDS, type StayFilters } from '@/lib/stay-filters';

type Field = 'in' | 'out' | 'guests';

const compact = (v: number) =>
  v === 0 ? '0đ' : v >= 1_000_000 ? `${String(Math.round(v / 100_000) / 10).replace('.', ',')}tr` : `${v / 1000}k`;

export const priceLabel = (f: Pick<StayFilters, 'priceMin' | 'priceMax'>) =>
  f.priceMin === PRICE_BOUNDS.min && f.priceMax === PRICE_BOUNDS.max
    ? 'Tất cả'
    : `${compact(f.priceMin)} – ${f.priceMax === PRICE_BOUNDS.max ? `${compact(f.priceMax)}+` : compact(f.priceMax)}`;

interface Props {
  selection: Selection;
  onSearch: (sel: Selection) => void;
}

/** Dates and guests only; price, type, amenities and sort live in the filter panel / results toolbar. */
export function StaySearchBar({ selection, onSearch }: Props) {
  const uid = useId();
  const [sel, setSel] = useState(selection);
  const [open, setOpen] = useState<Field | null>(null);
  const [error, setError] = useState<{ field: 'in' | 'out'; message: string } | null>(null);
  const [pulse, setPulse] = useState(0);
  const refs = {
    in: useRef<HTMLButtonElement>(null),
    out: useRef<HTMLButtonElement>(null),
    guests: useRef<HTMLButtonElement>(null),
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

    </form>
  );
}

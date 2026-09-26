'use client';

import { ArrowRight, CalendarDays, ChevronDown, ShieldCheck } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { DateRangePicker } from '@/components/ui/DateRangePicker';
import { GuestPicker } from '@/components/ui/GuestPicker';
import { Popover } from '@/components/ui/Popover';
import { fromPrice } from '@/lib/catalog/pricing';
import { formatShort } from '@/lib/dates';
import { formatVnd } from '@/lib/format';
import { nights } from '@/lib/selection';
import { useBooking } from './BookingContext';

export const ROOMS_ANCHOR = 'cac-loai-phong';

export function BookingCard() {
  const { stay, selection, room, issue, setSelection, proceed } = useBooking();
  const uid = useId();
  const [open, setOpen] = useState<null | 'in' | 'out' | 'guests'>(null);
  const inRef = useRef<HTMLButtonElement>(null);
  const outRef = useRef<HTMLButtonElement>(null);
  const guestRef = useRef<HTMLButtonElement>(null);
  const n = nights(selection);

  useEffect(() => {
    if (issue?.kind === 'dates') (issue.field === 'in' ? inRef : outRef).current?.focus();
  }, [issue]);

  const go = () => {
    const next = proceed();
    if (next?.kind === 'room') {
      const target = document.getElementById(ROOMS_ANCHOR);
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      target?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      target?.querySelector<HTMLElement>('h2')?.focus({ preventScroll: true });
    }
  };

  const errId = `${uid}-err`;
  const dateInvalid = issue?.kind === 'dates';
  return (
    <section className="bcard" id="dat-phong" aria-labelledby={`${uid}-t`}>
      <h2 className="sr-only" id={`${uid}-t`}>
        Đặt phòng {stay.name}
      </h2>
      <p className="bcard__price" aria-live="polite">
        {room ? (
          <>
            <strong>{formatVnd(room.pricePerNight)}</strong> <span>/ đêm</span>
            <em className="bcard__room">{room.name}</em>
          </>
        ) : (
          <>
            Từ <strong>{formatVnd(fromPrice(stay))}</strong> <span>/ đêm</span>
          </>
        )}
      </p>
      <p className="bcard__badge">
        <ShieldCheck size={15} aria-hidden="true" /> Giá theo hạng phòng đã xuất bản
      </p>

      <div className="bcard__dates">
        {(
          [
            ['in', inRef, 'Ngày nhận phòng', selection.checkIn],
            ['out', outRef, 'Ngày trả phòng', selection.checkOut],
          ] as const
        ).map(([key, ref, label, value]) => (
          <button
            key={key}
            ref={ref}
            type="button"
            className="bfield"
            data-invalid={(dateInvalid && issue.field === key) || undefined}
            aria-haspopup="dialog"
            aria-expanded={open === key}
            aria-describedby={dateInvalid && issue.field === key ? errId : undefined}
            onClick={() => setOpen(open === key ? null : key)}
          >
            <span className="bfield__label">{label}</span>
            <span className="bfield__value" data-filled={value ? '' : undefined}>
              {value ? formatShort(value) : 'Chọn ngày'}
            </span>
            <CalendarDays className="bfield__icon" size={19} aria-hidden="true" />
          </button>
        ))}
      </div>
      <button
        ref={guestRef}
        type="button"
        className="bfield bfield--wide"
        aria-haspopup="dialog"
        aria-expanded={open === 'guests'}
        onClick={() => setOpen(open === 'guests' ? null : 'guests')}
      >
        <span className="bfield__label">Số khách</span>
        <span className="bfield__value">
          {selection.adults + selection.children} khách
          {selection.rooms > 1 ? ` · ${selection.rooms} phòng` : ''}
        </span>
        <ChevronDown className="bfield__icon" size={18} aria-hidden="true" />
      </button>

      {issue && (
        <p id={errId} className="bcard__error" role="alert">
          {issue.message}
        </p>
      )}
      {room && n > 0 && !issue && (
        <p className="bcard__est">
          {formatVnd(room.pricePerNight)} × {n} đêm × {selection.rooms} phòng ≈{' '}
          <b>{formatVnd(room.pricePerNight * n * selection.rooms)}</b> (tham khảo)
        </p>
      )}

      <button type="button" className="btn btn--primary bcard__cta btn-shine" data-magnetic onClick={go}>
        Đặt phòng ngay <ArrowRight size={17} aria-hidden="true" />
      </button>

      <div className="bcard__info">
        <ShieldCheck size={24} className="bcard__info-ic" aria-hidden="true" />
        <p>
          <strong>Không cần thanh toán ngay</strong>
          <span>Xác nhận phòng khi tư vấn</span>
        </p>
      </div>

      <Popover
        id={`${uid}-dates`}
        label="Chọn ngày lưu trú"
        anchorRef={open === 'out' ? outRef : inRef}
        open={open === 'in' || open === 'out'}
        onClose={(reason) => {
          const back = open === 'out' ? outRef : inRef;
          setOpen(null);
          if (reason === 'escape') back.current?.focus();
        }}
        align="end"
      >
        <DateRangePicker
          checkIn={selection.checkIn}
          checkOut={selection.checkOut}
          field={open === 'out' ? 'out' : 'in'}
          onFieldChange={(f) => setOpen(f)}
          onChange={(checkIn, checkOut) => setSelection({ ...selection, checkIn, checkOut })}
          onDone={() => setOpen(null)}
        />
      </Popover>
      <Popover
        id={`${uid}-guests`}
        label="Chọn số khách"
        anchorRef={guestRef}
        open={open === 'guests'}
        onClose={(reason) => {
          setOpen(null);
          if (reason === 'escape') guestRef.current?.focus();
        }}
        align="end"
      >
        <GuestPicker
          adults={selection.adults}
          childCount={selection.children}
          rooms={selection.rooms}
          onChange={(adults, children, rooms) =>
            setSelection({ ...selection, adults, children, rooms: rooms ?? selection.rooms })
          }
          onDone={() => {
            setOpen(null);
            guestRef.current?.focus();
          }}
        />
      </Popover>
    </section>
  );
}

/** Mobile bottom bar: same state, scrolls to the booking card. */
export function MobileBookingBar() {
  const { stay, room } = useBooking();
  return (
    <div className="mbar">
      <div className="mbar__price">
        <p>
          {room ? '' : 'Từ '}
          <strong>{formatVnd(room ? room.pricePerNight : fromPrice(stay))}</strong> / đêm
        </p>
        {room && <p className="mbar__room">{room.name}</p>}
      </div>
      <a className="btn btn--primary mbar__cta" href="#dat-phong">
        Đặt phòng <ArrowRight size={16} aria-hidden="true" />
      </a>
    </div>
  );
}

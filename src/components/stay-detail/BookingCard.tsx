'use client';

import { ArrowRight, CalendarDays, ChevronDown, MessageCircle, ShieldCheck, UserRound } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';
import { RichContentRenderer } from '@/components/content/RichContentRenderer';
import { useSiteData } from '@/components/site/SiteDataProvider';
import { DateRangePicker } from '@/components/ui/DateRangePicker';
import { GuestPicker } from '@/components/ui/GuestPicker';
import { Popover } from '@/components/ui/Popover';
import { fromPrice, hasContactOnlyRooms } from '@/lib/catalog/pricing';
import { stayContactHref } from '@/lib/contact/stay-contact';
import { formatShort } from '@/lib/dates';
import { formatVnd } from '@/lib/format';
import { nights } from '@/lib/selection';
import { publicSetting, richDocumentHasContent } from '@/lib/public-content';
import type { RichDocument } from '@/lib/content/rich-document';
import { useBooking } from './BookingContext';
import { AdvisorMini, useAdvisorAskLabel } from './StayPageParts';

export const ROOMS_ANCHOR = 'cac-loai-phong';

export function BookingCard() {
  const { stay, selection, room, issue, setSelection, proceed } = useBooking();
  const site = useSiteData();
  const bookingNote = publicSetting(site.publicSite, 'catalog.stayDetail').bookingNote;
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
  const bookable = fromPrice(stay) > 0;
  const askLabel = useAdvisorAskLabel();
  const contactHref = stayContactHref(stay.slug, selection, room?.id);
  const guests = `${selection.adults} người lớn${selection.children ? ` · ${selection.children} trẻ em` : ''} · ${selection.rooms} phòng`;
  return (
    <section className="bcard stp-book" id="dat-phong" aria-labelledby={`${uid}-t`}>
      <h2 className="stp-book__title" id={`${uid}-t`}>
        Tìm phòng cho chuyến đi
      </h2>
      {room ? (
        <p className="stp-book__room" aria-live="polite">
          Đã chọn <b>{room.name}</b>
          {room.pricePerNight > 0 ? <> · {formatVnd(room.pricePerNight)} / đêm</> : <> · Liên hệ báo giá</>}
        </p>
      ) : bookable && (
        <p className="stp-book__room" aria-live="polite">
          Từ <b>{formatVnd(fromPrice(stay))}</b> / đêm
        </p>
      )}

      <div className="bcard__dates">
        {(
          [
            ['in', inRef, 'Nhận phòng', selection.checkIn],
            ['out', outRef, 'Trả phòng', selection.checkOut],
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
        className="bfield bfield--wide stp-book__guests"
        aria-haspopup="dialog"
        aria-expanded={open === 'guests'}
        aria-label={`Số khách: ${guests}`}
        onClick={() => setOpen(open === 'guests' ? null : 'guests')}
      >
        <UserRound className="stp-book__guest-ic" size={18} aria-hidden="true" />
        <span className="bfield__value">{guests}</span>
        <ChevronDown className="bfield__icon" size={18} aria-hidden="true" />
      </button>

      {issue && (
        <p id={errId} className="bcard__error" role="alert">
          {issue.message}
        </p>
      )}
      {room && room.pricePerNight > 0 && n > 0 && !issue && (
        <p className="bcard__est">
          {formatVnd(room.pricePerNight)} × {n} đêm × {selection.rooms} phòng ≈{' '}
          <b>{formatVnd(room.pricePerNight * n * selection.rooms)}</b> (tham khảo)
        </p>
      )}
      {!room && bookable && hasContactOnlyRooms(stay) && <p className="bcard__contact-note">Một số hạng khác cần liên hệ để nhận giá.</p>}

      {bookable
        ? <button type="button" className="btn btn--primary bcard__cta" onClick={go}>
            Kiểm tra phòng trống <ArrowRight size={17} aria-hidden="true" />
          </button>
        : <Link className="btn btn--primary bcard__cta" href={contactHref}>
            Gửi yêu cầu nhận giá <ArrowRight size={17} aria-hidden="true" />
          </Link>}
      <Link className="btn stp-book__ask" href={contactHref}>
        <MessageCircle size={18} aria-hidden="true" /> {askLabel}
      </Link>
      <p className="stp-book__note">Giá và phòng được xác nhận trước khi đặt.</p>

      {richDocumentHasContent(bookingNote) && <div className="bcard__info"><ShieldCheck size={24} className="bcard__info-ic" aria-hidden="true" /><div><RichContentRenderer document={bookingNote as RichDocument} /></div></div>}

      <AdvisorMini />

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
  const { stay, room, selection } = useBooking();
  const price = room ? room.pricePerNight : fromPrice(stay);
  if (price <= 0) return <div className="mbar"><div className="mbar__price"><strong>Liên hệ để nhận giá</strong></div><Link className="btn btn--primary mbar__cta" href={stayContactHref(stay.slug, selection, room?.id)}>Liên hệ <ArrowRight size={16} aria-hidden="true" /></Link></div>;
  return (
    <div className="mbar">
      <div className="mbar__price">
        <p>
          {room ? '' : 'Từ '}
          <strong>{formatVnd(price)}</strong> / đêm
        </p>
        {room && <p className="mbar__room">{room.name}</p>}
      </div>
      <a className="btn btn--primary mbar__cta" href="#dat-phong">
        Đặt phòng <ArrowRight size={16} aria-hidden="true" />
      </a>
    </div>
  );
}

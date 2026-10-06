'use client';

import { CalendarDays, ChevronDown, House, MapPin, Search, UserRound } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { DateRangePicker } from '@/components/ui/DateRangePicker';
import { GuestPicker } from '@/components/ui/GuestPicker';
import { Popover } from '@/components/ui/Popover';
import { formatShort } from '@/lib/dates';
import { onFocusSearch } from '@/lib/events';
import { selectionQuery } from '@/lib/selection';
import { useSiteData } from '@/components/site/SiteDataProvider';

type Open = null | 'in' | 'out' | 'guests';
export type SearchOption = { value: string; label: string };

/**
 * Homepage search card: where, check-in, check-out, guests, stay type.
 * Area and type options come from the published stays, so every choice can
 * return results. Dates are optional for browsing; when both are chosen and
 * public availability is enabled the search goes to /lich-phong.
 */
export function BookingSearch({ areas = [], types = [], areaLabel = '' }: { areas?: SearchOption[]; types?: SearchOption[]; areaLabel?: string }) {
  const availabilityEnabled = useSiteData().publicSite.features?.publicAvailability === true;
  const uid = useId();
  const router = useRouter();
  const [area, setArea] = useState('');
  const [type, setType] = useState('');
  const [checkIn, setCheckIn] = useState<string | null>(null);
  const [checkOut, setCheckOut] = useState<string | null>(null);
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [open, setOpen] = useState<Open>(null);
  const [error, setError] = useState<{ field: 'in' | 'out'; message: string } | null>(null);
  const [pulse, setPulse] = useState(0);

  const formRef = useRef<HTMLFormElement>(null);
  const firstRef = useRef<HTMLSelectElement>(null);
  const inRef = useRef<HTMLButtonElement>(null);
  const outRef = useRef<HTMLButtonElement>(null);
  const guestRef = useRef<HTMLButtonElement>(null);
  const datesAnchor = open === 'out' ? outRef : inRef;

  useEffect(
    () =>
      onFocusSearch(() => {
        const form = formRef.current;
        if (!form) return;
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        form.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
        (firstRef.current ?? inRef.current)?.focus({ preventScroll: true });
        setPulse((p) => p + 1);
      }),
    [],
  );

  const closeDates = useCallback(
    (reason?: 'escape' | 'outside' | 'tab') => {
      const back = open === 'out' ? outRef : inRef;
      setOpen(null);
      if (reason !== 'outside' && reason !== 'tab') back.current?.focus();
    },
    [open],
  );
  const closeGuests = useCallback((reason?: 'escape' | 'outside' | 'tab') => {
    setOpen(null);
    if (reason !== 'outside' && reason !== 'tab') guestRef.current?.focus();
  }, []);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (checkIn && !checkOut) {
      setError({ field: 'out', message: 'Vui lòng chọn ngày trả phòng.' });
      outRef.current?.focus();
      return;
    }
    if (checkIn && checkOut && checkOut <= checkIn) {
      setError({ field: 'out', message: 'Ngày trả phòng phải sau ngày nhận phòng.' });
      outRef.current?.focus();
      return;
    }
    setError(null);
    const query = new URLSearchParams(selectionQuery({ checkIn, checkOut, adults, children, rooms: 1 }));
    if (availabilityEnabled && checkIn && checkOut) {
      router.push(`/lich-phong?${query}`);
      return;
    }
    if (area) query.set('area', area);
    if (type) query.set('types', type);
    router.push(`/phong-nghi?${query}`);
  };

  const errId = `${uid}-err`;
  const showArea = areas.length > 0 || !!areaLabel;

  return (
    <form
      ref={formRef}
      id="tim-phong"
      className="hs"
      data-pulse={pulse % 2 === 1 ? 'a' : pulse > 0 ? 'b' : undefined}
      onSubmit={onSubmit}
      noValidate
      aria-label="Tìm nơi lưu trú"
    >
      {showArea && <label className="hs__field hs__field--where">
        <MapPin className="hs__icon" size={24} strokeWidth={1.8} aria-hidden="true" />
        <span className="hs__text">
          <span className="hs__label">Bạn muốn đi đâu?</span>
          <select ref={firstRef} className="hs__select" value={area} onChange={(e) => setArea(e.target.value)}>
            <option value="">{areaLabel || 'Tất cả khu vực'}</option>
            {areas.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </span>
        <ChevronDown className="hs__chev" size={18} aria-hidden="true" />
      </label>}

      <div className="hs__field">
        <CalendarDays className="hs__icon" size={24} strokeWidth={1.8} aria-hidden="true" />
        <button
          ref={inRef}
          type="button"
          className="hs__trigger"
          aria-haspopup="dialog"
          aria-expanded={open === 'in'}
          aria-controls={`${uid}-dates`}
          aria-invalid={error?.field === 'in' || undefined}
          aria-describedby={error?.field === 'in' ? errId : undefined}
          aria-labelledby={`${uid}-in-l ${uid}-in-v`}
          onClick={() => setOpen(open === 'in' ? null : 'in')}
        >
          <span className="hs__label" id={`${uid}-in-l`}>Ngày nhận phòng</span>
          <span className="hs__value" id={`${uid}-in-v`} data-empty={!checkIn || undefined}>{checkIn ? formatShort(checkIn) : 'Chọn ngày'}</span>
        </button>
      </div>

      <div className="hs__field">
        <CalendarDays className="hs__icon" size={24} strokeWidth={1.8} aria-hidden="true" />
        <button
          ref={outRef}
          type="button"
          className="hs__trigger"
          aria-haspopup="dialog"
          aria-expanded={open === 'out'}
          aria-controls={`${uid}-dates`}
          aria-invalid={error?.field === 'out' || undefined}
          aria-describedby={error?.field === 'out' ? errId : undefined}
          aria-labelledby={`${uid}-out-l ${uid}-out-v`}
          onClick={() => setOpen(open === 'out' ? null : 'out')}
        >
          <span className="hs__label" id={`${uid}-out-l`}>Ngày trả phòng</span>
          <span className="hs__value" id={`${uid}-out-v`} data-empty={!checkOut || undefined}>{checkOut ? formatShort(checkOut) : 'Chọn ngày'}</span>
        </button>
      </div>

      <div className="hs__field">
        <UserRound className="hs__icon" size={24} strokeWidth={1.8} aria-hidden="true" />
        <button
          ref={guestRef}
          type="button"
          className="hs__trigger"
          aria-haspopup="dialog"
          aria-expanded={open === 'guests'}
          aria-controls={`${uid}-guests`}
          aria-labelledby={`${uid}-g-l ${uid}-g-v`}
          onClick={() => setOpen(open === 'guests' ? null : 'guests')}
        >
          <span className="hs__label" id={`${uid}-g-l`}>Số khách</span>
          <span className="hs__value" id={`${uid}-g-v`}>{adults + children} khách</span>
        </button>
        <ChevronDown className="hs__chev" size={18} aria-hidden="true" />
      </div>

      {types.length > 0 && <label className="hs__field">
        <House className="hs__icon" size={24} strokeWidth={1.8} aria-hidden="true" />
        <span className="hs__text">
          <span className="hs__label">Loại lưu trú</span>
          <select className="hs__select" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">Tất cả</option>
            {types.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </span>
        <ChevronDown className="hs__chev" size={18} aria-hidden="true" />
      </label>}

      <button type="submit" className="hs__submit">
        <Search size={22} strokeWidth={2.2} aria-hidden="true" />
        <span>Tìm kiếm</span>
      </button>

      {error && <p id={errId} className="hs__error" role="alert">{error.message}</p>}

      <Popover id={`${uid}-dates`} label="Chọn ngày lưu trú" anchorRef={datesAnchor} open={open === 'in' || open === 'out'} onClose={closeDates}>
        <DateRangePicker
          checkIn={checkIn}
          checkOut={checkOut}
          field={open === 'out' ? 'out' : 'in'}
          onFieldChange={(f) => setOpen(f)}
          onChange={(a, b) => {
            setCheckIn(a);
            setCheckOut(b);
            setError(null);
          }}
          onDone={() => closeDates()}
        />
      </Popover>

      <Popover id={`${uid}-guests`} label="Chọn số khách" anchorRef={guestRef} open={open === 'guests'} onClose={closeGuests} align="start">
        <GuestPicker
          adults={adults}
          childCount={children}
          onChange={(a, c) => {
            setAdults(a);
            setChildren(c);
          }}
          onDone={() => closeGuests()}
        />
      </Popover>
    </form>
  );
}

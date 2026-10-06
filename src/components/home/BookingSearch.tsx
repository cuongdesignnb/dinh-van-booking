'use client';

import { CalendarDays, ChevronDown, Search, UserRound } from 'lucide-react';
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

export function BookingSearch() {
  const availabilityEnabled = useSiteData().publicSite.features?.publicAvailability === true;
  const uid = useId();
  const router = useRouter();
  const [checkIn, setCheckIn] = useState<string | null>(null);
  const [checkOut, setCheckOut] = useState<string | null>(null);
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [open, setOpen] = useState<Open>(null);
  const [error, setError] = useState<{ field: 'in' | 'out'; message: string } | null>(null);
  const [pulse, setPulse] = useState(0);

  const formRef = useRef<HTMLFormElement>(null);
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
        inRef.current?.focus({ preventScroll: true });
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
    if (!checkIn) {
      setError({ field: 'in', message: 'Vui lòng chọn ngày nhận phòng.' });
      inRef.current?.focus();
      return;
    }
    if (!checkOut) {
      setError({ field: 'out', message: 'Vui lòng chọn ngày trả phòng.' });
      outRef.current?.focus();
      return;
    }
    if (checkOut <= checkIn) {
      setError({ field: 'out', message: 'Ngày trả phòng phải sau ngày nhận phòng.' });
      outRef.current?.focus();
      return;
    }
    setError(null);
    const submitter = (e.nativeEvent as SubmitEvent).submitter;
    const browse = submitter instanceof HTMLButtonElement && submitter.value === 'browse';
    const route = availabilityEnabled && !browse ? '/lich-phong' : '/phong-nghi';
    router.push(`${route}?${selectionQuery({ checkIn, checkOut, adults, children, rooms: 1 })}`);
  };

  const errId = `${uid}-err`;
  const guestsLabel = `${adults + children} khách`;

  return (
    <form
      ref={formRef}
      id="tim-phong"
      className="search"
      data-pulse={pulse % 2 === 1 ? 'a' : pulse > 0 ? 'b' : undefined}
      onSubmit={onSubmit}
      noValidate
      aria-label="Tìm phòng nghỉ"
    >
      <input type="hidden" name="checkIn" value={checkIn ?? ''} />
      <input type="hidden" name="checkOut" value={checkOut ?? ''} />
      <input type="hidden" name="adults" value={adults} />
      <input type="hidden" name="children" value={children} />

      <div className="search__field">
        <span className="search__icon" aria-hidden="true">
          <CalendarDays size={24} strokeWidth={1.8} />
        </span>
        <button
          ref={inRef}
          type="button"
          className="search__trigger"
          aria-haspopup="dialog"
          aria-expanded={open === 'in'}
          aria-controls={`${uid}-dates`}
          aria-invalid={error?.field === 'in' || undefined}
          aria-describedby={error?.field === 'in' ? errId : undefined}
          aria-labelledby={`${uid}-in-l ${uid}-in-v`}
          onClick={() => setOpen(open === 'in' ? null : 'in')}
        >
          <span className="search__label" id={`${uid}-in-l`}>
            Ngày nhận phòng
          </span>
          <span className="search__value" id={`${uid}-in-v`} data-filled={!!checkIn || undefined}>
            {checkIn ? formatShort(checkIn) : 'Chọn ngày'}
          </span>
        </button>
      </div>

      <span className="search__sep" aria-hidden="true" />

      <div className="search__field">
        <span className="search__icon" aria-hidden="true">
          <CalendarDays size={24} strokeWidth={1.8} />
        </span>
        <button
          ref={outRef}
          type="button"
          className="search__trigger"
          aria-haspopup="dialog"
          aria-expanded={open === 'out'}
          aria-controls={`${uid}-dates`}
          aria-invalid={error?.field === 'out' || undefined}
          aria-describedby={error?.field === 'out' ? errId : undefined}
          aria-labelledby={`${uid}-out-l ${uid}-out-v`}
          onClick={() => setOpen(open === 'out' ? null : 'out')}
        >
          <span className="search__label" id={`${uid}-out-l`}>
            Ngày trả phòng
          </span>
          <span className="search__value" id={`${uid}-out-v`} data-filled={!!checkOut || undefined}>
            {checkOut ? formatShort(checkOut) : 'Chọn ngày'}
          </span>
        </button>
      </div>

      <span className="search__sep" aria-hidden="true" />

      <div className="search__field search__field--guests">
        <span className="search__icon" aria-hidden="true">
          <UserRound size={24} strokeWidth={1.8} />
        </span>
        <button
          ref={guestRef}
          type="button"
          className="search__trigger"
          aria-haspopup="dialog"
          aria-expanded={open === 'guests'}
          aria-controls={`${uid}-guests`}
          aria-labelledby={`${uid}-g-l ${uid}-g-v`}
          onClick={() => setOpen(open === 'guests' ? null : 'guests')}
        >
          <span className="search__label" id={`${uid}-g-l`}>
            Số khách
          </span>
          <span className="search__value" id={`${uid}-g-v`}>
            {guestsLabel}
          </span>
          <ChevronDown className="search__chev" size={18} aria-hidden="true" />
        </button>
      </div>

      <div className="search__actions">
        <button type="submit" className="search__submit btn-shine" data-magnetic>
          <Search size={22} strokeWidth={2} aria-hidden="true" />
          <span>{availabilityEnabled ? 'Tìm phòng trống' : 'Xem tất cả phòng nghỉ'}</span>
        </button>
        {availabilityEnabled && <button type="submit" value="browse" className="search__browse">Xem tất cả phòng nghỉ</button>}
      </div>

      {error && (
        <p id={errId} className="search__error" role="alert">
          {error.message}
        </p>
      )}

      <Popover
        id={`${uid}-dates`}
        label="Chọn ngày lưu trú"
        anchorRef={datesAnchor}
        open={open === 'in' || open === 'out'}
        onClose={closeDates}
      >
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

      <Popover
        id={`${uid}-guests`}
        label="Chọn số khách"
        anchorRef={guestRef}
        open={open === 'guests'}
        onClose={closeGuests}
        align="start"
      >
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

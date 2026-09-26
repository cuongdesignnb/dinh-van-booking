'use client';

import {
  ArrowRight,
  BedDouble,
  CalendarDays,
  Check,
  ChevronDown,
  Headset,
  Info,
  LockKeyhole,
  Pencil,
  Phone,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { capacityIssue } from '@/components/stay-detail/BookingContext';
import { BrandIcon } from '@/components/ui/BrandIcons';
import { GuestPicker } from '@/components/ui/GuestPicker';
import { PolicyLink } from '@/components/ui/PolicyLink';
import { Popover } from '@/components/ui/Popover';
import { useSiteData } from '@/components/site/SiteDataProvider';
import type { Stay } from '@/data/stays';
import type { RoomType } from '@/data/types';
import {
  calculatePrice,
  emptyAddOns,
  PriceInputError,
  type PriceSummary,
} from '@/lib/booking/pricing';
import { formatDayLabel } from '@/lib/dates';
import { openDialog } from '@/lib/events';
import { formatVnd } from '@/lib/format';
import { apiAdapter } from '@/lib/services/consultation';
import { dateError, nights as nightsOf, parseSelection, readParam, selectionQuery, type Selection } from '@/lib/selection';
import { validateEmail, validateMessage, validateName, validatePhone } from '@/lib/validation';

const NATIONALITIES = ['Việt Nam', 'Hàn Quốc', 'Nhật Bản', 'Trung Quốc', 'Hoa Kỳ', 'Pháp', 'Úc', 'Khác'];
const SPECIAL_MAX = 300;
const NOTE_MAX = 500;

type Stage = 'editing' | 'review' | 'submitted';
type GuestField = 'name' | 'phone' | 'email' | 'special' | 'note';

interface Guest {
  name: string;
  phone: string;
  email: string;
  nationality: string;
  special: string;
  note: string;
}

const dayLabel = formatDayLabel;

/** Resolve and validate the selection from the URL. Price never comes from the URL. */
export function resolveBooking(params: URLSearchParams, catalogStay: Stay | null) {
  const stay = catalogStay;
  const room = stay?.roomTypes.find((r) => r.id === readParam(params, 'room')) ?? null;
  const selection = parseSelection(params);
  const date = dateError(selection);
  if (!stay || !room) return { ok: false as const, reason: 'missing' as const, stay, selection };
  if (date) return { ok: false as const, reason: 'dates' as const, stay, room, selection, message: date.message };
  return { ok: true as const, stay, room, selection };
}

export function Checkout({ stay }: { stay: Stay | null }) {
  const params = useSearchParams();
  const resolved = useMemo(() => resolveBooking(params, stay), [params, stay]);
  if (!resolved.ok) return <MissingSelection reason={resolved.reason} stay={resolved.stay ?? null} query={selectionQuery(resolved.selection)} message={'message' in resolved ? resolved.message : undefined} />;
  return <CheckoutForm key={params.toString()} stay={resolved.stay} room={resolved.room} initial={resolved.selection} />;
}

function MissingSelection({ reason, stay, query, message }: { reason: 'missing' | 'dates'; stay: Stay | null; query: string; message?: string }) {
  return (
    <section className="co-empty" aria-labelledby="co-empty-t">
      <BedDouble size={36} aria-hidden="true" />
      <h2 id="co-empty-t">{reason === 'missing' ? 'Bạn chưa chọn phòng nghỉ' : 'Ngày lưu trú chưa hợp lệ'}</h2>
      <p>
        {reason === 'missing'
          ? 'Hãy chọn chỗ nghỉ, loại phòng, ngày và số khách trước khi điền thông tin đặt phòng.'
          : `${message ?? ''} Vui lòng chọn lại ngày ở trang chi tiết phòng.`}
      </p>
      <Link className="btn btn--primary" href={stay ? `/phong-nghi/${stay.slug}?${query}` : '/phong-nghi'}>
        {stay ? 'Quay lại chọn ngày' : 'Chọn phòng nghỉ'} <ArrowRight size={16} aria-hidden="true" />
      </Link>
    </section>
  );
}

function Steps({ current }: { current: 1 | 2 | 3 }) {
  const steps = [
    ['Chọn phòng', 'Lựa chọn phòng và dịch vụ'],
    ['Thông tin khách', 'Nhập thông tin đặt phòng'],
    ['Xác nhận', 'Kiểm tra và xem lại'],
  ];
  return (
    <ol className="co-steps" aria-label="Các bước đặt phòng">
      {steps.map(([t, s], i) => {
        const n = (i + 1) as 1 | 2 | 3;
        const state = n < current ? 'done' : n === current ? 'current' : 'todo';
        return (
          <li key={t} className="co-step" data-state={state} aria-current={n === current ? 'step' : undefined}>
            <span className="co-step__num" aria-hidden="true">
              {n}
            </span>
            <strong>{t}</strong>
            <span>{s}</span>
            <span className="sr-only">{state === 'done' ? ' (đã xong)' : state === 'current' ? ' (bước hiện tại)' : ''}</span>
          </li>
        );
      })}
    </ol>
  );
}

function Section({ n, title, aside, children, id }: { n: number; title: ReactNode; aside?: ReactNode; children: ReactNode; id?: string }) {
  const uid = useId();
  return (
    <section className="co-sec" aria-labelledby={`${uid}-t`} id={id}>
      <div className="co-sec__head">
        <span className="co-sec__num" aria-hidden="true">
          {n}
        </span>
        <h2 className="co-sec__title" id={`${uid}-t`}>
          {title}
        </h2>
        {aside && <p className="co-sec__aside">{aside}</p>}
      </div>
      {children}
    </section>
  );
}

function CheckoutForm({ stay, room: initialRoom, initial }: { stay: Stay; room: RoomType; initial: Selection }) {
  const site = useSiteData();
  const router = useRouter();
  const uid = useId();
  const room = initialRoom;
  const [sel, setSel] = useState<Selection>(initial);
  const n = nightsOf(sel);
  const guests = sel.adults + sel.children;
  const [guest, setGuest] = useState<Guest>({ name: '', phone: '', email: '', nationality: 'Việt Nam', special: '', note: '' });
  const [errors, setErrors] = useState<Partial<Record<GuestField | 'capacity' | 'addons', string>>>({});
  const [stage, setStage] = useState<Stage>('editing');
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [confirmErr, setConfirmErr] = useState(false);
  const [guestPop, setGuestPop] = useState(false);
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const guestBtn = useRef<HTMLButtonElement>(null);
  const refs = {
    name: useRef<HTMLInputElement>(null),
    phone: useRef<HTMLInputElement>(null),
    email: useRef<HTMLInputElement>(null),
    special: useRef<HTMLInputElement>(null),
    note: useRef<HTMLTextAreaElement>(null),
  };
  const topRef = useRef<HTMLDivElement>(null);

  const cap = capacityIssue(room, sel);
  let summary: PriceSummary | null = null;
  let priceError: string | null = null;
  try {
    summary = calculatePrice({
      nightlyRate: room.pricePerNight,
      nights: n,
      roomCount: sel.rooms,
      guests,
      breakfastIncluded: room.breakfastIncluded,
      addOns: emptyAddOns(guests, n),
      coupon: null,
    });
  } catch (e) {
    priceError = e instanceof PriceInputError ? e.message : 'Không tính được tổng tiền.';
  }

  const validate = (f: GuestField, g = guest): string | null => {
    switch (f) {
      case 'name':
        return validateName(g.name);
      case 'phone':
        return validatePhone(g.phone);
      case 'email':
        return validateEmail(g.email);
      case 'special':
        return validateMessage(g.special, SPECIAL_MAX);
      case 'note':
        return validateMessage(g.note, NOTE_MAX);
    }
  };
  const setField = (f: keyof Guest, v: string) => {
    const g = { ...guest, [f]: v };
    setGuest(g);
    if (errors[f as GuestField]) setErrors((e) => ({ ...e, [f]: validate(f as GuestField, g) ?? undefined }));
  };

  const goReview = () => {
    if (busy) return;
    const next: typeof errors = {};
    (['name', 'phone', 'email', 'special', 'note'] as GuestField[]).forEach((f) => {
      const m = validate(f);
      if (m) next[f] = m;
    });
    if (cap) next.capacity = cap;
    if (priceError) next.addons = priceError;
    setErrors(next);
    const first = (['name', 'phone', 'email', 'special', 'note'] as GuestField[]).find((f) => next[f]);
    if (first) {
      refs[first].current?.focus();
      return;
    }
    if (next.capacity) {
      guestBtn.current?.focus();
      return;
    }
    if (next.addons) return;
    setBusy(true);
    setStage('review');
    requestAnimationFrame(() => {
      topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      topRef.current?.querySelector<HTMLElement>('h2')?.focus({ preventScroll: true });
      setBusy(false);
    });
  };

  const backToEdit = (focus?: GuestField) => {
    setStage('editing');
    setConfirmErr(false);
    requestAnimationFrame(() => (focus ? refs[focus].current?.focus() : topRef.current?.scrollIntoView({ block: 'start' })));
  };

  const editSelection = () => {
    const q = selectionQuery(sel);
    router.push(`/phong-nghi/${stay.slug}?${q}&room=${room.id}#cac-loai-phong`);
  };

  const submitInquiry = async () => {
    if (!confirmChecked) {
      setConfirmErr(true);
      return;
    }
    setBusy(true);
    setSubmitError(null);
    const message = [
      'Phòng: ' + room.name,
      'Số phòng: ' + sel.rooms,
      'Ngày: ' + sel.checkIn + ' → ' + sel.checkOut,
      'Số khách: ' + guests,
      'Dịch vụ: ' + (summary?.lines.slice(1).map((line) => line.label).join(', ') || 'Không chọn thêm'),
      guest.special.trim() ? 'Yêu cầu đặc biệt: ' + guest.special.trim() : '',
      guest.note.trim() ? 'Ghi chú: ' + guest.note.trim() : '',
    ].filter(Boolean).join('\n');
    const result = await apiAdapter.submit({
      name: guest.name.trim(),
      phone: guest.phone.trim(),
      email: guest.email.trim(),
      checkIn: sel.checkIn,
      checkOut: sel.checkOut,
      adults: sel.adults,
      children: sel.children,
      message,
      context: { intent: 'stay', id: stay.slug, label: stay.name },
    });
    setBusy(false);
    if (result.status === 'error') {
      setSubmitError(result.message);
      return;
    }
    setStage('submitted');
  };

  const err = (f: GuestField) => errors[f];
  const field = (f: GuestField, label: string, props: React.InputHTMLAttributes<HTMLInputElement> & { required?: boolean }) => (
    <div className="co-field">
      <label htmlFor={`${uid}-${f}`} className="co-field__label">
        {label}
        {props.required && (
          <>
            <span className="req" aria-hidden="true">
              {' '}
              *
            </span>
            <span className="sr-only"> (bắt buộc)</span>
          </>
        )}
      </label>
      <input
        ref={refs[f] as React.RefObject<HTMLInputElement>}
        id={`${uid}-${f}`}
        className="co-input"
        value={guest[f as keyof Guest]}
        aria-invalid={!!err(f)}
        aria-describedby={err(f) ? `${uid}-${f}-e` : undefined}
        aria-required={props.required || undefined}
        onChange={(e) => setField(f as keyof Guest, e.target.value)}
        onBlur={() => setErrors((x) => ({ ...x, [f]: validate(f) ?? undefined }))}
        {...props}
        required={undefined}
      />
      {err(f) && (
        <p className="co-err" id={`${uid}-${f}-e`}>
          {err(f)}
        </p>
      )}
    </div>
  );

  const summaryCard = (
    <aside className="co-summary" aria-label="Thông tin đặt phòng">
      <section className="co-card co-card--summary">
        <h2 className="co-summary__title">
          <span className="co-summary__ic" aria-hidden="true">
            <Pencil size={14} />
          </span>
          Thông tin đặt phòng
        </h2>
        <div className="co-summary__media">
          <Image src={stay.image.src} alt={stay.image.alt} fill sizes="406px" />
          <span className="co-summary__stay">{stay.name}</span>
        </div>
        <dl className="co-summary__facts">
          <div>
            <CalendarDays size={22} aria-hidden="true" />
            <dt>Nhận phòng</dt>
            <dd>
              <strong>{dayLabel(sel.checkIn!)}</strong>
              <span>Giờ nhận theo quy định</span>
            </dd>
          </div>
          <ArrowRight className="co-summary__arrow" size={18} aria-hidden="true" />
          <div>
            <CalendarDays size={22} aria-hidden="true" />
            <dt>Trả phòng</dt>
            <dd>
              <strong>{dayLabel(sel.checkOut!)}</strong>
              <span>Giờ trả theo quy định ({n} đêm)</span>
            </dd>
          </div>
          <div>
            <BedDouble size={24} aria-hidden="true" />
            <dt>Loại phòng</dt>
            <dd>
              <strong className="co-summary__room">
                {room.name}
                {sel.rooms > 1 ? ` × ${sel.rooms}` : ''}
              </strong>
            </dd>
          </div>
          <div>
            <UserRound size={22} aria-hidden="true" />
            <dt>Số khách</dt>
            <dd>
              <strong>{guests} khách</strong>
            </dd>
          </div>
        </dl>
        <button type="button" className="co-summary__change" onClick={editSelection}>
          <Pencil size={15} aria-hidden="true" /> Thay đổi lựa chọn phòng
        </button>

        <h3 className="co-summary__sub">Ước tính chi phí</h3>
        {summary ? (
          <>
            <ul className="co-lines">
              {summary.lines.map((l) => (
                <li key={l.id}>
                  <span>{l.label}</span>
                  <span>{formatVnd(l.amountVnd)}</span>
                </li>
              ))}
            </ul>
            <ul className="co-lines co-lines--totals">
              <li>
                <span>Tạm tính</span>
                <span>{formatVnd(summary.subtotalVnd)}</span>
              </li>
            </ul>
            <p className="co-total" aria-live="polite">
              <span>Tổng ước tính</span>
              <strong>{formatVnd(summary.totalVnd)}</strong>
            </p>
          </>
        ) : (
          <p className="co-err" role="alert">
            {priceError}
          </p>
        )}
        {stage === 'editing' ? (
          <button type="button" className="btn btn--primary co-cta btn-shine" onClick={goReview} disabled={busy} data-magnetic>
            <LockKeyhole size={20} aria-hidden="true" /> Gửi yêu cầu <ArrowRight size={20} aria-hidden="true" />
          </button>
        ) : null}
        <p className="co-terms">
          Đây là ước tính từ giá phòng đã xuất bản; chưa giữ phòng và chưa thu tiền. Xem <PolicyLink policy="terms" className="co-link" />{' '}
          và <PolicyLink policy="cancel" className="co-link" /> của Đinh Vân Booking.
        </p>
      </section>

      <section className="co-card co-help" aria-labelledby={`${uid}-help`}>
        <span className="co-help__ic" aria-hidden="true">
          <Headset size={30} />
        </span>
        <div>
          <h2 id={`${uid}-help`}>Bạn cần hỗ trợ?</h2>
          <p>Đội ngũ Đinh Vân Booking luôn sẵn sàng hỗ trợ bạn trong suốt quá trình đặt phòng.</p>
          <div className="co-help__btns">
            {site.contact.phone ? (
              <a className="co-help__btn" href={`tel:${site.contact.phone}`}>
                <Phone size={16} fill="currentColor" strokeWidth={0} aria-hidden="true" /> {site.contact.phone}
              </a>
            ) : (
              <button type="button" className="co-help__btn" aria-haspopup="dialog" onClick={() => openDialog({ type: 'contact', channel: 'phone' })}>
                <Phone size={16} fill="currentColor" strokeWidth={0} aria-hidden="true" /> Gọi cho mình
              </button>
            )}
            <button type="button" className="co-help__btn" aria-haspopup="dialog" onClick={() => openDialog({ type: 'contact', channel: 'zalo' })}>
              <span className="co-help__zalo" aria-hidden="true">
                <BrandIcon name="zalo" size={14} />
              </span>
              Chat qua Zalo
            </button>
          </div>
        </div>
      </section>
    </aside>
  );

  if (stage === 'submitted') {
    return (
      <section className="co-empty" aria-labelledby={uid + '-submitted-t'}>
        <Check size={36} aria-hidden="true" />
        <h2 id={uid + '-submitted-t'}>Đã nhận yêu cầu đặt phòng</h2>
        <p>Yêu cầu đã được ghi vào hệ thống để Đinh Vân xác nhận tình trạng phòng và phương án thanh toán với bạn.</p>
        <div className="dialog__actions">
          <Link className="btn btn--primary" href={'/phong-nghi/' + stay.slug}>Quay lại chỗ nghỉ</Link>
          <Link className="btn btn--light" href="/phong-nghi">Xem các chỗ nghỉ khác</Link>
        </div>
      </section>
    );
  }

  if (stage === 'review') {
    return (
      <div className="co-grid" ref={topRef}>
        <div className="co-main">
          <Steps current={3} />
          <section className="co-sec co-review" aria-labelledby={`${uid}-rv`}>
            <h2 id={`${uid}-rv`} className="co-sec__title" tabIndex={-1}>
              Kiểm tra thông tin đặt phòng
            </h2>
            <p className="dialog__pending" role="status">
              Bước này gửi một yêu cầu tư vấn/đặt phòng vào hệ thống. Phòng chỉ được xác nhận sau khi có phản hồi từ cơ sở.
            </p>
            <dl className="co-review__list">
              <div>
                <dt>Chỗ nghỉ</dt>
                <dd>
                  {stay.name} — {room.name}
                  {sel.rooms > 1 ? ` × ${sel.rooms} phòng` : ''}
                </dd>
                <button type="button" className="co-link" onClick={editSelection}>
                  Sửa
                </button>
              </div>
              <div>
                <dt>Thời gian</dt>
                <dd>
                  {dayLabel(sel.checkIn!)} → {dayLabel(sel.checkOut!)} ({n} đêm), {guests} khách
                </dd>
              </div>
              <div>
                <dt>Khách hàng</dt>
                <dd>
                  {guest.name.trim()} · {guest.phone.trim()} · {guest.email.trim()} · {guest.nationality}
                  {guest.special.trim() ? ` · Yêu cầu: ${guest.special.trim()}` : ''}
                </dd>
                <button type="button" className="co-link" onClick={() => backToEdit('name')}>
                  Sửa
                </button>
              </div>
              <div>
                <dt>Dịch vụ</dt>
                <dd>{summary && summary.lines.length > 1 ? summary.lines.slice(1).map((l) => l.label).join(', ') : 'Không chọn thêm'}</dd>
                <button type="button" className="co-link" onClick={() => backToEdit()}>
                  Sửa
                </button>
              </div>
              <div>
                <dt>Thanh toán</dt>
                <dd>Chưa thu tiền; phương án thanh toán sẽ được trao đổi sau khi xác nhận tình trạng phòng.</dd>
              </div>
              {guest.note.trim() && (
                <div>
                  <dt>Ghi chú</dt>
                  <dd>{guest.note.trim()}</dd>
                </div>
              )}
            </dl>
            <label className="co-confirm">
              <input
                type="checkbox"
                checked={confirmChecked}
                onChange={(e) => {
                  setConfirmChecked(e.target.checked);
                  setConfirmErr(false);
                }}
                aria-describedby={confirmErr ? `${uid}-cf-e` : undefined}
                aria-invalid={confirmErr}
              />
              Tôi đã kiểm tra các thông tin trên.
            </label>
            {confirmErr && (
              <p className="co-err" id={`${uid}-cf-e`} role="alert">
                Vui lòng xác nhận bạn đã kiểm tra thông tin.
              </p>
            )}
            <div className="co-review__actions">
              <button type="button" className="btn btn--light" onClick={() => backToEdit()}>
                Quay lại chỉnh sửa
              </button>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => {
                  if (!confirmChecked) {
                    setConfirmErr(true);
                    return;
                  }
                  void submitInquiry();
                }}
              >
                {busy ? 'Đang gửi…' : 'Gửi yêu cầu đặt phòng'} <ArrowRight size={16} aria-hidden="true" />
              </button>
            </div>
            {submitError && <p className="co-err" role="alert">{submitError}</p>}
          </section>
        </div>
        {summaryCard}
      </div>
    );
  }

  return (
    <div className="co-grid" ref={topRef}>
      <div className="co-main">
        <Steps current={2} />

        <Section n={1} title="Thông tin khách hàng" aside="Vui lòng điền đầy đủ thông tin để hoàn tất đặt phòng">
          <div className="co-form3">
            {field('name', 'Họ và tên', { required: true, autoComplete: 'name', placeholder: 'Nguyễn Văn A' })}
            {field('phone', 'Số điện thoại', { required: true, type: 'tel', inputMode: 'tel', autoComplete: 'tel', placeholder: '09xx xxx xxx' })}
            {field('email', 'Email', { required: true, type: 'email', autoComplete: 'email', placeholder: 'ban@email.com' })}
            <div className="co-field">
              <label htmlFor={`${uid}-nat`} className="co-field__label">
                Quốc tịch
              </label>
              <span className="co-select">
                <select id={`${uid}-nat`} className="co-input" value={guest.nationality} onChange={(e) => setField('nationality', e.target.value)} autoComplete="country-name">
                  {NATIONALITIES.map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
                <ChevronDown size={18} aria-hidden="true" />
              </span>
            </div>
            <div className="co-field">
              <span className="co-field__label" id={`${uid}-g-l`}>
                Số lượng khách
                <span className="req" aria-hidden="true">
                  {' '}
                  *
                </span>
              </span>
              <button
                ref={guestBtn}
                type="button"
                className="co-input co-guests"
                aria-haspopup="dialog"
                aria-expanded={guestPop}
                aria-labelledby={`${uid}-g-l ${uid}-g-v`}
                aria-describedby={errors.capacity ? `${uid}-cap` : undefined}
                data-invalid={errors.capacity ? '' : undefined}
                onClick={() => setGuestPop((v) => !v)}
              >
                <UserRound size={19} aria-hidden="true" />
                <span id={`${uid}-g-v`}>
                  {guests} khách{sel.rooms > 1 ? `, ${sel.rooms} phòng` : ''}
                </span>
                <ChevronDown size={18} aria-hidden="true" />
              </button>
              {(errors.capacity || cap) && (
                <p className="co-err" id={`${uid}-cap`} role={errors.capacity ? 'alert' : undefined}>
                  {cap}
                </p>
              )}
            </div>
            {field('special', 'Yêu cầu đặc biệt (nếu có)', { placeholder: 'Ví dụ: phòng tầng cao, ăn chay, ...', maxLength: SPECIAL_MAX + 50 })}
          </div>
          <Popover id={`${uid}-gp`} label="Chọn số khách" anchorRef={guestBtn} open={guestPop} onClose={() => setGuestPop(false)}>
            <GuestPicker
              adults={sel.adults}
              childCount={sel.children}
              rooms={sel.rooms}
              onChange={(adults, children, rooms) => {
                setSel((s) => ({ ...s, adults, children, rooms: rooms ?? s.rooms }));
                setErrors((e) => ({ ...e, capacity: undefined }));
              }}
              onDone={() => {
                setGuestPop(false);
                guestBtn.current?.focus();
              }}
            />
          </Popover>
        </Section>

        <Section n={2} title={<>Dịch vụ bổ sung <small>(tùy chọn)</small></>} aside="Tăng thêm trải nghiệm cho chuyến đi của bạn">
          <p className="co-empty-inline">Dịch vụ bổ sung chưa được cấu hình trên hệ thống. Không hiển thị giá mẫu.</p>
        </Section>

        <Section n={3} title="Ghi chú">
          <div className="co-field">
            <label htmlFor={`${uid}-note`} className="co-field__label">
              Ghi chú cho Đinh Vân Booking (tùy chọn)
            </label>
            <textarea
              ref={refs.note}
              id={`${uid}-note`}
              className="co-input co-note"
              rows={1}
              value={guest.note}
              placeholder="Ví dụ: giờ nhận phòng, món ăn yêu thích, ..."
              aria-invalid={!!errors.note}
              aria-describedby={errors.note ? `${uid}-note-e` : undefined}
              onChange={(e) => setField('note', e.target.value)}
            />
            {errors.note && (
              <p className="co-err" id={`${uid}-note-e`}>
                {errors.note}
              </p>
            )}
          </div>
        </Section>

        <Section n={4} title="Xác nhận và thanh toán" aside="Trao đổi sau khi xác nhận phòng">
          <div className="co-pay">
            <p className="co-method-panel">
              <Info size={16} aria-hidden="true" />
              Website chỉ ghi nhận yêu cầu, chưa giữ phòng và chưa thu tiền. Phương án thanh toán sẽ do cơ sở trao đổi sau khi kiểm tra tình trạng phòng.
            </p>
          </div>
          <p className="co-secure">
            <LockKeyhole size={20} aria-hidden="true" />
            <span>Website chưa thu tiền; thông tin thanh toán sẽ được trao đổi sau khi xác nhận phòng.</span>
            <PolicyLink policy="payment" className="co-link co-secure__link" label="Xem chính sách thanh toán →" />
          </p>
        </Section>

        <ul className="co-benefits">
          <li>
            <span aria-hidden="true">
              <LockKeyhole size={20} />
            </span>
            <strong>Đặt phòng an toàn</strong>Thông tin chỉ dùng cho chuyến đi
          </li>
          <li>
            <span aria-hidden="true">
              <ShieldCheck size={20} />
            </span>
            <strong>Xác nhận rõ ràng</strong>Tình trạng phòng xác nhận khi tư vấn
          </li>
          <li>
            <span aria-hidden="true">
              <Headset size={20} />
            </span>
            <strong>Người địa phương hỗ trợ</strong>Đồng hành cùng bạn
          </li>
          <li>
            <span aria-hidden="true">
              <Info size={20} />
            </span>
            <strong>Chính sách rõ ràng</strong>Trao đổi trước khi đặt
          </li>
        </ul>
      </div>
      {summaryCard}

      {summary && (
        <div className="co-mbar">
          <p>
            <span>Tổng</span>
            <strong>{formatVnd(summary.totalVnd)}</strong>
          </p>
          <button type="button" className="btn btn--primary" onClick={goReview} disabled={busy}>
            Gửi yêu cầu <ArrowRight size={16} aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}

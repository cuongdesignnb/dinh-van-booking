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
import Image from '@/components/ui/ManagedImage';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { capacityIssue } from '@/components/stay-detail/BookingContext';
import { BrandIcon } from '@/components/ui/BrandIcons';
import { GuestPicker } from '@/components/ui/GuestPicker';
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
import { formatVnd } from '@/lib/format';
import { ApiError, apiRequest } from '@/lib/api/client';
import { dateError, nights as nightsOf, parseSelection, readParam, selectionQuery, type Selection } from '@/lib/selection';
import { validateEmail, validateMessage, validateName, validatePhone } from '@/lib/validation';
import { publicSetting, publicText } from '@/lib/public-content';
import { RichContentRenderer } from '@/components/content/RichContentRenderer';
import type { RichDocument } from '@/lib/content/rich-document';
import { richDocumentHasContent } from '@/lib/public-content';
import { clearPendingHold, matchesPendingHold, newPendingHold, readPendingHold, savePendingHold, type PendingHoldRecord } from '@/lib/booking/pending-hold';

const NATIONALITIES = ['Việt Nam', 'Hàn Quốc', 'Nhật Bản', 'Trung Quốc', 'Hoa Kỳ', 'Pháp', 'Úc', 'Khác'];
const SPECIAL_MAX = 300;
const NOTE_MAX = 500;

interface ServerQuote {
  id: string;
  subtotalVnd: string;
  discountVnd: string;
  totalVnd: string;
  dueNowVnd: string;
  expiresAt: string;
  snapshot: {
    quantity: number;
    nights: Array<{ stayDate: string; amountVnd: string }>;
  };
}

interface BookingReceipt {
  id: string;
  publicCode: string;
  bookingStatus: string;
  expiresAt: string | null;
  totalVnd: string;
  dueNowVnd: string;
}

interface RecoveredQuote {
  id: string;
  request: { roomTypeId: string; checkIn: string; checkOut: string; quantity: number; adults: number; children: number };
  subtotalVnd: string;
  discountVnd: string;
  totalVnd: string;
  dueNowVnd: string;
  expiresAt: string;
  pricing: ServerQuote['snapshot'];
  booking: BookingReceipt | null;
}

function formatServerVnd(value: string | number | bigint): string {
  const amount = typeof value === 'bigint' ? value : BigInt(String(value));
  return `${new Intl.NumberFormat('vi-VN').format(amount)}đ`;
}

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

const EMPTY_GUEST: Guest = { name: '', phone: '', email: '', nationality: 'Việt Nam', special: '', note: '' };

function bookingContact(guest: Guest) {
  const note = [
    `Quốc tịch: ${guest.nationality}`,
    guest.special.trim() ? `Yêu cầu đặc biệt: ${guest.special.trim()}` : '',
    guest.note.trim() ? `Ghi chú: ${guest.note.trim()}` : '',
  ].filter(Boolean).join('\n');
  return { fullName: guest.name.trim(), phone: guest.phone.trim(), email: guest.email.trim(), note };
}

function holdSignature(quoteId: string, guest: Guest): string {
  return JSON.stringify({ quoteId, contact: bookingContact(guest) });
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
  const bookingPage = publicSetting(site.publicSite, 'catalog.bookingPage');
  const securityNote = publicText(bookingPage.securityNote);
  const policyLinks = site.navigation.filter((item) => item.href.startsWith('/chuyen-trang/'));
  const helpTitle = publicText(bookingPage.helpTitle);
  const helpDescription = bookingPage.helpDescription;
  const confirmationNote = bookingPage.confirmationNote;
  const router = useRouter();
  const uid = useId();
  const room = initialRoom;
  const routeKey = JSON.stringify({ stayId: stay.id, roomId: room.id, selection: initial });
  const [sel, setSel] = useState<Selection>(initial);
  const n = nightsOf(sel);
  const guests = sel.adults + sel.children;
  const [guest, setGuest] = useState<Guest>(EMPTY_GUEST);
  const [errors, setErrors] = useState<Partial<Record<GuestField | 'capacity' | 'addons', string>>>({});
  const [stage, setStage] = useState<Stage>('editing');
  const [quote, setQuote] = useState<ServerQuote | null>(null);
  const [bookingReceipt, setBookingReceipt] = useState<BookingReceipt | null>(null);
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [confirmErr, setConfirmErr] = useState(false);
  const [guestPop, setGuestPop] = useState(false);
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const pendingHold = useRef<{ record: PendingHoldRecord; signature?: string } | null>(null);
  const [recovery, setRecovery] = useState<'checking' | 'none' | 'needs-contact' | 'unavailable'>('checking');
  const [recoveryAttempt, setRecoveryAttempt] = useState(0);
  const guestBtn = useRef<HTMLButtonElement>(null);
  const refs = {
    name: useRef<HTMLInputElement>(null),
    phone: useRef<HTMLInputElement>(null),
    email: useRef<HTMLInputElement>(null),
    special: useRef<HTMLInputElement>(null),
    note: useRef<HTMLTextAreaElement>(null),
  };
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const record = readPendingHold(routeKey);
    if (!record) {
      setRecovery('none');
      return;
    }
    pendingHold.current = { record };
    let active = true;
    void apiRequest<RecoveredQuote>(`/quotes/${record.quoteId}`, { cache: 'no-store' }).then((recovered) => {
      if (!active) return;
      if (recovered.id !== record.quoteId || recovered.request.roomTypeId !== room.id
        || recovered.request.checkIn !== initial.checkIn || recovered.request.checkOut !== initial.checkOut
        || recovered.request.quantity !== initial.rooms || recovered.request.adults !== initial.adults
        || recovered.request.children !== initial.children) {
        setRecovery('unavailable');
        return;
      }
      if (recovered.booking) {
        setBookingReceipt(recovered.booking);
        setStage('submitted');
        setRecovery('none');
      } else {
        setQuote({
          id: recovered.id, subtotalVnd: recovered.subtotalVnd, discountVnd: recovered.discountVnd,
          totalVnd: recovered.totalVnd, dueNowVnd: recovered.dueNowVnd,
          expiresAt: recovered.expiresAt, snapshot: recovered.pricing,
        });
        setRecovery('needs-contact');
      }
    }).catch(() => { if (active) setRecovery('unavailable'); });
    return () => { active = false; };
  }, [routeKey, recoveryAttempt, room.id, initial.checkIn, initial.checkOut, initial.rooms, initial.adults, initial.children]);

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

  const showReview = () => {
    setStage('review');
    requestAnimationFrame(() => {
      topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      topRef.current?.querySelector<HTMLElement>('h2')?.focus({ preventScroll: true });
    });
  };

  const goReview = async () => {
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
    setSubmitError(null);
    try {
      const pending = pendingHold.current;
      if (pending) {
        if (!quote || quote.id !== pending.record.quoteId
          || !(await matchesPendingHold(pending.record, holdSignature(quote.id, guest)))) {
          setSubmitError('Để thử lại yêu cầu trước, vui lòng nhập đúng thông tin liên hệ và ghi chú đã gửi. Nếu không nhớ, hãy liên hệ hỗ trợ để kiểm tra.');
          return;
        }
        setRecovery('none');
        showReview();
        return;
      }
      const nextQuote = await apiRequest<ServerQuote>('/quotes', {
        method: 'POST',
        body: JSON.stringify({ roomTypeId: room.id, checkIn: sel.checkIn, checkOut: sel.checkOut, quantity: sel.rooms, adults: sel.adults, children: sel.children }),
      });
      setQuote(nextQuote);
      showReview();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Chưa lấy được báo giá. Vui lòng thử lại.');
    } finally {
      setBusy(false);
    }
  };

  const backToEdit = (focus?: GuestField) => {
    if (pendingHold.current) {
      setSubmitError('Yêu cầu giữ phòng trước chưa rõ kết quả. Hãy thử lại để nhận mã trước khi chỉnh sửa thông tin.');
      return;
    }
    setStage('editing');
    setConfirmErr(false);
    requestAnimationFrame(() => (focus ? refs[focus].current?.focus() : topRef.current?.scrollIntoView({ block: 'start' })));
  };

  const editSelection = () => {
    if (pendingHold.current) {
      setSubmitError('Yêu cầu giữ phòng trước chưa rõ kết quả. Hãy thử lại để nhận mã trước khi đổi phòng hoặc ngày.');
      return;
    }
    const q = selectionQuery(sel);
    router.push(`/phong-nghi/${stay.slug}?${q}&room=${room.id}#cac-loai-phong`);
  };

  const submitBookingRequest = async () => {
    if (busy) return;
    if (!confirmChecked) {
      setConfirmErr(true);
      return;
    }
    setBusy(true);
    setSubmitError(null);
    if (!quote) {
      setBusy(false);
      setSubmitError('Báo giá không còn trong phiên này. Vui lòng quay lại lấy báo giá mới.');
      return;
    }
    const contact = bookingContact(guest);
    const signature = holdSignature(quote.id, guest);
    try {
      let pending = pendingHold.current;
      if (pending && (pending.record.quoteId !== quote.id
        || !(pending.signature === signature || await matchesPendingHold(pending.record, signature)))) {
        setSubmitError('Thông tin đã thay đổi trong khi yêu cầu trước chưa rõ kết quả. Hãy liên hệ hỗ trợ để kiểm tra mã giữ phòng.');
        return;
      }
      if (!pending) {
        const key = globalThis.crypto?.randomUUID?.();
        if (!key || !globalThis.crypto?.subtle) {
          setSubmitError('Trình duyệt chưa hỗ trợ gửi yêu cầu an toàn. Hãy cập nhật trình duyệt rồi thử lại.');
          return;
        }
        const record = await newPendingHold(routeKey, quote.id, key, signature);
        if (!savePendingHold(record)) {
          setSubmitError('Trình duyệt đang chặn lưu mã yêu cầu tạm trong phiên. Hãy cho phép lưu dữ liệu phiên rồi thử lại, hoặc liên hệ hỗ trợ.');
          return;
        }
        pending = { record, signature };
        pendingHold.current = pending;
      }
      const receipt = await apiRequest<BookingReceipt>(`/quotes/${quote.id}/hold`, {
        method: 'POST',
        headers: { 'idempotency-key': pending.record.key },
        body: JSON.stringify(contact),
      });
      pendingHold.current = null;
      setBookingReceipt(receipt);
      setRecovery('none');
      setStage('submitted');
    } catch (error) {
      if (error instanceof ApiError && (error.status === 400 || error.status === 422)) {
        if (pendingHold.current) clearPendingHold(pendingHold.current.record);
        pendingHold.current = null;
        setSubmitError(error.message);
      } else {
        setSubmitError('Chưa nhận được xác nhận từ máy chủ. Yêu cầu có thể đã được ghi nhận; hãy thử lại đúng thông tin để nhận mã, hoặc liên hệ hỗ trợ.');
      }
    } finally {
      setBusy(false);
    }
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
        <button type="button" className="co-summary__change" onClick={editSelection} disabled={busy || Boolean(pendingHold.current)}>
          <Pencil size={15} aria-hidden="true" /> Thay đổi lựa chọn phòng
        </button>

        <h3 className="co-summary__sub">{quote ? 'Báo giá từ hệ thống' : 'Ước tính chi phí'}</h3>
        {quote ? (
          <>
            <ul className="co-lines">
              {quote.snapshot.nights.map((night) => (
                <li key={night.stayDate}>
                  <span>{dayLabel(night.stayDate)} × {quote.snapshot.quantity} phòng</span>
                  <span>{formatServerVnd(BigInt(night.amountVnd) * BigInt(quote.snapshot.quantity))}</span>
                </li>
              ))}
              {BigInt(quote.discountVnd) > BigInt(0) && <li><span>Ưu đãi</span><span>−{formatServerVnd(quote.discountVnd)}</span></li>}
            </ul>
            <p className="co-total" aria-live="polite">
              <span>Tổng theo bảng giá đang áp dụng</span>
              <strong>{formatServerVnd(quote.totalVnd)}</strong>
            </p>
            <p className="co-terms">Tạm tính cần thanh toán khi xác nhận: {formatServerVnd(quote.dueNowVnd)}. Website chưa thu tiền.</p>
          </>
        ) : summary ? (
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
            <LockKeyhole size={20} aria-hidden="true" /> {busy ? 'Đang lấy báo giá…' : 'Xem giá & xác nhận'} <ArrowRight size={20} aria-hidden="true" />
          </button>
        ) : null}
        {submitError && stage === 'editing' && <p className="co-err" role="alert">{submitError}</p>}
        {(securityNote || policyLinks.length > 0) && <p className="co-terms">{securityNote}{securityNote && policyLinks.length > 0 ? ' ' : ''}{policyLinks.map((item, index) => <span key={item.href}>{index > 0 ? ' · ' : ''}<Link className="co-link" href={item.href}>{item.label}</Link></span>)}</p>}
      </section>

      {(site.contact.phone || site.contact.zaloUrl) && (helpTitle || richDocumentHasContent(helpDescription)) && <section className="co-card co-help" aria-labelledby={helpTitle ? `${uid}-help` : undefined}>
        <span className="co-help__ic" aria-hidden="true">
          <Headset size={30} />
        </span>
        <div>
          {helpTitle && <h2 id={`${uid}-help`}>{helpTitle}</h2>}
          {richDocumentHasContent(helpDescription) && <div><RichContentRenderer document={helpDescription as RichDocument} /></div>}
          <div className="co-help__btns">
            {site.contact.phone && <a className="co-help__btn" href={`tel:${site.contact.phone}`}><Phone size={16} fill="currentColor" strokeWidth={0} aria-hidden="true" /> {site.contact.phone}</a>}
            {site.contact.zaloUrl && <a className="co-help__btn" href={site.contact.zaloUrl} target="_blank" rel="noopener noreferrer"><span className="co-help__zalo" aria-hidden="true"><BrandIcon name="zalo" size={14} /></span>Zalo</a>}
          </div>
        </div>
      </section>}
    </aside>
  );

  if (recovery === 'checking') {
    return <section className="co-empty" role="status"><LockKeyhole size={34} aria-hidden="true" /><h2>Đang kiểm tra yêu cầu trước</h2><p>Hệ thống đang tra lại kết quả giữ phòng trong phiên này để tránh gửi trùng.</p></section>;
  }

  if (recovery === 'unavailable') {
    return <section className="co-empty" role="alert"><Info size={34} aria-hidden="true" /><h2>Chưa xác định được yêu cầu trước</h2><p>Đừng gửi yêu cầu mới cho cùng lựa chọn lúc này. Hãy kiểm tra lại hoặc liên hệ hỗ trợ để tránh giữ phòng hai lần.</p><div className="dialog__actions"><button type="button" className="btn btn--primary" onClick={() => { setRecovery('checking'); setRecoveryAttempt((value) => value + 1); }}>Kiểm tra lại</button><Link className="btn btn--light" href="/lien-he">Liên hệ hỗ trợ</Link></div></section>;
  }

  if (stage === 'submitted') {
    const status = bookingReceipt?.bookingStatus;
    return (
      <section className="co-empty" aria-labelledby={uid + '-submitted-t'}>
        <Check size={36} aria-hidden="true" />
        <h2 id={uid + '-submitted-t'}>{status === 'pending_confirmation' ? 'Đã giữ phòng chờ xác nhận' : status === 'confirmed' ? 'Đơn đặt phòng đã được xác nhận' : 'Tình trạng yêu cầu đặt phòng'}</h2>
        {bookingReceipt && <p>Mã yêu cầu <strong>{bookingReceipt.publicCode}</strong> · Trạng thái: {status === 'pending_confirmation' ? 'chờ xác nhận' : status === 'confirmed' ? 'đã xác nhận' : status === 'cancelled' ? 'đã hủy' : status === 'expired' ? 'đã hết hạn' : status}.</p>}
        {bookingReceipt && <p>{status === 'pending_confirmation' && bookingReceipt.expiresAt && `Phòng được giữ tạm đến ${new Date(bookingReceipt.expiresAt).toLocaleString('vi-VN', { dateStyle: 'medium', timeStyle: 'short' })}. `}{status === 'pending_confirmation' ? `Tổng giá ${formatServerVnd(bookingReceipt.totalVnd)}; khoản dự kiến khi xác nhận ${formatServerVnd(bookingReceipt.dueNowVnd)}.` : `Giá trị yêu cầu: ${formatServerVnd(bookingReceipt.totalVnd)}.`} Website chưa thu tiền trực tuyến.</p>}
        {richDocumentHasContent(confirmationNote) && <div className="co-confirmation-note"><RichContentRenderer document={confirmationNote as RichDocument} /></div>}
        <div className="dialog__actions">
          <Link className="btn btn--primary" href={'/phong-nghi/' + stay.slug}>Quay lại chỗ nghỉ</Link>
          <Link className="btn btn--light" href="/phong-nghi">Xem các chỗ nghỉ khác</Link>
          <button type="button" className="btn btn--light" onClick={() => {
            if (!window.confirm('Tạo một yêu cầu đặt phòng mới? Yêu cầu có mã ở trên sẽ vẫn được giữ trong hệ thống.')) return;
            const record = readPendingHold(routeKey);
            if (record) clearPendingHold(record);
            pendingHold.current = null;
            setBookingReceipt(null);
            setQuote(null);
            setGuest(EMPTY_GUEST);
            setConfirmChecked(false);
            setStage('editing');
          }}>Tạo yêu cầu mới</button>
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
              Giá được tính từ bảng giá đang hoạt động. Gửi yêu cầu sẽ giữ tạm số phòng đã chọn trong 15 phút; booking vẫn chờ cơ sở xác nhận và website chưa thu tiền.
            </p>
            <dl className="co-review__list">
              <div>
                <dt>Chỗ nghỉ</dt>
                <dd>
                  {stay.name} — {room.name}
                  {sel.rooms > 1 ? ` × ${sel.rooms} phòng` : ''}
                </dd>
                <button type="button" className="co-link" onClick={editSelection} disabled={busy || Boolean(pendingHold.current)}>
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
                <button type="button" className="co-link" onClick={() => backToEdit('name')} disabled={busy || Boolean(pendingHold.current)}>
                  Sửa
                </button>
              </div>
              <div>
                <dt>Giá phòng</dt>
                <dd>{quote ? `${formatServerVnd(quote.totalVnd)} · ${n} đêm · ${sel.rooms} phòng` : 'Chưa có báo giá'}</dd>
                <button type="button" className="co-link" onClick={() => backToEdit()} disabled={busy || Boolean(pendingHold.current)}>
                  Sửa
                </button>
              </div>
              {quote && <div><dt>Giá cần thanh toán khi xác nhận</dt><dd>{formatServerVnd(quote.dueNowVnd)} (chưa thu tiền)</dd></div>}
              {quote && <div><dt>Báo giá hết hạn</dt><dd>{new Date(quote.expiresAt).toLocaleString('vi-VN', { dateStyle: 'medium', timeStyle: 'short' })}</dd></div>}
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
              <button type="button" className="btn btn--light" onClick={() => backToEdit()} disabled={busy || Boolean(pendingHold.current)}>
                Quay lại chỉnh sửa
              </button>
              <button
                type="button"
                className="btn btn--primary"
                disabled={busy}
                onClick={() => {
                  if (!confirmChecked) {
                    setConfirmErr(true);
                    return;
                  }
                  void submitBookingRequest();
                }}
              >
                {busy ? 'Đang giữ phòng…' : 'Giữ phòng & gửi yêu cầu'} <ArrowRight size={16} aria-hidden="true" />
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
        {recovery === 'needs-contact' && <p className="dialog__pending" role="status">Yêu cầu giữ phòng trước chưa có mã xác nhận. Vui lòng nhập lại <strong>đúng thông tin liên hệ, quốc tịch và ghi chú đã gửi</strong>; hệ thống sẽ dùng lại báo giá và mã yêu cầu cũ, không tạo yêu cầu mới.</p>}

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
              {site.name ? `Ghi chú cho ${site.name} (tùy chọn)` : 'Ghi chú (tùy chọn)'}
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
          {securityNote && <p className="co-secure"><LockKeyhole size={20} aria-hidden="true" /><span>{securityNote}</span>{policyLinks.map((item) => <Link key={item.href} className="co-link co-secure__link" href={item.href}>{item.label}</Link>)}</p>}
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

      {(summary || quote) && (
        <div className="co-mbar">
          <p>
            <span>{quote ? 'Tổng giá' : 'Ước tính'}</span>
            <strong>{quote ? formatServerVnd(quote.totalVnd) : formatVnd(summary!.totalVnd)}</strong>
          </p>
          <button type="button" className="btn btn--primary" onClick={goReview} disabled={busy}>
            {busy ? 'Đang lấy giá…' : 'Xem giá & xác nhận'} <ArrowRight size={16} aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}

'use client';

import {
  ArrowRight,
  BedDouble,
  CalendarDays,
  Check,
  ChevronDown,
  CreditCard,
  Headset,
  Info,
  Landmark,
  LockKeyhole,
  Minus,
  Pencil,
  Phone,
  Plus,
  ShieldCheck,
  Tag,
  UserRound,
  Wallet,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { capacityIssue } from '@/components/stay-detail/BookingContext';
import { BrandIcon } from '@/components/ui/BrandIcons';
import { GuestPicker } from '@/components/ui/GuestPicker';
import { DemoNote, Modal } from '@/components/ui/Modal';
import { PolicyLink } from '@/components/ui/PolicyLink';
import { Popover } from '@/components/ui/Popover';
import { siteConfig } from '@/config/site';
import { getStay, type Stay } from '@/data/stays';
import type { RoomType } from '@/data/types';
import {
  ADD_ON_LIMITS,
  ADD_ONS,
  calculatePrice,
  COUPONS,
  emptyAddOns,
  normalizeCoupon,
  PriceInputError,
  type AddOnId,
  type AddOnState,
  type PaymentMethod,
  type PaymentPlan,
  type PriceSummary,
} from '@/lib/booking/pricing';
import { formatDayLabel } from '@/lib/dates';
import { openDialog } from '@/lib/events';
import { formatVnd } from '@/lib/format';
import { dateError, nights as nightsOf, parseSelection, readParam, selectionQuery, type Selection } from '@/lib/selection';
import { validateEmail, validateMessage, validateName, validatePhone } from '@/lib/validation';

const NATIONALITIES = ['Việt Nam', 'Hàn Quốc', 'Nhật Bản', 'Trung Quốc', 'Hoa Kỳ', 'Pháp', 'Úc', 'Khác'];
const SPECIAL_MAX = 300;
const NOTE_MAX = 500;

type Stage = 'editing' | 'review' | 'demo-preview';
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
export function resolveBooking(params: URLSearchParams) {
  const stay = getStay(readParam(params, 'stay') ?? '');
  const room = stay?.roomTypes.find((r) => r.id === readParam(params, 'room')) ?? null;
  const selection = parseSelection(params);
  const date = dateError(selection);
  if (!stay || !room) return { ok: false as const, reason: 'missing' as const, stay, selection };
  if (date) return { ok: false as const, reason: 'dates' as const, stay, room, selection, message: date.message };
  return { ok: true as const, stay, room, selection };
}

export function Checkout() {
  const params = useSearchParams();
  const resolved = useMemo(() => resolveBooking(params), [params]);
  if (!resolved.ok) return <MissingSelection reason={resolved.reason} stay={resolved.stay ?? null} query={selectionQuery(resolved.selection)} message={'message' in resolved ? resolved.message : undefined} />;
  return <CheckoutForm key={params.toString()} stay={resolved.stay} room={resolved.room} initial={resolved.selection} scenario={readParam(params, 'scenario')} />;
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

function Stepper({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <span className="mini-stepper" role="group" aria-label={label}>
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label={`Giảm ${label.toLowerCase()}`}>
        <Minus size={12} aria-hidden="true" />
      </button>
      <output aria-live="polite">{value}</output>
      <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label={`Tăng ${label.toLowerCase()}`}>
        <Plus size={12} aria-hidden="true" />
      </button>
    </span>
  );
}

function CheckoutForm({ stay, room: initialRoom, initial, scenario }: { stay: Stay; room: RoomType; initial: Selection; scenario: string | null }) {
  const router = useRouter();
  const uid = useId();
  const baseline = scenario === 'baseline';
  const room = initialRoom;
  const [sel, setSel] = useState<Selection>(initial);
  const n = nightsOf(sel);
  const guests = sel.adults + sel.children;
  const [addOns, setAddOns] = useState<AddOnState>(() => {
    const a = emptyAddOns(guests, n);
    if (baseline) {
      // Screenshot/test fixture from the brief (breakfast + tour selected).
      a.breakfast.selected = true;
      a['forest-tour'] = { selected: true, participants: Math.min(2, guests) };
    }
    return a;
  });
  const [couponInput, setCouponInput] = useState(baseline ? 'DVAN10' : '');
  const [coupon, setCoupon] = useState<string | null>(baseline ? 'DVAN10' : null);
  const [couponMsg, setCouponMsg] = useState<{ ok: boolean; text: string } | null>(
    baseline ? { ok: true, text: 'Đã áp dụng mã DVAN10 (giảm 10%).' } : null,
  );
  const [plan, setPlan] = useState<PaymentPlan>('deposit');
  const [method, setMethod] = useState<PaymentMethod>(null);
  const [methodPanel, setMethodPanel] = useState(false);
  const [guest, setGuest] = useState<Guest>({ name: '', phone: '', email: '', nationality: 'Việt Nam', special: '', note: '' });
  const [errors, setErrors] = useState<Partial<Record<GuestField | 'capacity' | 'addons', string>>>({});
  const [stage, setStage] = useState<Stage>('editing');
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [confirmErr, setConfirmErr] = useState(false);
  const [guestPop, setGuestPop] = useState(false);
  const [busy, setBusy] = useState(false);
  const guestBtn = useRef<HTMLButtonElement>(null);
  const refs = {
    name: useRef<HTMLInputElement>(null),
    phone: useRef<HTMLInputElement>(null),
    email: useRef<HTMLInputElement>(null),
    special: useRef<HTMLInputElement>(null),
    note: useRef<HTMLTextAreaElement>(null),
  };
  const topRef = useRef<HTMLDivElement>(null);

  // Keep dependent add-on quantities within the current guest/night counts.
  useEffect(() => {
    setAddOns((a) => ({
      ...a,
      'forest-tour': { ...a['forest-tour'], participants: Math.min(Math.max(1, a['forest-tour'].participants), guests) },
      'bike-rental': { ...a['bike-rental'], days: Math.min(Math.max(1, a['bike-rental'].days), n) },
    }));
  }, [guests, n]);

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
      addOns,
      coupon,
      plan,
    });
  } catch (e) {
    priceError = e instanceof PriceInputError ? e.message : 'Không tính được tổng tiền.';
  }

  const toggleAddOn = (id: AddOnId) => setAddOns((a) => ({ ...a, [id]: { ...a[id], selected: !a[id].selected } }));

  const applyCoupon = () => {
    const code = normalizeCoupon(couponInput);
    setCouponInput(code);
    if (!code) {
      setCouponMsg({ ok: false, text: 'Vui lòng nhập mã giảm giá.' });
      return;
    }
    if (!COUPONS[code]) {
      setCoupon(null);
      setCouponMsg({ ok: false, text: 'Mã giảm giá không hợp lệ hoặc đã hết hạn.' });
      return;
    }
    if (coupon === code) {
      setCouponMsg({ ok: true, text: `Mã ${code} đã được áp dụng (chỉ tính một lần).` });
      return;
    }
    setCoupon(code);
    setCouponMsg({ ok: true, text: `Đã áp dụng mã ${code} (${COUPONS[code].label.toLowerCase()}).` });
  };

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
          <Image src="/images/dinh-van-booking/pages/checkout-stay.webp" alt={stay.image.alt} fill sizes="406px" />
          <span className="co-summary__stay">{stay.name}</span>
        </div>
        <dl className="co-summary__facts">
          <div>
            <CalendarDays size={22} aria-hidden="true" />
            <dt>Nhận phòng</dt>
            <dd>
              <strong>{dayLabel(sel.checkIn!)}</strong>
              <span>14:00</span>
            </dd>
          </div>
          <ArrowRight className="co-summary__arrow" size={18} aria-hidden="true" />
          <div>
            <CalendarDays size={22} aria-hidden="true" />
            <dt>Trả phòng</dt>
            <dd>
              <strong>{dayLabel(sel.checkOut!)}</strong>
              <span>12:00 ({n} đêm)</span>
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

        <h3 className="co-summary__sub">Chi tiết thanh toán</h3>
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
              {summary.discountVnd > 0 && (
                <li className="co-lines__discount">
                  <span>Giảm giá (Mã: {coupon})</span>
                  <span>- {formatVnd(summary.discountVnd)}</span>
                </li>
              )}
            </ul>
            <p className="co-total" aria-live="polite">
              <span>Tổng thanh toán</span>
              <strong>{formatVnd(summary.totalVnd)}</strong>
            </p>
            <div className="co-due">
              <p>
                <span>{plan === 'deposit' ? 'Số tiền cần thanh toán ngay (30%)' : 'Số tiền cần thanh toán (100%)'}</span>
                <strong>{formatVnd(summary.dueNowVnd)}</strong>
              </p>
              <p className="co-due__rest">
                <Info size={16} aria-hidden="true" />
                {summary.remainingVnd > 0 ? (
                  <span>
                    Phần còn lại <b>{formatVnd(summary.remainingVnd)}</b> sẽ thanh toán khi nhận phòng
                  </span>
                ) : (
                  <span>Không còn khoản thanh toán khi nhận phòng</span>
                )}
              </p>
            </div>
          </>
        ) : (
          <p className="co-err" role="alert">
            {priceError}
          </p>
        )}
        {stage === 'editing' ? (
          <button type="button" className="btn btn--primary co-cta btn-shine" onClick={goReview} disabled={busy} data-magnetic>
            <LockKeyhole size={20} aria-hidden="true" /> Giữ chỗ ngay <ArrowRight size={20} aria-hidden="true" />
          </button>
        ) : null}
        <p className="co-terms">
          Đây là bản mô phỏng, chưa giữ phòng và chưa thanh toán. Xem <PolicyLink policy="terms" className="co-link" />{' '}
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
            {siteConfig.contact.phone ? (
              <a className="co-help__btn" href={`tel:${siteConfig.contact.phone}`}>
                <Phone size={16} fill="currentColor" strokeWidth={0} aria-hidden="true" /> {siteConfig.contact.phone}
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

  if (stage !== 'editing') {
    return (
      <div className="co-grid" ref={topRef}>
        <div className="co-main">
          <Steps current={3} />
          <section className="co-sec co-review" aria-labelledby={`${uid}-rv`}>
            <h2 id={`${uid}-rv`} className="co-sec__title" tabIndex={-1}>
              Kiểm tra thông tin đặt phòng
            </h2>
            <DemoNote tone="info">
              Đây là bước xem lại của bản mô phỏng: chưa có phòng nào được giữ và chưa có khoản thanh toán nào được tạo.
            </DemoNote>
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
                <dd>
                  {plan === 'deposit' ? 'Đặt cọc 30%' : 'Thanh toán toàn bộ'}
                  {method === 'bank-transfer' ? ' · Chuyển khoản ngân hàng (đang cập nhật)' : ''}
                  {coupon ? ` · Mã ${coupon}` : ''}
                </dd>
                <button type="button" className="co-link" onClick={() => backToEdit()}>
                  Sửa
                </button>
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
                  setStage('demo-preview');
                }}
              >
                Xem trước yêu cầu <ArrowRight size={16} aria-hidden="true" />
              </button>
            </div>
          </section>
        </div>
        {summaryCard}
        <Modal open={stage === 'demo-preview'} onClose={() => setStage('review')} labelledBy={`${uid}-dp`}>
          <h2 id={`${uid}-dp`} className="dialog__title">
            Bản xem trước yêu cầu đặt phòng
          </h2>
          <p className="dialog__pending" role="status">
            Bản nháp chỉ tồn tại trên giao diện này. Yêu cầu chưa được gửi, chưa có phòng nào được giữ và chưa có thanh
            toán.
          </p>
          <p>
            Khi kênh liên hệ được cập nhật, bạn có thể gửi thông tin này cho Đinh Vân để được xác nhận tình trạng phòng.
          </p>
          <div className="dialog__actions">
            <button type="button" className="btn btn--light" data-autofocus onClick={() => setStage('review')}>
              Quay lại xem lại
            </button>
            <button type="button" className="btn btn--primary" onClick={() => openDialog({ type: 'contact', channel: 'zalo', need: `Đặt phòng ${stay.name} – ${room.name}, ${dayLabel(sel.checkIn!)} → ${dayLabel(sel.checkOut!)}, ${guests} khách` })}>
              Liên hệ Đinh Vân
            </button>
          </div>
        </Modal>
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
          <ul className="co-addons">
            {ADD_ONS.map((a) => {
              const state = addOns[a.id];
              const included = a.id === 'breakfast' && room.breakfastIncluded;
              return (
                <li key={a.id} className="addon" data-selected={state.selected || undefined}>
                  <label className="addon__label">
                    <span className="addon__media">
                      <Image src={a.image} alt="" fill sizes="(max-width: 767px) 45vw, 195px" />
                    </span>
                    <input type="checkbox" className="addon__input" checked={state.selected} disabled={included} onChange={() => toggleAddOn(a.id)} />
                    <span className="addon__box addon__box--img" aria-hidden="true">
                      <Check size={14} strokeWidth={3} />
                    </span>
                    <span className="addon__body">
                      <span className="addon__box" aria-hidden="true">
                        <Check size={14} strokeWidth={3} />
                      </span>
                      <span className="addon__name">{a.name}</span>
                      <span className="addon__price">
                        {included ? (
                          'Đã bao gồm'
                        ) : (
                          <>
                            <b>{formatVnd(a.unitPriceVnd)}</b> {a.unitLabel}
                          </>
                        )}
                      </span>
                      <span className="addon__desc">{a.description}</span>
                    </span>
                  </label>
                  {state.selected && a.id !== 'breakfast' && (
                    <div className="addon__qty">
                      {a.id === 'airport-transfer' && (
                        <>
                          <span>{a.quantityLabel}</span>
                          <Stepper label="Số lượt" value={addOns['airport-transfer'].trips} min={1} max={ADD_ON_LIMITS.transferTrips} onChange={(v) => setAddOns((x) => ({ ...x, 'airport-transfer': { ...x['airport-transfer'], trips: v } }))} />
                        </>
                      )}
                      {a.id === 'forest-tour' && (
                        <>
                          <span>{a.quantityLabel}</span>
                          <Stepper label="Số người" value={addOns['forest-tour'].participants} min={1} max={guests} onChange={(v) => setAddOns((x) => ({ ...x, 'forest-tour': { ...x['forest-tour'], participants: v } }))} />
                        </>
                      )}
                      {a.id === 'bike-rental' && (
                        <>
                          <span>Số xe</span>
                          <Stepper label="Số xe" value={addOns['bike-rental'].bikes} min={1} max={ADD_ON_LIMITS.bikes} onChange={(v) => setAddOns((x) => ({ ...x, 'bike-rental': { ...x['bike-rental'], bikes: v } }))} />
                          <span>Số ngày</span>
                          <Stepper label="Số ngày thuê" value={addOns['bike-rental'].days} min={1} max={n} onChange={(v) => setAddOns((x) => ({ ...x, 'bike-rental': { ...x['bike-rental'], days: v } }))} />
                        </>
                      )}
                    </div>
                  )}
                  {state.selected && a.id === 'breakfast' && !included && (
                    <p className="addon__calc">
                      {guests} người × {n} ngày
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
          {errors.addons && (
            <p className="co-err" role="alert">
              {errors.addons}
            </p>
          )}
        </Section>

        <Section n={3} title="Mã giảm giá & Ghi chú">
          <div className="co-coupon-row">
            <div className="co-field">
              <span className="sr-only" id={`${uid}-cp-l`}>
                Mã giảm giá
              </span>
              <div className="co-coupon">
                <span className="co-coupon__ic" aria-hidden="true">
                  <Tag size={22} />
                </span>
                <input
                  className="co-input"
                  aria-labelledby={`${uid}-cp-l`}
                  aria-describedby={couponMsg ? `${uid}-cp-m` : undefined}
                  value={couponInput}
                  placeholder="Nhập mã giảm giá (nếu có)"
                  onChange={(e) => setCouponInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      applyCoupon();
                    }
                  }}
                />
                <button type="button" className="co-coupon__btn" onClick={applyCoupon}>
                  Áp dụng
                </button>
              </div>
              {couponMsg && (
                <p className={couponMsg.ok ? 'co-ok' : 'co-err'} id={`${uid}-cp-m`} role="status">
                  {couponMsg.text}
                  {coupon && (
                    <button
                      type="button"
                      className="co-link"
                      onClick={() => {
                        setCoupon(null);
                        setCouponInput('');
                        setCouponMsg({ ok: true, text: 'Đã xóa mã giảm giá.' });
                      }}
                    >
                      Xóa mã
                    </button>
                  )}
                </p>
              )}
            </div>
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
          </div>
        </Section>

        <Section n={4} title="Phương thức thanh toán" aside="Chọn mức thanh toán trước">
          <div className="co-pay">
            <fieldset className="co-plan">
              <legend className="sr-only">Mức thanh toán trước</legend>
              {(
                [
                  ['deposit', 'Thanh toán đặt cọc (30%)', 'Giữ chỗ ngay, thanh toán phần còn lại khi nhận phòng', <CreditCard key="c" size={30} aria-hidden="true" />],
                  ['full', 'Thanh toán toàn bộ', 'Thanh toán 100% để xác nhận đặt phòng', <Wallet key="w" size={30} aria-hidden="true" />],
                ] as const
              ).map(([id, t, d, icon]) => (
                <label key={id} className="pay-opt" data-checked={plan === id || undefined}>
                  <input type="radio" name={`${uid}-plan`} checked={plan === id} onChange={() => setPlan(id)} />
                  <span className="pay-opt__radio" aria-hidden="true" />
                  <span className="pay-opt__ic">{icon}</span>
                  <span className="pay-opt__text">
                    <strong>{t}</strong>
                    <span>{d}</span>
                  </span>
                </label>
              ))}
            </fieldset>
            <div className="pay-opt pay-opt--method" data-checked={method === 'bank-transfer' || undefined}>
              <button
                type="button"
                className="pay-opt__btn"
                aria-pressed={method === 'bank-transfer'}
                aria-expanded={methodPanel}
                aria-controls={`${uid}-method`}
                onClick={() => {
                  setMethod((m) => (m === 'bank-transfer' ? null : 'bank-transfer'));
                  setMethodPanel(true);
                }}
              >
                <span className="pay-opt__radio pay-opt__radio--square" aria-hidden="true" />
                <span className="pay-opt__ic pay-opt__ic--bank">
                  <Landmark size={26} aria-hidden="true" />
                </span>
                <span className="pay-opt__text">
                  <strong>Chuyển khoản ngân hàng</strong>
                  <span>Phương thức trả tiền (xem hướng dẫn)</span>
                </span>
              </button>
            </div>
          </div>
          {methodPanel && (
            <div id={`${uid}-method`} className="co-method-panel" role="region" aria-label="Hướng dẫn chuyển khoản">
              <Info size={16} aria-hidden="true" />
              <p>
                Phương thức thanh toán đang được cập nhật — đây là giao diện mô phỏng. Chưa có số tài khoản hay mã QR nhận
                tiền; Đinh Vân sẽ hướng dẫn khi xác nhận phòng.
              </p>
              <button type="button" className="co-link" onClick={() => setMethodPanel(false)}>
                Đóng
              </button>
            </div>
          )}
          <p className="co-secure">
            <LockKeyhole size={20} aria-hidden="true" />
            <span>Bản mô phỏng: website chưa thu tiền hay lưu thông tin thanh toán.</span>
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
            Giữ chỗ ngay <ArrowRight size={16} aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}

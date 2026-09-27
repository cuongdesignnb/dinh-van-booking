'use client';

import { CalendarDays, ChevronDown, Copy, LockKeyhole, MessageSquareText, Phone, Send, UserRound, Users, X } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { DateRangePicker } from '@/components/ui/DateRangePicker';
import { GuestPicker } from '@/components/ui/GuestPicker';
import { DemoNote, Modal } from '@/components/ui/Modal';
import { Popover } from '@/components/ui/Popover';
import { useSiteData } from '@/components/site/SiteDataProvider';
import { formatShort, fromKey, startOfToday } from '@/lib/dates';
import { takePendingNote } from '@/lib/draft-store';
import { parseSelection, readParam } from '@/lib/selection';
import { apiAdapter, type ConsultationDraft } from '@/lib/services/consultation';
import { MESSAGE_MAX, validateMessage, validateName, validatePhone } from '@/lib/validation';
import { publicSetting, publicText, richDocumentHasContent } from '@/lib/public-content';
import { RichContentRenderer } from '@/components/content/RichContentRenderer';
import type { RichDocument } from '@/lib/content/rich-document';

type Field = 'name' | 'phone' | 'date' | 'message';
type Status = 'editing' | 'validating' | 'submitted' | 'error';

function resolveContext(params: URLSearchParams): ConsultationDraft['context'] {
  const intent = readParam(params, 'intent');
  const item = readParam(params, 'item');
  if (intent === 'combo' && item) return { intent, id: item, label: item };
  if (intent === 'destination' && item) return { intent, id: item, label: item };
  if (intent === 'stay' && item) return { intent, id: item, label: item };
  if (intent === 'stay') return { intent, id: '', label: 'Chọn phòng nghỉ phù hợp' };
  if (intent === 'combo') return { intent, id: '', label: 'Combo du lịch' };
  return null;
}

export const CONTACT_FORM_ID = 'form-tu-van';

export function ConsultationForm() {
  const site = useSiteData();
  const contactPage = publicSetting(site.publicSite, 'contact.page');
  const formTitle = publicText(contactPage.formTitle);
  const messageLabel = publicText(contactPage.formMessageLabel) || 'Nhu cầu hoặc lời nhắn';
  const messagePlaceholder = publicText(contactPage.formMessagePlaceholder) || 'Chia sẻ thông tin để chúng tôi hiểu nhu cầu của bạn.';
  const submitLabel = publicText(contactPage.formSubmitLabel) || 'Gửi yêu cầu';
  const successMessage = contactPage.formSuccessMessage;
  const privacyNote = contactPage.formPrivacyNote;
  const uid = useId();
  const params = useSearchParams();
  const [context, setContext] = useState(() => resolveContext(params));
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [date, setDate] = useState<string | null>(() => parseSelection(params).checkIn);
  const [guests, setGuests] = useState<{ adults: number; children: number } | null>(() =>
    params.get('adults') ? { adults: parseSelection(params).adults, children: parseSelection(params).children } : null,
  );
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [status, setStatus] = useState<Status>('editing');
  const [adapterError, setAdapterError] = useState<string | null>(null);
  const [open, setOpen] = useState<null | 'date' | 'guests'>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const refs = {
    name: useRef<HTMLInputElement>(null),
    phone: useRef<HTMLInputElement>(null),
    date: useRef<HTMLButtonElement>(null),
    message: useRef<HTMLTextAreaElement>(null),
  };
  const guestRef = useRef<HTMLButtonElement>(null);

  // A note typed in a combo dialog arrives through memory only (never URL/storage).
  useEffect(() => {
    const note = takePendingNote();
    if (note) setMessage((m) => m || note);
  }, []);

  const check = (f: Field, value?: string): string | null => {
    switch (f) {
      case 'name':
        return validateName(value ?? name);
      case 'phone':
        return validatePhone(value ?? phone);
      case 'date':
        return date && fromKey(date) < startOfToday() ? 'Ngày dự kiến không hợp lệ' : null;
      case 'message':
        return validateMessage(value ?? message);
    }
  };
  const blur = (f: Field) => {
    setTouched((t) => ({ ...t, [f]: true }));
    setErrors((e) => ({ ...e, [f]: check(f) ?? undefined }));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (status === 'validating') return;
    const next: Partial<Record<Field, string>> = {};
    (['name', 'phone', 'date', 'message'] as Field[]).forEach((f) => {
      const m = check(f);
      if (m) next[f] = m;
    });
    setErrors(next);
    setTouched({ name: true, phone: true, date: true, message: true });
    const first = (['name', 'phone', 'date', 'message'] as Field[]).find((f) => next[f]);
    if (first) {
      refs[first].current?.focus();
      return;
    }
    setStatus('validating');
    setAdapterError(null);
    const result = await apiAdapter.submit({
      name,
      phone,
      checkIn: date,
      adults: guests?.adults ?? null,
      children: guests?.children ?? null,
      message,
      context,
    });
    if (result.status === 'error') {
      setAdapterError(result.message);
      setStatus('error');
    } else setStatus('submitted');
  };

  const summary = [
    `Họ và tên: ${name.trim()}`,
    `Số điện thoại: ${phone.trim()}`,
    date ? `Ngày dự kiến: ${formatShort(date)}` : null,
    guests ? `Số khách: ${guests.adults + guests.children}` : null,
    context ? `Quan tâm: ${context.label}` : null,
    message.trim() ? `Lời nhắn: ${message.trim()}` : null,
  ].filter(Boolean) as string[];

  const err = (f: Field) => (touched[f] ? errors[f] : undefined);
  const errorList = (['name', 'phone', 'date', 'message'] as Field[]).filter((f) => err(f));

  return (
    <form id={CONTACT_FORM_ID} className="cform" noValidate onSubmit={submit} aria-labelledby={formTitle ? `${uid}-t` : undefined} aria-label={formTitle || undefined}>
      {formTitle && <h2 className="cform__title" id={`${uid}-t`}>{formTitle}</h2>}
      {richDocumentHasContent(contactPage.formIntro) && <div className="cform__sub"><RichContentRenderer document={contactPage.formIntro as RichDocument} /></div>}

      {context && (
        <p className="cform__context">
          Tư vấn: <b>{context.label}</b>
          <button type="button" onClick={() => setContext(null)} aria-label={`Bỏ ngữ cảnh ${context.label}`}>
            <X size={13} aria-hidden="true" />
          </button>
        </p>
      )}

      {errorList.length > 1 && (
        <div className="cform__summary" role="alert">
          Vui lòng kiểm tra {errorList.length} mục được đánh dấu bên dưới.
        </div>
      )}

      <div className="cform__grid">
        <div className="cfield">
          <label className="cfield__label" htmlFor={`${uid}-name`}>
            Họ và tên <span className="req" aria-hidden="true">*</span>
            <span className="sr-only">(bắt buộc)</span>
          </label>
          <span className="cfield__box" data-invalid={err('name') ? '' : undefined}>
            <UserRound size={20} aria-hidden="true" />
            <input
              ref={refs.name}
              id={`${uid}-name`}
              name="name"
              autoComplete="name"
              value={name}
              placeholder="Ví dụ: Nguyễn Văn A"
              aria-required="true"
              aria-invalid={!!err('name')}
              aria-describedby={err('name') ? `${uid}-name-e` : undefined}
              onChange={(e) => {
                setName(e.target.value);
                if (touched.name) setErrors((x) => ({ ...x, name: check('name', e.target.value) ?? undefined }));
              }}
              onBlur={() => blur('name')}
            />
          </span>
          {err('name') && (
            <p className="cfield__err" id={`${uid}-name-e`}>
              {err('name')}
            </p>
          )}
        </div>
        <div className="cfield">
          <label className="cfield__label" htmlFor={`${uid}-phone`}>
            Số điện thoại <span className="req" aria-hidden="true">*</span>
            <span className="sr-only">(bắt buộc)</span>
          </label>
          <span className="cfield__box" data-invalid={err('phone') ? '' : undefined}>
            <Phone size={19} aria-hidden="true" />
            <input
              ref={refs.phone}
              id={`${uid}-phone`}
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              placeholder="Ví dụ: 09xx xxx xxx"
              aria-required="true"
              aria-invalid={!!err('phone')}
              aria-describedby={err('phone') ? `${uid}-phone-e` : undefined}
              onChange={(e) => {
                setPhone(e.target.value);
                if (touched.phone) setErrors((x) => ({ ...x, phone: check('phone', e.target.value) ?? undefined }));
              }}
              onBlur={() => blur('phone')}
            />
          </span>
          {err('phone') && (
            <p className="cfield__err" id={`${uid}-phone-e`}>
              {err('phone')}
            </p>
          )}
        </div>
        <div className="cfield">
          <span className="cfield__label" id={`${uid}-date-l`}>
            Ngày nhận phòng <span className="cfield__opt">(dự kiến)</span>
          </span>
          <button
            ref={refs.date}
            type="button"
            className="cfield__box cfield__btn"
            data-invalid={err('date') ? '' : undefined}
            aria-haspopup="dialog"
            aria-expanded={open === 'date'}
            aria-labelledby={`${uid}-date-l ${uid}-date-v`}
            aria-describedby={err('date') ? `${uid}-date-e` : undefined}
            onClick={() => setOpen(open === 'date' ? null : 'date')}
          >
            <CalendarDays size={20} aria-hidden="true" />
            <span id={`${uid}-date-v`} data-filled={date ? '' : undefined}>
              {date ? formatShort(date) : 'Chọn ngày'}
            </span>
          </button>
          {err('date') && (
            <p className="cfield__err" id={`${uid}-date-e`}>
              {err('date')}
            </p>
          )}
        </div>
        <div className="cfield">
          <span className="cfield__label" id={`${uid}-g-l`}>
            Số khách <span className="cfield__opt">(dự kiến)</span>
          </span>
          <button
            ref={guestRef}
            type="button"
            className="cfield__box cfield__btn"
            aria-haspopup="dialog"
            aria-expanded={open === 'guests'}
            aria-labelledby={`${uid}-g-l ${uid}-g-v`}
            onClick={() => setOpen(open === 'guests' ? null : 'guests')}
          >
            <Users size={20} aria-hidden="true" />
            <span id={`${uid}-g-v`} data-filled={guests ? '' : undefined}>
              {guests ? `${guests.adults + guests.children} khách` : 'Ví dụ: 2 khách'}
            </span>
            <ChevronDown className="cfield__chev" size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="cfield cfield--wide">
          <label className="cfield__label" htmlFor={`${uid}-msg`}>
            {messageLabel}
          </label>
          <span className="cfield__box cfield__box--area" data-invalid={err('message') ? '' : undefined}>
            <MessageSquareText size={21} aria-hidden="true" />
            <textarea
              ref={refs.message}
              id={`${uid}-msg`}
              name="message"
              rows={5}
              value={message}
              placeholder={messagePlaceholder}
              aria-invalid={!!err('message')}
              aria-describedby={`${uid}-msg-c${err('message') ? ` ${uid}-msg-e` : ''}`}
              onChange={(e) => {
                setMessage(e.target.value);
                if (touched.message) setErrors((x) => ({ ...x, message: check('message', e.target.value) ?? undefined }));
              }}
              onBlur={() => blur('message')}
            />
            <span className="cfield__count" id={`${uid}-msg-c`} data-over={message.length > MESSAGE_MAX || undefined}>
              {message.length}/{MESSAGE_MAX}
            </span>
          </span>
          {err('message') && (
            <p className="cfield__err" id={`${uid}-msg-e`}>
              {err('message')}
            </p>
          )}
        </div>
      </div>

      {adapterError && (
        <p className="cform__adapter-err" role="alert">
          {adapterError}
        </p>
      )}

      <button type="submit" className="btn btn--primary cform__submit btn-shine" disabled={status === 'validating'} aria-busy={status === 'validating'}>
        <Send size={20} aria-hidden="true" />
        {status === 'validating' ? 'Đang kiểm tra thông tin…' : submitLabel}
      </button>
      {richDocumentHasContent(privacyNote) && <div className="cform__privacy"><LockKeyhole size={13} aria-hidden="true" /><RichContentRenderer document={privacyNote as RichDocument} /></div>}

      <Popover id={`${uid}-cal`} label="Chọn ngày dự kiến" anchorRef={refs.date} open={open === 'date'} onClose={() => setOpen(null)}>
        <DateRangePicker
          checkIn={date}
          checkOut={null}
          field="in"
          onFieldChange={() => undefined}
          onChange={(d) => {
            setDate(d);
            setErrors((x) => ({ ...x, date: undefined }));
            if (d) {
              setOpen(null);
              refs.date.current?.focus();
            }
          }}
          onDone={() => setOpen(null)}
        />
      </Popover>
      <Popover id={`${uid}-gp`} label="Chọn số khách" anchorRef={guestRef} open={open === 'guests'} onClose={() => setOpen(null)}>
        <GuestPicker
          adults={guests?.adults ?? 2}
          childCount={guests?.children ?? 0}
          onChange={(adults, children) => setGuests({ adults, children })}
          onDone={() => {
            setGuests((g) => g ?? { adults: 2, children: 0 });
            setOpen(null);
            guestRef.current?.focus();
          }}
        />
      </Popover>

      <Modal open={status === 'submitted'} onClose={() => setStatus('editing')} labelledBy={`${uid}-pv`}>
        <h2 id={`${uid}-pv`} className="dialog__title">
          Đã nhận yêu cầu tư vấn
        </h2>
        <p className="dialog__pending" role="status">
          {richDocumentHasContent(successMessage) ? <RichContentRenderer document={successMessage as RichDocument} /> : 'Yêu cầu của bạn đã được lưu.'}
        </p>
        <ul className="preview-list">
          {summary.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
        {!site.contact.zaloUrl && !site.contact.phone && <DemoNote>Kênh liên hệ trực tiếp chưa được cấu hình.</DemoNote>}
        <div className="dialog__actions">
          <button type="button" className="btn btn--light" data-autofocus onClick={() => setStatus('editing')}>
            Quay lại chỉnh sửa
          </button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(summary.join('\n'));
                setCopied('Đã sao chép nội dung.');
              } catch {
                setCopied('Không sao chép được, hãy chọn và sao chép thủ công.');
              }
            }}
          >
            <Copy size={16} aria-hidden="true" /> Sao chép nội dung
          </button>
          <span className="dialog__copied" role="status">
            {copied}
          </span>
        </div>
      </Modal>
    </form>
  );
}

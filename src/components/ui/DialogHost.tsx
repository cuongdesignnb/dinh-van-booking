'use client';

import { ArrowRight, Copy, Info, MapPin, Star, Users, X } from 'lucide-react';
import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { siteConfig } from '@/config/site';
import { destinations, formatVnd, stays, testimonials } from '@/data/home-fixtures';
import { formatShort, nightsBetween } from '@/lib/dates';
import { onDialogRequest, openDialog, type DialogRequest } from '@/lib/events';

/**
 * One native <dialog> for every frontend-only detail view. `showModal()` gives
 * us inert background, Escape handling and a focus boundary; we restore focus
 * to the opener ourselves.
 */
export function DialogHost() {
  const ref = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const [req, setReq] = useState<DialogRequest | null>(null);

  useEffect(
    () =>
      onDialogRequest((next) => {
        if (!ref.current?.open) opener.current = document.activeElement as HTMLElement | null;
        setReq(next);
      }),
    [],
  );

  useEffect(() => {
    const d = ref.current;
    if (!d || !req) return;
    if (!d.open) d.showModal();
    d.querySelector<HTMLElement>('.dialog__body')?.scrollTo({ top: 0 });
    d.querySelector<HTMLElement>('[data-autofocus]')?.focus();
  }, [req]);

  const close = useCallback(() => ref.current?.close(), []);

  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-labelledby="dialog-title"
      onClose={() => {
        setReq(null);
        opener.current?.focus?.();
      }}
      onClick={(e) => {
        if (e.target === ref.current) close();
      }}
    >
      {req && (
        <div className="dialog__panel">
          <button type="button" className="dialog__close icon-btn" onClick={close} aria-label="Đóng hộp thoại">
            <X size={18} aria-hidden="true" />
          </button>
          <div className="dialog__body">
            <DialogContent key={JSON.stringify(req)} req={req} />
          </div>
        </div>
      )}
    </dialog>
  );
}

function DemoNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="dialog__note">
      <Info size={15} aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}

function DialogContent({ req }: { req: DialogRequest }) {
  switch (req.type) {
    case 'stay': {
      const s = stays.find((x) => x.id === req.id);
      if (!s) return <Missing />;
      return (
        <>
          <div className="dialog__media">
            <Image src={s.image.src} alt={s.image.alt} fill sizes="(max-width: 640px) 100vw, 560px" />
          </div>
          <h2 id="dialog-title" className="dialog__title">
            {s.name}
          </h2>
          <p className="dialog__meta">
            <Star size={15} className="star" aria-hidden="true" />
            <strong>{s.rating.toFixed(1)}</strong> ({s.reviewCount} đánh giá mẫu)
            <span className="dot" aria-hidden="true" />
            <MapPin size={15} aria-hidden="true" /> {s.location}
          </p>
          <p>{s.summary}</p>
          <ul className="chips">
            {s.amenities.map((a) => (
              <li key={a}>{a}</li>
            ))}
            <li>Tối đa {s.maxGuests} khách</li>
          </ul>
          <p className="dialog__price">
            Từ <strong>{formatVnd(s.pricePerNight)}</strong> / đêm
          </p>
          <DemoNote>Giá và đánh giá là dữ liệu minh họa; tình trạng phòng sẽ được xác nhận khi tư vấn.</DemoNote>
          <div className="dialog__actions">
            <button
              type="button"
              className="btn btn--primary"
              data-autofocus
              onClick={() => openDialog({ type: 'contact', channel: 'zalo', need: `Tư vấn phòng: ${s.name}` })}
            >
              Nhờ tư vấn phòng này <ArrowRight size={16} aria-hidden="true" />
            </button>
          </div>
        </>
      );
    }
    case 'all-stays':
      return (
        <>
          <h2 id="dialog-title" className="dialog__title">
            Tất cả phòng nghỉ
          </h2>
          <p className="dialog__lead">Những nơi lưu trú được yêu thích tại Cúc Phương.</p>
          <StayList list={stays} />
          <DemoNote>Danh sách minh họa. Giá và tình trạng phòng sẽ được xác nhận khi tư vấn.</DemoNote>
        </>
      );
    case 'search-results': {
      const guests = req.adults + req.children;
      const nights = nightsBetween(req.checkIn, req.checkOut);
      const list = stays.filter((s) => s.maxGuests >= guests);
      return (
        <>
          <h2 id="dialog-title" className="dialog__title">
            Gợi ý phòng nghỉ cho bạn
          </h2>
          <p className="dialog__lead">
            {formatShort(req.checkIn)} → {formatShort(req.checkOut)} · {nights} đêm · {guests} khách
            {req.children > 0 ? ` (${req.children} trẻ em)` : ''}
          </p>
          <DemoNote>Đây là gợi ý theo nhu cầu; tình trạng phòng sẽ được xác nhận khi tư vấn.</DemoNote>
          {list.length ? (
            <StayList list={list} nights={nights} />
          ) : (
            <p className="dialog__empty">
              Chưa có phòng mẫu phù hợp cho {guests} khách. Hãy nhắn cho mình để được gợi ý ghép phòng nhé!
            </p>
          )}
          <div className="dialog__actions">
            <button
              type="button"
              className="btn btn--primary"
              data-autofocus
              onClick={() =>
                openDialog({
                  type: 'contact',
                  channel: 'zalo',
                  need: `Tìm phòng ${formatShort(req.checkIn)} - ${formatShort(req.checkOut)}, ${guests} khách`,
                })
              }
            >
              Nhờ tư vấn nhanh <ArrowRight size={16} aria-hidden="true" />
            </button>
          </div>
        </>
      );
    }
    case 'destination': {
      const d = destinations.find((x) => x.id === req.id);
      if (!d) return <Missing />;
      return (
        <>
          <div className="dialog__media">
            <Image src={d.image.src} alt={d.image.alt} fill sizes="(max-width: 640px) 100vw, 560px" />
          </div>
          <h2 id="dialog-title" className="dialog__title">
            {d.name}
          </h2>
          <p className="dialog__lead">{d.subtitle}</p>
          <p>{d.description}</p>
          <DemoNote>Nội dung giới thiệu mẫu, chưa phải hướng dẫn du lịch đã kiểm chứng.</DemoNote>
          <div className="dialog__actions">
            <button
              type="button"
              className="btn btn--primary"
              data-autofocus
              onClick={() => openDialog({ type: 'contact', channel: 'zalo', need: `Gợi ý lịch trình: ${d.name}` })}
            >
              Gợi ý lịch trình <ArrowRight size={16} aria-hidden="true" />
            </button>
          </div>
        </>
      );
    }
    case 'all-destinations':
      return (
        <>
          <h2 id="dialog-title" className="dialog__title">
            Khám phá Cúc Phương - Ninh Bình
          </h2>
          <p className="dialog__lead">Không chỉ là nghỉ dưỡng, mà còn là những trải nghiệm đáng nhớ.</p>
          <ul className="dialog__list">
            {destinations.map((d, i) => (
              <li key={d.id} style={{ '--i': i } as React.CSSProperties}>
                <button
                  type="button"
                  className="list-card"
                  data-autofocus={i === 0 || undefined}
                  onClick={() => openDialog({ type: 'destination', id: d.id })}
                >
                  <span className="list-card__img">
                    <Image src={d.image.src} alt="" fill sizes="96px" />
                  </span>
                  <span className="list-card__text">
                    <strong>{d.name}</strong>
                    <span>{d.subtitle}</span>
                  </span>
                  <ArrowRight size={16} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        </>
      );
    case 'reviews':
      return (
        <>
          <h2 id="dialog-title" className="dialog__title">
            Khách hàng nói về {siteConfig.name}
          </h2>
          <DemoNote>Các nhận xét dưới đây là nội dung mẫu của thiết kế, chưa phải đánh giá đã xác minh.</DemoNote>
          <ul className="dialog__reviews">
            {testimonials.map((t) => (
              <li key={t.id}>
                <blockquote>“{t.quote}”</blockquote>
                <p>
                  <strong>{t.author}</strong> · {t.context}
                </p>
              </li>
            ))}
          </ul>
        </>
      );
    case 'combo':
      return (
        <ContactPending
          title="Tư vấn combo du lịch"
          lead="Combo phòng nghỉ + trải nghiệm (xe đưa đón, hướng dẫn rừng, ẩm thực) được thiết kế theo nhu cầu của bạn."
          need="Mình muốn tư vấn combo du lịch Cúc Phương - Ninh Bình"
        />
      );
    case 'contact':
      return (
        <ContactPending
          title={
            req.channel === 'zalo'
              ? 'Nhắn Zalo cho Đinh Vân'
              : req.channel === 'phone'
                ? 'Gọi cho Đinh Vân'
                : 'Kết nối với Đinh Vân'
          }
          lead="Hãy liên hệ với mình để được gợi ý phòng nghỉ, lịch trình phù hợp nhất nhé!"
          need={req.need ?? ''}
        />
      );
  }
}

function StayList({ list, nights }: { list: typeof stays; nights?: number }) {
  return (
    <ul className="dialog__list">
      {list.map((s, i) => (
        <li key={s.id} style={{ '--i': i } as React.CSSProperties}>
          <button type="button" className="list-card" onClick={() => openDialog({ type: 'stay', id: s.id })}>
            <span className="list-card__img">
              <Image src={s.image.src} alt="" fill sizes="96px" />
            </span>
            <span className="list-card__text">
              <strong>{s.name}</strong>
              <span>
                <Star size={13} className="star" aria-hidden="true" /> {s.rating.toFixed(1)} · {s.location}
              </span>
              <span>
                <Users size={13} aria-hidden="true" /> Tối đa {s.maxGuests} khách · Từ{' '}
                <b>{formatVnd(s.pricePerNight)}</b> / đêm
                {nights ? ` · ước tính ${formatVnd(s.pricePerNight * nights)} / ${nights} đêm` : ''}
              </span>
            </span>
            <ArrowRight size={16} aria-hidden="true" />
          </button>
        </li>
      ))}
    </ul>
  );
}

function ContactPending({ title, lead, need }: { title: string; lead: string; need: string }) {
  const [text, setText] = useState(need);
  const [copied, setCopied] = useState<'idle' | 'ok' | 'fail'>('idle');
  const { contact } = siteConfig;
  const hasContact = contact.zaloUrl || contact.phone;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied('ok');
    } catch {
      setCopied('fail');
    }
  };
  return (
    <>
      <h2 id="dialog-title" className="dialog__title">
        {title}
      </h2>
      <p className="dialog__lead">{lead}</p>
      {!hasContact && (
        <p className="dialog__pending" role="status">
          <Info size={16} aria-hidden="true" /> Thông tin liên hệ đang được cập nhật.
        </p>
      )}
      <label className="field">
        <span className="field__label">Nhu cầu của bạn (để sao chép gửi cho mình)</span>
        <textarea
          className="field__input"
          rows={4}
          value={text}
          data-autofocus
          placeholder="Ví dụ: 2 người lớn, 1 trẻ em, muốn ở gần Vườn quốc gia 2 đêm…"
          onChange={(e) => {
            setText(e.target.value);
            setCopied('idle');
          }}
        />
      </label>
      <div className="dialog__actions">
        <button type="button" className="btn btn--light" onClick={copy} disabled={!text.trim()}>
          <Copy size={16} aria-hidden="true" /> Sao chép nhu cầu
        </button>
        <span className="dialog__copied" role="status">
          {copied === 'ok' ? 'Đã sao chép.' : copied === 'fail' ? 'Không sao chép được, hãy chọn và sao chép thủ công.' : ''}
        </span>
      </div>
    </>
  );
}

function Missing() {
  return (
    <h2 id="dialog-title" className="dialog__title">
      Không tìm thấy nội dung
    </h2>
  );
}

'use client';

import { ArrowRight, Leaf, MapPin } from 'lucide-react';
import Image from 'next/image';
import { useId, useState } from 'react';
import { DemoNote, Modal } from '@/components/ui/Modal';
import { siteConfig } from '@/config/site';
import { CONTACT_FORM_ID } from './ConsultationForm';

export function FocusFormButton({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        const form = document.getElementById(CONTACT_FORM_ID);
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        form?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
        form?.querySelector<HTMLInputElement>('input[name="name"]')?.focus({ preventScroll: true });
      }}
    >
      {children}
    </button>
  );
}

function MapCanvas({ large }: { large?: boolean }) {
  return (
    <div className={`cmap${large ? ' cmap--large' : ''}`}>
      <Image src="/images/dinh-van-booking/pages/map-contact.webp" alt="" fill sizes={large ? '780px' : '456px'} className="cmap__bg" />
      <span className="cmap__place cmap__place--vqg">
        <svg viewBox="0 0 24 28" width="18" height="21" aria-hidden="true">
          <path d="M12 1 4 12h4l-5 7h6v7h6v-7h6l-5-7h4Z" fill="#1f5a2c" />
        </svg>
        Vườn quốc gia
        <br />
        Cúc Phương
      </span>
      <span className="cmap__place cmap__place--td">
        <i aria-hidden="true" /> Tam Điệp
      </span>
      <span className="cmap__place cmap__place--nq">
        Nho Quan <i aria-hidden="true" />
      </span>
      <span className="cmap__road" aria-hidden="true">
        QL12B
      </span>
      <span className="cmap__place cmap__place--nb">
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
          <path d="M12 2 5 7h14Zm-6 6h12v2H6Zm1 3h10v2H7Zm-2 3h14v2H5Zm1 3h12v4H6Z" fill="#1c2a20" />
        </svg>
        Ninh Bình
      </span>
      <span className="cmap__pin" aria-hidden="true">
        <svg viewBox="0 0 24 32" width="26" height="36">
          <path d="M12 1C6 1 1.5 5.6 1.5 11.4 1.5 19.2 12 31 12 31s10.5-11.8 10.5-19.6C22.5 5.6 18 1 12 1Z" fill="#1c4a28" />
          <circle cx="12" cy="11.5" r="4.3" fill="#fff" />
        </svg>
      </span>
      <span className="cmap__pop">
        <strong>{siteConfig.name}</strong>
        Cúc Phương – Ninh Bình
      </span>
      {!large && (
        <p className="cmap__script handwritten" aria-hidden="true">
          Giữa thiên nhiên hùng vĩ,
          <br /> luôn có một người bạn địa phương
          <br /> sẵn sàng đồng hành cùng bạn!
        </p>
      )}
      <span className="cmap__badge">Bản đồ minh họa</span>
    </div>
  );
}

export function ContactMap() {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <section className="cmap-card" aria-labelledby={`${id}-t`}>
      <div className="cmap-card__head">
        <div>
          <h2 className="cmap-card__title" id={`${id}-t`}>
            Chúng tôi ở đây
          </h2>
          <p className="cmap-card__sub">
            <MapPin size={13} aria-hidden="true" /> Cúc Phương – Ninh Bình
          </p>
        </div>
        <button type="button" className="link-more" aria-haspopup="dialog" onClick={() => setOpen(true)}>
          Xem chỉ đường <ArrowRight size={15} aria-hidden="true" />
        </button>
      </div>
      <MapCanvas />
      <Modal open={open} onClose={() => setOpen(false)} labelledBy={`${id}-d`} size="xl">
        <h2 id={`${id}-d`} className="dialog__title">
          Vị trí Đinh Vân Booking
        </h2>
        <DemoNote>
          Bản đồ minh họa. Địa chỉ chi tiết và chỉ đường sẽ có khi thông tin được xác nhận — hiện chưa có liên kết chỉ
          đường.
        </DemoNote>
        <MapCanvas large />
      </Modal>
    </section>
  );
}

export function ScriptNote() {
  return (
    <p className="social-note">
      <Leaf size={30} aria-hidden="true" fill="currentColor" strokeWidth={1} />
      <span className="handwritten">
        Mỗi chuyến đi là một câu chuyện đẹp
        <br /> Để Đinh Vân đồng hành cùng câu chuyện của bạn!
      </span>
    </p>
  );
}

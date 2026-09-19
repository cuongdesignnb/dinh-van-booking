import { Phone, Users } from 'lucide-react';
import Image from 'next/image';
import { ActionButton } from '@/components/ui/ActionButton';
import { BrandIcon } from '@/components/ui/BrandIcons';
import { LeafSprig } from '@/components/ui/Decor';
import { siteConfig } from '@/config/site';

export function PersonalContact() {
  const { contact } = siteConfig;
  return (
    <section
      className="contact"
      id="lien-he"
      aria-labelledby="contact-title"
      data-reveal="zoom"
      style={{ '--d': '1800ms' } as React.CSSProperties}
    >
      <Image
        src="/images/dinh-van-booking/advisor-panel.webp"
        alt="Hình minh họa người hướng dẫn đội mũ, đeo balô giữa núi rừng"
        fill
        sizes="(max-width: 1023px) 100vw, 506px"
        className="contact__img"
      />
      <div className="contact__veil" aria-hidden="true" />
      <LeafSprig className="contact__leaf" />
      <div className="contact__content">
        <h2 className="contact__title handwritten" id="contact-title">
          Bạn cần tư vấn riêng?
        </h2>
        <p className="contact__text">
          Hãy liên hệ với mình để được gợi ý phòng nghỉ,
          <br /> lịch trình phù hợp nhất nhé!
        </p>
        <div className="contact__actions">
          {contact.zaloUrl ? (
            <a className="btn btn--primary btn--contact" href={contact.zaloUrl} target="_blank" rel="noopener noreferrer">
              <span className="zalo-badge">
                <BrandIcon name="zalo" size={16} />
              </span>
              Nhắn Zalo ngay
            </a>
          ) : (
            <ActionButton
              action={{ type: 'contact', channel: 'zalo' }}
              className="btn btn--primary btn--contact btn-shine"
              magnetic
            >
              <span className="zalo-badge">
                <BrandIcon name="zalo" size={16} />
              </span>
              Nhắn Zalo ngay
            </ActionButton>
          )}
          {contact.phone ? (
            <a className="btn btn--light btn--contact" href={`tel:${contact.phone}`}>
              <Phone size={18} fill="currentColor" strokeWidth={0} aria-hidden="true" /> Gọi cho mình
            </a>
          ) : (
            <ActionButton action={{ type: 'contact', channel: 'phone' }} className="btn btn--light btn--contact" magnetic>
              <Phone size={18} fill="currentColor" strokeWidth={0} aria-hidden="true" /> Gọi cho mình
            </ActionButton>
          )}
        </div>
        <p className="contact__sign">
          <Users size={15} aria-hidden="true" /> Đinh Vân – Người bản địa, luôn sẵn sàng hỗ trợ bạn!
        </p>
      </div>
      <p className="contact__note handwritten" aria-hidden="true">
        <span>Hẹn gặp bạn</span>
        <span>
          ở Cúc Phương!
          <svg viewBox="0 0 24 24" width="13" height="13" focusable="false">
            <path
              d="M12 20.5s-7.5-4.6-8.9-9.4C2 7.4 4.6 4.5 7.6 4.9c1.9.2 3.4 1.6 4.4 3.3 1-1.7 2.5-3.1 4.4-3.3 3-.4 5.6 2.5 4.5 6.2-1.4 4.8-8.9 9.4-8.9 9.4Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            />
          </svg>
        </span>
      </p>
    </section>
  );
}

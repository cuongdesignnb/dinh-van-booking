import { ArrowRight, Globe, Heart, Leaf, MapPin, Phone, ShieldCheck, Sprout, Star, Users, Zap } from 'lucide-react';
import type { Metadata } from 'next';
import Image from 'next/image';
import { Suspense } from 'react';
import { ConsultationForm } from '@/components/contact/ConsultationForm';
import { ContactMap, FocusFormButton, ScriptNote } from '@/components/contact/ContactWidgets';
import { PageShell } from '@/components/layout/PageShell';
import { FaqCard } from '@/components/shared/FaqCard';
import { ActionButton } from '@/components/ui/ActionButton';
import { BrandIcon, brandTitle } from '@/components/ui/BrandIcons';
import { LeafSprig } from '@/components/ui/Decor';
import { siteConfig } from '@/config/site';
import { contactFaqs } from '@/data/reviews';
import '@/styles/contact.css';

export const metadata: Metadata = {
  title: 'Liên hệ tư vấn riêng — Đinh Vân Booking',
  description: 'Chia sẻ kế hoạch chuyến đi Cúc Phương – Ninh Bình để Đinh Vân tư vấn tận tình.',
};

const SOCIALS = ['facebook', 'instagram', 'youtube', 'tiktok'] as const;

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await searchParams;
  const { contact, social } = siteConfig;
  return (
    <PageShell className="page-contact">
      <section className="phero phero--contact" aria-labelledby="contact-h1">
        <div className="phero__media" aria-hidden="true">
          <Image src="/images/dinh-van-booking/pages/contact-hero.webp" alt="" fill priority sizes="100vw" className="phero__img" />
          <div className="phero__shade" />
        </div>
        <div className="phero__inner content-shell">
          <p className="phero__script handwritten" data-reveal="write">
            Xin chào!
          </p>
          <h1 id="contact-h1" className="phero__title" data-reveal="fade-up" style={{ '--d': '120ms' } as React.CSSProperties}>
            Rất vui được lắng nghe
            <br /> kế hoạch của bạn!
          </h1>
          <p className="phero__text" data-reveal="fade-up" style={{ '--d': '240ms' } as React.CSSProperties}>
            Hãy chia sẻ mong muốn của bạn, <b>Đinh Vân</b> sẽ tư vấn tận tình
            <br /> để giúp bạn có một chuyến đi Cúc Phương – Ninh Bình thật trọn vẹn.
          </p>
          <ul className="contact-promises">
            <li data-reveal="pop" style={{ '--d': '350ms' } as React.CSSProperties}>
              <span aria-hidden="true">
                <Leaf size={20} fill="currentColor" strokeWidth={1.3} />
              </span>
              Tư vấn chân thành
              <br /> như người địa phương
            </li>
            <li data-reveal="pop" style={{ '--d': '450ms' } as React.CSSProperties}>
              <span aria-hidden="true">
                <Heart size={20} fill="currentColor" strokeWidth={0} />
              </span>
              Gợi ý phù hợp nhu cầu
              <br /> và ngân sách của bạn
            </li>
            <li data-reveal="pop" style={{ '--d': '550ms' } as React.CSSProperties}>
              <span aria-hidden="true">
                <Users size={20} fill="currentColor" strokeWidth={1.3} />
              </span>
              Đồng hành trước - trong - sau chuyến đi
            </li>
          </ul>
          <p className="contact-hero__quote handwritten" aria-hidden="true">
            “Những chuyến đi đẹp
            <br /> bắt đầu từ những cuộc trò chuyện
            <br /> chân thành.
            <span className="contact-hero__sign">
              Đinh Vân
              <svg viewBox="0 0 24 24" width="22" height="22" focusable="false">
                <path
                  d="M12 20.5s-7.5-4.6-8.9-9.4C2 7.4 4.6 4.5 7.6 4.9c1.9.2 3.4 1.6 4.4 3.3 1-1.7 2.5-3.1 4.4-3.3 3-.4 5.6 2.5 4.5 6.2-1.4 4.8-8.9 9.4-8.9 9.4Z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                />
              </svg>
            </span>
          </p>
        </div>
      </section>

      <div className="contact-grid content-shell">
        <div className="contact-col contact-col--form">
          <LeafSprig className="contact-col__leaf" />
          <Suspense fallback={<div className="cform">Đang tải biểu mẫu…</div>}>
            <ConsultationForm />
          </Suspense>
          <FaqCard
            className="contact-faq"
            title="Câu hỏi thường gặp"
            items={contactFaqs}
            preview={3}
            icon="plus"
            variant="boxed"
            moreLabel="Xem tất cả"
            subtitle="Một số thắc mắc phổ biến từ du khách. Nếu bạn cần thêm thông tin, hãy liên hệ trực tiếp nhé!"
          />
        </div>

        <div className="contact-col contact-col--mid">
          <section className="quick" aria-labelledby="quick-t">
            <h2 className="quick__title" id="quick-t">
              Liên hệ nhanh với Đinh Vân
            </h2>
            <p className="quick__sub">Bạn có thể liên hệ trực tiếp qua Zalo hoặc gọi điện để được tư vấn nhanh nhất.</p>
            <div className="quick__cards">
              {contact.phone ? (
                <a className="quick__card quick__card--call" href={`tel:${contact.phone}`}>
                  <span className="quick__ic" aria-hidden="true">
                    <Phone size={24} fill="currentColor" strokeWidth={0} />
                  </span>
                  <span>
                    <strong>Gọi ngay</strong>
                    {contact.phone}
                  </span>
                </a>
              ) : (
                <ActionButton action={{ type: 'contact', channel: 'phone' }} className="quick__card quick__card--call">
                  <span className="quick__ic" aria-hidden="true">
                    <Phone size={24} fill="currentColor" strokeWidth={0} />
                  </span>
                  <span>
                    <strong>Gọi ngay</strong>
                    <em>Thông tin đang cập nhật</em>
                  </span>
                </ActionButton>
              )}
              {contact.zaloUrl ? (
                <a className="quick__card quick__card--zalo" href={contact.zaloUrl} target="_blank" rel="noopener noreferrer">
                  <span className="quick__zalo" aria-hidden="true">
                    <BrandIcon name="zalo" size={30} />
                  </span>
                  <span>
                    <strong>Chat qua Zalo</strong>Tư vấn nhanh, thuận tiện nhất
                  </span>
                </a>
              ) : (
                <ActionButton action={{ type: 'contact', channel: 'zalo' }} className="quick__card quick__card--zalo">
                  <span className="quick__zalo" aria-hidden="true">
                    <BrandIcon name="zalo" size={30} />
                  </span>
                  <span>
                    <strong>Chat qua Zalo</strong>
                    <em>Thông tin đang cập nhật</em>
                  </span>
                </ActionButton>
              )}
            </div>
          </section>

          <section className="profile" aria-labelledby="profile-t">
            <div className="profile__top">
              <Image
                src="/images/dinh-van-booking/people/advisor-profile.webp"
                alt="Chân dung minh họa người tư vấn Đinh Vân"
                width={117}
                height={135}
                className="profile__img"
              />
              <div>
                <h2 className="profile__name" id="profile-t">
                  Đinh Vân
                </h2>
                <p className="profile__role">Người tư vấn &amp; bạn đồng hành</p>
                <blockquote className="profile__quote">
                  “Mình sinh ra và lớn lên ở vùng đất Ninh Bình, rất yêu thiên nhiên và con người nơi đây. Đinh Vân Booking
                  ra đời với mong muốn mang đến cho bạn những trải nghiệm chân thật, gần gũi và ý nghĩa nhất.”
                </blockquote>
              </div>
            </div>
            <ul className="profile__list">
              <li>
                <span aria-hidden="true">
                  <MapPin size={15} fill="currentColor" stroke="#eef0e8" />
                </span>
                Người địa phương, am hiểu từng cung đường
              </li>
              <li>
                <span aria-hidden="true">
                  <Heart size={15} fill="currentColor" strokeWidth={0} />
                </span>
                Luôn tư vấn bằng sự chân thành
              </li>
              <li>
                <span aria-hidden="true">
                  <Sprout size={15} />
                </span>
                Đồng hành như một người bạn
              </li>
              <li>
                <span aria-hidden="true">
                  <Star size={15} fill="currentColor" strokeWidth={0} />
                </span>
                Gợi ý trải nghiệm thật, gần gũi và ý nghĩa
              </li>
            </ul>
            <p className="profile__script handwritten" aria-hidden="true">
              Hẹn gặp bạn
              <br /> ở Cúc Phương!
            </p>
          </section>
          <section className="social" aria-labelledby="social-t">
            <h2 className="social__title" id="social-t">
              Kết nối cùng Đinh Vân Booking
            </h2>
            <p className="social__sub">
              Theo dõi chúng tôi trên các nền tảng để cập nhật ưu đãi, hình ảnh đẹp và những câu chuyện từ Cúc Phương.
            </p>
            <ul className="social__list">
              {SOCIALS.map((n) => (
                <li key={n}>
                  {social[n] ? (
                    <a className={`social__btn social__btn--${n}`} href={social[n]!} target="_blank" rel="noopener noreferrer" aria-label={brandTitle(n)}>
                      <BrandIcon name={n} size={26} />
                    </a>
                  ) : (
                    <ActionButton action={{ type: 'contact', channel: 'social' }} className={`social__btn social__btn--${n}`} label={`${brandTitle(n)} (đang cập nhật)`}>
                      <BrandIcon name={n} size={26} />
                    </ActionButton>
                  )}
                </li>
              ))}
              <li>
                <ActionButton action={{ type: 'contact', channel: 'social' }} className="social__btn social__btn--web" label="Website (đang cập nhật)">
                  <Globe size={24} aria-hidden="true" />
                </ActionButton>
              </li>
            </ul>
            <ScriptNote />
          </section>
        </div>

        <div className="contact-col contact-col--right">
          <section className="promise" aria-labelledby="promise-t">
            <LeafSprig className="promise__leaf" />
            <h2 className="promise__title" id="promise-t">
              Cam kết từ Đinh Vân Booking
            </h2>
            <ul className="promise__list">
              <li>
                <span aria-hidden="true">
                  <Zap size={30} fill="currentColor" strokeWidth={0} />
                </span>
                Phản hồi nhanh
                <br /> trong giờ hành chính
              </li>
              <li>
                <span aria-hidden="true">
                  <ShieldCheck size={30} fill="currentColor" stroke="#f3f2ea" />
                </span>
                Tư vấn trung thực,
                <br /> phù hợp nhu cầu
              </li>
              <li>
                <span aria-hidden="true">
                  <Heart size={30} fill="currentColor" strokeWidth={0} />
                </span>
                Chi phí rõ ràng,
                <br /> trao đổi trước
              </li>
              <li>
                <span aria-hidden="true">
                  <Users size={30} fill="currentColor" strokeWidth={1} />
                </span>
                Đồng hành
                <br /> trước - trong - sau
                <br /> chuyến đi
              </li>
            </ul>
          </section>
          <ContactMap />
          <section className="scenic" aria-labelledby="scenic-t">
            <Image src="/images/dinh-van-booking/pages/contact-scenic.webp" alt="" fill sizes="(max-width: 1023px) 100vw, 465px" className="scenic__img" />
            <h2 className="sr-only" id="scenic-t">
              Tư vấn riêng
            </h2>
            <p className="scenic__script handwritten">
              Hãy để thiên nhiên
              <br /> chữa lành, và những người bản địa
              <br /> làm hành trình của bạn thêm ý nghĩa.
            </p>
            <svg className="scenic__heart" viewBox="0 0 24 24" width="30" height="30" aria-hidden="true">
              <path
                d="M12 20.5s-7.5-4.6-8.9-9.4C2 7.4 4.6 4.5 7.6 4.9c1.9.2 3.4 1.6 4.4 3.3 1-1.7 2.5-3.1 4.4-3.3 3-.4 5.6 2.5 4.5 6.2-1.4 4.8-8.9 9.4-8.9 9.4Z"
                fill="none"
                stroke="#fff"
                strokeWidth="1.5"
              />
            </svg>
            <FocusFormButton className="btn btn--primary scenic__cta btn-shine">
              <Leaf size={20} fill="currentColor" strokeWidth={1} aria-hidden="true" /> Tư vấn riêng ngay{' '}
              <ArrowRight size={17} aria-hidden="true" />
            </FocusFormButton>
          </section>
        </div>



      </div>
    </PageShell>
  );
}

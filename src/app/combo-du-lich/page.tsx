import { Gem, Heart, Leaf, MoveRight, UserRound } from 'lucide-react';
import type { Metadata } from 'next';
import Image from 'next/image';
import { ComboExplorer } from '@/components/combos/ComboExplorer';
import { ComboReviews } from '@/components/combos/ComboReviews';
import { PageShell } from '@/components/layout/PageShell';
import { FaqCard } from '@/components/shared/FaqCard';
import { LeafSprig } from '@/components/ui/Decor';
import { comboFaqs, comboReviews } from '@/data/reviews';
import '@/styles/combos.css';

export const metadata: Metadata = {
  title: 'Combo du lịch Cúc Phương – Ninh Bình — Đinh Vân Booking',
  description: 'Những hành trình được thiết kế bởi người bản địa Cúc Phương – Ninh Bình.',
};

function ResponsibleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <path d="M20 4c-7 0-12 4-12 10 0 1.4.3 2.6.8 3.6" strokeLinecap="round" />
      <path d="M20 4c.4 7-3 12-9 12.5" strokeLinecap="round" />
      <path d="M4 20l7-7" strokeLinecap="round" />
    </svg>
  );
}

const BENEFITS = [
  { icon: <UserRound size={26} strokeWidth={1.7} aria-hidden="true" />, title: 'Am hiểu địa phương', text: 'Trải nghiệm thật, không đi theo lối mòn' },
  { icon: <Gem size={26} strokeWidth={1.7} aria-hidden="true" />, title: 'Lịch trình tối ưu', text: 'Kết hợp điểm đến – nghỉ ngơi – ẩm thực hợp lý' },
  { icon: <Heart size={26} strokeWidth={1.7} aria-hidden="true" />, title: 'Dịch vụ tận tâm', text: 'Đồng hành từ tư vấn đến khi kết thúc hành trình' },
  { icon: <ResponsibleIcon />, title: 'Du lịch có trách nhiệm', text: 'Góp phần bảo tồn thiên nhiên và hỗ trợ cộng đồng địa phương' },
];

const STEPS = [
  { title: 'Tư vấn', text: 'Nhận tư vấn miễn phí, gợi ý lịch trình phù hợp' },
  { title: 'Chốt lịch', text: 'Xác nhận thời gian, số lượng, yêu cầu đặc biệt' },
  { title: 'Giữ phòng', text: 'Theo phương án đã được xác nhận cùng bạn' },
  { title: 'Khởi hành', text: 'Chuẩn bị hành lý và tận hưởng chuyến đi!' },
];

export default async function CombosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await searchParams;
  return (
    <PageShell className="page-combos">
      <section className="phero phero--combo" aria-labelledby="combo-h1">
        <div className="phero__media" aria-hidden="true">
          <Image src="/images/dinh-van-booking/pages/combo-hero.webp" alt="" fill priority sizes="100vw" className="phero__img" />
          <div className="phero__shade" />
        </div>
        <div className="phero__inner content-shell">
          <h1 id="combo-h1" className="phero__title" data-reveal="fade-up">
            Combo du lịch Cúc Phương – Ninh Bình
          </h1>
          <p className="phero__script handwritten" data-reveal="write" style={{ '--d': '150ms' } as React.CSSProperties}>
            Nhiều trải nghiệm hơn – Chuyến đi ý nghĩa hơn
          </p>
          <p className="phero__text" data-reveal="fade-up" style={{ '--d': '300ms' } as React.CSSProperties}>
            Những hành trình được thiết kế bởi người bản địa, kết hợp hài hòa giữa thiên nhiên,
            <br /> văn hóa, ẩm thực và nghỉ dưỡng. Đi dễ dàng hơn, trọn vẹn hơn cùng Đinh Vân Booking.
          </p>
          <p className="phero__quote handwritten" aria-hidden="true">
            Không chỉ là chuyến đi
            <br /> mà là những câu chuyện
            <br /> đáng nhớ...
            <svg viewBox="0 0 24 24" width="24" height="24" focusable="false">
              <path
                d="M12 20.5s-7.5-4.6-8.9-9.4C2 7.4 4.6 4.5 7.6 4.9c1.9.2 3.4 1.6 4.4 3.3 1-1.7 2.5-3.1 4.4-3.3 3-.4 5.6 2.5 4.5 6.2-1.4 4.8-8.9 9.4-8.9 9.4Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
              />
            </svg>
          </p>
        </div>
      </section>

        <ComboExplorer />

      <section className="combo-why content-shell" aria-labelledby="combo-why-t">
        <figure className="combo-quote combo-quote--left" data-reveal="fade-up">
          <LeafSprig className="combo-quote__leaf" />
          <blockquote className="handwritten">
            “Những chuyến đi nhỏ
            <br /> tạo nên những thay đổi lớn”
          </blockquote>
          <figcaption>– Đinh Vân Booking</figcaption>
        </figure>
        <div className="combo-why__main">
          <h2 className="combo-why__title" id="combo-why-t">
            Vì sao nên đặt combo cùng người bản địa?
          </h2>
          <ul className="combo-why__list">
            {BENEFITS.map((b, i) => (
              <li key={b.title} data-reveal="pop" style={{ '--d': `${i * 90}ms` } as React.CSSProperties}>
                <span className="combo-why__ic">{b.icon}</span>
                <span>
                  <strong>{b.title}</strong>
                  <span>{b.text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <figure className="combo-quote combo-quote--right" data-reveal="fade-up">
          <Leaf className="combo-quote__mini combo-quote__mini--l" fill="currentColor" strokeWidth={1} aria-hidden="true" />
          <blockquote className="handwritten">
            Đi cùng người địa phương
            <br /> để cảm nhận Ninh Bình
            <br /> thật khác!
          </blockquote>
          <Leaf className="combo-quote__mini combo-quote__mini--r" fill="currentColor" strokeWidth={1} aria-hidden="true" />
          <LeafSprig className="combo-quote__edge" />
        </figure>
      </section>

      <section className="combo-process content-shell" aria-labelledby="combo-process-t">
        <div className="combo-process__intro">
          <h2 id="combo-process-t">Quy trình đặt combo đơn giản</h2>
          <p className="handwritten">Chỉ 4 bước để bắt đầu hành trình đáng nhớ</p>
        </div>
        <ol className="combo-process__steps">
          {STEPS.map((s, i) => (
            <li key={s.title} data-reveal="fade-up" style={{ '--d': `${i * 120}ms` } as React.CSSProperties}>
              <span className="combo-process__num" aria-hidden="true">
                {i + 1}
              </span>
              <span>
                <strong>{s.title}</strong>
                <span>{s.text}</span>
              </span>
              {i < STEPS.length - 1 && <MoveRight className="combo-process__arrow" size={26} strokeWidth={1.5} aria-hidden="true" />}
            </li>
          ))}
        </ol>
        <p className="combo-process__note handwritten" aria-hidden="true">
          Hành trình đẹp hơn
          <br /> khi có người đồng hành
          <br /> địa phương
          <svg viewBox="0 0 24 24" width="20" height="20" focusable="false">
            <path
              d="M12 20.5s-7.5-4.6-8.9-9.4C2 7.4 4.6 4.5 7.6 4.9c1.9.2 3.4 1.6 4.4 3.3 1-1.7 2.5-3.1 4.4-3.3 3-.4 5.6 2.5 4.5 6.2-1.4 4.8-8.9 9.4-8.9 9.4Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            />
          </svg>
        </p>
      </section>

      <div className="combo-bottom content-shell">
        <ComboReviews reviews={comboReviews} />
        <FaqCard className="combo-faq" title="Câu hỏi thường gặp" items={comboFaqs} icon="chevron" variant="boxed" moreLabel="Xem tất cả" />
      </div>
    </PageShell>
  );
}

import type { Metadata } from 'next';
import Image from 'next/image';
import { Checkout } from '@/components/booking/Checkout';
import { PageShell } from '@/components/layout/PageShell';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { LeafSprig, SmallLeaf } from '@/components/ui/Decor';
import '@/styles/checkout.css';

export const metadata: Metadata = {
  title: 'Đặt phòng — Đinh Vân Booking',
  description: 'Điền thông tin đặt phòng Cúc Phương cùng Đinh Vân Booking (bản mô phỏng).',
  robots: { index: false, follow: false },
};

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await searchParams;
  return (
    <PageShell className="page-checkout" footer="checkout">
      <section className="phero phero--checkout" aria-labelledby="co-h1">
        <div className="phero__media" aria-hidden="true">
          <Image src="/images/dinh-van-booking/pages/checkout-hero.webp" alt="" fill priority sizes="100vw" className="phero__img" />
          <div className="phero__shade" />
        </div>
        <div className="phero__inner co-shell">
          <h1 id="co-h1" className="phero__title" data-reveal="fade-up">
            Đặt phòng cùng Đinh Vân Booking
          </h1>
          <p className="phero__text" data-reveal="fade-up" style={{ '--d': '120ms' } as React.CSSProperties}>
            Chỉ vài bước đơn giản để bắt đầu hành trình đáng nhớ của bạn
          </p>
          <p className="phero__script handwritten" data-reveal="write" style={{ '--d': '240ms' } as React.CSSProperties}>
            Thiên nhiên thật gần, trải nghiệm thật ý nghĩa
          </p>
          <p className="co-hero__note handwritten" aria-hidden="true">
            Mỗi chuyến đi
            <br /> là một câu chuyện đẹp
            <br /> đang chờ bạn viết
            <svg viewBox="0 0 24 24" width="22" height="22" focusable="false">
              <path
                d="M12 20.5s-7.5-4.6-8.9-9.4C2 7.4 4.6 4.5 7.6 4.9c1.9.2 3.4 1.6 4.4 3.3 1-1.7 2.5-3.1 4.4-3.3 3-.4 5.6 2.5 4.5 6.2-1.4 4.8-8.9 9.4-8.9 9.4Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
              />
            </svg>
          </p>
          <p className="co-hero__sign handwritten" aria-hidden="true">
            Đi để thấy
            <br /> thiên nhiên
            <br /> thật tuyệt!
          </p>
        </div>
      </section>

      <div className="co-strip">
        <div className="co-shell co-strip__inner">
          <Breadcrumb
            variant="plain"
            home
            items={[{ label: 'Trang chủ', href: '/' }, { label: 'Phòng nghỉ', href: '/phong-nghi' }, { label: 'Đặt phòng' }]}
          />
          <p className="co-strip__msg">
            <SmallLeaf className="co-strip__leaf" /> Đặt phòng an toàn <i aria-hidden="true">•</i> Bảo mật thông tin{' '}
            <i aria-hidden="true">•</i> Người địa phương hỗ trợ
          </p>
        </div>
        <LeafSprig className="co-strip__sprig" />
      </div>

      <div className="co-shell">
          <Checkout />
      </div>
    </PageShell>
  );
}

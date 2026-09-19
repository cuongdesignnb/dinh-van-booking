import Image from 'next/image';
import { Breadcrumb } from '@/components/shared/Breadcrumb';

export function StaysHero() {
  return (
    <section className="phero phero--stays" aria-labelledby="stays-title">
      <div className="phero__media" aria-hidden="true">
        <Image
          src="/images/dinh-van-booking/pages/stays-hero.webp"
          alt=""
          fill
          priority
          sizes="100vw"
          className="phero__img"
        />
        <div className="phero__shade" />
      </div>
      <div className="phero__inner content-shell">
        <Breadcrumb items={[{ label: 'Trang chủ', href: '/' }, { label: 'Phòng nghỉ' }]} />
        <h1 id="stays-title" className="phero__title" data-reveal="fade-up">
          Phòng nghỉ Cúc Phương
        </h1>
        <p className="phero__script handwritten" data-reveal="write" style={{ '--d': '150ms' } as React.CSSProperties}>
          Những nơi dừng chân giữa thiên nhiên trong lành
        </p>
        <p className="phero__text" data-reveal="fade-up" style={{ '--d': '300ms' } as React.CSSProperties}>
          Từ homestay ấm cúng giữa rừng, đến những lodge mộc mạc bên núi,
          <br /> Đinh Vân Booking tuyển chọn những nơi lưu trú chất lượng, để hành trình của bạn thêm trọn vẹn.
        </p>
        <p className="phero__note handwritten" aria-hidden="true">
          <span>Một đêm ở rừng</span>
          <span>là một cuộc hẹn</span>
          <span>
            với bình yên
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
        <p className="phero__sign handwritten" aria-hidden="true">
          <span>“Những căn phòng đẹp</span>
          <span>cho những người</span>
          <span>yêu thiên nhiên</span>
          <span>- Đinh Vân Booking -</span>
        </p>
      </div>
    </section>
  );
}

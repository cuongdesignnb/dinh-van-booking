import Image from 'next/image';
import { FallingLeaves } from '@/components/ui/Decor';
import { BookingSearch } from './BookingSearch';

const d = (ms: number) => ({ '--d': `${ms}ms` }) as React.CSSProperties;

export function HeroSection() {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero__media" aria-hidden="true">
        <div className="hero__canvas" data-parallax>
          <Image
            src="/images/dinh-van-booking/hero-cuc-phuong.webp"
            alt=""
            fill
            priority
            sizes="100vw"
            className="hero__img"
          />
          <span className="hero__sun" />
          <span className="hero__lantern hero__lantern--1" />
          <span className="hero__lantern hero__lantern--2" />
          <span className="hero__lantern hero__lantern--3" />
          <span className="hero__mist" />
        </div>
        <div className="hero__shade" />
        <FallingLeaves />
      </div>

      <div className="hero__inner">
        <div className="hero__copy">
          <p className="hero__kicker handwritten" data-reveal="write" style={d(80)}>
            <span>Về với thiên nhiên,</span>
            <span>trở về những điều bình yên</span>
          </p>
          <h1 id="hero-title" className="hero__title">
            <span className="line-mask" data-reveal="mask" style={d(260)}>
              <span>Đặt phòng Cúc Phương</span>
            </span>
            <span className="line-mask" data-reveal="mask" style={d(380)}>
              <span>Ninh Bình dễ dàng hơn</span>
            </span>
          </h1>
          <p className="hero__signature handwritten" data-reveal="write" style={d(620)}>
            cùng Đinh Vân Booking
          </p>
          <p className="hero__sub" data-reveal="fade-up" style={d(800)}>
            <span>
              Local hỗ trợ tận tâm <i aria-hidden="true">·</i> Phòng nghỉ tuyển chọn <i aria-hidden="true">·</i> Trải
              nghiệm trọn vẹn
            </span>
            <span>Đồng hành cùng bạn khám phá vẻ đẹp nguyên sơ của Cúc Phương và Ninh Bình.</span>
          </p>
        </div>

        <p className="hero__note handwritten" data-reveal="write" style={d(1100)}>
          <span>Cúc Phương</span>
          <span>luôn đẹp hơn,</span>
          <span>
            khi có bạn ở đây!
          </span>
          <svg className="hero__note-heart" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path
              d="M12 20.5s-7.5-4.6-8.9-9.4C2 7.4 4.6 4.5 7.6 4.9c1.9.2 3.4 1.6 4.4 3.3 1-1.7 2.5-3.1 4.4-3.3 3-.4 5.6 2.5 4.5 6.2-1.4 4.8-8.9 9.4-8.9 9.4Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinejoin="round"
              pathLength="1"
            />
          </svg>
        </p>

        <div className="hero__search" data-reveal="rise-soft" style={d(950)}>
          <BookingSearch />
        </div>
      </div>
    </section>
  );
}

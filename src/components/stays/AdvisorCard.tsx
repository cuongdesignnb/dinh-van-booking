import { ArrowRight, Headset, MessageCircleHeart, Route } from 'lucide-react';
import Image from 'next/image';
import { ActionButton } from '@/components/ui/ActionButton';

export function AdvisorCard() {
  return (
    <section className="side-card advisor-card" aria-labelledby="advisor-title" data-reveal="slide-left">
      <div className="advisor-card__top">
        <Image
          src="/images/dinh-van-booking/pages/advisor-stays.webp"
          alt="Hình minh họa người tư vấn đội mũ, đeo balô giữa núi rừng"
          fill
          sizes="278px"
          className="advisor-card__img"
        />
        <h2 className="advisor-card__title handwritten" id="advisor-title">
          <span>Cần tư vấn</span>
          <span>chọn phòng?</span>
        </h2>
        <p className="advisor-card__text">
          Mình là Đinh Vân, người bản địa ở Cúc Phương. Hãy chia sẻ nhu cầu của bạn, mình sẽ tư vấn những nơi ở phù hợp
          nhất!
        </p>
        <ActionButton action={{ type: 'contact', channel: 'chat', need: 'Mình cần tư vấn chọn phòng nghỉ ở Cúc Phương.' }} className="btn btn--primary advisor-card__cta btn-shine" magnetic>
          Chat với Đinh Vân <ArrowRight size={14} strokeWidth={2.3} aria-hidden="true" />
        </ActionButton>
      </div>
      <ul className="advisor-card__list">
        <li>
          <span className="advisor-card__ic" aria-hidden="true">
            <Headset size={14} />
          </span>
          Tư vấn miễn phí, nhanh chóng
        </li>
        <li>
          <span className="advisor-card__ic" aria-hidden="true">
            <Route size={14} />
          </span>
          Gợi ý theo lịch trình của bạn
        </li>
        <li>
          <span className="advisor-card__ic" aria-hidden="true">
            <MessageCircleHeart size={14} />
          </span>
          Hỗ trợ trong suốt chuyến đi
        </li>
      </ul>
      <p className="advisor-card__sign handwritten" aria-hidden="true">
        <span>Đi để thấy</span>
        <span>thiên nhiên thật tuyệt!</span>
      </p>
      <p className="advisor-card__by">- Đinh Vân</p>
    </section>
  );
}

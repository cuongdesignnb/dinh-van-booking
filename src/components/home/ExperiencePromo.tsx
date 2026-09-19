import { ArrowRight } from 'lucide-react';
import Image from 'next/image';
import { ActionButton } from '@/components/ui/ActionButton';

export function ExperiencePromo() {
  return (
    <aside className="promo" aria-labelledby="promo-title" data-reveal="slide-left" style={{ '--d': '1500ms' } as React.CSSProperties}>
      <Image
        src="/images/dinh-van-booking/experience-promo.webp"
        alt="Du khách đội mũ, đeo balô ngắm thung lũng và núi rừng Cúc Phương"
        fill
        sizes="(max-width: 1023px) 100vw, 276px"
        className="promo__img"
      />
      <div className="promo__veil" aria-hidden="true" />
      <div className="promo__content">
        <h2 className="promo__title handwritten" id="promo-title">
          <span>Không chỉ là</span>
          <span>phòng nghỉ...</span>
        </h2>
        <p className="promo__text">Mà còn là những trải nghiệm đáng nhớ giữa thiên nhiên Cúc Phương.</p>
        <ActionButton action={{ type: 'all-destinations' }} className="btn btn--primary btn--sm btn-arrow btn-shine">
          Khám phá ngay <ArrowRight size={14} strokeWidth={2.3} aria-hidden="true" />
        </ActionButton>
      </div>
      <p className="promo__quote handwritten">
        <span>“Đi để thấy</span>
        <span>thiên nhiên thật tuyệt!”</span>
      </p>
    </aside>
  );
}

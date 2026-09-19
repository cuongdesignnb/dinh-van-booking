import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { LeafSprig } from '@/components/ui/Decor';

export function NotFoundCard() {
  return (
    <section className="nf-card" aria-labelledby="nf-title" data-reveal="fade-up">
      <LeafSprig className="nf-card__leaf" />
      <LeafSprig className="nf-card__leaf nf-card__leaf--small" />
      <h2 className="nf-card__title" id="nf-title">
        Không tìm thấy phòng phù hợp?
      </h2>
      <p className="nf-card__text">Liên hệ Đinh Vân để được tư vấn nơi ở phù hợp nhất với lịch trình của bạn!</p>
      <Link href="/lien-he?intent=stay" className="btn btn--primary nf-card__cta btn-shine">
        Nhận tư vấn miễn phí <ArrowRight size={14} strokeWidth={2.3} aria-hidden="true" />
      </Link>
    </section>
  );
}

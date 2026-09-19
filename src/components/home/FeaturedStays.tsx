import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { SmallLeaf } from '@/components/ui/Decor';
import { HOME_STAY_IDS, staysById } from '@/data/stays';
import { ExperiencePromo } from './ExperiencePromo';
import { StayCard } from './StayCard';

export function FeaturedStays() {
  return (
    <section className="featured content-shell" id="phong-nghi" aria-labelledby="featured-title">
      <div className="featured__main">
        <div className="section-head" data-reveal="fade-up" style={{ '--d': '1100ms' } as React.CSSProperties}>
          <div>
            <h2 className="section-title" id="featured-title">
              Phòng nghỉ nổi bật <SmallLeaf className="section-title__leaf" />
            </h2>
            <p className="section-sub">Những nơi lưu trú được yêu thích nhất tại Cúc Phương</p>
          </div>
          <Link href="/phong-nghi" className="link-more">
            Xem tất cả <ArrowRight size={15} strokeWidth={2} aria-hidden="true" />
          </Link>
        </div>
        <div className="stay-grid">
          {HOME_STAY_IDS.map((id) => staysById.get(id)!).map((s, i) => (
            <StayCard key={s.id} stay={s} index={i} />
          ))}
        </div>
      </div>
      <ExperiencePromo />
    </section>
  );
}

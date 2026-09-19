import { ArrowRight } from 'lucide-react';
import { ActionButton } from '@/components/ui/ActionButton';
import { SmallLeaf } from '@/components/ui/Decor';
import { stays } from '@/data/home-fixtures';
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
          <ActionButton action={{ type: 'all-stays' }} className="link-more">
            Xem tất cả <ArrowRight size={15} strokeWidth={2} aria-hidden="true" />
          </ActionButton>
        </div>
        <div className="stay-grid">
          {stays.map((s, i) => (
            <StayCard key={s.id} stay={s} index={i} />
          ))}
        </div>
      </div>
      <ExperiencePromo />
    </section>
  );
}

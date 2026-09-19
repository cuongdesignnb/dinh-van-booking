import { ArrowRight } from 'lucide-react';
import Image from 'next/image';
import { ActionButton } from '@/components/ui/ActionButton';
import { SmallLeaf } from '@/components/ui/Decor';
import { destinations } from '@/data/home-fixtures';

export function DestinationGrid() {
  return (
    <section className="explore" id="diem-den" aria-labelledby="explore-title">
      <div
        className="section-head section-head--tight"
        data-reveal="fade-up"
        style={{ '--d': '1700ms' } as React.CSSProperties}
      >
        <div>
          <h2 className="section-title" id="explore-title">
            Khám phá Cúc Phương - Ninh Bình <SmallLeaf className="section-title__leaf" />
          </h2>
          <p className="section-sub">Không chỉ là nghỉ dưỡng, mà còn là những trải nghiệm đáng nhớ.</p>
        </div>
        <ActionButton action={{ type: 'all-destinations' }} className="link-more">
          Xem tất cả <ArrowRight size={15} strokeWidth={2} aria-hidden="true" />
        </ActionButton>
      </div>
      <ul className="destination-grid">
        {destinations.map((d, i) => (
          <li key={d.id} data-reveal="card" style={{ '--d': `${1800 + i * 90}ms` } as React.CSSProperties}>
            <ActionButton action={{ type: 'destination', id: d.id }} className="dest">
              <span className="dest__media">
                <Image
                  src={d.image.src}
                  alt={d.image.alt}
                  fill
                  sizes="(max-width: 767px) 46vw, 176px"
                  className="dest__img"
                />
              </span>
              <span className="dest__name">{d.name}</span>
              <span className="dest__sub">{d.subtitle}</span>
            </ActionButton>
          </li>
        ))}
      </ul>
    </section>
  );
}

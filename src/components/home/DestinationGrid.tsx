import { ArrowRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { SmallLeaf } from '@/components/ui/Decor';
import { destinationsById, HOME_DESTINATION_IDS } from '@/data/destinations';

/** Homepage labels differ slightly from the destination page (mockup copy). */
const HOME_NAMES: Record<string, string> = {
  'dong-nguoi-xua': 'Động người xưa',
  'trang-an': 'Tràng An - Ninh Bình',
};
const homeDestinations = HOME_DESTINATION_IDS.map((id) => destinationsById.get(id)!);

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
        <Link href="/diem-den" className="link-more">
          Xem tất cả <ArrowRight size={15} strokeWidth={2} aria-hidden="true" />
        </Link>
      </div>
      <ul className="destination-grid">
        {homeDestinations.map((d, i) => (
          <li key={d.id} data-reveal="card" style={{ '--d': `${1800 + i * 90}ms` } as React.CSSProperties}>
            <Link href={`/diem-den?d=${d.id}`} className="dest">
              <span className="dest__media">
                <Image
                  src={(d.homeImage ?? d.image).src}
                  alt={(d.homeImage ?? d.image).alt}
                  fill
                  sizes="(max-width: 767px) 46vw, 176px"
                  className="dest__img"
                />
              </span>
              <span className="dest__name">{HOME_NAMES[d.id] ?? d.name}</span>
              <span className="dest__sub">{d.subtitle}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

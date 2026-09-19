import { House, Map, MessageCircle, Tag, UserRound } from 'lucide-react';
import { SmallLeaf } from '@/components/ui/Decor';
import { reasons } from '@/data/home-fixtures';

const icons = { user: UserRound, house: House, message: MessageCircle, tag: Tag, map: Map } as const;

export function WhyChooseUs() {
  return (
    <section className="why" aria-labelledby="why-title">
      <div className="why__intro" data-reveal="fade-up" style={{ '--d': '1500ms' } as React.CSSProperties}>
        <h2 className="section-title section-title--stack" id="why-title">
          <span>
            Vì sao nên chọn <SmallLeaf className="section-title__leaf" />
          </span>
          <span>Đinh Vân Booking?</span>
        </h2>
        <p className="why__text">
          Không chỉ đặt phòng, mình đồng hành cùng bạn trong suốt hành trình khám phá Cúc Phương - Ninh Bình.
        </p>
      </div>
      <ul className="why__list">
        {reasons.map((r, i) => {
          const Icon = icons[r.icon];
          return (
            <li
              key={r.id}
              className="why__item"
              data-reveal="pop"
              style={{ '--d': `${1600 + i * 90}ms` } as React.CSSProperties}
            >
              <span className="why__icon">
                <svg className="why__ring" viewBox="0 0 52 52" aria-hidden="true" focusable="false">
                  <circle cx="26" cy="26" r="24.5" pathLength="1" />
                </svg>
                <Icon size={27} strokeWidth={1.7} aria-hidden="true" />
              </span>
              <span className="why__label">
                {r.lines.map((l) => (
                  <span key={l}>{l}</span>
                ))}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

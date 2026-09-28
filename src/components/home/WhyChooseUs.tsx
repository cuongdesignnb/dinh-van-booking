import { House, Map, MessageCircle, Tag, UserRound } from 'lucide-react';
import { SmallLeaf } from '@/components/ui/Decor';
import { RichContentRenderer } from '@/components/content/RichContentRenderer';
import type { RichDocument } from '@/lib/content/rich-document';
import type { PublicRecord } from '@/lib/public-content';
import { richDocumentHasContent } from '@/lib/public-content';

type Reason = { id: string; icon: keyof typeof icons; title: string; description: string };

const icons = { user: UserRound, house: House, message: MessageCircle, tag: Tag, map: Map } as const;

export function WhyChooseUs({ config }: { config: PublicRecord }) {
  const title = typeof config.title === 'string' ? config.title.trim() : '';
  const reasons = (Array.isArray(config.reasons) ? config.reasons : []).flatMap((value, index): Reason[] => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
    const item = value as Record<string, unknown>;
    const icon = item.icon;
    const reasonTitle = typeof item.title === 'string' ? item.title.trim() : '';
    const description = typeof item.description === 'string' ? item.description.trim() : '';
    if (item.enabled === false || !reasonTitle || typeof icon !== 'string' || !(icon in icons)) return [];
    return [{ id: typeof item.id === 'string' ? item.id : `reason-${index}`, icon: icon as keyof typeof icons, title: reasonTitle, description }];
  });
  if (config.enabled !== true || !title || !reasons.length) return null;

  return (
    <section className="why" aria-labelledby="why-title">
      <div className="why__intro" data-reveal="fade-up" style={{ '--d': '1500ms' } as React.CSSProperties}>
        <h2 className="section-title section-title--stack" id="why-title">
          {title} <SmallLeaf className="section-title__leaf" />
        </h2>
        {richDocumentHasContent(config.intro) && <div className="why__text"><RichContentRenderer document={config.intro as RichDocument} /></div>}
      </div>
      <ul className="why__list" data-count={reasons.length}>
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
                <span>{r.title}</span>{r.description && <span>{r.description}</span>}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

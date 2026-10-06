import { House, Leaf, Map, MessageSquareText, Tag, UserRound, Zap } from 'lucide-react';
import type { ReactNode } from 'react';
import { RichContentRenderer } from '@/components/content/RichContentRenderer';
import type { RichDocument } from '@/lib/content/rich-document';
import type { PublicRecord } from '@/lib/public-content';
import { publicText, richDocumentHasContent } from '@/lib/public-content';
import { ForestWash, SectionLeaf } from './HomeArt';

const icons = { user: UserRound, house: House, message: MessageSquareText, tag: Tag, map: Map, leaf: Leaf, bolt: Zap } as const;
type Reason = { id: string; icon: keyof typeof icons; title: string; description: string };

export function whyReasons(config: PublicRecord): Reason[] {
  return (Array.isArray(config.reasons) ? config.reasons : []).flatMap((value, index): Reason[] => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
    const item = value as Record<string, unknown>;
    const title = publicText(item.title);
    const icon = String(item.icon);
    if (item.enabled === false || !title || !(icon in icons)) return [];
    return [{ id: typeof item.id === 'string' ? item.id : `reason-${index}`, icon: icon as Reason['icon'], title, description: publicText(item.description) }];
  });
}

/** "Vì sao chọn …" grid with an optional advisor block on the right. */
export function WhyChooseUs({ config, aside = null }: { config: PublicRecord; aside?: ReactNode }) {
  const title = publicText(config.title);
  const reasons = whyReasons(config);
  const showMain = config.enabled === true && !!title && reasons.length > 0;
  if (!showMain && !aside) return null;
  return (
    <section className={`hw${aside ? '' : ' hw--solo'}${showMain ? '' : ' hw--aside-only'}`} aria-labelledby={showMain ? 'why-title' : undefined}>
      <ForestWash className="hw__wash" />
      <div className="hw__inner cp-shell">
        {showMain && <div className="hw__main">
          <div className="cp-head__title hw__head">
            <SectionLeaf className="cp-head__icon" />
            <div>
              <h2 id="why-title">{title}</h2>
              {richDocumentHasContent(config.intro) && <div className="cp-head__sub"><RichContentRenderer document={config.intro as RichDocument} /></div>}
            </div>
          </div>
          <ul className="hw__grid">
            {reasons.map((reason) => {
              const Icon = icons[reason.icon];
              return (
                <li key={reason.id} className="hw__item">
                  <span className="hw__icon"><Icon size={24} strokeWidth={2} aria-hidden="true" /></span>
                  <span>
                    <span className="hw__title">{reason.title}</span>
                    {reason.description && <span className="hw__text">{reason.description}</span>}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>}
        {aside}
      </div>
    </section>
  );
}

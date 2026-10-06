import { FaqList } from '@/components/shared/FaqList';
import type { Faq } from '@/data/types';
import type { PublicRecord } from '@/lib/public-content';
import { publicText, richDocumentHasContent } from '@/lib/public-content';
import type { RichDocument } from '@/lib/content/rich-document';
import { SectionLeaf } from './HomeArt';

export function HomeFaq({ config }: { config: PublicRecord }) {
  const title = publicText(config.title);
  const items = (Array.isArray(config.items) ? config.items : []).flatMap((value, index): Faq[] => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
    const item = value as Record<string, unknown>;
    const question = publicText(item.question);
    const answer = typeof item.answer === 'string' ? item.answer.trim() : item.answer;
    if (item.enabled === false || !question || !(typeof answer === 'string' ? !!answer : richDocumentHasContent(answer))) return [];
    return [{ id: typeof item.id === 'string' ? item.id : `home-faq-${index}`, question, answer: answer as string | RichDocument }];
  });
  if (config.enabled !== true || !title || !items.length) return null;
  return (
    <section className="hq cp-shell" aria-labelledby="home-faq-title">
      <div className="cp-head"><div className="cp-head__title"><SectionLeaf className="cp-head__icon" /><h2 id="home-faq-title">{title}</h2></div></div>
      <FaqList items={items} variant="boxed" />
    </section>
  );
}

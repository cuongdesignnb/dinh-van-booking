import { FaqList } from '@/components/shared/FaqList';
import type { Faq } from '@/data/types';
import type { PublicRecord } from '@/lib/public-content';
import { richDocumentHasContent } from '@/lib/public-content';
import type { RichDocument } from '@/lib/content/rich-document';

export function HomeFaq({ config }: { config: PublicRecord }) {
  const title = typeof config.title === 'string' ? config.title.trim() : '';
  const items = (Array.isArray(config.items) ? config.items : []).flatMap((value, index): Faq[] => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
    const item = value as Record<string, unknown>;
    const question = typeof item.question === 'string' ? item.question.trim() : '';
    const answer = typeof item.answer === 'string' ? item.answer.trim() : item.answer;
    if (item.enabled === false || !question || !(typeof answer === 'string' ? !!answer : richDocumentHasContent(answer))) return [];
    return [{ id: typeof item.id === 'string' ? item.id : `home-faq-${index}`, question, answer: answer as string | RichDocument }];
  });
  if (config.enabled !== true || !title || !items.length) return null;
  return <section className="home-faq content-shell" aria-labelledby="home-faq-title"><h2 className="section-title" id="home-faq-title">{title}</h2><FaqList items={items} variant="boxed" /></section>;
}

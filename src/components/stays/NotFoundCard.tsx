import { ArrowRight } from 'lucide-react';
import { ChatCta } from '@/components/chat/ChatCta';
import { RichContentRenderer } from '@/components/content/RichContentRenderer';
import type { RichDocument } from '@/lib/content/rich-document';
import { publicText, richDocumentHasContent, type PublicRecord } from '@/lib/public-content';

export function NotFoundCard({ config }: { config: PublicRecord }) {
  const title = publicText(config.emptyHelpTitle);
  const ctaLabel = publicText(config.emptyHelpCtaLabel);
  const description = config.emptyHelpDescription;
  if (!title && !ctaLabel && !richDocumentHasContent(description)) return null;
  return (
    <section className="nf-card" aria-labelledby="nf-title" data-reveal="fade-up">
      {title && <h2 className="nf-card__title" id="nf-title">{title}</h2>}
      {richDocumentHasContent(description) && <div className="nf-card__text"><RichContentRenderer document={description as RichDocument} /></div>}
      {ctaLabel && <ChatCta href="/lien-he?intent=stay" draft="Mình chưa tìm được chỗ nghỉ phù hợp, nhờ bạn gợi ý giúp." className="btn btn--primary nf-card__cta btn-shine">{ctaLabel} <ArrowRight size={14} strokeWidth={2.3} aria-hidden="true" /></ChatCta>}
    </section>
  );
}

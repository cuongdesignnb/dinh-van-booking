import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { RichContentRenderer } from '@/components/content/RichContentRenderer';
import { LeafSprig } from '@/components/ui/Decor';
import type { RichDocument } from '@/lib/content/rich-document';
import { publicText, richDocumentHasContent, type PublicRecord } from '@/lib/public-content';

export function NotFoundCard({ config }: { config: PublicRecord }) {
  const title = publicText(config.emptyHelpTitle);
  const ctaLabel = publicText(config.emptyHelpCtaLabel);
  const description = config.emptyHelpDescription;
  if (!title && !ctaLabel && !richDocumentHasContent(description)) return null;
  return (
    <section className="nf-card" aria-labelledby="nf-title" data-reveal="fade-up">
      <LeafSprig className="nf-card__leaf" />
      <LeafSprig className="nf-card__leaf nf-card__leaf--small" />
      {title && <h2 className="nf-card__title" id="nf-title">{title}</h2>}
      {richDocumentHasContent(description) && <div className="nf-card__text"><RichContentRenderer document={description as RichDocument} /></div>}
      {ctaLabel && <Link href="/lien-he?intent=stay" className="btn btn--primary nf-card__cta btn-shine">{ctaLabel} <ArrowRight size={14} strokeWidth={2.3} aria-hidden="true" /></Link>}
    </section>
  );
}

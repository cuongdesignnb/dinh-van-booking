import { ArrowRight } from 'lucide-react';
import Image from '@/components/ui/ManagedImage';
import Link from 'next/link';
import type { PublicMediaAsset } from '@/lib/api/public';
import { RichContentRenderer } from '@/components/content/RichContentRenderer';
import type { RichDocument } from '@/lib/content/rich-document';
import type { PublicRecord } from '@/lib/public-content';
import { richDocumentHasContent } from '@/lib/public-content';

export function ExperiencePromo({ config, image, standalone = false }: { config: PublicRecord; image: PublicMediaAsset | null; standalone?: boolean }) {
  const titleLine1 = typeof config.titleLine1 === 'string' ? config.titleLine1.trim() : '';
  const titleLine2 = typeof config.titleLine2 === 'string' ? config.titleLine2.trim() : '';
  const ctaLabel = typeof config.ctaLabel === 'string' ? config.ctaLabel.trim() : '';
  const ctaTarget = typeof config.ctaTarget === 'string' ? config.ctaTarget.trim() : '';
  const quote = typeof config.quote === 'string' ? config.quote.trim() : '';
  if (config.enabled !== true || !titleLine1) return null;
  return (
    <aside className="promo" aria-labelledby="promo-title" data-reveal="slide-left" style={{ '--d': standalone ? '120ms' : '1500ms' } as React.CSSProperties}>
      {image?.src && <Image src={image.src} alt={image.alt ?? ''} fill sizes={standalone ? '(max-width: 767px) 100vw, 780px' : '(max-width: 1023px) 100vw, 276px'} className="promo__img" unoptimized />}
      <div className="promo__veil" aria-hidden="true" />
      <div className="promo__content">
        <h2 className="promo__title handwritten" id="promo-title">
          <span>{titleLine1}</span>
          {titleLine2 && <span>{titleLine2}</span>}
        </h2>
        {richDocumentHasContent(config.body) && <div className="promo__text"><RichContentRenderer document={config.body as RichDocument} /></div>}
        {ctaLabel && ctaTarget && <Link href={ctaTarget} className="btn btn--primary btn--sm btn-arrow btn-shine">{ctaLabel} <ArrowRight size={14} strokeWidth={2.3} aria-hidden="true" /></Link>}
      </div>
      {quote && <p className="promo__quote handwritten">{quote}</p>}
    </aside>
  );
}

import { ArrowRight } from 'lucide-react';
import Image from '@/components/ui/ManagedImage';
import Link from 'next/link';
import type { PublicMediaAsset } from '@/lib/api/public';
import { RichContentRenderer } from '@/components/content/RichContentRenderer';
import type { RichDocument } from '@/lib/content/rich-document';
import type { PublicRecord } from '@/lib/public-content';
import { publicText, richDocumentHasContent } from '@/lib/public-content';

export function ExperiencePromo({ config, image }: { config: PublicRecord; image: PublicMediaAsset | null }) {
  const titleLine1 = publicText(config.titleLine1);
  const titleLine2 = publicText(config.titleLine2);
  const ctaLabel = publicText(config.ctaLabel);
  const ctaTarget = publicText(config.ctaTarget);
  const quote = publicText(config.quote);
  if (config.enabled !== true || !titleLine1) return null;
  return (
    <section className={`hpr cp-shell${image?.src ? '' : ' hpr--no-image'}`} aria-labelledby="promo-title">
      {image?.src && <div className="hpr__media"><Image src={image.src} alt={image.alt ?? ''} fill sizes="(max-width: 767px) 100vw, 520px" unoptimized /></div>}
      <div className="hpr__body">
        <h2 id="promo-title">{titleLine1}{titleLine2 && <> {titleLine2}</>}</h2>
        {richDocumentHasContent(config.body) && <div className="hpr__text"><RichContentRenderer document={config.body as RichDocument} /></div>}
        {quote && <p className="hpr__quote script">{quote}</p>}
        {ctaLabel && ctaTarget && <Link href={ctaTarget} className="btn btn--primary">{ctaLabel} <ArrowRight size={17} aria-hidden="true" /></Link>}
      </div>
    </section>
  );
}

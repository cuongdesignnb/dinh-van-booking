import { ArrowRight, Handshake, Sprout } from 'lucide-react';
import Link from 'next/link';
import Image from '@/components/ui/ManagedImage';
import { RichContentRenderer } from '@/components/content/RichContentRenderer';
import type { PublicMediaAsset } from '@/lib/api/public';
import type { RichDocument } from '@/lib/content/rich-document';
import type { PublicRecord } from '@/lib/public-content';
import { publicText, richDocumentHasContent } from '@/lib/public-content';

/** Partner invitation ("Cùng nhau phát triển du lịch địa phương"). */
export function PartnerBand({ config, image }: { config: PublicRecord; image: PublicMediaAsset | null }) {
  const title = publicText(config.title);
  const quote = publicText(config.quote);
  const primaryLabel = publicText(config.primaryLabel);
  const primaryTarget = publicText(config.primaryTarget);
  const secondaryLabel = publicText(config.secondaryLabel);
  const secondaryTarget = publicText(config.secondaryTarget);
  if (config.enabled !== true || !title) return null;
  return (
    <section className={`hp${image?.src ? '' : ' hp--no-image'}`} aria-labelledby="partner-title">
      {image?.src && <div className="hp__art">
        <Image src={image.src} alt={image.alt ?? ''} fill sizes="(max-width: 767px) 100vw, 320px" className="hp__img" unoptimized />
        {quote && <p className="hp__quote script">{quote}</p>}
      </div>}
      <div className="hp__body">
        <h2 id="partner-title" className="hp__title"><Sprout size={26} strokeWidth={1.9} aria-hidden="true" />{title}</h2>
        {richDocumentHasContent(config.description) && <div className="hp__text"><RichContentRenderer document={config.description as RichDocument} /></div>}
        {!image?.src && quote && <p className="hp__quote hp__quote--inline script">{quote}</p>}
        {((primaryLabel && primaryTarget) || (secondaryLabel && secondaryTarget)) && <div className="hp__actions">
          {primaryLabel && primaryTarget && <Link href={primaryTarget} className="btn btn--primary btn--lg"><Handshake size={20} aria-hidden="true" />{primaryLabel}<ArrowRight size={18} aria-hidden="true" /></Link>}
          {secondaryLabel && secondaryTarget && <Link href={secondaryTarget} className="btn btn--outline btn--lg">{secondaryLabel}</Link>}
        </div>}
      </div>
    </section>
  );
}

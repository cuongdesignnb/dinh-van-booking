'use client';

import { Phone, Users } from 'lucide-react';
import Image from '@/components/ui/ManagedImage';
import { BrandIcon } from '@/components/ui/BrandIcons';
import { LeafSprig } from '@/components/ui/Decor';
import { useSiteData } from '@/components/site/SiteDataProvider';
import { RichContentRenderer } from '@/components/content/RichContentRenderer';
import type { RichDocument } from '@/lib/content/rich-document';
import type { PublicMediaAsset } from '@/lib/api/public';
import type { PublicRecord } from '@/lib/public-content';
import { richDocumentHasContent } from '@/lib/public-content';

export function PersonalContact({ config, image }: { config: PublicRecord; image: PublicMediaAsset | null }) {
  const { contact } = useSiteData();
  const title = typeof config.title === 'string' ? config.title.trim() : '';
  const advisorName = typeof config.advisorName === 'string' ? config.advisorName.trim() : '';
  const advisorRole = typeof config.advisorRole === 'string' ? config.advisorRole.trim() : '';
  const zaloLabel = typeof config.zaloCtaLabel === 'string' ? config.zaloCtaLabel.trim() : '';
  const phoneLabel = typeof config.phoneCtaLabel === 'string' ? config.phoneCtaLabel.trim() : '';
  const note = typeof config.note === 'string' ? config.note.trim() : '';
  if (config.enabled !== true || !title) return null;
  return (
    <section
      className={`contact${image?.src ? '' : ' contact--no-image'}`}
      id="lien-he"
      aria-labelledby="contact-title"
      data-reveal="zoom"
      style={{ '--d': '1800ms' } as React.CSSProperties}
    >
      {image?.src && <Image src={image.src} alt={image.alt ?? ''} fill sizes="(max-width: 1023px) 100vw, 506px" className="contact__img" unoptimized />}
      <div className="contact__veil" aria-hidden="true" />
      <LeafSprig className="contact__leaf" />
      <div className="contact__content">
        <h2 className="contact__title handwritten" id="contact-title">{title}</h2>
        {richDocumentHasContent(config.description) && <div className="contact__text"><RichContentRenderer document={config.description as RichDocument} /></div>}
        <div className="contact__actions">
          {contact.zaloUrl && zaloLabel ? (
            <a className="btn btn--primary btn--contact" href={contact.zaloUrl} target="_blank" rel="noopener noreferrer">
              <span className="zalo-badge">
                <BrandIcon name="zalo" size={16} />
              </span>
              {zaloLabel}
            </a>
          ) : null}
          {contact.phone && phoneLabel ? (
            <a className="btn btn--light btn--contact" href={`tel:${contact.phone}`}>
              <Phone size={18} fill="currentColor" strokeWidth={0} aria-hidden="true" /> {phoneLabel}
            </a>
          ) : null}
        </div>
        {(advisorName || advisorRole) && <p className="contact__sign"><Users size={15} aria-hidden="true" />{[advisorName, advisorRole].filter(Boolean).join(' – ')}</p>}
      </div>
      {note && <p className="contact__note handwritten">{note}</p>}
    </section>
  );
}

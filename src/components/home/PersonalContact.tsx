'use client';

import { Phone } from 'lucide-react';
import Image from '@/components/ui/ManagedImage';
import { BrandIcon } from '@/components/ui/BrandIcons';
import { useSiteData } from '@/components/site/SiteDataProvider';
import type { PublicMediaAsset } from '@/lib/api/public';
import { AdvisorMonogram } from './HomeArt';
import type { PublicRecord } from '@/lib/public-content';
import { publicText } from '@/lib/public-content';

/** Advisor block beside "Vì sao chọn …": greeting, portrait or monogram, signature. */
export function PersonalContact({ config, image }: { config: PublicRecord; image: PublicMediaAsset | null }) {
  const { contact } = useSiteData();
  const name = publicText(config.advisorName);
  const role = publicText(config.advisorRole);
  const greeting = publicText(config.note);
  const phoneLabel = publicText(config.phoneCtaLabel);
  const zaloLabel = publicText(config.zaloCtaLabel);
  const phone = contact.hotline || contact.phone;
  if (config.enabled !== true || !(name || greeting)) return null;
  return (
    <aside className="ha" aria-label={name ? `Người tư vấn: ${name}` : 'Người tư vấn'}>
      {greeting && <p className="ha__greeting script">{greeting}</p>}
      <div className="ha__portrait">
        {image?.src
          ? <Image src={image.src} alt={image.alt || (name ? `Ảnh ${name}` : '')} fill sizes="220px" className="ha__img" unoptimized />
          : <AdvisorMonogram name={name || 'Cúc Phương'} className="ha__monogram" />}
      </div>
      {name && <p className="ha__sign"><span className="script">– {name}</span>{role && <small>{role}</small>}</p>}
      {((phone && phoneLabel) || (contact.zaloUrl && zaloLabel)) && <div className="ha__actions">
        {phone && phoneLabel && <a className="btn btn--primary btn--sm" href={`tel:${phone.replace(/\s+/g, '')}`}><Phone size={16} aria-hidden="true" />{phoneLabel}</a>}
        {contact.zaloUrl && zaloLabel && <a className="btn btn--outline btn--sm" href={contact.zaloUrl} target="_blank" rel="noopener noreferrer"><BrandIcon name="zalo" size={16} />{zaloLabel}</a>}
      </div>}
    </aside>
  );
}

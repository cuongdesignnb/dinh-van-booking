'use client';

import { Phone } from 'lucide-react';
import Image from '@/components/ui/ManagedImage';
import { BrandIcon } from '@/components/ui/BrandIcons';
import { useSiteData } from '@/components/site/SiteDataProvider';
import type { PublicMediaAsset } from '@/lib/api/public';
import type { PublicRecord } from '@/lib/public-content';
import { publicText } from '@/lib/public-content';

const initials = (name: string) => {
  const words = name.split(/\s+/).filter(Boolean);
  return words.slice(-2).map((word) => word.charAt(0).toUpperCase()).join('');
};

/** Illustrated monogram used while no advisor photo has been uploaded. */
function Monogram({ name }: { name: string }) {
  return (
    <svg className="ha__monogram" viewBox="0 0 200 200" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="ha-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f3efe2" />
          <stop offset="1" stopColor="#dfe9dc" />
        </linearGradient>
      </defs>
      <rect width="200" height="200" fill="url(#ha-sky)" />
      <path d="M0 150 40 104l22 24 34-46 40 52 22-20 42 36v50H0Z" fill="#b9cdb5" />
      <path d="M0 168c34-12 66-12 100-2s68 8 100-6v40H0Z" fill="#8fb08e" />
      <path d="M0 184c40-8 80-6 120 2 30 6 56 4 80-2v16H0Z" fill="#5e8a6a" />
      <text x="100" y="92" textAnchor="middle" fontFamily="'Playfair Display', Georgia, serif" fontSize="58" fontWeight="600" fill="#1f4d3a">{initials(name)}</text>
    </svg>
  );
}

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
          : <Monogram name={name || 'Cúc Phương'} />}
      </div>
      {name && <p className="ha__sign"><span className="script">– {name}</span>{role && <small>{role}</small>}</p>}
      {((phone && phoneLabel) || (contact.zaloUrl && zaloLabel)) && <div className="ha__actions">
        {phone && phoneLabel && <a className="btn btn--primary btn--sm" href={`tel:${phone.replace(/\s+/g, '')}`}><Phone size={16} aria-hidden="true" />{phoneLabel}</a>}
        {contact.zaloUrl && zaloLabel && <a className="btn btn--outline btn--sm" href={contact.zaloUrl} target="_blank" rel="noopener noreferrer"><BrandIcon name="zalo" size={16} />{zaloLabel}</a>}
      </div>}
    </aside>
  );
}

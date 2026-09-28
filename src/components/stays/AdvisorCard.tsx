import { ArrowRight, Headset, Heart, Route } from 'lucide-react';
import Image from '@/components/ui/ManagedImage';
import Link from 'next/link';
import { RichContentRenderer } from '@/components/content/RichContentRenderer';
import type { RichDocument } from '@/lib/content/rich-document';
import type { PublicMediaAsset } from '@/lib/api/public';
import type { PublicRecord } from '@/lib/public-content';
import { richDocumentHasContent } from '@/lib/public-content';

const icons = { headset: Headset, route: Route, heart: Heart } as const;

export function AdvisorCard({ config, image }: { config: PublicRecord; image: PublicMediaAsset | null }) {
  const title = typeof config.advisorTitle === 'string' ? config.advisorTitle.trim() : '';
  const ctaLabel = typeof config.advisorCtaLabel === 'string' ? config.advisorCtaLabel.trim() : '';
  const benefits = (Array.isArray(config.advisorBenefits) ? config.advisorBenefits : []).flatMap((value) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
    const item = value as Record<string, unknown>;
    const text = typeof item.text === 'string' ? item.text.trim() : '';
    const icon = item.icon;
    if (item.enabled === false || !text || typeof icon !== 'string' || !(icon in icons)) return [];
    return [{ text, Icon: icons[icon as keyof typeof icons] }];
  });
  if (!title) return null;
  return (
    <section className="side-card advisor-card" aria-labelledby="advisor-title" data-reveal="fade-up">
      <div className="advisor-card__top">
        {image?.src && <Image src={image.src} alt={image.alt ?? ''} fill sizes="278px" className="advisor-card__img" unoptimized />}
        <h2 className="advisor-card__title handwritten" id="advisor-title">
          {title}
        </h2>
        {richDocumentHasContent(config.advisorDescription) && <div className="advisor-card__text"><RichContentRenderer document={config.advisorDescription as RichDocument} /></div>}
        {ctaLabel && <Link href="/lien-he" className="btn btn--primary advisor-card__cta btn-shine">{ctaLabel}<ArrowRight size={14} strokeWidth={2.3} aria-hidden="true" /></Link>}
      </div>
      {benefits.length > 0 && <ul className="advisor-card__list">{benefits.map(({ text, Icon }, index) => <li key={`${text}-${index}`}><span className="advisor-card__ic" aria-hidden="true"><Icon size={14} /></span>{text}</li>)}</ul>}
    </section>
  );
}

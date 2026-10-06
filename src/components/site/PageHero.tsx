import type { ReactNode } from 'react';
import Image from '@/components/ui/ManagedImage';
import { Breadcrumb, type Crumb } from '@/components/shared/Breadcrumb';
import { RichContentRenderer } from '@/components/content/RichContentRenderer';
import type { PublicMediaAsset } from '@/lib/api/public';
import type { RichDocument } from '@/lib/content/rich-document';
import { publicText, richDocumentHasContent } from '@/lib/public-content';

/**
 * Inner-route hero in the homepage language: photo band, gold eyebrow,
 * white serif title, short lead. Every line comes from page settings.
 */
export function PageHero({ id, title, eyebrow, lead, image, crumbs, children, size = 'md' }: {
  id: string;
  title: string;
  eyebrow?: string;
  lead?: unknown;
  image?: PublicMediaAsset | null;
  crumbs?: Crumb[];
  children?: ReactNode;
  size?: 'sm' | 'md';
}) {
  const text = typeof lead === 'string' ? publicText(lead) : '';
  return (
    <section className={`cp-page-hero cp-page-hero--${size}${image?.src ? '' : ' cp-page-hero--noimg'}`} aria-labelledby={id}>
      {image?.src && <Image src={image.src} alt="" fill priority sizes="100vw" className="cp-page-hero__img" unoptimized />}
      <div className="cp-page-hero__inner">
        {crumbs && crumbs.length > 0 && <div className="cp-page-hero__crumbs"><Breadcrumb variant="light" items={crumbs} /></div>}
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 id={id}>{title}</h1>
        {richDocumentHasContent(lead)
          ? <div className="cp-page-hero__lead"><RichContentRenderer document={lead as RichDocument} /></div>
          : text && <p className="cp-page-hero__lead">{text}</p>}
        {children}
      </div>
    </section>
  );
}

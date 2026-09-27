import { Gem, Heart, Leaf, MoveRight, UserRound } from 'lucide-react';
import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound, permanentRedirect } from 'next/navigation';
import { ComboExplorer } from '@/components/combos/ComboExplorer';
import { ComboReviews } from '@/components/combos/ComboReviews';
import { PageShell } from '@/components/layout/PageShell';
import { FaqList } from '@/components/shared/FaqList';
import { RichContentRenderer } from '@/components/content/RichContentRenderer';
import { getPublicCombos, getPublicLegacyTarget, getPublicReviews, getPublicSeoUrls, getPublicSite } from '@/lib/api/public';
import { JsonLd } from '@/components/seo/JsonLd';
import { isSubstantivePublicContent } from '@/lib/seo/content';
import { buildPageMetadata } from '@/lib/seo/metadata';
import { isSeoSchemaAllowed } from '@/lib/seo/policy';
import { buildCollectionGraph } from '@/lib/seo/schema';
import { publicAsset, publicRecord, publicSetting, publicText, richDocumentHasContent } from '@/lib/public-content';
import type { RichDocument } from '@/lib/content/rich-document';
import '@/styles/combos.css';

export async function generateMetadata({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }): Promise<Metadata> {
  const query = await searchParams;
  // notFound() supplies its own noindex robots directive. Omitting route-level
  // robots here avoids duplicate tags for legacy query routes that resolve 404.
  if (query.combo !== undefined) return { title: 'Không tìm thấy combo — Đinh Vân Booking' };
  const [combos, site, urls] = await Promise.all([getPublicCombos(), getPublicSite(), getPublicSeoUrls()]);
  const page = publicSetting(site, 'catalog.combosPage');
  return buildPageMetadata({ path: '/combo-du-lich', eligible: publicText(page.heroTitle) !== '' && urls.some((entry) => entry.path === '/combo-du-lich') && combos.length > 0, searchParams: query });
}

export default async function CombosPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  if (query.combo !== undefined) {
    const value = typeof query.combo === 'string' ? query.combo.trim() : query.combo.length === 1 ? query.combo[0].trim() : '';
    if (!value) notFound();
    const path = await getPublicLegacyTarget('combo', value);
    if (!path) notFound();
    permanentRedirect(path);
  }
  const [combos, reviews, site, urls] = await Promise.all([getPublicCombos(), getPublicReviews(), getPublicSite(), getPublicSeoUrls()]);
  const page = publicSetting(site, 'catalog.combosPage');
  const heroImage = publicAsset(site, page.heroImageMediaId);
  const heroTitle = publicText(page.heroTitle);
  const heroKicker = publicText(page.heroKicker);
  const benefits = (Array.isArray(page.benefits) ? page.benefits : []).flatMap((value, index) => {
    const item = publicRecord(value);
    const title = publicText(item.title);
    const description = publicText(item.description);
    const icon = item.icon;
    const Icon = icon === 'user' ? UserRound : icon === 'gem' ? Gem : icon === 'heart' ? Heart : icon === 'leaf' ? Leaf : null;
    return item.enabled === false || !title || !Icon ? [] : [{ id: publicText(item.id) || `benefit-${index}`, title, description, Icon }];
  });
  const steps = (Array.isArray(page.steps) ? page.steps : []).flatMap((value, index) => {
    const item = publicRecord(value);
    const title = publicText(item.title);
    const description = publicText(item.description);
    return item.enabled === false || !title ? [] : [{ id: publicText(item.id) || `step-${index}`, title, description }];
  });
  const faqs = (Array.isArray(page.faqs) ? page.faqs : []).flatMap((value, index) => {
    const item = publicRecord(value);
    const question = publicText(item.question);
    const answer = typeof item.answer === 'string' ? item.answer.trim() : item.answer;
    return item.enabled === false || !question || !(typeof answer === 'string' ? !!answer : richDocumentHasContent(answer))
      ? [] : [{ id: publicText(item.id) || `combo-faq-${index}`, question, answer: answer as string | RichDocument }];
  });
  const schemaItems = combos
    .filter((combo) => !combo.noindex && !!combo.publicPath && urls.some((entry) => entry.path === combo.publicPath) && isSubstantivePublicContent(combo.body))
    .map((combo) => ({ name: combo.title, href: combo.publicPath! }));
  const structuredData = heroTitle && isSeoSchemaAllowed(site, '/combo-du-lich', { eligible: schemaItems.length > 0, searchParams: query })
    ? buildCollectionGraph(site, { path: '/combo-du-lich', title: heroTitle, items: schemaItems }) : null;
  const benefitsTitle = publicText(page.benefitsTitle);
  const stepsTitle = publicText(page.stepsTitle);
  const faqTitle = publicText(page.faqTitle);
  const reviewsTitle = publicText(page.reviewsTitle);

  return <PageShell className="page-combos">
    {heroTitle && <section className="phero phero--combo" aria-labelledby="combo-h1">
      <div className="phero__media" aria-hidden="true">
        {heroImage?.src && <Image src={heroImage.src} alt={heroImage.alt ?? ''} fill priority sizes="100vw" className="phero__img" unoptimized />}
        <div className="phero__shade" />
      </div>
      <div className="phero__inner content-shell">
        <h1 id="combo-h1" className="phero__title" data-reveal="fade-up">{heroTitle}</h1>
        {heroKicker && <p className="phero__script handwritten" data-reveal="write">{heroKicker}</p>}
        {richDocumentHasContent(page.heroDescription) && <div className="phero__text" data-reveal="fade-up"><RichContentRenderer document={page.heroDescription as RichDocument} /></div>}
      </div>
    </section>}

    <ComboExplorer combos={combos} config={page} />

    {(benefitsTitle && benefits.length > 0 || richDocumentHasContent(page.quoteLeft) || richDocumentHasContent(page.quoteRight)) && <section className="combo-why content-shell" aria-label={benefitsTitle || undefined}>
      {richDocumentHasContent(page.quoteLeft) && <div className="combo-quote combo-quote--left"><RichContentRenderer document={page.quoteLeft as RichDocument} /></div>}
      {benefitsTitle && benefits.length > 0 && <div className="combo-why__main">
        <h2 className="combo-why__title">{benefitsTitle}</h2>
        <ul className="combo-why__list">{benefits.map(({ id, title, description, Icon }, index) => <li key={id} data-reveal="pop" style={{ '--d': `${index * 90}ms` } as React.CSSProperties}><span className="combo-why__ic"><Icon size={26} aria-hidden="true" /></span><span><strong>{title}</strong>{description && <span>{description}</span>}</span></li>)}</ul>
      </div>}
      {richDocumentHasContent(page.quoteRight) && <div className="combo-quote combo-quote--right"><RichContentRenderer document={page.quoteRight as RichDocument} /></div>}
    </section>}

    {stepsTitle && steps.length > 0 && <section className="combo-process content-shell" aria-labelledby="combo-process-t">
      <div className="combo-process__intro"><h2 id="combo-process-t">{stepsTitle}</h2>{publicText(page.stepsSubtitle) && <p>{publicText(page.stepsSubtitle)}</p>}</div>
      <ol className="combo-process__steps">{steps.map((step, index) => <li key={step.id} data-reveal="fade-up" style={{ '--d': `${index * 120}ms` } as React.CSSProperties}><span className="combo-process__num" aria-hidden="true">{index + 1}</span><span><strong>{step.title}</strong>{step.description && <span>{step.description}</span>}</span>{index < steps.length - 1 && <MoveRight className="combo-process__arrow" size={26} strokeWidth={1.5} aria-hidden="true" />}</li>)}</ol>
    </section>}

    {(reviewsTitle && reviews.length > 0 || faqTitle && faqs.length > 0) && <div className="combo-bottom content-shell">
      <ComboReviews reviews={reviews} title={reviewsTitle} />
      {faqTitle && faqs.length > 0 && <section className="combo-faq" aria-labelledby="combo-faq-title"><h2 id="combo-faq-title">{faqTitle}</h2><FaqList items={faqs} icon="chevron" variant="boxed" /></section>}
    </div>}
    <JsonLd data={structuredData} />
  </PageShell>;
}

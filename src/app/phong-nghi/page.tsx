import type { Metadata } from 'next';
import Link from 'next/link';
import { CalendarDays } from 'lucide-react';
import { FaqList } from '@/components/shared/FaqList';
import { ReviewsStrip } from '@/components/shared/ReviewsStrip';
import { PageShell } from '@/components/layout/PageShell';
import { AdvisorCard } from '@/components/stays/AdvisorCard';
import { NotFoundCard } from '@/components/stays/NotFoundCard';
import { StaysExplorer } from '@/components/stays/StaysExplorer';
import { StaysHero } from '@/components/stays/StaysHero';
import { SmallLeaf } from '@/components/ui/Decor';
import { getPublicReviews, getPublicSeoUrls, getPublicSite, getPublicStays } from '@/lib/api/public';
import { JsonLd } from '@/components/seo/JsonLd';
import { isSubstantivePublicContent } from '@/lib/seo/content';
import { buildPageMetadata } from '@/lib/seo/metadata';
import { isSeoSchemaAllowed } from '@/lib/seo/policy';
import { buildCollectionGraph } from '@/lib/seo/schema';
import { publicAsset, publicSetting } from '@/lib/public-content';
import { richDocumentHasContent } from '@/lib/public-content';
import type { RichDocument } from '@/lib/content/rich-document';
import { publicText } from '@/lib/public-content';
import { RichContentRenderer } from '@/components/content/RichContentRenderer';
import '@/styles/stays.css';

export async function generateMetadata({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }): Promise<Metadata> {
  const [query, stays, urls, site] = await Promise.all([searchParams, getPublicStays(), getPublicSeoUrls(), getPublicSite()]);
  const content = publicSetting(site, 'catalog.staysPage');
  return buildPageMetadata({
    path: '/phong-nghi',
    eligible: !!publicText(content.heroTitle) && urls.some((entry) => entry.path === '/phong-nghi') && stays.length > 0,
    searchParams: query,
  });
}

function Reviews({ reviews, config }: { reviews: Awaited<ReturnType<typeof getPublicReviews>>; config: Record<string, unknown> }) {
  const title = typeof config.reviewsTitle === 'string' ? config.reviewsTitle.trim() : '';
  const subtitle = config.reviewsSubtitle;
  if (!title || !reviews.length) return null;
  return (
    <section className="stays-reviews" aria-labelledby="stays-reviews-t">
      <div className="stays-reviews__head">
        <h2 id="stays-reviews-t" className="stays-reviews__title">
          {title} <SmallLeaf className="section-title__leaf" />
        </h2>
        {richDocumentHasContent(subtitle) ? <div className="stays-reviews__sub"><RichContentRenderer document={subtitle as RichDocument} /></div> : publicText(subtitle) && <p className="stays-reviews__sub">{publicText(subtitle)}</p>}
      </div>
      <ReviewsStrip reviews={reviews} />
    </section>
  );
}

export default async function StaysPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Per-request render so filters/selection from the URL are server-rendered.
  const query = await searchParams;
  const [stays, reviews, site, urls] = await Promise.all([getPublicStays(), getPublicReviews(), getPublicSite(), getPublicSeoUrls()]);
  const pageContent = publicSetting(site, 'catalog.staysPage');
  const mapImage = publicAsset(site, pageContent.mapImageMediaId);
  const faqItems = (Array.isArray(pageContent.faqs) ? pageContent.faqs : []).flatMap((value, index) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
    const item = value as Record<string, unknown>;
    const question = typeof item.question === 'string' ? item.question.trim() : '';
    const answer = typeof item.answer === 'string' ? item.answer.trim() : item.answer;
    return item.enabled === false || !question || !(typeof answer === 'string' ? !!answer : richDocumentHasContent(answer)) ? [] : [{ id: typeof item.id === 'string' ? item.id : `stay-faq-${index}`, question, answer: answer as string | RichDocument }];
  });
  const indexablePaths = new Set(urls.map((entry) => entry.path));
  const schemaItems = stays
    .filter((stay) => !stay.noindex && !!stay.publicPath && indexablePaths.has(stay.publicPath) && isSubstantivePublicContent(stay.descriptionDocument ?? stay.description))
    .map((stay) => ({ name: stay.name, href: stay.publicPath! }));
  const pageTitle = publicText(pageContent.heroTitle);
  const structuredData = pageTitle && isSeoSchemaAllowed(site, '/phong-nghi', { eligible: schemaItems.length > 0, searchParams: query })
    ? buildCollectionGraph(site, { path: '/phong-nghi', title: pageTitle, items: schemaItems })
    : null;
  return (
    <PageShell className="page-stays">
      <StaysHero config={pageContent} image={publicAsset(site, pageContent.heroImageMediaId)} />
        <div className="stays-availability-cta content-shell"><Link href="/lich-phong"><CalendarDays size={16} aria-hidden="true" /> Tra cứu tồn phòng theo từng đêm</Link></div>
        <StaysExplorer
          stays={stays}
          mapImage={mapImage}
          content={pageContent}
          advisor={<AdvisorCard config={pageContent} image={publicAsset(site, pageContent.advisorImageMediaId)} />}
          notFound={<NotFoundCard config={pageContent} />}
          reviews={<Reviews reviews={reviews} config={pageContent} />}
          faq={
            pageContent.faqTitle && faqItems.length > 0 ? <section className="stays-faq"><h2 className="section-title">{String(pageContent.faqTitle)} <SmallLeaf className="section-title__leaf" /></h2><FaqList items={faqItems} variant="boxed" /></section> : null
          }
        />
      <JsonLd data={structuredData} />
    </PageShell>
  );
}

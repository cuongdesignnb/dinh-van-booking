import type { Metadata } from 'next';
import Image from '@/components/ui/ManagedImage';
import { notFound, permanentRedirect } from 'next/navigation';
import { DestinationExplorer } from '@/components/destinations/DestinationExplorer';
import { DestinationNote, ItineraryTabs, Seasons } from '@/components/destinations/DiscoveryLower';
import { PageShell } from '@/components/layout/PageShell';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { RichContentRenderer } from '@/components/content/RichContentRenderer';
import { getPublicDestinations, getPublicLegacyTarget, getPublicSeoUrls, getPublicSite } from '@/lib/api/public';
import { JsonLd } from '@/components/seo/JsonLd';
import { isSubstantivePublicContent } from '@/lib/seo/content';
import { buildPageMetadata } from '@/lib/seo/metadata';
import { isSeoSchemaAllowed } from '@/lib/seo/policy';
import { buildCollectionGraph } from '@/lib/seo/schema';
import { publicAsset, publicRecord, publicSetting, publicText, richDocumentHasContent } from '@/lib/public-content';
import type { RichDocument } from '@/lib/content/rich-document';
import '@/styles/destinations.css';

export async function generateMetadata({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }): Promise<Metadata> {
  const query = await searchParams;
  // notFound() supplies its own noindex robots directive. Omitting route-level
  // robots here avoids duplicate tags for legacy query routes that resolve 404.
  if (query.d !== undefined) return { title: 'Không tìm thấy điểm đến' };
  const [destinations, site, urls] = await Promise.all([getPublicDestinations(), getPublicSite(), getPublicSeoUrls()]);
  const page = publicSetting(site, 'catalog.destinationsPage');
  return buildPageMetadata({ path: '/diem-den', eligible: publicText(page.heroTitle) !== '' && urls.some((entry) => entry.path === '/diem-den') && destinations.length > 0, searchParams: query });
}

export default async function DestinationsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  if (query.d !== undefined) {
    const value = typeof query.d === 'string' ? query.d.trim() : query.d.length === 1 ? query.d[0].trim() : '';
    if (!value) notFound();
    const path = await getPublicLegacyTarget('destination', value);
    if (!path) notFound();
    permanentRedirect(path);
  }
  const [destinations, site, urls] = await Promise.all([getPublicDestinations(), getPublicSite(), getPublicSeoUrls()]);
  const page = publicSetting(site, 'catalog.destinationsPage');
  const heroImage = publicAsset(site, page.heroImageMediaId);
  const itineraryImage = publicAsset(site, page.itineraryImageMediaId);
  const noteImage = publicAsset(site, page.noteImageMediaId);
  const heroTitle = publicText(page.heroTitle);
  const heroKicker = publicText(page.heroKicker);
  const schemaItems = destinations
    .filter((destination) => !destination.noindex && !!destination.publicPath && urls.some((entry) => entry.path === destination.publicPath) && isSubstantivePublicContent(destination.body ?? destination.description))
    .map((destination) => ({ name: destination.name, href: destination.publicPath! }));
  const structuredData = heroTitle && isSeoSchemaAllowed(site, '/diem-den', { eligible: schemaItems.length > 0, searchParams: query })
    ? buildCollectionGraph(site, { path: '/diem-den', title: heroTitle, items: schemaItems })
    : null;
  const itineraries = (Array.isArray(page.itineraries) ? page.itineraries : []).filter((value) => {
    const item = publicRecord(value);
    return item.enabled !== false && !!publicText(item.label) && Array.isArray(item.days) && item.days.length > 0;
  });
  const seasons = (Array.isArray(page.seasons) ? page.seasons : []).filter((value) => {
    const item = publicRecord(value);
    return item.enabled !== false && !!publicText(item.title) && richDocumentHasContent(item.description);
  });
  const showItinerary = !!publicText(page.itineraryTitle) && itineraries.length > 0;
  const showSeasons = !!publicText(page.seasonsTitle) && seasons.length > 0;
  const showNote = !!publicText(page.noteTitle) || richDocumentHasContent(page.noteBody) || !!noteImage?.src;

  return (
    <PageShell className="page-destinations">
      {heroTitle && <section className="phero phero--dest" aria-labelledby="dest-h1">
        <div className="phero__media" aria-hidden="true">
          {heroImage?.src && <Image src={heroImage.src} alt={heroImage.alt ?? ''} fill priority sizes="100vw" className="phero__img" unoptimized />}
          <div className="phero__shade" />
        </div>
        <div className="phero__inner content-shell">
          <Breadcrumb variant="light" items={[{ label: 'Trang chủ', href: '/' }, { label: heroTitle }]} />
          {heroKicker && <p className="phero__script handwritten" data-reveal="write">{heroKicker}</p>}
          <h1 id="dest-h1" className="phero__title" data-reveal="fade-up">{heroTitle}</h1>
          {richDocumentHasContent(page.heroDescription) && <div className="phero__text" data-reveal="fade-up"><RichContentRenderer document={page.heroDescription as RichDocument} /></div>}
          {richDocumentHasContent(page.heroQuote) && <div className="phero__quotebox" data-reveal="fade-up"><RichContentRenderer document={page.heroQuote as RichDocument} /></div>}
        </div>
      </section>}

      <DestinationExplorer destinations={destinations} config={page} />

      {(showItinerary || showSeasons || showNote) && <div className="discovery-lower content-shell">
        {showItinerary && <ItineraryTabs config={page} image={itineraryImage} />}
        {showSeasons && <Seasons config={page} />}
        {showNote && <div className="discovery-lower__right"><DestinationNote config={page} image={noteImage} /></div>}
      </div>}
      <JsonLd data={structuredData} />
    </PageShell>
  );
}

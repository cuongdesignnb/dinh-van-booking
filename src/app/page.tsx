import type { Metadata } from 'next';
import { DestinationGrid } from '@/components/home/DestinationGrid';
import { FeaturedStays } from '@/components/home/FeaturedStays';
import { HeroSection } from '@/components/home/HeroSection';
import { PersonalContact } from '@/components/home/PersonalContact';
import { Testimonials } from '@/components/home/Testimonials';
import { TrustStrip } from '@/components/home/TrustStrip';
import { WhyChooseUs } from '@/components/home/WhyChooseUs';
import { PageShell } from '@/components/layout/PageShell';
import { JsonLd } from '@/components/seo/JsonLd';
import { getPublicDestinations, getPublicReviews, getPublicSeoUrls, getPublicSite, getPublicStays } from '@/lib/api/public';
import { isSubstantivePublicContent } from '@/lib/seo/content';
import { buildPageMetadata } from '@/lib/seo/metadata';
import { isSeoSchemaAllowed } from '@/lib/seo/policy';
import { buildSiteGraph } from '@/lib/seo/schema';

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const [query, site, stays, destinations, urls] = await Promise.all([
    searchParams,
    getPublicSite(),
    getPublicStays(),
    getPublicDestinations(),
    getPublicSeoUrls(),
  ]);
  const eligible = urls.some((entry) => entry.path === '/')
    && (stays.some((stay) => !stay.noindex && isSubstantivePublicContent(stay.descriptionDocument ?? stay.description))
      || destinations.some((destination) => !destination.noindex && isSubstantivePublicContent(destination.body ?? destination.description)));
  return buildPageMetadata({
    path: '/',
    title: typeof site.seo.defaultTitle === 'string' ? site.seo.defaultTitle : site.identity.name,
    description: typeof site.seo.defaultDescription === 'string' ? site.seo.defaultDescription : site.identity.description,
    eligible,
    searchParams: query,
  });
}

export default async function HomePage({ searchParams }: Props) {
  const [query, stays, destinations, reviews, site] = await Promise.all([
    searchParams,
    getPublicStays(true),
    getPublicDestinations(),
    getPublicReviews(),
    getPublicSite(),
  ]);
  const hasIndexableContent = stays.some((stay) => !stay.noindex && isSubstantivePublicContent(stay.descriptionDocument ?? stay.description))
    || destinations.some((destination) => !destination.noindex && isSubstantivePublicContent(destination.body ?? destination.description));
  const structuredData = isSeoSchemaAllowed(site, '/', { eligible: hasIndexableContent, searchParams: query })
    ? buildSiteGraph(site, { path: '/', title: typeof site.seo.defaultTitle === 'string' ? site.seo.defaultTitle : site.identity.name ?? 'Đinh Vân Booking', description: typeof site.seo.defaultDescription === 'string' ? site.seo.defaultDescription : site.identity.description })
    : null;
  return (
    <PageShell className="page-home">
      <JsonLd data={structuredData} />
      <HeroSection />
      <TrustStrip />
      <FeaturedStays stays={stays} />
      <div className="lower content-shell">
        <div className="lower__left">
          <WhyChooseUs />
          <DestinationGrid destinations={destinations} />
        </div>
        <div className="lower__right">
          <Testimonials testimonials={reviews} />
          <PersonalContact />
        </div>
      </div>
    </PageShell>
  );
}

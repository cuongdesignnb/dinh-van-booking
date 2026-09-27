import type { Metadata } from 'next';
import { DestinationGrid } from '@/components/home/DestinationGrid';
import { FeaturedStays } from '@/components/home/FeaturedStays';
import { HeroSection } from '@/components/home/HeroSection';
import { PersonalContact } from '@/components/home/PersonalContact';
import { Testimonials } from '@/components/home/Testimonials';
import { TrustStrip } from '@/components/home/TrustStrip';
import { WhyChooseUs } from '@/components/home/WhyChooseUs';
import { ExperiencePromo } from '@/components/home/ExperiencePromo';
import { HomeCombos } from '@/components/home/HomeCombos';
import { HomeFaq } from '@/components/home/HomeFaq';
import { BookingSearch } from '@/components/home/BookingSearch';
import { PageShell } from '@/components/layout/PageShell';
import { JsonLd } from '@/components/seo/JsonLd';
import { getPublicCombos, getPublicDestinations, getPublicReviews, getPublicSeoUrls, getPublicSite, getPublicStays } from '@/lib/api/public';
import { isSubstantivePublicContent } from '@/lib/seo/content';
import { buildPageMetadata } from '@/lib/seo/metadata';
import { isSeoSchemaAllowed } from '@/lib/seo/policy';
import { buildSiteGraph } from '@/lib/seo/schema';
import { publicAsset, publicSectionHidden, publicSectionOrder, publicSetting } from '@/lib/public-content';

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
  const [query, stays, destinations, combos, reviews, site] = await Promise.all([
    searchParams,
    getPublicStays(),
    getPublicDestinations(),
    getPublicCombos(),
    getPublicReviews(),
    getPublicSite(),
  ]);
  const hasIndexableContent = stays.some((stay) => !stay.noindex && isSubstantivePublicContent(stay.descriptionDocument ?? stay.description))
    || destinations.some((destination) => !destination.noindex && isSubstantivePublicContent(destination.body ?? destination.description));
  const structuredData = isSeoSchemaAllowed(site, '/', { eligible: hasIndexableContent, searchParams: query })
    ? buildSiteGraph(site, { path: '/', title: typeof site.seo.defaultTitle === 'string' ? site.seo.defaultTitle : site.identity.name!, description: typeof site.seo.defaultDescription === 'string' ? site.seo.defaultDescription : site.identity.description })
    : null;
  const configs = {
    hero: publicSetting(site, 'home.hero'),
    trust: publicSetting(site, 'home.trust'),
    featured: publicSetting(site, 'home.featured'),
    combos: publicSetting(site, 'home.combos'),
    why: publicSetting(site, 'home.why'),
    destinations: publicSetting(site, 'home.destinations'),
    reviews: publicSetting(site, 'home.testimonials'),
    promo: publicSetting(site, 'home.promo'),
    faq: publicSetting(site, 'home.faq'),
    contact: publicSetting(site, 'home.contactPanel'),
  };
  const selectedStays = configs.featured.selectionMode === 'featured' ? stays.filter((item) => item.popularity > 0) : stays;
  const selectedDestinations = configs.destinations.selectionMode === 'featured' ? destinations.filter((item) => item.featured) : destinations;
  const renderSection = (key: string) => {
    if (publicSectionHidden(site, key)) return null;
    switch (key) {
      case 'hero': return <HeroSection key={key} config={configs.hero} image={publicAsset(site, configs.hero.imageMediaId)} mobileImage={publicAsset(site, configs.hero.mobileImageMediaId)} />;
      case 'search': return <section key={key} className="home-search content-shell"><BookingSearch /></section>;
      case 'trust': return <TrustStrip key={key} config={configs.trust} />;
      case 'featured': return <FeaturedStays key={key} stays={selectedStays} config={configs.featured} />;
      case 'combos': return <HomeCombos key={key} combos={combos} config={configs.combos} />;
      case 'why': return <WhyChooseUs key={key} config={configs.why} />;
      case 'destinations': return <DestinationGrid key={key} destinations={selectedDestinations} config={configs.destinations} />;
      case 'reviews': return <Testimonials key={key} testimonials={reviews} config={configs.reviews} />;
      case 'promo': return <div key={key} className="home-promo content-shell"><ExperiencePromo config={configs.promo} image={publicAsset(site, configs.promo.imageMediaId)} /></div>;
      case 'faq': return <HomeFaq key={key} config={configs.faq} />;
      case 'contact': return <PersonalContact key={key} config={configs.contact} image={publicAsset(site, configs.contact.imageMediaId)} />;
      default: return null;
    }
  };
  const homeSections = publicSectionOrder(site).map(renderSection).filter((section): section is NonNullable<typeof section> => section !== null);
  return (
    <PageShell className="page-home">
      <JsonLd data={structuredData} />
      <div className="home-content-order">{homeSections}</div>
    </PageShell>
  );
}

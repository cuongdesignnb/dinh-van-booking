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
import { publicAsset, publicSectionHidden, publicSectionOrder, publicSetting, publicText, richDocumentHasContent } from '@/lib/public-content';
import { richDocumentToText } from '@/lib/content/rich-document';
import type { ReactNode } from 'react';

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const isRecord = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const visibleRows = (value: unknown) => (Array.isArray(value) ? value : []).filter((item): item is Record<string, unknown> => isRecord(item) && item.enabled !== false);
const hasTrustItem = (value: unknown) => visibleRows(value).some((item) =>
  ['leaf', 'heart', 'shield', 'users'].includes(String(item.icon)) && !!(publicText(item.line1) || publicText(item.line2)));
const hasWhyReason = (value: unknown) => visibleRows(value).some((item) =>
  ['user', 'house', 'message', 'tag', 'map'].includes(String(item.icon)) && !!publicText(item.title));
const hasFaqItem = (value: unknown) => visibleRows(value).some((item) =>
  !!publicText(item.question) && (typeof item.answer === 'string' ? !!publicText(item.answer) : richDocumentHasContent(item.answer)));

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
    description: typeof site.seo.defaultDescription === 'string' ? site.seo.defaultDescription : richDocumentToText(site.identity.description),
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
    ? buildSiteGraph(site, { path: '/', title: typeof site.seo.defaultTitle === 'string' ? site.seo.defaultTitle : site.identity.name!, description: typeof site.seo.defaultDescription === 'string' ? site.seo.defaultDescription : richDocumentToText(site.identity.description) })
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
  const selectedStays = configs.featured.selectionMode === 'all' ? stays : stays.filter((item) => item.featured === true);
  const selectedDestinations = configs.destinations.selectionMode === 'featured' ? destinations.filter((item) => item.featured) : destinations;
  const order = publicSectionOrder(site);
  const shown = (key: string) => order.includes(key) && !publicSectionHidden(site, key);
  const rank = (...keys: string[]) => Math.min(...keys.map((key) => order.indexOf(key)).filter((index) => index >= 0));
  const heroVisible = shown('hero') && configs.hero.enabled === true && !!publicText(configs.hero.titleLine1);
  const searchVisible = shown('search');
  const trustVisible = shown('trust') && configs.trust.enabled === true && hasTrustItem(configs.trust.items);
  const featuredVisible = shown('featured') && configs.featured.enabled === true && !!publicText(configs.featured.title) && selectedStays.length > 0;
  const promoVisible = shown('promo') && configs.promo.enabled === true && !!publicText(configs.promo.titleLine1);
  const combosVisible = shown('combos') && configs.combos.enabled === true && !!publicText(configs.combos.title) && combos.length > 0;
  const whyVisible = shown('why') && configs.why.enabled === true && !!publicText(configs.why.title) && hasWhyReason(configs.why.reasons);
  const destinationsVisible = shown('destinations') && configs.destinations.enabled === true && !!publicText(configs.destinations.title) && selectedDestinations.length > 0;
  const reviewsVisible = shown('reviews') && configs.reviews.enabled === true && !!publicText(configs.reviews.title) && reviews.length > 0;
  const contactVisible = shown('contact') && configs.contact.enabled === true && !!publicText(configs.contact.title);
  const faqVisible = shown('faq') && configs.faq.enabled === true && !!publicText(configs.faq.title) && hasFaqItem(configs.faq.items);

  // DB order ranks editorial groups. Members keep their visual slots: search in
  // hero, promo beside stays, and the four lower modules in two columns.
  const groups: Array<{ key: string; rank: number; node: ReactNode }> = [];
  if (heroVisible || searchVisible) groups.push({ key: 'hero', rank: rank('hero', 'search'), node: heroVisible
    ? <HeroSection config={configs.hero} image={publicAsset(site, configs.hero.imageMediaId)} mobileImage={publicAsset(site, configs.hero.mobileImageMediaId)} showSearch={searchVisible} />
    : <section className="home-search content-shell"><BookingSearch /></section> });
  if (trustVisible) groups.push({ key: 'trust', rank: rank('trust'), node: <TrustStrip config={configs.trust} /> });
  if (featuredVisible || promoVisible) groups.push({ key: 'featured', rank: rank('featured', 'promo'), node: <FeaturedStays stays={featuredVisible ? selectedStays : []} config={configs.featured} promo={promoVisible ? <ExperiencePromo config={configs.promo} image={publicAsset(site, configs.promo.imageMediaId)} /> : null} /> });
  if (combosVisible) groups.push({ key: 'combos', rank: rank('combos'), node: <HomeCombos combos={combos} config={configs.combos} /> });
  if (whyVisible || destinationsVisible || reviewsVisible || contactVisible) groups.push({ key: 'lower', rank: rank('why', 'destinations', 'reviews', 'contact'), node:
    <div className={`lower content-shell${(whyVisible || destinationsVisible) && (reviewsVisible || contactVisible) ? '' : ' lower--single'}`}>
      {(whyVisible || destinationsVisible) && <div className="lower__left">
        {whyVisible && <WhyChooseUs config={configs.why} />}
        {destinationsVisible && <DestinationGrid destinations={selectedDestinations} config={configs.destinations} />}
      </div>}
      {(reviewsVisible || contactVisible) && <div className="lower__right">
        {reviewsVisible && <Testimonials testimonials={reviews} config={configs.reviews} />}
        {contactVisible && <PersonalContact config={configs.contact} image={publicAsset(site, configs.contact.imageMediaId)} />}
      </div>}
    </div> });
  const homeSections = groups.sort((a, b) => a.rank - b.rank).map((group) => <div className="home-layout-group" data-home-group={group.key} key={group.key}>{group.node}</div>);
  if (faqVisible) homeSections.push(<div className="home-layout-group" data-home-group="faq" key="faq"><HomeFaq config={configs.faq} /></div>);
  return (
    <PageShell className="page-home">
      <JsonLd data={structuredData} />
      <div className="home-content-order">{homeSections}</div>
    </PageShell>
  );
}

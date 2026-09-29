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

  const visibility = {
    hero: heroVisible, search: searchVisible, trust: trustVisible, featured: featuredVisible,
    combos: combosVisible, why: whyVisible, destinations: destinationsVisible,
    reviews: reviewsVisible, promo: promoVisible, faq: faqVisible, contact: contactVisible,
  };
  type Section = keyof typeof visibility;
  const seen = new Set<string>();
  const visibleOrder = order.filter((key): key is Section => {
    if (!Object.prototype.hasOwnProperty.call(visibility, key) || !visibility[key as Section] || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const lowerOrder: Section[] = ['why', 'destinations', 'reviews', 'contact'];
  const isLower = (key: Section): boolean => lowerOrder.includes(key);
  const groups: Array<{ key: string; sections: Section[]; node: ReactNode }> = [];

  // Only adjacent sections share a visual slot. If Admin moves one elsewhere,
  // render it independently at the exact saved position instead of moving it
  // back to its former column (or silently ignoring the reorder).
  for (let index = 0; index < visibleOrder.length;) {
    const key = visibleOrder[index];
    const next = visibleOrder[index + 1];
    if (key === 'hero' && next === 'search') {
      groups.push({ key: 'hero', sections: ['hero', 'search'], node: <HeroSection config={configs.hero} image={publicAsset(site, configs.hero.imageMediaId)} mobileImage={publicAsset(site, configs.hero.mobileImageMediaId)} showSearch /> });
      index += 2;
      continue;
    }
    if (key === 'featured' && next === 'promo') {
      groups.push({ key: 'featured', sections: ['featured', 'promo'], node: <FeaturedStays stays={selectedStays} config={configs.featured} promo={<ExperiencePromo config={configs.promo} image={publicAsset(site, configs.promo.imageMediaId)} />} /> });
      index += 2;
      continue;
    }
    if (isLower(key)) {
      const sections: Section[] = [key];
      while (index + sections.length < visibleOrder.length) {
        const following = visibleOrder[index + sections.length];
        if (!isLower(following) || lowerOrder.indexOf(following) <= lowerOrder.indexOf(sections[sections.length - 1])) break;
        sections.push(following);
      }
      const left = sections.includes('why') || sections.includes('destinations');
      const right = sections.includes('reviews') || sections.includes('contact');
      groups.push({ key: 'lower', sections, node:
        <div className={`lower content-shell${left && right ? '' : ' lower--single'}`}>
          {left && <div className="lower__left">
            {sections.includes('why') && <WhyChooseUs config={configs.why} />}
            {sections.includes('destinations') && <DestinationGrid destinations={selectedDestinations} config={configs.destinations} />}
          </div>}
          {right && <div className="lower__right">
            {sections.includes('reviews') && <Testimonials testimonials={reviews} config={configs.reviews} />}
            {sections.includes('contact') && <PersonalContact config={configs.contact} image={publicAsset(site, configs.contact.imageMediaId)} />}
          </div>}
        </div> });
      index += sections.length;
      continue;
    }
    const nodes: Partial<Record<Section, ReactNode>> = {
      hero: <HeroSection config={configs.hero} image={publicAsset(site, configs.hero.imageMediaId)} mobileImage={publicAsset(site, configs.hero.mobileImageMediaId)} />,
      search: <section className="home-search content-shell"><BookingSearch /></section>,
      trust: <TrustStrip config={configs.trust} />,
      featured: <FeaturedStays stays={selectedStays} config={configs.featured} />,
      combos: <HomeCombos combos={combos} config={configs.combos} />,
      promo: <section className="home-promo content-shell"><ExperiencePromo config={configs.promo} image={publicAsset(site, configs.promo.imageMediaId)} standalone /></section>,
      faq: <HomeFaq config={configs.faq} />,
    };
    groups.push({ key, sections: [key], node: nodes[key] });
    index += 1;
  }
  const homeSections = groups.map((group, index) => <div className="home-layout-group" data-home-group={group.key} data-home-sections={group.sections.join(',')} key={`${group.key}-${index}`}>{group.node}</div>);
  return (
    <PageShell className="page-home">
      <JsonLd data={structuredData} />
      <div className="home-content-order">{homeSections}</div>
    </PageShell>
  );
}

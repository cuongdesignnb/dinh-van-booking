import type { Metadata } from 'next';
import '@/styles/site/home.css';
import { DestinationGrid } from '@/components/home/DestinationGrid';
import { FeaturedStays } from '@/components/home/FeaturedStays';
import { HeroSection, trustItems } from '@/components/home/HeroSection';
import { PersonalContact } from '@/components/home/PersonalContact';
import { Testimonials } from '@/components/home/Testimonials';
import { WhyChooseUs, whyReasons } from '@/components/home/WhyChooseUs';
import { ExperiencePromo } from '@/components/home/ExperiencePromo';
import { HomeCombos } from '@/components/home/HomeCombos';
import { HomeFaq } from '@/components/home/HomeFaq';
import { BookingSearch, type SearchOption } from '@/components/home/BookingSearch';
import { StatsBand, statItems } from '@/components/home/StatsBand';
import { PartnerBand } from '@/components/home/PartnerBand';
import { STAY_TYPES } from '@/lib/catalog/constants';
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
import type { Stay } from '@/data/stays';

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const isRecord = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const visibleRows = (value: unknown) => (Array.isArray(value) ? value : []).filter((item): item is Record<string, unknown> => isRecord(item) && item.enabled !== false);
const AREA_LABELS: Record<string, string> = { 'cuc-phuong': 'Khu vực Cúc Phương', 'trang-an': 'Khu vực Tràng An' };
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
    stats: publicSetting(site, 'home.stats'),
    partner: publicSetting(site, 'home.partner'),
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

  const visibility = {
    hero: shown('hero') && configs.hero.enabled === true && !!publicText(configs.hero.titleLine1),
    search: shown('search'),
    trust: shown('trust') && trustItems(configs.trust).length > 0,
    featured: shown('featured') && configs.featured.enabled === true && !!publicText(configs.featured.title) && selectedStays.length > 0,
    why: shown('why') && configs.why.enabled === true && !!publicText(configs.why.title) && whyReasons(configs.why).length > 0,
    contact: shown('contact') && configs.contact.enabled === true && !!(publicText(configs.contact.advisorName) || publicText(configs.contact.note)),
    stats: shown('stats') && configs.stats.enabled === true && statItems(configs.stats).length > 0,
    partner: shown('partner') && configs.partner.enabled === true && !!publicText(configs.partner.title),
    reviews: shown('reviews') && configs.reviews.enabled === true && !!publicText(configs.reviews.title) && reviews.length > 0,
    combos: shown('combos') && configs.combos.enabled === true && !!publicText(configs.combos.title) && combos.length > 0,
    destinations: shown('destinations') && configs.destinations.enabled === true && !!publicText(configs.destinations.title) && selectedDestinations.length > 0,
    promo: shown('promo') && configs.promo.enabled === true && !!publicText(configs.promo.titleLine1),
    faq: shown('faq') && configs.faq.enabled === true && !!publicText(configs.faq.title) && hasFaqItem(configs.faq.items),
  };
  type Section = keyof typeof visibility;
  const seen = new Set<string>();
  const visibleOrder = order.filter((key): key is Section => {
    // The trust row lives inside the hero; its order slot only toggles it.
    if (key === 'trust' || !Object.prototype.hasOwnProperty.call(visibility, key) || !visibility[key as Section] || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Search options come from the published catalogue so every choice can match.
  const areas: SearchOption[] = [...new Set(stays.map((stay) => stay.area))].filter((area) => AREA_LABELS[area]).map((area) => ({ value: area, label: AREA_LABELS[area] }));
  const typeIds = new Set<Stay['type']>(stays.map((stay) => stay.type));
  const types: SearchOption[] = STAY_TYPES.filter((type) => typeIds.has(type.id)).map((type) => ({ value: type.id, label: type.label }));
  const search = <div className="hs-wrap cp-shell"><BookingSearch areas={areas.length > 1 ? areas : []} areaLabel="Cúc Phương – Ninh Bình" types={types} /></div>;
  const contactBlock = <PersonalContact config={configs.contact} image={publicAsset(site, configs.contact.imageMediaId)} />;

  const groups: Array<{ key: string; sections: Section[]; node: ReactNode }> = [];
  // Only adjacent sections share a visual slot. If Admin moves one elsewhere,
  // render it on its own at the saved position.
  for (let index = 0; index < visibleOrder.length;) {
    const key = visibleOrder[index];
    const next = visibleOrder[index + 1];
    if (key === 'hero') {
      const withSearch = next === 'search';
      groups.push({ key, sections: withSearch ? ['hero', 'search'] : ['hero'], node: <>
        <HeroSection config={configs.hero} trust={visibility.trust ? configs.trust : null} image={publicAsset(site, configs.hero.imageMediaId)} mobileImage={publicAsset(site, configs.hero.mobileImageMediaId)} />
        {withSearch && search}
      </> });
      index += withSearch ? 2 : 1;
      continue;
    }
    if (key === 'why' && next === 'contact') {
      groups.push({ key, sections: ['why', 'contact'], node: <WhyChooseUs config={configs.why} aside={contactBlock} /> });
      index += 2;
      continue;
    }
    if (key === 'partner' && next === 'reviews') {
      groups.push({ key, sections: ['partner', 'reviews'], node: <div className="hduo cp-shell">
        <PartnerBand config={configs.partner} image={publicAsset(site, configs.partner.imageMediaId)} />
        <Testimonials testimonials={reviews} config={configs.reviews} />
      </div> });
      index += 2;
      continue;
    }
    const nodes: Record<Section, ReactNode> = {
      hero: null,
      trust: null,
      search: <div className="hs-solo">{search}</div>,
      featured: <FeaturedStays stays={selectedStays} config={configs.featured} />,
      why: <WhyChooseUs config={configs.why} />,
      contact: <WhyChooseUs config={{}} aside={contactBlock} />,
      stats: <StatsBand config={configs.stats} />,
      partner: <div className="hduo hduo--single cp-shell"><PartnerBand config={configs.partner} image={publicAsset(site, configs.partner.imageMediaId)} /></div>,
      reviews: <div className="hduo hduo--single cp-shell"><Testimonials testimonials={reviews} config={configs.reviews} /></div>,
      combos: <HomeCombos combos={combos} config={configs.combos} />,
      destinations: <DestinationGrid destinations={selectedDestinations} config={configs.destinations} />,
      promo: <ExperiencePromo config={configs.promo} image={publicAsset(site, configs.promo.imageMediaId)} />,
      faq: <HomeFaq config={configs.faq} />,
    };
    groups.push({ key, sections: [key], node: nodes[key] });
    index += 1;
  }
  return (
    <PageShell className="page-home">
      <JsonLd data={structuredData} />
      <div className="home">
        {groups.map((group, index) => <div className="home__group" data-home-group={group.key} data-home-sections={group.sections.join(',')} key={`${group.key}-${index}`}>{group.node}</div>)}
      </div>
    </PageShell>
  );
}

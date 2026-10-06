import { ArrowRight, BadgeCheck, Heart, House, Leaf, Map as MapIcon, MessageSquareText, Mountain, Phone, Send, ShieldCheck, Trees, Waves } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Image from '@/components/ui/ManagedImage';
import { AdvisorMonogram } from '@/components/home/HomeArt';
import { PageShell } from '@/components/layout/PageShell';
import { PageHero } from '@/components/site/PageHero';
import { SectionHead } from '@/components/site/SectionHead';
import { RichContentRenderer } from '@/components/content/RichContentRenderer';
import { JsonLd } from '@/components/seo/JsonLd';
import { BrandIcon } from '@/components/ui/BrandIcons';
import { getPublicSeoUrls, getPublicSite, type PublicMediaAsset, type PublicSiteData } from '@/lib/api/public';
import { richDocumentToText, type RichDocument } from '@/lib/content/rich-document';
import { publicAsset, publicRecord, publicSetting, publicText, richDocumentHasContent, type PublicRecord } from '@/lib/public-content';
import { buildPageMetadata } from '@/lib/seo/metadata';
import { isSeoSchemaAllowed } from '@/lib/seo/policy';
import { buildAboutGraph } from '@/lib/seo/schema';
import '@/styles/site/about.css';

const PATH = '/ve-minh';
type Query = Record<string, string | string[] | undefined>;

const VALUE_ICONS = { check: BadgeCheck, message: MessageSquareText, shield: ShieldCheck, phone: Phone, heart: Heart, leaf: Leaf, map: MapIcon, house: House } as const;
const AREA_ICONS = { trees: Trees, mountain: Mountain, house: House, waves: Waves, map: MapIcon } as const;

type Item = { id: string; title: string; text: string };

function rows(value: unknown): PublicRecord[] {
  return (Array.isArray(value) ? value : []).map(publicRecord).filter((item) => item.enabled !== false);
}

function items(value: unknown, prefix: string): Item[] {
  return rows(value).flatMap((item, index) => {
    const title = publicText(item.title);
    return title ? [{ id: publicText(item.id) || `${prefix}-${index}`, title, text: publicText(item.text) }] : [];
  });
}

/** Only same-site paths; anything else is dropped rather than rendered as a broken link. */
function internalHref(value: unknown): string | null {
  const href = publicText(value);
  return href.startsWith('/') && !href.startsWith('//') ? href : null;
}

/**
 * Everything the page and its metadata need. The advisor's name, role and
 * photo come from the existing advisor settings; phone/Zalo from brand.contact.
 */
function aboutContent(site: PublicSiteData) {
  const page = publicSetting(site, 'about.page');
  const panel = publicSetting(site, 'home.contactPanel');
  const contactPage = publicSetting(site, 'contact.page');
  const name = publicText(panel.advisorName) || publicText(contactPage.advisorName);
  const title = publicText(page.title);
  const faqs = page.showFaq === true ? rows(page.faqs).flatMap((item, index) => {
    const question = publicText(item.question);
    const answer = item.answer;
    const text = typeof answer === 'string' ? answer.trim() : richDocumentToText(answer);
    return question && text ? [{ id: publicText(item.id) || `about-faq-${index}`, question, answer, text }] : [];
  }) : [];
  return {
    page,
    enabled: page.enabled === true && !!title,
    title,
    name,
    role: publicText(panel.advisorRole) || publicText(contactPage.advisorRole),
    portrait: publicAsset(site, page.portraitMediaId) ?? publicAsset(site, panel.imageMediaId) ?? publicAsset(site, contactPage.advisorImageMediaId),
    heroImage: publicAsset(site, page.heroImageMediaId),
    ogImage: publicAsset(site, page.ogImageMediaId) ?? publicAsset(site, page.heroImageMediaId),
    phone: publicText(site.contact?.hotline) || publicText(site.contact?.phone),
    zaloUrl: publicText(site.contact?.zaloUrl),
    seoTitle: publicText(page.seoTitle) || (name ? `Về mình – ${name}` : title),
    seoDescription: publicText(page.seoDescription) || richDocumentToText(page.intro),
    ogDescription: publicText(page.ogDescription),
    faqs,
  };
}

export async function generateMetadata({ searchParams }: { searchParams: Promise<Query> }): Promise<Metadata> {
  const [query, site, urls] = await Promise.all([searchParams, getPublicSite(), getPublicSeoUrls()]);
  const about = aboutContent(site);
  if (!about.enabled) return { title: 'Không tìm thấy trang', robots: { index: false, follow: true } };
  return buildPageMetadata({
    path: PATH,
    title: about.seoTitle,
    description: about.seoDescription,
    socialDescription: about.ogDescription,
    image: about.ogImage?.src && about.ogImage.width && about.ogImage.height
      ? { src: about.ogImage.src, alt: about.ogImage.alt ?? '', width: about.ogImage.width, height: about.ogImage.height }
      : null,
    eligible: urls.some((entry) => entry.path === PATH),
    searchParams: query,
  });
}

function Rich({ value, className }: { value: unknown; className?: string }) {
  if (richDocumentHasContent(value)) return <div className={className}><RichContentRenderer document={value as RichDocument} /></div>;
  const text = publicText(value);
  return text ? <p className={className}>{text}</p> : null;
}

/** Watercolour-style landscape shown on a local-knowledge card until the owner adds a photo. */
function AreaArt({ icon, tone }: { icon: keyof typeof AREA_ICONS; tone: number }) {
  const Icon = AREA_ICONS[icon];
  return (
    <div className={`ab-area__art ab-area__art--${tone % 3}`} aria-hidden="true">
      <svg viewBox="0 0 320 200" preserveAspectRatio="xMidYMax slice" focusable="false">
        <path className="ab-area__far" d="M0 128 26 96l18 16 30-52 26 40 20-22 34 46 26-30 30 34 22-40 32 50 28-26 28 30v58H0Z" />
        <path className="ab-area__mid" d="M0 150c36-16 70-20 104-8s70 12 108-4 74-14 108 0v62H0Z" />
        <path className="ab-area__near" d="M0 176c44-10 92-10 140 0s96 10 180-6v30H0Z" />
      </svg>
      <span className="ab-area__badge"><Icon size={26} strokeWidth={1.8} /></span>
    </div>
  );
}

function Portrait({ name, role, greeting, image }: { name: string; role: string; greeting: string; image: PublicMediaAsset | null }) {
  return (
    <div className="ab-portrait">
      {greeting && <p className="ab-portrait__greeting script">{greeting}</p>}
      <div className="ab-portrait__frame">
        {image?.src
          ? <Image src={image.src} alt={image.alt || (name ? `Chân dung ${name}` : 'Chân dung người tư vấn')} fill sizes="(max-width: 767px) 72vw, 360px" className="ab-portrait__img" />
          : <AdvisorMonogram name={name || 'Cúc Phương'} className="ab-portrait__mono" idPrefix="ab" />}
      </div>
      {(name || role) && <p className="ab-portrait__caption">
        {name && <strong>{name}</strong>}
        {role && <span>{role}</span>}
      </p>}
    </div>
  );
}

export default async function AboutPage({ searchParams }: { searchParams: Promise<Query> }) {
  const [query, site, urls] = await Promise.all([searchParams, getPublicSite(), getPublicSeoUrls()]);
  const about = aboutContent(site);
  if (!about.enabled) notFound();
  const { page, name, role, phone, zaloUrl } = about;
  const tel = phone.replace(/[^\d+]/g, '');

  const phoneLabel = publicText(page.phoneCtaLabel);
  const zaloLabel = publicText(page.zaloCtaLabel);
  const contactLabel = publicText(page.contactCtaLabel);
  const staysLabel = publicText(page.ctaStaysLabel);
  const greeting = publicText(page.greeting);
  const storyTitle = publicText(page.storyTitle);
  const quote = publicText(page.quote);
  const signatureNote = publicText(page.signatureNote);
  const values = rows(page.values).flatMap((item, index) => {
    const title = publicText(item.title);
    const icon = publicText(item.icon) as keyof typeof VALUE_ICONS;
    return title ? [{ id: publicText(item.id) || `value-${index}`, title, text: publicText(item.text), Icon: VALUE_ICONS[icon] ?? BadgeCheck }] : [];
  });
  const steps = items(page.steps, 'step');
  const areas = rows(page.areas).flatMap((item, index) => {
    const title = publicText(item.title);
    const icon = publicText(item.icon);
    const href = internalHref(item.linkTarget);
    const linkLabel = publicText(item.linkLabel);
    return title ? [{
      id: publicText(item.id) || `area-${index}`,
      title,
      text: publicText(item.text),
      icon: (icon in AREA_ICONS ? icon : 'trees') as keyof typeof AREA_ICONS,
      link: href && linkLabel ? { href, label: linkLabel } : null,
      image: publicAsset(site, item.imageMediaId),
    }] : [];
  });
  const faqTitle = publicText(page.faqTitle);
  const ctaTitle = publicText(page.ctaTitle);
  const valuesTitle = publicText(page.valuesTitle);
  const stepsTitle = publicText(page.stepsTitle);
  const areasTitle = publicText(page.areasTitle);
  const showStory = !!(storyTitle && (richDocumentHasContent(page.story) || publicText(page.story)));

  const phoneCta = tel && phoneLabel ? { href: `tel:${tel}`, label: phoneLabel } : null;
  const zaloCta = zaloUrl && zaloLabel ? { href: zaloUrl, label: zaloLabel } : null;
  const crumbs = [{ label: 'Trang chủ', href: '/' }, { label: 'Về mình' }];

  const structuredData = isSeoSchemaAllowed(site, PATH, { eligible: urls.some((entry) => entry.path === PATH), searchParams: query })
    ? buildAboutGraph(site, {
      path: PATH,
      title: about.seoTitle,
      description: about.seoDescription,
      person: { name, jobTitle: role, telephone: phone, image: about.portrait, description: richDocumentToText(page.intro) },
      faqs: about.faqs.map((item) => ({ question: item.question, answer: item.text })),
    })
    : null;

  return (
    <PageShell className="page-about">
      <JsonLd data={structuredData} />
      <PageHero id="about-h1" title={about.title} eyebrow={publicText(page.heroEyebrow)} lead={page.intro} image={about.heroImage} crumbs={crumbs}>
        {(phoneCta || zaloCta || contactLabel) && <div className="ab-hero__actions">
          {phoneCta && <a className="btn btn--lg ab-btn--gold" href={phoneCta.href}><Phone size={19} aria-hidden="true" />{phoneCta.label}</a>}
          {zaloCta
            ? <a className="btn btn--lg ab-btn--glass" href={zaloCta.href} target="_blank" rel="noopener noreferrer"><BrandIcon name="zalo" size={19} />{zaloCta.label}</a>
            : contactLabel && <Link className="btn btn--lg ab-btn--glass" href="/lien-he"><Send size={18} aria-hidden="true" />{contactLabel}</Link>}
        </div>}
      </PageHero>

      {showStory && <section className="ab-story" aria-labelledby="ab-story-t">
        <div className="ab-story__inner content-shell">
          <Portrait name={name} role={role} greeting={greeting} image={about.portrait} />
          <div className="ab-story__body">
            <SectionHead id="ab-story-t" title={storyTitle} />
            <Rich value={page.story} className="ab-story__text" />
            {quote && <blockquote className="ab-quote"><p>{quote}</p></blockquote>}
            {(signatureNote || name) && <p className="ab-sign">
              {signatureNote && <span className="script ab-sign__note">{signatureNote}</span>}
              {name && <span className="script ab-sign__name">– {name}</span>}
            </p>}
          </div>
        </div>
      </section>}

      {valuesTitle && values.length > 0 && <section className="ab-values" aria-labelledby="ab-values-t">
        <div className="content-shell">
          <SectionHead id="ab-values-t" title={valuesTitle} sub={publicText(page.valuesIntro) || null} />
          <ul className={`ab-values__grid ab-values__grid--${Math.min(values.length, 4)}`}>
            {values.map(({ id, title, text, Icon }) => (
              <li key={id} className="ab-value">
                <span className="ab-value__icon" aria-hidden="true"><Icon size={24} strokeWidth={1.9} /></span>
                <h3>{title}</h3>
                {text && <p>{text}</p>}
              </li>
            ))}
          </ul>
        </div>
      </section>}

      {stepsTitle && steps.length > 0 && <section className="ab-steps" aria-labelledby="ab-steps-t">
        <div className="content-shell">
          <SectionHead id="ab-steps-t" title={stepsTitle} sub={publicText(page.stepsIntro) || null} />
          <ol className={`ab-steps__list ab-steps__list--${Math.min(steps.length, 4)}`}>
            {steps.map((step, index) => (
              <li key={step.id} className="ab-step">
                <span className="ab-step__num" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                <h3>{step.title}</h3>
                {step.text && <p>{step.text}</p>}
              </li>
            ))}
          </ol>
        </div>
      </section>}

      {areasTitle && areas.length > 0 && <section className="ab-areas" aria-labelledby="ab-areas-t">
        <div className="content-shell">
          <SectionHead id="ab-areas-t" title={areasTitle} sub={publicText(page.areasIntro) || null} />
          <ul className={`ab-areas__grid ab-areas__grid--${Math.min(areas.length, 4)}`}>
            {areas.map((area, index) => (
              <li key={area.id}>
                <article className="ab-area">
                  <div className="ab-area__media">
                    {area.image?.src
                      ? <Image src={area.image.src} alt={area.image.alt || area.title} width={area.image.width ?? 1200} height={area.image.height ?? 800} sizes="(max-width: 767px) 92vw, (max-width: 1199px) 45vw, 420px" className="ab-area__img" />
                      : <AreaArt icon={area.icon} tone={index} />}
                  </div>
                  <div className="ab-area__body">
                    <h3>{area.title}</h3>
                    {area.text && <p>{area.text}</p>}
                    {area.link && <Link className="link-more" href={area.link.href}>{area.link.label}<ArrowRight size={17} strokeWidth={2.2} aria-hidden="true" /></Link>}
                  </div>
                </article>
              </li>
            ))}
          </ul>
        </div>
      </section>}

      {faqTitle && about.faqs.length > 0 && <section className="ab-faq" aria-labelledby="ab-faq-t">
        <div className="content-shell ab-faq__inner">
          <SectionHead id="ab-faq-t" title={faqTitle} />
          <div className="ab-faq__list">
            {about.faqs.map((item) => (
              <details key={item.id} className="ab-faq__item">
                <summary><h3>{item.question}</h3><span className="ab-faq__mark" aria-hidden="true" /></summary>
                <Rich value={item.answer} className="ab-faq__answer" />
              </details>
            ))}
          </div>
        </div>
      </section>}

      {ctaTitle && <section className="ab-cta" aria-labelledby="ab-cta-t">
        <div className="content-shell ab-cta__inner">
          <div className="ab-cta__copy">
            {signatureNote && <p className="ab-cta__note script">{signatureNote}</p>}
            <h2 id="ab-cta-t">{ctaTitle}</h2>
            <Rich value={page.ctaText} className="ab-cta__text" />
          </div>
          <div className="ab-cta__actions">
            {phoneCta && <a className="btn btn--lg ab-btn--gold" href={phoneCta.href}><Phone size={19} aria-hidden="true" />{phoneCta.label}</a>}
            {zaloCta && <a className="btn btn--lg ab-btn--glass" href={zaloCta.href} target="_blank" rel="noopener noreferrer"><BrandIcon name="zalo" size={19} />{zaloCta.label}</a>}
            {contactLabel && <Link className="btn btn--lg ab-btn--glass" href="/lien-he"><Send size={18} aria-hidden="true" />{contactLabel}</Link>}
            {staysLabel && <Link className="ab-cta__link" href="/phong-nghi">{staysLabel}<ArrowRight size={17} strokeWidth={2.2} aria-hidden="true" /></Link>}
          </div>
        </div>
      </section>}
    </PageShell>
  );
}

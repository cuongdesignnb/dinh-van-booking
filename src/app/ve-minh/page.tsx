import {
  ArrowRight,
  BadgeCheck,
  BedDouble,
  Car,
  Compass,
  Heart,
  House,
  Leaf,
  Mail,
  Map as MapIcon,
  MapPin,
  MessageCircle,
  MessageSquareText,
  Phone,
  Settings,
  ShieldCheck,
  Ticket,
  Users,
  Zap,
} from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChatCta } from '@/components/chat/ChatCta';
import { RichContentRenderer } from '@/components/content/RichContentRenderer';
import { AdvisorMonogram } from '@/components/home/HomeArt';
import { PageShell } from '@/components/layout/PageShell';
import { JsonLd } from '@/components/seo/JsonLd';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { BrandIcon } from '@/components/ui/BrandIcons';
import Image from '@/components/ui/ManagedImage';
import { getPublicSeoUrls, getPublicSite, type PublicMediaAsset, type PublicSiteData } from '@/lib/api/public';
import { richDocumentToText, type RichDocument } from '@/lib/content/rich-document';
import { publicAsset, publicRecord, publicSetting, publicText, richDocumentHasContent, type PublicRecord } from '@/lib/public-content';
import { buildPageMetadata } from '@/lib/seo/metadata';
import { isSeoSchemaAllowed } from '@/lib/seo/policy';
import { buildAboutGraph } from '@/lib/seo/schema';
import '@/styles/site/about.css';

const PATH = '/ve-minh';
type Query = Record<string, string | string[] | undefined>;
type IconType = typeof Heart;

const HIGHLIGHT_ICONS: Record<string, IconType> = { heart: Heart, leaf: Leaf, zap: Zap, check: BadgeCheck, map: MapIcon, phone: Phone, users: Users };
const VALUE_ICONS: Record<string, IconType> = { check: BadgeCheck, message: MessageSquareText, shield: ShieldCheck, phone: Phone, heart: Heart, leaf: Leaf, map: MapIcon, house: House, users: Users };
const SERVICE_ICONS: Record<string, IconType> = { bed: BedDouble, pin: MapPin, leaf: Leaf, gear: Settings, compass: Compass, car: Car, ticket: Ticket, users: Users };

function rows(value: unknown): PublicRecord[] {
  return (Array.isArray(value) ? value : []).map(publicRecord).filter((item) => item.enabled !== false);
}

/** Only same-site paths; anything else is dropped rather than rendered as a broken link. */
function internalHref(value: unknown): string | null {
  const href = publicText(value);
  return href.startsWith('/') && !href.startsWith('//') ? href : null;
}

/** "https://facebook.com/van.vuive.9047" → "van.vuive.9047" for display. */
function socialHandle(url: string): string {
  try {
    const parts = new URL(url).pathname.split('/').filter(Boolean);
    if (parts[0] === 'profile.php') return new URL(url).searchParams.get('id') ?? url;
    return parts.at(-1) ?? url;
  } catch {
    return url;
  }
}

/**
 * Everything the page and its metadata need. Name, role and portrait come from
 * the advisor settings; email, phone, Zalo, Facebook and address from Liên hệ.
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
  const portrait = publicAsset(site, page.portraitMediaId) ?? publicAsset(site, panel.advisorImageMediaId) ?? publicAsset(site, panel.imageMediaId) ?? publicAsset(site, contactPage.advisorImageMediaId);
  return {
    page,
    enabled: page.enabled === true && !!title,
    title,
    name,
    role: publicText(panel.advisorRole) || publicText(contactPage.advisorRole),
    portrait,
    heroImage: publicAsset(site, page.heroImageMediaId) ?? portrait,
    ogImage: publicAsset(site, page.ogImageMediaId) ?? publicAsset(site, page.heroImageMediaId),
    phone: publicText(site.contact?.hotline) || publicText(site.contact?.phone),
    zaloUrl: publicText(site.contact?.zaloUrl),
    email: publicText(site.contact?.email),
    address: publicText(site.contact?.address),
    facebook: publicText(site.social?.facebook),
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

/** Hand-drawn leaf sprig used as page decoration. */
function Sprig({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 120 160" aria-hidden="true" focusable="false">
      <path d="M60 156C62 112 58 70 40 8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      {[[52, 120, -38], [56, 96, 32], [48, 74, -34], [50, 52, 28], [42, 30, -30]].map(([x, y, r], index) => (
        <path key={index} d="M0 0c10-14 30-16 40-4-12 10-28 12-40 4Z" transform={`translate(${x} ${y}) rotate(${r})`} fill="currentColor" opacity={0.85 - index * 0.08} />
      ))}
    </svg>
  );
}

/** Faint mountain line art in the corner of a value card. */
function Ridge() {
  return (
    <svg className="abt-value__ridge" viewBox="0 0 120 50" aria-hidden="true" focusable="false">
      <path d="M2 48 30 16l12 12 18-24 22 30 10-8 26 22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

function Photo({ image, alt, sizes, className, priority }: { image: PublicMediaAsset | null; alt: string; sizes: string; className: string; priority?: boolean }) {
  if (!image?.src) return null;
  return <Image src={image.src} alt={image.alt || alt} fill sizes={sizes} className={className} priority={priority} />;
}

export default async function AboutPage({ searchParams }: { searchParams: Promise<Query> }) {
  const [query, site, urls] = await Promise.all([searchParams, getPublicSite(), getPublicSeoUrls()]);
  const about = aboutContent(site);
  if (!about.enabled) notFound();
  const { page, name, role, phone, zaloUrl, email, address, facebook } = about;

  const primaryLabel = publicText(page.primaryCtaLabel);
  const primaryHref = internalHref(page.primaryCtaTarget) ?? '/phong-nghi';
  const contactLabel = publicText(page.contactCtaLabel);
  const heroScript = publicText(page.heroScript);
  const heroNote = publicText(page.heroNote);
  const highlights = rows(page.highlights).flatMap((item, index) => {
    const title = publicText(item.title);
    return title ? [{ id: publicText(item.id) || `highlight-${index}`, title, text: publicText(item.text), Icon: HIGHLIGHT_ICONS[publicText(item.icon)] ?? Heart }] : [];
  }).slice(0, 3);

  const storyTitle = publicText(page.storyTitle);
  const storyEyebrow = publicText(page.storyEyebrow);
  const showStory = !!(storyTitle && (richDocumentHasContent(page.story) || publicText(page.story)));
  const storyPhotos = rows(page.storyPhotos).map((item, index) => ({
    id: publicText(item.id) || `photo-${index}`,
    image: publicAsset(site, item.imageMediaId),
    caption: publicText(item.caption),
  })).slice(0, 2);
  // Without uploaded story photos the advisor portrait stands in, so the collage is never empty.
  if (!storyPhotos.some((photo) => photo.image) && about.portrait) {
    if (storyPhotos.length) storyPhotos[0] = { ...storyPhotos[0], image: about.portrait };
    else storyPhotos.push({ id: 'portrait', image: about.portrait, caption: '' });
  }

  const valuesTitle = publicText(page.valuesTitle);
  const values = rows(page.values).flatMap((item, index) => {
    const title = publicText(item.title);
    return title ? [{ id: publicText(item.id) || `value-${index}`, title, text: publicText(item.text), Icon: VALUE_ICONS[publicText(item.icon)] ?? BadgeCheck }] : [];
  });

  const servicesTitle = publicText(page.servicesTitle);
  const services = rows(page.services).flatMap((item, index) => {
    const title = publicText(item.title);
    return title ? [{ id: publicText(item.id) || `service-${index}`, title, text: publicText(item.text), href: internalHref(item.linkTarget), Icon: SERVICE_ICONS[publicText(item.icon)] ?? BedDouble }] : [];
  }).slice(0, 4);

  const faqTitle = publicText(page.faqTitle);
  const contactTitle = publicText(page.contactTitle);
  const contactImage = publicAsset(site, page.contactImageMediaId) ?? about.heroImage;
  const zaloLabel = publicText(page.contactZaloLabel) || publicText(page.zaloCtaLabel);
  const contactNote = publicText(page.contactNote);
  const contacts = [
    email ? { key: 'email', Icon: Mail, label: email, href: `mailto:${email}` } : null,
    facebook ? { key: 'facebook', brand: 'facebook' as const, label: socialHandle(facebook), href: facebook } : null,
    phone ? { key: 'phone', brand: 'zalo' as const, label: phone, href: zaloUrl || `tel:${phone.replace(/[^\d+]/g, '')}` } : null,
    address ? { key: 'address', Icon: MapPin, label: address, href: null } : null,
  ].filter((item): item is NonNullable<typeof item> => !!item);

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

      {/* ---------------------------------------------------------------- hero */}
      <section className="abt-hero" aria-labelledby="about-h1">
        <Sprig className="abt-sprig abt-sprig--hero" />
        <div className="abt-shell abt-hero__inner">
          <div className="abt-hero__copy">
            <Breadcrumb variant="plain" items={[{ label: 'Trang chủ', href: '/' }, { label: 'Về mình' }]} />
            <h1 id="about-h1" className="abt-hero__title">{about.title}</h1>
            <Rich value={page.intro} className="abt-hero__lead" />
            {(primaryLabel || contactLabel) && <div className="abt-hero__actions">
              {primaryLabel && <Link className="btn btn--primary btn--lg abt-btn" href={primaryHref}><BedDouble size={19} aria-hidden="true" />{primaryLabel}<ArrowRight size={17} aria-hidden="true" /></Link>}
              {contactLabel && <ChatCta className="btn btn--outline btn--lg abt-btn" href="/lien-he" draft="Mình cần tư vấn chuyến đi Cúc Phương."><MessageCircle size={19} aria-hidden="true" />{contactLabel}</ChatCta>}
            </div>}
            {highlights.length > 0 && <ul className="abt-highlights">
              {highlights.map(({ id, title, text, Icon }) => (
                <li key={id} className="abt-highlight">
                  <span className="abt-highlight__icon" aria-hidden="true"><Icon size={16} strokeWidth={2.2} /></span>
                  <span><strong>{title}</strong>{text && <small>{text}</small>}</span>
                </li>
              ))}
            </ul>}
          </div>
          <div className="abt-hero__media">
            {about.heroImage?.src
              ? <Photo image={about.heroImage} alt={name ? `${name} giữa rừng Cúc Phương` : 'Cúc Phương'} sizes="(max-width: 767px) 100vw, 56vw" className="abt-hero__img" priority />
              : <div className="abt-hero__placeholder"><AdvisorMonogram name={name || 'Cúc Phương'} idPrefix="abt" /></div>}
            {heroScript && <p className="abt-hero__script script" aria-hidden="true">{heroScript}<Leaf size={30} strokeWidth={1.4} /></p>}
            {heroNote && <figure className="abt-note">
              <blockquote className="script">“{heroNote}”</blockquote>
              {name && <figcaption className="script">— {name}</figcaption>}
            </figure>}
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------------- story */}
      {showStory && <section className="abt-story" aria-labelledby="abt-story-t">
        <Sprig className="abt-sprig abt-sprig--story" />
        <div className="abt-shell abt-story__inner">
          <div className={`abt-polaroids abt-polaroids--${Math.max(1, storyPhotos.length)}`}>
            {storyPhotos.length ? storyPhotos.map((photo, index) => (
              <figure key={photo.id} className="abt-polaroid">
                {index === 0 && <span className="abt-polaroid__tape" aria-hidden="true" />}
                <div className="abt-polaroid__frame">
                  {photo.image?.src
                    ? <Photo image={photo.image} alt={photo.caption || storyTitle} sizes="(max-width: 767px) 60vw, 240px" className="abt-polaroid__img" />
                    : <div className="abt-polaroid__empty" aria-hidden="true"><Leaf size={34} strokeWidth={1.4} /></div>}
                </div>
                {photo.caption && <figcaption className="script">{photo.caption}</figcaption>}
              </figure>
            )) : <figure className="abt-polaroid"><div className="abt-polaroid__frame"><div className="abt-polaroid__empty"><AdvisorMonogram name={name || 'Cúc Phương'} idPrefix="abt-story" /></div></div></figure>}
          </div>
          <div className="abt-story__body">
            {storyEyebrow && <p className="abt-eyebrow">{storyEyebrow}</p>}
            <h2 id="abt-story-t" className="abt-h2">{storyTitle}</h2>
            <Rich value={page.story} className="abt-story__text" />
          </div>
        </div>
      </section>}

      {/* -------------------------------------------------------------- values */}
      {valuesTitle && values.length > 0 && <section className="abt-values" aria-labelledby="abt-values-t">
        <div className="abt-shell">
          <div className="abt-head">
            <div>
              {publicText(page.valuesEyebrow) && <p className="abt-eyebrow">{publicText(page.valuesEyebrow)}</p>}
              <h2 id="abt-values-t" className="abt-h2">{valuesTitle}</h2>
            </div>
            {publicText(page.valuesIntro) && <p className="abt-head__intro">{publicText(page.valuesIntro)}</p>}
          </div>
          <ul className={`abt-values__grid abt-values__grid--${Math.min(values.length, 4)}`}>
            {values.map(({ id, title, text, Icon }, index) => (
              <li key={id} className={`abt-value abt-tone--${index % 3}`}>
                <Ridge />
                <h3><span className="abt-value__icon" aria-hidden="true"><Icon size={22} strokeWidth={1.9} /></span>{title}</h3>
                {text && <p>{text}</p>}
              </li>
            ))}
          </ul>
        </div>
      </section>}

      {/* ------------------------------------------------------------ services */}
      {servicesTitle && services.length > 0 && <section className="abt-services" aria-labelledby="abt-services-t">
        <div className="abt-shell">
          <div className="abt-head abt-head--inline">
            <h2 id="abt-services-t" className="abt-h2 abt-h2--caps">{servicesTitle}</h2>
            {publicText(page.servicesIntro) && <p className="abt-head__intro">{publicText(page.servicesIntro)}</p>}
          </div>
          <ul className={`abt-services__grid abt-services__grid--${services.length}`}>
            {services.map(({ id, title, text, href, Icon }, index) => {
              const body = (
                <>
                  <h3><span className={`abt-service__icon abt-tone--${[2, 1, 0, 2][index % 4]}`} aria-hidden="true"><Icon size={22} strokeWidth={1.9} /></span>{title}</h3>
                  {text && <p>{text}</p>}
                  {href && <span className="abt-service__arrow" aria-hidden="true"><ArrowRight size={15} /></span>}
                </>
              );
              return <li key={id}>{href ? <Link href={href} className="abt-service">{body}</Link> : <div className="abt-service">{body}</div>}</li>;
            })}
          </ul>
        </div>
      </section>}

      {/* ------------------------------------------------------ faq + contact */}
      {((faqTitle && about.faqs.length > 0) || contactTitle) && <section className="abt-bottom" aria-label="Câu hỏi thường gặp và liên hệ">
        <Sprig className="abt-sprig abt-sprig--bottom" />
        <div className={`abt-shell abt-bottom__inner${faqTitle && about.faqs.length && contactTitle ? '' : ' abt-bottom__inner--single'}`}>
          {faqTitle && about.faqs.length > 0 && <div className="abt-faq">
            <h2 className="abt-h2 abt-h2--caps">{faqTitle}</h2>
            {publicText(page.faqIntro) && <p className="abt-faq__intro">{publicText(page.faqIntro)}</p>}
            <div className="abt-faq__list">
              {about.faqs.map((item) => (
                <details key={item.id} className="abt-faq__item">
                  <summary>
                    <span className="abt-faq__icon" aria-hidden="true"><MessageCircle size={14} strokeWidth={2.4} /></span>
                    <h3>{item.question}</h3>
                    <span className="abt-faq__mark" aria-hidden="true" />
                  </summary>
                  <Rich value={item.answer} className="abt-faq__answer" />
                </details>
              ))}
            </div>
          </div>}

          {contactTitle && <div className="abt-contact">
            <Photo image={contactImage} alt="" sizes="(max-width: 767px) 100vw, 640px" className="abt-contact__bg" />
            <div className="abt-contact__card">
              <div className="abt-contact__main">
                {publicText(page.contactEyebrow) && <p className="abt-eyebrow">{publicText(page.contactEyebrow)}</p>}
                <h2 className="abt-contact__title">{contactTitle}</h2>
                {publicText(page.contactText) && <p className="abt-contact__text">{publicText(page.contactText)}</p>}
                {contacts.length > 0 && <ul className="abt-contact__list">
                  {contacts.map((item) => {
                    const icon = 'brand' in item && item.brand
                      ? <BrandIcon name={item.brand} size={16} />
                      : 'Icon' in item && item.Icon ? <item.Icon size={16} aria-hidden="true" /> : null;
                    return (
                      <li key={item.key}>
                        <span className={`abt-contact__ic abt-contact__ic--${item.key}`}>{icon}</span>
                        {item.href ? <a href={item.href} {...(item.href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{item.label}</a> : <span>{item.label}</span>}
                      </li>
                    );
                  })}
                </ul>}
              </div>
              <div className="abt-contact__side">
                {zaloUrl && zaloLabel
                  ? <a className="btn btn--primary abt-btn abt-contact__cta" href={zaloUrl} target="_blank" rel="noopener noreferrer"><BrandIcon name="zalo" size={18} />{zaloLabel}<ArrowRight size={16} aria-hidden="true" /></a>
                  : contactLabel && <ChatCta className="btn btn--primary abt-btn abt-contact__cta" href="/lien-he"><MessageCircle size={18} aria-hidden="true" />{contactLabel}</ChatCta>}
                {contactNote && <p className="abt-contact__note">{contactNote}</p>}
              </div>
            </div>
          </div>}
        </div>
      </section>}
    </PageShell>
  );
}

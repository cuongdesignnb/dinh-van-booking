import type { Metadata } from 'next';
import Image from '@/components/ui/ManagedImage';
import { ConsultationForm } from '@/components/contact/ConsultationForm';
import { PageShell } from '@/components/layout/PageShell';
import { PageHero } from '@/components/site/PageHero';
import { FaqList } from '@/components/shared/FaqList';
import { RichContentRenderer } from '@/components/content/RichContentRenderer';
import { getPublicCombo, getPublicDestination, getPublicSeoUrls, getPublicSite, getPublicStay } from '@/lib/api/public';
import { readParam } from '@/lib/selection';
import type { ConsultationContext } from '@/lib/services/consultation';
import { buildPageMetadata } from '@/lib/seo/metadata';
import { publicAsset, publicRecord, publicSetting, publicText, richDocumentHasContent } from '@/lib/public-content';
import type { RichDocument } from '@/lib/content/rich-document';
import '@/styles/contact.css';

export async function generateMetadata({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }): Promise<Metadata> {
  const [query, site, urls] = await Promise.all([searchParams, getPublicSite(), getPublicSeoUrls()]);
  const page = publicSetting(site, 'contact.page');
  const contentExists = page.enabled === true && publicText(page.title) !== '';
  return buildPageMetadata({ path: '/lien-he', eligible: contentExists && urls.some((entry) => entry.path === '/lien-he'), searchParams: query });
}

type ContactQuery = Record<string, string | string[] | undefined>;

async function resolveContactContext(query: ContactQuery): Promise<{ context: ConsultationContext | null; warning: string | null }> {
  const intent = readParam(query, 'intent');
  const item = readParam(query, 'item');
  if (intent !== 'stay' && intent !== 'combo' && intent !== 'destination') return { context: null, warning: null };
  if (!item) {
    const label = intent === 'stay' ? 'Chọn phòng nghỉ phù hợp' : intent === 'combo' ? 'Combo du lịch' : 'Điểm đến';
    return { context: { intent, id: '', label }, warning: null };
  }
  if (item.length > 160) return { context: null, warning: 'Mục quan tâm không còn khả dụng. Bạn vẫn có thể gửi yêu cầu tư vấn chung.' };
  if (intent === 'stay') {
    const stay = await getPublicStay(item);
    if (!stay) return { context: null, warning: 'Nơi lưu trú không còn công khai. Bạn vẫn có thể gửi yêu cầu tư vấn chung.' };
    const requestedRoom = readParam(query, 'room');
    const room = stay.roomTypes.find((entry) => entry.id === requestedRoom);
    return {
      context: { intent, id: stay.slug, label: stay.name, roomTypeId: room?.id, roomLabel: room?.name },
      warning: requestedRoom && !room ? 'Hạng phòng đã chọn không còn khả dụng. Yêu cầu này sẽ gửi cho nơi lưu trú, không gắn với hạng cũ.' : null,
    };
  }
  if (intent === 'combo') {
    const combo = await getPublicCombo(item);
    return combo
      ? { context: { intent, id: combo.slug, label: combo.title }, warning: null }
      : { context: null, warning: 'Combo không còn công khai. Bạn vẫn có thể gửi yêu cầu tư vấn chung.' };
  }
  const destination = await getPublicDestination(item);
  return destination
    ? { context: { intent, id: destination.slug, label: destination.name }, warning: null }
    : { context: null, warning: 'Điểm đến không còn công khai. Bạn vẫn có thể gửi yêu cầu tư vấn chung.' };
}

export default async function ContactPage({ searchParams }: { searchParams: Promise<ContactQuery> }) {
  const query = await searchParams;
  const [site, { context, warning }] = await Promise.all([getPublicSite(), resolveContactContext(query)]);
  const page = publicSetting(site, 'contact.page');
  const heroImage = publicAsset(site, page.heroImageMediaId);
  const advisorImage = publicAsset(site, page.advisorImageMediaId);
  const mapImage = publicAsset(site, page.mapImageMediaId);
  const scenicImage = publicAsset(site, page.scenicImageMediaId);
  const promises = (Array.isArray(page.promises) ? page.promises : []).flatMap((value, index) => {
    const item = publicRecord(value);
    const title = publicText(item.title);
    const description = publicText(item.description);
    return item.enabled === false || !title ? [] : [{ id: publicText(item.id) || `promise-${index}`, title, description }];
  });
  const highlights = (Array.isArray(page.advisorHighlights) ? page.advisorHighlights : []).flatMap((value) => {
    const item = publicRecord(value);
    const text = publicText(item.text);
    return item.enabled === false || !text ? [] : [text];
  });
  const faqs = (Array.isArray(page.faqs) ? page.faqs : []).flatMap((value, index) => {
    const item = publicRecord(value);
    const question = publicText(item.question);
    const answer = typeof item.answer === 'string' ? item.answer.trim() : item.answer;
    const hasAnswer = typeof answer === 'string' ? !!answer : richDocumentHasContent(answer);
    return item.enabled === false || !question || !hasAnswer
      ? []
      : [{ id: publicText(item.id) || `contact-faq-${index}`, question, answer: answer as string | RichDocument }];
  });
  const phone = publicText(site.contact.phone);
  const hotline = publicText(site.contact.hotline);
  const email = publicText(site.contact.email);
  const address = publicText(site.contact.address);
  const mapUrl = publicText(site.contact.mapUrl);
  const zaloUrl = publicText(site.contact.zaloUrl);
  const social = publicRecord(site.social);
  const title = publicText(page.title);
  const quickTitle = publicText(page.quickTitle);
  const advisorName = publicText(page.advisorName);
  const advisorRole = publicText(page.advisorRole);
  const mapTitle = publicText(page.mapTitle);
  const faqTitle = publicText(page.faqTitle);
  const businessHours = publicRecord(site.businessHours);
  const weekdays = publicText(businessHours.weekdays);
  const weekend = publicText(businessHours.weekend);
  const hoursNote = businessHours.note;
  const hoursTitle = publicText(page.hoursTitle);
  const showHours = !!(hoursTitle || weekdays || weekend || richDocumentHasContent(hoursNote));
  const showQuick = !!(quickTitle || richDocumentHasContent(page.quickIntro) || phone || hotline || email || address || zaloUrl);
  const showAdvisor = !!(advisorName || advisorRole || richDocumentHasContent(page.advisorDescription) || advisorImage);
  const showMap = !!(mapTitle || richDocumentHasContent(page.mapDescription) || mapImage || mapUrl);
  const showAside = showQuick || showAdvisor || showMap;

  return (
    <PageShell className="page-contact">
      {title && <>
        <PageHero id="contact-h1" title={title} eyebrow={publicText(page.heroEyebrow)} lead={page.intro} image={heroImage} crumbs={[{ label: 'Trang chủ', href: '/' }, { label: 'Liên hệ' }]} />

        {promises.length > 0 && <ul className="contact-promises content-shell">{promises.map((item) => <li key={item.id}><strong>{item.title}</strong>{item.description && <span>{item.description}</span>}</li>)}</ul>}
      </>}

      <div className={`contact-layout content-shell${showAside ? '' : ' contact-layout--form-only'}`}>
        <div className="contact-layout__form">
          <ConsultationForm key={JSON.stringify(query)} initialContext={context} contextWarning={warning} />
        </div>
        {showAside && <aside className="contact-layout__aside">
          {showQuick && <section className="contact-quick">
            {quickTitle && <h2>{quickTitle}</h2>}
            {richDocumentHasContent(page.quickIntro) && <RichContentRenderer document={page.quickIntro as RichDocument} />}
            <ul>
              {phone && <li><a href={`tel:${phone}`}>{phone}</a></li>}
              {hotline && hotline !== phone && <li><a href={`tel:${hotline}`}>{hotline}</a></li>}
              {email && <li><a href={`mailto:${email}`}>{email}</a></li>}
              {address && <li>{mapUrl ? <a href={mapUrl} target="_blank" rel="noopener noreferrer">{address}</a> : address}</li>}
              {zaloUrl && <li><a href={zaloUrl} target="_blank" rel="noopener noreferrer">Zalo</a></li>}
            </ul>
          </section>}

          {showHours && <section className="contact-hours">
            {hoursTitle && <h2>{hoursTitle}</h2>}
            {(weekdays || weekend) && <dl>
              {weekdays && <div><dt>Ngày thường</dt><dd>{weekdays}</dd></div>}
              {weekend && <div><dt>Cuối tuần</dt><dd>{weekend}</dd></div>}
            </dl>}
            {richDocumentHasContent(hoursNote) && <RichContentRenderer document={hoursNote as RichDocument} />}
          </section>}

          {showAdvisor && <section className="contact-advisor">
            {advisorImage?.src && <Image src={advisorImage.src} alt={advisorImage.alt ?? ''} width={advisorImage.width ?? 600} height={advisorImage.height ?? 400} className="contact-advisor__image" unoptimized />}
            {(advisorName || advisorRole) && <h2>{[advisorName, advisorRole].filter(Boolean).join(' — ')}</h2>}
            {richDocumentHasContent(page.advisorDescription) && <RichContentRenderer document={page.advisorDescription as RichDocument} />}
            {highlights.length > 0 && <ul>{highlights.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul>}
            {richDocumentHasContent(page.advisorNote) && <RichContentRenderer document={page.advisorNote as RichDocument} />}
          </section>}

          {showMap && <section className="contact-map">
            {mapTitle && <h2>{mapTitle}</h2>}
            {richDocumentHasContent(page.mapDescription) && <RichContentRenderer document={page.mapDescription as RichDocument} />}
            {mapImage?.src && <figure><Image src={mapImage.src} alt={mapImage.alt ?? ''} width={mapImage.width ?? 1200} height={mapImage.height ?? 800} unoptimized /><figcaption>Ảnh minh họa</figcaption></figure>}
            {address && <p>{address}</p>}
            {mapUrl && <a href={mapUrl} target="_blank" rel="noopener noreferrer">Mở bản đồ</a>}
          </section>}
        </aside>}
      </div>

      {scenicImage?.src && <figure className="contact-scenic content-shell"><Image src={scenicImage.src} alt={scenicImage.alt ?? ''} width={scenicImage.width ?? 1200} height={scenicImage.height ?? 800} unoptimized /></figure>}
      {page.showFaq === true && faqTitle && faqs.length > 0 && <section className="contact-faq content-shell"><h2 className="section-title">{faqTitle}</h2><FaqList items={faqs} variant="boxed" /></section>}
      {richDocumentHasContent(page.scriptNote) && <div className="contact-script content-shell"><RichContentRenderer document={page.scriptNote as RichDocument} /></div>}
      {Object.values(social).some((value) => typeof value === 'string' && value.trim()) && <nav className="contact-social content-shell" aria-label="Mạng xã hội">{Object.entries(social).filter(([, value]) => typeof value === 'string' && value.trim()).map(([key, value]) => <a key={key} href={value as string} target="_blank" rel="noopener noreferrer">{key}</a>)}</nav>}
    </PageShell>
  );
}

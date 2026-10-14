import {
  ArrowRight,
  Clock3,
  Coffee,
  ExternalLink,
  Info,
  Leaf,
  MapPin,
  Mountain,
  ScrollText,
  Sprout,
  Star,
} from 'lucide-react';
import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { Suspense } from 'react';
import { PageShell } from '@/components/layout/PageShell';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { RichContentRenderer } from '@/components/content/RichContentRenderer';
import { BookingCard, MobileBookingBar, ROOMS_ANCHOR } from '@/components/stay-detail/BookingCard';
import { BookingProvider } from '@/components/stay-detail/BookingContext';
import { HostCard, ReviewCards, ShareSave } from '@/components/stay-detail/DetailWidgets';
import { PropertyGallery } from '@/components/stay-detail/PropertyGallery';
import { RoomTypes } from '@/components/stay-detail/RoomTypes';
import { AdvisorBand, SectionTabs } from '@/components/stay-detail/StayPageParts';
import { amenityIcon, highlightIcon } from '@/components/stay-detail/amenityIcons';
import { getPublicReviews, getPublicSite, getPublicStay } from '@/lib/api/public';
import { STAY_TYPES } from '@/lib/catalog/constants';
import { stayContactHref } from '@/lib/contact/stay-contact';
import { JsonLd } from '@/components/seo/JsonLd';
import { isSubstantivePublicContent } from '@/lib/seo/content';
import { buildPageMetadata } from '@/lib/seo/metadata';
import { isSeoSchemaAllowed } from '@/lib/seo/policy';
import { buildStayGraph } from '@/lib/seo/schema';
import { formatRating } from '@/lib/format';
import type { RichDocument } from '@/lib/content/rich-document';
import { publicSetting, publicText, richDocumentHasContent } from '@/lib/public-content';
import '@/styles/stay-detail.css';
import '@/styles/stay-page.css';

type Params = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params, searchParams }: Params): Promise<Metadata> {
  const [{ slug }, query] = await Promise.all([params, searchParams ?? Promise.resolve({})]);
  const stay = await getPublicStay(slug);
  if (!stay) return { title: 'Không tìm thấy chỗ nghỉ' };
  return buildPageMetadata({
    path: stay.publicPath ?? `/phong-nghi/${slug}`,
    title: stay.metaTitle ?? stay.name,
    description: stay.metaDescription ?? stay.tagline ?? stay.description,
    image: stay.image,
    noindex: stay.noindex,
    eligible: !!stay.image && stay.roomTypes.length > 0 && isSubstantivePublicContent(stay.descriptionDocument ?? stay.description),
    searchParams: query,
  });
}

const HIGHLIGHT_ICONS = [Mountain, Sprout, Coffee, Leaf];
const AREA_LABELS: Record<string, string> = { 'cuc-phuong': 'Cúc Phương', 'trang-an': 'Tràng An' };

export default async function StayDetailPage({ params, searchParams }: Params) {
  // Reading the query makes this route render per request, so the selection
  // (dates/guests/room) is server-rendered instead of bailing out to the client.
  const [{ slug }, query] = await Promise.all([params, searchParams ?? Promise.resolve({})]);
  const stay = await getPublicStay(slug);
  if (!stay) notFound();
  if (stay.publicPath && stay.publicPath !== `/phong-nghi/${slug}`) permanentRedirect(stay.publicPath);
  const [reviews, site] = await Promise.all([getPublicReviews(stay.id), getPublicSite()]);
  const structuredData = isSeoSchemaAllowed(site, stay.publicPath ?? `/phong-nghi/${slug}`, {
    eligible: !!stay.image && stay.roomTypes.length > 0 && isSubstantivePublicContent(stay.descriptionDocument ?? stay.description),
    noindex: stay.noindex,
    searchParams: query,
  }) ? buildStayGraph(site, stay, stay.publicPath ?? `/phong-nghi/${slug}`, {
    // Check-in/out times only when the facts card actually shows them.
    checkInTime: publicText(publicSetting(site, 'catalog.stayDetail').checkInLabel) ? stay.checkInTime : null,
    checkOutTime: publicText(publicSetting(site, 'catalog.stayDetail').checkOutLabel) ? stay.checkOutTime : null,
  }) : null;
  const detail = publicSetting(site, 'catalog.stayDetail');
  const introTitle = publicText(detail.introTitle);
  const quoteAuthor = publicText(detail.introQuoteAuthor);
  const factsTitle = publicText(detail.factsTitle);
  const checkInLabel = publicText(detail.checkInLabel);
  const checkOutLabel = publicText(detail.checkOutLabel);
  const breakfastLabel = publicText(detail.breakfastLabel);
  const breakfastValue = stay.roomTypes.every((room) => room.breakfastIncluded)
    ? 'Có'
    : stay.roomTypes.some((room) => room.breakfastIncluded) ? 'Tùy theo hạng phòng' : 'Không';

  const typeLabel = STAY_TYPES.find((type) => type.id === stay.type)?.label;
  const kicker = [typeLabel, AREA_LABELS[stay.area]].filter(Boolean).join(' · ');
  const amenityItems = stay.amenities
    .map((code) => ({ code, label: stay.amenityLabels?.[code] ?? code }))
    .filter((item) => item.label);
  // Owner highlights first; otherwise the first amenities give the overview its icon row.
  const overviewIcons = stay.highlights.length
    ? stay.highlights.slice(0, 4).map((label, i) => ({ key: label, label, Icon: highlightIcon(label) ?? HIGHLIGHT_ICONS[i % HIGHLIGHT_ICONS.length] }))
    : amenityItems.slice(0, 4).map((item) => ({ key: item.code, label: item.label, Icon: amenityIcon(item.code) }));
  // Times are system defaults until the Owner names them, so they only show with a label.
  const timeLines = [
    checkInLabel && stay.checkInTime ? `${checkInLabel}: từ ${stay.checkInTime}` : '',
    checkOutLabel && stay.checkOutTime ? `${checkOutLabel}: trước ${stay.checkOutTime}` : '',
  ].filter(Boolean);
  const infoCards = [
    timeLines.length ? { key: 'times', Icon: Clock3, title: [checkInLabel, checkOutLabel].filter(Boolean).join(' & '), lines: timeLines } : null,
    breakfastLabel ? { key: 'breakfast', Icon: Coffee, title: breakfastLabel, lines: [breakfastValue] } : null,
    stay.notes?.length ? { key: 'notes', Icon: Info, title: publicText(detail.notesTitle) || 'Lưu ý', lines: stay.notes } : null,
    stay.houseRules?.length ? { key: 'rules', Icon: ScrollText, title: publicText(detail.houseRulesTitle) || 'Nội quy', lines: stay.houseRules.map((rule) => rule.text) } : null,
  ].filter((card): card is NonNullable<typeof card> => !!card);
  const mapQuery = encodeURIComponent(`${stay.name}, ${stay.address}`);
  const tabs = [
    { id: 'tong-quan', label: 'Tổng quan' },
    stay.roomTypes.length ? { id: ROOMS_ANCHOR, label: 'Hạng phòng' } : null,
    amenityItems.length ? { id: 'tien-nghi', label: 'Tiện nghi' } : null,
    infoCards.length ? { id: 'chinh-sach', label: 'Chính sách' } : null,
    stay.address ? { id: 'vi-tri', label: 'Vị trí' } : null,
  ].filter((tab): tab is { id: string; label: string } => !!tab);

  const content = (
    <>
      <div className="detail-shell detail-crumbs">
        <Breadcrumb
          variant="plain"
          home
          items={[
            { label: 'Trang chủ', href: '/' },
            { label: 'Phòng nghỉ', href: '/phong-nghi' },
            { label: stay.name },
          ]}
        />
      </div>

      <div className="detail-shell stp">
        <header className="detail-head stp-head">
          <div className="stp-head__main">
            {kicker && <p className="stp-kicker">{kicker}</p>}
            <h1 className="stp-title">{stay.name}</h1>
            <p className="stp-head__meta">
              <span>
                <MapPin size={16} aria-hidden="true" /> {stay.location || stay.address}
              </span>
              {stay.address && (
                <a href="#vi-tri" className="stp-head__map">
                  Xem bản đồ <ArrowRight size={14} aria-hidden="true" />
                </a>
              )}
              {stay.reviewCount > 0 && (
                <span className="stp-head__rating">
                  <Star size={16} className="star" aria-hidden="true" />
                  <strong>{formatRating(stay.rating)}</strong> ({stay.reviewCount} đánh giá)
                </span>
              )}
            </p>
          </div>
          <ShareSave id={stay.id} name={stay.name} />
        </header>

        <div className="detail-top__gallery stp-gallery">
          <PropertyGallery images={stay.gallery} note={stay.galleryNote} name={stay.name} />
        </div>

        <SectionTabs items={tabs} />

        <div className="stp-grid">
          <div className="detail-top__info stp-main">
            <section className="stp-section" id="tong-quan" aria-labelledby="intro-t">
              <h2 className="stp-h2" id="intro-t">{introTitle || 'Tổng quan'}</h2>
              {stay.descriptionDocument
                ? <RichContentRenderer document={stay.descriptionDocument} className="stp-lead stp-intro" />
                : <p className="stp-lead stp-intro">{stay.description}</p>}
              {richDocumentHasContent(detail.introQuote) && (
                <figure className="intro__quote">
                  <blockquote><RichContentRenderer document={detail.introQuote as RichDocument} /></blockquote>
                  {quoteAuthor && <figcaption>{quoteAuthor}</figcaption>}
                </figure>
              )}
              {overviewIcons.length > 0 && (
                <ul className="stp-icons">
                  {overviewIcons.map(({ key, label, Icon }) => (
                    <li key={key}>
                      <Icon size={30} strokeWidth={1.5} aria-hidden="true" />
                      <span>{label}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {stay.roomTypes.length > 0 && (
              <RoomTypes title={publicText(detail.roomsTitle)} subtitle="Chọn ngày lưu trú để xem thông tin phòng phù hợp cho chuyến đi của bạn." />
            )}
          </div>

          <aside className="detail-top__book stp-aside" aria-label="Đặt phòng">
            <BookingCard />
            {stay.host && <div className="detail-top__host"><HostCard host={stay.host} /></div>}
          </aside>
        </div>

        {amenityItems.length > 0 && (
          <section className="stp-section stp-panel" id="tien-nghi" aria-labelledby="amen-t">
            <h2 className="stp-h2" id="amen-t">{publicText(detail.amenitiesTitle) || 'Tiện nghi & trải nghiệm'}</h2>
            <ul className="stp-amen">
              {amenityItems.map((item) => {
                const Icon = amenityIcon(item.code);
                return (
                  <li key={item.code}>
                    <Icon size={30} strokeWidth={1.5} aria-hidden="true" />
                    <span>{item.label}</span>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {infoCards.length > 0 && (
          <section className="stp-section" id="chinh-sach" aria-labelledby="facts-t">
            <h2 className="stp-h2" id="facts-t">{factsTitle || 'Thông tin cần biết'}</h2>
            <ul className="stp-info">
              {infoCards.map(({ key, Icon, title, lines }) => (
                <li key={key} className="stp-info__card">
                  <span className="stp-info__ic" aria-hidden="true"><Icon size={26} strokeWidth={1.6} /></span>
                  <div>
                    <h3 className="stp-info__title">{title}</h3>
                    {lines.length === 1
                      ? <p className="stp-info__text">{lines[0]}</p>
                      : <ul className="stp-info__list">{lines.map((line) => <li key={line}>{line}</li>)}</ul>}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {stay.reviewCount > 0 && (
          <div className="stp-section">
            <ReviewCards reviews={reviews} total={stay.reviewCount} title={publicText(detail.reviewsTitle)} />
          </div>
        )}

        {stay.address && (
          <section className="stp-section" id="vi-tri" aria-labelledby="map-t">
            <h2 className="stp-h2" id="map-t">Vị trí</h2>
            <p className="stp-lead stp-address"><MapPin size={17} aria-hidden="true" /> {stay.address}</p>
            {stay.nearby.length > 0 && <ul className="stp-nearby">{stay.nearby.map((place) => <li key={place}>{place}</li>)}</ul>}
            <div className="stp-map">
              <iframe
                title={`Bản đồ khu vực ${stay.name}`}
                src={`https://maps.google.com/maps?q=${mapQuery}&z=13&output=embed`}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
              <a className="stp-map__open" href={`https://www.google.com/maps/search/?api=1&query=${mapQuery}`} target="_blank" rel="noopener noreferrer">
                Mở Google Maps <ExternalLink size={15} aria-hidden="true" />
              </a>
            </div>
          </section>
        )}

        <div className="stp-section stp-band-wrap">
          <AdvisorBand contactHref={stayContactHref(stay.slug)} />
        </div>
      </div>
      <MobileBookingBar />
    </>
  );

  return (
    <PageShell className="page-detail">
      <JsonLd data={structuredData} />
      <Suspense fallback={<div className="detail-shell detail-loading">Đang tải…</div>}>
        <BookingProvider stay={stay}>{content}</BookingProvider>
      </Suspense>
    </PageShell>
  );
}

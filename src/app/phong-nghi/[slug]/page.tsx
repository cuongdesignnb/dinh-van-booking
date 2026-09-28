import {
  CalendarCheck,
  Clock3,
  Coffee,
  Leaf,
  MapPin,
  Mountain,
  Sprout,
  Star,
} from 'lucide-react';
import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { Suspense } from 'react';
import { PageShell } from '@/components/layout/PageShell';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { RichContentRenderer } from '@/components/content/RichContentRenderer';
import { BookingCard, MobileBookingBar } from '@/components/stay-detail/BookingCard';
import { BookingProvider } from '@/components/stay-detail/BookingContext';
import { Amenities, HostCard, ReviewCards, ShareSave, SupportCard } from '@/components/stay-detail/DetailWidgets';
import { HouseRules, NotesPaper } from '@/components/stay-detail/InfoBlocks';
import { PropertyGallery } from '@/components/stay-detail/PropertyGallery';
import { RoomTypes } from '@/components/stay-detail/RoomTypes';
import { LeafSprig, SmallLeaf } from '@/components/ui/Decor';
import { getPublicReviews, getPublicSite, getPublicStay } from '@/lib/api/public';
import { JsonLd } from '@/components/seo/JsonLd';
import { isSubstantivePublicContent } from '@/lib/seo/content';
import { buildPageMetadata } from '@/lib/seo/metadata';
import { isSeoSchemaAllowed } from '@/lib/seo/policy';
import { buildStayGraph } from '@/lib/seo/schema';
import { formatRating } from '@/lib/format';
import type { RichDocument } from '@/lib/content/rich-document';
import { publicSetting, publicText, richDocumentHasContent } from '@/lib/public-content';
import '@/styles/stay-detail.css';

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
  }) ? buildStayGraph(site, stay, stay.publicPath ?? `/phong-nghi/${slug}`) : null;
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

      <div className="detail-top detail-shell">
        <header className="detail-head">
          {stay.badge && (
            <p className="detail-head__badge">
              <span className="detail-head__pill">
                <Leaf size={12} aria-hidden="true" fill="currentColor" /> {stay.badge}
              </span>
              <SmallLeaf className="detail-head__leaf" />
            </p>
          )}
          <h1 className="detail-head__title">{stay.name}</h1>
          <p className="detail-head__meta">
            <span>
              <MapPin size={16} aria-hidden="true" /> {stay.address}
            </span>
            {stay.reviewCount > 0 && <span className="detail-head__rating">
              <Star size={17} className="star" aria-hidden="true" />
              <strong>{formatRating(stay.rating)}</strong> ({stay.reviewCount} đánh giá)
            </span>}
          </p>
          <p className="detail-head__tagline">“{stay.tagline}”</p>
          <ul className="detail-head__hl">
            {stay.highlights.map((h, i) => {
              const Icon = HIGHLIGHT_ICONS[i % HIGHLIGHT_ICONS.length];
              return (
                <li key={h}>
                  <span aria-hidden="true">
                    <Icon size={16} />
                  </span>
                  {h}
                </li>
              );
            })}
          </ul>
          <ShareSave id={stay.id} name={stay.name} />
          <LeafSprig className="detail-head__sprig" />
        </header>

        <div className="detail-top__gallery">
          <PropertyGallery images={stay.gallery} note={stay.galleryNote} name={stay.name} />
        </div>

        <aside className="detail-top__book" aria-label="Đặt phòng">
          <BookingCard />
        </aside>

        {stay.host && <div className="detail-top__host"><HostCard host={stay.host} /></div>}

        <div className="detail-top__info">
          <section className="intro" aria-labelledby="intro-t">
            {introTitle && <h2 className="dsec-title" id="intro-t">{introTitle} <SmallLeaf className="section-title__leaf" /></h2>}
            {stay.descriptionDocument ? <RichContentRenderer document={stay.descriptionDocument} className="intro__text" /> : <p className="intro__text">{stay.description}</p>}
            {richDocumentHasContent(detail.introQuote) && <figure className="intro__quote"><blockquote><RichContentRenderer document={detail.introQuote as RichDocument} /></blockquote>{quoteAuthor && <figcaption>{quoteAuthor}</figcaption>}</figure>}
          </section>
            <Amenities amenities={stay.amenities} labels={stay.amenityLabels} title={publicText(detail.amenitiesTitle)} />
        </div>
      </div>

      <div className="detail-lower detail-shell">
        <div className="detail-lower__left">
          <RoomTypes title={publicText(detail.roomsTitle)} />
          <ReviewCards reviews={reviews} total={stay.reviewCount} title={publicText(detail.reviewsTitle)} />
        </div>
        <div className="detail-lower__right">
          <div className="facts-row">
            {(factsTitle || checkInLabel || checkOutLabel || breakfastLabel) && <section className="facts" aria-labelledby={factsTitle ? 'facts-t' : undefined} aria-label={factsTitle ? undefined : 'Thông tin lưu trú'}>
              {factsTitle && <h2 className="dsec-title" id="facts-t">{factsTitle} <SmallLeaf className="section-title__leaf" /></h2>}
              <ul className="facts__list">
                {checkInLabel && stay.checkInTime && <li><span className="facts__ic" aria-hidden="true"><Clock3 size={18} /></span><span><b>{checkInLabel}:</b> {stay.checkInTime}</span></li>}
                {checkOutLabel && stay.checkOutTime && <li><span className="facts__ic" aria-hidden="true"><CalendarCheck size={17} /></span><span><b>{checkOutLabel}:</b> {stay.checkOutTime}</span></li>}
                {breakfastLabel && <li><span className="facts__ic" aria-hidden="true"><Coffee size={17} /></span><span><b>{breakfastLabel}:</b> {breakfastValue}</span></li>}
              </ul>
            </section>}
            <NotesPaper notes={stay.notes ?? []} title={publicText(detail.notesTitle)} thanks={publicText(detail.notesThanks)} />
          </div>
          <div className="rules-row">
            <HouseRules rules={stay.houseRules ?? []} title={publicText(detail.houseRulesTitle)} />
            <SupportCard />
          </div>
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

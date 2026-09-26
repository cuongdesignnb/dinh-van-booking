import {
  ArrowRight,
  BadgeCheck,
  CalendarCheck,
  Clock3,
  Coffee,
  Compass,
  Leaf,
  MapPin,
  Mountain,
  Sprout,
  Star,
  UserRoundCheck,
} from 'lucide-react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
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
import type { Destination } from '@/data/destinations';
import '@/styles/stay-detail.css';

type Params = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params, searchParams }: Params): Promise<Metadata> {
  const [{ slug }, query] = await Promise.all([params, searchParams ?? Promise.resolve({})]);
  const stay = await getPublicStay(slug);
  if (!stay) return { title: 'Không tìm thấy chỗ nghỉ — Đinh Vân Booking' };
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
  const nearby: Destination[] = [];

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
        <p className="detail-demo">
          <BadgeCheck size={14} aria-hidden="true" /> Thông tin, giá và chính sách được đọc từ dữ liệu đã xuất bản.
        </p>
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
            <span className="detail-head__rating">
              <Star size={17} className="star" aria-hidden="true" />
              <strong>{formatRating(stay.rating)}</strong> ({stay.reviewCount} đánh giá)
            </span>
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
          <p className="detail-head__note handwritten" aria-hidden="true">
            Nơi mỗi chuyến đi
            <br /> đều là một câu chuyện
            <br /> đáng nhớ!
          </p>
          <LeafSprig className="detail-head__sprig" />
        </header>

        <div className="detail-top__gallery">
          <PropertyGallery images={stay.gallery} note={stay.galleryNote} name={stay.name} />
        </div>

        <aside className="detail-top__book" aria-label="Đặt phòng">
          <BookingCard />
        </aside>

        <div className="detail-top__host">
          {stay.host ? (
            <HostCard host={stay.host} />
          ) : (
            <section className="host host--none" aria-label="Chủ nhà">
              <p>Thông tin chủ nhà đang được cập nhật. Đinh Vân sẽ kết nối bạn khi cần.</p>
            </section>
          )}
        </div>

        <div className="detail-top__info">
          <section className="intro" aria-labelledby="intro-t">
            <h2 className="dsec-title" id="intro-t">
              Giới thiệu phòng nghỉ <SmallLeaf className="section-title__leaf" />
            </h2>
            {stay.descriptionDocument ? <RichContentRenderer document={stay.descriptionDocument} className="intro__text" /> : <p className="intro__text">{stay.description}</p>}
            <figure className="intro__quote">
              <blockquote>
                “Không chỉ là một nơi lưu trú, mà là nơi bạn tìm lại sự kết nối
                <br /> với thiên nhiên và chính mình.”
              </blockquote>
              <figcaption>Đinh Vân Booking</figcaption>
            </figure>
          </section>
            <Amenities amenities={stay.amenities} />
        </div>
      </div>

      <div className="detail-lower detail-shell">
        <div className="detail-lower__left">
          <RoomTypes />
          <ReviewCards reviews={reviews} total={stay.reviewCount} />
        </div>
        <div className="detail-lower__right">
          <div className="facts-row">
            <section className="facts" aria-labelledby="facts-t">
              <h2 className="dsec-title" id="facts-t">
                Lịch nhận phòng &amp; thông tin cần biết <SmallLeaf className="section-title__leaf" />
              </h2>
              <ul className="facts__list">
                <li className="facts__pair">
                  <span className="facts__ic" aria-hidden="true">
                    <Clock3 size={18} />
                  </span>
                  <span>
                    <b>Giờ nhận phòng:</b> Theo cấu hình nơi lưu trú
                  </span>
                  <span className="facts__ic" aria-hidden="true">
                    <CalendarCheck size={17} />
                  </span>
                  <span>
                    <b>Giờ trả phòng:</b> Theo cấu hình nơi lưu trú
                  </span>
                </li>
                <li>
                  <span className="facts__ic" aria-hidden="true">
                    <UserRoundCheck size={18} />
                  </span>
                  <span>
                    Thông tin nhận phòng sẽ được xác nhận sau khi đặt
                  </span>
                </li>
                <li>
                  <span className="facts__ic" aria-hidden="true">
                    <Coffee size={17} />
                  </span>
                  <span>
                    <b>Bữa sáng:</b> Theo loại phòng đã chọn
                  </span>
                </li>
                <li>
                  <span className="facts__ic" aria-hidden="true">
                    <Compass size={18} />
                  </span>
                  <span>Tiện ích và dịch vụ theo nội dung đã xuất bản</span>
                </li>
              </ul>
            </section>
            <NotesPaper notes={stay.notes ?? []} />
          </div>

          <section className="nearby" aria-labelledby="nearby-t">
            <div className="dsec-head">
              <h2 className="dsec-title" id="nearby-t">
                Địa điểm xung quanh <SmallLeaf className="section-title__leaf" />
              </h2>
              <Link href="/diem-den" className="link-more">
                Xem tất cả <span className="sr-only">điểm đến</span> <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </div>
            <ul className="nearby__list">
              {nearby.map((d) => {
                const img = d.nearbyImage ?? d.image;
                return (
                  <li key={d.id}>
                    <Link href={`/diem-den?d=${d.id}`} className="nearby__card">
                      <span className="nearby__media">
                        <Image src={img.src} alt={img.alt} fill sizes="(max-width: 767px) 45vw, 145px" />
                      </span>
                      <span className="nearby__name">{d.name}</span>
                      {d.fromStay && (
                        <span className="nearby__meta">
                          <span>
                            <MapPin size={11} aria-hidden="true" /> {d.fromStay.distance}
                          </span>
                          <span>
                            <Clock3 size={11} aria-hidden="true" /> {d.fromStay.time}
                          </span>
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>

          <div className="rules-row">
            <HouseRules rules={stay.houseRules ?? []} />
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

import { ArrowRight, Check, Info, MapPin } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { PropertyGallery } from '@/components/stay-detail/PropertyGallery';
import { notFound, permanentRedirect } from 'next/navigation';
import { RichContentRenderer } from '@/components/content/RichContentRenderer';
import { PageShell } from '@/components/layout/PageShell';
import { PageHero } from '@/components/site/PageHero';
import { JsonLd } from '@/components/seo/JsonLd';
import { getPublicDestination, getPublicSite } from '@/lib/api/public';
import { publicSetting, publicText } from '@/lib/public-content';
import { isSubstantivePublicContent } from '@/lib/seo/content';
import { buildPageMetadata } from '@/lib/seo/metadata';
import { isSeoSchemaAllowed } from '@/lib/seo/policy';
import { buildDestinationGraph } from '@/lib/seo/schema';
import '@/styles/site/detail.css';
import '@/styles/stay-detail.css';

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const destination = await getPublicDestination(slug);
  if (!destination) return { title: 'Không tìm thấy điểm đến' };
  return buildPageMetadata({
    path: destination.publicPath,
    title: destination.metaTitle ?? destination.name,
    description: destination.metaDescription ?? destination.summary,
    image: destination.image,
    noindex: destination.noindex,
    eligible: isSubstantivePublicContent(destination.body ?? destination.description),
    searchParams: query,
  });
}

export default async function DestinationDetailPage({ params, searchParams }: Props) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const destination = await getPublicDestination(slug);
  if (!destination) notFound();
  const canonicalPath = `/diem-den/${slug}`;
  if (destination.publicPath !== canonicalPath) permanentRedirect(destination.publicPath);
  const site = await getPublicSite();
  const contentLabels = publicSetting(site, 'catalog.destinationDetail');
  const eyebrow = publicText(contentLabels.eyebrow);
  const activitiesTitle = publicText(contentLabels.activitiesTitle);
  const notesTitle = publicText(contentLabels.notesTitle);
  const gallery = destination.gallery?.length ? destination.gallery : [];

  return (
    <PageShell className="page-detail">
      <PageHero id="dest-detail-h1" title={destination.name} eyebrow={eyebrow} lead={destination.summary} image={destination.image}
        crumbs={[{ label: 'Trang chủ', href: '/' }, { label: 'Cẩm nang', href: '/diem-den' }, { label: destination.name }]} />

      <div className="cp-detail cp-shell">
        <div className="cp-detail__main">
          <section className="cp-detail__card" aria-labelledby="dest-intro">
            <h2 id="dest-intro">Giới thiệu</h2>
            {destination.body
              ? <RichContentRenderer document={destination.body} className="cp-detail__body" />
              : destination.description && <p className="cp-detail__body">{destination.description}</p>}
          </section>

          {gallery.length > 1 && <section className="cp-detail__card cp-detail__gallery" aria-label="Thư viện ảnh">
            <PropertyGallery images={gallery} name={destination.name} />
          </section>}

          {destination.activities.length > 0 && activitiesTitle && <section className="cp-detail__card" aria-labelledby="dest-activities">
            <h2 id="dest-activities">{activitiesTitle}</h2>
            <ul className="cp-checklist cp-checklist--grid">{destination.activities.map((item) => <li key={item}><Check size={17} aria-hidden="true" />{item}</li>)}</ul>
          </section>}
        </div>

        <aside className="cp-detail__aside">
          <div className="cp-offer">
            <h2 className="cp-offer__title">Lên kế hoạch ghé thăm</h2>
            {destination.subtitle && <p className="cp-offer__loc"><MapPin size={17} aria-hidden="true" /> {destination.subtitle}</p>}
            {destination.notes.length > 0 && notesTitle && <div className="cp-offer__notes">
              <h3>{notesTitle}</h3>
              <ul className="cp-checklist cp-checklist--muted">{destination.notes.map((item) => <li key={item}><Info size={16} aria-hidden="true" />{item}</li>)}</ul>
            </div>}
            <Link className="btn btn--primary btn--lg cp-offer__cta" href="/phong-nghi">Tìm lưu trú gần đây <ArrowRight size={18} aria-hidden="true" /></Link>
            <Link className="btn btn--outline cp-offer__cta" href="/lien-he">Nhờ tư vấn lịch trình</Link>
          </div>
        </aside>
      </div>
      <JsonLd data={isSeoSchemaAllowed(site, destination.publicPath, {
        eligible: isSubstantivePublicContent(destination.body ?? destination.description),
        noindex: destination.noindex,
        searchParams: query,
      }) ? buildDestinationGraph(site, destination, destination.publicPath) : null} />
    </PageShell>
  );
}

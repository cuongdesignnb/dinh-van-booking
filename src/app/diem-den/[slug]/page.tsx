import type { Metadata } from 'next';
import { PropertyGallery } from '@/components/stay-detail/PropertyGallery';
import { notFound, permanentRedirect } from 'next/navigation';
import { RichContentRenderer } from '@/components/content/RichContentRenderer';
import { PageShell } from '@/components/layout/PageShell';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { JsonLd } from '@/components/seo/JsonLd';
import { getPublicDestination, getPublicSite } from '@/lib/api/public';
import { publicSetting, publicText } from '@/lib/public-content';
import { isSubstantivePublicContent } from '@/lib/seo/content';
import { buildPageMetadata } from '@/lib/seo/metadata';
import { isSeoSchemaAllowed } from '@/lib/seo/policy';
import { buildDestinationGraph } from '@/lib/seo/schema';
import '@/styles/static-pages.css';
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
  return (
    <PageShell className="page-static-content">
      <section className="static-page">
        <Breadcrumb items={[{ label: 'Trang chủ', href: '/' }, { label: 'Điểm đến', href: '/diem-den' }, { label: destination.name }]} />
        <article className="static-page__article">
          <header className="static-page__header">
            {eyebrow && <p className="static-page__eyebrow">{eyebrow}</p>}
            <h1>{destination.name}</h1>
            {destination.subtitle && <p className="static-page__excerpt">{destination.subtitle}</p>}
            {destination.summary && <p className="static-page__lead">{destination.summary}</p>}
          </header>
          <div className="static-page__gallery"><PropertyGallery images={destination.gallery?.length ? destination.gallery : [destination.image]} name={destination.name} /></div>
          {destination.body
            ? <RichContentRenderer document={destination.body} className="static-page__body" />
            : <p className="static-page__body">{destination.description}</p>}
          {destination.activities.length > 0 && activitiesTitle && <section className="static-page__section">
            <h2>{activitiesTitle}</h2>
            <ul>{destination.activities.map((item) => <li key={item}>{item}</li>)}</ul>
          </section>}
          {destination.notes.length > 0 && notesTitle && <section className="static-page__section">
            <h2>{notesTitle}</h2>
            <ul>{destination.notes.map((item) => <li key={item}>{item}</li>)}</ul>
          </section>}
        </article>
      </section>
      <JsonLd data={isSeoSchemaAllowed(site, destination.publicPath, {
        eligible: isSubstantivePublicContent(destination.body ?? destination.description),
        noindex: destination.noindex,
        searchParams: query,
      }) ? buildDestinationGraph(site, destination, destination.publicPath) : null} />
    </PageShell>
  );
}

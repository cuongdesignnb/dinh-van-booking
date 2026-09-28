import type { Metadata } from 'next';
import Image from '@/components/ui/ManagedImage';
import { notFound, permanentRedirect } from 'next/navigation';
import { RichContentRenderer } from '@/components/content/RichContentRenderer';
import { PageShell } from '@/components/layout/PageShell';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { JsonLd } from '@/components/seo/JsonLd';
import { getPublicPage, getPublicSite } from '@/lib/api/public';
import { isSubstantivePublicContent } from '@/lib/seo/content';
import { buildPageMetadata } from '@/lib/seo/metadata';
import { buildSiteGraph } from '@/lib/seo/schema';
import { isSeoSchemaAllowed } from '@/lib/seo/policy';
import '@/styles/static-pages.css';

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const page = await getPublicPage(slug);
  if (!page) return { title: 'Không tìm thấy trang' };
  return buildPageMetadata({
    path: page.path,
    title: page.metaTitle ?? page.title,
    description: page.metaDescription ?? page.excerpt,
    image: page.cover,
    noindex: page.noindex,
    eligible: !!page.cover && isSubstantivePublicContent(page.body),
    type: 'article',
    publishedTime: page.firstPublishedAt,
    modifiedTime: page.lastPublicChangedAt,
    searchParams: query,
  });
}

export default async function StandaloneContentPage({ params, searchParams }: Props) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const page = await getPublicPage(slug);
  if (!page) notFound();
  if (page.path !== `/${slug}`) permanentRedirect(page.path);
  const site = await getPublicSite();
  return (
    <PageShell className="page-static-content">
      <section className="static-page">
        <Breadcrumb items={[{ label: 'Trang chủ', href: '/' }, { label: page.title }]} />
        <article className="static-page__article">
          <header className="static-page__header">
            <p className="static-page__eyebrow">Chuyên trang</p>
            <h1>{page.title}</h1>
            {page.excerpt && <p className="static-page__excerpt">{page.excerpt}</p>}
            {page.lastPublicChangedAt && <time dateTime={page.lastPublicChangedAt}>Cập nhật {new Date(page.lastPublicChangedAt).toLocaleDateString('vi-VN')}</time>}
          </header>
          {page.cover && <figure className="static-page__cover"><Image src={page.cover.src} alt={page.cover.alt} width={page.cover.width} height={page.cover.height} unoptimized priority /></figure>}
          <RichContentRenderer document={page.body} className="static-page__body" />
        </article>
      </section>
      <JsonLd data={isSeoSchemaAllowed(site, page.path, {
        eligible: !!page.cover && isSubstantivePublicContent(page.body),
        noindex: page.noindex,
        searchParams: query,
      }) ? buildSiteGraph(site, {
        path: page.path,
        title: page.metaTitle ?? page.title,
        description: page.metaDescription ?? page.excerpt,
        breadcrumbs: [{ label: 'Trang chủ', href: '/' }, { label: page.title }],
      }) : null} />
    </PageShell>
  );
}

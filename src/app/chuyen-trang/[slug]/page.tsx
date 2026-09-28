import type { Metadata } from 'next';
import Image from '@/components/ui/ManagedImage';
import { notFound, permanentRedirect } from 'next/navigation';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { RichContentRenderer } from '@/components/content/RichContentRenderer';
import { PageShell } from '@/components/layout/PageShell';
import { getPublicPage } from '@/lib/api/public';
import { isSubstantivePublicContent } from '@/lib/seo/content';
import { buildPageMetadata } from '@/lib/seo/metadata';
import '@/styles/static-pages.css';

type RouteProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params, searchParams }: RouteProps): Promise<Metadata> {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const page = await getPublicPage(slug);
  if (!page) return {};
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

export default async function StaticContentPage({ params }: RouteProps) {
  const { slug } = await params;
  const page = await getPublicPage(slug);
  if (!page) notFound();
  if (page.path !== `/chuyen-trang/${slug}`) permanentRedirect(page.path);

  return (
    <PageShell className="page-static-content">
      <section className="static-page content-shell">
        <Breadcrumb items={[{ label: 'Trang chủ', href: '/' }, { label: 'Chuyên trang', href: '/chuyen-trang' }, { label: page.title }]} />
        <article className="static-page__article">
          <header className="static-page__header">
            <p className="static-page__eyebrow">Chuyên trang</p>
            <h1>{page.title}</h1>
            {page.excerpt && <p className="static-page__excerpt">{page.excerpt}</p>}
            {page.lastPublicChangedAt && <time dateTime={page.lastPublicChangedAt}>Cập nhật {new Date(page.lastPublicChangedAt).toLocaleDateString('vi-VN')}</time>}
          </header>
          {page.cover && <figure className="static-page__cover"><Image src={page.cover.src} alt={page.cover.alt} width={page.cover.width} height={page.cover.height} unoptimized /></figure>}
          <RichContentRenderer document={page.body} className="static-page__body" />
        </article>
      </section>
    </PageShell>
  );
}

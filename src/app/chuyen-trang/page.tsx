import type { Metadata } from 'next';
import Link from 'next/link';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { PageShell } from '@/components/layout/PageShell';
import { JsonLd } from '@/components/seo/JsonLd';
import { getPublicPages, getPublicSeoUrls, getPublicSite } from '@/lib/api/public';
import { buildPageMetadata } from '@/lib/seo/metadata';
import { buildCollectionGraph } from '@/lib/seo/schema';
import { RichContentRenderer } from '@/components/content/RichContentRenderer';
import { ContentIndexEmptyState } from '@/components/content/ContentIndexEmptyState';
import { publicSetting, publicText, richDocumentHasContent } from '@/lib/public-content';
import type { RichDocument } from '@/lib/content/rich-document';
import '@/styles/static-pages.css';

export async function generateMetadata(): Promise<Metadata> {
  const [urls, site] = await Promise.all([getPublicSeoUrls(), getPublicSite()]);
  const page = publicSetting(site, 'catalog.staticPages');
  return buildPageMetadata({
    path: '/chuyen-trang',
    eligible: !!publicText(page.title) && urls.some((entry) => entry.path === '/chuyen-trang'),
  });
}

export default async function StaticPagesIndex() {
  const [pages, urls, site] = await Promise.all([getPublicPages(), getPublicSeoUrls(), getPublicSite()]);
  const config = publicSetting(site, 'catalog.staticPages');
  const title = publicText(config.title);
  const eyebrow = publicText(config.eyebrow);
  const indexable = new Set(urls.map((entry) => entry.path));
  const schemaItems = pages.filter((page) => !page.noindex && indexable.has(page.path)).map((page) => ({ name: page.title, href: page.path }));
  return (
    <PageShell className="page-static-content">
      <section className="static-page content-shell">
        {title && <Breadcrumb items={[{ label: 'Trang chủ', href: '/' }, { label: title }]} />}
        {(eyebrow || title || richDocumentHasContent(config.description)) && <header className="static-page__header static-page__header--index">
          {eyebrow && <p className="static-page__eyebrow">{eyebrow}</p>}
          {title && <h1>{title}</h1>}
          {richDocumentHasContent(config.description) && <div className="static-page__excerpt"><RichContentRenderer document={config.description as RichDocument} /></div>}
        </header>}
        {pages.length > 0 ? <div className="static-page__index-list">
          {pages.map((page) => <article className="static-page__index-card" key={page.id}>
            <h2><Link href={page.path}>{page.title}</Link></h2>
            {page.updatedAt && <p>Cập nhật {new Date(page.updatedAt).toLocaleDateString('vi-VN')}</p>}
          </article>)}
        </div> : <ContentIndexEmptyState kind="page" />}
      </section>
      <JsonLd data={title ? buildCollectionGraph(site, {
        path: '/chuyen-trang',
        title,
        description: undefined,
        items: schemaItems,
      }) : null} />
    </PageShell>
  );
}

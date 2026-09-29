import type { Metadata } from 'next';
import Image from '@/components/ui/ManagedImage';
import Link from 'next/link';
import { PageShell } from '@/components/layout/PageShell';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { JsonLd } from '@/components/seo/JsonLd';
import { getPublicArticles, getPublicSite } from '@/lib/api/public';
import { RichContentRenderer } from '@/components/content/RichContentRenderer';
import { ContentIndexEmptyState } from '@/components/content/ContentIndexEmptyState';
import { publicSetting, publicText, richDocumentHasContent } from '@/lib/public-content';
import type { RichDocument } from '@/lib/content/rich-document';
import { isSubstantivePublicContent } from '@/lib/seo/content';
import { buildPageMetadata } from '@/lib/seo/metadata';
import { buildCollectionGraph } from '@/lib/seo/schema';
import '@/styles/static-pages.css';

export async function generateMetadata(): Promise<Metadata> {
  const [articles, site] = await Promise.all([getPublicArticles(), getPublicSite()]);
  const page = publicSetting(site, 'catalog.articlesPage');
  const hasEligibleContent = articles.some((article) => !article.noindex && !!article.cover && isSubstantivePublicContent(article.body));
  return buildPageMetadata({
    path: '/bai-viet',
    eligible: hasEligibleContent && !!publicText(page.title),
  });
}

export default async function ArticlesPage() {
  const [articles, site] = await Promise.all([getPublicArticles(), getPublicSite()]);
  const config = publicSetting(site, 'catalog.articlesPage');
  const title = publicText(config.title);
  const eyebrow = publicText(config.eyebrow);
  const schemaItems = articles
    .filter((article) => !article.noindex && !!article.cover && isSubstantivePublicContent(article.body))
    .map((article) => ({ name: article.title, href: article.path }));
  return (
    <PageShell className="page-static-content">
      <section className="static-page">
        {title && <Breadcrumb items={[{ label: 'Trang chủ', href: '/' }, { label: title }]} />}
        {(eyebrow || title || richDocumentHasContent(config.description)) && <header className="static-page__header static-page__header--index">
          {eyebrow && <p className="static-page__eyebrow">{eyebrow}</p>}
          {title && <h1>{title}</h1>}
          {richDocumentHasContent(config.description) && <div className="static-page__excerpt"><RichContentRenderer document={config.description as RichDocument} /></div>}
        </header>}
        {articles.length > 0 ? <div className="static-page__index-list">
          {articles.map((article) => <article className="static-page__index-card" key={article.id}>
            {article.cover && <Link className="static-page__card-image" href={article.path} aria-label={article.title}>
              <Image src={article.cover.src} alt={article.cover.alt} width={article.cover.width} height={article.cover.height} unoptimized />
            </Link>}
            <div className="static-page__card-copy">
              <h2><Link href={article.path}>{article.title}</Link></h2>
              {article.excerpt && <p>{article.excerpt}</p>}
              {article.firstPublishedAt && <time dateTime={article.firstPublishedAt}>{new Date(article.firstPublishedAt).toLocaleDateString('vi-VN')}</time>}
            </div>
          </article>)}
        </div> : <ContentIndexEmptyState kind="article" />}
      </section>
      <JsonLd data={title ? buildCollectionGraph(site, {
        path: '/bai-viet',
        title,
        items: schemaItems,
      }) : null} />
    </PageShell>
  );
}

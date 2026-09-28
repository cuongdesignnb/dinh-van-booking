import type { Metadata } from 'next';
import Image from '@/components/ui/ManagedImage';
import { notFound, permanentRedirect } from 'next/navigation';
import { RichContentRenderer } from '@/components/content/RichContentRenderer';
import { PageShell } from '@/components/layout/PageShell';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { JsonLd } from '@/components/seo/JsonLd';
import { getPublicArticle, getPublicSite } from '@/lib/api/public';
import { isSubstantivePublicContent } from '@/lib/seo/content';
import { buildPageMetadata } from '@/lib/seo/metadata';
import { buildArticleGraph } from '@/lib/seo/schema';
import { isSeoSchemaAllowed } from '@/lib/seo/policy';
import '@/styles/static-pages.css';

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const article = await getPublicArticle(slug);
  if (!article) return { title: 'Không tìm thấy bài viết' };
  return buildPageMetadata({
    path: article.path,
    title: article.metaTitle ?? article.title,
    description: article.metaDescription ?? article.excerpt,
    image: article.cover,
    noindex: article.noindex,
    eligible: !!article.cover && isSubstantivePublicContent(article.body),
    type: 'article',
    publishedTime: article.firstPublishedAt,
    modifiedTime: article.lastPublicChangedAt,
    searchParams: query,
  });
}

export default async function ArticleDetailPage({ params, searchParams }: Props) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const article = await getPublicArticle(slug);
  if (!article) notFound();
  const canonicalPath = `/bai-viet/${slug}`;
  if (article.path !== canonicalPath) permanentRedirect(article.path);
  const site = await getPublicSite();
  return (
    <PageShell className="page-static-content">
      <section className="static-page">
        <Breadcrumb items={[{ label: 'Trang chủ', href: '/' }, { label: 'Bài viết', href: '/bai-viet' }, { label: article.title }]} />
        <article className="static-page__article">
          <header className="static-page__header">
            <p className="static-page__eyebrow">Cẩm nang địa phương</p>
            <h1>{article.title}</h1>
            {article.excerpt && <p className="static-page__excerpt">{article.excerpt}</p>}
            <div className="static-page__byline">
              {article.authorName && <span>Tác giả: {article.authorName}</span>}
              {article.firstPublishedAt && <time dateTime={article.firstPublishedAt}>Đăng {new Date(article.firstPublishedAt).toLocaleDateString('vi-VN')}</time>}
              {article.readMinutes && article.readMinutes > 0 && <span>{article.readMinutes} phút đọc</span>}
            </div>
          </header>
          {article.cover && <figure className="static-page__cover"><Image src={article.cover.src} alt={article.cover.alt} width={article.cover.width} height={article.cover.height} unoptimized priority /></figure>}
          <RichContentRenderer document={article.body} className="static-page__body" />
        </article>
      </section>
      <JsonLd data={isSeoSchemaAllowed(site, article.path, {
        eligible: !!article.cover && isSubstantivePublicContent(article.body),
        noindex: article.noindex,
        searchParams: query,
      }) ? buildArticleGraph(site, article, article.path) : null} />
    </PageShell>
  );
}

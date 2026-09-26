import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { PageShell } from '@/components/layout/PageShell';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { JsonLd } from '@/components/seo/JsonLd';
import { getPublicArticles, getPublicSite } from '@/lib/api/public';
import { isSubstantivePublicContent } from '@/lib/seo/content';
import { buildPageMetadata } from '@/lib/seo/metadata';
import { buildCollectionGraph } from '@/lib/seo/schema';
import '@/styles/static-pages.css';

export async function generateMetadata(): Promise<Metadata> {
  const articles = await getPublicArticles();
  const hasEligibleContent = articles.some((article) => !article.noindex && !!article.cover && isSubstantivePublicContent(article.body));
  return buildPageMetadata({
    path: '/bai-viet',
    title: 'Bài viết — Đinh Vân Booking',
    description: 'Cẩm nang và câu chuyện du lịch Cúc Phương – Ninh Bình từ Đinh Vân Booking.',
    eligible: hasEligibleContent,
  });
}

export default async function ArticlesPage() {
  const [articles, site] = await Promise.all([getPublicArticles(), getPublicSite()]);
  const schemaItems = articles
    .filter((article) => !article.noindex && !!article.cover && isSubstantivePublicContent(article.body))
    .map((article) => ({ name: article.title, href: article.path }));
  return (
    <PageShell className="page-static-content">
      <section className="static-page">
        <Breadcrumb items={[{ label: 'Trang chủ', href: '/' }, { label: 'Bài viết' }]} />
        <header className="static-page__header static-page__header--index">
          <p className="static-page__eyebrow">Cẩm nang địa phương</p>
          <h1>Bài viết</h1>
          <p className="static-page__excerpt">Thông tin và câu chuyện được biên tập từ dữ liệu đã xác minh.</p>
        </header>
        {articles.length ? <div className="static-page__index-list">
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
        </div> : <p className="static-page__empty">Bài viết đang được cập nhật.</p>}
      </section>
      <JsonLd data={buildCollectionGraph(site, {
        path: '/bai-viet',
        title: 'Bài viết',
        description: 'Cẩm nang và câu chuyện du lịch Cúc Phương – Ninh Bình.',
        items: schemaItems,
      })} />
    </PageShell>
  );
}

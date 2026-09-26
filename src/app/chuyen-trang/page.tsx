import type { Metadata } from 'next';
import Link from 'next/link';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { PageShell } from '@/components/layout/PageShell';
import { JsonLd } from '@/components/seo/JsonLd';
import { getPublicPages, getPublicSeoUrls, getPublicSite } from '@/lib/api/public';
import { buildPageMetadata } from '@/lib/seo/metadata';
import { buildCollectionGraph } from '@/lib/seo/schema';
import '@/styles/static-pages.css';

export async function generateMetadata(): Promise<Metadata> {
  const urls = await getPublicSeoUrls();
  return buildPageMetadata({
    path: '/chuyen-trang',
    title: 'Chuyên trang — Đinh Vân Booking',
    description: 'Chính sách, câu hỏi thường gặp và thông tin hữu ích từ Đinh Vân Booking.',
    eligible: urls.some((entry) => entry.path === '/chuyen-trang'),
  });
}

export default async function StaticPagesIndex() {
  const [pages, urls, site] = await Promise.all([getPublicPages(), getPublicSeoUrls(), getPublicSite()]);
  const indexable = new Set(urls.map((entry) => entry.path));
  const schemaItems = pages.filter((page) => !page.noindex && indexable.has(page.path)).map((page) => ({ name: page.title, href: page.path }));
  return (
    <PageShell className="page-static-content">
      <section className="static-page content-shell">
        <Breadcrumb items={[{ label: 'Trang chủ', href: '/' }, { label: 'Chuyên trang' }]} />
        <header className="static-page__header static-page__header--index">
          <p className="static-page__eyebrow">Thông tin hữu ích</p>
          <h1>Chuyên trang</h1>
          <p className="static-page__excerpt">Chính sách, câu hỏi thường gặp và các thông tin dành cho khách hàng.</p>
        </header>
        {pages.length ? <div className="static-page__index-list">
          {pages.map((page) => <article className="static-page__index-card" key={page.id}>
            <h2><Link href={page.path}>{page.title}</Link></h2>
            {page.updatedAt && <p>Cập nhật {new Date(page.updatedAt).toLocaleDateString('vi-VN')}</p>}
          </article>)}
        </div> : <p className="static-page__empty">Các thông tin đang được cập nhật.</p>}
      </section>
      <JsonLd data={buildCollectionGraph(site, {
        path: '/chuyen-trang',
        title: 'Chuyên trang',
        description: 'Chính sách, câu hỏi thường gặp và thông tin hữu ích từ Đinh Vân Booking.',
        items: schemaItems,
      })} />
    </PageShell>
  );
}

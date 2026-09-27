import type { Metadata } from 'next';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { PageShell } from '@/components/layout/PageShell';
import { getPublicSite } from '@/lib/api/public';
import { metadataForSite } from '@/lib/seo/metadata';

export async function generateMetadata(): Promise<Metadata> {
  const site = await getPublicSite();
  return metadataForSite(site, { path: '/404', title: 'Không tìm thấy trang', eligible: false, canonical: false });
}

export default function NotFound() {
  return (
    <PageShell className="page-notfound">
      <section className="notfound content-shell">
        <p className="notfound__script handwritten">Ơ, lạc đường rồi…</p>
        <h1 className="notfound__title">Không tìm thấy trang</h1>
        <p>Đường dẫn có thể đã thay đổi hoặc trang hiện không tồn tại.</p>
        <Link href="/" className="btn btn--primary">
          Về trang chủ <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </section>
    </PageShell>
  );
}

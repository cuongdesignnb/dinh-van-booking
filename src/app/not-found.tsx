import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { PageShell } from '@/components/layout/PageShell';

export default function NotFound() {
  return (
    <PageShell className="page-notfound">
      <section className="notfound content-shell">
        <p className="notfound__script handwritten">Ơ, lạc đường rồi…</p>
        <h1 className="notfound__title">Không tìm thấy trang</h1>
        <p>Có thể đường dẫn đã thay đổi hoặc trang chưa có trên Đinh Vân Booking.</p>
        <Link href="/" className="btn btn--primary">
          Về trang chủ <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </section>
    </PageShell>
  );
}

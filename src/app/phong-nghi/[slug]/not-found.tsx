import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function StayNotFound() {
  return (
    <section className="notfound content-shell">
      <p className="notfound__script handwritten">Ơ, lạc đường rồi…</p>
      <h1 className="notfound__title">Không tìm thấy chỗ nghỉ này</h1>
      <p>Có thể đường dẫn đã thay đổi hoặc chỗ nghỉ chưa được xuất bản.</p>
      <Link href="/phong-nghi" className="btn btn--primary">
        Xem danh sách phòng nghỉ <ArrowRight size={16} aria-hidden="true" />
      </Link>
    </section>
  );
}

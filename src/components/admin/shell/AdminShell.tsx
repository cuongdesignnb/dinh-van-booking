'use client';

import { Info } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { DinhVanMark } from '@/components/ui/BrandLogo';
import { AdminSidebar } from './AdminSidebar';
import { AdminTopbar } from './AdminTopbar';
import { pageMeta } from './page-meta';

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const meta = pageMeta(pathname);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="ashell">
      <AdminSidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      {menuOpen && <button type="button" className="ashell__scrim" aria-label="Đóng menu" onClick={() => setMenuOpen(false)} />}
      <div className="ashell__main">
        <AdminTopbar meta={meta} onMenu={() => setMenuOpen(true)} />
        <main className="ashell__content">{children}</main>
        <AdminFooter />
      </div>
    </div>
  );
}

function AdminFooter() {
  return (
    <footer className="afooter">
      <div className="afooter__brand">
        <DinhVanMark className="afooter__mark" />
        <span>
          <strong className="brand-wordmark">Quản trị</strong>
          <small>Thông tin thương hiệu lấy từ cấu hình hệ thống</small>
        </span>
      </div>
      <p className="afooter__mid">
        Quản trị hệ thống đặt phòng và du lịch
        <br />
        Dữ liệu vận hành và nội dung đã được xuất bản
      </p>
      <p className="afooter__script handwritten">
        Cùng nhau lan tỏa
        <br />
        những chuyến đi ý nghĩa ♡
      </p>
      <p className="afooter__copy">Không lưu bản ghi nghiệp vụ trong trình duyệt</p>
    </footer>
  );
}

/** Honest placeholder for modules whose API and workflows are not implemented yet. */
export function PendingModule({ title }: { title: string }) {
  return (
    <section className="acard apending">
      <Info size={22} aria-hidden="true" />
      <div>
        <h2>{title} chưa nằm trong phạm vi đợt này</h2>
        <p>
          Mục này chưa có API hoặc tác vụ vận hành nên hiện chưa thể xem hay thay đổi dữ liệu tại đây. Những chức năng
          chưa hoàn tất sẽ không hiển thị số liệu mẫu hoặc báo lưu thành công.
        </p>
      </div>
    </section>
  );
}

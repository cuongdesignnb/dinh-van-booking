'use client';

import { usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { DinhVanMark } from '@/components/ui/BrandLogo';
import { AdminSidebar } from './AdminSidebar';
import { AdminTopbar } from './AdminTopbar';
import { pageMeta } from './page-meta';
import { AdminToastProvider } from '@/components/admin/toast/AdminToastProvider';

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const meta = pageMeta(pathname);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <AdminToastProvider>
      <div className="ashell">
        <AdminSidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
        {menuOpen && <button type="button" className="ashell__scrim" aria-label="Đóng menu" onClick={() => setMenuOpen(false)} />}
        <div className="ashell__main">
          <AdminTopbar meta={meta} onMenu={() => setMenuOpen(true)} />
          <main className="ashell__content">{children}</main>
          <AdminFooter />
        </div>
      </div>
    </AdminToastProvider>
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

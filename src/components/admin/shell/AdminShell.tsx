'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { AdminSidebar } from './AdminSidebar';
import { AdminTopbar } from './AdminTopbar';
import { pageMeta } from './page-meta';
import { AdminToastProvider } from '@/components/admin/toast/AdminToastProvider';

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const meta = pageMeta(pathname);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setMenuOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  return (
    <AdminToastProvider>
      <a className="askip" href="#admin-main">Bỏ qua điều hướng</a>
      <div className="ashell">
        <AdminSidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
        {menuOpen && <button type="button" className="ashell__scrim" aria-label="Đóng menu" onClick={() => setMenuOpen(false)} />}
        <div className="ashell__main">
          <AdminTopbar meta={meta} menuOpen={menuOpen} onMenu={() => setMenuOpen(true)} />
          <main className="ashell__content" id="admin-main" tabIndex={-1}>{children}</main>
          <footer className="afooter">
            <span>Cúc Phương Travel · Bảng quản trị</span>
            <span>Dữ liệu hiển thị lấy trực tiếp từ hệ thống; không lưu bản ghi nghiệp vụ trong trình duyệt.</span>
          </footer>
        </div>
      </div>
    </AdminToastProvider>
  );
}

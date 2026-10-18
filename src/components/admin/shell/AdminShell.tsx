'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { AdminSidebar } from './AdminSidebar';
import { AdminTopbar } from './AdminTopbar';
import { AdminCommandPalette } from './AdminCommandPalette';
import { pageMeta } from './page-meta';
import { AdminToastProvider } from '@/components/admin/toast/AdminToastProvider';

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const meta = pageMeta(pathname);
  const [menuOpen, setMenuOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // The collapsed sidebar is a per-device preference; it must never block rendering.
  useEffect(() => {
    try { setCollapsed(window.localStorage.getItem('dvb-admin-sidebar') === 'collapsed'); } catch { /* storage unavailable */ }
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((value) => {
      const next = !value;
      try { window.localStorage.setItem('dvb-admin-sidebar', next ? 'collapsed' : 'open'); } catch { /* storage unavailable */ }
      return next;
    });
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen((value) => !value);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setMenuOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  return (
    <AdminToastProvider>
      <a className="askip" href="#admin-main">Bỏ qua điều hướng</a>
      <div className={`ashell${collapsed ? ' ashell--collapsed' : ''}`}>
        <AdminSidebar open={menuOpen} onClose={() => setMenuOpen(false)} collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />
        {menuOpen && <button type="button" className="ashell__scrim" aria-label="Đóng menu" onClick={() => setMenuOpen(false)} />}
        <div className="ashell__main">
          <AdminTopbar meta={meta} menuOpen={menuOpen} onMenu={() => setMenuOpen(true)} onSearch={() => setPaletteOpen(true)} />
          <main className="ashell__content" id="admin-main" tabIndex={-1}>{children}</main>
          <footer className="afooter">
            <span>Cúc Phương Travel · Bảng quản trị</span>
            <span>Dữ liệu hiển thị lấy trực tiếp từ hệ thống; không lưu bản ghi nghiệp vụ trong trình duyệt.</span>
          </footer>
        </div>
      </div>
      <AdminCommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </AdminToastProvider>
  );
}

'use client';

import { Info, X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { DinhVanMark } from '@/components/ui/BrandLogo';
import { useAdmin } from '../AdminStore';
import { AdminSidebar } from './AdminSidebar';
import { AdminTopbar } from './AdminTopbar';
import { pageMeta } from './page-meta';

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const meta = pageMeta(pathname);
  const [menuOpen, setMenuOpen] = useState(false);
  const { toasts, dismissToast } = useAdmin();

  return (
    <div className="ashell">
      <AdminSidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      {menuOpen && <button type="button" className="ashell__scrim" aria-label="Đóng menu" onClick={() => setMenuOpen(false)} />}
      <div className="ashell__main">
        <AdminTopbar meta={meta} onMenu={() => setMenuOpen(true)} />
        <main className="ashell__content">{children}</main>
        <AdminFooter />
      </div>
      <div className="atoasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`atoast atoast--${t.tone}`}>
            <span>{t.text}</span>
            <button type="button" onClick={() => dismissToast(t.id)} aria-label="Đóng thông báo">
              <X size={14} aria-hidden="true" />
            </button>
          </div>
        ))}
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
          <strong className="brand-wordmark">Đinh Vân Booking</strong>
          <small>Ở ĐÂY CÓ NHỮNG CHUYẾN ĐI Ý NGHĨA</small>
        </span>
      </div>
      <p className="afooter__mid">
        Quản trị hệ thống đặt phòng và du lịch
        <br />
        Cúc Phương – Nho Quan – Ninh Bình
      </p>
      <p className="afooter__script handwritten">
        Cùng nhau lan tỏa
        <br />
        những chuyến đi ý nghĩa ♡
      </p>
      <p className="afooter__copy">© 2024 Đinh Vân Booking. Dữ liệu mẫu phục vụ demo giao diện.</p>
    </footer>
  );
}

/** Info panel for the menu entries that are out of scope for this build. */
export function PendingModule({ title }: { title: string }) {
  return (
    <section className="acard apending">
      <Info size={22} aria-hidden="true" />
      <div>
        <h2>{title} chưa nằm trong phạm vi đợt này</h2>
        <p>
          Menu vẫn giữ mục này để đúng với bản thiết kế, nhưng module chưa được lập trình. Các thao tác liên quan trong 6 màn
          đã làm (ưu đãi combo, thanh toán của đơn, xuất dữ liệu) vẫn dùng được ngay trong màn tương ứng.
        </p>
      </div>
    </section>
  );
}

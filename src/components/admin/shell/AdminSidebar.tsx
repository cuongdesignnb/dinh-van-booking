'use client';

import {
  BedDouble,
  BookOpenText,
  ChartColumn,
  CreditCard,
  FileText,
  House,
  Images,
  Map as MapIcon,
  MapPin,
  MessageCircle,
  Menu,
  Settings,
  Tag,
  Users,
  CalendarDays,
  Handshake,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { ComponentType, SVGProps } from 'react';
import { DinhVanMark } from '@/components/ui/BrandLogo';
import { LeafSprig, SmallLeaf } from '@/components/ui/Decor';
import { useAdminSession } from '@/components/admin/AdminAuthGate';
import { apiRequest } from '@/lib/api/client';

export interface AdminNavItem {
  href: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement> & { size?: number | string }>;
  permission: string;
  badge?: 'pendingBookings' | 'newInquiries';
}

export const ADMIN_NAV: AdminNavItem[] = [
  { href: '/admin', label: 'Tổng quan', icon: House, permission: 'dashboard.read' },
  { href: '/admin/dat-phong', label: 'Đặt phòng', icon: CalendarDays, permission: 'booking.read', badge: 'pendingBookings' },
  { href: '/admin/phong-nghi', label: 'Nơi lưu trú', icon: BedDouble, permission: 'catalog.read' },
  { href: '/admin/hang-phong', label: 'Hạng phòng', icon: BedDouble, permission: 'catalog.read' },
  { href: '/admin/ton-phong', label: 'Quỹ phòng', icon: CalendarDays, permission: 'inventory.read' },
  { href: '/admin/doi-tac', label: 'Đối tác & đồng bộ', icon: Handshake, permission: 'partner.read' },
  { href: '/admin/combo-du-lich', label: 'Combo du lịch', icon: MapIcon, permission: 'catalog.read' },
  { href: '/admin/diem-den', label: 'Điểm đến', icon: MapPin, permission: 'catalog.read' },
  { href: '/admin/khach-hang', label: 'Khách hàng', icon: Users, permission: 'crm.read' },
  { href: '/admin/yeu-cau-tu-van', label: 'Yêu cầu tư vấn', icon: MessageCircle, permission: 'crm.read', badge: 'newInquiries' },
  { href: '/admin/noi-dung', label: 'Nội dung website', icon: FileText, permission: 'content.read' },
  { href: '/admin/chuyen-trang', label: 'Chuyên trang', icon: BookOpenText, permission: 'content.read' },
  { href: '/admin/menu', label: 'Quản lý menu', icon: Menu, permission: 'content.read' },
  { href: '/admin/thu-vien-anh', label: 'Thư viện ảnh', icon: Images, permission: 'media.read' },
  { href: '/admin/khuyen-mai', label: 'Khuyến mãi', icon: Tag, permission: 'coupon.read' },
  { href: '/admin/thanh-toan', label: 'Thanh toán', icon: CreditCard, permission: 'finance.read' },
  { href: '/admin/bao-cao', label: 'Báo cáo', icon: ChartColumn, permission: 'report.read' },
  { href: '/admin/cai-dat', label: 'Cài đặt', icon: Settings, permission: 'settings.read' },
];

/** The menu entry a route belongs to (sub-routes never light up two items). */
export function activeNavHref(pathname: string) {
  const match = ADMIN_NAV.filter((n) => pathname === n.href || pathname.startsWith(`${n.href}/`)).sort(
    (a, b) => b.href.length - a.href.length,
  )[0];
  return match?.href ?? '/admin';
}

export function AdminSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const { user } = useAdminSession();
  const active = activeNavHref(pathname);
  const [counts, setCounts] = useState<{ pendingBookings: number; newInquiries: number }>({ pendingBookings: 0, newInquiries: 0 });

  useEffect(() => {
    let active = true;
    const loadCounts = async () => {
      try {
        const summary = await apiRequest<{ bookings: { byStatus: Record<string, number> }; newInquiries: number }>('/admin/dashboard/summary');
        if (active) setCounts({ pendingBookings: summary.bookings.byStatus.pending_confirmation ?? 0, newInquiries: summary.newInquiries });
      } catch {
        // Navigation stays usable when a role can read its page but not the dashboard summary.
      }
    };
    if (user.permissions.includes('dashboard.read')) void loadCounts();
    const timer = window.setInterval(() => { if (user.permissions.includes('dashboard.read')) void loadCounts(); }, 60_000);
    return () => { active = false; window.clearInterval(timer); };
  }, [user.id, user.permissions]);

  const visibleItems = ADMIN_NAV.filter((item) => user.permissions.includes(item.permission));

  return (
    <aside className={`asidebar${open ? ' asidebar--open' : ''}`} aria-label="Điều hướng quản trị">
      <div className="asidebar__inner">
        <LeafSprig className="asidebar__leaf asidebar__leaf--a" />
        <SmallLeaf className="asidebar__leaf asidebar__leaf--b" />
        <div className="asidebar__brand">
          <DinhVanMark className="asidebar__mark" />
          <span className="asidebar__word brand-wordmark">Quản trị</span>
          <span className="asidebar__tagline">Cấu hình và dữ liệu vận hành</span>
        </div>
        <button type="button" className="asidebar__close" onClick={onClose} aria-label="Đóng menu">
          <X size={18} aria-hidden="true" />
        </button>
        <nav className="asidebar__nav">
          <ul>
            {visibleItems.map((item) => {
              const Icon = item.icon;
              const isActive = active === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`anav${isActive ? ' anav--active' : ''}`}
                    aria-current={isActive ? 'page' : undefined}
                    onClick={onClose}
                  >
                    <Icon size={21} strokeWidth={1.9} aria-hidden="true" />
                    <span>{item.label}</span>
                    {item.badge && counts[item.badge] > 0 && <span className="anav__badge" aria-label={`${counts[item.badge]} mục cần xử lý`}>{counts[item.badge] > 99 ? '99+' : counts[item.badge]}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="asidebar__foot">
          <div className="asidebar__decor" aria-hidden="true" />
          <p className="asidebar__script handwritten">
            Thiên nhiên
            <br />
            kết nối những
            <br />
            con người đẹp ♡
          </p>
          <blockquote className="asidebar__quote">
            <p>“Dữ liệu đã xuất bản là nguồn hiển thị duy nhất.”</p>
            <cite>— Hệ thống —</cite>
          </blockquote>
        </div>
      </div>
    </aside>
  );
}

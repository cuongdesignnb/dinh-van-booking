'use client';

import {
  BedDouble,
  BookOpenText,
  CalendarDays,
  CalendarRange,
  ChartColumn,
  CreditCard,
  ExternalLink,
  FileText,
  Handshake,
  House,
  Images,
  LayoutList,
  Map as MapIcon,
  MapPin,
  Menu,
  MessageCircle,
  Settings,
  Tag,
  Users,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { ComponentType, SVGProps } from 'react';
import { DinhVanMark } from '@/components/ui/BrandLogo';
import { useAdminSession } from '@/components/admin/AdminAuthGate';
import { apiRequest } from '@/lib/api/client';

export interface AdminNavItem {
  href: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement> & { size?: number | string }>;
  permission: string;
  group: 'operations' | 'catalog' | 'customers' | 'content' | 'system';
  badge?: 'pendingBookings' | 'newInquiries';
}

export const ADMIN_NAV: AdminNavItem[] = [
  { href: '/admin', label: 'Tổng quan', icon: House, permission: 'dashboard.read', group: 'operations' },
  { href: '/admin/dat-phong', label: 'Đặt phòng', icon: CalendarDays, permission: 'booking.read', group: 'operations', badge: 'pendingBookings' },
  { href: '/admin/ton-phong', label: 'Quỹ phòng', icon: CalendarRange, permission: 'inventory.read', group: 'operations' },
  { href: '/admin/doi-tac', label: 'Đối tác & đồng bộ', icon: Handshake, permission: 'partner.read', group: 'operations' },
  { href: '/admin/phong-nghi', label: 'Nơi lưu trú', icon: BedDouble, permission: 'catalog.read', group: 'catalog' },
  { href: '/admin/hang-phong', label: 'Hạng phòng', icon: LayoutList, permission: 'catalog.read', group: 'catalog' },
  { href: '/admin/combo-du-lich', label: 'Combo du lịch', icon: MapIcon, permission: 'catalog.read', group: 'catalog' },
  { href: '/admin/diem-den', label: 'Điểm đến', icon: MapPin, permission: 'catalog.read', group: 'catalog' },
  { href: '/admin/khach-hang', label: 'Khách hàng', icon: Users, permission: 'crm.read', group: 'customers' },
  { href: '/admin/yeu-cau-tu-van', label: 'Yêu cầu tư vấn', icon: MessageCircle, permission: 'crm.read', group: 'customers', badge: 'newInquiries' },
  { href: '/admin/khuyen-mai', label: 'Khuyến mãi', icon: Tag, permission: 'coupon.read', group: 'customers' },
  { href: '/admin/thanh-toan', label: 'Thanh toán', icon: CreditCard, permission: 'finance.read', group: 'customers' },
  { href: '/admin/noi-dung', label: 'Nội dung website', icon: FileText, permission: 'content.read', group: 'content' },
  { href: '/admin/chuyen-trang', label: 'Chuyên trang', icon: BookOpenText, permission: 'content.read', group: 'content' },
  { href: '/admin/menu', label: 'Quản lý menu', icon: Menu, permission: 'content.read', group: 'content' },
  { href: '/admin/thu-vien-anh', label: 'Thư viện ảnh', icon: Images, permission: 'media.read', group: 'content' },
  { href: '/admin/bao-cao', label: 'Báo cáo', icon: ChartColumn, permission: 'report.read', group: 'system' },
  { href: '/admin/cai-dat', label: 'Cài đặt', icon: Settings, permission: 'settings.read', group: 'system' },
];

const GROUPS: Array<[AdminNavItem['group'], string]> = [
  ['operations', 'Vận hành'],
  ['catalog', 'Sản phẩm'],
  ['customers', 'Khách hàng & doanh thu'],
  ['content', 'Website'],
  ['system', 'Hệ thống'],
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
    <aside id="admin-sidebar" className={`asidebar${open ? ' asidebar--open' : ''}`} aria-label="Điều hướng quản trị">
      <div className="asidebar__inner">
        <div className="asidebar__brand">
          <DinhVanMark className="asidebar__mark" />
          <span className="asidebar__brand-text">
            <span className="asidebar__word brand-wordmark">Đinh Vân</span>
            <span className="asidebar__tagline">Bảng quản trị</span>
          </span>
          <button type="button" className="asidebar__close" onClick={onClose} aria-label="Đóng menu">
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <nav className="asidebar__nav">
          {GROUPS.map(([group, label]) => {
            const items = visibleItems.filter((item) => item.group === group);
            if (!items.length) return null;
            return (
              <div className="asidebar__group" key={group}>
                <p className="asidebar__group-label">{label}</p>
                <ul>
                  {items.map((item) => {
                    const Icon = item.icon;
                    const isActive = active === item.href;
                    const count = item.badge ? counts[item.badge] : 0;
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className={`anav${isActive ? ' anav--active' : ''}`}
                          aria-current={isActive ? 'page' : undefined}
                          onClick={onClose}
                        >
                          <Icon size={18} strokeWidth={1.9} aria-hidden="true" />
                          <span>{item.label}</span>
                          {count > 0 && <span className="anav__badge" aria-label={`${count} mục cần xử lý`}>{count > 99 ? '99+' : count}</span>}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>
        <div className="asidebar__foot">
          <a className="asidebar__site" href="/" target="_blank" rel="noreferrer">
            <ExternalLink size={16} aria-hidden="true" />
            <span>Xem website</span>
          </a>
        </div>
      </div>
    </aside>
  );
}

'use client';

import {
  BedDouble,
  ChartColumn,
  CreditCard,
  FileText,
  House,
  Map as MapIcon,
  MapPin,
  MessageCircle,
  Settings,
  Tag,
  Users,
  CalendarDays,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ComponentType, SVGProps } from 'react';
import { DinhVanMark } from '@/components/ui/BrandLogo';
import { LeafSprig, SmallLeaf } from '@/components/ui/Decor';
import { useAdmin } from '../AdminStore';

export interface AdminNavItem {
  href: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement> & { size?: number | string }>;
  /** Modules that are out of scope for this build open an info panel instead. */
  scope?: 'pending';
  badge?: 'inquiries';
}

export const ADMIN_NAV: AdminNavItem[] = [
  { href: '/admin', label: 'Tổng quan', icon: House },
  { href: '/admin/dat-phong', label: 'Đặt phòng', icon: CalendarDays },
  { href: '/admin/phong-nghi', label: 'Phòng nghỉ', icon: BedDouble },
  { href: '/admin/combo-du-lich', label: 'Combo du lịch', icon: MapIcon },
  { href: '/admin/diem-den', label: 'Điểm đến', icon: MapPin },
  { href: '/admin/khach-hang', label: 'Khách hàng', icon: Users },
  { href: '/admin/yeu-cau-tu-van', label: 'Yêu cầu tư vấn', icon: MessageCircle, badge: 'inquiries' },
  { href: '/admin/noi-dung', label: 'Nội dung website', icon: FileText },
  { href: '/admin/khuyen-mai', label: 'Khuyến mãi', icon: Tag, scope: 'pending' },
  { href: '/admin/thanh-toan', label: 'Thanh toán', icon: CreditCard, scope: 'pending' },
  { href: '/admin/bao-cao', label: 'Báo cáo', icon: ChartColumn, scope: 'pending' },
  { href: '/admin/cai-dat', label: 'Cài đặt', icon: Settings, scope: 'pending' },
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
  const active = activeNavHref(pathname);
  const { data } = useAdmin();
  const unread = data.inquiries.filter((i) => !i.read).length;

  return (
    <aside className={`asidebar${open ? ' asidebar--open' : ''}`} aria-label="Điều hướng quản trị">
      <div className="asidebar__inner">
        <LeafSprig className="asidebar__leaf asidebar__leaf--a" />
        <SmallLeaf className="asidebar__leaf asidebar__leaf--b" />
        <div className="asidebar__brand">
          <DinhVanMark className="asidebar__mark" />
          <span className="asidebar__word brand-wordmark">Đinh Vân Booking</span>
          <span className="asidebar__tagline">Ở ĐÂY CÓ NHỮNG CHUYẾN ĐI Ý NGHĨA</span>
        </div>
        <button type="button" className="asidebar__close" onClick={onClose} aria-label="Đóng menu">
          <X size={18} aria-hidden="true" />
        </button>
        <nav className="asidebar__nav">
          <ul>
            {ADMIN_NAV.map((item) => {
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
                    {item.badge === 'inquiries' && unread > 0 && (
                      <span className="anav__badge" aria-label={`${unread} yêu cầu chưa đọc`}>
                        {unread}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="asidebar__decor" aria-hidden="true" />
        <p className="asidebar__script handwritten">
          Thiên nhiên
          <br />
          kết nối những
          <br />
          con người đẹp ♡
        </p>
        <blockquote className="asidebar__quote">
          <p>“Những hành trình nhỏ tạo nên những ký ức lớn”</p>
          <cite>— Đinh Vân Booking —</cite>
        </blockquote>
      </div>
    </aside>
  );
}

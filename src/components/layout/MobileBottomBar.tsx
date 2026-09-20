'use client';

import { BedDouble, House, Map as MapIcon, MapPin, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ITEMS = [
  { href: '/', label: 'Trang chủ', icon: House },
  { href: '/phong-nghi', label: 'Phòng nghỉ', icon: BedDouble },
  { href: '/combo-du-lich', label: 'Combo', icon: MapIcon },
  { href: '/diem-den', label: 'Điểm đến', icon: MapPin },
  { href: '/lien-he', label: 'Liên hệ', icon: MessageCircle },
];

const isActive = (path: string, href: string) =>
  href === '/' ? path === '/' : path === href || path.startsWith(`${href}/`);

/**
 * Bottom navigation that follows the screen on phones. It is hidden on tablets
 * and desktops, where the header navigation is visible instead.
 */
export function MobileBottomBar() {
  const pathname = usePathname() ?? '/';

  return (
    <nav className="mobilebar" aria-label="Điều hướng nhanh">
      <ul>
        {ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href);
          return (
            <li key={item.href}>
              <Link href={item.href} className="mobilebar__link" aria-current={active ? 'page' : undefined}>
                <Icon size={19} strokeWidth={active ? 2.2 : 1.8} aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

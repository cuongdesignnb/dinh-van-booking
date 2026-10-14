'use client';

import { BedDouble, CalendarSearch, House, Map as MapIcon, MapPin, MessageCircle, Phone, Send } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ComponentType, type SVGProps } from 'react';
import { useChatEnabled } from '@/components/chat/ChatCta';
import { useSiteData } from '@/components/site/SiteDataProvider';
import { openChat } from '@/lib/events';
import { PUBLIC_ROUTES } from '@/lib/routes';

type Icon = ComponentType<SVGProps<SVGSVGElement> & { size?: number | string; strokeWidth?: number }>;
type Item = { key: string; label: string; Icon: Icon; href: string; external?: boolean; match?: string };

/** Fourth slot: the first browse page the Owner actually has in the main menu. */
const BROWSE_CANDIDATES: Array<Omit<Item, 'key'>> = [
  { label: 'Tra phòng', Icon: CalendarSearch, href: PUBLIC_ROUTES.availability, match: PUBLIC_ROUTES.availability },
  { label: 'Combo', Icon: MapIcon, href: PUBLIC_ROUTES.combos, match: PUBLIC_ROUTES.combos },
  { label: 'Điểm đến', Icon: MapPin, href: PUBLIC_ROUTES.destinations, match: PUBLIC_ROUTES.destinations },
];

function isActive(pathname: string, match?: string): boolean {
  if (!match) return false;
  return match === '/' ? pathname === '/' : pathname === match || pathname.startsWith(`${match}/`);
}

/**
 * Bottom navigation for phones: home, stays, a raised "Tư vấn" button that
 * opens the live chat (or Zalo / the contact page when chat is off), one
 * browse page and a call button. Hidden from 768px up and on checkout.
 */
export function MobileNav() {
  const pathname = usePathname() || '/';
  const site = useSiteData();
  const chat = useChatEnabled();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    const onUnread = (event: Event) => setUnread((event as CustomEvent<{ count?: number }>).detail?.count ?? 0);
    window.addEventListener('dvb:chat-unread', onUnread);
    return () => window.removeEventListener('dvb:chat-unread', onUnread);
  }, []);

  const menu = new Set(site.navigation.map((item) => item.href.split('?')[0]));
  const browse = BROWSE_CANDIDATES.find((item) => menu.has(item.href)) ?? null;
  const phone = site.contact.hotline || site.contact.phone;
  const zalo = site.contact.zaloUrl;

  const left: Item[] = [
    { key: 'home', label: 'Trang chủ', Icon: House, href: PUBLIC_ROUTES.home, match: PUBLIC_ROUTES.home },
    { key: 'stays', label: 'Phòng nghỉ', Icon: BedDouble, href: PUBLIC_ROUTES.stays, match: PUBLIC_ROUTES.stays },
  ];
  const right: Item[] = [
    browse ? { key: 'browse', ...browse } : { key: 'contact', label: 'Liên hệ', Icon: Send, href: PUBLIC_ROUTES.contact, match: PUBLIC_ROUTES.contact },
    phone
      ? { key: 'call', label: 'Gọi ngay', Icon: Phone, href: `tel:${phone.replace(/[^\d+]/g, '')}`, external: true }
      : zalo
        ? { key: 'zalo', label: 'Zalo', Icon: Send, href: zalo, external: true }
        : { key: 'contact', label: 'Liên hệ', Icon: Send, href: PUBLIC_ROUTES.contact, match: PUBLIC_ROUTES.contact },
  ];

  const link = (item: Item) => {
    const active = isActive(pathname, item.match);
    const body = (
      <>
        <span className="mnav__icon"><item.Icon size={21} strokeWidth={active ? 2.2 : 1.8} aria-hidden="true" /></span>
        <span className="mnav__label">{item.label}</span>
      </>
    );
    return (
      <li key={item.key}>
        {item.external
          ? <a className="mnav__link" href={item.href} {...(item.href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{body}</a>
          : <Link className="mnav__link" href={item.href} aria-current={active ? 'page' : undefined}>{body}</Link>}
      </li>
    );
  };

  const advisor = chat
    ? <button type="button" className="mnav__cta" onClick={() => openChat()} aria-label={unread ? `Tư vấn — ${unread} tin nhắn mới` : 'Mở khung chat tư vấn'}>
        <span className="mnav__cta-ring"><MessageCircle size={24} aria-hidden="true" />{unread > 0 && <span className="mnav__badge" aria-hidden="true">{unread > 9 ? '9+' : unread}</span>}</span>
        <span className="mnav__label">Tư vấn</span>
      </button>
    : zalo
      ? <a className="mnav__cta" href={zalo} target="_blank" rel="noopener noreferrer"><span className="mnav__cta-ring"><MessageCircle size={24} aria-hidden="true" /></span><span className="mnav__label">Tư vấn</span></a>
      : <Link className="mnav__cta" href={PUBLIC_ROUTES.contact}><span className="mnav__cta-ring"><MessageCircle size={24} aria-hidden="true" /></span><span className="mnav__label">Tư vấn</span></Link>;

  return (
    <nav className="mnav" aria-label="Điều hướng nhanh">
      <ul className="mnav__list">
        {left.map(link)}
        <li className="mnav__center">{advisor}</li>
        {right.map(link)}
      </ul>
    </nav>
  );
}

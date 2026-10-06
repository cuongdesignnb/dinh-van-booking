'use client';

import { Menu, Search, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { focusSearch } from '@/lib/events';
import { useSiteData } from '@/components/site/SiteDataProvider';
import type { PublicNavigationItem } from '@/lib/api/public';

const isActive = (path: string, href: string) =>
  href === '/' ? path === '/' : path === href || path.startsWith(`${href}/`);

/** Static VN flag; the language switch is not available yet. */
function VnFlag() {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" focusable="false">
      <circle cx="10" cy="10" r="10" fill="#da251d" />
      <path d="m10 4.6 1.3 3.9h4.1l-3.3 2.4 1.2 3.9L10 12.4l-3.3 2.4 1.2-3.9-3.3-2.4h4.1Z" fill="#ffcd00" />
    </svg>
  );
}

export function SiteHeader({ navigation }: { navigation: PublicNavigationItem[] }) {
  const site = useSiteData();
  const pathname = usePathname() ?? '/';
  const [menuOpen, setMenuOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement | null>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMenuOpen(false), [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        toggleRef.current?.focus();
      }
      if (e.key === 'Tab' && drawerRef.current) {
        const f = drawerRef.current.querySelectorAll<HTMLElement>('a,button');
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    document.body.dataset.lock = 'true';
    drawerRef.current?.querySelector<HTMLElement>('a,button')?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      delete document.body.dataset.lock;
    };
  }, [menuOpen]);

  const close = () => setMenuOpen(false);
  const renderItems = (className: string) =>
    navigation.map((item) => (
      <li key={`${item.href}-${item.label}`}>
        <Link
          href={item.href}
          className={className}
          aria-current={item.href.startsWith('/') && isActive(pathname, item.href) ? 'page' : undefined}
          onClick={close}
        >
          {item.label}
        </Link>
      </li>
    ));

  return (
    <header className="sh" id="top">
      <div className="sh__inner">
        <Link href="/" className="sh__brand" aria-label={site.name ? `${site.name} — Trang chủ` : 'Trang chủ'}>
          <BrandLogo />
        </Link>

        {navigation.length > 0 && <nav className="sh__nav" aria-label="Điều hướng chính">
          <ul>{renderItems('sh__link')}</ul>
        </nav>}

        <div className="sh__actions">
          <button type="button" className="sh__icon sh__search" aria-label="Tìm nơi lưu trú" onClick={() => focusSearch()}>
            <Search size={21} strokeWidth={2} aria-hidden="true" />
          </button>
          <span className="sh__lang" title="Sắp có tiếng Anh" aria-label="Ngôn ngữ: Tiếng Việt. Sắp có tiếng Anh.">
            <VnFlag /> <span aria-hidden="true">VN</span>
          </span>
          <Link href="/doi-tac?mode=login" className="sh__login">Đăng nhập</Link>
          <Link href="/doi-tac?mode=register" className="sh__register">Đăng ký</Link>
          <button
            type="button"
            className="sh__icon sh__menu"
            aria-label={menuOpen ? 'Đóng menu' : 'Mở menu'}
            aria-expanded={menuOpen}
            aria-controls="mobile-drawer"
            onClick={(e) => {
              toggleRef.current = e.currentTarget;
              setMenuOpen((v) => !v);
            }}
          >
            {menuOpen ? <X size={24} aria-hidden="true" /> : <Menu size={24} aria-hidden="true" />}
          </button>
        </div>
      </div>

      <div className="sd" data-open={menuOpen || undefined} aria-hidden={!menuOpen} onClick={(e) => e.target === e.currentTarget && close()}>
        <div ref={drawerRef} id="mobile-drawer" className="sd__panel" role="dialog" aria-modal="true" aria-label="Menu" inert={!menuOpen}>
          <div className="sd__head">
            <BrandLogo variant="drawer" />
            <button
              type="button"
              className="sh__icon"
              aria-label="Đóng menu"
              onClick={() => {
                close();
                toggleRef.current?.focus();
              }}
            >
              <X size={24} aria-hidden="true" />
            </button>
          </div>
          <ul className="sd__list">{renderItems('sd__link')}</ul>
          <div className="sd__account">
            <Link href="/doi-tac?mode=login" className="btn btn--outline" onClick={close}>Đăng nhập</Link>
            <Link href="/doi-tac?mode=register" className="btn btn--primary" onClick={close}>Đăng ký</Link>
          </div>
          <p className="sd__lang"><VnFlag /> Tiếng Việt <span>· Sắp có tiếng Anh</span></p>
        </div>
      </div>
    </header>
  );
}

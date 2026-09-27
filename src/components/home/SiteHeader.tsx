'use client';

import { ArrowRight, Menu, Search, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { LeafSprig, SmallLeaf } from '@/components/ui/Decor';
import { focusSearch } from '@/lib/events';
import { useSiteData } from '@/components/site/SiteDataProvider';
import type { PublicNavigationItem } from '@/lib/api/public';
import { publicSetting, publicText } from '@/lib/public-content';

const isActive = (path: string, href: string) =>
  href === '/' ? path === '/' : path === href || path.startsWith(`${href}/`);

export function SiteHeader({ navigation }: { navigation: PublicNavigationItem[] }) {
  const site = useSiteData();
  const header = publicSetting(site.publicSite, 'site.header');
  const ctaLabel = publicText(header.ctaLabel);
  const ctaTarget = publicText(header.ctaTarget);
  const mottoLine1 = publicText(header.mottoLine1);
  const mottoLine2 = publicText(header.mottoLine2);
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

  const renderItems = () =>
    navigation.map((item) => (
      <li key={item.href}>
        <Link
          href={item.href}
          className="nav__link"
          aria-current={item.href.startsWith('/') && isActive(pathname, item.href) ? 'page' : undefined}
          onClick={() => setMenuOpen(false)}
        >
          {item.label}
        </Link>
      </li>
    ));

  return (
    <header className="site-header" id="top">
      <LeafSprig className="site-header__decor" />
      <div className="site-header__inner">
        <Link href="/" className="site-header__brand" aria-label={site.name || undefined}>
          <BrandLogo />
        </Link>

        <nav className="nav" aria-label="Điều hướng chính">
          <ul className="nav__list">{renderItems()}</ul>
        </nav>

        <div className="site-header__aside">
          <SmallLeaf className="site-header__leaf" />
          {(mottoLine1 || mottoLine2) && <p className="site-header__motto">{mottoLine1 && <span>{mottoLine1}</span>}{mottoLine2 && <span>{mottoLine2}</span>}</p>}
        </div>

        <div className="site-header__actions">
          <button type="button" className="round-btn" aria-label="Tìm phòng" onClick={() => focusSearch()}>
            <Search size={17} strokeWidth={2.1} aria-hidden="true" />
          </button>
          {ctaLabel && ctaTarget && <Link href={ctaTarget} className="btn btn--primary btn--header btn-shine" data-magnetic>
            {ctaLabel} <ArrowRight size={16} strokeWidth={2.2} aria-hidden="true" />
          </Link>}
          <button
            type="button"
            className="round-btn menu-toggle"
            aria-label={menuOpen ? 'Đóng menu' : 'Mở menu'}
            aria-expanded={menuOpen}
            aria-controls="mobile-drawer"
            onClick={(e) => {
              toggleRef.current = e.currentTarget;
              setMenuOpen((v) => !v);
            }}
          >
            {menuOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
          </button>
        </div>
      </div>

      <button
        type="button"
        className="menu-float"
        data-open={menuOpen || undefined}
        aria-label={menuOpen ? 'Đóng menu' : 'Mở menu'}
        aria-expanded={menuOpen}
        aria-controls="mobile-drawer"
        onClick={(e) => {
          toggleRef.current = e.currentTarget;
          setMenuOpen((v) => !v);
        }}
      >
        {menuOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
        <span className="menu-float__label">Menu</span>
      </button>

      <div
        className="drawer"
        data-open={menuOpen || undefined}
        aria-hidden={!menuOpen}
        onClick={(e) => e.target === e.currentTarget && setMenuOpen(false)}
      >
        <div
          ref={drawerRef}
          id="mobile-drawer"
          className="drawer__panel"
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          inert={!menuOpen}
        >
          <div className="drawer__head">
            <BrandLogo />
            <button
              type="button"
              className="round-btn"
              aria-label="Đóng menu"
              onClick={() => {
                setMenuOpen(false);
                toggleRef.current?.focus();
              }}
            >
              <X size={20} aria-hidden="true" />
            </button>
          </div>
          <ul className="drawer__list">{renderItems()}</ul>
          {ctaLabel && ctaTarget && <Link href={ctaTarget} className="btn btn--primary drawer__cta" onClick={() => setMenuOpen(false)}>
            {ctaLabel} <ArrowRight size={16} aria-hidden="true" />
          </Link>}
          {(mottoLine1 || mottoLine2) && <p className="drawer__motto handwritten">{[mottoLine1, mottoLine2].filter(Boolean).join(' — ')}</p>}
        </div>
      </div>
    </header>
  );
}

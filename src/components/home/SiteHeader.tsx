'use client';

import { ArrowRight, Menu, Search, X } from 'lucide-react';
import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { LeafSprig, SmallLeaf } from '@/components/ui/Decor';
import { focusSearch, openDialog } from '@/lib/events';

type NavItem = { label: string; href: string } | { label: string; action: 'combo' };

const NAV: NavItem[] = [
  { label: 'Trang chủ', href: '#top' },
  { label: 'Phòng nghỉ', href: '#phong-nghi' },
  { label: 'Combo du lịch', action: 'combo' },
  { label: 'Điểm đến', href: '#diem-den' },
  { label: 'Liên hệ', href: '#lien-he' },
];

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [active, setActive] = useState('#top');
  const toggleRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Scroll-spy for the underline indicator.
  useEffect(() => {
    const ids = ['phong-nghi', 'diem-den', 'lien-he'];
    const onScroll = () => {
      let current = '#top';
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top < window.innerHeight * 0.35) current = `#${id}`;
      }
      if (window.scrollY < 40) current = '#top';
      setActive(current);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

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

  const onNav = (e: MouseEvent<HTMLAnchorElement>, href: string) => {
    setMenuOpen(false);
    if (href === '#top') {
      e.preventDefault();
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
      history.replaceState(null, '', ' ');
    }
  };

  const renderItems = (inDrawer: boolean) =>
    NAV.map((item) =>
      'href' in item ? (
        <li key={item.label}>
          <a
            href={item.href}
            className="nav__link"
            aria-current={active === item.href ? 'true' : undefined}
            onClick={(e) => onNav(e, item.href)}
          >
            {item.label}
          </a>
        </li>
      ) : (
        <li key={item.label}>
          <button
            type="button"
            className="nav__link"
            aria-haspopup="dialog"
            onClick={() => {
              if (inDrawer) setMenuOpen(false);
              openDialog({ type: 'combo' });
            }}
          >
            {item.label}
          </button>
        </li>
      ),
    );

  return (
    <header className="site-header" id="top">
      <LeafSprig className="site-header__decor" />
      <div className="site-header__inner">
        <a href="#top" className="site-header__brand" aria-label="Đinh Vân Booking — Trang chủ" onClick={(e) => onNav(e, '#top')}>
          <BrandLogo />
        </a>

        <nav className="nav" aria-label="Điều hướng chính">
          <ul className="nav__list">{renderItems(false)}</ul>
        </nav>

        <div className="site-header__aside">
          <SmallLeaf className="site-header__leaf" />
          <p className="site-header__motto">
            <span>Du lịch bản địa</span>
            <span>Kết nối những giá trị thật</span>
          </p>
        </div>

        <div className="site-header__actions">
          <button type="button" className="round-btn" aria-label="Tìm phòng" onClick={() => focusSearch()}>
            <Search size={17} strokeWidth={2.1} aria-hidden="true" />
          </button>
          <button type="button" className="btn btn--primary btn--header btn-shine" data-magnetic onClick={() => focusSearch()}>
            Đặt ngay <ArrowRight size={16} strokeWidth={2.2} aria-hidden="true" />
          </button>
          <button
            ref={toggleRef}
            type="button"
            className="round-btn menu-toggle"
            aria-label={menuOpen ? 'Đóng menu' : 'Mở menu'}
            aria-expanded={menuOpen}
            aria-controls="mobile-drawer"
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
          </button>
        </div>
      </div>

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
          <ul className="drawer__list">{renderItems(true)}</ul>
          <button
            type="button"
            className="btn btn--primary drawer__cta"
            onClick={() => {
              setMenuOpen(false);
              focusSearch();
            }}
          >
            Đặt ngay <ArrowRight size={16} aria-hidden="true" />
          </button>
          <p className="drawer__motto handwritten">Du lịch bản địa — Kết nối những giá trị thật</p>
        </div>
      </div>
    </header>
  );
}

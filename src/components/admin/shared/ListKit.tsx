'use client';

import { Search } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/**
 * Renders the page's main actions (e.g. "+ Tạo mới") in the top bar, on the same row as the page title,
 * so every screen has one header instead of a second card repeating the title.
 */
export function PageActions({ children }: { children: ReactNode }) {
  const [host, setHost] = useState<HTMLElement | null>(null);
  useEffect(() => { setHost(document.getElementById('admin-page-actions')); }, []);
  return host ? createPortal(children, host) : null;
}

export interface StatusTab {
  key: string;
  label: string;
  count?: number;
}

/** Card that holds one list: status tabs, a search/filter row, the rows and a footer. */
export function ListCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`alist ${className}`.trim()}>{children}</section>;
}

export function StatusTabs({ tabs, value, onChange, label = 'Lọc theo trạng thái' }: { tabs: StatusTab[]; value: string; onChange: (key: string) => void; label?: string }) {
  return (
    <div className="alist__tabs" role="tablist" aria-label={label}>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          role="tab"
          aria-selected={value === tab.key}
          className={`alist__tab${value === tab.key ? ' alist__tab--on' : ''}`}
          onClick={() => onChange(tab.key)}
        >
          {tab.label}
          {typeof tab.count === 'number' && <span className="alist__count">{tab.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function ListToolbar({ search, onSearch, placeholder, children }: { search: string; onSearch: (value: string) => void; placeholder: string; children?: ReactNode }) {
  return (
    <div className="alist__toolbar">
      <label className="alist__search">
        <Search size={16} aria-hidden="true" />
        <input type="search" value={search} onChange={(event) => onSearch(event.target.value)} placeholder={placeholder} aria-label={placeholder} />
      </label>
      {children}
    </div>
  );
}

export function ListFooter({ shown, total, unit, children }: { shown: number; total: number; unit: string; children?: ReactNode }) {
  return (
    <footer className="alist__foot">
      <span>Hiển thị {shown} / {total} {unit}</span>
      {children}
    </footer>
  );
}

/** Case- and accent-insensitive match for Vietnamese search boxes. */
export function foldText(value: string): string {
  return value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');
}

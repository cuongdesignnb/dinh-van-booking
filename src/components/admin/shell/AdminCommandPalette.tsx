'use client';

import { CornerDownLeft, ExternalLink, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useAdminSession } from '@/components/admin/AdminAuthGate';
import { ADMIN_NAV } from './AdminSidebar';

interface Entry {
  key: string;
  label: string;
  hint: string;
  href: string;
  external?: boolean;
  Icon: (typeof ADMIN_NAV)[number]['icon'];
}

const GROUP_LABEL: Record<string, string> = {
  operations: 'Vận hành',
  catalog: 'Sản phẩm',
  customers: 'Khách hàng',
  content: 'Website',
  system: 'Hệ thống',
};

const fold = (value: string) => value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');

/** Jump-to-page search for the admin (Ctrl/⌘ + K). Only lists pages the signed-in role may open. */
export function AdminCommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const { user } = useAdminSession();
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const entries = useMemo<Entry[]>(() => {
    const pages = ADMIN_NAV.filter((item) => user.permissions.includes(item.permission)).map((item) => ({
      key: item.href,
      label: item.label,
      hint: GROUP_LABEL[item.group] ?? '',
      href: item.href,
      Icon: item.icon,
    }));
    const site = ADMIN_NAV[0];
    return [...pages, { key: 'site', label: 'Xem website', hint: 'Mở trang công khai', href: '/', external: true, Icon: site.icon }];
  }, [user.permissions]);

  const results = useMemo(() => {
    const needle = fold(query.trim());
    if (!needle) return entries;
    return entries.filter((entry) => fold(`${entry.label} ${entry.hint}`).includes(needle));
  }, [entries, query]);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setCursor(0);
    const id = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [open]);

  useEffect(() => { setCursor(0); }, [query]);

  if (!open) return null;

  const go = (entry: Entry | undefined) => {
    if (!entry) return;
    onClose();
    if (entry.external) window.open(entry.href, '_blank', 'noopener,noreferrer');
    else router.push(entry.href);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') { event.preventDefault(); onClose(); }
    else if (event.key === 'ArrowDown') { event.preventDefault(); setCursor((value) => Math.min(value + 1, Math.max(results.length - 1, 0))); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); setCursor((value) => Math.max(value - 1, 0)); }
    else if (event.key === 'Enter') { event.preventDefault(); go(results[cursor]); }
  };

  return (
    <div className="acmd" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="acmd__panel" role="dialog" aria-modal="true" aria-label="Tìm nhanh trong quản trị" onKeyDown={onKeyDown}>
        <label className="acmd__search">
          <Search size={18} aria-hidden="true" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm trang: đặt phòng, đánh giá, nội dung…"
            aria-label="Tìm trang trong quản trị"
            autoComplete="off"
          />
          <kbd>Esc</kbd>
        </label>
        <ul className="acmd__list" role="listbox" aria-label="Kết quả">
          {results.length === 0 && <li className="acmd__empty">Không có trang nào khớp “{query}”.</li>}
          {results.map((entry, index) => {
            const Icon = entry.Icon;
            return (
              <li key={entry.key} role="option" aria-selected={index === cursor}>
                <button type="button" className={`acmd__item${index === cursor ? ' acmd__item--on' : ''}`} onMouseEnter={() => setCursor(index)} onClick={() => go(entry)}>
                  <span className="acmd__icon">{entry.external ? <ExternalLink size={16} aria-hidden="true" /> : <Icon size={16} aria-hidden="true" />}</span>
                  <span className="acmd__label">{entry.label}</span>
                  <small>{entry.hint}</small>
                  {index === cursor && <CornerDownLeft size={14} aria-hidden="true" />}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

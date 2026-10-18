'use client';

import { ChevronDown, ExternalLink, LogOut, Menu, Search } from 'lucide-react';
import { useRef, useState } from 'react';
import { Popover } from '@/components/ui/Popover';
import { useAdminSession } from '../AdminAuthGate';
import type { AdminPageMeta } from './page-meta';

const ROLE_LABELS: Record<string, string> = {
  owner: 'Quản trị viên',
  operator: 'Điều hành',
  editor: 'Biên tập viên',
  accountant: 'Kế toán',
  viewer: 'Chỉ xem',
};

export function AdminTopbar({ meta, onMenu, menuOpen, onSearch }: { meta: AdminPageMeta; onMenu: () => void; menuOpen?: boolean; onSearch?: () => void }) {
  const { user, logout } = useAdminSession();
  const userRef = useRef<HTMLButtonElement>(null);
  const [userOpen, setUserOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const initials = user.fullName
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((part) => part[0])
    .join('')
    .toLocaleUpperCase('vi-VN');
  const roles = user.roles.map((role) => ROLE_LABELS[role] ?? role).join(' · ') || 'Tài khoản quản trị';

  const handleLogout = async () => {
    setBusy(true);
    setLogoutError(null);
    try {
      await logout();
    } catch (error) {
      setLogoutError(error instanceof Error ? error.message : 'Không thể đăng xuất. Vui lòng thử lại.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <header className="atop">
      <div className="atop__bar">
        <button type="button" className="atop__menu" onClick={onMenu} aria-label="Mở menu quản trị" aria-controls="admin-sidebar" aria-expanded={!!menuOpen}>
          <Menu size={20} aria-hidden="true" />
        </button>
        {onSearch && (
          <button type="button" className="atop__command" onClick={onSearch} aria-label="Tìm nhanh trong quản trị">
            <Search size={16} aria-hidden="true" />
            <span>Tìm trang, chức năng…</span>
            <kbd>Ctrl K</kbd>
          </button>
        )}
        <a className="atop__site" href="/" target="_blank" rel="noreferrer">
          <ExternalLink size={16} aria-hidden="true" />
          <span>Xem website</span>
        </a>
        <button
          type="button"
          className="atop__user"
          ref={userRef}
          aria-haspopup="dialog"
          aria-expanded={userOpen}
          onClick={() => setUserOpen((value) => !value)}
        >
          <span className="atop__avatar" aria-hidden="true">{initials}</span>
          <span className="atop__user-text">
            <strong>{user.fullName}</strong>
            <small>{roles}</small>
          </span>
          <ChevronDown size={16} aria-hidden="true" />
        </button>
      </div>

      <div className="atop__head">
        <div className="atop__titles">
          <h1 className="atop__title">{meta.title}</h1>
          <p className="atop__subtitle">{meta.subtitle}</p>
        </div>
        {/* Screens portal their main actions here (see PageActions). */}
        <div className="atop__actions" id="admin-page-actions" />
      </div>

      <Popover anchorRef={userRef} open={userOpen} onClose={() => setUserOpen(false)} label="Tài khoản" id="admin-user" align="end">
        <div className="apop">
          <div className="apop__head">
            <strong>{user.fullName}</strong>
          </div>
          <p className="apop__muted">{user.email}</p>
          <p className="apop__note">{roles}. Mỗi thao tác đều được hệ thống kiểm tra quyền.</p>
          {logoutError && <p className="field__error" role="alert">{logoutError}</p>}
          <button type="button" className="ui-btn ui-btn--block apop__reset" onClick={() => void handleLogout()} disabled={busy}>
            <LogOut size={16} aria-hidden="true" />
            {busy ? 'Đang đăng xuất…' : 'Đăng xuất'}
          </button>
        </div>
      </Popover>
    </header>
  );
}

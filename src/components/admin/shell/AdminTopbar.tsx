'use client';

import { ChevronDown, ChevronRight, LogOut, Menu } from 'lucide-react';
import Link from 'next/link';
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

export function AdminTopbar({ meta, onMenu, menuOpen }: { meta: AdminPageMeta; onMenu: () => void; menuOpen?: boolean }) {
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
        <nav className="atop__crumbs" aria-label="Vị trí">
          <Link href="/admin">Quản trị</Link>
          {meta.section && <><ChevronRight size={14} aria-hidden="true" /><span>{meta.section}</span></>}
        </nav>
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

      <div className="atop__titles">
        <h1 className="atop__title">{meta.title}</h1>
        <p className="atop__subtitle">{meta.subtitle}</p>
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

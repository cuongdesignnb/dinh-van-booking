'use client';

import { ChevronDown, LogOut, Menu } from 'lucide-react';
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

export function AdminTopbar({ meta, onMenu }: { meta: AdminPageMeta; onMenu: () => void }) {
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
      <div className="atop__row">
        <button type="button" className="atop__menu icon-btn" onClick={onMenu} aria-label="Mở menu quản trị">
          <Menu size={20} aria-hidden="true" />
        </button>
        <div className="atop__titles">
          <h1 className="atop__title">
            <LeafGlyph />
            {meta.title}
          </h1>
          <p className="atop__subtitle">{meta.subtitle}</p>
        </div>

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

      <div className="atop__row atop__row--second">
        <p className="atop__script handwritten">
          {meta.script.split('\n').map((line) => (
            <span key={line}>{line}</span>
          ))}
        </p>
      </div>

      <Popover anchorRef={userRef} open={userOpen} onClose={() => setUserOpen(false)} label="Tài khoản" id="admin-user" align="end">
        <div className="apop">
          <div className="apop__head">
            <strong>{user.fullName}</strong>
          </div>
          <p className="apop__muted">{user.email}</p>
          <p className="apop__note">{roles}. Quyền thao tác được backend kiểm tra cho từng yêu cầu.</p>
          {logoutError && <p className="field__error" role="alert">{logoutError}</p>}
          <button type="button" className="abtn abtn--ghost apop__reset" onClick={() => void handleLogout()} disabled={busy}>
            <LogOut size={16} aria-hidden="true" />
            {busy ? 'Đang đăng xuất…' : 'Đăng xuất'}
          </button>
        </div>
      </Popover>
    </header>
  );
}

function LeafGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" className="atop__leaf">
      <path d="M21 3c-8 0-14 3.6-14 10a7 7 0 0 0 2 5l-3 3 1.4 1.4 3-3a7 7 0 0 0 5 2c6.4 0 10-6 10-14 0-2 0-4-.4-4z" fill="#7ba05b" opacity=".85" />
      <path d="M19 6C13 9 9.5 13 7.5 19" stroke="#2e6d3b" strokeWidth="1.3" fill="none" />
    </svg>
  );
}

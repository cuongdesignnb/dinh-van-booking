'use client';

import { createContext, FormEvent, useCallback, useContext, useEffect, useState } from 'react';
import Link from 'next/link';
import { ApiError, apiRequest } from '@/lib/api/client';

export interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  roles: string[];
  permissions: string[];
}

interface AdminSession {
  user: AdminUser;
  logout: () => Promise<void>;
}

const AdminSessionContext = createContext<AdminSession | null>(null);
const SESSION_CHECK_TIMEOUT_MS = 10_000;

export function useAdminSession() {
  const session = useContext(AdminSessionContext);
  if (!session) throw new Error('useAdminSession phải được dùng trong AdminAuthGate');
  return session;
}

export function AdminAuthGate({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [sessionAttempt, setSessionAttempt] = useState(0);

  const logout = useCallback(async () => {
    await apiRequest('/auth/logout', { method: 'POST' });
    setUser(null);
  }, []);

  useEffect(() => {
    const onExpired = () => {
      setUser(null);
      setChecking(false);
      setSessionError(null);
      setError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
    };
    window.addEventListener('dvb:auth-expired', onExpired);
    return () => window.removeEventListener('dvb:auth-expired', onExpired);
  }, []);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), SESSION_CHECK_TIMEOUT_MS);
    setChecking(true);
    setSessionError(null);
    void apiRequest<AdminUser>('/auth/me', { cache: 'no-store', signal: controller.signal })
      .then((current) => {
        if (!active) return;
        if (!current.roles.length || !current.permissions.length) {
          setUser(null);
          setError('Tài khoản này chưa được cấp quyền nhân sự quản trị. Đối tác vui lòng dùng Cổng đối tác.');
          return;
        }
        setUser(current);
        setError(null);
      })
      .catch((reason: unknown) => {
        if (!active) return;
        if (reason instanceof ApiError && reason.status === 401) return;
        setSessionError(reason instanceof Error && reason.name === 'AbortError'
          ? 'Máy chủ phản hồi quá lâu khi kiểm tra phiên quản trị.'
          : 'Không kiểm tra được phiên quản trị. Vui lòng kiểm tra kết nối rồi thử lại.');
      })
      .finally(() => {
        window.clearTimeout(timeout);
        if (active) setChecking(false);
      });
    return () => {
      active = false;
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [sessionAttempt]);

  const login = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await apiRequest<{ user: AdminUser }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      if (!result.user.roles.length || !result.user.permissions.length) {
        setUser(null);
        setError('Tài khoản này chưa được cấp quyền nhân sự quản trị. Đối tác vui lòng dùng Cổng đối tác.');
        return;
      }
      setUser(result.user);
      setPassword('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Đăng nhập không thành công.');
    } finally {
      setBusy(false);
    }
  };

  if (checking) {
    return (
      <section className="acard apending" aria-live="polite">
        Đang kiểm tra phiên quản trị…
      </section>
    );
  }

  if (sessionError) {
    return (
      <section className="acard admin-login" aria-labelledby="admin-session-error-title">
        <h1 id="admin-session-error-title">Không kết nối được quản trị</h1>
        <p className="field__error" role="alert">{sessionError}</p>
        <button className="abtn abtn--primary" type="button" onClick={() => setSessionAttempt((attempt) => attempt + 1)}>Thử kiểm tra lại</button>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="acard admin-login" aria-labelledby="admin-login-title">
        <h1 id="admin-login-title">Đăng nhập quản trị</h1>
        <p className="ahint">Sử dụng tài khoản được cấp trong hệ thống. Không có tài khoản mẫu trong trình duyệt.</p>
        <form className="admin-login__form" onSubmit={login}>
          <label className="field">
            <span className="field__label">Email</span>
            <input className="field__input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="username" />
          </label>
          <label className="field">
            <span className="field__label">Mật khẩu</span>
            <input className="field__input" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="current-password" />
          </label>
          {error && <p className="field__error" role="alert">{error}</p>}
          {error?.includes('Cổng đối tác') && <p><Link href="/doi-tac">Mở Cổng đối tác</Link></p>}
          <button className="abtn abtn--primary" type="submit" disabled={busy}>
            {busy ? 'Đang đăng nhập…' : 'Đăng nhập'}
          </button>
        </form>
      </section>
    );
  }

  return (
    <AdminSessionContext.Provider value={{ user, logout }}>
      {children}
    </AdminSessionContext.Provider>
  );
}

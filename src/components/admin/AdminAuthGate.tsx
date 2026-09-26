'use client';

import { FormEvent, useEffect, useState } from 'react';
import { ApiError, apiRequest } from '@/lib/api/client';

interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  roles: string[];
  permissions: string[];
}

export function AdminAuthGate({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onExpired = () => {
      setUser(null);
      setChecking(false);
      setError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
    };
    window.addEventListener('dvb:auth-expired', onExpired);
    return () => window.removeEventListener('dvb:auth-expired', onExpired);
  }, []);

  useEffect(() => {
    let active = true;
    apiRequest<AdminUser>('/auth/me')
      .then((current) => active && setUser(current))
      .catch((reason: unknown) => {
        if (!active) return;
        if (!(reason instanceof ApiError && reason.status === 401)) {
          setError(reason instanceof Error ? reason.message : 'Không thể kiểm tra phiên quản trị.');
        }
      })
      .finally(() => active && setChecking(false));
    return () => {
      active = false;
    };
  }, []);

  const login = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await apiRequest<{ user: AdminUser }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
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
          <button className="abtn abtn--primary" type="submit" disabled={busy}>
            {busy ? 'Đang đăng nhập…' : 'Đăng nhập'}
          </button>
        </form>
      </section>
    );
  }

  return <>{children}</>;
}

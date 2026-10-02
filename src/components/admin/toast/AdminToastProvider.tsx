'use client';

import { createContext, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ADMIN_TOAST_EVENT, type AdminToastEvent, type AdminToastTone } from '@/lib/admin-toast-events';

export type AdminToast = AdminToastEvent & { id: number };
export type AdminToastApi = Record<AdminToastTone, (message: string) => void>;
export const AdminToastContext = createContext<AdminToastApi | null>(null);

const timeoutFor: Record<AdminToastTone, number> = { success: 4000, info: 4000, warning: 6000, error: 8000 };

export function AdminToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<AdminToast[]>([]);
  const nextId = useRef(0);
  const timers = useRef(new Map<number, number>());

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer !== undefined) window.clearTimeout(timer);
    timers.current.delete(id);
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback((tone: AdminToastTone, message: string) => {
    if (!message.trim()) return;
    const id = ++nextId.current;
    setToasts((current) => [...current, { id, tone, message }].slice(-4));
    timers.current.set(id, window.setTimeout(() => dismiss(id), timeoutFor[tone]));
  }, [dismiss]);

  const api = useMemo<AdminToastApi>(() => ({
    success: (message) => push('success', message),
    error: (message) => push('error', message),
    warning: (message) => push('warning', message),
    info: (message) => push('info', message),
  }), [push]);

  useEffect(() => {
    const handle = (event: Event) => {
      const detail = (event as CustomEvent<AdminToastEvent>).detail;
      if (detail && ['success', 'error', 'warning', 'info'].includes(detail.tone)) push(detail.tone, detail.message);
    };
    window.addEventListener(ADMIN_TOAST_EVENT, handle);
    return () => window.removeEventListener(ADMIN_TOAST_EVENT, handle);
  }, [push]);

  useEffect(() => {
    const topbar = document.querySelector<HTMLElement>('.atop');
    if (!topbar) return;
    const updateHeight = () => document.documentElement.style.setProperty('--admin-topbar-height', `${Math.ceil(topbar.getBoundingClientRect().height)}px`);
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(topbar);
    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty('--admin-topbar-height');
    };
  }, []);

  useEffect(() => () => {
    timers.current.forEach((timer) => window.clearTimeout(timer));
    timers.current.clear();
  }, []);

  return <AdminToastContext.Provider value={api}>
    {children}
    <div className="admin-toast-stack" aria-live="polite" aria-relevant="additions text" aria-label="Thông báo quản trị">
      {toasts.map((toast) => <div className={`admin-toast admin-toast--${toast.tone}`} role={toast.tone === 'error' ? 'alert' : 'status'} key={toast.id}>
        <span className="admin-toast__message">{toast.message}</span>
        <button type="button" className="admin-toast__close" aria-label="Đóng thông báo" onClick={() => dismiss(toast.id)}>×</button>
      </div>)}
    </div>
  </AdminToastContext.Provider>;
}

'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { DEMO_RANGE, DEMO_TODAY } from '@/data/admin/fixture-clock';
import { buildAdminData } from '@/lib/admin/data';
import type { AdminData } from '@/lib/admin/types';
import type { Range } from '@/lib/admin/selectors';

const STORAGE_KEY = 'dvb:admin:v1';
const MAX_PERSIST_BYTES = 2_500_000;

export type Role = 'owner' | 'editor' | 'viewer';

export interface Toast {
  id: number;
  text: string;
  tone: 'success' | 'error' | 'info';
}

interface Ctx {
  data: AdminData;
  today: string;
  range: Range;
  setRange: (r: Range) => void;
  role: Role;
  setRole: (r: Role) => void;
  canEdit: boolean;
  /** Runs a demo mutation: returns an error message, or null on success. */
  commit: (label: string, updater: (draft: AdminData) => string | void, toast?: string | null) => Promise<string | null>;
  busy: string | null;
  toasts: Toast[];
  pushToast: (text: string, tone?: Toast['tone']) => void;
  dismissToast: (id: number) => void;
  reset: () => void;
  persisted: boolean;
}

const AdminContext = createContext<Ctx | null>(null);

/** Demo repository: validates, waits a beat and mutates the in-memory snapshot. */
export function AdminStoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AdminData>(() => buildAdminData());
  const [range, setRange] = useState<Range>(DEMO_RANGE);
  const [role, setRole] = useState<Role>('owner');
  const [busy, setBusy] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [persisted, setPersisted] = useState(false);
  const dataRef = useRef(data);
  dataRef.current = data;
  const toastId = useRef(0);

  // Restore demo edits after a reload (best effort; never blocks rendering).
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { version: number; data: AdminData };
        if (parsed.version === 1 && parsed.data?.bookings?.length) {
          dataRef.current = parsed.data;
          setData(parsed.data);
          setPersisted(true);
        }
      }
    } catch {
      /* private mode / blocked storage: keep the fixture snapshot */
    }
  }, []);

  const persist = useCallback((next: AdminData) => {
    try {
      const raw = JSON.stringify({ version: 1, data: next });
      if (raw.length > MAX_PERSIST_BYTES) return;
      window.localStorage.setItem(STORAGE_KEY, raw);
      setPersisted(true);
    } catch {
      /* quota or unavailable storage: the session keeps working in memory */
    }
  }, []);

  const pushToast = useCallback((text: string, tone: Toast['tone'] = 'success') => {
    const id = ++toastId.current;
    setToasts((t) => [...t, { id, text, tone }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tone === 'error' ? 6000 : 3600);
  }, []);

  const dismissToast = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const commit = useCallback<Ctx['commit']>(
    async (label, updater, toast = 'Đã lưu trong bản demo') => {
      if (role === 'viewer') {
        pushToast('Vai trò “Chỉ xem” không được phép thay đổi dữ liệu.', 'error');
        return 'no-permission';
      }
      setBusy(label);
      await new Promise((r) => window.setTimeout(r, 260));
      const draft: AdminData = structuredClone(dataRef.current);
      const result = updater(draft);
      setBusy(null);
      if (typeof result === 'string') {
        pushToast(result, 'error');
        return result;
      }
      dataRef.current = draft;
      setData(draft);
      persist(draft);
      if (toast) pushToast(toast);
      return null;
    },
    [persist, pushToast, role],
  );

  const reset = useCallback(() => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    const fresh = buildAdminData();
    dataRef.current = fresh;
    setData(fresh);
    setPersisted(false);
    pushToast('Đã khôi phục dữ liệu mẫu gốc', 'info');
  }, [pushToast]);

  const value = useMemo<Ctx>(
    () => ({
      data,
      today: DEMO_TODAY,
      range,
      setRange,
      role,
      setRole,
      canEdit: role !== 'viewer',
      commit,
      busy,
      toasts,
      pushToast,
      dismissToast,
      reset,
      persisted,
    }),
    [data, range, role, commit, busy, toasts, pushToast, dismissToast, reset, persisted],
  );

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin phải được dùng bên trong AdminStoreProvider');
  return ctx;
}

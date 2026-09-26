'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import type { AdminData } from '@/lib/admin/types';
import type { Range } from '@/lib/admin/selectors';

const todayKey = () => new Date().toISOString().slice(0, 10);

const EMPTY_DATA: AdminData = {
  properties: [],
  roomTypes: [],
  roomUnits: [],
  inventoryOverrides: [],
  rates: { weekendEnabled: false, weekendDays: [], seasonalEnabled: false, seasons: [] },
  bookings: [],
  payments: [],
  customers: [],
  inquiries: [],
  interactions: [],
  followUps: [],
  combos: [],
  destinations: [],
  articles: [],
  media: [],
  users: [],
  analytics: { visits: 0, visitsPrev: 0, contentViews: 0, contentViewsPrev: 0 },
};

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
  /** Compatibility surface for unfinished admin modules; never mutates local demo data. */
  commit: (label: string, updater: (draft: AdminData) => string | void, toast?: string | null) => Promise<string | null>;
  busy: string | null;
  toasts: Toast[];
  pushToast: (text: string, tone?: Toast['tone']) => void;
  dismissToast: (id: number) => void;
  reset: () => void;
  persisted: boolean;
}

const AdminContext = createContext<Ctx | null>(null);

export function AdminStoreProvider({ children }: { children: ReactNode }) {
  const [data] = useState<AdminData>(EMPTY_DATA);
  const today = todayKey();
  const [range, setRange] = useState<Range>({ from: today, to: today });
  const [role, setRole] = useState<Role>('owner');
  const [busy, setBusy] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);

  const pushToast = useCallback((text: string, tone: Toast['tone'] = 'success') => {
    const id = ++toastId.current;
    setToasts((t) => [...t, { id, text, tone }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tone === 'error' ? 6000 : 3600);
  }, []);

  const dismissToast = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const commit = useCallback<Ctx['commit']>(
    async (label) => {
      if (role === 'viewer') {
        pushToast('Vai trò “Chỉ xem” không được phép thay đổi dữ liệu.', 'error');
        return 'no-permission';
      }
      setBusy(label);
      setBusy(null);
      const message = `Tác vụ “${label}” chưa có endpoint API tương ứng; không ghi dữ liệu cục bộ.`;
      pushToast(message, 'error');
      return message;
    },
    [pushToast, role],
  );

  const reset = useCallback(() => {
    pushToast('Không có dữ liệu cục bộ để khôi phục. Hãy thao tác qua API quản trị.', 'info');
  }, [pushToast]);

  const value = useMemo<Ctx>(
    () => ({
      data,
      today,
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
      persisted: false,
    }),
    [data, today, range, role, commit, busy, toasts, pushToast, dismissToast, reset],
  );

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin phải được dùng bên trong AdminStoreProvider');
  return ctx;
}

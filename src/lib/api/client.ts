import { adminMutationSuccess, adminErrorToast, emitAdminToast } from '@/lib/admin-toast-events';

export class ApiError extends Error {
  readonly status: number;
  readonly payload: unknown;

  constructor(status: number, payload: unknown) {
    super(typeof payload === 'object' && payload && 'message' in payload ? String((payload as { message: unknown }).message) : `API request failed (${status})`);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

const browserBase = () => process.env.NEXT_PUBLIC_API_BASE_PATH || '/api/v1';

export const apiPath = (path: string) => `${browserBase()}${path}`;

function csrfCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const part = document.cookie.split('; ').find((value) => value.startsWith('dvb_csrf='));
  return part ? decodeURIComponent(part.slice('dvb_csrf='.length)) : null;
}

async function bootstrapCsrf(): Promise<void> {
  if (typeof window === 'undefined') return;
  const response = await fetch(`${browserBase()}/auth/csrf`, {
    method: 'GET',
    credentials: 'include',
    cache: 'no-store',
  });
  const text = await response.text();
  let payload: unknown = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }
  if (!response.ok) throw new ApiError(response.status, payload);
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = (init.method ?? 'GET').toUpperCase();
  const headers = new Headers(init.headers);
  // Let the browser set the multipart boundary for uploads. Setting JSON here
  // for FormData makes the media endpoint reject an otherwise valid image.
  const isFormData = typeof FormData !== 'undefined' && init.body instanceof FormData;
  if (init.body && !isFormData && !headers.has('content-type')) headers.set('content-type', 'application/json');
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const isPublicMutation = path === '/auth/login' || path === '/inquiries' || path === '/quotes' || path.startsWith('/quotes/');
    if (!csrfCookie() || isPublicMutation) {
      try { await bootstrapCsrf(); } catch (error) { emitAdminToast(adminErrorToast(error)); throw error; }
    }
    const csrf = csrfCookie();
    if (csrf) headers.set('x-csrf-token', csrf);
  }
  let response: Response;
  try {
    response = await fetch(`${browserBase()}${path}`, { ...init, headers, credentials: 'include' });
  } catch (error) {
    emitAdminToast(adminErrorToast(error));
    throw error;
  }
  const text = await response.text();
  let payload: unknown = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }
  if (!response.ok) {
    if (response.status === 401 && typeof window !== 'undefined' && !path.startsWith('/auth/login') && path !== '/auth/me') {
      window.dispatchEvent(new Event('dvb:auth-expired'));
    }
    const error = new ApiError(response.status, payload);
    emitAdminToast(adminErrorToast(error));
    throw error;
  }
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method) && !path.startsWith('/auth/')) {
    emitAdminToast({ tone: path.startsWith('/quotes') ? 'info' : 'success', message: adminMutationSuccess(path, method) });
  }
  return payload as T;
}

export async function serverApiRequest<T>(path: string): Promise<T | null> {
  const base = process.env.INTERNAL_API_BASE_URL || process.env.NEXT_PUBLIC_API_ORIGIN;
  if (!base) throw new ApiError(503, { message: 'API phía máy chủ chưa được cấu hình' });
  let response: Response;
  try {
    response = await fetch(`${base.replace(/\/$/, '')}${path}`, { cache: 'no-store' });
  } catch {
    throw new ApiError(503, { message: 'Dịch vụ nội dung đang tạm thời không khả dụng' });
  }
  const text = await response.text();
  let payload: unknown = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }
  if (!response.ok) throw new ApiError(response.status, payload);
  return payload as T;
}

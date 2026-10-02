export type AdminToastTone = 'success' | 'error' | 'warning' | 'info';
export type AdminToastEvent = { tone: AdminToastTone; message: string };
export const ADMIN_TOAST_EVENT = 'dvb:admin-toast';
type ApiErrorLike = { status: number; payload: unknown };

function isApiError(error: unknown): error is ApiErrorLike {
  return !!error && typeof error === 'object' && 'status' in error && typeof error.status === 'number' && 'payload' in error;
}

export function emitAdminToast(event: AdminToastEvent): void {
  if (typeof window === 'undefined' || !window.location.pathname.startsWith('/admin')) return;
  window.dispatchEvent(new CustomEvent<AdminToastEvent>(ADMIN_TOAST_EVENT, { detail: event }));
}

function backendMessage(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null;
  const source = value as { payload?: unknown; message?: unknown; problems?: unknown };
  const nested = source.payload && typeof source.payload === 'object'
    ? source.payload as { message?: unknown; problems?: unknown }
    : null;
  const payload = nested ?? source;
  const problems = Array.isArray(payload.problems) ? payload.problems.filter((item): item is string => typeof item === 'string') : [];
  if (problems.length) return `${typeof payload.message === 'string' ? payload.message : 'Không thể thực hiện thao tác'}: ${problems.join(' · ')}`;
  return typeof payload.message === 'string' && payload.message.trim() && !/^API request failed/i.test(payload.message)
    ? payload.message.trim()
    : null;
}

export function adminErrorToast(error: unknown): AdminToastEvent {
  if (isApiError(error)) {
    const businessMessage = backendMessage(error);
    if (error.status === 401) return { tone: 'error', message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' };
    if (error.status === 403) return { tone: 'error', message: 'Bạn không có quyền thực hiện thao tác này.' };
    if (error.status === 404) return { tone: 'error', message: businessMessage ?? 'Dữ liệu không còn tồn tại.' };
    if (error.status === 409) return { tone: 'warning', message: businessMessage ?? 'Dữ liệu đã thay đổi hoặc bị trùng. Hãy tải lại.' };
    if (error.status === 408 || error.status === 504) return { tone: 'error', message: 'Yêu cầu quá thời gian. Vui lòng thử lại.' };
    if (error.status === 502 || error.status === 503) return { tone: 'error', message: 'Dịch vụ tạm thời không khả dụng.' };
    if (error.status >= 500) return { tone: 'error', message: 'Hệ thống gặp lỗi. Vui lòng thử lại.' };
    return { tone: 'error', message: businessMessage ?? 'Dữ liệu chưa hợp lệ. Vui lòng kiểm tra lại.' };
  }
  if (error instanceof DOMException && error.name === 'AbortError') return { tone: 'error', message: 'Yêu cầu quá thời gian. Vui lòng thử lại.' };
  if (error instanceof TypeError || (error instanceof Error && /network|fetch/i.test(error.message))) {
    return { tone: 'error', message: 'Không kết nối được máy chủ.' };
  }
  return { tone: 'error', message: error instanceof Error ? error.message : 'Không thể hoàn tất thao tác.' };
}

export function adminMutationSuccess(path: string, method: string): string {
  const pathname = path.split('?')[0];
  if (pathname === '/navigation/primary') return method === 'DELETE' ? 'Đã khôi phục Menu mặc định.' : 'Đã lưu Menu.';
  if (pathname === '/media/upload') return 'Đã tải ảnh lên thư viện.';
  if (/^\/media\/[^/]+$/.test(pathname)) return method === 'DELETE' ? 'Đã xoá ảnh khỏi thư viện.' : 'Đã cập nhật thông tin ảnh.';
  if (/^\/settings(?:\/|$)/.test(pathname)) return 'Đã cập nhật cài đặt.';
  if (/^\/properties\/[^/]+\/rooms(?:\/[^/]+)?$/.test(pathname)) return method === 'POST' ? 'Đã tạo hạng phòng.' : 'Đã cập nhật hạng phòng.';
  if (pathname === '/properties') return 'Đã tạo nơi lưu trú.';
  if (/^\/properties\/[^/]+$/.test(pathname)) return method === 'DELETE' ? 'Đã xoá nơi lưu trú.' : 'Đã cập nhật nơi lưu trú.';
  if (pathname === '/content') return 'Đã tạo nội dung.';
  if (/^\/content\/[^/]+\/status$/.test(pathname)) return 'Đã cập nhật trạng thái nội dung.';
  if (/^\/content\/[^/]+$/.test(pathname)) return method === 'DELETE' ? 'Đã xoá nội dung.' : 'Đã lưu nội dung.';
  if (pathname === '/admin/bookings') return 'Đã tạo yêu cầu đặt phòng.';
  if (/^\/admin\/bookings\//.test(pathname)) return 'Đã cập nhật đặt phòng.';
  if (pathname === '/quotes') return 'Đã kiểm tra giá và tồn.';
  return 'Đã lưu thay đổi.';
}

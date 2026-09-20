import { fromKey } from '@/data/admin/fixture-clock';
import type { BookingStatus, InquiryStage, PaymentStatus, PublishingStatus } from './types';

/** VND is stored as an integer; never parse a formatted string back into maths. */
export const vnd = (n: number) => `${new Intl.NumberFormat('vi-VN').format(Math.round(n))}đ`;
export const vndShort = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)} triệu` : new Intl.NumberFormat('vi-VN').format(n);
export const num = (n: number) => new Intl.NumberFormat('vi-VN').format(n);

const WEEKDAY_SHORT = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
/** Fixed table: Intl weekday names differ between the server and the browser. */
export const weekdayShort = (key: string) => WEEKDAY_SHORT[fromKey(key).getDay()];

export const formatDate = (key: string) => {
  const d = fromKey(key);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};
export const formatDayMonth = (key: string) => formatDate(key).slice(0, 5);

/** `2024-11-15T09:24:00+07:00` → `09:24`. */
export const formatTime = (iso: string) => iso.slice(11, 16);
export const dateOf = (iso: string) => iso.slice(0, 10);

export const percent = (v: number, digits = 0) => `${v.toFixed(digits).replace('.', ',')}%`;

export const BOOKING_STATUS: Record<BookingStatus, { label: string; tone: string }> = {
  pending_confirmation: { label: 'Chờ xác nhận', tone: 'warning' },
  confirmed: { label: 'Đã xác nhận', tone: 'success' },
  checked_in: { label: 'Đang lưu trú', tone: 'info' },
  completed: { label: 'Hoàn tất', tone: 'neutral' },
  cancelled: { label: 'Đã hủy', tone: 'danger' },
};

export const PAYMENT_STATUS: Record<PaymentStatus, { label: string; tone: string }> = {
  unpaid: { label: 'Chưa thanh toán', tone: 'muted' },
  partially_paid: { label: 'Đã cọc', tone: 'warning' },
  paid: { label: 'Đã thanh toán', tone: 'success' },
  partially_refunded: { label: 'Hoàn một phần', tone: 'info' },
  refunded: { label: 'Đã hoàn tiền', tone: 'info' },
};

export const PUBLISHING: Record<PublishingStatus, { label: string; tone: string }> = {
  draft: { label: 'Bản nháp', tone: 'muted' },
  published: { label: 'Đang hiển thị', tone: 'success' },
  hidden: { label: 'Tạm ẩn', tone: 'neutral' },
};

export const STAGE: Record<InquiryStage, { label: string; tone: string }> = {
  new: { label: 'Mới nhận', tone: 'info' },
  consulting: { label: 'Đang tư vấn', tone: 'warning' },
  waiting: { label: 'Chờ phản hồi', tone: 'danger' },
  won: { label: 'Đã chốt', tone: 'success' },
};

export const CHANNEL_LABEL = {
  website: 'Website',
  facebook: 'Facebook',
  direct: 'Trực tiếp',
  booking_com: 'Booking.com',
  agoda: 'Agoda',
} as const;

export const SOURCE_LABEL = {
  website: 'Website',
  facebook: 'Facebook',
  zalo: 'Zalo',
  direct: 'Trực tiếp',
  referral: 'Giới thiệu',
} as const;

export const GROUP_LABEL = {
  family: 'Gia đình',
  couple: 'Cặp đôi',
  friends: 'Nhóm bạn',
  company: 'Công ty',
  solo: 'Cá nhân',
} as const;

export const KIND_LABEL = {
  homestay: 'Homestay',
  resort: 'Resort',
  lodge: 'Eco Lodge',
  bungalow: 'Bungalow',
  stilt: 'Nhà sàn',
} as const;

export const DEST_CATEGORY_LABEL = {
  nature: 'Thiên nhiên',
  culture: 'Văn hóa',
  food: 'Ẩm thực',
  checkin: 'Check-in',
} as const;

/** Initials fallback for avatars (no photo is ever invented for a person). */
export const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

/** Diacritic-insensitive search key (display text keeps its accents). */
export const searchKey = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();

/** Timestamps inside the demo are compared to the frozen demo clock. */
export function relativeDay(key: string, today: string) {
  if (key === today) return 'Hôm nay';
  const d = fromKey(key).getTime() - fromKey(today).getTime();
  const days = Math.round(d / 86400000);
  if (days === -1) return 'Hôm qua';
  if (days === 1) return 'Ngày mai';
  return formatDayMonth(key);
}

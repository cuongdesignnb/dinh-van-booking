import { BadRequestException } from '@nestjs/common';
import { cleanMessageBody, isValidVietnamesePhone, normalizePhone } from '../chat/chat-text';

export const MAX_REVIEW_PHOTOS = 5;
export const REVIEW_BODY_MIN = 20;
export const REVIEW_BODY_MAX = 2000;
export const REJECT_REASONS = ['spam', 'inappropriate', 'off_topic', 'personal_data', 'other'] as const;
export type RejectReason = (typeof REJECT_REASONS)[number];

export interface ReviewSubmission {
  stay: string;
  rating: number;
  name: string;
  phone: string;
  body: string;
  stayedAt: Date | null;
  source: 'website' | 'invite';
}

const field = (fields: Record<string, string>, key: string) => (typeof fields[key] === 'string' ? fields[key] : '');

/**
 * Validates the text fields of a guest review. Throws a 400 with a message the
 * visitor can act on; a filled honeypot is reported separately so the caller
 * can drop the request without telling a bot why.
 */
export function parseReviewFields(fields: Record<string, string>, now = new Date()): { honeypot: boolean; value: ReviewSubmission } {
  const honeypot = field(fields, 'website').trim().length > 0;
  const stay = field(fields, 'stay').trim();
  if (!/^[a-z0-9-]{1,160}$/.test(stay)) throw new BadRequestException('Không xác định được nơi lưu trú cần đánh giá');

  const rating = Number(field(fields, 'rating'));
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new BadRequestException('Hãy chọn từ 1 đến 5 sao');

  const name = field(fields, 'name').replace(/\s+/g, ' ').trim();
  if (name.length < 2 || name.length > 60) throw new BadRequestException('Tên cần từ 2 đến 60 ký tự');
  if (/https?:|www\.|[<>]/i.test(name)) throw new BadRequestException('Tên không được chứa liên kết hoặc ký tự đặc biệt');

  const phone = normalizePhone(field(fields, 'phone'));
  if (!isValidVietnamesePhone(phone)) throw new BadRequestException('Số điện thoại chưa đúng định dạng');

  const body = cleanMessageBody(field(fields, 'body'), REVIEW_BODY_MAX);
  if (body.length < REVIEW_BODY_MIN) throw new BadRequestException(`Nội dung đánh giá cần ít nhất ${REVIEW_BODY_MIN} ký tự`);

  if (field(fields, 'consent') !== 'true') throw new BadRequestException('Hãy đồng ý cho hiển thị tên và đánh giá trước khi gửi');

  let stayedAt: Date | null = null;
  const month = field(fields, 'stayedMonth').trim();
  if (month) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new BadRequestException('Tháng lưu trú không hợp lệ');
    stayedAt = new Date(`${month}-01T00:00:00.000Z`);
    const latest = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
    if (stayedAt.getTime() > latest) throw new BadRequestException('Tháng lưu trú không thể ở tương lai');
    if (stayedAt.getUTCFullYear() < now.getUTCFullYear() - 5) throw new BadRequestException('Tháng lưu trú quá xa');
  }

  return {
    honeypot,
    value: { stay, rating, name, phone, body, stayedAt, source: field(fields, 'source') === 'invite' ? 'invite' : 'website' },
  };
}

/** New average and count of approved reviews, rounded like the decimal(3,2) column. */
export function ratingSummary(ratings: readonly number[]): { average: number | null; count: number } {
  if (!ratings.length) return { average: null, count: 0 };
  const sum = ratings.reduce((total, value) => total + value, 0);
  return { average: Math.round((sum / ratings.length) * 100) / 100, count: ratings.length };
}

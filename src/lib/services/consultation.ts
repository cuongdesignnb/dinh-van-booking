import { apiRequest, ApiError } from '@/lib/api/client';

export interface ConsultationDraft {
  name: string;
  phone: string;
  email?: string;
  checkIn: string | null;
  checkOut?: string | null;
  adults: number | null;
  children: number | null;
  rooms: number | null;
  message: string;
  context: ConsultationContext | null;
}

export interface ConsultationContext {
  intent: 'stay' | 'combo' | 'destination';
  id: string;
  label: string;
  roomTypeId?: string;
  roomLabel?: string;
}

export type ConsultationResult = { status: 'submitted'; id: string } | { status: 'error'; message: string; definitive: boolean };

export interface ConsultationAdapter {
  submit(draft: ConsultationDraft, idempotencyKey: string): Promise<ConsultationResult>;
}

/** A success is returned only after the API transaction commits the inquiry. */
export const apiAdapter: ConsultationAdapter = {
  async submit(draft, idempotencyKey) {
    try {
      const result = await apiRequest<{ id: string }>('/inquiries', {
        method: 'POST',
        headers: { 'idempotency-key': idempotencyKey },
        body: JSON.stringify({
          name: draft.name,
          phone: draft.phone,
          email: draft.email,
          checkIn: draft.checkIn ?? undefined,
          checkOut: draft.checkOut ?? undefined,
          adults: draft.adults ?? undefined,
          children: draft.children ?? undefined,
          rooms: draft.rooms ?? undefined,
          message: draft.message,
          intent: draft.context?.intent,
          relatedSlug: draft.context?.id || undefined,
          roomTypeId: draft.context?.roomTypeId,
        }),
      });
      return { status: 'submitted', id: result.id };
    } catch (error) {
      if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
        return { status: 'error', message: error.message || 'Thông tin chưa hợp lệ.', definitive: [400, 413, 422].includes(error.status) };
      }
      return { status: 'error', message: 'Chưa nhận được xác nhận từ máy chủ. Yêu cầu có thể đã được ghi nhận; hãy thử lại đúng thông tin để nhận kết quả.', definitive: false };
    }
  },
};

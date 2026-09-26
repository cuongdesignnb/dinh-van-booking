import { apiRequest, ApiError } from '@/lib/api/client';

export interface ConsultationDraft {
  name: string;
  phone: string;
  email?: string;
  checkIn: string | null;
  checkOut?: string | null;
  adults: number | null;
  children: number | null;
  message: string;
  context: { intent: 'stay' | 'combo' | 'destination'; id: string; label: string } | null;
}

export type ConsultationResult = { status: 'submitted'; id: string } | { status: 'error'; message: string };

export interface ConsultationAdapter {
  submit(draft: ConsultationDraft): Promise<ConsultationResult>;
}

/** A success is returned only after the API transaction commits the inquiry. */
export const apiAdapter: ConsultationAdapter = {
  async submit(draft) {
    try {
      const result = await apiRequest<{ id: string }>('/inquiries', {
        method: 'POST',
        body: JSON.stringify({
          name: draft.name,
          phone: draft.phone,
          email: draft.email,
          checkIn: draft.checkIn ?? undefined,
          checkOut: draft.checkOut ?? undefined,
          adults: draft.adults ?? undefined,
          children: draft.children ?? undefined,
          message: draft.message,
          intent: draft.context?.intent,
          relatedSlug: draft.context?.id || undefined,
        }),
      });
      return { status: 'submitted', id: result.id };
    } catch (error) {
      if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
        return { status: 'error', message: error.message || 'Thông tin chưa hợp lệ.' };
      }
      return { status: 'error', message: 'Không thể gửi yêu cầu lúc này. Vui lòng thử lại sau.' };
    }
  },
};

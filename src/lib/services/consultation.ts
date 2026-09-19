/**
 * Consultation adapter. There is no backend yet, so the demo adapter only
 * validates on the client and returns a *preview* — it never sends data
 * anywhere and never reports success. Replace `demoAdapter` with a real API
 * adapter when one is commissioned; only a confirmed server response may move
 * the UI to `submitted`.
 */
export interface ConsultationDraft {
  name: string;
  phone: string;
  checkIn: string | null;
  adults: number | null;
  children: number | null;
  message: string;
  context: { intent: 'stay' | 'combo' | 'destination'; id: string; label: string } | null;
}

export type ConsultationResult = { status: 'preview' } | { status: 'error'; message: string };

export interface ConsultationAdapter {
  submit(draft: ConsultationDraft): Promise<ConsultationResult>;
}

export const demoAdapter: ConsultationAdapter = {
  async submit() {
    return { status: 'preview' };
  },
};

/** Deterministic failure for testing the error state (?demo=adapter-error). */
export const failingAdapter: ConsultationAdapter = {
  async submit() {
    return { status: 'error', message: 'Chưa kiểm tra được thông tin lúc này. Dữ liệu bạn nhập vẫn được giữ nguyên.' };
  },
};

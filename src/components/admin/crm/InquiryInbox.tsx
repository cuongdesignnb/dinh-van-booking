'use client';

import { useEffect, useState } from 'react';
import { ApiError, apiRequest } from '@/lib/api/client';

type Stage = 'new' | 'contacted' | 'quoted' | 'won' | 'lost';
type Inquiry = {
  id: string;
  customer: { name: string; phone: string | null; email: string | null };
  intent: string | null;
  desiredCheckIn: string | null;
  desiredCheckOut: string | null;
  adults: number;
  children: number;
  message: string | null;
  stage: Stage;
  priority: boolean;
  version: number;
  createdAt: string;
};

const STAGES: Array<{ id: Stage; label: string }> = [
  { id: 'new', label: 'Mới' },
  { id: 'contacted', label: 'Đã liên hệ' },
  { id: 'quoted', label: 'Đã báo giá' },
  { id: 'won', label: 'Chốt' },
  { id: 'lost', label: 'Không thành' },
];

export function InquiryInbox() {
  const [items, setItems] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiRequest<{ items: Inquiry[]; total: number }>('/inquiries?page=1&pageSize=100');
      setItems(result.items);
    } catch (reason) {
      setError(reason instanceof ApiError && reason.status === 403 ? 'Tài khoản không có quyền xem CRM.' : reason instanceof Error ? reason.message : 'Không tải được yêu cầu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const updateStage = async (item: Inquiry, stage: Stage) => {
    setBusy(item.id);
    setError(null);
    try {
      const updated = await apiRequest<Inquiry>('/inquiries/' + encodeURIComponent(item.id), {
        method: 'PATCH',
        body: JSON.stringify({ stage, expectedVersion: item.version }),
      });
      setItems((current) => current.map((entry) => (entry.id === updated.id ? updated : entry)));
    } catch (reason) {
      setError(reason instanceof ApiError && reason.status === 409 ? 'Yêu cầu vừa được cập nhật ở nơi khác. Hãy tải lại.' : reason instanceof Error ? reason.message : 'Không cập nhật được trạng thái.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="crm">
      <div className="settings-screen__head">
        <div>
          <h2>Yêu cầu tư vấn</h2>
          <p className="ahint">Danh sách được đọc trực tiếp từ PostgreSQL qua API CRM; không có bản ghi khởi tạo trên trình duyệt.</p>
        </div>
        <button type="button" className="abtn abtn--ghost" onClick={() => void load()} disabled={loading || !!busy}>Tải lại</button>
      </div>
      {error && <p className="settings-screen__message settings-screen__message--error" role="alert">{error}</p>}
      {loading ? <div className="acard apending">Đang tải yêu cầu…</div> : !items.length ? <div className="acard apending">Chưa có yêu cầu tư vấn.</div> : (
        <div className="settings-screen__list">
          {items.map((item) => (
            <article className="acard settings-item" key={item.id}>
              <div className="settings-item__head">
                <div>
                  <h3>{item.customer.name}</h3>
                  <p className="ahint">{item.customer.phone ?? 'Chưa có số điện thoại'}{item.customer.email ? ' · ' + item.customer.email : ''}</p>
                </div>
                <time className="settings-item__meta" dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString('vi-VN')}</time>
              </div>
              <p><strong>Nhu cầu:</strong> {item.intent ?? 'tư vấn chung'} · {item.desiredCheckIn ?? 'chưa chọn ngày'}{item.desiredCheckOut ? ' → ' + item.desiredCheckOut : ''} · {item.adults} người lớn, {item.children} trẻ em</p>
              {item.message && <p className="inquiry-message">{item.message}</p>}
              <label className="field">
                <span className="field__label">Trạng thái</span>
                <select className="field__input" value={item.stage} disabled={busy === item.id} onChange={(event) => void updateStage(item, event.target.value as Stage)}>
                  {STAGES.map((stage) => <option key={stage.id} value={stage.id}>{stage.label}</option>)}
                </select>
              </label>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

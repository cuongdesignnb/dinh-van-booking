'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { ApiError, apiRequest } from '@/lib/api/client';
import type { Selection } from '@/lib/selection';

type AvailabilityItem = {
  propertyId: string;
  roomTypeId: string;
  name: string;
  roomTypeName: string;
  area: string;
  excerpt?: string | null;
  path: string;
  cover: { url: string; alt: string | null; width?: number | null; height?: number | null } | null;
  status: 'available' | 'stale' | 'needs_check' | 'sold_out';
  requestVerification: boolean;
  priceMode: 'contact' | 'published_rate';
  lastConfirmedAt: string | null;
  checkIn: string;
  checkOut: string;
  nights: number;
  quantity: number;
};
type SearchResponse = { enabled: boolean; items: AvailabilityItem[]; generatedAt: string; checkIn?: string; checkOut?: string };

function businessToday() {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const pick = (type: string) => parts.find((part) => part.type === type)?.value ?? '00';
  return `${pick('year')}-${pick('month')}-${pick('day')}`;
}

function shiftDay(value: string, days: number) {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('vi-VN', { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${value}T00:00:00.000Z`));
}

function errorText(error: unknown) {
  if (error instanceof ApiError) {
    const payload = error.payload as { message?: unknown } | null;
    return typeof payload?.message === 'string' ? payload.message : error.message;
  }
  return error instanceof Error ? error.message : 'Chưa thể tra cứu lúc này. Vui lòng thử lại.';
}

const statusLabel: Record<AvailabilityItem['status'], string> = {
  available: 'Có quỹ phù hợp theo lần xác nhận gần nhất',
  stale: 'Cần cơ sở xác nhận lại',
  needs_check: 'Đang cần quản trị viên kiểm tra',
  sold_out: 'Chưa có quỹ phù hợp cho toàn bộ kỳ nghỉ',
};

export function AvailabilitySearch({ initialSelection }: { initialSelection?: Selection }) {
  const [checkIn, setCheckIn] = useState(() => initialSelection?.checkIn ?? businessToday());
  const [checkOut, setCheckOut] = useState(() => initialSelection?.checkOut ?? shiftDay(initialSelection?.checkIn ?? businessToday(), 1));
  const [items, setItems] = useState<AvailabilityItem[]>([]);
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [searched, setSearched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    if (checkOut <= checkIn) { setError('Ngày trả phòng phải sau ngày nhận phòng.'); return; }
    const data = new FormData(event.currentTarget);
    const params = new URLSearchParams({
      checkIn, checkOut,
      rooms: String(data.get('rooms') ?? '1'),
      adults: String(data.get('adults') ?? '2'),
      children: String(data.get('children') ?? '0'),
    });
    const area = String(data.get('area') ?? '').trim();
    const kind = String(data.get('kind') ?? '');
    if (area) params.set('area', area);
    if (kind) params.set('kind', kind);
    setBusy(true);
    try {
      const response = await apiRequest<SearchResponse>(`/public/availability?${params.toString()}`, { cache: 'no-store' });
      setItems(response.items);
      setEnabled(response.enabled);
      setSearched(true);
    } catch (reason) {
      setItems([]);
      setError(errorText(reason));
      setSearched(true);
    } finally { setBusy(false); }
  };

  return <div className="availability-shell">
    <header className="availability-heading"><span className="availability-eyebrow">Tra cứu theo từng đêm</span><h1>Tìm nơi nghỉ phù hợp</h1><p>Chọn ngày nhận và trả phòng để kiểm tra các cơ sở tham gia đã được duyệt. Kết quả không thay thế xác nhận cuối cùng với cơ sở.</p></header>
    <section className="availability-card" aria-labelledby="availability-form-title">
      <h2 id="availability-form-title">Nhu cầu lưu trú</h2>
      <form className="availability-form" onSubmit={(event) => void submit(event)}>
        <label>Ngày nhận phòng<input type="date" name="checkIn" value={checkIn} min={businessToday()} onChange={(event) => { setCheckIn(event.target.value); if (event.target.value >= checkOut) setCheckOut(shiftDay(event.target.value, 1)); }} required /></label>
        <label>Ngày trả phòng<input type="date" name="checkOut" value={checkOut} min={shiftDay(checkIn, 1)} onChange={(event) => setCheckOut(event.target.value)} required /></label>
        <label>Số phòng<input type="number" name="rooms" min="1" max="5" defaultValue={initialSelection?.rooms ?? 1} required /></label>
        <label>Người lớn<input type="number" name="adults" min="1" max="20" defaultValue={initialSelection?.adults ?? 2} required /></label>
        <label>Trẻ em<input type="number" name="children" min="0" max="12" defaultValue={initialSelection?.children ?? 0} required /></label>
        <label>Khu vực<input type="text" name="area" maxLength={80} placeholder="Ví dụ: Cúc Phương" /></label>
        <label>Loại lưu trú<select name="kind" defaultValue=""><option value="">Tất cả loại hình</option><option value="homestay">Homestay</option><option value="hotel">Khách sạn</option><option value="resort">Khu nghỉ dưỡng</option><option value="villa">Villa</option></select></label>
        <button type="submit" disabled={busy}>{busy ? 'Đang kiểm tra…' : 'Kiểm tra tình trạng phòng'}</button>
      </form>
      {error && <p className="availability-error" role="alert">{error}</p>}
      {enabled === false && <p className="availability-empty" role="status">Tra cứu tình trạng phòng đang tạm đóng. Bạn vẫn có thể liên hệ để được hỗ trợ trực tiếp.</p>}
    </section>

    {searched && enabled !== false && <section className="availability-results" aria-live="polite">
      <div className="availability-results__heading"><div><h2>Kết quả tra cứu</h2><p>{formatDate(checkIn)} – {formatDate(checkOut)} · {items[0]?.nights ?? Math.round((new Date(`${checkOut}T00:00:00Z`).getTime() - new Date(`${checkIn}T00:00:00Z`).getTime()) / 86_400_000)} đêm</p></div><span>{items.length} kết quả</span></div>
      {items.length === 0 ? <div className="availability-empty"><strong>Chưa tìm thấy cơ sở phù hợp</strong><p>Thử đổi ngày hoặc khu vực, hoặc gửi yêu cầu để được kiểm tra thêm.</p><Link href="/lien-he">Nhờ tư vấn</Link></div> : <div className="availability-list">{items.map((item) => <article className="availability-result" key={`${item.propertyId}:${item.roomTypeId}`}>
        {item.cover ? <Image src={item.cover.url} alt={item.cover.alt ?? ''} width={item.cover.width ?? 480} height={item.cover.height ?? 320} unoptimized /> : <div className="availability-result__placeholder" aria-hidden="true">Đinh Vân Booking</div>}
        <div className="availability-result__content"><span className={`availability-status is-${item.status}`}>{statusLabel[item.status]}</span><h3>{item.name}</h3><p>{item.roomTypeName} · {item.area}</p>{item.excerpt && <p className="availability-result__excerpt">{item.excerpt}</p>}
          <small>{item.priceMode === 'contact' ? 'Giá cần xác nhận trực tiếp với cơ sở' : 'Giá công khai cần được kiểm tra lại khi đặt'}{item.lastConfirmedAt ? ` · Cập nhật tồn ${new Date(item.lastConfirmedAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}` : ''}</small>
        </div><Link href={item.path}>Xem cơ sở</Link>
      </article>)}</div>}
      <p className="availability-disclaimer">Tình trạng phản ánh quỹ phòng mà cơ sở đã cập nhật cho toàn bộ kỳ nghỉ; hãy xác nhận lại trước khi chốt. Hệ thống không hiển thị số phòng nội bộ và chưa xác nhận giao dịch đặt chỗ.</p>
    </section>}
  </div>;
}

'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, BedDouble, CalendarDays, MapPin, Search, Users } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { StateBlock, StatusPill, type Tone } from '@/components/ui/system';
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

/** Plain-language status: label for the pill, one sentence of guidance, tone for colour. */
const STATUS: Record<AvailabilityItem['status'], { label: string; hint: string; tone: Tone }> = {
  available: { label: 'Còn phòng', hint: 'Còn phòng cho cả kỳ nghỉ theo lần cập nhật gần nhất.', tone: 'success' },
  stale: { label: 'Cần xác nhận', hint: 'Cơ sở cần xác nhận lại trước khi giữ phòng.', tone: 'warning' },
  needs_check: { label: 'Đang kiểm tra', hint: 'Chúng tôi đang kiểm tra lại, liên hệ để được báo nhanh.', tone: 'info' },
  sold_out: { label: 'Hết phòng', hint: 'Không còn đủ phòng cho cả kỳ nghỉ đã chọn.', tone: 'danger' },
};
const STATUS_ORDER: AvailabilityItem['status'][] = ['available', 'stale', 'needs_check', 'sold_out'];

function nightsBetween(checkIn: string, checkOut: string) {
  return Math.max(0, Math.round((new Date(`${checkOut}T00:00:00Z`).getTime() - new Date(`${checkIn}T00:00:00Z`).getTime()) / 86_400_000));
}

export function AvailabilitySearch({ initialSelection }: { initialSelection?: Selection }) {
  const [checkIn, setCheckIn] = useState(() => initialSelection?.checkIn ?? businessToday());
  const [checkOut, setCheckOut] = useState(() => initialSelection?.checkOut ?? shiftDay(initialSelection?.checkIn ?? businessToday(), 1));
  const [items, setItems] = useState<AvailabilityItem[]>([]);
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [searched, setSearched] = useState(false);
  const [searchedRange, setSearchedRange] = useState<{ checkIn: string; checkOut: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<AvailabilityItem['status'] | 'all'>('all');

  const nights = nightsBetween(checkIn, checkOut);
  const counts = useMemo(() => {
    const result: Record<AvailabilityItem['status'], number> = { available: 0, stale: 0, needs_check: 0, sold_out: 0 };
    for (const item of items) result[item.status] += 1;
    return result;
  }, [items]);
  const visible = statusFilter === 'all' ? items : items.filter((item) => item.status === statusFilter);

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
      setSearchedRange({ checkIn, checkOut });
      setStatusFilter('all');
    } catch (reason) {
      setItems([]);
      setError(errorText(reason));
      setSearched(true);
      setSearchedRange(null);
    } finally { setBusy(false); }
  };

  const range = searchedRange ?? { checkIn, checkOut };

  return <div className="availability-shell">
    <header className="availability-heading">
      <span className="ui-eyebrow">Tra cứu phòng trống</span>
      <h1>Tìm nơi nghỉ còn phòng</h1>
      <p>Chọn ngày ở và số khách, chúng tôi sẽ cho bạn biết cơ sở nào còn phòng cho cả kỳ nghỉ.</p>
    </header>

    <section className="availability-card" aria-labelledby="availability-form-title">
      <h2 id="availability-form-title" className="ui-visually-hidden">Nhu cầu lưu trú</h2>
      <form className="availability-form" onSubmit={(event) => void submit(event)}>
        <fieldset className="avl-group avl-group--dates">
          <legend><CalendarDays size={16} aria-hidden="true" /> Ngày ở</legend>
          <div className="avl-dates">
            <label className="ui-field"><span>Nhận phòng</span><input className="ui-input" type="date" name="checkIn" value={checkIn} min={businessToday()} onChange={(event) => { setCheckIn(event.target.value); if (event.target.value >= checkOut) setCheckOut(shiftDay(event.target.value, 1)); }} required /></label>
            <span className="avl-nights" aria-live="polite">{nights > 0 ? `${nights} đêm` : '—'}</span>
            <label className="ui-field"><span>Trả phòng</span><input className="ui-input" type="date" name="checkOut" value={checkOut} min={shiftDay(checkIn, 1)} onChange={(event) => setCheckOut(event.target.value)} required /></label>
          </div>
        </fieldset>
        <fieldset className="avl-group avl-group--guests">
          <legend><Users size={16} aria-hidden="true" /> Khách &amp; phòng</legend>
          <div className="avl-guests">
            <label className="ui-field"><span>Số phòng</span><input className="ui-input" type="number" inputMode="numeric" name="rooms" min="1" max="5" defaultValue={initialSelection?.rooms ?? 1} required /></label>
            <label className="ui-field"><span>Người lớn</span><input className="ui-input" type="number" inputMode="numeric" name="adults" min="1" max="20" defaultValue={initialSelection?.adults ?? 2} required /></label>
            <label className="ui-field"><span>Trẻ em</span><input className="ui-input" type="number" inputMode="numeric" name="children" min="0" max="12" defaultValue={initialSelection?.children ?? 0} required /></label>
          </div>
        </fieldset>
        <fieldset className="avl-group avl-group--where">
          <legend><MapPin size={16} aria-hidden="true" /> Nơi ở</legend>
          <div className="avl-where">
            <label className="ui-field"><span>Khu vực</span><input className="ui-input" type="text" name="area" maxLength={80} placeholder="Ví dụ: Cúc Phương" /></label>
            <label className="ui-field"><span>Loại lưu trú</span><select className="ui-select" name="kind" defaultValue=""><option value="">Tất cả</option><option value="homestay">Homestay</option><option value="hotel">Khách sạn</option><option value="resort">Khu nghỉ dưỡng</option><option value="villa">Villa</option></select></label>
          </div>
        </fieldset>
        <button type="submit" className="ui-btn ui-btn--primary ui-btn--lg avl-submit" disabled={busy}>
          <Search size={18} aria-hidden="true" />{busy ? 'Đang kiểm tra…' : 'Kiểm tra tình trạng phòng'}
        </button>
      </form>
      {error && <p className="ui-alert ui-tone-danger avl-message" role="alert">{error}</p>}
      {enabled === false && <p className="ui-alert ui-tone-neutral avl-message" role="status">Tra cứu tình trạng phòng đang tạm đóng. Bạn vẫn có thể liên hệ để được hỗ trợ trực tiếp.</p>}
    </section>

    {!searched && <ol className="avl-howto" aria-label="Cách tra cứu">
      <li><span aria-hidden="true">1</span><div><strong>Chọn ngày ở</strong><p>Ngày nhận và trả phòng, tối thiểu 1 đêm.</p></div></li>
      <li><span aria-hidden="true">2</span><div><strong>Cho biết số khách</strong><p>Số phòng, người lớn và trẻ em đi cùng.</p></div></li>
      <li><span aria-hidden="true">3</span><div><strong>Xem nơi còn phòng</strong><p>Mỗi cơ sở hiện rõ: Còn phòng, Hết phòng hay Cần xác nhận.</p></div></li>
    </ol>}

    {searched && enabled !== false && !error && <section className="availability-results" aria-live="polite" aria-labelledby="availability-results-title">
      <div className="availability-results__heading">
        <div>
          <h2 id="availability-results-title">Kết quả cho kỳ nghỉ của bạn</h2>
          <p>{formatDate(range.checkIn)} – {formatDate(range.checkOut)} · {items[0]?.nights ?? nightsBetween(range.checkIn, range.checkOut)} đêm · {items.length} nơi nghỉ</p>
        </div>
      </div>
      {items.length > 0 && <div className="avl-filter" role="group" aria-label="Lọc theo tình trạng">
        <button type="button" className="ui-chip" aria-pressed={statusFilter === 'all'} onClick={() => setStatusFilter('all')}>Tất cả <span>{items.length}</span></button>
        {STATUS_ORDER.filter((key) => counts[key] > 0).map((key) => <button type="button" key={key} className={`ui-chip avl-chip ui-tone-${STATUS[key].tone}`} aria-pressed={statusFilter === key} onClick={() => setStatusFilter(key)}>
          <span className="ui-badge__dot" aria-hidden="true" />{STATUS[key].label} <span>{counts[key]}</span>
        </button>)}
      </div>}
      {items.length === 0
        ? <StateBlock title="Chưa tìm thấy nơi nghỉ phù hợp" text="Thử đổi ngày hoặc khu vực, hoặc gửi yêu cầu để chúng tôi kiểm tra giúp bạn." action={<Link className="ui-btn ui-btn--primary" href="/lien-he">Nhờ tư vấn</Link>} />
        : <div className="availability-list">{visible.map((item) => {
          const status = STATUS[item.status];
          const bookable = item.status === 'available';
          return <article className={`availability-result is-${item.status}`} key={`${item.propertyId}:${item.roomTypeId}`}>
            <div className="availability-result__media">
              {item.cover ? <Image src={item.cover.url} alt={item.cover.alt ?? ''} width={item.cover.width ?? 480} height={item.cover.height ?? 320} unoptimized /> : <div className="availability-result__placeholder" aria-hidden="true">Đinh Vân</div>}
            </div>
            <div className="availability-result__content">
              <StatusPill tone={status.tone}>{status.label}</StatusPill>
              <h3>{item.name}</h3>
              <p className="availability-result__meta"><BedDouble size={15} aria-hidden="true" />{item.roomTypeName}<span aria-hidden="true">·</span><MapPin size={15} aria-hidden="true" />{item.area}</p>
              {item.excerpt && <p className="availability-result__excerpt">{item.excerpt}</p>}
              <p className="availability-result__hint">{status.hint}</p>
            </div>
            <div className="availability-result__aside">
              <span className="availability-result__price">{item.priceMode === 'contact' ? 'Giá: liên hệ' : 'Giá niêm yết'}</span>
              {item.lastConfirmedAt && <small>Cập nhật {new Date(item.lastConfirmedAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}</small>}
              {bookable
                ? <Link className="ui-btn ui-btn--primary" href={item.path}>Xem phòng <ArrowRight size={16} aria-hidden="true" /></Link>
                : <Link className="ui-btn" href={item.status === 'sold_out' ? '/lien-he' : item.path}>{item.status === 'sold_out' ? 'Nhờ tìm phòng khác' : 'Xem chi tiết'}</Link>}
            </div>
          </article>;
        })}</div>}
      <p className="availability-disclaimer">Tình trạng dựa trên số phòng cơ sở đã cập nhật cho toàn bộ kỳ nghỉ. Chúng tôi sẽ xác nhận lại với bạn trước khi chốt đặt phòng.</p>
    </section>}
  </div>;
}

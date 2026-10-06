'use client';
import { useEffect, useId, useMemo, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react';
import { CalendarDays, Check, ChevronLeft, ChevronRight, Info, Layers, Minus, Plus, RefreshCw } from 'lucide-react';
import { Drawer, Stepper } from '@/components/ui/system';
import '@/styles/inventory-matrix.css';

export type MatrixRoom = { id: string; name: string; code: string; status: string; capacityVerified?: boolean; approvedPoolLimit?: number | null };
export type MatrixDay = { roomTypeId: string; stayDate: string; available: number | null; version: number | null; capacity: number | null; blockedCount?: number | null; heldCount?: number | null; reservedCount?: number | null; stopSell?: boolean; saleState?: string; integrityHold?: boolean; dataState?: string; updatedAt?: string | null; lastConfirmedAt?: string | null; lastConfirmedSource?: string | null };
export type AvailableChange = { roomTypeId: string; stayDate: string; available: number; expectedVersion: number; reopen: boolean };
export const businessToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
export const shiftInventoryDay = (key: string, days: number) => new Date(new Date(key + 'T00:00:00Z').getTime() + days * 86_400_000).toISOString().slice(0, 10);
export function inventoryDates(anchor: string, view: 'week' | 'month') {
  const from = view === 'month' ? anchor.slice(0, 7) + '-01' : anchor;
  const count = view === 'month' ? new Date(Date.UTC(Number(from.slice(0, 4)), Number(from.slice(5, 7)), 0)).getUTCDate() : 7;
  return Array.from({ length: count }, (_, i) => shiftInventoryDay(from, i));
}
const shortDate = (day: string) => day.slice(8, 10) + '/' + day.slice(5, 7);
const fullDate = (day: string) => shortDate(day) + '/' + day.slice(0, 4);
const dateLabel = (day: string) => new Intl.DateTimeFormat('vi-VN', { timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric', weekday: 'long' }).format(new Date(day + 'T00:00:00Z'));
const weekdayIndex = (day: string) => new Date(day + 'T00:00:00Z').getUTCDay();
const weekday = (day: string) => ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][weekdayIndex(day)];
const updatedLabel = (value?: string | null) => value && Number.isFinite(Date.parse(value)) ? new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) : 'Chưa có xác nhận';
const sourceLabel: Record<string, string> = { admin: 'Quản trị viên', partner_portal: 'Đối tác', google_sheets: 'Bảng tính đồng bộ' };
const eligible = (room: MatrixRoom) => room.status === 'active' && room.capacityVerified !== false;
const stopped = (day: MatrixDay) => day.stopSell || day.saleState === 'stop_sell';

type CellKind = 'missing' | 'unconfirmed' | 'empty' | 'available';
function cellState(day?: MatrixDay): { kind: CellKind; number: string; label: string; spoken: string } {
  if (!day?.version) return { kind: 'missing', number: '—', label: 'Chưa mở', spoken: 'chưa mở quỹ' };
  if (day.integrityHold || day.dataState === 'stale' || (day.available === null && !stopped(day))) return { kind: 'unconfirmed', number: '?', label: day.integrityHold ? 'Cần rà soát' : 'Cần xác nhận', spoken: 'cần xác nhận tình trạng phòng' };
  if (stopped(day) || day.available === 0) return { kind: 'empty', number: '0', label: stopped(day) ? 'Dừng bán' : 'Hết phòng', spoken: stopped(day) ? 'đang dừng bán' : 'hết phòng' };
  return { kind: 'available', number: String(day.available), label: 'Còn phòng', spoken: 'còn ' + day.available + ' phòng' };
}

const LEGEND: Array<{ kind: CellKind; number: string; label: string }> = [
  { kind: 'available', number: '3', label: 'Còn phòng' },
  { kind: 'empty', number: '0', label: 'Hết phòng' },
  { kind: 'missing', number: '—', label: 'Chưa mở' },
  { kind: 'unconfirmed', number: '?', label: 'Cần xác nhận' },
];

type Props = {
  mode: 'admin' | 'partner'; propertyName: string; rooms: MatrixRoom[]; items: MatrixDay[]; dates: string[];
  view: 'week' | 'month'; anchor: string; onView: (view: 'week' | 'month') => void; onAnchor: (day: string) => void;
  canWrite: boolean; loading?: boolean; onRefresh: () => Promise<void>; propertySelector?: ReactNode;
  /** Extra toolbar actions (for example the partner's advanced update panel). */
  toolbarExtra?: ReactNode;
  onSave: (change: AvailableChange, key: string) => Promise<unknown>;
  onOpen?: (room: MatrixRoom, day: string, capacity: number, key: string) => Promise<unknown>;
  onPreview?: (changes: AvailableChange[]) => Promise<{ items: Array<{ stayDate: string; beforeAvailable: number; available: number }> }>;
  onBulk?: (changes: AvailableChange[], key: string) => Promise<unknown>;
  onConfirm?: (roomTypeId: string) => Promise<void>;
};
type BulkDraft = { roomTypeId: string; from: string; to: string; available: string; reopen: boolean };

export function InventoryCalendarMatrix(props: Props) {
  const { mode, propertyName, rooms, items, dates, canWrite, loading, view, onView } = props;
  const cellTitle = useId(), bulkTitle = useId(), mobileRoomId = useId();
  const [editing, setEditing] = useState<{ room: MatrixRoom; day: MatrixDay } | null>(null);
  const [available, setAvailable] = useState(''), [capacity, setCapacity] = useState(''), [reopen, setReopen] = useState(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [commandKey, setCommandKey] = useState('');
  const [bulkOpen, setBulkOpen] = useState(false);
  const [draft, setDraft] = useState<BulkDraft>({ roomTypeId: '', from: '', to: '', available: '', reopen: false });
  const [bulk, setBulk] = useState<{ changes: AvailableChange[]; items: Array<{ stayDate: string; beforeAvailable: number; available: number }>; key: string } | null>(null);
  const [mobileRoom, setMobileRoom] = useState('');
  const byKey = useMemo(() => new Map(items.map((item) => [item.roomTypeId + ':' + item.stayDate, item])), [items]);
  const scopeKey = rooms.map((room) => room.id).join(',');
  const today = businessToday();
  useEffect(() => { setEditing(null); setBulk(null); setBulkOpen(false); setError(''); setMobileRoom(''); }, [propertyName, scopeKey]);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)');
    const forceWeek = () => { if (media.matches && view !== 'week') onView('week'); };
    forceWeek(); media.addEventListener('change', forceWeek); return () => media.removeEventListener('change', forceWeek);
  }, [view, onView]);

  const summary = useMemo(() => {
    const counts: Record<CellKind, number> = { available: 0, empty: 0, missing: 0, unconfirmed: 0 };
    for (const room of rooms) for (const date of dates) counts[cellState(byKey.get(room.id + ':' + date)).kind]++;
    return counts;
  }, [rooms, dates, byKey]);

  const openCell = (room: MatrixRoom, day: string) => {
    const snapshot = byKey.get(room.id + ':' + day) ?? { roomTypeId: room.id, stayDate: day, available: null, version: null, capacity: null };
    setEditing({ room, day: { ...snapshot } }); setAvailable(String(snapshot.available ?? 0)); setCapacity(''); setReopen(false); setError(''); setCommandKey(crypto.randomUUID());
  };
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (!editing) return; setBusy(true); setError('');
    try {
      if (!editing.day.version && props.onOpen) await props.onOpen(editing.room, editing.day.stayDate, Number(capacity), commandKey);
      else if (editing.day.version) await props.onSave({ roomTypeId: editing.room.id, stayDate: editing.day.stayDate, available: Number(available), expectedVersion: editing.day.version, reopen }, commandKey);
      else throw new Error('Liên hệ quản trị viên để mở quỹ.');
      await props.onRefresh(); setEditing(null);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Chưa lưu được. Bản đang nhập vẫn được giữ.'); }
    finally { setBusy(false); }
  };
  const openBulk = () => {
    setDraft({ roomTypeId: rooms.find(eligible)?.id ?? '', from: dates[0], to: dates.at(-1)!, available: '', reopen: false });
    setBulk(null); setError(''); setBulkOpen(true);
  };
  const preview = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError(''); setBulk(null); setBusy(true);
    try {
      const count = (Date.parse(draft.to) - Date.parse(draft.from)) / 86_400_000;
      if (count < 0 || count >= 90 || !Number.isInteger(count)) throw new Error('Chọn từ 1 đến 90 đêm.');
      const changes = Array.from({ length: count + 1 }, (_, i) => {
        const stayDate = shiftInventoryDay(draft.from, i), row = byKey.get(draft.roomTypeId + ':' + stayDate);
        if (!row?.version) throw new Error('Ngày ' + fullDate(stayDate) + ' chưa mở quỹ hoặc ngoài lịch đang xem. Hãy mở hoặc xem khoảng này trước.');
        return { roomTypeId: draft.roomTypeId, stayDate, available: Number(draft.available), expectedVersion: row.version, reopen: draft.reopen };
      });
      const result = await props.onPreview!(changes); setBulk({ changes, items: result.items, key: crypto.randomUUID() });
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Chưa xem trước được.'); } finally { setBusy(false); }
  };
  const applyBulk = async () => {
    if (!bulk) return; setBusy(true); setError('');
    try { await props.onBulk!(bulk.changes, bulk.key); await props.onRefresh(); setBulk(null); setBulkOpen(false); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Lô chưa được lưu.'); } finally { setBusy(false); }
  };
  const move = (delta: number) => {
    if (view === 'week') props.onAnchor(shiftInventoryDay(props.anchor, delta * 7));
    else { const date = new Date(props.anchor.slice(0, 7) + '-01T00:00:00Z'); date.setUTCMonth(date.getUTCMonth() + delta); props.onAnchor(date.toISOString().slice(0, 10)); }
  };
  const navigateCell = (event: KeyboardEvent<HTMLButtonElement>, roomIndex: number, dateIndex: number) => {
    const container = event.currentTarget.closest('[data-calendar-surface]');
    const mobile = container?.getAttribute('data-calendar-surface') === 'mobile';
    let r = roomIndex, d = dateIndex;
    switch (event.key) {
      case 'ArrowLeft': d--; break; case 'ArrowRight': d++; break;
      case 'ArrowUp': if (mobile) d--; else r--; break;
      case 'ArrowDown': if (mobile) d++; else r++; break;
      case 'Home': d = 0; break; case 'End': d = dates.length - 1; break;
      default: return;
    }
    const target = container?.querySelector<HTMLButtonElement>('[data-cell-row="' + r + '"][data-cell-day="' + d + '"]:not(:disabled)');
    if (target) { event.preventDefault(); target.focus(); }
  };
  const renderCell = (room: MatrixRoom, date: string, r: number, d: number) => {
    const day = byKey.get(room.id + ':' + date), state = cellState(day);
    return <button type="button" className={'inventory-matrix__cell is-' + state.kind + (canWrite ? ' is-editable' : '') + (date === today ? ' is-today' : '')} data-cell-row={r} data-cell-day={d}
      aria-label={room.name + ', ngày ' + fullDate(date) + ', ' + (loading ? 'đang tải' : state.spoken)}
      disabled={loading || !eligible(room) || (!canWrite && !day?.version)} onClick={() => openCell(room, date)} onKeyDown={(e) => navigateCell(e, r, d)}>
      <strong>{loading ? '…' : state.number}</strong><span>{loading ? 'Đang tải' : state.label}</span>
    </button>;
  };
  const roomStatus = (room: MatrixRoom) => room.status !== 'active' ? 'Chưa hoạt động' : room.capacityVerified === false ? 'Chưa xác minh sức chứa' : 'Đang bán';
  const roomHeading = (room: MatrixRoom) => <span className="inventory-matrix__room">
    <strong className="inventory-matrix__room-name">{room.name}</strong>
    <span className="inventory-matrix__room-meta">
      <span className="inventory-matrix__room-code">{room.code}</span>
      <small className={'inventory-matrix__verified' + (eligible(room) ? '' : ' is-pending')}><span aria-hidden="true" />{roomStatus(room)}</small>
    </span>
  </span>;
  const confirmRoom = (room: MatrixRoom) => props.onConfirm && <button className="inventory-matrix__confirm" type="button" disabled={busy || loading || dates.some((date) => !byKey.get(room.id + ':' + date)?.version)} onClick={async () => { setBusy(true); try { await props.onConfirm!(room.id); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Chưa xác nhận được.'); } finally { setBusy(false); } }}><Check size={14} aria-hidden="true" /> Đã kiểm tra, không đổi</button>;
  const cellReadonly = !canWrite || !!editing?.day.integrityHold;
  const activeMobileRoom = rooms.find((room) => room.id === mobileRoom) ?? rooms[0];
  const editingState = editing ? cellState(editing.day) : null;
  const bulkRoom = bulk ? rooms.find((room) => room.id === bulk.changes[0].roomTypeId) : null;
  const rangeLabel = dates.length ? shortDate(dates[0]) + ' – ' + shortDate(dates.at(-1)!) + '/' + dates.at(-1)!.slice(0, 4) : '';
  const quantity = Number(available) || 0;

  return <section className="inventory-matrix" aria-label={'Tình trạng phòng ' + propertyName}>
    <header className="inventory-matrix__heading">
      <div className="inventory-matrix__heading-text">
        <span className="ui-eyebrow">Lịch phòng</span>
        <h2>{propertyName}</h2>
        <p>{rooms.length} hạng phòng · {rangeLabel}</p>
      </div>
      <div className="inventory-matrix__heading-actions">
        {props.toolbarExtra}
        {canWrite && props.onBulk && props.onPreview && <button className="ui-btn ui-btn--primary inventory-matrix__bulk-trigger" type="button" onClick={openBulk} disabled={loading || !rooms.some(eligible)}><Layers size={16} aria-hidden="true" /> Cập nhật nhiều ngày</button>}
      </div>
    </header>

    <div className="inventory-matrix__toolbar">
      {props.propertySelector && <div className="inventory-matrix__property">{props.propertySelector}</div>}
      <div className="inventory-matrix__controls">
        <div className="ui-segmented inventory-matrix__view" role="group" aria-label="Chế độ lịch">
          <button type="button" aria-pressed={view === 'week'} onClick={() => onView('week')}>Tuần</button>
          <button className="inventory-matrix__month" type="button" aria-pressed={view === 'month'} onClick={() => onView('month')}>Tháng</button>
        </div>
        <div className="inventory-matrix__navigation">
          <button type="button" className="ui-btn ui-btn--icon" onClick={() => move(-1)} aria-label="Khoảng trước"><ChevronLeft size={18} aria-hidden="true" /></button>
          <button type="button" className="ui-btn" onClick={() => props.onAnchor(businessToday())}>Hôm nay</button>
          <button type="button" className="ui-btn ui-btn--icon" onClick={() => move(1)} aria-label="Khoảng sau"><ChevronRight size={18} aria-hidden="true" /></button>
        </div>
        <label className="inventory-matrix__date"><CalendarDays size={16} aria-hidden="true" /><span className="sr-only">Bắt đầu lịch</span><input type="date" value={props.anchor} onChange={(e) => { if (e.target.value) props.onAnchor(e.target.value); }} /></label>
        <button className="ui-btn ui-btn--ghost inventory-matrix__refresh" type="button" onClick={() => void props.onRefresh()} disabled={loading}><RefreshCw size={16} aria-hidden="true" className={loading ? 'is-refreshing' : ''} /> Làm mới</button>
      </div>
    </div>

    <div className="inventory-matrix__legend" aria-label="Chú thích trạng thái">
      {LEGEND.map((entry) => <span key={entry.kind} className={'inventory-matrix__legend-item is-' + entry.kind}><b>{entry.number}</b><span>{entry.label}</span><em>{summary[entry.kind]} ô</em></span>)}
    </div>

    {loading && <p className="inventory-matrix__loading" role="status">Đang tải lịch…</p>}
    {error && !editing && !bulkOpen && <p className="ui-alert ui-tone-danger inventory-matrix__error" role="alert">{error}</p>}

    {rooms.length > 0 && <div className="inventory-matrix__scroll" data-calendar-surface="desktop" tabIndex={0} role="region" aria-label="Lịch theo hạng phòng; cuộn ngang để xem thêm ngày">
      <table>
        <thead><tr>
          <th scope="col" className="inventory-matrix__corner">Hạng phòng</th>
          {dates.map((day) => <th scope="col" key={day} className={(day === today ? 'is-today ' : '') + (weekdayIndex(day) === 0 || weekdayIndex(day) === 6 ? 'is-weekend' : '')}><span>{weekday(day)}</span><strong>{shortDate(day)}</strong>{day === today && <small>Hôm nay</small>}</th>)}
        </tr></thead>
        <tbody>{rooms.map((room, r) => <tr key={room.id}>
          <th scope="row">{roomHeading(room)}{confirmRoom(room)}</th>
          {dates.map((date, d) => <td key={date}>{renderCell(room, date, r, d)}</td>)}
        </tr>)}</tbody>
      </table>
    </div>}

    {rooms.length > 0 && activeMobileRoom && <div className="inventory-matrix__mobile" data-calendar-surface="mobile">
      {rooms.length > 1 && <label className="inventory-matrix__mobile-picker" htmlFor={mobileRoomId}>
        <span>Hạng phòng</span>
        <select id={mobileRoomId} className="ui-select" value={activeMobileRoom.id} onChange={(event) => setMobileRoom(event.target.value)}>
          {rooms.map((room) => <option key={room.id} value={room.id}>{room.name} · {room.code}</option>)}
        </select>
      </label>}
      {(() => { const r = rooms.indexOf(activeMobileRoom); return <section className="inventory-matrix__mobile-room" aria-label={activeMobileRoom.name}>
        <header>{roomHeading(activeMobileRoom)}{confirmRoom(activeMobileRoom)}</header>
        <ul>{dates.map((date, d) => <li key={date} className={date === today ? 'is-today' : undefined}><span className="inventory-matrix__mobile-date"><small>{weekday(date)}</small><strong>{shortDate(date)}</strong></span>{renderCell(activeMobileRoom, date, r, d)}</li>)}</ul>
      </section>; })()}
    </div>}

    {!rooms.length && <div className="ui-state"><span className="ui-state__icon" aria-hidden="true"><CalendarDays size={24} /></span><strong>Chưa có hạng phòng trong phạm vi này</strong><p>{mode === 'partner' ? 'Khi quản trị viên giao hạng phòng, lịch sẽ hiển thị tại đây.' : 'Thêm hạng phòng cho cơ sở để bắt đầu quản lý quỹ phòng.'}</p></div>}

    <p className="inventory-matrix__note"><Info size={15} aria-hidden="true" /> “Chưa mở” không có nghĩa là hết phòng — ngày đó chưa được khai báo số phòng.{mode === 'partner' && ' Liên hệ quản trị viên để mở những ngày chưa có dữ liệu.'}</p>

    <Drawer open={!!editing} onClose={() => { if (!busy) setEditing(null); }} labelId={cellTitle} busy={busy}
      eyebrow={propertyName}
      title={editing ? <>{editing.room.name} <small className="inventory-panel__code">{editing.room.code}</small></> : ''}
      description={editing ? dateLabel(editing.day.stayDate) : undefined}
      footer={editing && !(!editing.day.version && mode === 'partner') ? <>
        <button className="ui-btn" type="button" disabled={busy} onClick={() => setEditing(null)}>Huỷ</button>
        {canWrite && <button className="ui-btn ui-btn--primary" type="submit" form={cellTitle + '-form'} disabled={busy || cellReadonly}>{busy ? 'Đang lưu…' : 'Lưu thay đổi'}</button>}
      </> : <button className="ui-btn" type="button" onClick={() => setEditing(null)}>Đóng</button>}>
      {editing && editingState && <>
        <div className={'inventory-panel__status is-' + editingState.kind}><b>{editingState.number}</b><span><strong>{editingState.label}</strong><small>Tình trạng hiện tại</small></span></div>
        {error && <p role="alert" className="ui-alert ui-tone-danger">{error}</p>}
        {!editing.day.version && mode === 'partner'
          ? <p className="ui-alert ui-tone-info"><Info size={16} aria-hidden="true" /> Ngày này chưa mở quỹ. Liên hệ quản trị viên để mở quỹ hạng phòng này.</p>
          : <form id={cellTitle + '-form'} className="inventory-matrix__edit" onSubmit={save}>
            {!editing.day.version ? <>
              <p className="ui-alert ui-tone-info"><Info size={16} aria-hidden="true" /> Mở quỹ bằng sức chứa đã xác minh — không dùng số ước tính.</p>
              <label className="ui-field"><span>Tổng số phòng đã xác minh</span><input data-autofocus className="ui-input" type="number" min="0" max={editing.room.approvedPoolLimit ?? 5000} value={capacity} onChange={(e) => { setCapacity(e.target.value); setCommandKey(crypto.randomUUID()); }} disabled={busy} required /></label>
              <label className="ui-check"><input type="checkbox" required disabled={busy} /> Tôi đã xác minh sức chứa của hạng phòng này</label>
            </> : <>
              <div className="ui-field">
                <label htmlFor={cellTitle + '-qty'}>Số phòng còn bán</label>
                <div className="inventory-panel__stepper">
                  <button type="button" className="ui-btn ui-btn--icon" aria-label="Giảm 1 phòng" disabled={busy || cellReadonly || quantity <= 0} onClick={() => { setAvailable(String(Math.max(0, quantity - 1))); setCommandKey(crypto.randomUUID()); }}><Minus size={18} aria-hidden="true" /></button>
                  <input id={cellTitle + '-qty'} data-autofocus className="ui-input inventory-panel__quantity" type="number" min="0" max="5000" value={available} onChange={(e) => { setAvailable(e.target.value); setCommandKey(crypto.randomUUID()); }} disabled={busy || cellReadonly} required />
                  <button type="button" className="ui-btn ui-btn--icon" aria-label="Tăng 1 phòng" disabled={busy || cellReadonly} onClick={() => { setAvailable(String(quantity + 1)); setCommandKey(crypto.randomUUID()); }}><Plus size={18} aria-hidden="true" /></button>
                </div>
              </div>
              {canWrite && <button className="ui-btn ui-btn--danger" type="button" disabled={busy || cellReadonly} onClick={() => { setAvailable('0'); setCommandKey(crypto.randomUUID()); }}>Đánh dấu hết phòng</button>}
              {stopped(editing.day) && canWrite && <label className="ui-check"><input type="checkbox" checked={reopen} onChange={(e) => { setReopen(e.target.checked); setCommandKey(crypto.randomUUID()); }} disabled={busy || cellReadonly} required /> Xác nhận mở bán lại ngày này</label>}
              {editing.day.integrityHold && <p className="ui-alert ui-tone-warning"><Info size={16} aria-hidden="true" /> Ngày này đang được rà soát nên tạm thời chỉ xem.</p>}
            </>}
          </form>}
        <dl className="inventory-panel__facts">
          {([['Sức chứa', editing.day.capacity], ['Đang giữ chỗ', editing.day.heldCount], ['Đã đặt', editing.day.reservedCount], ['Đang khoá', editing.day.blockedCount], ['Cập nhật gần nhất', updatedLabel(editing.day.updatedAt)],
            ...(mode === 'admin' ? [['Nguồn xác nhận', sourceLabel[editing.day.lastConfirmedSource ?? ''] ?? editing.day.lastConfirmedSource], ['Xác nhận lần cuối', updatedLabel(editing.day.lastConfirmedAt)]] : [])] as Array<[string, string | number | null | undefined]>)
            .map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value ?? 'Chưa có'}</dd></div>)}
        </dl>
      </>}
    </Drawer>

    <Drawer open={bulkOpen} onClose={() => { if (!busy) setBulkOpen(false); }} labelId={bulkTitle} busy={busy}
      eyebrow={propertyName}
      title="Cập nhật nhiều ngày"
      description={bulk ? 'Kiểm tra thay đổi trước khi lưu cho cả khoảng ngày.' : 'Đặt cùng một số phòng còn bán cho một hạng phòng trong nhiều đêm.'}
      footer={bulk ? <>
        <button className="ui-btn" type="button" disabled={busy} onClick={() => { setBulk(null); setError(''); }}>Quay lại sửa</button>
        <button className="ui-btn ui-btn--primary" type="button" disabled={busy} onClick={() => void applyBulk()}>{busy ? 'Đang cập nhật…' : 'Xác nhận cập nhật'}</button>
      </> : <>
        <button className="ui-btn" type="button" disabled={busy} onClick={() => setBulkOpen(false)}>Huỷ</button>
        <button className="ui-btn ui-btn--primary" type="submit" form={bulkTitle + '-form'} disabled={busy}>{busy ? 'Đang xem trước…' : 'Xem trước thay đổi'}</button>
      </>}>
      <Stepper steps={['Chọn khoảng ngày', 'Xem trước', 'Lưu']} current={bulk ? 1 : 0} label="Các bước cập nhật nhiều ngày" />
      {error && <p role="alert" className="ui-alert ui-tone-danger">{error}</p>}
      {bulk && bulkRoom ? <div className="inventory-matrix__preview">
        <div className="inventory-panel__preview-summary">
          <span className="ui-badge ui-tone-brand"><Layers size={14} aria-hidden="true" /> {bulk.changes.length} đêm sẽ được cập nhật</span>
          <h3>{bulkRoom.name} <small>{bulkRoom.code}</small></h3>
          <p>{fullDate(bulk.changes[0].stayDate)} → {fullDate(bulk.changes.at(-1)!.stayDate)}</p>
          <p>Số phòng còn bán mới: <strong>{bulk.changes[0].available}</strong>{bulk.changes[0].reopen && ' · mở bán lại nếu đang dừng bán'}</p>
        </div>
        <ul className="inventory-panel__preview-days" aria-label="Thay đổi từng đêm">{bulk.items.map((item) => <li key={item.stayDate}><span>{weekday(item.stayDate)} · {fullDate(item.stayDate)}</span><strong>{item.beforeAvailable} <span aria-hidden="true">→</span><span className="sr-only">thành</span> {item.available} phòng</strong></li>)}</ul>
      </div> : <form id={bulkTitle + '-form'} className="inventory-matrix__edit" onSubmit={preview}>
        <label className="ui-field"><span>Hạng phòng</span><select data-autofocus className="ui-select" value={draft.roomTypeId} onChange={(e) => setDraft({ ...draft, roomTypeId: e.target.value })} required disabled={busy}>{rooms.filter(eligible).map((room) => <option value={room.id} key={room.id}>{room.name} · {room.code}</option>)}</select></label>
        <div className="inventory-panel__dates">
          <label className="ui-field"><span>Từ đêm</span><input className="ui-input" type="date" value={draft.from} onChange={(e) => setDraft({ ...draft, from: e.target.value })} required disabled={busy} /></label>
          <label className="ui-field"><span>Đến đêm (bao gồm)</span><input className="ui-input" type="date" value={draft.to} onChange={(e) => setDraft({ ...draft, to: e.target.value })} required disabled={busy} /></label>
        </div>
        <label className="ui-field"><span>Số phòng còn bán</span><input className="ui-input inventory-panel__quantity" type="number" min="0" max="5000" value={draft.available} onChange={(e) => setDraft({ ...draft, available: e.target.value })} required disabled={busy} /></label>
        <label className="ui-check"><input type="checkbox" checked={draft.reopen} onChange={(e) => setDraft({ ...draft, reopen: e.target.checked })} disabled={busy} /> Mở bán lại những ngày đang dừng bán</label>
        <p className="ui-hint">Chỉ cập nhật những ngày đã mở quỹ trong lịch đang xem. Bạn sẽ được xem trước từng đêm trước khi lưu.</p>
      </form>}
    </Drawer>
  </section>;
}

'use client';
import { useEffect, useId, useState, type KeyboardEvent, type ReactNode } from 'react';
import { CalendarDays, Check, ChevronLeft, ChevronRight, Info, Layers, RefreshCw } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
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
const weekday = (day: string) => ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][new Date(day + 'T00:00:00Z').getUTCDay()];
const updatedLabel = (value?: string | null) => value && Number.isFinite(Date.parse(value)) ? new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) : 'Chưa có xác nhận';
const sourceLabel: Record<string, string> = { admin: 'Quản trị viên', partner_portal: 'Đối tác', google_sheets: 'Google Sheets' };
const eligible = (room: MatrixRoom) => room.status === 'active' && room.capacityVerified !== false;
const stopped = (day: MatrixDay) => day.stopSell || day.saleState === 'stop_sell';
function cellState(day?: MatrixDay) {
  if (!day?.version) return { kind: 'missing', number: '—', label: 'Chưa mở', spoken: 'chưa mở quỹ' };
  if (day.integrityHold || day.dataState === 'stale' || (day.available === null && !stopped(day))) return { kind: 'unconfirmed', number: '?', label: day.integrityHold ? 'Cần rà soát' : 'Cần xác nhận', spoken: 'cần xác nhận tình trạng phòng' };
  if (stopped(day) || day.available === 0) return { kind: 'empty', number: '0', label: 'Hết phòng', spoken: 'hết phòng' };
  return { kind: 'available', number: String(day.available), label: 'Còn phòng', spoken: 'còn ' + day.available + ' phòng' };
}
type Props = {
  mode: 'admin' | 'partner'; propertyName: string; rooms: MatrixRoom[]; items: MatrixDay[]; dates: string[];
  view: 'week' | 'month'; anchor: string; onView: (view: 'week' | 'month') => void; onAnchor: (day: string) => void;
  canWrite: boolean; loading?: boolean; onRefresh: () => Promise<void>; propertySelector?: ReactNode;
  onSave: (change: AvailableChange, key: string) => Promise<unknown>;
  onOpen?: (room: MatrixRoom, day: string, capacity: number, key: string) => Promise<unknown>;
  onPreview?: (changes: AvailableChange[]) => Promise<{ items: Array<{ stayDate: string; beforeAvailable: number; available: number }> }>;
  onBulk?: (changes: AvailableChange[], key: string) => Promise<unknown>;
  onConfirm?: (roomTypeId: string) => Promise<void>;
};
type BulkDraft = { roomTypeId: string; from: string; to: string; available: string; reopen: boolean };

export function InventoryCalendarMatrix(props: Props) {
  const { mode, propertyName, rooms, items, dates, canWrite, loading, view, onView } = props;
  const cellTitle = useId(), bulkTitle = useId();
  const [editing, setEditing] = useState<{ room: MatrixRoom; day: MatrixDay } | null>(null);
  const [available, setAvailable] = useState(''), [capacity, setCapacity] = useState(''), [reopen, setReopen] = useState(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [commandKey, setCommandKey] = useState('');
  const [bulkOpen, setBulkOpen] = useState(false);
  const [draft, setDraft] = useState<BulkDraft>({ roomTypeId: '', from: '', to: '', available: '', reopen: false });
  const [bulk, setBulk] = useState<{ changes: AvailableChange[]; items: Array<{ stayDate: string; beforeAvailable: number; available: number }>; key: string } | null>(null);
  const byKey = new Map(items.map((item) => [item.roomTypeId + ':' + item.stayDate, item]));
  const scopeKey = rooms.map((room) => room.id).join(',');
  useEffect(() => { setEditing(null); setBulk(null); setBulkOpen(false); setError(''); }, [propertyName, scopeKey]);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)');
    const forceWeek = () => { if (media.matches && view !== 'week') onView('week'); };
    forceWeek(); media.addEventListener('change', forceWeek); return () => media.removeEventListener('change', forceWeek);
  }, [view, onView]);
  const openCell = (room: MatrixRoom, day: string) => {
    const snapshot = byKey.get(room.id + ':' + day) ?? { roomTypeId: room.id, stayDate: day, available: null, version: null, capacity: null };
    setEditing({ room, day: { ...snapshot } }); setAvailable(String(snapshot.available ?? 0)); setCapacity(''); setReopen(false); setError(''); setCommandKey(crypto.randomUUID());
  };
  const save = async (event: React.FormEvent<HTMLFormElement>) => {
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
  const preview = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError(''); setBulk(null); setBusy(true);
    try {
      const count = (Date.parse(draft.to) - Date.parse(draft.from)) / 86_400_000;
      if (count < 0 || count >= 90 || !Number.isInteger(count)) throw new Error('Chọn từ 1 đến 90 đêm.');
      const changes = Array.from({ length: count + 1 }, (_, i) => {
        const stayDate = shiftInventoryDay(draft.from, i), row = byKey.get(draft.roomTypeId + ':' + stayDate);
        if (!row?.version) throw new Error('Ngày ' + fullDate(stayDate) + ' chưa mở quỹ hoặc ngoài lịch đang tải. Hãy mở/xem khoảng này trước.');
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
    return <button type="button" className={'inventory-matrix__cell is-' + state.kind + (canWrite ? ' is-editable' : '')} data-cell-row={r} data-cell-day={d}
      aria-label={room.name + ', ngày ' + fullDate(date) + ', ' + (loading ? 'đang tải' : state.spoken)}
      disabled={loading || !eligible(room) || (!canWrite && !day?.version)} onClick={() => openCell(room, date)} onKeyDown={(e) => navigateCell(e, r, d)}>
      <strong>{loading ? '…' : state.number}</strong><span>{loading ? 'Đang tải' : state.label}</span>
    </button>;
  };
  const roomHeading = (room: MatrixRoom) => <><strong className="inventory-matrix__room-name">{room.name}</strong><span className="inventory-matrix__room-code">{room.code}</span><small className={'inventory-matrix__verified' + (eligible(room) ? '' : ' is-pending')}><span aria-hidden="true" />{room.status !== 'active' ? 'Chưa hoạt động' : room.capacityVerified === false ? 'Chưa xác minh sức chứa' : 'Đã xác minh'}</small></>;
  const confirmRoom = (room: MatrixRoom) => props.onConfirm && <button className="inventory-matrix__confirm" type="button" disabled={busy || loading || dates.some((date) => !byKey.get(room.id + ':' + date)?.version)} onClick={async () => { setBusy(true); try { await props.onConfirm!(room.id); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Chưa xác nhận được.'); } finally { setBusy(false); } }}><Check size={13} aria-hidden="true" /> Đã kiểm tra, không đổi</button>;
  const cellReadonly = !canWrite || !!editing?.day.integrityHold;

  return <section className="inventory-matrix" aria-label={'Tình trạng phòng ' + propertyName}>
    <header className="inventory-matrix__heading"><div><span className="inventory-matrix__eyebrow">LỊCH PHÒNG</span><h2>Tình trạng phòng</h2></div><button className="inventory-matrix__button" type="button" onClick={() => void props.onRefresh()} disabled={loading}><RefreshCw size={15} aria-hidden="true" className={loading ? 'is-refreshing' : ''} /> Cập nhật dữ liệu</button></header>
    <div className="inventory-matrix__summary"><span>Cơ sở <strong>{propertyName}</strong></span><span>Hạng phòng <strong>{rooms.length}</strong></span><span>Khoảng <strong>{shortDate(dates[0])} — {shortDate(dates.at(-1)!)}</strong></span></div>
    <div className="inventory-matrix__toolbar">
      {props.propertySelector && <div className="inventory-matrix__property">{props.propertySelector}</div>}
      <div className="inventory-matrix__controls">
        <div className="inventory-matrix__view" role="group" aria-label="Chế độ lịch"><button type="button" aria-pressed={view === 'week'} onClick={() => onView('week')}>Tuần</button><button className="inventory-matrix__month" type="button" aria-pressed={view === 'month'} onClick={() => onView('month')}>Tháng</button></div>
        <div className="inventory-matrix__navigation"><button type="button" onClick={() => move(-1)} aria-label="Khoảng trước"><ChevronLeft size={17} /></button><button type="button" onClick={() => props.onAnchor(businessToday())}>Hôm nay</button><button type="button" onClick={() => move(1)} aria-label="Khoảng sau"><ChevronRight size={17} /></button></div>
        <label className="inventory-matrix__date"><CalendarDays size={15} aria-hidden="true" /><span className="sr-only">Bắt đầu lịch</span><input type="date" value={props.anchor} onChange={(e) => { if (e.target.value) props.onAnchor(e.target.value); }} /></label>
        {canWrite && props.onBulk && props.onPreview && <button className="inventory-matrix__button inventory-matrix__bulk-trigger" type="button" onClick={openBulk} disabled={loading || !rooms.some(eligible)}><Layers size={15} aria-hidden="true" /> Cập nhật nhiều ngày</button>}
      </div>
    </div>
    {loading && <p className="inventory-matrix__loading" role="status">Đang tải lịch…</p>}
    {error && !editing && !bulkOpen && <p className="inventory-matrix__error" role="alert">{error}</p>}
    <div className="inventory-matrix__scroll" data-calendar-surface="desktop" tabIndex={0} role="region" aria-label="Lịch theo hạng phòng, cuộn ngang để xem ngày">
      <table><thead><tr><th scope="col">Hạng phòng</th>{dates.map((day) => <th scope="col" key={day} className={day === businessToday() ? 'is-today' : ''}><span>{weekday(day)}</span><strong>{shortDate(day)}</strong></th>)}</tr></thead><tbody>{rooms.map((room, r) => <tr key={room.id}><th scope="row">{roomHeading(room)}</th>{dates.map((date, d) => <td key={date}>{renderCell(room, date, r, d)}</td>)}</tr>)}</tbody></table>
    </div>
    <div className="inventory-matrix__mobile" data-calendar-surface="mobile">{rooms.map((room, r) => <section className="inventory-matrix__mobile-room" key={room.id} aria-label={room.name}><header>{roomHeading(room)}{confirmRoom(room)}</header><ul>{dates.map((date, d) => <li key={date}><span className="inventory-matrix__mobile-date"><strong>{shortDate(date)}</strong><small>{weekday(date)}</small></span>{renderCell(room, date, r, d)}</li>)}</ul></section>)}</div>
    {props.onConfirm && <div className="inventory-matrix__room-actions">{rooms.map((room) => <div key={room.id}><span>{room.name} · {room.code}</span>{confirmRoom(room)}</div>)}</div>}
    {!rooms.length && <p className="inventory-matrix__note">Chưa có hạng phòng trong phạm vi này.</p>}
    <footer className="inventory-matrix__legend"><span><i className="is-available" /> Còn phòng</span><span><i className="is-empty" /> Hết phòng</span><span><i className="is-missing" /> Chưa mở quỹ</span><span><i className="is-unconfirmed" /> Cần xác nhận</span></footer>
    <p className="inventory-matrix__note"><Info size={14} aria-hidden="true" /> Chưa mở quỹ không đồng nghĩa hết phòng.{mode === 'partner' && ' Liên hệ quản trị viên để mở ngày chưa có dữ liệu.'}</p>

    <Modal className="inventory-matrix-dialog" open={!!editing} onClose={() => { if (!busy) setEditing(null); }} labelledBy={cellTitle}>
      {editing && <><header className="inventory-panel__header"><span className="inventory-matrix__eyebrow">{propertyName}</span><h2 id={cellTitle}>{editing.room.name} <small>· {editing.room.code}</small></h2><p>{dateLabel(editing.day.stayDate)}</p></header>
        {error && <p role="alert" className="inventory-matrix__error">{error}</p>}
        {!editing.day.version && mode === 'partner' ? <><p className="inventory-panel__notice">Chưa mở quỹ. Liên hệ quản trị viên để mở quỹ hạng phòng này.</p><footer className="inventory-panel__footer"><button className="inventory-matrix__button" onClick={() => setEditing(null)}>Đóng</button></footer></> : <form className="inventory-matrix__edit" onSubmit={save}>
          {!editing.day.version ? <><p className="inventory-panel__notice">Mở quỹ cho ngày này bằng sức chứa đã được xác minh, không dùng số phòng ước tính.</p><label>Tổng số phòng/sức chứa đã xác minh<input data-autofocus type="number" min="0" max={editing.room.approvedPoolLimit ?? 5000} value={capacity} onChange={(e) => { setCapacity(e.target.value); setCommandKey(crypto.randomUUID()); }} disabled={busy} required /></label><label className="inventory-panel__check"><input type="checkbox" required disabled={busy} /> Tôi đã xác minh sức chứa hạng phòng này</label></> : <><label>Số phòng còn bán<input data-autofocus className="inventory-panel__quantity" type="number" min="0" max="5000" value={available} onChange={(e) => { setAvailable(e.target.value); setCommandKey(crypto.randomUUID()); }} disabled={busy || cellReadonly} required /></label>
            {canWrite && <button className="inventory-matrix__button inventory-panel__sold-out" type="button" disabled={busy || cellReadonly} onClick={() => { setAvailable('0'); setCommandKey(crypto.randomUUID()); }}>Đánh dấu hết phòng</button>}
            {stopped(editing.day) && canWrite && <label className="inventory-panel__check"><input type="checkbox" checked={reopen} onChange={(e) => { setReopen(e.target.checked); setCommandKey(crypto.randomUUID()); }} disabled={busy || cellReadonly} required /> Xác nhận mở bán lại</label>}</>}
          <details className="inventory-panel__details"><summary>Chi tiết (chỉ đọc)</summary><dl>{[['Sức chứa', editing.day.capacity], ['Đang giữ', editing.day.heldCount], ['Đã đặt', editing.day.reservedCount], ['Khoá', editing.day.blockedCount], ['Cập nhật gần nhất', updatedLabel(editing.day.updatedAt)], ...(mode === 'admin' ? [['Nguồn xác nhận', sourceLabel[editing.day.lastConfirmedSource ?? ''] ?? editing.day.lastConfirmedSource], ['Xác nhận lần cuối', updatedLabel(editing.day.lastConfirmedAt)], ['Version', editing.day.version]] : [])].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value ?? 'Chưa có'}</dd></div>)}</dl></details>
          <footer className="inventory-panel__footer"><button className="inventory-matrix__button" type="button" disabled={busy} onClick={() => setEditing(null)}>Huỷ</button>{canWrite && <button className="inventory-matrix__button inventory-matrix__button--primary" disabled={busy || cellReadonly}>{busy ? 'Đang lưu…' : 'Lưu thay đổi'}</button>}</footer>
        </form>}
      </>}
    </Modal>

    <Modal className="inventory-matrix-dialog" open={bulkOpen} onClose={() => { if (!busy) setBulkOpen(false); }} labelledBy={bulkTitle}>
      <header className="inventory-panel__header"><span className="inventory-matrix__eyebrow">{propertyName}</span><h2 id={bulkTitle}>{bulk ? 'Xác nhận cập nhật' : 'Cập nhật nhiều ngày'}</h2><p>{bulk ? 'Kiểm tra đề xuất trước khi lưu toàn bộ khoảng ngày.' : 'Áp dụng số phòng còn bán cho một hạng phòng.'}</p></header>
      {error && <p role="alert" className="inventory-matrix__error">{error}</p>}
      {bulk ? <div className="inventory-matrix__preview"><div className="inventory-panel__preview-summary"><span><Layers size={18} /> <strong>{bulk.changes.length} đêm sẽ được cập nhật</strong></span><h3>{rooms.find((room) => room.id === bulk.changes[0].roomTypeId)?.name} · {rooms.find((room) => room.id === bulk.changes[0].roomTypeId)?.code}</h3><p>{fullDate(bulk.changes[0].stayDate)} → {fullDate(bulk.changes.at(-1)!.stayDate)}</p><p>Số phòng còn bán: <strong>{bulk.changes[0].available}</strong>{bulk.changes[0].reopen && ' · Mở bán lại nếu đang dừng bán'}</p></div>
        <details className="inventory-panel__details"><summary>Xem thay đổi từng đêm</summary><ul className="inventory-panel__preview-days">{bulk.items.map((item) => <li key={item.stayDate}><span>{fullDate(item.stayDate)}</span><strong>{item.beforeAvailable} → {item.available} phòng</strong></li>)}</ul></details>
        <footer className="inventory-panel__footer"><button className="inventory-matrix__button" disabled={busy} onClick={() => { setBulk(null); setError(''); }}>Quay lại</button><button className="inventory-matrix__button inventory-matrix__button--primary" disabled={busy} onClick={() => void applyBulk()}>{busy ? 'Đang cập nhật…' : 'Xác nhận cập nhật'}</button></footer>
      </div> : <form className="inventory-matrix__edit" onSubmit={preview}>
        <label>Hạng phòng<select data-autofocus value={draft.roomTypeId} onChange={(e) => setDraft({ ...draft, roomTypeId: e.target.value })} required disabled={busy}>{rooms.filter(eligible).map((room) => <option value={room.id} key={room.id}>{room.name} · {room.code}</option>)}</select></label>
        <div className="inventory-panel__dates"><label>Từ ngày<input type="date" value={draft.from} onChange={(e) => setDraft({ ...draft, from: e.target.value })} required disabled={busy} /></label><label>Đến ngày<input type="date" value={draft.to} onChange={(e) => setDraft({ ...draft, to: e.target.value })} required disabled={busy} /></label></div>
        <label>Số phòng còn bán<input className="inventory-panel__quantity" type="number" min="0" max="5000" value={draft.available} onChange={(e) => setDraft({ ...draft, available: e.target.value })} required disabled={busy} /></label>
        <label className="inventory-panel__check"><input type="checkbox" checked={draft.reopen} onChange={(e) => setDraft({ ...draft, reopen: e.target.checked })} disabled={busy} /> Mở bán lại nếu đang dừng bán</label>
        <p className="inventory-matrix__note">Bao gồm đêm cuối đã chọn. Chỉ cập nhật những ngày đã mở trong lịch đang xem.</p>
        <footer className="inventory-panel__footer"><button className="inventory-matrix__button" type="button" disabled={busy} onClick={() => setBulkOpen(false)}>Huỷ</button><button className="inventory-matrix__button inventory-matrix__button--primary" disabled={busy}>{busy ? 'Đang xem trước…' : 'Xem trước'}</button></footer>
      </form>}
    </Modal>
  </section>;
}

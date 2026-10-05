'use client';

import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import '@/styles/inventory-matrix.css';

export type MatrixRoom = { id: string; name: string; code: string; status: string; capacityVerified?: boolean; approvedPoolLimit?: number | null };
export type MatrixDay = { roomTypeId: string; stayDate: string; available: number | null; version: number | null; capacity: number | null; blockedCount?: number | null; heldCount?: number | null; reservedCount?: number | null; stopSell?: boolean; saleState?: string; integrityHold?: boolean; dataState?: string; updatedAt?: string | null; lastConfirmedAt?: string | null; lastConfirmedSource?: string | null };
export type AvailableChange = { roomTypeId: string; stayDate: string; available: number; expectedVersion: number; reopen: boolean };
export const businessToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
export const shiftInventoryDay = (key: string, days: number) => new Date(new Date(`${key}T00:00:00Z`).getTime() + days * 86_400_000).toISOString().slice(0, 10);
export function inventoryDates(anchor: string, view: 'week' | 'month') {
  const from = view === 'month' ? `${anchor.slice(0, 7)}-01` : anchor;
  const count = view === 'month' ? new Date(Date.UTC(Number(from.slice(0, 4)), Number(from.slice(5, 7)), 0)).getUTCDate() : 7;
  return Array.from({ length: count }, (_, i) => shiftInventoryDay(from, i));
}
const dateLabel = (date: string) => new Intl.DateTimeFormat('vi-VN', { timeZone: 'UTC', day: '2-digit', month: '2-digit', weekday: 'short' }).format(new Date(`${date}T00:00:00Z`));
const sourceLabel: Record<string, string> = { admin: 'Quản trị viên', partner_portal: 'Đối tác', google_sheets: 'Google Sheets' };

type Props = {
  mode: 'admin' | 'partner'; propertyName: string; rooms: MatrixRoom[]; items: MatrixDay[]; dates: string[];
  view: 'week' | 'month'; anchor: string; onView: (view: 'week' | 'month') => void; onAnchor: (day: string) => void;
  canWrite: boolean; loading?: boolean; onRefresh: () => Promise<void>;
  onSave: (change: AvailableChange, key: string) => Promise<unknown>;
  onOpen?: (room: MatrixRoom, day: string, capacity: number, key: string) => Promise<unknown>;
  onPreview?: (changes: AvailableChange[]) => Promise<{ items: Array<{ stayDate: string; beforeAvailable: number; available: number }> }>;
  onBulk?: (changes: AvailableChange[], key: string) => Promise<unknown>;
  onConfirm?: (roomTypeId: string) => Promise<void>;
};

export function InventoryCalendarMatrix(props: Props) {
  const { mode, propertyName, rooms, items, dates, canWrite, loading, view, onView } = props;
  const [editing, setEditing] = useState<{ room: MatrixRoom; day: MatrixDay } | null>(null);
  const [available, setAvailable] = useState('');
  const [capacity, setCapacity] = useState('');
  const [reopen, setReopen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [commandKey, setCommandKey] = useState('');
  const [bulk, setBulk] = useState<{ changes: AvailableChange[]; items: Array<{ stayDate: string; beforeAvailable: number; available: number }>; key: string } | null>(null);
  const byKey = new Map(items.map((item) => [`${item.roomTypeId}:${item.stayDate}`, item]));
  const scopeKey = rooms.map((room) => room.id).join(',');
  useEffect(() => { setEditing(null); setBulk(null); setError(''); }, [propertyName, scopeKey]);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)');
    const forceWeek = () => { if (media.matches && view !== 'week') onView('week'); };
    forceWeek(); media.addEventListener('change', forceWeek); return () => media.removeEventListener('change', forceWeek);
  }, [view, onView]);
  const eligible = (room: MatrixRoom) => room.status === 'active' && room.capacityVerified !== false;
  const stop = (day: MatrixDay) => day.stopSell || day.saleState === 'stop_sell';
  const openCell = (room: MatrixRoom, day: string) => {
    const snapshot = byKey.get(`${room.id}:${day}`) ?? { roomTypeId: room.id, stayDate: day, available: null, version: null, capacity: null };
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
  const preview = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError(''); setBulk(null); setBusy(true);
    try {
      const data = new FormData(event.currentTarget), roomId = String(data.get('roomTypeId')), from = String(data.get('from')), to = String(data.get('to'));
      const count = (Date.parse(to) - Date.parse(from)) / 86_400_000;
      if (count < 0 || count >= 90 || !Number.isInteger(count)) throw new Error('Chọn từ 1 đến 90 đêm.');
      const changes = Array.from({ length: count + 1 }, (_, i) => {
        const stayDate = shiftInventoryDay(from, i), row = byKey.get(`${roomId}:${stayDate}`);
        if (!row?.version) throw new Error(`Ngày ${stayDate} chưa mở quỹ hoặc ngoài lịch đang tải. Hãy mở/xem khoảng này trước.`);
        return { roomTypeId: roomId, stayDate, available: Number(data.get('available')), expectedVersion: row.version, reopen: data.has('reopen') };
      });
      const result = await props.onPreview!(changes); setBulk({ changes, items: result.items, key: crypto.randomUUID() });
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Chưa xem trước được.'); } finally { setBusy(false); }
  };
  const move = (delta: number) => {
    if (props.view === 'week') props.onAnchor(shiftInventoryDay(props.anchor, delta * 7));
    else { const date = new Date(`${props.anchor.slice(0, 7)}-01T00:00:00Z`); date.setUTCMonth(date.getUTCMonth() + delta); props.onAnchor(date.toISOString().slice(0, 10)); }
  };
  return <section className="inventory-matrix" aria-label={`Tình trạng phòng ${propertyName}`}>
    <div className="inventory-matrix__toolbar"><h3>Tình trạng phòng · {propertyName}</h3><label>Chế độ<select value={props.view} onChange={(e) => props.onView(e.target.value as 'week' | 'month')}><option value="week">Tuần · 7 ngày</option><option value="month">Tháng</option></select></label>
      <div><button type="button" onClick={() => move(-1)} aria-label="Khoảng trước">←</button><button type="button" onClick={() => props.onAnchor(businessToday())}>Hôm nay</button><button type="button" onClick={() => move(1)} aria-label="Khoảng sau">→</button></div>
      <label>Bắt đầu lịch<input type="date" value={props.anchor} onChange={(e) => { if (e.target.value) props.onAnchor(e.target.value); }} /></label><strong>{dates[0]} → {dates.at(-1)}</strong><button type="button" onClick={() => void props.onRefresh()} disabled={loading}>Tải lại lịch</button></div>
    {loading && <p role="status">Đang tải lịch…</p>}
    {error && <p className="inventory-matrix__error" role="alert">{error}</p>}
    <div className="inventory-matrix__scroll" tabIndex={0} role="region" aria-label="Lịch theo hạng phòng, cuộn ngang để xem ngày"><table><thead><tr><th>Hạng phòng</th>{dates.map((day) => <th key={day}>{dateLabel(day)}</th>)}</tr></thead><tbody>{rooms.map((room) => <tr key={room.id}><th scope="row"><strong>{room.name}</strong><span>{room.code}</span><small>{room.status !== 'active' ? 'Chưa hoạt động' : room.capacityVerified === false ? 'Chưa xác minh sức chứa' : 'Đã xác minh'}</small>{props.onConfirm && <button type="button" disabled={busy || dates.some((date) => !byKey.get(`${room.id}:${date}`)?.version)} onClick={async () => { setBusy(true); try { await props.onConfirm!(room.id); } finally { setBusy(false); } }}>Đã kiểm tra, không đổi</button>}</th>{dates.map((date) => {
      const day = byKey.get(`${room.id}:${date}`), missing = !day?.version;
      const label = missing ? 'Chưa mở' : day.integrityHold ? 'Cần rà soát' : stop(day) || day.available === 0 ? 'Hết phòng' : day.available === null ? 'Cần xác nhận' : `${day.available} phòng`;
      return <td key={date}><button type="button" className={`inventory-matrix__cell${missing ? ' is-missing' : stop(day!) || day?.available === 0 ? ' is-empty' : ' is-available'}`} aria-label={`${room.name} · ${room.code} · ${date}: ${label}`} disabled={loading || !eligible(room) || (!canWrite && missing)} onClick={() => openCell(room, date)}>{loading ? 'Đang tải…' : label}{day?.dataState === 'stale' && <small>Cần xác nhận lại</small>}</button></td>;
    })}</tr>)}</tbody></table></div>
    {!rooms.length && <p>Chưa có hạng phòng trong phạm vi này.</p>}
    <p className="inventory-matrix__note">Mỗi ô là một hạng phòng/một đêm. Chưa mở quỹ không đồng nghĩa hết phòng.{mode === 'partner' && ' Ngày chưa mở: liên hệ quản trị viên.'}</p>
    {canWrite && props.onBulk && props.onPreview && <details className="inventory-matrix__bulk"><summary>Cập nhật nhiều ngày · một hạng phòng</summary><form onSubmit={preview}><label>Hạng phòng<select name="roomTypeId" required>{rooms.filter(eligible).map((room) => <option value={room.id} key={room.id}>{room.name} · {room.code}</option>)}</select></label><label>Từ ngày<input name="from" type="date" defaultValue={dates[0]} required /></label><label>Đến ngày (gồm đêm này)<input name="to" type="date" defaultValue={dates.at(-1)} required /></label><label>Số phòng còn bán<input name="available" type="number" min="0" max="5000" required /></label><label><input name="reopen" type="checkbox" /> Mở bán lại nếu đang dừng bán</label><button disabled={busy}>Xem trước</button></form>
      {bulk && <div className="inventory-matrix__preview"><strong>{rooms.find((r) => r.id === bulk.changes[0].roomTypeId)?.name} · {rooms.find((r) => r.id === bulk.changes[0].roomTypeId)?.code}</strong>{bulk.items.map((item) => <p key={item.stayDate}>{item.stayDate}: {item.beforeAvailable} → {item.available} phòng</p>)}<button disabled={busy} onClick={async () => { setBusy(true); setError(''); try { await props.onBulk!(bulk.changes, bulk.key); await props.onRefresh(); setBulk(null); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Lô chưa được lưu.'); } finally { setBusy(false); } }}>Xác nhận và lưu toàn bộ lô</button></div>}</details>}
    <Modal className="inventory-matrix-dialog" open={!!editing} onClose={() => { if (!busy) setEditing(null); }} labelledBy="inventory-cell-title">
      {editing && <><h2 id="inventory-cell-title">{propertyName}</h2><h3>{editing.room.name} · {editing.room.code}</h3><p>{dateLabel(editing.day.stayDate)}</p>
        {error && <p role="alert" className="inventory-matrix__error">{error}</p>}
        {!editing.day.version && mode === 'partner' ? <p>Chưa mở quỹ. Liên hệ quản trị viên để mở quỹ hạng phòng này.</p> : <form className="inventory-matrix__edit" onSubmit={save}>
          {!editing.day.version ? <><h3>Mở quỹ</h3><label>Tổng số phòng/sức chứa đã xác minh<input type="number" min="0" max={editing.room.approvedPoolLimit ?? 5000} value={capacity} onChange={(e) => { setCapacity(e.target.value); setCommandKey(crypto.randomUUID()); }} required /></label><label><input type="checkbox" required /> Tôi đã xác minh sức chứa hạng phòng này</label></> : <><label>Số phòng còn bán<input type="number" min="0" max="5000" value={available} onChange={(e) => { setAvailable(e.target.value); setCommandKey(crypto.randomUUID()); }} disabled={!canWrite || !!editing.day.integrityHold} required /></label><button type="button" disabled={!canWrite} onClick={() => { setAvailable('0'); setCommandKey(crypto.randomUUID()); }}>Đánh dấu hết phòng</button>{stop(editing.day) && <label><input type="checkbox" checked={reopen} onChange={(e) => { setReopen(e.target.checked); setCommandKey(crypto.randomUUID()); }} required /> Xác nhận mở bán lại</label>}</>}
          <button disabled={busy || !canWrite || !!editing.day.integrityHold}>{busy ? 'Đang lưu…' : 'Lưu'}</button></form>}
        <details><summary>Chi tiết (chỉ đọc)</summary><dl className="inventory-matrix__detail">{[['Sức chứa', editing.day.capacity], ['Khoá', editing.day.blockedCount], ['Đang giữ', editing.day.heldCount], ['Đã đặt', editing.day.reservedCount], ['Nguồn xác nhận', sourceLabel[editing.day.lastConfirmedSource ?? ''] ?? editing.day.lastConfirmedSource], ['Xác nhận lần cuối', editing.day.lastConfirmedAt], ['Cập nhật lần cuối', editing.day.updatedAt], ['Version', editing.day.version]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value ?? 'Chưa có'}</dd></div>)}</dl></details>
      </>}
    </Modal>
  </section>;
}

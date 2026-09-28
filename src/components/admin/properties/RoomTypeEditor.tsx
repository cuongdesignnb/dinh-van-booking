'use client';

import { useState, type FormEvent } from 'react';
import { BedDouble } from 'lucide-react';
import { apiRequest } from '@/lib/api/client';
import { AlbumEditor, type AlbumItem } from '../media/AlbumEditor';

export type PropertyRoom = {
  id: string; code: string; name: string; description: string | null;
  maxAdults: number; maxChildren: number; maxOccupancy: number; bedSummary: string | null;
  areaSqm: number | null; unitCount: number; status: string; version: number;
  gallery: AlbumItem[];
  rate: { baseRateVnd: number; weekendRateVnd: number | null; breakfastIncluded: boolean } | null;
};

type RoomForm = {
  code: string; name: string; description: string; maxAdults: string; maxChildren: string;
  bedSummary: string; areaSqm: string; unitCount: string; rateVnd: string;
  weekendRateVnd: string; breakfastIncluded: boolean; status: string; gallery: AlbumItem[];
};

function initial(room?: PropertyRoom): RoomForm {
  return {
    code: room?.code ?? '', name: room?.name ?? '', description: room?.description ?? '',
    maxAdults: String(room?.maxAdults ?? 2), maxChildren: String(room?.maxChildren ?? 0),
    bedSummary: room?.bedSummary ?? '', areaSqm: room?.areaSqm ? String(room.areaSqm) : '',
    unitCount: String(room?.unitCount ?? 1), rateVnd: String(room?.rate?.baseRateVnd ?? 0),
    weekendRateVnd: room?.rate?.weekendRateVnd == null ? '' : String(room.rate.weekendRateVnd),
    breakfastIncluded: room?.rate?.breakfastIncluded ?? false, status: room?.status ?? 'active', gallery: room?.gallery ?? [],
  };
}

export function RoomTypeEditor({ propertyId, room, onSaved, onCancel }: {
  propertyId: string; room?: PropertyRoom; onSaved: () => Promise<void>; onCancel: () => void;
}) {
  const [form, setForm] = useState<RoomForm>(() => initial(room));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const patch = <K extends keyof RoomForm>(key: K, value: RoomForm[K]) => setForm((current) => ({ ...current, [key]: value }));
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setSaving(true); setError(null);
    try {
      const common = {
        name: form.name.trim(), description: form.description.trim(), maxAdults: Number(form.maxAdults),
        maxChildren: Number(form.maxChildren), bedSummary: form.bedSummary.trim(),
        areaSqm: form.areaSqm ? Number(form.areaSqm) : undefined, rateVnd: Number(form.rateVnd),
        weekendRateVnd: form.weekendRateVnd ? Number(form.weekendRateVnd) : undefined,
        breakfastIncluded: form.breakfastIncluded, galleryMediaIds: form.gallery.map((item) => item.mediaId),
      };
      if (room) await apiRequest(`/properties/${propertyId}/rooms/${room.id}`, { method: 'PATCH', body: JSON.stringify({ ...common, status: form.status, expectedVersion: room.version }) });
      else await apiRequest(`/properties/${propertyId}/rooms`, { method: 'POST', body: JSON.stringify({ ...common, code: form.code.trim().toUpperCase(), unitCount: Number(form.unitCount) }) });
      await onSaved();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không thể lưu hạng phòng.'); }
    finally { setSaving(false); }
  };
  return <form className="acard property-form" onSubmit={save}>
    <div className="property-form__title"><div><h3>{room ? `Sửa hạng phòng: ${room.name}` : 'Thêm hạng phòng'}</h3><p className="ahint">Ảnh album riêng sẽ xuất hiện trong trang chi tiết. Giá 0đ hiển thị “Liên hệ” và không đặt trực tuyến.</p></div><BedDouble size={22} aria-hidden="true" /></div>
    {error && <p className="settings-screen__message settings-screen__message--error" role="alert">{error}</p>}
    <div className="property-form__grid">
      <label className="afield"><span>Mã hạng phòng *</span><input className="ainput" value={form.code} onChange={(event) => patch('code', event.target.value.toUpperCase())} disabled={!!room} required maxLength={40} pattern="[A-Za-z0-9_-]+" /></label>
      <label className="afield"><span>Tên hạng phòng *</span><input className="ainput" value={form.name} onChange={(event) => patch('name', event.target.value)} required maxLength={160} /></label>
      <label className="afield property-form__wide"><span>Mô tả ngắn</span><input className="ainput" value={form.description} onChange={(event) => patch('description', event.target.value)} maxLength={500} /></label>
      <label className="afield"><span>Người lớn tối đa *</span><input className="ainput" type="number" min="1" max="30" value={form.maxAdults} onChange={(event) => patch('maxAdults', event.target.value)} required /></label>
      <label className="afield"><span>Trẻ em tối đa *</span><input className="ainput" type="number" min="0" max="30" value={form.maxChildren} onChange={(event) => patch('maxChildren', event.target.value)} required /></label>
      <label className="afield"><span>Giường / view</span><input className="ainput" value={form.bedSummary} onChange={(event) => patch('bedSummary', event.target.value)} maxLength={120} /></label>
      <label className="afield"><span>Diện tích (m²)</span><input className="ainput" type="number" min="1" value={form.areaSqm} onChange={(event) => patch('areaSqm', event.target.value)} /></label>
      <label className="afield"><span>Số phòng bán được</span><input className="ainput" type="number" min="1" max="100" value={form.unitCount} onChange={(event) => patch('unitCount', event.target.value)} disabled={!!room} required /></label>
      {room && <label className="afield"><span>Hiển thị hạng phòng</span><select className="ainput" value={form.status} onChange={(event) => patch('status', event.target.value)}><option value="active">Đang hoạt động</option><option value="inactive">Tạm ẩn</option></select></label>}
      <label className="afield"><span>Giá ngày thường (VND) *</span><input className="ainput" type="number" min="0" value={form.rateVnd} onChange={(event) => patch('rateVnd', event.target.value)} required /></label>
      <label className="afield"><span>Giá cuối tuần (VND)</span><input className="ainput" type="number" min="0" value={form.weekendRateVnd} onChange={(event) => patch('weekendRateVnd', event.target.value)} /></label>
      <label className="atoggle property-form__toggle"><input type="checkbox" checked={form.breakfastIncluded} onChange={(event) => patch('breakfastIncluded', event.target.checked)} /><span className="atoggle__track"><span className="atoggle__thumb" /></span><span className="atoggle__text"><strong>Bao gồm bữa sáng</strong></span></label>
    </div>
    <div className="property-form__section"><AlbumEditor label={`Album hạng phòng: ${form.name || 'Chưa đặt tên'}`} items={form.gallery} onChange={(items) => patch('gallery', items)} /></div>
    <div className="property-form__actions"><button type="button" className="abtn abtn--ghost" onClick={onCancel} disabled={saving}>Quay lại nơi lưu trú</button><button type="submit" className="abtn abtn--primary" disabled={saving}>{saving ? 'Đang lưu…' : 'Lưu hạng phòng'}</button></div>
  </form>;
}

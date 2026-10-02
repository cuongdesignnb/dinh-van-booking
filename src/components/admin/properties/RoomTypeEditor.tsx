'use client';

import { useState, type FormEvent } from 'react';
import { BedDouble } from 'lucide-react';
import { apiRequest } from '@/lib/api/client';
import { searchKey } from '@/lib/admin/formatters';
import { slugFromTitle } from '@/lib/slug';
import { ROOM_UNIT_KINDS } from '@/lib/room-unit-kind';
import { ROOM_AMENITIES } from '@/lib/room-amenities';
import { formatVndInput, normalizeVndInput, parseVndInput } from '@/lib/vnd-input';
import { useAdminToast } from '@/components/admin/toast/useAdminToast';
import { AlbumEditor, type AlbumItem } from '../media/AlbumEditor';

export type PropertyRoom = {
  id: string; code: string; name: string; description: string | null;
  unitKind: string | null; bedroomCount: number | null; bathroomCount: number | null;
  maxAdults: number | null; maxChildren: number | null; maxOccupancy: number | null; bedSummary: string | null;
  capacityVerified: boolean;
  amenities: Array<{ code: string; label: string }>;
  areaSqm: number | null; unitCount: number; status: string; version: number;
  gallery: AlbumItem[];
  rate: { baseRateVnd: number; weekendRateVnd: number | null; breakfastIncluded: boolean } | null;
};

type RoomForm = {
  code: string; name: string; description: string; unitKind: string; bedroomCount: string; bathroomCount: string;
  maxAdults: string; maxChildren: string;
  capacityVerified: boolean; bedSummary: string; areaSqm: string; unitCount: string; rateVnd: string;
  weekendRateVnd: string; breakfastIncluded: boolean; status: string; gallery: AlbumItem[];
  amenityCodes: string[];
};

function initial(room?: PropertyRoom): RoomForm {
  return {
    code: room?.code ?? '', name: room?.name ?? '', description: room?.description ?? '',
    unitKind: room?.unitKind ?? '', bedroomCount: room?.bedroomCount == null ? '' : String(room.bedroomCount),
    bathroomCount: room?.bathroomCount == null ? '' : String(room.bathroomCount),
    maxAdults: room?.capacityVerified && room.maxAdults !== null ? String(room.maxAdults) : '',
    maxChildren: room?.capacityVerified && room.maxChildren !== null ? String(room.maxChildren) : '',
    capacityVerified: room?.capacityVerified ?? false,
    bedSummary: room?.bedSummary ?? '', areaSqm: room?.areaSqm ? String(room.areaSqm) : '',
    unitCount: room?.unitCount ? String(room.unitCount) : '', rateVnd: room?.rate ? formatVndInput(room.rate.baseRateVnd) : '',
    weekendRateVnd: room?.rate?.weekendRateVnd == null ? '' : formatVndInput(room.rate.weekendRateVnd),
    breakfastIncluded: room?.rate?.breakfastIncluded ?? false, status: room?.status ?? 'inactive', gallery: room?.gallery ?? [],
    amenityCodes: (room?.amenities ?? []).map((item) => item.code).filter((code) => ROOM_AMENITIES.some((item) => item.code === code)),
  };
}

const ROOM_EXAMPLES: Record<string, string> = {
  resort: 'Deluxe Garden, Suite hướng hồ, Villa 2 phòng ngủ',
  villa: 'Villa 2 phòng ngủ, Villa hướng vườn',
  homestay: 'Phòng đôi, Bungalow, Nhà sàn riêng',
  bungalow: 'Bungalow đôi, Bungalow gia đình',
  lodge: 'Phòng hướng rừng, Suite gia đình',
  stilt: 'Nhà sàn chung, Nhà sàn riêng',
  glamping: 'Lều đôi, Lều gia đình',
};

function roomNameKey(name: string): string {
  return searchKey(name.trim().replace(/\s+/g, ' '));
}

function suggestedRoomCode(name: string, existingRooms: Pick<PropertyRoom, 'name' | 'code'>[]): string {
  if (!name.trim()) return '';
  const matchingRoom = existingRooms.find((item) => roomNameKey(item.name) === roomNameKey(name));
  if (matchingRoom) return matchingRoom.code;
  const base = slugFromTitle(name).toUpperCase().slice(0, 40).replace(/-+$/g, '');
  const used = new Set(existingRooms.map((item) => item.code.toUpperCase()));
  if (!used.has(base)) return base;
  for (let index = 2; ; index += 1) {
    const suffix = `-${index}`;
    const candidate = `${base.slice(0, 40 - suffix.length).replace(/-+$/g, '')}${suffix}`;
    if (!used.has(candidate)) return candidate;
  }
}

export function RoomTypeEditor({ propertyId, propertyName, propertyKind, existingRooms = [], room, onEditExisting, onSaved, onCancel }: {
  propertyId: string; propertyName: string; propertyKind?: string; existingRooms?: PropertyRoom[];
  room?: PropertyRoom; onEditExisting: (roomId: string) => void;
  onSaved: (savedRoomId: string, addAnother?: boolean) => Promise<void>; onCancel: () => void;
}) {
  const [form, setForm] = useState<RoomForm>(() => initial(room));
  const toast = useAdminToast();
  const [codeTouched, setCodeTouched] = useState(Boolean(room));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const patch = <K extends keyof RoomForm>(key: K, value: RoomForm[K]) => setForm((current) => ({ ...current, [key]: value }));
  const duplicateRoom = form.name.trim() ? existingRooms.find((item) => item.id !== room?.id && roomNameKey(item.name) === roomNameKey(form.name)) : undefined;
  const unitCountLabel = form.unitKind === 'dorm_bed' ? 'Số giường bán riêng'
    : form.unitKind === 'tent' ? 'Số lều thuộc hạng này'
      : ['villa', 'bungalow', 'whole_house', 'stilt_house'].includes(form.unitKind) ? 'Số căn thuộc hạng này'
        : form.unitKind === 'room' || form.unitKind === 'suite' ? 'Số phòng thuộc hạng này' : 'Số đơn vị lưu trú của hạng này';
  const showBedroomCount = !['room', 'dorm_bed', 'tent'].includes(form.unitKind);
  const showBathroomCount = !['dorm_bed', 'tent'].includes(form.unitKind);
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const addAnother = !room && ((event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null)?.value === 'add-another';
    if (duplicateRoom) {
      const message = `Hạng “${duplicateRoom.name}” đã có tại ${propertyName}. Hãy sửa hạng đó thay vì tạo thêm bản trùng.`;
      setError(message); toast.error(message);
      return;
    }
    if (form.capacityVerified && (!form.maxAdults.trim() || !form.maxChildren.trim())) {
      const message = 'Hãy nhập cả số người lớn và trẻ em tối đa trước khi xác nhận sức chứa.';
      setError(message); toast.error(message);
      return;
    }
    const rateVnd = parseVndInput(form.rateVnd);
    const weekendRateVnd = parseVndInput(form.weekendRateVnd);
    if (form.rateVnd.trim() && rateVnd === undefined) {
      const message = 'Giá ngày thường phải là số VND nguyên không âm, ví dụ 650.000.';
      setError(message); toast.error(message);
      return;
    }
    if (form.weekendRateVnd.trim() && weekendRateVnd === undefined) {
      const message = 'Giá cuối tuần phải là số VND nguyên không âm, ví dụ 750.000.';
      setError(message); toast.error(message);
      return;
    }
    if (form.status === 'active' && !form.capacityVerified) {
      const message = 'Cần xác minh sức chứa riêng cho hạng phòng này trước khi mở bán.';
      setError(message); toast.error(message);
      return;
    }
    if (form.status === 'active' && (!Number(form.unitCount) || rateVnd === undefined)) {
      const message = 'Muốn mở hạng phòng, hãy nhập số phòng thực tế và giá ngày thường đã xác minh. Có thể lưu tạm ẩn trước.';
      setError(message); toast.error(message);
      return;
    }
    setSaving(true); setError(null);
    try {
      const common = {
        code: form.code.trim().toUpperCase(),
        name: form.name.trim(), description: form.description.trim(),
        unitKind: form.unitKind || null,
        bedroomCount: form.bedroomCount.trim() === '' ? null : Number(form.bedroomCount),
        bathroomCount: form.bathroomCount.trim() === '' ? null : Number(form.bathroomCount),
        maxAdults: form.maxAdults.trim() ? Number(form.maxAdults) : undefined,
        maxChildren: form.maxChildren.trim() ? Number(form.maxChildren) : undefined,
        capacityVerified: form.capacityVerified, bedSummary: form.bedSummary.trim(),
        areaSqm: form.areaSqm ? Number(form.areaSqm) : undefined,
        rateVnd,
        unitCount: form.unitCount.trim() === '' ? undefined : Number(form.unitCount),
        weekendRateVnd,
        breakfastIncluded: form.breakfastIncluded, galleryMediaIds: form.gallery.map((item) => item.mediaId),
        amenityCodes: form.amenityCodes,
      };
      const saved = room
        ? await apiRequest<{ roomTypes: PropertyRoom[] }>(`/properties/${propertyId}/rooms/${room.id}`, { method: 'PATCH', body: JSON.stringify({ ...common, status: form.status, expectedVersion: room.version }) })
        : await apiRequest<{ roomTypes: PropertyRoom[] }>(`/properties/${propertyId}/rooms`, { method: 'POST', body: JSON.stringify({ ...common, status: form.status }) });
      const savedRoom = saved.roomTypes.find((item) => room ? item.id === room.id : item.code === common.code);
      if (!savedRoom) throw new Error('Không xác định được hạng phòng vừa lưu.');
      await onSaved(savedRoom.id, addAnother);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không thể lưu hạng phòng.'); }
    finally { setSaving(false); }
  };
  return <form className="acard property-form" onSubmit={save}>
    <div className="property-form__title"><div><h3>{room ? `Sửa hạng phòng: ${room.name}` : `Thêm hạng phòng cho ${propertyName}`}</h3><p className="ahint">{room ? <>Bạn đang sửa riêng hạng <strong>{room.name}</strong> của {propertyName}; các hạng khác không thay đổi.</> : <>Mỗi lần lưu tạo <strong>một hạng phòng riêng</strong> của {propertyName}, không tạo mẫu chung cho các cơ sở.</>} Ví dụ phù hợp loại hình này: {ROOM_EXAMPLES[propertyKind ?? ''] ?? 'Phòng đôi, Suite, Villa'}. Mỗi hạng có sức chứa, số căn, giá và album độc lập.</p></div><BedDouble size={22} aria-hidden="true" /></div>
    <p className="room-editor__scope">Nơi lưu trú: <strong>{propertyName}</strong> · {room ? `Đang sửa ${room.code}` : 'Đang tạo một hạng mới'}</p>
    {duplicateRoom && <div className="room-editor__duplicate" role="alert"><span>“{duplicateRoom.name}” đã có trong {propertyName}. Thông tin giá, sức chứa và ảnh cần sửa ngay trên hạng hiện có.</span><button type="button" className="abtn abtn--ghost abtn--sm" onClick={() => onEditExisting(duplicateRoom.id)}>Sửa hạng {duplicateRoom.name}</button></div>}
    {room && !room.unitKind && <p className="settings-screen__message" role="status">Kiểu chỗ ở của hạng này chưa được xác minh. Hãy chọn phòng, villa, bungalow… đúng với hạng thực tế; lựa chọn này không áp dụng cho hạng khác.</p>}
    {room && !room.capacityVerified && <p className="settings-screen__message" role="status">Sức chứa hạng này chưa được xác minh. Hệ thống không dùng con số đang lưu để mở bán; hãy điền sức chứa thực tế và xác nhận trước khi bật hoạt động.</p>}
    {error && <p className="settings-screen__message settings-screen__message--error" role="alert">{error}</p>}
    <div className="property-form__grid">
      <div className="room-editor__section-heading"><span>01</span><div><h4>Thông tin riêng của hạng</h4><p>Tên và mã chỉ áp dụng trong nơi lưu trú này; có thể tạo thêm nhiều hạng khác sau khi lưu.</p></div></div>
      <label className="afield property-form__wide"><span>Kiểu chỗ ở của hạng{room ? '' : ' *'}</span><select className="ainput" value={form.unitKind} onChange={(event) => setForm((current) => ({ ...current, unitKind: event.target.value, bedroomCount: ['room', 'dorm_bed', 'tent'].includes(event.target.value) ? '' : current.bedroomCount, bathroomCount: ['dorm_bed', 'tent'].includes(event.target.value) ? '' : current.bathroomCount }))} required={!room}><option value="">Chọn theo thực tế của cơ sở</option>{ROOM_UNIT_KINDS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select><small className="ahint">Chọn đúng kiểu trước khi nhập số lượng. Các ô phòng/căn, phòng ngủ và phòng tắm sẽ thay đổi phù hợp.</small></label>
      <label className="afield"><span>Tên hạng phòng *</span><input className="ainput" value={form.name} onChange={(event) => { const name = event.target.value; setError(null); setForm((current) => ({ ...current, name, code: codeTouched ? current.code : suggestedRoomCode(name, existingRooms) })); }} required maxLength={160} placeholder={ROOM_EXAMPLES[propertyKind ?? '']?.split(',')[0] ?? 'Ví dụ: Deluxe Garden'} /></label>
      <label className="afield"><span>Mã hạng phòng *</span><input className="ainput" value={form.code} onChange={(event) => { setCodeTouched(true); patch('code', event.target.value.toUpperCase()); }} required maxLength={40} pattern="\s*[A-Za-z0-9_-]+\s*" /><small className="ahint">Tự gợi ý khi tạo mới; đổi tên không tự đổi mã. Có thể sửa mã trực tiếp; mã chỉ cần khác các hạng của {propertyName}.</small></label>
      <label className="afield property-form__wide"><span>Mô tả ngắn</span><input className="ainput" value={form.description} onChange={(event) => patch('description', event.target.value)} maxLength={500} placeholder="Điểm khác biệt thực tế của hạng phòng này" /></label>
      <fieldset className="room-editor__amenities property-form__wide"><legend>Tiện nghi riêng của hạng</legend><p>Chỉ chọn những tiện nghi đã xác minh cho hạng này; không tự áp dụng cho các hạng khác hoặc toàn khu nghỉ.</p><div className="room-editor__amenity-grid">{ROOM_AMENITIES.map((item) => <label key={item.code}><input type="checkbox" checked={form.amenityCodes.includes(item.code)} onChange={(event) => patch('amenityCodes', event.target.checked ? [...form.amenityCodes, item.code] : form.amenityCodes.filter((code) => code !== item.code))} /><span>{item.label}</span></label>)}</div></fieldset>
      <div className="room-editor__section-heading"><span>02</span><div><h4>Sức chứa và số phòng/căn</h4><p>Mỗi hạng có sức chứa và quỹ phòng riêng. Chỉ xác nhận sau khi đã đối chiếu thông tin của cơ sở.</p></div></div>
      {showBedroomCount && <label className="afield"><span>Số phòng ngủ của mỗi căn</span><input className="ainput" type="number" min="0" max="30" value={form.bedroomCount} onChange={(event) => patch('bedroomCount', event.target.value)} /><small className="ahint">Để trống nếu chưa xác minh hoặc không áp dụng.</small></label>}
      {showBathroomCount && <label className="afield"><span>Số phòng tắm riêng của mỗi {form.unitKind === 'room' || form.unitKind === 'suite' ? 'phòng' : 'căn'}</span><input className="ainput" type="number" min="0" max="30" value={form.bathroomCount} onChange={(event) => patch('bathroomCount', event.target.value)} /><small className="ahint">Thông tin riêng của một đơn vị thuộc hạng này.</small></label>}
      <label className="afield"><span>Người lớn tối đa{form.capacityVerified ? ' *' : ''}</span><input className="ainput" type="number" min="1" max="30" value={form.maxAdults} onChange={(event) => patch('maxAdults', event.target.value)} required={form.capacityVerified} /></label>
      <label className="afield"><span>Trẻ em tối đa{form.capacityVerified ? ' *' : ''}</span><input className="ainput" type="number" min="0" max="30" value={form.maxChildren} onChange={(event) => patch('maxChildren', event.target.value)} required={form.capacityVerified} /></label>
      <label className="atoggle property-form__toggle"><input type="checkbox" checked={form.capacityVerified} onChange={(event) => patch('capacityVerified', event.target.checked)} /><span className="atoggle__track"><span className="atoggle__thumb" /></span><span className="atoggle__text"><strong>Đã xác minh sức chứa</strong><small>Chỉ bật sau khi đối chiếu với cơ sở. Hạng chưa xác minh không thể hoạt động hay nhận đặt phòng.</small></span></label>
      <label className="afield"><span>Giường / đặc điểm phòng</span><input className="ainput" value={form.bedSummary} onChange={(event) => patch('bedSummary', event.target.value)} maxLength={120} placeholder="Ví dụ: 1 giường đôi · nhìn ra vườn" /></label>
      <label className="afield"><span>Diện tích (m²)</span><input className="ainput" type="number" min="1" value={form.areaSqm} onChange={(event) => patch('areaSqm', event.target.value)} /></label>
      <label className="afield"><span>{unitCountLabel}</span><input className="ainput" type="number" min="0" max="100" value={form.unitCount} onChange={(event) => patch('unitCount', event.target.value)} /><small className="ahint">{room ? 'Để trống nếu chưa xác minh. Không giảm số lượng tại đây để tránh ảnh hưởng đơn đặt và quỹ phòng.' : 'Để trống nếu chưa xác minh; quỹ phòng theo ngày được quản lý riêng.'}</small></label>
      <div className="room-editor__section-heading"><span>03</span><div><h4>Giá và trạng thái bán</h4><p>Chưa xác minh giá hoặc số phòng thì lưu tạm ẩn. Chỉ nhập 0đ khi muốn khách liên hệ thay vì đặt trực tuyến.</p></div></div>
      <label className="afield"><span>Trạng thái hạng phòng</span><select className="ainput" value={form.status} onChange={(event) => patch('status', event.target.value)}><option value="inactive">Tạm ẩn · chưa mở bán</option><option value="active">Đang hoạt động</option></select><small className="ahint">Muốn bật “Đang hoạt động”, cần xác minh sức chứa, số phòng/căn và giá. Có thể lưu giá trước khi mở bán bằng trạng thái “Tạm ẩn”.</small></label>
      <label className="afield"><span>Giá ngày thường (VND){room?.rate ? ' *' : ''}</span><input className="ainput" type="text" inputMode="numeric" pattern="[0-9., ]*" value={form.rateVnd} onChange={(event) => patch('rateVnd', normalizeVndInput(event.target.value))} onBlur={() => patch('rateVnd', formatVndInput(form.rateVnd))} required={!!room?.rate} /><small className="ahint">{room?.rate ? 'Giá đã được tạo; nhập giá mới để cập nhật. Có thể nhập 650000, 650.000 hoặc 650,000.' : 'Có thể nhập 650000, 650.000 hoặc 650,000. Để trống nếu chưa xác minh; nhập 0 nếu muốn hiển thị “Liên hệ”.'}</small></label>
      <label className="afield"><span>Giá cuối tuần (VND)</span><input className="ainput" type="text" inputMode="numeric" pattern="[0-9., ]*" value={form.weekendRateVnd} onChange={(event) => patch('weekendRateVnd', normalizeVndInput(event.target.value))} onBlur={() => patch('weekendRateVnd', formatVndInput(form.weekendRateVnd))} /><small className="ahint">Có thể nhập 750000, 750.000 hoặc 750,000.</small></label>
      <label className="atoggle property-form__toggle"><input type="checkbox" checked={form.breakfastIncluded} onChange={(event) => patch('breakfastIncluded', event.target.checked)} /><span className="atoggle__track"><span className="atoggle__thumb" /></span><span className="atoggle__text"><strong>Bao gồm bữa sáng</strong></span></label>
    </div>
    <div className="property-form__section"><div className="room-editor__section-heading"><span>04</span><div><h4>Album ảnh của hạng</h4><p>Ảnh trong album này chỉ thuộc hạng phòng đang chỉnh sửa và có thể tái sử dụng từ Media Library.</p></div></div><AlbumEditor label={`Album hạng phòng: ${form.name || 'Chưa đặt tên'}`} items={form.gallery} onChange={(items) => patch('gallery', items)} /></div>
    <div className="property-form__actions room-editor__actions"><button type="button" className="abtn abtn--ghost" onClick={onCancel} disabled={saving}>Quay lại danh sách hạng phòng</button><button type="submit" className="abtn abtn--primary" disabled={saving || !!duplicateRoom}>{saving ? 'Đang lưu…' : 'Lưu hạng phòng'}</button>{!room && <button type="submit" className="abtn abtn--ghost" value="add-another" disabled={saving || !!duplicateRoom}>Lưu và thêm hạng khác</button>}</div>
  </form>;
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import { DEMO_TODAY, addDays, coversNight, diffDays } from '@/data/admin/fixture-clock';
import { formatDate, vnd } from '@/lib/admin/formatters';
import { priceForDate, roomTypeAvailability } from '@/lib/admin/selectors';
import type { Booking, BookingLine } from '@/lib/admin/types';
import { useAdmin } from '../AdminStore';
import { FormDrawer } from '../shared/ui';

interface Draft {
  customerId: string;
  newCustomer: string;
  phone: string;
  propertyId: string;
  roomTypeId: string;
  comboId: string;
  checkIn: string;
  checkOut: string;
  rooms: number;
  adults: number;
  children: number;
  breakfast: boolean;
  transfer: boolean;
  note: string;
  channel: Booking['channel'];
}

const EMPTY: Draft = {
  customerId: '',
  newCustomer: '',
  phone: '',
  propertyId: '',
  roomTypeId: '',
  comboId: '',
  checkIn: addDays(DEMO_TODAY, 3),
  checkOut: addDays(DEMO_TODAY, 5),
  rooms: 1,
  adults: 2,
  children: 0,
  breakfast: false,
  transfer: false,
  note: '',
  channel: 'direct',
};

const BREAKFAST = 150000;
const TRANSFER = 300000;

/** Create / edit drawer. Availability is validated before the demo save. */
export function BookingFormDrawer({
  open,
  booking,
  onClose,
  onSaved,
  presetCustomerId,
}: {
  open: boolean;
  booking: Booking | null;
  onClose: () => void;
  onSaved: (id: string) => void;
  presetCustomerId?: string;
}) {
  const { data, commit, busy } = useAdmin();
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setDirty(false);
    if (booking) {
      setDraft({
        customerId: booking.customerId,
        newCustomer: '',
        phone: '',
        propertyId: booking.propertyId ?? '',
        roomTypeId: booking.roomTypeId ?? '',
        comboId: booking.comboId ?? '',
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        rooms: booking.rooms,
        adults: booking.adults,
        children: booking.children,
        breakfast: booking.lines.some((l) => l.label.includes('Bữa sáng')),
        transfer: booking.lines.some((l) => l.label.includes('Xe đón')),
        note: booking.note,
        channel: booking.channel,
      });
    } else {
      setDraft({ ...EMPTY, customerId: presetCustomerId ?? '' });
    }
  }, [open, booking, presetCustomerId]);

  const patch = (p: Partial<Draft>) => {
    setDraft((d) => ({ ...d, ...p }));
    setDirty(true);
  };

  const roomTypes = data.roomTypes.filter((t) => t.propertyId === draft.propertyId);
  const nights = Math.max(0, diffDays(draft.checkIn, draft.checkOut));
  const roomType = data.roomTypes.find((t) => t.id === draft.roomTypeId);
  const combo = data.combos.find((c) => c.id === draft.comboId);

  const lines: BookingLine[] = useMemo(() => {
    const out: BookingLine[] = [];
    if (roomType && nights > 0) {
      const price = Array.from({ length: nights }, (_, i) => priceForDate(roomType, addDays(draft.checkIn, i), data.rates).price);
      const avg = Math.round(price.reduce((s, p) => s + p, 0) / nights);
      out.push({ kind: 'room', refId: roomType.id, label: `${roomType.name} × ${nights} đêm × ${draft.rooms} phòng`, unit: 'đêm', quantity: nights * draft.rooms, unitPrice: avg });
    }
    if (combo) out.push({ kind: 'combo', refId: combo.id, label: combo.name, unit: 'khách', quantity: draft.adults + draft.children, unitPrice: combo.price });
    if (draft.breakfast) out.push({ kind: 'addon', refId: null, label: 'Bữa sáng bản địa', unit: 'suất', quantity: (draft.adults + draft.children) * Math.max(1, nights), unitPrice: BREAKFAST });
    if (draft.transfer) out.push({ kind: 'addon', refId: null, label: 'Xe đón tiễn', unit: 'lượt', quantity: 2, unitPrice: TRANSFER });
    return out;
  }, [roomType, combo, nights, draft, data.rates]);

  const total = lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);

  const availability = useMemo(() => {
    if (!roomType || nights <= 0) return null;
    let min = Infinity;
    let worstDay = draft.checkIn;
    for (let i = 0; i < nights; i++) {
      const day = addDays(draft.checkIn, i);
      const a = roomTypeAvailability(data, roomType.id, day);
      if (!a) continue;
      // When editing, the booking itself does not block its own dates.
      const own = booking && booking.roomTypeId === roomType.id && coversNight(booking.checkIn, booking.checkOut, day) ? 1 : 0;
      const free = a.free + own;
      if (free < min) {
        min = free;
        worstDay = day;
      }
    }
    return { free: min === Infinity ? 0 : min, day: worstDay };
  }, [roomType, nights, draft.checkIn, data, booking]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!draft.customerId && !draft.newCustomer.trim()) e.customer = 'Chọn khách có sẵn hoặc nhập tên khách mới.';
    if (draft.newCustomer.trim() && !/^[\d\s+().-]{8,}$/.test(draft.phone.trim())) e.phone = 'Nhập số điện thoại hợp lệ cho khách mới.';
    if (!draft.roomTypeId && !draft.comboId) e.service = 'Chọn loại phòng hoặc combo.';
    if (nights <= 0) e.dates = 'Ngày trả phòng phải sau ngày nhận phòng.';
    if (roomType && draft.adults + draft.children > roomType.capacityMax * draft.rooms)
      e.guests = `Số khách vượt sức chứa (${roomType.capacityMax} khách/phòng).`;
    if (availability && draft.rooms > availability.free)
      e.rooms = `Ngày ${formatDate(availability.day)} chỉ còn ${availability.free} phòng trống cho loại này.`;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const save = async () => {
    if (!validate()) return;
    const id = booking?.id ?? `dp${Date.now().toString().slice(-6)}`;
    const error = await commit(
      'save-booking',
      (draft2) => {
        let customerId = draft.customerId;
        if (!customerId) {
          customerId = `kh-${(draft2.customers.length + 1).toString().padStart(3, '0')}`;
          draft2.customers.push({
            id: customerId,
            name: draft.newCustomer.trim(),
            phone: draft.phone.trim(),
            email: '',
            city: '',
            source: 'direct',
            group: 'family',
            need: draft.note.slice(0, 60) || 'Khách mới từ quản trị',
            tags: [],
            preferences: [],
            note: '',
            ownerId: 'u-dinh-van',
            createdAt: DEMO_TODAY,
          });
        }
        const payload = {
          customerId,
          propertyId: draft.propertyId || null,
          roomTypeId: draft.roomTypeId || null,
          comboId: draft.comboId || null,
          checkIn: draft.checkIn,
          checkOut: draft.checkOut,
          rooms: draft.rooms,
          adults: draft.adults,
          children: draft.children,
          lines,
          channel: draft.channel,
          note: draft.note,
        };
        if (booking) {
          const b = draft2.bookings.find((x) => x.id === booking.id);
          if (!b) return 'Không tìm thấy đơn cần sửa.';
          if (b.status === 'cancelled') return 'Đơn đã hủy không thể chỉnh sửa.';
          Object.assign(b, payload);
          b.history.push({ at: `${DEMO_TODAY}T12:00:00+07:00`, text: 'Cập nhật thông tin đơn', author: 'Đinh Vân' });
        } else {
          const code = `#DP${2401 + draft2.bookings.length}`;
          draft2.bookings.push({
            ...payload,
            id,
            code,
            createdAt: DEMO_TODAY,
            status: 'pending_confirmation',
            paymentStatus: 'unpaid',
            history: [{ at: `${DEMO_TODAY}T12:00:00+07:00`, text: 'Tạo đơn từ trang quản trị', author: 'Đinh Vân' }],
            internalNotes: [],
          });
        }
      },
      booking ? 'Đã cập nhật booking mẫu' : 'Đã tạo đơn đặt phòng trong bản demo',
    );
    if (!error) {
      setDirty(false);
      onSaved(booking?.id ?? id);
      onClose();
    }
  };

  return (
    <FormDrawer
      open={open}
      onClose={onClose}
      dirty={dirty}
      wide
      title={booking ? `Sửa đơn ${booking.code}` : 'Tạo đặt phòng mới'}
      subtitle="Đơn được lưu vào dữ liệu mẫu trong máy; không gửi cho khách và không thu tiền."
      footer={
        <>
          <button type="button" className="abtn abtn--ghost" onClick={onClose}>
            Đóng
          </button>
          <button type="button" className="abtn abtn--primary" onClick={save} disabled={busy === 'save-booking'}>
            {busy === 'save-booking' ? 'Đang lưu…' : booking ? 'Lưu thay đổi' : 'Tạo đơn (bản demo)'}
          </button>
        </>
      }
    >
      <div className="bform">
        <div className="bform__col">
          <label className="afield">
            <span>Khách hàng có sẵn</span>
            <select
              className="ainput"
              value={draft.customerId}
              onChange={(e) => patch({ customerId: e.target.value })}
              aria-invalid={Boolean(errors.customer)}
            >
              <option value="">— Khách mới —</option>
              {data.customers.slice(0, 40).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} · {c.phone}
                </option>
              ))}
            </select>
          </label>
          {!draft.customerId && (
            <>
              <label className="afield">
                <span>Tên khách mới</span>
                <input className="ainput" value={draft.newCustomer} onChange={(e) => patch({ newCustomer: e.target.value })} aria-invalid={Boolean(errors.customer)} />
              </label>
              <label className="afield">
                <span>Số điện thoại</span>
                <input className="ainput" value={draft.phone} onChange={(e) => patch({ phone: e.target.value })} aria-invalid={Boolean(errors.phone)} />
                {errors.phone && <span className="aerror">{errors.phone}</span>}
              </label>
            </>
          )}
          {errors.customer && <p className="aerror">{errors.customer}</p>}

          <label className="afield">
            <span>Nơi lưu trú</span>
            <select className="ainput" value={draft.propertyId} onChange={(e) => patch({ propertyId: e.target.value, roomTypeId: '' })}>
              <option value="">— Không chọn —</option>
              {data.properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="afield">
            <span>Loại phòng</span>
            <select className="ainput" value={draft.roomTypeId} onChange={(e) => patch({ roomTypeId: e.target.value, comboId: '' })} disabled={!draft.propertyId}>
              <option value="">— Không chọn —</option>
              {roomTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} · {vnd(t.basePrice)}/đêm
                </option>
              ))}
            </select>
          </label>
          <label className="afield">
            <span>Hoặc combo du lịch</span>
            <select className="ainput" value={draft.comboId} onChange={(e) => patch({ comboId: e.target.value, roomTypeId: '', propertyId: '' })}>
              <option value="">— Không chọn —</option>
              {data.combos.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} · {vnd(c.price)}/khách
                </option>
              ))}
            </select>
          </label>
          {errors.service && <p className="aerror">{errors.service}</p>}
        </div>

        <div className="bform__col">
          <div className="bform__row">
            <label className="afield">
              <span>Ngày nhận</span>
              <input type="date" className="ainput" value={draft.checkIn} onChange={(e) => patch({ checkIn: e.target.value })} />
            </label>
            <label className="afield">
              <span>Ngày trả</span>
              <input type="date" className="ainput" value={draft.checkOut} min={draft.checkIn} onChange={(e) => patch({ checkOut: e.target.value })} />
            </label>
          </div>
          {errors.dates && <p className="aerror">{errors.dates}</p>}
          <div className="bform__row">
            <label className="afield">
              <span>Số phòng</span>
              <input type="number" min={1} max={5} className="ainput" value={draft.rooms} onChange={(e) => patch({ rooms: Number(e.target.value) })} />
            </label>
            <label className="afield">
              <span>Người lớn</span>
              <input type="number" min={1} max={12} className="ainput" value={draft.adults} onChange={(e) => patch({ adults: Number(e.target.value) })} />
            </label>
            <label className="afield">
              <span>Trẻ em</span>
              <input type="number" min={0} max={8} className="ainput" value={draft.children} onChange={(e) => patch({ children: Number(e.target.value) })} />
            </label>
          </div>
          {errors.guests && <p className="aerror">{errors.guests}</p>}
          {errors.rooms && <p className="aerror">{errors.rooms}</p>}
          {availability && (
            <p className="ahint">
              Ngày ít phòng nhất trong khoảng: {formatDate(availability.day)} còn {availability.free} phòng.
            </p>
          )}
          <fieldset className="bform__addons">
            <legend>Dịch vụ thêm</legend>
            <label>
              <input type="checkbox" checked={draft.breakfast} onChange={(e) => patch({ breakfast: e.target.checked })} /> Bữa sáng bản địa ({vnd(BREAKFAST)}/khách/đêm)
            </label>
            <label>
              <input type="checkbox" checked={draft.transfer} onChange={(e) => patch({ transfer: e.target.checked })} /> Xe đón tiễn ({vnd(TRANSFER)}/lượt)
            </label>
          </fieldset>
          <label className="afield">
            <span>Ghi chú</span>
            <textarea className="ainput" rows={2} value={draft.note} onChange={(e) => patch({ note: e.target.value })} />
          </label>
        </div>

        <div className="bform__col bform__col--summary">
          <h3>Bản tính tiền</h3>
          <ul className="bform__lines">
            {lines.map((l) => (
              <li key={l.label}>
                <span>{l.label}</span>
                <span className="numeric">{vnd(l.quantity * l.unitPrice)}</span>
              </li>
            ))}
            {!lines.length && <li className="bform__empty">Chọn dịch vụ để xem giá.</li>}
          </ul>
          <p className="bform__total">
            Tổng tạm tính <strong className="numeric">{vnd(total)}</strong>
          </p>
          {booking && booking.status !== 'pending_confirmation' && (
            <p className="ahint">
              Đơn đã xác nhận: thay đổi giá/ngày sẽ được ghi lại trong lịch sử và không sửa giá của các đơn đã chốt khác.
            </p>
          )}
          <p className="ahint">Giá lấy theo quy tắc demo: mùa &gt; cuối tuần &gt; giá cơ bản.</p>
        </div>
      </div>
    </FormDrawer>
  );
}

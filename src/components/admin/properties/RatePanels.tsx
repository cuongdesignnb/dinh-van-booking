'use client';

import { CalendarDays, ChevronDown, DollarSign, Plus, Settings } from 'lucide-react';
import { useId, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { DEMO_TODAY, addDays } from '@/data/admin/fixture-clock';
import { formatDate, formatDayMonth, vnd, weekdayShort } from '@/lib/admin/formatters';
import { priceForDate, roomTypeAvailability, seasonConflicts } from '@/lib/admin/selectors';
import type { Property, RateSeason, RoomType } from '@/lib/admin/types';
import { useAdmin } from '../AdminStore';
import { ConfirmDialog, Panel, RowMenu, StatusBadge, Toggle } from '../shared/ui';

/* ------------------------------------------------------- room types + prices */

export function RoomTypesPanel({ property, onChangeProperty }: { property?: Property; onChangeProperty: (id: string) => void }) {
  const { data, commit, busy } = useAdmin();
  const [editing, setEditing] = useState<RoomType | null>(null);
  const [creating, setCreating] = useState(false);
  const types = data.roomTypes.filter((t) => t.propertyId === property?.id);

  return (
    <Panel
      icon={<DollarSign size={17} aria-hidden="true" />}
      title="Loại phòng & Quy định giá"
      className="pr__rooms"
      action={
        <button type="button" className="abtn abtn--soft abtn--sm" onClick={() => setCreating(true)}>
          <Plus size={14} aria-hidden="true" /> Thêm loại phòng
        </button>
      }
      headExtra={
        <label className="pr__scope">
          <span className="sr-only">Chọn nơi lưu trú</span>
          <span className="aselect">
            <select className="ainput" value={property?.id ?? ''} onChange={(e) => onChangeProperty(e.target.value)}>
              {data.properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <ChevronDown size={13} aria-hidden="true" />
          </span>
        </label>
      }
    >
      <div className="tscroll">
        <table className="atable atable--compact">
          <thead>
            <tr>
              <th scope="col">Tên loại phòng</th>
              <th scope="col">Sức chứa</th>
              <th scope="col">Số phòng</th>
              <th scope="col" className="atable__num">
                Giá ngày thường
              </th>
              <th scope="col" className="atable__num">
                Giá cuối tuần
              </th>
              <th scope="col">Trạng thái</th>
              <th scope="col" />
            </tr>
          </thead>
          <tbody>
            {types.map((t) => (
              <tr key={t.id}>
                <td>{t.name}</td>
                <td className="numeric">{t.capacityMax} khách</td>
                <td className="numeric">{t.units}</td>
                <td className="atable__num">{vnd(t.basePrice)}</td>
                <td className="atable__num">{vnd(t.weekendPrice)}</td>
                <td>
                  <StatusBadge label={t.state === 'active' ? 'Đang hoạt động' : 'Tạm dừng'} tone={t.state === 'active' ? 'success' : 'muted'} small />
                </td>
                <td>
                  <RowMenu
                    label={`Thao tác cho ${t.name}`}
                    items={[
                      { label: 'Sửa loại phòng', onSelect: () => setEditing(t) },
                      {
                        label: t.state === 'active' ? 'Tạm dừng bán' : 'Mở bán lại',
                        onSelect: () =>
                          commit(
                            'room-state',
                            (draft) => {
                              const target = draft.roomTypes.find((x) => x.id === t.id);
                              if (target) target.state = target.state === 'active' ? 'paused' : 'active';
                            },
                            'Đã cập nhật loại phòng trong bản demo',
                          ),
                      },
                    ]}
                  />
                </td>
              </tr>
            ))}
            {!types.length && (
              <tr>
                <td colSpan={7}>Nơi lưu trú này chưa có loại phòng nào.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="pr__note">Bảng chỉ hiển thị loại phòng của nơi lưu trú đang chọn.</p>

      <RoomTypeModal
        open={creating || Boolean(editing)}
        roomType={editing}
        propertyId={property?.id ?? ''}
        busy={busy === 'room-type'}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
      />
    </Panel>
  );
}

function RoomTypeModal({
  open,
  roomType,
  propertyId,
  busy,
  onClose,
}: {
  open: boolean;
  roomType: RoomType | null;
  propertyId: string;
  busy: boolean;
  onClose: () => void;
}) {
  const { commit } = useAdmin();
  const id = useId();
  const [form, setForm] = useState({ name: '', capacityMax: 2, units: 1, basePrice: 650000, weekendPrice: 750000, bed: '1 giường lớn' });
  const [error, setError] = useState('');

  // Re-seed the form whenever the dialog opens for a different record.
  const key = roomType?.id ?? 'new';
  const [seeded, setSeeded] = useState('');
  if (open && seeded !== key) {
    setSeeded(key);
    setForm(
      roomType
        ? {
            name: roomType.name,
            capacityMax: roomType.capacityMax,
            units: roomType.units,
            basePrice: roomType.basePrice,
            weekendPrice: roomType.weekendPrice,
            bed: roomType.bed,
          }
        : { name: '', capacityMax: 2, units: 1, basePrice: 650000, weekendPrice: 750000, bed: '1 giường lớn' },
    );
    setError('');
  }

  const save = async () => {
    if (!form.name.trim()) {
      setError('Nhập tên loại phòng.');
      return;
    }
    if (form.basePrice <= 0 || form.weekendPrice <= 0) {
      setError('Giá phải lớn hơn 0.');
      return;
    }
    const err = await commit(
      'room-type',
      (draft) => {
        if (roomType) {
          const t = draft.roomTypes.find((x) => x.id === roomType.id);
          if (!t) return 'Không tìm thấy loại phòng.';
          const occupied = draft.bookings.filter((b) => b.roomTypeId === t.id && b.status !== 'cancelled' && b.checkOut > DEMO_TODAY).length;
          if (form.units < 1) return 'Số phòng phải từ 1 trở lên.';
          if (form.units < Math.min(occupied, t.units)) return `Đang có ${occupied} đơn giữ phòng loại này, không thể giảm xuống ${form.units} phòng.`;
          Object.assign(t, form);
          // Units are physical rooms: keep the unit list in sync.
          draft.roomUnits = draft.roomUnits.filter((u) => u.roomTypeId !== t.id);
          for (let i = 1; i <= t.units; i++) draft.roomUnits.push({ id: `${t.id}#${i}`, roomTypeId: t.id, propertyId: t.propertyId, label: `${t.name} ${i}` });
        } else {
          const newId = `${propertyId}__${Date.now().toString(36)}`;
          draft.roomTypes.push({
            id: newId,
            propertyId,
            name: form.name.trim(),
            capacityMin: Math.max(1, form.capacityMax - 1),
            capacityMax: form.capacityMax,
            area: 24,
            bed: form.bed,
            units: form.units,
            basePrice: form.basePrice,
            weekendPrice: form.weekendPrice,
            amenities: [],
            state: 'active',
          });
          for (let i = 1; i <= form.units; i++) draft.roomUnits.push({ id: `${newId}#${i}`, roomTypeId: newId, propertyId, label: `${form.name} ${i}` });
        }
      },
      'Đã lưu loại phòng trong bản demo',
    );
    if (!err) onClose();
  };

  return (
    <Modal open={open} onClose={onClose} labelledBy={id} className="dialog--admin">
      <h2 id={id} className="dialog__title">
        {roomType ? `Sửa ${roomType.name}` : 'Thêm loại phòng'}
      </h2>
      <div className="pr__form2">
        <label className="afield">
          <span>Tên loại phòng</span>
          <input className="ainput" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </label>
        <label className="afield">
          <span>Sức chứa tối đa</span>
          <input type="number" min={1} max={12} className="ainput" value={form.capacityMax} onChange={(e) => setForm({ ...form, capacityMax: Number(e.target.value) })} />
        </label>
        <label className="afield">
          <span>Số phòng (đơn vị bán)</span>
          <input type="number" min={1} max={30} className="ainput" value={form.units} onChange={(e) => setForm({ ...form, units: Number(e.target.value) })} />
        </label>
        <label className="afield">
          <span>Giường</span>
          <input className="ainput" value={form.bed} onChange={(e) => setForm({ ...form, bed: e.target.value })} />
        </label>
        <label className="afield">
          <span>Giá ngày thường (VND/đêm)</span>
          <input type="number" min={0} step={50000} className="ainput" value={form.basePrice} onChange={(e) => setForm({ ...form, basePrice: Number(e.target.value) })} />
        </label>
        <label className="afield">
          <span>Giá cuối tuần (VND/đêm)</span>
          <input type="number" min={0} step={50000} className="ainput" value={form.weekendPrice} onChange={(e) => setForm({ ...form, weekendPrice: Number(e.target.value) })} />
        </label>
      </div>
      {error && (
        <p className="aerror" role="alert">
          {error}
        </p>
      )}
      <div className="adialog__actions">
        <button type="button" className="abtn abtn--ghost" onClick={onClose}>
          Đóng
        </button>
        <button type="button" className="abtn abtn--primary" onClick={save} disabled={busy} data-autofocus>
          {busy ? 'Đang lưu…' : 'Lưu (bản demo)'}
        </button>
      </div>
    </Modal>
  );
}

/* --------------------------------------------------------------- rate rules */

export function RatesPanel() {
  const { data, commit, busy } = useAdmin();
  const [season, setSeason] = useState<RateSeason | null>(null);
  const [creating, setCreating] = useState(false);
  const conflicts = seasonConflicts(data.rates);

  return (
    <Panel
      icon={<Settings size={17} aria-hidden="true" />}
      title="Giá & mùa cao điểm"
      className="pr__rates"
    >
      <div className="pr__toggles">
        <Toggle
          checked={data.rates.weekendEnabled}
          label="Áp dụng giá cuối tuần"
          description="Tự động áp dụng cho thứ 6, thứ 7 và chủ nhật (đổi được trong cấu hình)."
          onChange={(v) =>
            commit('rates', (draft) => {
              draft.rates.weekendEnabled = v;
            }, 'Đã cập nhật quy tắc giá trong bản demo')
          }
        />
        <Toggle
          checked={data.rates.seasonalEnabled}
          label="Giá theo mùa cao điểm"
          description="Tùy chỉnh giá cho các giai đoạn đặc biệt."
          onChange={(v) =>
            commit('rates', (draft) => {
              draft.rates.seasonalEnabled = v;
            }, 'Đã cập nhật quy tắc giá trong bản demo')
          }
        />
      </div>

      <div className="pr__season-head">
        <h3>Mùa cao điểm sắp tới</h3>
        <button type="button" className="abtn abtn--soft abtn--sm" onClick={() => setCreating(true)}>
          <Plus size={13} aria-hidden="true" /> Thêm mùa
        </button>
      </div>
      <ul className="pr__seasons">
        {data.rates.seasons.map((s) => (
          <li key={s.id}>
            <span className="pr__season-name">
              <strong>{s.name}</strong>
              <small className="numeric">
                {formatDate(s.from)} – {formatDate(s.to)}
              </small>
            </span>
            <span className={`pr__season-value${s.enabled ? '' : ' is-off'}`}>
              {s.kind === 'percent' ? `+${s.value}%` : `+${vnd(s.value)}`}
            </span>
            <RowMenu
              label={`Thao tác cho mùa ${s.name}`}
              items={[
                { label: 'Sửa mùa', onSelect: () => setSeason(s) },
                {
                  label: s.enabled ? 'Tạm tắt' : 'Bật lại',
                  onSelect: () =>
                    commit(
                      'season',
                      (draft) => {
                        const t = draft.rates.seasons.find((x) => x.id === s.id);
                        if (t) t.enabled = !t.enabled;
                      },
                      'Đã cập nhật mùa giá trong bản demo',
                    ),
                },
              ]}
            />
          </li>
        ))}
      </ul>
      {conflicts.length > 0 && (
        <p className="aerror" role="alert">
          Xung đột quy tắc: {conflicts.join('; ')}.
        </p>
      )}
      <p className="pr__note">Quy tắc demo: giá override theo ngày &gt; mùa ưu tiên cao nhất &gt; giá cuối tuần &gt; giá cơ bản.</p>

      <SeasonModal open={creating || Boolean(season)} season={season} busy={busy === 'season-save'} onClose={() => { setCreating(false); setSeason(null); }} />
    </Panel>
  );
}

function SeasonModal({ open, season, busy, onClose }: { open: boolean; season: RateSeason | null; busy: boolean; onClose: () => void }) {
  const { data, commit } = useAdmin();
  const id = useId();
  const [form, setForm] = useState({ name: '', from: DEMO_TODAY, to: addDays(DEMO_TODAY, 7), kind: 'percent' as RateSeason['kind'], value: 10, priority: 5 });
  const [error, setError] = useState('');
  const [seeded, setSeeded] = useState('');
  const key = season?.id ?? 'new';
  if (open && seeded !== key) {
    setSeeded(key);
    setForm(
      season
        ? { name: season.name, from: season.from, to: season.to, kind: season.kind, value: season.value, priority: season.priority }
        : { name: '', from: DEMO_TODAY, to: addDays(DEMO_TODAY, 7), kind: 'percent', value: 10, priority: 5 },
    );
    setError('');
  }

  const sample = data.roomTypes[0];
  const preview = sample
    ? [0, 1, 2, 3, 4].map((i) => {
        const day = addDays(form.from, i);
        const base = priceForDate(sample, day, { ...data.rates, seasons: [] }).price;
        const applied = form.kind === 'percent' ? Math.round((base * (100 + form.value)) / 100 / 1000) * 1000 : base + form.value;
        return { day, base, applied };
      })
    : [];

  const save = async () => {
    if (!form.name.trim()) return setError('Nhập tên mùa.');
    if (form.to < form.from) return setError('Ngày kết thúc phải sau ngày bắt đầu.');
    if (form.value <= 0) return setError('Giá trị điều chỉnh phải lớn hơn 0.');
    const err = await commit(
      'season-save',
      (draft) => {
        if (season) {
          const s = draft.rates.seasons.find((x) => x.id === season.id);
          if (!s) return 'Không tìm thấy mùa giá.';
          Object.assign(s, form);
        } else {
          draft.rates.seasons.push({ id: `mua-${Date.now().toString(36)}`, enabled: true, ...form });
        }
      },
      'Đã lưu mùa giá trong bản demo',
    );
    if (!err) onClose();
  };

  return (
    <Modal open={open} onClose={onClose} labelledBy={id} className="dialog--admin">
      <h2 id={id} className="dialog__title">
        {season ? `Sửa mùa ${season.name}` : 'Thêm mùa cao điểm'}
      </h2>
      <div className="pr__form2">
        <label className="afield">
          <span>Tên mùa</span>
          <input className="ainput" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </label>
        <label className="afield">
          <span>Mức ưu tiên</span>
          <input type="number" min={1} max={20} className="ainput" value={form.priority} onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })} />
        </label>
        <label className="afield">
          <span>Từ ngày</span>
          <input type="date" className="ainput" value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value })} />
        </label>
        <label className="afield">
          <span>Đến ngày</span>
          <input type="date" className="ainput" value={form.to} min={form.from} onChange={(e) => setForm({ ...form, to: e.target.value })} />
        </label>
        <label className="afield">
          <span>Kiểu điều chỉnh</span>
          <select className="ainput" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as RateSeason['kind'] })}>
            <option value="percent">Phần trăm (%)</option>
            <option value="amount">Số tiền (VND)</option>
          </select>
        </label>
        <label className="afield">
          <span>Giá trị</span>
          <input type="number" min={0} className="ainput" value={form.value} onChange={(e) => setForm({ ...form, value: Number(e.target.value) })} />
        </label>
      </div>
      {sample && (
        <div className="pr__preview">
          <h3>Xem trước giá ({sample.name})</h3>
          <ul>
            {preview.map((p) => (
              <li key={p.day}>
                <span className="numeric">
                  {weekdayShort(p.day)} {formatDayMonth(p.day)}
                </span>
                <span className="numeric">{vnd(p.base)}</span>
                <strong className="numeric">{vnd(p.applied)}</strong>
              </li>
            ))}
          </ul>
        </div>
      )}
      {error && (
        <p className="aerror" role="alert">
          {error}
        </p>
      )}
      <div className="adialog__actions">
        <button type="button" className="abtn abtn--ghost" onClick={onClose}>
          Đóng
        </button>
        <button type="button" className="abtn abtn--primary" onClick={save} disabled={busy} data-autofocus>
          {busy ? 'Đang lưu…' : 'Lưu mùa (bản demo)'}
        </button>
      </div>
    </Modal>
  );
}

/* ---------------------------------------------------------------- inventory */

export function InventoryPanel({ property }: { property?: Property }) {
  const { data, today, commit, busy } = useAdmin();
  const [cell, setCell] = useState<{ roomTypeId: string; day: string } | null>(null);
  const [blockOpen, setBlockOpen] = useState(false);
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i + 1));
  const types = data.roomTypes.filter((t) => t.propertyId === property?.id);
  const detail = cell ? roomTypeAvailability(data, cell.roomTypeId, cell.day) : null;

  return (
    <Panel
      icon={<CalendarDays size={17} aria-hidden="true" />}
      title="Tình trạng phòng (7 ngày tới)"
      className="pr__inventory"
      action={<span className="atag">{property?.name ?? '—'}</span>}
    >
      <div className="pr__inv-wrap">
        <div className="tscroll">
          <table className="atable atable--compact pr__inv">
            <thead>
              <tr>
                <th scope="col">Loại phòng</th>
                {days.map((d) => (
                  <th key={d} scope="col" className="numeric">
                    {weekdayShort(d)}
                    <small>{formatDayMonth(d)}</small>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {types.map((t) => (
                <tr key={t.id}>
                  <th scope="row">
                    {t.name} <span className="numeric">({t.units})</span>
                  </th>
                  {days.map((d) => {
                    const a = roomTypeAvailability(data, t.id, d);
                    const free = a?.free ?? 0;
                    const tone = free === 0 ? 'full' : free <= Math.max(1, Math.round(t.units * 0.34)) ? 'low' : 'ok';
                    return (
                      <td key={d}>
                        <button
                          type="button"
                          className={`pr__cell pr__cell--${tone}`}
                          onClick={() => setCell({ roomTypeId: t.id, day: d })}
                          aria-label={`${t.name} ngày ${formatDate(d)}: còn ${free} phòng`}
                        >
                          {free}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
              {!types.length && (
                <tr>
                  <td colSpan={8}>Chưa có dữ liệu tồn phòng cho nơi lưu trú này.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <ul className="pr__inv-legend">
        <li>
          <span className="pr__dot pr__dot--ok" /> Còn nhiều
        </li>
        <li>
          <span className="pr__dot pr__dot--low" /> Còn ít
        </li>
        <li>
          <span className="pr__dot pr__dot--full" /> Hết phòng
        </li>
      </ul>

      <Modal open={Boolean(cell)} onClose={() => setCell(null)} labelledBy="inv-dialog" className="dialog--admin">
        <h2 id="inv-dialog" className="dialog__title">
          Tồn phòng {detail?.name} · {cell ? formatDate(cell.day) : ''}
        </h2>
        {detail ? (
          <>
            <ul className="pr__inv-detail">
              <li>
                <span>Tổng số phòng</span>
                <strong className="numeric">{detail.units}</strong>
              </li>
              <li>
                <span>Đã đặt</span>
                <strong className="numeric">{detail.booked}</strong>
              </li>
              <li>
                <span>Bảo trì</span>
                <strong className="numeric">{detail.maintenance}</strong>
              </li>
              <li>
                <span>Tạm khóa</span>
                <strong className="numeric">{detail.blocked}</strong>
              </li>
              <li>
                <span>Còn lại</span>
                <strong className="numeric">{detail.free}</strong>
              </li>
            </ul>
            {detail.reasons.length > 0 && <p className="pr__note">Lý do: {detail.reasons.join('; ')}</p>}
            <div className="adialog__actions">
              <button type="button" className="abtn abtn--ghost" onClick={() => setCell(null)}>
                Đóng
              </button>
              <button type="button" className="abtn abtn--primary" data-autofocus onClick={() => setBlockOpen(true)} disabled={detail.free <= 0}>
                Khóa 1 phòng ngày này
              </button>
            </div>
          </>
        ) : (
          <p>Chưa có dữ liệu.</p>
        )}
      </Modal>

      <ConfirmDialog
        open={blockOpen}
        onClose={() => setBlockOpen(false)}
        busy={busy === 'block'}
        tone="danger"
        title="Tạm khóa phòng"
        confirmLabel="Khóa phòng"
        reason={{ label: 'Lý do khóa (bắt buộc)', placeholder: 'Ví dụ: sửa điều hòa, giữ phòng cho khách quen…' }}
        onConfirm={async (reason) => {
          if (!cell) return;
          const err = await commit(
            'block',
            (draft) => {
              const a = roomTypeAvailability(draft, cell.roomTypeId, cell.day);
              if (!a) return 'Không tìm thấy loại phòng.';
              if (a.free <= 0) return 'Ngày này không còn phòng trống để khóa.';
              draft.inventoryOverrides.push({ roomTypeId: cell.roomTypeId, date: cell.day, flag: 'blocked', units: 1, reason });
            },
            'Đã khóa 1 phòng trong bản demo',
          );
          if (!err) {
            setBlockOpen(false);
            setCell(null);
          }
        }}
      >
        <p>
          Khóa 1 phòng {detail?.name} ngày {cell ? formatDate(cell.day) : ''} sẽ giảm số phòng bán được xuống {(detail?.free ?? 1) - 1}.
        </p>
        <p className="adialog__note">Thao tác không hủy đơn nào; nếu số phòng không đủ, hệ thống giữ nguyên dữ liệu và báo lỗi.</p>
      </ConfirmDialog>
    </Panel>
  );
}

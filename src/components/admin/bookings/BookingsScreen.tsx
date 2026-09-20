'use client';

import { CalendarDays, ChevronDown, Download, RotateCcw, Search } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { addDays } from '@/data/admin/fixture-clock';
import {
  BOOKING_STATUS,
  CHANNEL_LABEL,
  PAYMENT_STATUS,
  formatDate,
  searchKey,
  vnd,
} from '@/lib/admin/formatters';
import {
  bookingTotal,
  checkInsOn,
  checkOutsOn,
  inventoryForDay,
} from '@/lib/admin/selectors';
import type { Booking, BookingStatus } from '@/lib/admin/types';
import { useAdmin } from '../AdminStore';
import { MiniCalendar } from '../shared/charts';
import { AdminPagination, EmptyState, Panel, RowMenu, StatusBadge } from '../shared/ui';
import { BookingDetailPanel } from './BookingDetail';
import { BookingFormDrawer } from './BookingForm';
import { downloadCsv } from './export';

const STATUS_FILTERS: { id: string; label: string }[] = [
  { id: 'all', label: 'Tất cả trạng thái' },
  { id: 'pending_confirmation', label: 'Chờ xác nhận' },
  { id: 'confirmed', label: 'Đã xác nhận' },
  { id: 'checked_in', label: 'Đang lưu trú' },
  { id: 'completed', label: 'Hoàn tất' },
  { id: 'cancelled', label: 'Đã hủy' },
  { id: 'paid', label: 'Đã thanh toán (theo thanh toán)' },
  { id: 'unpaid', label: 'Chưa thanh toán (theo thanh toán)' },
];

const CHANNEL_FILTERS = [
  { id: 'all', label: 'Tất cả kênh' },
  { id: 'website', label: 'Website' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'direct', label: 'Trực tiếp' },
  { id: 'booking_com', label: 'Booking.com' },
  { id: 'agoda', label: 'Agoda' },
];

const SERVICE_FILTERS = [
  { id: 'all', label: 'Tất cả dịch vụ' },
  { id: 'room', label: 'Phòng nghỉ' },
  { id: 'combo', label: 'Combo du lịch' },
];

const GUEST_FILTERS = [
  { id: 'all', label: 'Tất cả' },
  { id: '1-2', label: '1 – 2 khách' },
  { id: '3-4', label: '3 – 4 khách' },
  { id: '5+', label: 'Từ 5 khách' },
];

const PAGE_SIZES = [15, 30, 50];

const SORTS = [
  { id: 'created-desc', label: 'Mới tạo gần đây' },
  { id: 'checkin-asc', label: 'Ngày nhận tăng dần' },
  { id: 'checkin-desc', label: 'Ngày nhận giảm dần' },
  { id: 'total-desc', label: 'Tổng tiền cao nhất' },
];

export function BookingsScreen() {
  const { data, range, today, commit, pushToast } = useAdmin();
  const params = useSearchParams();
  const pathname = usePathname();

  const q = params.get('q') ?? '';
  const status = params.get('status') ?? 'all';
  const channel = params.get('channel') ?? 'all';
  const service = params.get('service') ?? 'all';
  const guests = params.get('guests') ?? 'all';
  const comboId = params.get('combo');
  const customerId = params.get('customer');
  const dateField = (params.get('dateField') ?? 'checkIn') as 'checkIn' | 'createdAt';
  const from = params.get('from') ?? range.from;
  const to = params.get('to') ?? range.to;
  const page = Math.max(1, Number(params.get('page') ?? 1));
  const size = PAGE_SIZES.includes(Number(params.get('size'))) ? Number(params.get('size')) : 15;
  const sort = params.get('sort') ?? 'created-desc';
  const selectedId = params.get('selected');

  const [selection, setSelection] = useState<string[]>([]);
  const [bulk, setBulk] = useState('');
  const [formOpen, setFormOpen] = useState(params.get('action') === 'create');
  const [editing, setEditing] = useState<Booking | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(today.slice(0, 7));

  const setQuery = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === '' || v === 'all') next.delete(k);
      else next.set(k, v);
    }
    if (!('page' in patch)) next.delete('page');
    window.history.pushState(null, '', `${pathname}?${next.toString()}`);
  };

  const filtered = useMemo(() => {
    const key = searchKey(q.trim());
    return data.bookings.filter((b) => {
      const field = dateField === 'createdAt' ? b.createdAt : b.checkIn;
      if (field < from || field > to) return false;
      if (comboId && b.comboId !== comboId) return false;
      if (customerId && b.customerId !== customerId) return false;
      if (status !== 'all') {
        if (status === 'paid' && b.paymentStatus !== 'paid') return false;
        if (status === 'unpaid' && b.paymentStatus !== 'unpaid') return false;
        if (status !== 'paid' && status !== 'unpaid' && b.status !== status) return false;
      }
      if (channel !== 'all' && b.channel !== channel) return false;
      if (service === 'room' && !b.roomTypeId) return false;
      if (service === 'combo' && !b.comboId) return false;
      const total = b.adults + b.children;
      if (guests === '1-2' && total > 2) return false;
      if (guests === '3-4' && (total < 3 || total > 4)) return false;
      if (guests === '5+' && total < 5) return false;
      if (key) {
        const customer = data.customers.find((c) => c.id === b.customerId);
        const haystack = searchKey(`${b.code} ${customer?.name ?? ''} ${customer?.phone ?? ''}`);
        if (!haystack.includes(key)) return false;
      }
      return true;
    });
  }, [data, q, status, channel, service, guests, from, to, dateField, comboId, customerId]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    if (sort === 'checkin-asc') list.sort((a, b) => a.checkIn.localeCompare(b.checkIn) || a.code.localeCompare(b.code));
    else if (sort === 'checkin-desc') list.sort((a, b) => b.checkIn.localeCompare(a.checkIn) || a.code.localeCompare(b.code));
    else if (sort === 'total-desc') list.sort((a, b) => bookingTotal(b) - bookingTotal(a));
    else list.sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.code.localeCompare(a.code));
    return list;
  }, [filtered, sort]);

  const pages = Math.max(1, Math.ceil(filtered.length / size));
  const current = Math.min(page, pages);
  const rows = sorted.slice((current - 1) * size, current * size);
  // Without an explicit choice the panel opens the first booking that still
  // needs a decision, falling back to the first row on the page.
  const selected =
    data.bookings.find((b) => b.id === selectedId) ??
    rows.find((b) => b.status === 'pending_confirmation') ??
    rows[0] ??
    null;

  const counts = useMemo(() => {
    const by = (s: BookingStatus) => filtered.filter((b) => b.status === s).length;
    return {
      pending: by('pending_confirmation'),
      confirmed: by('confirmed'),
      paid: filtered.filter((b) => b.paymentStatus === 'paid').length,
      completed: by('completed'),
      cancelled: by('cancelled'),
      total: filtered.length,
    };
  }, [filtered]);

  const pageIds = rows.map((r) => r.id);
  const allOnPage = pageIds.length > 0 && pageIds.every((id) => selection.includes(id));
  const someOnPage = pageIds.some((id) => selection.includes(id)) && !allOnPage;

  const occupancyLevels: Record<string, 0 | 1 | 2> = {};
  const monthDays = 31;
  for (let i = 0; i < monthDays; i++) {
    const day = `${calendarMonth}-${String(i + 1).padStart(2, '0')}`;
    const inv = inventoryForDay(data, day);
    if (!inv.total) continue;
    occupancyLevels[day] = inv.free === 0 ? 2 : inv.free <= Math.max(1, Math.round(inv.total * 0.25)) ? 1 : 0;
  }

  const activeFilters =
    (q ? 1 : 0) + (status !== 'all' ? 1 : 0) + (channel !== 'all' ? 1 : 0) + (service !== 'all' ? 1 : 0) + (guests !== 'all' ? 1 : 0);

  const resetFilters = () => {
    const next = new URLSearchParams();
    if (selectedId) next.set('selected', selectedId);
    window.history.pushState(null, '', `${pathname}?${next.toString()}`);
    setSelection([]);
  };

  const runBulk = async () => {
    const ids = selection.filter((id) => pageIds.includes(id) || selection.includes(id));
    if (!bulk || !ids.length) return;
    const report = { ok: 0, skipped: 0 };
    await commit(
      'bulk',
      (draft) => {
        for (const id of ids) {
          const b = draft.bookings.find((x) => x.id === id);
          if (!b) continue;
          if (bulk === 'confirm') {
            if (b.status !== 'pending_confirmation') {
              report.skipped++;
              continue;
            }
            b.status = 'confirmed';
            b.history.push({ at: `${today}T12:00:00+07:00`, text: 'Xác nhận hàng loạt', author: 'Đinh Vân' });
            report.ok++;
          }
          if (bulk === 'mark-read') {
            report.ok++;
          }
        }
      },
      null,
    );
    setSelection([]);
    // Reported per group: a bulk action never claims success for skipped rows.
    pushToast(
      `${report.ok} đơn được cập nhật trong bản demo, ${report.skipped} đơn không đủ điều kiện.`,
      report.skipped ? 'info' : 'success',
    );
  };

  return (
    <div className="bk">
      <Panel
        title={<span className="sr-only">Bộ lọc đặt phòng</span>}
        className="bk__filters"
      >
        <div className="bk__filter-grid">
          <label className="afield">
            <span>Tìm kiếm</span>
            <span className="bk__search">
              <Search size={15} aria-hidden="true" />
              <input
                className="ainput"
                value={q}
                placeholder="Nhập mã đặt phòng, tên khách, SĐT…"
                onChange={(e) => setQuery({ q: e.target.value })}
              />
            </span>
          </label>
          <label className="afield">
            <span>
              Khoảng thời gian
              <select
                className="bk__datefield"
                value={dateField}
                onChange={(e) => setQuery({ dateField: e.target.value })}
                aria-label="Lọc theo trường ngày"
              >
                <option value="checkIn">theo ngày nhận phòng</option>
                <option value="createdAt">theo ngày tạo đơn</option>
              </select>
            </span>
            <span className="bk__range">
              <CalendarDays size={15} aria-hidden="true" />
              <input type="date" className="ainput" value={from} max={to} onChange={(e) => setQuery({ from: e.target.value })} aria-label="Từ ngày" />
              <span aria-hidden="true">–</span>
              <input type="date" className="ainput" value={to} min={from} onChange={(e) => setQuery({ to: e.target.value })} aria-label="Đến ngày" />
            </span>
          </label>
          <Select label="Trạng thái" value={status} options={STATUS_FILTERS} onChange={(v) => setQuery({ status: v })} />
          <Select label="Kênh đặt" value={channel} options={CHANNEL_FILTERS} onChange={(v) => setQuery({ channel: v })} />
          <Select label="Loại dịch vụ" value={service} options={SERVICE_FILTERS} onChange={(v) => setQuery({ service: v })} />
          <Select label="Số khách" value={guests} options={GUEST_FILTERS} onChange={(v) => setQuery({ guests: v })} />
          <Select label="Sắp xếp" value={sort} options={SORTS} onChange={(v) => setQuery({ sort: v })} />
          <div className="bk__filter-actions">
            <span className="ahint bk__export-note">Xuất tệp CSV (UTF-8), chưa có bản .xlsx</span>
            <button type="button" className="abtn abtn--ghost" onClick={resetFilters}>
              <RotateCcw size={15} aria-hidden="true" /> Xóa bộ lọc{activeFilters ? ` (${activeFilters})` : ''}
            </button>
            <button
              type="button"
              className="abtn abtn--primary"
              onClick={() =>
                downloadCsv(
                  selection.length ? filtered.filter((b) => selection.includes(b.id)) : filtered,
                  data,
                  selection.length ? 'dat-phong-da-chon' : 'dat-phong-da-loc',
                )
              }
            >
              <Download size={15} aria-hidden="true" /> Xuất CSV
            </button>
          </div>
        </div>
        {(comboId || customerId) && (
          <p className="bk__context">
            Đang lọc theo {comboId ? `combo ${data.combos.find((c) => c.id === comboId)?.name}` : `khách hàng ${data.customers.find((c) => c.id === customerId)?.name}`}.{' '}
            <button type="button" className="alink" onClick={() => setQuery({ combo: null, customer: null })}>
              Bỏ lọc
            </button>
          </p>
        )}
      </Panel>

      <div className="bk__grid">
        <div className="bk__left">
          <Panel
            icon={<CalendarDays size={18} aria-hidden="true" />}
            title={`Danh sách đặt phòng (${filtered.length} đơn)`}
            className="bk__table-card"
            action={
              <div className="bk__bulk">
                <span className="bk__selected">Đã chọn {selection.length} đơn</span>
                <label className="aselect bk__bulk-select">
                  <span className="sr-only">Chọn hành động</span>
                  <select className="ainput" value={bulk} onChange={(e) => setBulk(e.target.value)}>
                    <option value="">Chọn hành động</option>
                    <option value="confirm">Xác nhận các đơn chờ</option>
                    <option value="export">Xuất các đơn đã chọn</option>
                  </select>
                  <ChevronDown size={14} aria-hidden="true" />
                </label>
                <button
                  type="button"
                  className="abtn abtn--primary abtn--sm"
                  disabled={!bulk || !selection.length}
                  onClick={() => {
                    if (bulk === 'export') {
                      downloadCsv(filtered.filter((b) => selection.includes(b.id)), data, 'dat-phong-da-chon');
                      return;
                    }
                    void runBulk();
                  }}
                >
                  Thực hiện
                </button>
              </div>
            }
          >
            <div className="bk__table-wrap">
              <table className="atable bk__table">
                <thead>
                  <tr>
                    <th scope="col" className="bk__check">
                      <input
                        type="checkbox"
                        checked={allOnPage}
                        ref={(el) => {
                          if (el) el.indeterminate = someOnPage;
                        }}
                        onChange={(e) =>
                          setSelection((s) => (e.target.checked ? [...new Set([...s, ...pageIds])] : s.filter((id) => !pageIds.includes(id))))
                        }
                        aria-label="Chọn tất cả đơn trong trang này"
                      />
                    </th>
                    <th scope="col">#</th>
                    <th scope="col">Mã đặt phòng</th>
                    <th scope="col">Khách hàng</th>
                    <th scope="col">Dịch vụ / Phòng</th>
                    <th scope="col">Ngày nhận</th>
                    <th scope="col">Ngày trả</th>
                    <th scope="col">SL khách</th>
                    <th scope="col" className="atable__num">
                      Tổng tiền
                    </th>
                    <th scope="col">Trạng thái</th>
                    <th scope="col">Nguồn</th>
                    <th scope="col">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((b, i) => {
                    const customer = data.customers.find((c) => c.id === b.customerId);
                    const service = b.comboId
                      ? data.combos.find((c) => c.id === b.comboId)?.name
                      : data.properties.find((p) => p.id === b.propertyId)?.name;
                    return (
                      <tr
                        key={b.id}
                        className={`is-clickable${selected?.id === b.id ? ' is-selected' : ''}`}
                        onClick={() => setQuery({ selected: b.id, page: String(current) })}
                      >
                        <td className="bk__check" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selection.includes(b.id)}
                            onChange={(e) => setSelection((s) => (e.target.checked ? [...s, b.id] : s.filter((x) => x !== b.id)))}
                            aria-label={`Chọn đơn ${b.code}`}
                          />
                        </td>
                        <td className="numeric">{(current - 1) * size + i + 1}</td>
                        <td>
                          <strong>{b.code}</strong>
                        </td>
                        <td className="atable__ellipsis">{customer?.name}</td>
                        <td className="atable__ellipsis">{service}</td>
                        <td className="numeric">{formatDate(b.checkIn)}</td>
                        <td className="numeric">{formatDate(b.checkOut)}</td>
                        <td className="numeric">{b.adults + b.children}</td>
                        <td className="atable__num">{vnd(bookingTotal(b))}</td>
                        <td>
                          <StatusBadge label={BOOKING_STATUS[b.status].label} tone={BOOKING_STATUS[b.status].tone} small />
                          {b.paymentStatus !== 'unpaid' && (
                            <span className="bk__pay">{PAYMENT_STATUS[b.paymentStatus].label}</span>
                          )}
                        </td>
                        <td>{CHANNEL_LABEL[b.channel]}</td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <RowMenu
                            label={`Thao tác cho đơn ${b.code}`}
                            items={[
                              { label: 'Xem chi tiết', onSelect: () => setQuery({ selected: b.id }) },
                              {
                                label: 'Sửa thông tin',
                                onSelect: () => {
                                  setEditing(b);
                                  setFormOpen(true);
                                },
                              },
                              { label: 'Xuất đơn này (CSV)', onSelect: () => downloadCsv([b], data, `don-${b.code.slice(1)}`) },
                            ]}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {!rows.length && (
                <EmptyState
                  title="Không có đơn nào khớp bộ lọc."
                  text="Thử mở rộng khoảng thời gian hoặc xóa bớt điều kiện lọc."
                  action={
                    <button type="button" className="abtn abtn--ghost" onClick={resetFilters}>
                      Xóa bộ lọc
                    </button>
                  }
                />
              )}
            </div>
            <footer className="bk__table-foot">
              <label className="bk__size">
                Hiển thị
                <span className="aselect">
                  <select className="ainput" value={size} onChange={(e) => setQuery({ size: e.target.value, page: '1' })}>
                    {PAGE_SIZES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} aria-hidden="true" />
                </span>
                trên tổng {filtered.length} đặt phòng
              </label>
              <AdminPagination page={current} pages={pages} onChange={(p) => setQuery({ page: String(p) })} />
            </footer>
          </Panel>

          <div className="bk__widgets">
            <Panel
              title="Khách check-in hôm nay"
              action={
                <Link href={`/admin/dat-phong?from=${today}&to=${today}`} className="alink">
                  Xem tất cả
                </Link>
              }
              headExtra={<span className="bk__count numeric">{checkInsOn(data, today).length}</span>}
            >
              <WidgetList items={checkInsOn(data, today).slice(0, 3)} time="14:00" onSelect={(id) => setQuery({ selected: id })} />
            </Panel>
            <Panel
              title="Khách check-out hôm nay"
              action={
                <Link href={`/admin/dat-phong?dateField=checkIn&from=${addDays(today, -3)}&to=${today}`} className="alink">
                  Xem tất cả
                </Link>
              }
              headExtra={<span className="bk__count numeric">{checkOutsOn(data, today).length}</span>}
            >
              <WidgetList items={checkOutsOn(data, today).slice(0, 3)} time="12:00" onSelect={(id) => setQuery({ selected: id })} />
            </Panel>
            <Panel title="Đặt phòng gần đây" action={<Link href="/admin/dat-phong?dateField=createdAt" className="alink">Xem tất cả</Link>}>
              <ul className="bk__recent">
                {[...data.bookings]
                  .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.code.localeCompare(a.code))
                  .slice(0, 3)
                  .map((b) => (
                    <li key={b.id}>
                      <button type="button" onClick={() => setQuery({ selected: b.id })}>
                        <strong>{b.code}</strong>
                        <span className="numeric">{vnd(bookingTotal(b))}</span>
                        <StatusBadge label={BOOKING_STATUS[b.status].label} tone={BOOKING_STATUS[b.status].tone} small />
                        <small>{data.customers.find((c) => c.id === b.customerId)?.name}</small>
                      </button>
                    </li>
                  ))}
              </ul>
            </Panel>
          </div>
        </div>

        <div className="bk__right">
          <Panel
            icon={<CalendarDays size={16} aria-hidden="true" />}
            title="Tổng quan đặt phòng"
            action={<span className="atag">{`${formatDate(from)} – ${formatDate(to)}`}</span>}
          >
            <ul className="bk__summary">
              <SummaryTile label="Chờ xác nhận" value={counts.pending} tone="warning" onClick={() => setQuery({ status: 'pending_confirmation' })} />
              <SummaryTile label="Đã xác nhận" value={counts.confirmed} tone="success" onClick={() => setQuery({ status: 'confirmed' })} />
              <SummaryTile label="Đã thanh toán" value={counts.paid} tone="info" onClick={() => setQuery({ status: 'paid' })} />
              <SummaryTile label="Hoàn tất" value={counts.completed} tone="neutral" onClick={() => setQuery({ status: 'completed' })} />
              <SummaryTile label="Đã hủy" value={counts.cancelled} tone="danger" onClick={() => setQuery({ status: 'cancelled' })} />
              <SummaryTile label="Tổng cộng" value={counts.total} tone="muted" onClick={() => setQuery({ status: 'all' })} />
            </ul>
            <p className="bk__summary-note">
              “Đã thanh toán” là chỉ số thanh toán, có thể trùng với các trạng thái đặt phòng khác — không cộng 5 ô để ra tổng.
            </p>
          </Panel>

          <Panel icon={<CalendarDays size={16} aria-hidden="true" />} title="Lịch công suất phòng">
            <MiniCalendar
              month={calendarMonth}
              selected={from === to ? from : null}
              today={today}
              marks={{}}
              levels={occupancyLevels}
              onMonth={setCalendarMonth}
              onSelect={(d) => setQuery({ from: d, to: d, dateField: 'checkIn' })}
            />
            <ul className="bk__legend">
              <li>
                <span className="bk__legend-dot bk__legend-dot--free" /> Trống nhiều
              </li>
              <li>
                <span className="bk__legend-dot bk__legend-dot--soft" /> Gần đầy
              </li>
              <li>
                <span className="bk__legend-dot bk__legend-dot--full" /> Hầu như hết
              </li>
            </ul>
          </Panel>

          <BookingDetailPanel
            booking={selected}
            onEdit={(b) => {
              setEditing(b);
              setFormOpen(true);
            }}
          />
        </div>
      </div>

      <BookingFormDrawer
        open={formOpen}
        booking={editing}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSaved={(id) => setQuery({ selected: id })}
      />
    </div>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { id: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="afield">
      <span>{label}</span>
      <span className="aselect">
        <select className="ainput" value={value} onChange={(e) => onChange(e.target.value)}>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown size={14} aria-hidden="true" />
      </span>
    </label>
  );
}

function SummaryTile({
  label,
  value,
  tone,
  onClick,
}: {
  label: string;
  value: number;
  tone: string;
  onClick: () => void;
}) {
  return (
    <li>
      <button type="button" className={`bk__tile bk__tile--${tone}`} onClick={onClick}>
        <span>{label}</span>
        <strong className="numeric">{value}</strong>
      </button>
    </li>
  );
}

function WidgetList({ items, time, onSelect }: { items: Booking[]; time: string; onSelect: (id: string) => void }) {
  const { data } = useAdmin();
  if (!items.length) return <p className="bk__widget-empty">Không có khách nào.</p>;
  return (
    <ul className="bk__widget-list">
      {items.map((b) => {
        const customer = data.customers.find((c) => c.id === b.customerId);
        return (
          <li key={b.id}>
            <button type="button" onClick={() => onSelect(b.id)}>
              <span className="avatar avatar--initials" aria-hidden="true">
                {(customer?.name ?? '')
                  .split(' ')
                  .slice(-2)
                  .map((w) => w[0])
                  .join('')}
              </span>
              <span className="bk__widget-text">
                <strong>{customer?.name}</strong>
                <small>
                  {b.code} · {data.properties.find((p) => p.id === b.propertyId)?.name ?? data.combos.find((c) => c.id === b.comboId)?.name}
                </small>
              </span>
              <time className="numeric">{time}</time>
            </button>
          </li>
        );
      })}
    </ul>
  );
}


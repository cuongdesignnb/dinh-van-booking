'use client';

import {
  ArrowRight,
  CalendarDays,
  ChartColumn,
  ChartPie,
  CircleCheck,
  DollarSign,
  House,
  Leaf,
  MapPin,
  MessageCircle,
  Plus,
  Users,
  Zap,
} from 'lucide-react';
import Image from '@/components/ui/ManagedImage';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { DEMO_PREV_RANGE, DEMO_TODAY, addDays } from '@/data/admin/fixture-clock';
import {
  BOOKING_STATUS,
  PAYMENT_STATUS,
  formatDate,
  formatTime,
  initials,
  num,
  percent,
  vnd,
} from '@/lib/admin/formatters';
import {
  bookingTotal,
  checkInsOn,
  createdOn,
  crmStats,
  inventoryForDay,
  nightsOf,
  occupancyForRange,
  pendingBookings,
  revenueByDay,
  revenueForRange,
  topProperties,
  upcomingBookings,
} from '@/lib/admin/selectors';
import { useAdmin } from '../AdminStore';
import { Donut, MiniCalendar, RevenueChart } from '../shared/charts';
import { ConfirmDialog, DemoTag, Panel, StatCard, StatusBadge } from '../shared/ui';

export function OverviewScreen() {
  const { data, range, today, commit, busy } = useAdmin();
  const router = useRouter();
  const [month, setMonth] = useState(today.slice(0, 7));
  const [selectedDay, setSelectedDay] = useState<string>(today);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const inv = inventoryForDay(data, today);
  const occupancy = occupancyForRange(data, range);
  const revenue = revenueForRange(data, range);
  const revenuePrev = revenueForRange(data, DEMO_PREV_RANGE);
  const chart = revenueByDay(data, range);
  const crm = crmStats(data, range);
  const createdToday = createdOn(data, today);
  const createdYesterday = createdOn(data, addDays(today, -1));
  const pending = pendingBookings(data, 4);
  const upcoming = upcomingBookings(data, selectedDay, 5);
  const top = topProperties(data, range, 5);
  const bestCombo = [...data.combos].sort((a, b) => b.bookings - a.bookings)[0];
  const recentInquiries = [...data.inquiries]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5);

  const marks: Record<string, number> = {};
  for (const b of data.bookings) {
    if (b.status === 'cancelled') continue;
    marks[b.checkIn] = (marks[b.checkIn] ?? 0) + 1;
  }

  const delta = (now: number, prev: number) =>
    prev === 0 ? { text: 'Mới phát sinh', tone: 'muted' as const } : { text: `${now >= prev ? '+' : ''}${Math.round(((now - prev) / prev) * 100)}%`, tone: now >= prev ? ('good' as const) : ('bad' as const) };

  const revenueDelta = delta(revenue.total, revenuePrev.total);
  const bookingDelta = delta(createdToday.length, createdYesterday.length);
  const confirmTarget = data.bookings.find((b) => b.id === confirmId) ?? null;

  return (
    <div className="ovw">
      <section className="kpis" aria-label="Chỉ số chính">
        <StatCard
          icon={<CalendarDays size={22} aria-hidden="true" />}
          tone="mint"
          label="Đơn đặt phòng hôm nay"
          value={createdToday.length}
          delta={bookingDelta.text}
          deltaTone={bookingDelta.tone}
          caption={`So với hôm qua (${createdYesterday.length} đơn)`}
          hint="Đếm theo ngày tạo đơn (15/11/2024), khác với số khách nhận phòng hôm nay."
          href="/admin/dat-phong?created=today"
        />
        <StatCard
          icon={<DollarSign size={22} aria-hidden="true" />}
          tone="green"
          label="Doanh thu kỳ đang chọn"
          value={vnd(revenue.total)}
          delta={revenueDelta.text}
          deltaTone={revenueDelta.tone}
          caption="Giá trị các đơn hoàn tất trong kỳ"
          hint="Quy ước demo: tổng giá trị booking đã hoàn tất theo ngày trả phòng. Không phải số tiền đã thu."
        />
        <StatCard
          icon={<ChartPie size={22} aria-hidden="true" />}
          tone="cream"
          label="Tỉ lệ lấp đầy phòng"
          value={percent(inv.rate)}
          delta={`${occupancy.rate >= inv.rate ? '+' : ''}${Math.round(inv.rate - occupancy.rate)}%`}
          deltaTone={inv.rate >= occupancy.rate ? 'good' : 'bad'}
          caption={`Trung bình kỳ này: ${percent(occupancy.rate)}`}
          hint="Hôm nay: số phòng đang có khách / tổng số phòng có thể kinh doanh."
        />
        <StatCard
          icon={<MessageCircle size={22} aria-hidden="true" />}
          tone="rose"
          label="Yêu cầu tư vấn mới"
          value={data.inquiries.filter((i) => i.stage === 'new').length}
          delta={`${crm.unread} chưa đọc`}
          deltaTone="muted"
          caption={`Tổng ${crm.open} yêu cầu đang mở`}
          href="/admin/yeu-cau-tu-van?stage=new"
        />
        <StatCard
          icon={<Leaf size={22} aria-hidden="true" />}
          tone="mint"
          label="Combo bán chạy"
          value={bestCombo?.bookings ?? 0}
          delta="lượt đặt"
          deltaTone="muted"
          caption={bestCombo ? `${bestCombo.name} (${bestCombo.days}N${bestCombo.nights}Đ)` : '—'}
          href="/admin/combo-du-lich"
        />
        <StatCard
          icon={<Users size={22} aria-hidden="true" />}
          tone="sky"
          label="Lượt truy cập website"
          value={num(data.analytics.visits)}
          delta={delta(data.analytics.visits, data.analytics.visitsPrev).text}
          deltaTone="good"
          caption={<>Số mẫu, chưa gắn analytics <DemoTag /></>}
          hint="Chưa tích hợp công cụ phân tích; đây là số minh họa."
        />
      </section>

      <section className="ovw__row ovw__row--charts">
        <Panel
          icon={<ChartColumn size={18} aria-hidden="true" />}
          title="Biểu đồ doanh thu & đơn đặt phòng"
          action={<span className="atag">{`Từ ${formatDate(range.from)} đến ${formatDate(range.to)}`}</span>}
        >
          <RevenueChart points={chart} />
        </Panel>

        <Panel
          icon={<House size={18} aria-hidden="true" />}
          title="Tình trạng phòng nghỉ"
          action={<span className="atag">Hôm nay</span>}
        >
          <Donut
            center={percent(inv.rate)}
            caption={`Tỉ lệ lấp đầy hôm nay ${percent(inv.rate)}`}
            slices={[
              { id: 'booked', label: 'Đã đặt', value: inv.occupied, color: '#2a6f3e' },
              { id: 'free', label: 'Còn trống', value: inv.free, color: '#a8d3ae' },
              { id: 'maintenance', label: 'Bảo trì', value: inv.maintenance, color: '#c3c9c0' },
              { id: 'blocked', label: 'Tạm khóa', value: inv.blocked, color: '#efdca6' },
            ]}
          />
          <footer className="ovw__donut-foot">
            <p>
              Tổng số phòng
              <strong className="numeric">{inv.total} phòng</strong>
            </p>
            <Link href="/admin/phong-nghi#ton-phong" className="alink">
              Xem chi tiết <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </footer>
        </Panel>

        <Panel icon={<CalendarDays size={18} aria-hidden="true" />} title="Lịch trong tháng">
          <MiniCalendar
            month={month}
            selected={selectedDay}
            today={today}
            marks={marks}
            onMonth={setMonth}
            onSelect={(d) => setSelectedDay(d)}
          />
          <p className="cal__note">
            {`Ngày ${formatDate(selectedDay)}: ${checkInsOn(data, selectedDay).length} lượt nhận phòng`}
          </p>
        </Panel>
      </section>

      <section className="ovw__row ovw__row--lists">
        <Panel
          icon={<CalendarDays size={18} aria-hidden="true" />}
          title="Đặt phòng sắp tới"
          action={
            <Link href="/admin/dat-phong" className="alink">
              Xem tất cả <ArrowRight size={14} aria-hidden="true" />
            </Link>
          }
        >
          <div className="tscroll">
            <table className="atable atable--compact">
              <thead>
                <tr>
                  <th scope="col">#</th>
                  <th scope="col">Khách hàng</th>
                  <th scope="col">Phòng / Dịch vụ</th>
                  <th scope="col">Ngày nhận</th>
                  <th scope="col">Đêm</th>
                  <th scope="col">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {upcoming.map((b) => {
                  const customer = data.customers.find((c) => c.id === b.customerId);
                  const service = b.comboId
                    ? data.combos.find((c) => c.id === b.comboId)?.name
                    : data.properties.find((p) => p.id === b.propertyId)?.name;
                  return (
                    <tr key={b.id} onClick={() => router.push(`/admin/dat-phong?selected=${b.id}`)} className="is-clickable">
                      <td>
                        <Link href={`/admin/dat-phong?selected=${b.id}`} onClick={(e) => e.stopPropagation()}>
                          {b.code}
                        </Link>
                      </td>
                      <td>{customer?.name}</td>
                      <td className="atable__ellipsis">{service}</td>
                      <td className="numeric">{formatDate(b.checkIn)}</td>
                      <td className="numeric">{nightsOf(b)}</td>
                      <td>
                        <StatusBadge label={BOOKING_STATUS[b.status].label} tone={BOOKING_STATUS[b.status].tone} small />
                      </td>
                    </tr>
                  );
                })}
                {!upcoming.length && (
                  <tr>
                    <td colSpan={6}>Không có đơn nào từ ngày {formatDate(selectedDay)}.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel
          icon={<House size={18} aria-hidden="true" />}
          title="Phòng cần xác nhận"
          action={
            <Link href="/admin/dat-phong?status=pending_confirmation" className="alink">
              Xem tất cả <ArrowRight size={14} aria-hidden="true" />
            </Link>
          }
        >
          <ul className="confirm-list">
            {pending.map((b) => {
              const customer = data.customers.find((c) => c.id === b.customerId);
              const property = data.properties.find((p) => p.id === b.propertyId);
              return (
                <li key={b.id}>
                  {property?.cover ? <Image src={property.cover} alt="" width={72} height={52} className="confirm-list__img" /> : <span className="confirm-list__img confirm-list__img--empty" aria-hidden="true" />}
                  <div className="confirm-list__text">
                    <strong>{property?.name ?? data.combos.find((c) => c.id === b.comboId)?.name}</strong>
                    <span>
                      {b.code} · {customer?.name}
                    </span>
                    <span className="numeric">
                      {formatDate(b.checkIn)} ({nightsOf(b)} đêm)
                    </span>
                  </div>
                  <button type="button" className="abtn abtn--primary abtn--sm" onClick={() => setConfirmId(b.id)}>
                    Xác nhận
                  </button>
                </li>
              );
            })}
            {!pending.length && <li className="confirm-list__empty">Không còn đơn nào chờ xác nhận.</li>}
          </ul>
        </Panel>

        <Panel
          icon={<MessageCircle size={18} aria-hidden="true" />}
          title="Yêu cầu tư vấn gần đây"
          action={
            <Link href="/admin/yeu-cau-tu-van" className="alink">
              Xem tất cả <ArrowRight size={14} aria-hidden="true" />
            </Link>
          }
        >
          <ul className="inq-list">
            {recentInquiries.map((i) => {
              const customer = data.customers.find((c) => c.id === i.customerId);
              return (
                <li key={i.id}>
                  <Link href={`/admin/yeu-cau-tu-van?selected=${i.id}`} className="inq-list__link">
                    {customer?.avatar ? (
                      <Image src={customer.avatar} alt="" width={34} height={34} className="avatar" />
                    ) : (
                      <span className="avatar avatar--initials" aria-hidden="true">
                        {initials(customer?.name ?? '')}
                      </span>
                    )}
                    <span className="inq-list__text">
                      <strong>{customer?.name}</strong>
                      <span>{i.summary}</span>
                    </span>
                    <span className="inq-list__meta">
                      <time dateTime={i.createdAt}>{i.createdAt.slice(0, 10) === today ? formatTime(i.createdAt) : formatDate(i.createdAt.slice(0, 10))}</time>
                      {!i.read && <span className="inq-list__dot" aria-label="Chưa đọc" />}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Panel>
      </section>

      <section className="ovw__row ovw__row--bottom">
        <Panel
          icon={<ChartColumn size={18} aria-hidden="true" />}
          title="Top phòng nghỉ / dịch vụ được đặt nhiều nhất"
          action={
            <Link href="/admin/phong-nghi" className="alink">
              Xem tất cả <ArrowRight size={14} aria-hidden="true" />
            </Link>
          }
          className="acard--top"
        >
          <ol className="toplist">
            {top.map((t, i) => (
              <li key={t.property.id}>
                <Link href={`/admin/phong-nghi?selected=${t.property.id}`}>
                  <span className="toplist__rank" aria-hidden="true">
                    {i + 1}
                  </span>
                  <Image src={t.property.cover} alt="" width={128} height={78} className="toplist__img" />
                  <strong>{t.property.name}</strong>
                  <span className="toplist__meta numeric">
                    {t.count} lượt đặt <b>{t.property.rating.toFixed(1)} ★</b>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </Panel>

        <Panel icon={<Zap size={18} aria-hidden="true" />} title="Thao tác nhanh" className="acard--quick">
          <div className="quick">
            <Link href="/admin/phong-nghi?action=create" className="quick__item">
              <span className="quick__icon quick__icon--primary">
                <Plus size={20} aria-hidden="true" />
              </span>
              Thêm phòng nghỉ
            </Link>
            <Link href="/admin/combo-du-lich?action=create" className="quick__item">
              <span className="quick__icon">
                <MapPin size={20} aria-hidden="true" />
              </span>
              Tạo combo du lịch
            </Link>
            <Link href="/admin/dat-phong?status=pending_confirmation" className="quick__item">
              <span className="quick__icon">
                <CircleCheck size={20} aria-hidden="true" />
              </span>
              Duyệt đặt phòng
            </Link>
            <Link href="/admin/yeu-cau-tu-van?stage=new" className="quick__item">
              <span className="quick__icon">
                <MessageCircle size={20} aria-hidden="true" />
              </span>
              Trả lời khách
            </Link>
          </div>
        </Panel>

        <Panel
          icon={<DollarSign size={18} aria-hidden="true" />}
          title="Tổng quan doanh thu"
          action={<span className="atag">Kỳ đang chọn</span>}
          className="acard--revenue"
        >
          <ul className="revlist">
            <li>
              <span>Doanh thu phòng nghỉ</span>
              <strong className="numeric">{vnd(revenue.rooms)}</strong>
              <span className="revlist__share numeric">{percent(revenue.total ? (revenue.rooms / revenue.total) * 100 : 0)}</span>
            </li>
            <li>
              <span>Doanh thu combo du lịch</span>
              <strong className="numeric">{vnd(revenue.combos)}</strong>
              <span className="revlist__share numeric">{percent(revenue.total ? (revenue.combos / revenue.total) * 100 : 0)}</span>
            </li>
            <li>
              <span>Doanh thu khác (vé, dịch vụ)</span>
              <strong className="numeric">{vnd(revenue.other)}</strong>
              <span className="revlist__share numeric">{percent(revenue.total ? (revenue.other / revenue.total) * 100 : 0)}</span>
            </li>
          </ul>
          <p className="revlist__total">
            Tổng doanh thu <strong className="numeric">{vnd(revenue.total)}</strong>
          </p>
          <p className="revlist__note">{revenue.bookings} đơn hoàn tất trong kỳ · cùng nguồn dữ liệu với biểu đồ.</p>
        </Panel>
      </section>

      <ConfirmDialog
        open={Boolean(confirmTarget)}
        onClose={() => setConfirmId(null)}
        busy={busy === 'confirm-booking'}
        title="Xác nhận đơn đặt phòng"
        confirmLabel="Xác nhận đơn"
        onConfirm={async () => {
          const id = confirmTarget?.id;
          if (!id) return;
          await commit(
            'confirm-booking',
            (draft) => {
              const b = draft.bookings.find((x) => x.id === id);
              if (!b) return 'Không tìm thấy đơn đặt phòng.';
              if (b.status !== 'pending_confirmation') return 'Đơn này không còn ở trạng thái chờ xác nhận.';
              b.status = 'confirmed';
              b.history.push({ at: `${DEMO_TODAY}T12:00:00+07:00`, text: 'Xác nhận đơn từ màn Tổng quan', author: 'Đinh Vân' });
            },
            'Đã cập nhật booking mẫu: đơn chuyển sang Đã xác nhận',
          );
          setConfirmId(null);
        }}
      >
        {confirmTarget && (
          <div className="adialog__summary">
            <p>
              <strong>{confirmTarget.code}</strong> ·{' '}
              {data.customers.find((c) => c.id === confirmTarget.customerId)?.name}
            </p>
            <p>
              {data.properties.find((p) => p.id === confirmTarget.propertyId)?.name ??
                data.combos.find((c) => c.id === confirmTarget.comboId)?.name}
              {' · '}
              {formatDate(confirmTarget.checkIn)} – {formatDate(confirmTarget.checkOut)} ({nightsOf(confirmTarget)} đêm)
            </p>
            <p>
              Tổng tiền <strong className="numeric">{vnd(bookingTotal(confirmTarget))}</strong> ·{' '}
              {PAYMENT_STATUS[confirmTarget.paymentStatus].label}
            </p>
            <p className="adialog__note">
              Thao tác chỉ cập nhật dữ liệu mẫu trong máy: không gửi tin nhắn, không thu tiền và không đồng bộ với kênh OTA.
            </p>
          </div>
        )}
      </ConfirmDialog>
    </div>
  );
}

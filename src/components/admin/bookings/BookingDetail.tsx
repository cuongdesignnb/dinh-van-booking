'use client';

import { Check, MessageSquare, Printer, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useId, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { DEMO_TODAY } from '@/data/admin/fixture-clock';
import {
  BOOKING_STATUS,
  CHANNEL_LABEL,
  PAYMENT_STATUS,
  formatDate,
  formatTime,
  vnd,
} from '@/lib/admin/formatters';
import { bookingTotal, nightsOf, paymentsOf } from '@/lib/admin/selectors';
import type { Booking } from '@/lib/admin/types';
import { useAdmin } from '../AdminStore';
import { ConfirmDialog, EmptyState, Panel, StatusBadge } from '../shared/ui';

const TABS = [
  { id: 'general', label: 'Thông tin chung' },
  { id: 'customer', label: 'Khách hàng' },
  { id: 'payment', label: 'Thanh toán' },
  { id: 'notes', label: 'Ghi chú' },
] as const;

export function BookingDetailPanel({ booking, onEdit }: { booking: Booking | null; onEdit: (b: Booking) => void }) {
  const { data, commit, busy, pushToast } = useAdmin();
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('general');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [messageOpen, setMessageOpen] = useState(false);
  const [note, setNote] = useState('');
  const messageId = useId();

  useEffect(() => setTab('general'), [booking?.id]);

  if (!booking) {
    return (
      <Panel title="Chi tiết đặt phòng">
        <EmptyState title="Chưa chọn đơn nào." text="Chọn một dòng trong danh sách để xem chi tiết." />
      </Panel>
    );
  }

  const customer = data.customers.find((c) => c.id === booking.customerId);
  const property = data.properties.find((p) => p.id === booking.propertyId);
  const roomType = data.roomTypes.find((r) => r.id === booking.roomTypeId);
  const combo = data.combos.find((c) => c.id === booking.comboId);
  const pay = paymentsOf(data, booking.id);
  const total = bookingTotal(booking);

  const messageText = `Xin chào ${customer?.name ?? 'quý khách'}, Cúc Phương Travel xác nhận yêu cầu ${booking.code}: ${
    property?.name ?? combo?.name
  }, nhận phòng ${formatDate(booking.checkIn)}, trả phòng ${formatDate(booking.checkOut)} (${nightsOf(booking)} đêm), ${
    booking.adults + booking.children
  } khách. Tổng tạm tính ${vnd(total)}.`;

  return (
    <Panel
      title="Chi tiết đặt phòng"
      className="bk__detail"
      action={
        <Link href={`/admin/dat-phong?selected=${booking.id}`} className="alink">
          Xem tất cả
        </Link>
      }
    >
      <div className="bk__detail-head">
        <strong className="bk__detail-code">{booking.code}</strong>
        <StatusBadge label={BOOKING_STATUS[booking.status].label} tone={BOOKING_STATUS[booking.status].tone} />
      </div>

      <div className="bk__tabs" role="tablist" aria-label="Chi tiết đặt phòng">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`bk-tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`bk-panel-${t.id}`}
            className={tab === t.id ? 'is-active' : undefined}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="bk__tabpanel" role="tabpanel" id={`bk-panel-${tab}`} aria-labelledby={`bk-tab-${tab}`}>
        {tab === 'general' && (
          <>
            <p className="bk__customer">
              <span className="avatar avatar--initials" aria-hidden="true">
                {(customer?.name ?? '').split(' ').slice(-2).map((w) => w[0]).join('')}
              </span>
              <span>
                <strong>{customer?.name}</strong>
                <small>
                  {customer?.phone} · {customer?.email}
                </small>
              </span>
            </p>
            <div className="bk__stay">
              <strong>{property?.name ?? combo?.name}</strong>
              <span>{roomType ? roomType.name : combo ? `${combo.days}N${combo.nights}Đ` : '—'}</span>
              <span className="numeric">
                {nightsOf(booking)} đêm ({formatDate(booking.checkIn)} – {formatDate(booking.checkOut)})
              </span>
              <span className="numeric">
                {booking.adults} người lớn, {booking.children} trẻ em
              </span>
            </div>
            <p className="bk__total">
              Tổng tiền: <strong className="numeric">{vnd(total)}</strong>
              <StatusBadge label={PAYMENT_STATUS[booking.paymentStatus].label} tone={PAYMENT_STATUS[booking.paymentStatus].tone} small />
            </p>
            <p className="bk__source">Nguồn: {CHANNEL_LABEL[booking.channel]} · Tạo ngày {formatDate(booking.createdAt)}</p>
          </>
        )}

        {tab === 'customer' && customer && (
          <dl className="bk__dl">
            <dt>Họ tên</dt>
            <dd>{customer.name}</dd>
            <dt>Điện thoại</dt>
            <dd>{customer.phone} <span className="ademo">Số mẫu</span></dd>
            <dt>Email</dt>
            <dd>{customer.email}</dd>
            <dt>Khu vực</dt>
            <dd>{customer.city}</dd>
            <dt>Nhu cầu</dt>
            <dd>{customer.need}</dd>
            <dt>Hồ sơ</dt>
            <dd>
              <Link href={`/admin/khach-hang?selected=${customer.id}`} className="alink">
                Mở hồ sơ khách hàng
              </Link>
            </dd>
          </dl>
        )}

        {tab === 'payment' && (
          <>
            <ul className="bk__pay-list">
              <li>
                <span>Giá trị đơn</span>
                <strong className="numeric">{vnd(total)}</strong>
              </li>
              <li>
                <span>Đã thu</span>
                <strong className="numeric">{vnd(pay.paid)}</strong>
              </li>
              <li>
                <span>Đã hoàn</span>
                <strong className="numeric">{vnd(pay.refunded)}</strong>
              </li>
              <li>
                <span>Còn phải thu</span>
                <strong className="numeric">{vnd(Math.max(0, total - pay.net))}</strong>
              </li>
            </ul>
            {pay.list.length > 0 ? (
              <ul className="bk__pay-log">
                {pay.list.map((p) => (
                  <li key={p.id}>
                    <span>{formatDate(p.at.slice(0, 10))}</span>
                    <span>{p.kind === 'refund' ? 'Hoàn tiền' : 'Thanh toán'}</span>
                    <span className="numeric">{vnd(p.amount)}</span>
                    <small>{p.reference}</small>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="bk__muted">Chưa ghi nhận giao dịch nào cho đơn này.</p>
            )}
            <p className="bk__muted">Cổng thanh toán chưa được tích hợp: các giao dịch trên là bản ghi mẫu.</p>
          </>
        )}

        {tab === 'notes' && (
          <>
            <ul className="bk__history">
              {[...booking.history, ...booking.internalNotes.map((n) => ({ ...n, internal: true }))]
                .sort((a, b) => a.at.localeCompare(b.at))
                .map((h, i) => (
                  <li key={`${h.at}-${i}`}>
                    <span className="numeric">
                      {formatDate(h.at.slice(0, 10))} {formatTime(h.at)}
                    </span>
                    <span>{h.text}</span>
                    <small>{h.author}{'internal' in h ? ' · ghi chú nội bộ' : ''}</small>
                  </li>
                ))}
            </ul>
            <label className="afield">
              <span>Thêm ghi chú nội bộ</span>
              <textarea className="ainput" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ghi chú này không gửi cho khách." />
            </label>
            <button
              type="button"
              className="abtn abtn--ghost abtn--sm"
              disabled={!note.trim() || busy === 'note'}
              onClick={async () => {
                const text = note.trim();
                await commit(
                  'note',
                  (draft) => {
                    const b = draft.bookings.find((x) => x.id === booking.id);
                    if (!b) return 'Không tìm thấy đơn.';
                    b.internalNotes.push({ at: `${DEMO_TODAY}T12:00:00+07:00`, text, author: 'Đinh Vân' });
                  },
                  'Đã lưu ghi chú nội bộ trong bản demo',
                );
                setNote('');
              }}
            >
              Lưu ghi chú
            </button>
          </>
        )}
      </div>

      <div className="bk__actions">
        <button
          type="button"
          className="abtn abtn--primary"
          disabled={booking.status !== 'pending_confirmation'}
          onClick={() => setConfirmOpen(true)}
        >
          <Check size={15} aria-hidden="true" /> Xác nhận
        </button>
        <button type="button" className="abtn abtn--ghost" onClick={() => setMessageOpen(true)}>
          <MessageSquare size={15} aria-hidden="true" /> Gửi tin nhắn
        </button>
        <button type="button" className="abtn abtn--ghost" onClick={() => window.print()}>
          <Printer size={15} aria-hidden="true" /> In phiếu đặt phòng
        </button>
        <button
          type="button"
          className="abtn abtn--danger"
          disabled={booking.status === 'cancelled' || booking.status === 'completed'}
          onClick={() => setCancelOpen(true)}
        >
          <X size={15} aria-hidden="true" /> Hủy đơn
        </button>
        <button type="button" className="abtn abtn--ghost" onClick={() => onEdit(booking)}>
          Sửa thông tin
        </button>
      </div>

      <div className="bk__print" aria-hidden="true">
        <h2>Phiếu đặt phòng {booking.code} — Bản demo</h2>
        <p>
          {customer?.name} · {customer?.phone}
        </p>
        <p>
          {property?.name ?? combo?.name} · {roomType?.name ?? ''}
        </p>
        <p>
          {formatDate(booking.checkIn)} – {formatDate(booking.checkOut)} ({nightsOf(booking)} đêm),{' '}
          {booking.adults + booking.children} khách
        </p>
        <p>Tổng tiền: {vnd(total)} · {PAYMENT_STATUS[booking.paymentStatus].label}</p>
        <p>Phiếu in từ dữ liệu mẫu, không có giá trị thanh toán.</p>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        busy={busy === 'confirm'}
        title="Xác nhận đơn đặt phòng"
        confirmLabel="Xác nhận đơn"
        onConfirm={async () => {
          await commit(
            'confirm',
            (draft) => {
              const b = draft.bookings.find((x) => x.id === booking.id);
              if (!b) return 'Không tìm thấy đơn.';
              if (b.status !== 'pending_confirmation') return 'Đơn không còn ở trạng thái chờ xác nhận.';
              if (b.checkOut <= DEMO_TODAY) return 'Không thể xác nhận đơn đã kết thúc trong quá khứ.';
              b.status = 'confirmed';
              b.history.push({ at: `${DEMO_TODAY}T12:00:00+07:00`, text: 'Xác nhận đơn', author: 'Đinh Vân' });
            },
            'Đã cập nhật booking mẫu: đơn chuyển sang Đã xác nhận',
          );
          setConfirmOpen(false);
        }}
      >
        <p>
          {booking.code} · {customer?.name} · {formatDate(booking.checkIn)} – {formatDate(booking.checkOut)}
        </p>
        <p className="adialog__note">
          Xác nhận chỉ đổi trạng thái trong dữ liệu mẫu: không gửi tin nhắn cho khách, không thu tiền và không đồng bộ OTA.
        </p>
      </ConfirmDialog>

      <ConfirmDialog
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        busy={busy === 'cancel'}
        tone="danger"
        title="Hủy đơn đặt phòng"
        confirmLabel="Hủy đơn"
        reason={{
          label: 'Lý do hủy (bắt buộc)',
          options: ['Khách đổi lịch', 'Khách báo bận đột xuất', 'Không liên hệ được khách', 'Hết phòng phù hợp'],
        }}
        onConfirm={async (reason) => {
          await commit(
            'cancel',
            (draft) => {
              const b = draft.bookings.find((x) => x.id === booking.id);
              if (!b) return 'Không tìm thấy đơn.';
              if (b.status === 'completed') return 'Không thể hủy đơn đã hoàn tất.';
              b.status = 'cancelled';
              b.cancelReason = reason;
              b.history.push({ at: `${DEMO_TODAY}T12:00:00+07:00`, text: `Hủy đơn: ${reason}`, author: 'Đinh Vân' });
            },
            'Đã cập nhật booking mẫu: đơn chuyển sang Đã hủy',
          );
          setCancelOpen(false);
        }}
      >
        <p>
          Hủy {booking.code} sẽ giải phóng {nightsOf(booking)} đêm phòng trong kho demo và giữ lại toàn bộ lịch sử.
        </p>
        <p className="adialog__note">
          Trạng thái thanh toán ({PAYMENT_STATUS[booking.paymentStatus].label}) không thay đổi: việc hoàn tiền phải xử lý riêng.
        </p>
      </ConfirmDialog>

      <Modal open={messageOpen} onClose={() => setMessageOpen(false)} labelledBy={messageId} className="dialog--admin">
        <h2 id={messageId} className="dialog__title">
          Soạn tin nhắn cho khách
        </h2>
        <p className="adialog__note">
          Chưa có tích hợp Zalo/SMS/email, nên nội dung dưới đây chỉ để xem trước và sao chép thủ công.
        </p>
        <textarea className="ainput" rows={5} defaultValue={messageText} aria-label="Nội dung tin nhắn" />
        <div className="adialog__actions">
          <button type="button" className="abtn abtn--ghost" onClick={() => setMessageOpen(false)}>
            Đóng
          </button>
          <button
            type="button"
            className="abtn abtn--primary"
            data-autofocus
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(messageText);
                pushToast('Đã sao chép nội dung tin nhắn (chưa gửi cho khách)');
              } catch {
                pushToast('Trình duyệt không cho phép sao chép tự động, bạn hãy chọn và copy thủ công.', 'error');
              }
            }}
          >
            Sao chép nội dung
          </button>
        </div>
      </Modal>
    </Panel>
  );
}

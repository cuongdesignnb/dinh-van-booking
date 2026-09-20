'use client';

import { CalendarDays, Check, MapPin, Mail, MessageCircle, Phone, Plus, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useId, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { DEMO_TODAY } from '@/data/admin/fixture-clock';
import {
  BOOKING_STATUS,
  PAYMENT_STATUS,
  SOURCE_LABEL,
  STAGE,
  formatDate,
  formatTime,
  initials,
  vnd,
} from '@/lib/admin/formatters';
import { bookingTotal, customerStats } from '@/lib/admin/selectors';
import type { Customer, Inquiry } from '@/lib/admin/types';
import { useAdmin } from '../AdminStore';
import { EmptyState, Panel, RowMenu, StatusBadge } from '../shared/ui';

const TABS = [
  { id: 'info', label: 'Thông tin' },
  { id: 'history', label: 'Lịch sử trao đổi' },
  { id: 'bookings', label: 'Lịch sử đặt phòng' },
] as const;

export function CustomerPanel({
  customer,
  inquiry,
  onCreateBooking,
}: {
  customer?: Customer;
  inquiry: Inquiry | null;
  onCreateBooking: () => void;
}) {
  const { data, commit, busy, pushToast } = useAdmin();
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('info');
  const [note, setNote] = useState('');
  const [tagDraft, setTagDraft] = useState('');
  const [followUp, setFollowUp] = useState({ date: DEMO_TODAY, time: '10:00', purpose: '' });
  const [contact, setContact] = useState<'call' | 'zalo' | null>(null);
  const contactId = useId();

  useEffect(() => {
    setTab('info');
    setNote('');
  }, [customer?.id]);

  if (!customer) {
    return (
      <Panel title="Hồ sơ khách hàng">
        <EmptyState title="Chưa chọn khách hàng nào." />
      </Panel>
    );
  }

  const stats = customerStats(data, customer.id);
  const inquiries = data.inquiries.filter((i) => i.customerId === customer.id);
  const active = inquiry ?? inquiries.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null;
  const interactions = data.interactions.filter((i) => i.customerId === customer.id);
  const follows = data.followUps.filter((f) => f.customerId === customer.id);

  return (
    <Panel
      title={
        <span className="crm__profile-title">
          <span className="avatar avatar--initials avatar--lg" aria-hidden="true">
            {initials(customer.name)}
          </span>
          <span>
            <strong>{customer.name}</strong>
            <small>
              Khách {customer.createdAt >= '2024-11-01' ? 'mới' : 'quen'} · Từ {SOURCE_LABEL[customer.source]}
            </small>
          </span>
        </span>
      }
      className="crm__profile"
      action={
        <>
          {active && <StatusBadge label={STAGE[active.stage].label} tone={STAGE[active.stage].tone} small />}
          <RowMenu
            label="Thao tác hồ sơ khách"
            items={[
              { label: 'Xem booking của khách', onSelect: () => window.location.assign(`/admin/dat-phong?customer=${customer.id}`) },
              {
                label: 'Đổi nhân viên phụ trách',
                onSelect: () => {
                  const next = data.users[(data.users.findIndex((u) => u.id === customer.ownerId) + 1) % data.users.length];
                  void commit(
                    'owner',
                    (draft) => {
                      const c = draft.customers.find((x) => x.id === customer.id);
                      if (c) c.ownerId = next.id;
                    },
                    `Đã chuyển phụ trách sang ${next.name} (bản demo)`,
                  );
                },
              },
            ]}
          />
        </>
      }
    >
      <p className="crm__contact">
        <span>
          <Phone size={13} aria-hidden="true" /> <span className="numeric">{customer.phone}</span> <span className="ademo">Số mẫu</span>
        </span>
        <span>
          <Mail size={13} aria-hidden="true" /> {customer.email || 'Chưa có email'}
        </span>
        {customer.city && (
          <span>
            <MapPin size={13} aria-hidden="true" /> {customer.city}
          </span>
        )}
      </p>

      <div className="bk__tabs" role="tablist" aria-label="Hồ sơ khách hàng">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'is-active' : undefined} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'info' && (
        <div className="crm__info">
          <h3>Nhu cầu & sở thích</h3>
          <ul className="ct__tags">
            {customer.preferences.concat(customer.tags).map((t) => (
              <li key={t}>
                {t}
                <button
                  type="button"
                  aria-label={`Xóa thẻ ${t}`}
                  onClick={() =>
                    commit(
                      'tags',
                      (draft) => {
                        const c = draft.customers.find((x) => x.id === customer.id);
                        if (!c) return 'Không tìm thấy khách hàng.';
                        c.preferences = c.preferences.filter((x) => x !== t);
                        c.tags = c.tags.filter((x) => x !== t);
                      },
                      'Đã cập nhật thẻ trong bản demo',
                    )
                  }
                >
                  <X size={11} aria-hidden="true" />
                </button>
              </li>
            ))}
            <li className="ct__tag-add">
              <input
                value={tagDraft}
                onChange={(e) => setTagDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && tagDraft.trim()) {
                    e.preventDefault();
                    const v = tagDraft.trim();
                    void commit(
                      'tags',
                      (draft) => {
                        const c = draft.customers.find((x) => x.id === customer.id);
                        if (!c) return 'Không tìm thấy khách hàng.';
                        if (!c.preferences.includes(v)) c.preferences.push(v);
                      },
                      'Đã thêm thẻ trong bản demo',
                    );
                    setTagDraft('');
                  }
                }}
                placeholder="Thêm thẻ…"
                aria-label="Thêm thẻ nhu cầu"
              />
            </li>
          </ul>
          {customer.note && <blockquote className="crm__note">“{customer.note}”</blockquote>}
          {active && (
            <p className="ahint">
              Yêu cầu đang chăm sóc: {active.summary} ({STAGE[active.stage].label}, tạo {formatDate(active.createdAt.slice(0, 10))}).
            </p>
          )}
        </div>
      )}

      {tab === 'history' && (
        <div className="crm__history">
          <ul>
            {interactions.map((i) => (
              <li key={i.id} className={i.direction === 'internal' ? 'is-internal' : i.direction === 'out' ? 'is-out' : undefined}>
                <span className="crm__hmeta">
                  <strong>{i.author}</strong>
                  <time className="numeric" dateTime={i.at}>
                    {formatDate(i.at.slice(0, 10))} {formatTime(i.at)}
                  </time>
                </span>
                <p>{i.text}</p>
                <small>{i.direction === 'internal' ? 'Ghi chú nội bộ' : `Qua ${i.channel}`}</small>
              </li>
            ))}
            {!interactions.length && <li>Chưa có trao đổi nào được ghi nhận.</li>}
          </ul>
          <label className="afield">
            <span>Ghi chú nhanh</span>
            <textarea className="ainput" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Thêm ghi chú…" />
          </label>
          <button
            type="button"
            className="abtn abtn--ghost abtn--sm"
            disabled={!note.trim() || busy === 'crm-note'}
            onClick={async () => {
              const text = note.trim();
              await commit(
                'crm-note',
                (draft) => {
                  draft.interactions.push({
                    id: `tt-${Date.now().toString(36)}`,
                    customerId: customer.id,
                    inquiryId: active?.id ?? null,
                    at: `${DEMO_TODAY}T12:00:00+07:00`,
                    channel: 'note',
                    direction: 'internal',
                    author: 'Đinh Vân',
                    text,
                  });
                },
                'Đã lưu ghi chú nội bộ (không gửi cho khách)',
              );
              setNote('');
            }}
          >
            Lưu ghi chú
          </button>
        </div>
      )}

      {tab === 'bookings' && (
        <div className="crm__bookings">
          {stats.bookings.length ? (
            <div className="tscroll">
              <table className="atable atable--compact">
                <thead>
                  <tr>
                    <th scope="col">Mã</th>
                    <th scope="col">Ngày</th>
                    <th scope="col">Dịch vụ</th>
                    <th scope="col" className="atable__num">
                      Tiền
                    </th>
                    <th scope="col">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.bookings.map((b) => (
                    <tr key={b.id}>
                      <td>
                        <Link href={`/admin/dat-phong?selected=${b.id}`}>{b.code}</Link>
                      </td>
                      <td className="numeric">{formatDate(b.checkIn)}</td>
                      <td className="atable__ellipsis">
                        {data.properties.find((p) => p.id === b.propertyId)?.name ?? data.combos.find((c) => c.id === b.comboId)?.name}
                      </td>
                      <td className="atable__num">{vnd(bookingTotal(b))}</td>
                      <td>
                        <StatusBadge label={BOOKING_STATUS[b.status].label} tone={BOOKING_STATUS[b.status].tone} small />
                        <span className="bk__pay">{PAYMENT_STATUS[b.paymentStatus].label}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="Khách chưa có booking nào." />
          )}
          <p className="ahint">
            Tổng giá trị: <strong className="numeric">{vnd(stats.value)}</strong> · {stats.count} booking hợp lệ.
          </p>
        </div>
      )}

      <section className="crm__follow">
        <h3>
          <CalendarDays size={14} aria-hidden="true" /> Hẹn follow-up
        </h3>
        <ul>
          {follows.map((f) => (
            <li key={f.id} className={!f.done && `${f.date}` < DEMO_TODAY ? 'is-late' : undefined}>
              <span className="numeric">
                {formatDate(f.date)} {f.time}
              </span>
              <span>{f.purpose}</span>
              <button
                type="button"
                className="abtn abtn--ghost abtn--sm"
                onClick={() =>
                  commit(
                    'follow-done',
                    (draft) => {
                      const t = draft.followUps.find((x) => x.id === f.id);
                      if (t) t.done = !t.done;
                    },
                    'Đã cập nhật lịch hẹn trong bản demo',
                  )
                }
              >
                {f.done ? 'Mở lại' : 'Hoàn tất'}
              </button>
            </li>
          ))}
          {!follows.length && <li className="ahint">Chưa có lịch hẹn nào.</li>}
        </ul>
        <div className="crm__follow-form">
          <input type="date" className="ainput" value={followUp.date} min={DEMO_TODAY} onChange={(e) => setFollowUp({ ...followUp, date: e.target.value })} aria-label="Ngày hẹn" />
          <input type="time" className="ainput" value={followUp.time} onChange={(e) => setFollowUp({ ...followUp, time: e.target.value })} aria-label="Giờ hẹn" />
          <input className="ainput" value={followUp.purpose} onChange={(e) => setFollowUp({ ...followUp, purpose: e.target.value })} placeholder="Mục đích (gọi lại tư vấn combo…)" aria-label="Mục đích" />
          <button
            type="button"
            className="abtn abtn--ghost abtn--sm"
            disabled={!followUp.purpose.trim()}
            onClick={async () => {
              await commit(
                'follow-add',
                (draft) => {
                  if (followUp.date < DEMO_TODAY) return 'Ngày hẹn phải từ hôm nay trở đi (theo ngày dữ liệu mẫu 15/11/2024).';
                  draft.followUps.push({
                    id: `fu-${Date.now().toString(36)}`,
                    customerId: customer.id,
                    inquiryId: active?.id ?? null,
                    date: followUp.date,
                    time: followUp.time,
                    purpose: followUp.purpose.trim(),
                    ownerId: customer.ownerId,
                    done: false,
                  });
                },
                'Đã tạo lịch hẹn nội bộ trong bản demo',
              );
              setFollowUp({ ...followUp, purpose: '' });
            }}
          >
            <Plus size={13} aria-hidden="true" /> Thêm hẹn
          </button>
        </div>
        <p className="ahint">Lịch hẹn chỉ nằm trong ứng dụng demo, chưa đồng bộ với lịch ngoài hay thông báo đẩy.</p>
      </section>

      <div className="crm__actions">
        <button type="button" className="abtn abtn--ghost" onClick={() => setContact('call')}>
          <Phone size={14} aria-hidden="true" /> Gọi lại
        </button>
        <button type="button" className="abtn abtn--ghost" onClick={() => setContact('zalo')}>
          <MessageCircle size={14} aria-hidden="true" /> Chat Zalo
        </button>
        <button type="button" className="abtn abtn--ghost" onClick={onCreateBooking}>
          <Plus size={14} aria-hidden="true" /> Tạo booking
        </button>
        <button
          type="button"
          className="abtn abtn--primary"
          disabled={!active || busy === 'handled'}
          onClick={() =>
            active &&
            commit(
              'handled',
              (draft) => {
                const i = draft.inquiries.find((x) => x.id === active.id);
                if (!i) return 'Không tìm thấy yêu cầu.';
                i.read = true;
                if (i.stage === 'new') i.stage = 'consulting';
              },
              'Đã đánh dấu yêu cầu là đã xử lý (không đổi thành Đã chốt)',
            )
          }
        >
          <Check size={14} aria-hidden="true" /> Đánh dấu đã xử lý
        </button>
      </div>

      <Modal open={Boolean(contact)} onClose={() => setContact(null)} labelledBy={contactId} className="dialog--admin">
        <h2 id={contactId} className="dialog__title">
          {contact === 'call' ? 'Gọi lại khách hàng' : 'Nhắn tin Zalo'}
        </h2>
        <p>
          {contact === 'call' ? 'Số điện thoại' : 'Tài khoản Zalo'}: <strong className="numeric">{customer.phone}</strong>
        </p>
        <p className="adialog__note">
          Đây là số điện thoại mẫu trong bản demo nên hệ thống không tự gọi hay gửi tin. Hãy sao chép số và liên hệ bằng công cụ
          thật của bạn.
        </p>
        {contact === 'zalo' && (
          <textarea
            className="ainput"
            rows={4}
            defaultValue={`Chào ${customer.name}, Đinh Vân Booking xin phép trao đổi thêm về nhu cầu ${customer.need.toLowerCase()} của mình nhé.`}
            aria-label="Nội dung tin nhắn"
          />
        )}
        <div className="adialog__actions">
          <button type="button" className="abtn abtn--ghost" onClick={() => setContact(null)}>
            Đóng
          </button>
          <button
            type="button"
            className="abtn abtn--primary"
            data-autofocus
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(customer.phone);
                pushToast('Đã sao chép số điện thoại (chưa thực hiện cuộc gọi)');
              } catch {
                pushToast('Trình duyệt chặn sao chép tự động, bạn hãy copy thủ công.', 'error');
              }
            }}
          >
            Sao chép số
          </button>
        </div>
      </Modal>
    </Panel>
  );
}

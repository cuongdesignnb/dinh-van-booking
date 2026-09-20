'use client';

import {
  ChevronDown,
  CircleCheck,
  Heart,
  MessageCircle,
  Plus,
  Search,
  Star,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { DEMO_TODAY } from '@/data/admin/fixture-clock';
import {
  GROUP_LABEL,
  SOURCE_LABEL,
  STAGE,
  formatDate,
  formatTime,
  initials,
  num,
  percent,
  searchKey,
  vnd,
} from '@/lib/admin/formatters';
import { crmStats, customerStats } from '@/lib/admin/selectors';
import type { Customer, Inquiry, InquiryStage } from '@/lib/admin/types';
import { useAdmin } from '../AdminStore';
import { BookingFormDrawer } from '../bookings/BookingForm';
import { AdminPagination, EmptyState, Panel, RowMenu, StatCard, StatusBadge } from '../shared/ui';
import { CustomerPanel } from './CustomerPanel';

const STAGES: InquiryStage[] = ['new', 'consulting', 'waiting', 'won'];
const PAGE_SIZE = 10;

export function CrmScreen({ defaultTab = 'customers' }: { defaultTab?: 'customers' | 'inquiries' }) {
  const { data, range, commit, pushToast } = useAdmin();
  const params = useSearchParams();
  const pathname = usePathname();

  const tab = (params.get('tab') as 'customers' | 'inquiries') ?? defaultTab;
  const q = params.get('q') ?? '';
  const source = params.get('source') ?? 'all';
  const group = params.get('group') ?? 'all';
  const stage = params.get('stage') ?? 'all';
  const page = Math.max(1, Number(params.get('page') ?? 1));
  const selectedId = params.get('selected');
  const [bookingOpen, setBookingOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const setQuery = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === '' || v === 'all') next.delete(k);
      else next.set(k, v);
    }
    if (!('page' in patch)) next.delete('page');
    window.history.pushState(null, '', `${pathname}?${next.toString()}`);
  };

  const stats = crmStats(data, range);

  const customers = useMemo(() => {
    const key = searchKey(q);
    return data.customers.filter((c) => {
      if (source !== 'all' && c.source !== source) return false;
      if (group !== 'all' && c.group !== group) return false;
      if (stage !== 'all') {
        const inq = data.inquiries.filter((i) => i.customerId === c.id);
        if (!inq.some((i) => i.stage === stage)) return false;
      }
      if (key && !searchKey(`${c.name} ${c.phone} ${c.need} ${c.tags.join(' ')}`).includes(key)) return false;
      return true;
    });
  }, [data.customers, data.inquiries, q, source, group, stage]);

  const pages = Math.max(1, Math.ceil(customers.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const rows = customers.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  const selectedInquiry = data.inquiries.find((i) => i.id === selectedId) ?? null;
  const selected =
    data.customers.find((c) => c.id === selectedId) ??
    (selectedInquiry ? data.customers.find((c) => c.id === selectedInquiry.customerId) : undefined) ??
    rows[0] ??
    data.customers[0];

  const moveStage = async (inquiry: Inquiry, next: InquiryStage) => {
    if (inquiry.stage === next) return;
    await commit(
      'stage',
      (draft) => {
        const i = draft.inquiries.find((x) => x.id === inquiry.id);
        if (!i) return 'Không tìm thấy yêu cầu tư vấn.';
        if (next === 'won' && !i.bookingId) {
          const hasBooking = draft.bookings.some((b) => b.customerId === i.customerId && b.status !== 'cancelled');
          if (!hasBooking)
            return 'Chỉ chuyển sang “Đã chốt” khi khách đã có booking hợp lệ. Hãy tạo booking trước.';
        }
        i.stage = next;
        i.read = true;
        i.resolvedAt = next === 'won' ? `${DEMO_TODAY}T12:00:00+07:00` : null;
      },
      `Đã chuyển yêu cầu sang “${STAGE[next].label}” trong bản demo`,
    );
  };

  return (
    <div className="crm">
      <nav className="ct__tabs" aria-label="Nhóm dữ liệu">
        <button type="button" className={tab === 'customers' ? 'is-active' : undefined} onClick={() => setQuery({ tab: 'customers' })}>
          <Users size={15} aria-hidden="true" /> Khách hàng
        </button>
        <button type="button" className={tab === 'inquiries' ? 'is-active' : undefined} onClick={() => setQuery({ tab: 'inquiries' })}>
          <MessageCircle size={15} aria-hidden="true" /> Yêu cầu tư vấn
        </button>
      </nav>

      <section className="kpis kpis--5" aria-label="Chỉ số khách hàng">
        <StatCard icon={<Users size={22} aria-hidden="true" />} tone="mint" label="Khách hàng mới (kỳ này)" value={stats.newCustomers} caption={`Tổng ${num(data.customers.length)} khách trong hệ thống`} />
        <StatCard icon={<MessageCircle size={22} aria-hidden="true" />} tone="rose" label="Yêu cầu chưa xử lý" value={stats.open} caption={`${stats.unread} yêu cầu chưa đọc`} href="/admin/yeu-cau-tu-van?stage=new" />
        <StatCard icon={<Heart size={22} aria-hidden="true" />} tone="green" label="Khách quay lại" value={stats.returning} caption="Có từ 2 booking trở lên" />
        <StatCard icon={<CircleCheck size={22} aria-hidden="true" />} tone="sky" label="Tỷ lệ đã phản hồi" value={percent(stats.responseRate)} caption="Yêu cầu đã được đọc / tổng yêu cầu" />
        <StatCard icon={<Star size={22} aria-hidden="true" />} tone="cream" label="Yêu cầu ưu tiên" value={stats.priorityToday} caption="Khách quan trọng cần trả lời sớm" />
      </section>

      <div className="crm__grid">
        <div className="crm__left">
          <Panel title={<span className="sr-only">Bộ lọc khách hàng</span>} className="crm__filters">
            <div className="crm__filter-grid">
              <label className="afield">
                <span className="sr-only">Tìm kiếm khách hàng</span>
                <span className="bk__search">
                  <Search size={15} aria-hidden="true" />
                  <input className="ainput" value={q} placeholder="Tìm khách theo tên, số điện thoại, nhu cầu…" onChange={(e) => setQuery({ q: e.target.value })} />
                </span>
              </label>
              <Select
                label="Nguồn khách"
                value={source}
                options={[{ id: 'all', label: 'Tất cả nguồn' }, ...Object.entries(SOURCE_LABEL).map(([id, label]) => ({ id, label }))]}
                onChange={(v) => setQuery({ source: v })}
              />
              <Select
                label="Nhóm khách"
                value={group}
                options={[{ id: 'all', label: 'Tất cả nhóm' }, ...Object.entries(GROUP_LABEL).map(([id, label]) => ({ id, label }))]}
                onChange={(v) => setQuery({ group: v })}
              />
              <Select
                label="Trạng thái yêu cầu"
                value={stage}
                options={[{ id: 'all', label: 'Tất cả trạng thái' }, ...STAGES.map((s) => ({ id: s, label: STAGE[s].label }))]}
                onChange={(v) => setQuery({ stage: v })}
              />
              <button type="button" className="abtn abtn--ghost" onClick={() => setNewCustomer(true)}>
                <Plus size={15} aria-hidden="true" /> Thêm khách hàng
              </button>
            </div>
          </Panel>

          {tab === 'customers' ? (
            <Panel
              icon={<Users size={18} aria-hidden="true" />}
              title={`Danh sách khách hàng (${num(customers.length)} khách hàng)`}
              action={<span className="atag">Sắp xếp: Cập nhật mới nhất</span>}
            >
              <div className="tscroll">
                <table className="atable atable--compact crm__table">
                  <thead>
                    <tr>
                      <th scope="col">Khách hàng</th>
                      <th scope="col">Số điện thoại</th>
                      <th scope="col">Nhu cầu chính</th>
                      <th scope="col">Lần đặt gần nhất</th>
                      <th scope="col">Số booking</th>
                      <th scope="col" className="atable__num">
                        Giá trị (VNĐ)
                      </th>
                      <th scope="col">Tags</th>
                      <th scope="col">Trạng thái</th>
                      <th scope="col">Nhân viên phụ trách</th>
                      <th scope="col" />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((c) => {
                      const cs = customerStats(data, c.id);
                      const inq = data.inquiries.filter((i) => i.customerId === c.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
                      return (
                        <tr key={c.id} className={`is-clickable${selected?.id === c.id ? ' is-selected' : ''}`} onClick={() => setQuery({ selected: c.id })}>
                          <td>
                            <span className="crm__name">
                              <span className="avatar avatar--initials" aria-hidden="true">
                                {initials(c.name)}
                              </span>
                              {c.name}
                            </span>
                          </td>
                          <td className="numeric">{c.phone}</td>
                          <td className="atable__ellipsis">{c.need}</td>
                          <td className="numeric">{cs.lastStay ? formatDate(cs.lastStay) : '—'}</td>
                          <td className="numeric">{cs.count}</td>
                          <td className="atable__num">{cs.value ? vnd(cs.value) : '0đ'}</td>
                          <td>
                            <span className="crm__tags">
                              {c.tags.slice(0, 2).map((t) => (
                                <span key={t}>{t}</span>
                              ))}
                            </span>
                          </td>
                          <td>{inq ? <StatusBadge label={STAGE[inq.stage].label} tone={STAGE[inq.stage].tone} small /> : <span className="ahint">Chưa có yêu cầu</span>}</td>
                          <td>{data.users.find((u) => u.id === c.ownerId)?.name}</td>
                          <td onClick={(e) => e.stopPropagation()}>
                            <RowMenu
                              label={`Thao tác cho ${c.name}`}
                              items={[
                                { label: 'Mở hồ sơ', onSelect: () => setQuery({ selected: c.id }) },
                                { label: 'Tạo booking', onSelect: () => { setQuery({ selected: c.id }); setBookingOpen(true); } },
                                { label: 'Xem booking của khách', onSelect: () => window.location.assign(`/admin/dat-phong?customer=${c.id}`) },
                              ]}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {!rows.length && <EmptyState title="Không có khách hàng nào khớp bộ lọc." />}
              <footer className="pr__list-foot">
                <span>
                  Hiển thị {rows.length} trên {num(customers.length)} khách hàng
                </span>
                <AdminPagination page={current} pages={pages} onChange={(p) => setQuery({ page: String(p) })} compact />
              </footer>
            </Panel>
          ) : (
            <Panel icon={<MessageCircle size={18} aria-hidden="true" />} title={`Yêu cầu tư vấn (${data.inquiries.length})`}>
              <div className="tscroll">
                <table className="atable atable--compact">
                  <thead>
                    <tr>
                      <th scope="col">Khách hàng</th>
                      <th scope="col">Tóm tắt</th>
                      <th scope="col">Nguồn</th>
                      <th scope="col">Giai đoạn</th>
                      <th scope="col">Phụ trách</th>
                      <th scope="col">Thời gian</th>
                      <th scope="col" />
                    </tr>
                  </thead>
                  <tbody>
                    {data.inquiries
                      .filter((i) => stage === 'all' || i.stage === stage)
                      .map((i) => {
                        const c = data.customers.find((x) => x.id === i.customerId);
                        return (
                          <tr key={i.id} className={`is-clickable${selectedId === i.id ? ' is-selected' : ''}`} onClick={() => setQuery({ selected: i.id })}>
                            <td>{c?.name}</td>
                            <td className="atable__ellipsis">{i.summary}</td>
                            <td>{SOURCE_LABEL[i.source]}</td>
                            <td>
                              <StatusBadge label={STAGE[i.stage].label} tone={STAGE[i.stage].tone} small />
                            </td>
                            <td>{data.users.find((u) => u.id === i.ownerId)?.name}</td>
                            <td className="numeric">
                              {formatDate(i.createdAt.slice(0, 10))} {formatTime(i.createdAt)}
                            </td>
                            <td onClick={(e) => e.stopPropagation()}>
                              <RowMenu
                                label={`Chuyển trạng thái cho yêu cầu của ${c?.name}`}
                                items={STAGES.filter((s) => s !== i.stage).map((s) => ({
                                  label: `Chuyển sang ${STAGE[s].label}`,
                                  onSelect: () => moveStage(i, s),
                                }))}
                              />
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </Panel>
          )}

          <Panel
            icon={<Heart size={17} aria-hidden="true" />}
            title={`Pipeline yêu cầu tư vấn (${data.inquiries.length} yêu cầu)`}
            action={
              <Link href="/admin/yeu-cau-tu-van" className="alink">
                Xem tất cả
              </Link>
            }
          >
            <div className="pipe">
              {STAGES.map((s) => {
                const list = data.inquiries.filter((i) => i.stage === s);
                const shown = expanded[s] ? list : list.slice(0, 3);
                return (
                  <section
                    key={s}
                    className={`pipe__col pipe__col--${s}`}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const id = e.dataTransfer.getData('text/plain');
                      const inq = data.inquiries.find((x) => x.id === id);
                      if (inq) void moveStage(inq, s);
                    }}
                  >
                    <header>
                      <span className={`pipe__dot pipe__dot--${s}`} aria-hidden="true" />
                      <h3>{STAGE[s].label}</h3>
                      <span className="pipe__count numeric">({list.length})</span>
                    </header>
                    <ul>
                      {shown.map((i) => {
                        const c = data.customers.find((x) => x.id === i.customerId);
                        return (
                          <li key={i.id}>
                            <div
                              className={`pipe__card${selectedId === i.id ? ' is-selected' : ''}`}
                              draggable
                              onDragStart={(e) => e.dataTransfer.setData('text/plain', i.id)}
                            >
                              <button type="button" className="pipe__open" onClick={() => setQuery({ selected: i.id })}>
                                <span className="avatar avatar--initials" aria-hidden="true">
                                  {initials(c?.name ?? '')}
                                </span>
                                <span>
                                  <strong>{c?.name}</strong>
                                  <small>{i.summary}</small>
                                  <time className="numeric" dateTime={i.createdAt}>
                                    {formatDate(i.createdAt.slice(0, 10))} {formatTime(i.createdAt)}
                                  </time>
                                </span>
                              </button>
                              <RowMenu
                                label={`Chuyển trạng thái yêu cầu của ${c?.name}`}
                                items={STAGES.filter((x) => x !== s).map((x) => ({
                                  label: `Chuyển sang ${STAGE[x].label}`,
                                  onSelect: () => moveStage(i, x),
                                }))}
                              />
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                    {list.length > 3 && (
                      <button type="button" className="pipe__more" onClick={() => setExpanded((x) => ({ ...x, [s]: !x[s] }))}>
                        {expanded[s] ? 'Thu gọn' : `Xem thêm ${list.length - 3} yêu cầu`}
                      </button>
                    )}
                    {!list.length && <p className="pipe__empty">Chưa có yêu cầu nào.</p>}
                  </section>
                );
              })}
            </div>
            <p className="ahint">
              Kéo thả thẻ giữa các cột để đổi giai đoạn; trên thiết bị cảm ứng hoặc khi dùng bàn phím, chọn menu “Chuyển trạng
              thái” trên từng thẻ.
            </p>
          </Panel>
        </div>

        <CustomerPanel
          customer={selected}
          inquiry={selectedInquiry}
          onCreateBooking={() => setBookingOpen(true)}
        />
      </div>

      <BookingFormDrawer
        open={bookingOpen}
        booking={null}
        presetCustomerId={selected?.id}
        onClose={() => setBookingOpen(false)}
        onSaved={() => pushToast('Đơn mới đã xuất hiện trong lịch sử đặt phòng của khách (bản demo)')}
      />

      <NewCustomerModal open={newCustomer} onClose={() => setNewCustomer(false)} onSaved={(id) => setQuery({ selected: id })} />
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
      <span className="sr-only">{label}</span>
      <span className="aselect">
        <select className="ainput" value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}>
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

function NewCustomerModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: (id: string) => void }) {
  const { data, commit, busy } = useAdmin();
  const [form, setForm] = useState({ name: '', phone: '', email: '', group: 'family' as Customer['group'], need: '', owner: 'u-dinh-van' });
  const [error, setError] = useState('');

  const save = async () => {
    if (!form.name.trim()) return setError('Nhập tên khách hàng.');
    if (!/^[\d\s+().-]{8,}$/.test(form.phone.trim())) return setError('Số điện thoại chưa hợp lệ.');
    const duplicate = data.customers.find((c) => c.phone.replace(/\D/g, '') === form.phone.replace(/\D/g, ''));
    if (duplicate) return setError(`Số điện thoại này đã có trong hồ sơ “${duplicate.name}”. Hãy kiểm tra trước khi tạo mới.`);
    const id = `kh-${String(data.customers.length + 1).padStart(3, '0')}`;
    const err = await commit(
      'new-customer',
      (draft) => {
        draft.customers.unshift({
          id,
          name: form.name.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
          city: '',
          source: 'direct',
          group: form.group,
          need: form.need,
          tags: [],
          preferences: [],
          note: '',
          ownerId: form.owner,
          createdAt: DEMO_TODAY,
        });
      },
      'Đã thêm khách hàng vào bản demo',
    );
    if (!err) {
      onSaved(id);
      onClose();
      setForm({ name: '', phone: '', email: '', group: 'family', need: '', owner: 'u-dinh-van' });
      setError('');
    }
  };

  return (
    <Modal open={open} onClose={onClose} labelledBy="crm-new" className="dialog--admin">
      <h2 id="crm-new" className="dialog__title">
        Thêm khách hàng
      </h2>
      <div className="pr__form2">
        <label className="afield">
          <span>Họ tên *</span>
          <input className="ainput" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </label>
        <label className="afield">
          <span>Số điện thoại *</span>
          <input className="ainput" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </label>
        <label className="afield">
          <span>Email</span>
          <input type="email" className="ainput" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </label>
        <label className="afield">
          <span>Nhóm khách</span>
          <select className="ainput" value={form.group} onChange={(e) => setForm({ ...form, group: e.target.value as Customer['group'] })}>
            {Object.entries(GROUP_LABEL).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="afield pr__full">
          <span>Nhu cầu chính</span>
          <input className="ainput" value={form.need} onChange={(e) => setForm({ ...form, need: e.target.value })} />
        </label>
        <label className="afield">
          <span>Nhân viên phụ trách</span>
          <select className="ainput" value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })}>
            {data.users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      {error && (
        <p className="aerror" role="alert">
          {error}
        </p>
      )}
      <p className="adialog__note">Chỉ thu thập thông tin cần cho chuyến đi; dữ liệu nằm trong bản demo trên máy.</p>
      <div className="adialog__actions">
        <button type="button" className="abtn abtn--ghost" onClick={onClose}>
          Đóng
        </button>
        <button type="button" className="abtn abtn--primary" onClick={save} disabled={busy === 'new-customer'} data-autofocus>
          Lưu khách hàng
        </button>
      </div>
    </Modal>
  );
}

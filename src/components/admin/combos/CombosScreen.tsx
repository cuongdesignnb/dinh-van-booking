'use client';

import {
  CalendarDays,
  ChevronDown,
  CircleCheck,
  Clock,
  DollarSign,
  Images,
  Map as MapIcon,
  Pencil,
  Plus,
  Search,
  Star,
  TrendingUp,
  Users,
  X,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { DEMO_TODAY } from '@/data/admin/fixture-clock';
import { formatDate, num, percent, searchKey, vnd } from '@/lib/admin/formatters';
import { bookingsInRange, bookingTotal } from '@/lib/admin/selectors';
import type { AdminCombo } from '@/lib/admin/types';
import { useAdmin } from '../AdminStore';
import { AdminPagination, ConfirmDialog, EmptyState, Panel, RowMenu, StatCard, StatusBadge } from '../shared/ui';
import { ComboEditor } from './ComboEditor';

const DURATIONS = [
  { id: 'all', label: 'Tất cả' },
  { id: '2', label: '2N1Đ' },
  { id: '3', label: '3N2Đ' },
];

const AUDIENCES = [
  { id: 'all', label: 'Tất cả' },
  { id: 'Gia đình', label: 'Gia đình' },
  { id: 'Cặp đôi', label: 'Cặp đôi' },
  { id: 'Nhóm bạn', label: 'Nhóm bạn' },
];

const STATES = [
  { id: 'all', label: 'Tất cả' },
  { id: 'selling', label: 'Đang bán' },
  { id: 'paused', label: 'Tạm dừng' },
  { id: 'draft', label: 'Bản nháp' },
];

const PRICES = [
  { id: 'all', label: 'Tất cả' },
  { id: 'lt1500', label: 'Dưới 1.500.000đ' },
  { id: 'gt1500', label: 'Từ 1.500.000đ' },
];

const SORTS = [
  { id: 'newest', label: 'Mới nhất' },
  { id: 'bookings', label: 'Lượt đặt nhiều nhất' },
  { id: 'price-asc', label: 'Giá thấp → cao' },
  { id: 'price-desc', label: 'Giá cao → thấp' },
];

const STATE_BADGE: Record<AdminCombo['state'], { label: string; tone: string }> = {
  selling: { label: 'Đang bán', tone: 'success' },
  paused: { label: 'Tạm dừng', tone: 'warning' },
  draft: { label: 'Bản nháp', tone: 'muted' },
};

const BADGE_LABEL: Record<NonNullable<AdminCombo['badge']>, string> = {
  featured: 'Nổi bật',
  bestseller: 'Bán chạy',
  seasonal: 'Theo mùa',
};

const TABS = [
  { id: 'itinerary', label: 'Lịch trình', icon: CalendarDays },
  { id: 'general', label: 'Thông tin chung', icon: MapIcon },
  { id: 'media', label: 'Hình ảnh', icon: Images },
  { id: 'pricing', label: 'Giá & lịch khởi hành', icon: DollarSign },
  { id: 'reviews', label: 'Đánh giá', icon: Star },
] as const;

const PAGE_SIZE = 6;

export function CombosScreen() {
  const { data, range, commit, busy } = useAdmin();
  const params = useSearchParams();
  const pathname = usePathname();

  const duration = params.get('duration') ?? 'all';
  const audience = params.get('audience') ?? 'all';
  const state = params.get('state') ?? 'all';
  const price = params.get('price') ?? 'all';
  const q = params.get('q') ?? '';
  const sort = params.get('sort') ?? 'newest';
  const page = Math.max(1, Number(params.get('page') ?? 1));
  const tab = (params.get('tab') ?? 'itinerary') as (typeof TABS)[number]['id'];
  const [editorOpen, setEditorOpen] = useState(params.get('action') === 'create');
  const [editing, setEditing] = useState<AdminCombo | null>(null);
  const [gallery, setGallery] = useState(false);
  const [pauseTarget, setPauseTarget] = useState<AdminCombo | null>(null);

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
    const key = searchKey(q);
    const list = data.combos.filter((c) => {
      if (duration !== 'all' && String(c.days) !== duration) return false;
      if (audience !== 'all' && !c.audiences.includes(audience)) return false;
      if (state !== 'all' && c.state !== state) return false;
      if (price === 'lt1500' && c.price >= 1500000) return false;
      if (price === 'gt1500' && c.price < 1500000) return false;
      if (key && !searchKey(`${c.name} ${c.area} ${c.summary}`).includes(key)) return false;
      return true;
    });
    if (sort === 'bookings') list.sort((a, b) => b.bookings - a.bookings);
    else if (sort === 'price-asc') list.sort((a, b) => a.price - b.price);
    else if (sort === 'price-desc') list.sort((a, b) => b.price - a.price);
    return list;
  }, [data.combos, duration, audience, state, price, q, sort]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const rows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const selectedId = params.get('selected');
  // Default to the combo the reference screen shows, then fall back to the list.
  const selected =
    data.combos.find((c) => c.id === selectedId) ??
    rows.find((c) => c.id === 'trang-an-bai-dinh') ??
    rows[0] ??
    data.combos[0];

  const comboRevenue = bookingsInRange(data, range)
    .filter((b) => b.comboId && b.status === 'completed')
    .reduce((s, b) => s + bookingTotal(b), 0);
  const comboBookings = bookingsInRange(data, range).filter((b) => b.comboId && b.status !== 'cancelled').length;
  const selling = data.combos.filter((c) => c.state === 'selling').length;
  const views = data.combos.reduce((s, c) => s + c.views, 0);
  const conversion = views ? (comboBookings / views) * 100 : 0;
  const lowSeats = data.combos.filter((c) => c.bookings > 100).length;

  return (
    <div className="cb">
      <section className="kpis kpis--5" aria-label="Chỉ số combo">
        <StatCard icon={<MapIcon size={22} aria-hidden="true" />} tone="mint" label="Số combo đang bán" value={selling} caption={`Tổng ${data.combos.length} combo trong hệ thống`} />
        <StatCard icon={<Star size={22} aria-hidden="true" />} tone="cream" label="Combo nổi bật" value={data.combos.filter((c) => c.featured).length} caption="Đang hiển thị trên trang chủ" />
        <StatCard icon={<DollarSign size={22} aria-hidden="true" />} tone="green" label="Doanh thu combo trong kỳ" value={vnd(comboRevenue)} caption={`Từ ${comboBookings} lượt đặt combo`} />
        <StatCard
          icon={<TrendingUp size={22} aria-hidden="true" />}
          tone="sky"
          label="Tỉ lệ chuyển đổi"
          value={views ? percent(conversion, 1) : 'Chưa có dữ liệu'}
          caption="Lượt đặt / lượt xem (số xem là dữ liệu mẫu)"
        />
        <StatCard icon={<Clock size={22} aria-hidden="true" />} tone="rose" label="Combo cần theo dõi" value={lowSeats} caption="Lượt đặt cao, cần kiểm tra chỗ" />
      </section>

      <Panel title={<span className="sr-only">Bộ lọc combo</span>} className="cb__filters">
        <div className="cb__filter-grid">
          <FilterSelect label="Thời lượng" value={duration} options={DURATIONS} onChange={(v) => setQuery({ duration: v })} />
          <FilterSelect label="Đối tượng" value={audience} options={AUDIENCES} onChange={(v) => setQuery({ audience: v })} />
          <FilterSelect label="Trạng thái" value={state} options={STATES} onChange={(v) => setQuery({ state: v })} />
          <FilterSelect label="Khoảng giá" value={price} options={PRICES} onChange={(v) => setQuery({ price: v })} />
          <label className="afield cb__search-field">
            <span className="sr-only">Tìm kiếm combo</span>
            <span className="bk__search">
              <Search size={15} aria-hidden="true" />
              <input className="ainput" value={q} placeholder="Tìm kiếm combo…" onChange={(e) => setQuery({ q: e.target.value })} />
            </span>
          </label>
          <button
            type="button"
            className="abtn abtn--primary"
            onClick={() => {
              setEditing(null);
              setEditorOpen(true);
            }}
          >
            <Plus size={16} aria-hidden="true" /> Tạo combo mới
          </button>
        </div>
      </Panel>

      <div className="cb__grid">
        <Panel
          icon={<MapIcon size={18} aria-hidden="true" />}
          title={`Danh sách combo du lịch (${filtered.length})`}
          className="cb__list"
          action={
            <label className="pr__tool">
              Sắp xếp theo
              <span className="aselect">
                <select className="ainput" value={sort} onChange={(e) => setQuery({ sort: e.target.value })}>
                  {SORTS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} aria-hidden="true" />
              </span>
            </label>
          }
        >
          {rows.length ? (
            <ul className="ccards">
              {rows.map((c) => (
                <li key={c.id}>
                  <div className={`ccard${c.id === selected?.id ? ' is-selected' : ''}`}>
                    <button type="button" className="ccard__main" onClick={() => setQuery({ selected: c.id })} aria-current={c.id === selected?.id}>
                      <span className="ccard__media">
                        <Image src={c.cover} alt="" width={132} height={92} />
                        {c.badge && <span className={`ccard__badge ccard__badge--${c.badge}`}>{BADGE_LABEL[c.badge]}</span>}
                        <span className="ccard__days">
                          {c.days}N{c.nights}Đ
                        </span>
                      </span>
                      <span className="ccard__body">
                        <strong>{c.name}</strong>
                        <span className="ccard__area">
                          <MapIcon size={12} aria-hidden="true" /> {c.area}
                        </span>
                        <span className="ccard__aud">
                          {c.audiences.map((a) => (
                            <span key={a}>
                              <Users size={11} aria-hidden="true" /> {a}
                            </span>
                          ))}
                        </span>
                        <span className="ccard__tags">
                          {c.tags.slice(0, 3).map((t) => (
                            <span key={t}>{t}</span>
                          ))}
                        </span>
                      </span>
                      <span className="ccard__side">
                        <strong className="numeric">{vnd(c.price)}</strong>
                        <span className="numeric">
                          <Users size={12} aria-hidden="true" /> {num(c.bookings)} lượt đặt
                        </span>
                        <StatusBadge label={STATE_BADGE[c.state].label} tone={STATE_BADGE[c.state].tone} small />
                      </span>
                    </button>
                    <RowMenu
                      label={`Thao tác cho ${c.name}`}
                      items={[
                        {
                          label: 'Chỉnh sửa',
                          onSelect: () => {
                            setEditing(c);
                            setEditorOpen(true);
                          },
                        },
                        {
                          label: 'Nhân bản (bản nháp)',
                          onSelect: () =>
                            commit(
                              'duplicate',
                              (draft) => {
                                const src = draft.combos.find((x) => x.id === c.id);
                                if (!src) return 'Không tìm thấy combo.';
                                draft.combos.unshift({
                                  ...structuredClone(src),
                                  id: `${src.id}-ban-sao-${Date.now().toString(36)}`,
                                  slug: `${src.slug}-ban-sao`,
                                  name: `${src.name} (bản sao)`,
                                  state: 'draft',
                                  featured: false,
                                  badge: null,
                                  bookings: 0,
                                  views: 0,
                                  revenue: 0,
                                });
                              },
                              'Đã nhân bản combo thành bản nháp mới',
                            ),
                        },
                        { label: c.state === 'paused' ? 'Mở bán lại' : 'Tạm dừng bán', onSelect: () => setPauseTarget(c) },
                        { label: 'Xem booking liên quan', onSelect: () => window.location.assign(`/admin/dat-phong?combo=${c.id}`) },
                      ]}
                    />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Không có combo nào khớp bộ lọc." />
          )}
          <footer className="pr__list-foot">
            <span>
              Hiển thị {rows.length} trên {filtered.length} kết quả
            </span>
            <AdminPagination page={current} pages={pages} onChange={(p) => setQuery({ page: String(p) })} compact />
          </footer>
        </Panel>

        {selected ? (
          <Panel
            title={
              <>
                {selected.name} <StatusBadge label={STATE_BADGE[selected.state].label} tone={STATE_BADGE[selected.state].tone} small />
              </>
            }
            className="cb__detail"
            action={
              <>
                <button
                  type="button"
                  className="abtn abtn--ghost abtn--sm"
                  onClick={() => {
                    setEditing(selected);
                    setEditorOpen(true);
                  }}
                >
                  <Pencil size={13} aria-hidden="true" /> Chỉnh sửa
                </button>
                <RowMenu
                  label="Thao tác combo đang chọn"
                  items={[
                    { label: 'Xem booking liên quan', onSelect: () => window.location.assign(`/admin/dat-phong?combo=${selected.id}`) },
                    { label: selected.state === 'paused' ? 'Mở bán lại' : 'Tạm dừng bán', onSelect: () => setPauseTarget(selected) },
                  ]}
                />
              </>
            }
          >
            <div className="cb__hero">
              <div className="cb__cover">
                <Image src={selected.cover} alt={`Ảnh combo ${selected.name}`} width={420} height={240} />
                <span className="cb__cover-days">
                  {selected.days}N{selected.nights}Đ
                </span>
                <p className="cb__cover-note handwritten">Hành trình trở về với những giá trị nguyên bản</p>
                <button type="button" className="abtn abtn--ghost abtn--sm cb__gallery-btn" onClick={() => setGallery(true)}>
                  Xem thêm ảnh ({selected.gallery.length})
                </button>
              </div>
              <aside className="cb__stats">
                <p className="cb__price numeric">
                  {vnd(selected.price)} <span>/ {selected.priceUnit === 'person' ? 'người' : 'nhóm'}</span>
                </p>
                <ul>
                  <li>
                    <Users size={14} aria-hidden="true" /> <strong className="numeric">{num(selected.bookings)}</strong> lượt đặt
                  </li>
                  <li>
                    <DollarSign size={14} aria-hidden="true" /> <strong className="numeric">{vnd(selected.revenue)}</strong>
                    <small>Doanh thu (toàn thời gian, dữ liệu mẫu)</small>
                  </li>
                  <li>
                    <TrendingUp size={14} aria-hidden="true" /> <strong className="numeric">{percent((selected.bookings / Math.max(1, selected.views)) * 100, 1)}</strong>
                    <small>Tỉ lệ chuyển đổi</small>
                  </li>
                </ul>
                {selected.promotion && (
                  <div className="cb__promo">
                    <strong>Khuyến mãi đang áp dụng</strong>
                    <span>{selected.promotion.label}</span>
                    <small>
                      Hiệu lực đến {formatDate(selected.promotion.until)}
                      {selected.promotion.until < DEMO_TODAY ? ' (đã hết hạn)' : ''}
                    </small>
                  </div>
                )}
              </aside>
            </div>

            <div className="cb__tabs" role="tablist" aria-label="Chi tiết combo">
              {TABS.map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    type="button"
                    role="tab"
                    aria-selected={tab === t.id}
                    className={tab === t.id ? 'is-active' : undefined}
                    onClick={() => setQuery({ tab: t.id })}
                  >
                    <Icon size={13} aria-hidden="true" /> {t.label}
                  </button>
                );
              })}
            </div>

            <div className="cb__tabpanel" role="tabpanel">
              {tab === 'itinerary' && (
                <div className="cb__itinerary">
                  <h3>Lịch trình chi tiết</h3>
                  <ol>
                    {selected.itinerary.map((d) => (
                      <li key={d.day}>
                        <span className="cb__day">Ngày {d.day}</span>
                        <div>
                          <strong>{d.title}</strong>
                          <small className="numeric">{d.time}</small>
                          <ul>
                            {d.activities.map((a) => (
                              <li key={a}>{a}</li>
                            ))}
                          </ul>
                        </div>
                      </li>
                    ))}
                  </ol>
                  <div className="cb__incl">
                    <section>
                      <h4>
                        <CircleCheck size={14} aria-hidden="true" /> Dịch vụ bao gồm
                      </h4>
                      <ul>
                        {selected.includes.map((i) => (
                          <li key={i}>
                            <CircleCheck size={12} aria-hidden="true" /> {i}
                          </li>
                        ))}
                      </ul>
                    </section>
                    <section>
                      <h4>
                        <X size={14} aria-hidden="true" /> Dịch vụ không bao gồm
                      </h4>
                      <ul>
                        {selected.excludes.map((i) => (
                          <li key={i}>
                            <X size={12} aria-hidden="true" /> {i}
                          </li>
                        ))}
                      </ul>
                    </section>
                  </div>
                </div>
              )}

              {tab === 'general' && (
                <dl className="bk__dl">
                  <dt>Mô tả</dt>
                  <dd>{selected.summary}</dd>
                  <dt>Đối tượng</dt>
                  <dd>{selected.audiences.join(', ')}</dd>
                  <dt>Thẻ nội dung</dt>
                  <dd>{selected.tags.join(', ')}</dd>
                  <dt>Khu vực</dt>
                  <dd>{selected.area}</dd>
                  <dt>Điều kiện</dt>
                  <dd>
                    <ul className="cb__terms">
                      {selected.terms.map((t) => (
                        <li key={t}>{t}</li>
                      ))}
                    </ul>
                  </dd>
                </dl>
              )}

              {tab === 'media' && (
                <ul className="cb__gallery">
                  {selected.gallery.map((g) => (
                    <li key={g}>
                      <Image src={g} alt={`Ảnh combo ${selected.name}`} width={160} height={100} />
                    </li>
                  ))}
                  {selected.gallery.length === 0 && <li>Chưa có ảnh nào ngoài ảnh bìa.</li>}
                </ul>
              )}

              {tab === 'pricing' && (
                <div className="cb__pricing">
                  <ul className="bk__pay-list">
                    <li>
                      <span>Giá người lớn</span>
                      <strong className="numeric">{vnd(selected.price)}</strong>
                    </li>
                    <li>
                      <span>Giá trẻ em</span>
                      <strong className="numeric">{selected.childPrice ? vnd(selected.childPrice) : 'Chưa cấu hình'}</strong>
                    </li>
                    <li>
                      <span>Đơn vị tính</span>
                      <strong>{selected.priceUnit === 'person' ? 'Theo người' : 'Theo nhóm'}</strong>
                    </li>
                  </ul>
                  <p className="ahint">
                    Lịch khởi hành cố định chưa được cấu hình cho combo này; các đơn hiện tại đi theo ngày khách chọn.
                  </p>
                  <Link href={`/admin/dat-phong?combo=${selected.id}`} className="abtn abtn--ghost abtn--sm">
                    Xem booking dùng combo này
                  </Link>
                </div>
              )}

              {tab === 'reviews' && (
                <div className="cb__reviews">
                  <p className="ahint">Đánh giá là dữ liệu mẫu, chưa nối với hệ thống đánh giá thật.</p>
                  <ul>
                    <li>
                      <strong>Nguyễn Thị Mai</strong> <span className="numeric">5.0 ★</span>
                      <p>“Lịch trình vừa sức, hướng dẫn viên nhiệt tình.”</p>
                    </li>
                    <li>
                      <strong>Trần Quốc Hùng</strong> <span className="numeric">4.5 ★</span>
                      <p>“Cảnh đẹp, bữa ăn ngon, cần thêm thời gian nghỉ.”</p>
                    </li>
                  </ul>
                </div>
              )}
            </div>
          </Panel>
        ) : (
          <Panel title="Chi tiết combo">
            <EmptyState title="Chưa có combo nào được chọn." />
          </Panel>
        )}
      </div>

      <Modal open={gallery} onClose={() => setGallery(false)} labelledBy="combo-gallery" className="dialog--admin" size="lg">
        <h2 id="combo-gallery" className="dialog__title">
          Ảnh combo {selected?.name}
        </h2>
        <ul className="cb__gallery">
          {selected?.gallery.map((g) => (
            <li key={g}>
              <Image src={g} alt={`Ảnh combo ${selected.name}`} width={220} height={140} />
            </li>
          ))}
        </ul>
        <p className="adialog__note">Bộ ảnh hiện có {selected?.gallery.length ?? 0} ảnh trong dữ liệu mẫu.</p>
      </Modal>

      <ConfirmDialog
        open={Boolean(pauseTarget)}
        onClose={() => setPauseTarget(null)}
        busy={busy === 'combo-state'}
        title={pauseTarget?.state === 'paused' ? 'Mở bán lại combo' : 'Tạm dừng bán combo'}
        confirmLabel={pauseTarget?.state === 'paused' ? 'Mở bán lại' : 'Tạm dừng'}
        onConfirm={async () => {
          const target = pauseTarget;
          if (!target) return;
          await commit(
            'combo-state',
            (draft) => {
              const c = draft.combos.find((x) => x.id === target.id);
              if (!c) return 'Không tìm thấy combo.';
              c.state = c.state === 'paused' ? 'selling' : 'paused';
            },
            'Đã cập nhật trạng thái combo trong bản demo',
          );
          setPauseTarget(null);
        }}
      >
        <p>{pauseTarget?.name}</p>
        <p className="adialog__note">Tạm dừng chỉ đóng việc bán mới; các đơn đã đặt vẫn giữ nguyên.</p>
      </ConfirmDialog>

      <ComboEditor
        open={editorOpen}
        combo={editing}
        onClose={() => {
          setEditorOpen(false);
          setEditing(null);
        }}
        onSaved={(id) => setQuery({ selected: id })}
      />
    </div>
  );
}

function FilterSelect({
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
    <label className="afield cb__filter">
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

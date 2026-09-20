'use client';

import {
  BedDouble,
  ChevronDown,
  CircleCheck,
  Clock,
  DollarSign,
  Eye,
  Heart,
  LayoutGrid,
  List,
  MapPin,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Star,
  Wrench,
} from 'lucide-react';
import Image from 'next/image';
import { usePathname, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { DEMO_TODAY } from '@/data/admin/fixture-clock';
import { KIND_LABEL, num, percent, searchKey, vnd } from '@/lib/admin/formatters';
import { inventoryForDay, propertyStats, revenueForRange } from '@/lib/admin/selectors';
import type { Property } from '@/lib/admin/types';
import { useAdmin } from '../AdminStore';
import { AdminPagination, ConfirmDialog, EmptyState, Panel, StatCard, StatusBadge } from '../shared/ui';
import { InventoryPanel, RatesPanel, RoomTypesPanel } from './RatePanels';
import { PropertyEditor } from './PropertyEditor';

const KIND_FILTERS = [
  { id: 'all', label: 'Tất cả loại' },
  { id: 'homestay', label: 'Homestay' },
  { id: 'lodge', label: 'Eco Lodge' },
  { id: 'bungalow', label: 'Bungalow' },
  { id: 'stilt', label: 'Nhà sàn' },
  { id: 'resort', label: 'Resort' },
];

const STATE_FILTERS = [
  { id: 'all', label: 'Tất cả trạng thái' },
  { id: 'active', label: 'Đang hoạt động' },
  { id: 'maintenance', label: 'Đang bảo trì' },
  { id: 'hidden', label: 'Tạm ẩn' },
];

const PRICE_FILTERS = [
  { id: 'all', label: 'Tất cả mức giá' },
  { id: 'lt700', label: 'Dưới 700.000đ' },
  { id: '700-1000', label: '700.000 – 1.000.000đ' },
  { id: 'gt1000', label: 'Trên 1.000.000đ' },
];

const SORTS = [
  { id: 'newest', label: 'Mới nhất' },
  { id: 'price-asc', label: 'Giá thấp → cao' },
  { id: 'price-desc', label: 'Giá cao → thấp' },
  { id: 'rating', label: 'Đánh giá cao nhất' },
];

const STATE_BADGE: Record<Property['state'], { label: string; tone: string }> = {
  active: { label: 'Đang hoạt động', tone: 'success' },
  maintenance: { label: 'Đang bảo trì', tone: 'warning' },
  hidden: { label: 'Tạm ẩn', tone: 'muted' },
};

export function PropertiesScreen() {
  const { data, range, today, commit, busy } = useAdmin();
  const params = useSearchParams();
  const pathname = usePathname();

  const q = params.get('q') ?? '';
  const kind = params.get('kind') ?? 'all';
  const area = params.get('area') ?? 'all';
  const state = params.get('state') ?? 'all';
  const price = params.get('price') ?? 'all';
  const sort = params.get('sort') ?? 'newest';
  const view = params.get('view') === 'list' ? 'list' : 'grid';
  const size = Number(params.get('size') ?? 12);
  const page = Math.max(1, Number(params.get('page') ?? 1));
  const selectedId = params.get('selected') ?? data.properties[0]?.id;
  const [editorOpen, setEditorOpen] = useState(params.get('action') === 'create');
  const [editing, setEditing] = useState<Property | null>(null);
  const [hideTarget, setHideTarget] = useState<Property | null>(null);

  const setQuery = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === '' || v === 'all') next.delete(k);
      else next.set(k, v);
    }
    if (!('page' in patch)) next.delete('page');
    window.history.pushState(null, '', `${pathname}?${next.toString()}`);
  };

  const stats = propertyStats(data, range, today);
  const areas = [...new Set(data.properties.map((p) => p.area))];

  const filtered = useMemo(() => {
    const key = searchKey(q);
    const list = data.properties.filter((p) => {
      if (kind !== 'all' && p.kind !== kind) return false;
      if (area !== 'all' && p.area !== area) return false;
      if (state !== 'all' && p.state !== state) return false;
      if (price === 'lt700' && p.fromPrice >= 700000) return false;
      if (price === '700-1000' && (p.fromPrice < 700000 || p.fromPrice > 1000000)) return false;
      if (price === 'gt1000' && p.fromPrice <= 1000000) return false;
      if (key && !searchKey(`${p.name} ${p.code} ${p.address}`).includes(key)) return false;
      return true;
    });
    if (sort === 'price-asc') list.sort((a, b) => a.fromPrice - b.fromPrice);
    else if (sort === 'price-desc') list.sort((a, b) => b.fromPrice - a.fromPrice);
    else if (sort === 'rating') list.sort((a, b) => b.rating - a.rating);
    return list;
  }, [data.properties, q, kind, area, state, price, sort]);

  const pages = Math.max(1, Math.ceil(filtered.length / size));
  const current = Math.min(page, pages);
  const rows = filtered.slice((current - 1) * size, current * size);
  const selected = data.properties.find((p) => p.id === selectedId) ?? data.properties[0];

  return (
    <div className="pr">
      <section className="kpis kpis--5" aria-label="Chỉ số phòng nghỉ">
        <StatCard
          icon={<BedDouble size={22} aria-hidden="true" />}
          tone="mint"
          label="Tổng số phòng (đơn vị bán)"
          value={stats.units}
          caption={`${data.properties.length} nơi lưu trú trong hệ thống`}
          hint="Đếm theo đơn vị phòng bán được (RoomUnit), không phải số nơi lưu trú."
        />
        <StatCard
          icon={<CircleCheck size={22} aria-hidden="true" />}
          tone="green"
          label="Đang hoạt động"
          value={stats.active}
          caption="Phòng đang mở bán hôm nay"
        />
        <StatCard
          icon={<Clock size={22} aria-hidden="true" />}
          tone="cream"
          label="Sắp kín chỗ"
          value={stats.nearlyFull}
          caption="Nơi lưu trú còn ≤ 1 phòng trống hôm nay"
        />
        <StatCard
          icon={<Wrench size={22} aria-hidden="true" />}
          tone="rose"
          label="Đang bảo trì"
          value={stats.maintenance}
          caption="Phòng tạm ngưng kinh doanh hôm nay"
        />
        <StatCard
          icon={<DollarSign size={22} aria-hidden="true" />}
          tone="sky"
          label="Doanh thu phòng"
          value={vnd(revenueForRange(data, range).rooms)}
          caption="Phần doanh thu phòng trong kỳ đang chọn"
        />
      </section>

      <Panel title={<span className="sr-only">Bộ lọc phòng nghỉ</span>} className="pr__filters">
        <div className="pr__filter-grid">
          <label className="afield">
            <span>Từ khóa tìm kiếm</span>
            <span className="bk__search">
              <Search size={15} aria-hidden="true" />
              <input className="ainput" value={q} placeholder="Tên phòng, mã phòng…" onChange={(e) => setQuery({ q: e.target.value })} />
            </span>
          </label>
          <FilterSelect label="Loại lưu trú" value={kind} options={KIND_FILTERS} onChange={(v) => setQuery({ kind: v })} />
          <FilterSelect
            label="Khu vực"
            value={area}
            options={[{ id: 'all', label: 'Tất cả khu vực' }, ...areas.map((a) => ({ id: a, label: a }))]}
            onChange={(v) => setQuery({ area: v })}
          />
          <FilterSelect label="Trạng thái" value={state} options={STATE_FILTERS} onChange={(v) => setQuery({ state: v })} />
          <FilterSelect label="Mức giá (đêm)" value={price} options={PRICE_FILTERS} onChange={(v) => setQuery({ price: v })} />
          <div className="pr__filter-actions">
            <button type="button" className="abtn abtn--ghost" onClick={() => setQuery({ q: null, kind: null, area: null, state: null, price: null })}>
              <RotateCcw size={15} aria-hidden="true" /> Xóa lọc
            </button>
            <button
              type="button"
              className="abtn abtn--primary"
              onClick={() => {
                setEditing(null);
                setEditorOpen(true);
              }}
            >
              <Plus size={16} aria-hidden="true" /> Thêm phòng nghỉ
            </button>
          </div>
        </div>
      </Panel>

      <Panel
        icon={<BedDouble size={18} aria-hidden="true" />}
        title="Danh sách phòng nghỉ"
        className="pr__list-card"
        action={
          <div className="pr__list-tools">
            <label className="pr__tool">
              Sắp xếp:
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
            <div className="pr__view" role="group" aria-label="Kiểu hiển thị">
              <button type="button" aria-pressed={view === 'grid'} onClick={() => setQuery({ view: 'grid' })} aria-label="Dạng lưới">
                <LayoutGrid size={15} aria-hidden="true" />
              </button>
              <button type="button" aria-pressed={view === 'list'} onClick={() => setQuery({ view: 'list' })} aria-label="Dạng danh sách">
                <List size={15} aria-hidden="true" />
              </button>
            </div>
            <label className="pr__tool">
              Hiển thị:
              <span className="aselect">
                <select className="ainput" value={size} onChange={(e) => setQuery({ size: e.target.value, page: '1' })}>
                  {[4, 8, 12].map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} aria-hidden="true" />
              </span>
            </label>
          </div>
        }
      >
        {rows.length ? (
          <ul className={`pcards pcards--${view}`}>
            {rows.map((p) => {
              const inv = inventoryForDay(data, today, p.id);
              const rooms = data.roomTypes.filter((t) => t.propertyId === p.id);
              return (
                <li key={p.id} className={p.id === selected?.id ? 'is-selected' : undefined}>
                  <article className="pcard">
                    <div className="pcard__media">
                      <Image src={p.cover} alt={`Ảnh ${p.name}`} width={280} height={140} className="pcard__img" />
                      <StatusBadge label={STATE_BADGE[p.state].label} tone={STATE_BADGE[p.state].tone} small />
                      <button
                        type="button"
                        className={`pcard__pin${p.pinned ? ' is-on' : ''}`}
                        aria-pressed={p.pinned}
                        aria-label={p.pinned ? `Bỏ ghim ${p.name}` : `Ghim ${p.name} lên đầu danh sách quản trị`}
                        title="Ghim nội bộ trong trang quản trị (không phải mục yêu thích của khách)"
                        onClick={() =>
                          commit(
                            'pin',
                            (draft) => {
                              const target = draft.properties.find((x) => x.id === p.id);
                              if (target) target.pinned = !target.pinned;
                            },
                            p.pinned ? 'Đã bỏ ghim trong bản demo' : 'Đã ghim nội bộ trong bản demo',
                          )
                        }
                      >
                        <Heart size={15} aria-hidden="true" />
                      </button>
                    </div>
                    <div className="pcard__body">
                      <h3>{p.name}</h3>
                      <p className="pcard__meta">
                        <span className="pcard__code">{p.code}</span>
                        <MapPin size={12} aria-hidden="true" /> {p.address}
                      </p>
                      <p className="pcard__rating">
                        <Star size={13} aria-hidden="true" /> <strong>{p.rating.toFixed(1)}</strong>
                        <span>({num(p.reviewCount)} đánh giá)</span>
                        <span className="ademo">Dữ liệu mẫu</span>
                      </p>
                      <p className="pcard__price numeric">
                        {vnd(p.fromPrice)} <span>/ đêm</span>
                      </p>
                      <ul className="pcard__tags">
                        {p.amenities.slice(0, 4).map((a) => (
                          <li key={a}>{a === 'wifi' ? 'Wifi' : a === 'breakfast' ? 'Ăn sáng' : a === 'view' ? 'View rừng' : a === 'kitchen' ? 'Có bếp' : a === 'pool' ? 'Hồ bơi' : a === 'parking' ? 'Chỗ đậu xe' : a === 'eco' ? 'Thân thiện' : 'Gia đình'}</li>
                        ))}
                      </ul>
                      <p className="pcard__facts">
                        <span>{KIND_LABEL[p.kind]}</span>
                        <span>{rooms.length} loại phòng</span>
                        <span>{inv.total} phòng</span>
                        <span className={inv.free === 0 ? 'is-full' : inv.free <= 1 ? 'is-low' : undefined}>
                          {p.state === 'maintenance' ? 'Bảo trì' : `Còn ${inv.free} phòng`}
                        </span>
                      </p>
                      <div className="pcard__actions">
                        <button
                          type="button"
                          className="abtn abtn--ghost abtn--sm"
                          onClick={() => {
                            setEditing(p);
                            setEditorOpen(true);
                          }}
                        >
                          <Pencil size={13} aria-hidden="true" /> Chỉnh sửa
                        </button>
                        <button type="button" className="abtn abtn--ghost abtn--sm" onClick={() => setQuery({ selected: p.id })}>
                          <Eye size={13} aria-hidden="true" /> Xem chi tiết
                        </button>
                        <button type="button" className="abtn abtn--danger abtn--sm" onClick={() => setHideTarget(p)}>
                          {p.publication === 'hidden' ? 'Hiện lại' : 'Tạm ẩn'}
                        </button>
                      </div>
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState
            title="Không có nơi lưu trú nào khớp bộ lọc."
            action={
              <button type="button" className="abtn abtn--ghost" onClick={() => setQuery({ q: null, kind: null, area: null, state: null, price: null })}>
                Xóa lọc
              </button>
            }
          />
        )}
        <footer className="pr__list-foot">
          <span>
            Hiển thị {rows.length} trên tổng {filtered.length} nơi lưu trú
          </span>
          <AdminPagination page={current} pages={pages} onChange={(p) => setQuery({ page: String(p) })} compact />
        </footer>
      </Panel>

      <section className="pr__bottom" id="ton-phong">
        <RoomTypesPanel property={selected} onChangeProperty={(id) => setQuery({ selected: id })} />
        <RatesPanel />
        <InventoryPanel property={selected} />
      </section>

      <PropertyEditor
        open={editorOpen}
        property={editing}
        onClose={() => {
          setEditorOpen(false);
          setEditing(null);
        }}
        onSaved={(id) => setQuery({ selected: id })}
      />

      <ConfirmDialog
        open={Boolean(hideTarget)}
        onClose={() => setHideTarget(null)}
        busy={busy === 'hide'}
        title={hideTarget?.publication === 'hidden' ? 'Hiện lại nơi lưu trú' : 'Tạm ẩn nơi lưu trú'}
        confirmLabel={hideTarget?.publication === 'hidden' ? 'Hiện lại' : 'Tạm ẩn'}
        onConfirm={async () => {
          const target = hideTarget;
          if (!target) return;
          await commit(
            'hide',
            (draft) => {
              const p = draft.properties.find((x) => x.id === target.id);
              if (!p) return 'Không tìm thấy nơi lưu trú.';
              p.publication = p.publication === 'hidden' ? 'published' : 'hidden';
            },
            'Đã cập nhật trạng thái hiển thị trong bản demo',
          );
          setHideTarget(null);
        }}
      >
        <p>
          {hideTarget?.name} sẽ {hideTarget?.publication === 'hidden' ? 'hiển thị lại' : 'được ẩn khỏi'} trang công khai trong dữ liệu mẫu.
        </p>
        <p className="adialog__note">
          Tạm ẩn không xóa nơi lưu trú và không hủy các đơn đã đặt. Trạng thái “Bảo trì” là điều kiện tồn phòng theo ngày, khác với
          việc ẩn trang.
        </p>
      </ConfirmDialog>
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

export { DEMO_TODAY, percent };

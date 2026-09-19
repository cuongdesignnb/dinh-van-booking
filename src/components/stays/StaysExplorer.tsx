'use client';

import { Info, LayoutGrid, List, Map as MapIcon, RotateCcw, SlidersHorizontal, X } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useId, useMemo, useState, type ReactNode } from 'react';
import { Pagination } from '@/components/shared/Pagination';
import { Modal } from '@/components/ui/Modal';
import { AMENITIES, STAY_TYPES, stays as ALL_STAYS } from '@/data/stays';
import { parseSelection, selectionQuery, writeSelection, type Selection } from '@/lib/selection';
import {
  activeFilterCount,
  applyFilters,
  DEFAULT_FILTERS,
  facetCounts,
  PAGE_SIZE,
  parseFilters,
  PRICE_BOUNDS,
  SORT_OPTIONS,
  writeFilters,
  type StayFilters,
} from '@/lib/stay-filters';
import { ListingCard } from './ListingCard';
import { StayFilterPanel } from './StayFilterPanel';
import { StayMapCard } from './StayMap';
import { priceLabel, StaySearchBar } from './StaySearchBar';

interface Slots {
  advisor: ReactNode;
  notFound: ReactNode;
  reviews: ReactNode;
  faq: ReactNode;
}

/**
 * Listing state machine. The URL is the single source of truth for the applied
 * selection + filters, so reload and back/forward restore the same results.
 */
export function StaysExplorer({ advisor, notFound, reviews, faq }: Slots) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const selection = useMemo(() => parseSelection(params), [params]);
  const filters = useMemo(() => parseFilters(params), [params]);
  const demo = params.get('demo');
  const extended = params.get('fixture') === 'extended';
  const dataset = useMemo(
    () =>
      extended
        ? [...ALL_STAYS, ...ALL_STAYS.map((s) => ({ ...s, id: `${s.id}-copy`, badge: undefined, name: `${s.name} (bản sao demo)` }))]
        : ALL_STAYS,
    [extended],
  );
  const guests = selection.adults + selection.children;
  const results = useMemo(() => applyFilters(dataset, filters, guests), [dataset, filters, guests]);
  const counts = useMemo(() => facetCounts(dataset, filters, guests), [dataset, filters, guests]);
  const pages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const page = Math.min(filters.page, pages);
  const pageItems = results.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const query = selectionQuery(selection);

  const [drawer, setDrawer] = useState(false);
  const [draft, setDraft] = useState<StayFilters>(filters);
  const drawerTitle = useId();

  const navigate = (sel: Selection, f: StayFilters) => {
    const base = new URLSearchParams(params);
    base.delete('demo');
    const next = writeFilters(f, writeSelection(sel, base));
    router.push(`${pathname}?${next.toString()}`, { scroll: false });
  };
  const patchFilters = (patch: Partial<StayFilters>) =>
    navigate(selection, { ...filters, ...patch, page: 'page' in patch ? patch.page! : 1 });
  const reset = () => navigate(selection, { ...DEFAULT_FILTERS, view: filters.view });

  const draftResults = useMemo(() => applyFilters(dataset, draft, guests).length, [dataset, draft, guests]);

  const chips = [
    ...(filters.priceMin !== PRICE_BOUNDS.min || filters.priceMax !== PRICE_BOUNDS.max
      ? [{ key: 'price', label: `Giá: ${priceLabel(filters)}`, clear: () => patchFilters({ priceMin: PRICE_BOUNDS.min, priceMax: PRICE_BOUNDS.max }) }]
      : []),
    ...filters.types.map((t) => ({
      key: `t-${t}`,
      label: STAY_TYPES.find((x) => x.id === t)!.label,
      clear: () => patchFilters({ types: filters.types.filter((x) => x !== t) }),
    })),
    ...filters.amenities.map((a) => ({
      key: `a-${a}`,
      label: AMENITIES.find((x) => x.id === a)!.label,
      clear: () => patchFilters({ amenities: filters.amenities.filter((x) => x !== a) }),
    })),
    ...(filters.minRating !== null
      ? [{ key: 'rating', label: `Từ ${filters.minRating.toFixed(1)} sao`, clear: () => patchFilters({ minRating: null }) }]
      : []),
  ];

  const filterPanel = (
    <StayFilterPanel value={filters} counts={counts} onChange={patchFilters} onReset={reset} />
  );

  let body: ReactNode;
  if (demo === 'loading') body = <ResultsSkeleton />;
  else if (demo === 'error')
    body = (
      <div className="state-box" role="alert">
        <Info size={22} aria-hidden="true" />
        <p>
          <strong>Chưa tải được danh sách chỗ nghỉ.</strong> Lựa chọn của bạn vẫn được giữ nguyên.
        </p>
        <button type="button" className="btn btn--primary" onClick={() => navigate(selection, filters)}>
          Thử lại
        </button>
      </div>
    );
  else if (!results.length)
    body = (
      <div className="state-box" role="status">
        <p>
          <strong>Chưa có chỗ nghỉ phù hợp với bộ lọc này.</strong> Bạn thử nới khoảng giá, bỏ bớt tiện ích hoặc
          nhờ Đinh Vân gợi ý nhé.
        </p>
        <div className="state-box__actions">
          <button type="button" className="btn btn--light" onClick={reset}>
            <RotateCcw size={15} aria-hidden="true" /> Đặt lại bộ lọc
          </button>
          <a className="btn btn--primary" href={`/lien-he?intent=stay&${query}`}>
            Nhận tư vấn miễn phí
          </a>
        </div>
      </div>
    );
  else
    body = (
      <ul className={`stays-results stays-results--${filters.view}`}>
        {pageItems.map((s, i) => (
          <li key={s.id}>
            <ListingCard stay={s} query={query} variant={filters.view} index={i} />
          </li>
        ))}
      </ul>
    );

  return (
    <>
      <div className="stays-search content-shell">
        <StaySearchBar
          selection={selection}
          filters={filters}
          onSearch={(sel) => navigate(sel, { ...filters, page: 1 })}
          onFilters={patchFilters}
        />
      </div>

      <div className="stays-layout content-shell">
        <aside className="stays-side stays-side--left" aria-label="Bộ lọc tìm kiếm">
          <div className="side-card filters-card">{filterPanel}</div>
        </aside>

        <section className="stays-main" aria-labelledby="stays-count">
          <div className="stays-toolbar">
            <p className="stays-toolbar__count" id="stays-count" aria-live="polite">
              {demo === 'loading' ? 'Đang tải kết quả…' : `Có ${results.length} kết quả phù hợp`}
            </p>
            <div className="stays-toolbar__mobile">
              <button
                type="button"
                className="tool-btn"
                aria-haspopup="dialog"
                onClick={() => {
                  setDraft(filters);
                  setDrawer(true);
                }}
              >
                <SlidersHorizontal size={16} aria-hidden="true" /> Lọc
                {activeFilterCount(filters) > 0 && <span className="tool-btn__badge">{activeFilterCount(filters)}</span>}
              </button>
              <label className="tool-btn tool-btn--select">
                <span className="sr-only">Sắp xếp</span>
                <select value={filters.sort} onChange={(e) => patchFilters({ sort: e.target.value as StayFilters['sort'] })}>
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <a className="tool-btn" href="#ban-do">
                <MapIcon size={16} aria-hidden="true" /> Bản đồ
              </a>
            </div>
            <div className="view-toggle" role="group" aria-label="Kiểu hiển thị">
              <button
                type="button"
                aria-pressed={filters.view === 'grid'}
                onClick={() => patchFilters({ view: 'grid', page })}
              >
                <LayoutGrid size={14} aria-hidden="true" /> Dạng lưới
              </button>
              <button
                type="button"
                aria-pressed={filters.view === 'list'}
                onClick={() => patchFilters({ view: 'list', page })}
              >
                <List size={14} aria-hidden="true" /> Dạng danh sách
              </button>
            </div>
          </div>
          {chips.length > 0 && (
            <ul className="filter-chips" aria-label="Bộ lọc đang áp dụng">
              {chips.map((c) => (
                <li key={c.key}>
                  <button type="button" className="filter-chip" onClick={c.clear} aria-label={`Bỏ lọc ${c.label}`}>
                    {c.label} <X size={12} aria-hidden="true" />
                  </button>
                </li>
              ))}
              <li>
                <button type="button" className="filter-chip filter-chip--reset" onClick={reset}>
                  Xóa tất cả
                </button>
              </li>
            </ul>
          )}
          {selection.checkIn && (
            <p className="stays-note">
              <Info size={14} aria-hidden="true" /> Đây là gợi ý theo nhu cầu; tình trạng phòng sẽ được xác nhận khi tư
              vấn.
            </p>
          )}
          {body}
          <div className="stays-main__pager">
            <Pagination page={page} pages={pages} onChange={(p) => patchFilters({ page: p })} />
          </div>
        </section>

        <aside className="stays-side stays-side--right" id="ban-do" aria-label="Bản đồ và tư vấn">
          <StayMapCard stays={demo ? [] : pageItems} query={query} />
          {advisor}
        </aside>
      </div>

      <div className="stays-bottom content-shell">
        <div className="stays-bottom__left">{notFound}</div>
        <div className="stays-bottom__mid">
          {reviews}
          <div className="stays-bottom__pager">
            <Pagination page={page} pages={pages} onChange={(p) => patchFilters({ page: p })} />
          </div>
        </div>
        <div className="stays-bottom__right">{faq}</div>
      </div>

      <Modal open={drawer} onClose={() => setDrawer(false)} labelledBy={drawerTitle} className="dialog--drawer">
        <h2 id={drawerTitle} className="dialog__title">
          Bộ lọc tìm kiếm
        </h2>
        <StayFilterPanel
          value={draft}
          counts={facetCounts(dataset, draft, guests)}
          onChange={(patch) => setDraft((d) => ({ ...d, ...patch }))}
          onReset={() => setDraft({ ...DEFAULT_FILTERS, view: draft.view })}
          bare
        />
        <div className="drawer-actions">
          <button type="button" className="btn btn--light" onClick={() => setDraft({ ...DEFAULT_FILTERS, view: draft.view })}>
            Đặt lại
          </button>
          <button
            type="button"
            className="btn btn--primary"
            data-autofocus
            onClick={() => {
              navigate(selection, { ...draft, page: 1 });
              setDrawer(false);
            }}
          >
            Áp dụng ({draftResults} kết quả)
          </button>
        </div>
      </Modal>
    </>
  );
}

export function ResultsSkeleton() {
  return (
    <ul className="stays-results stays-results--grid" aria-hidden="true">
      {Array.from({ length: 8 }, (_, i) => (
        <li key={i}>
          <div className="lcard lcard--skeleton">
            <div className="lcard__media skeleton" />
            <div className="lcard__body">
              <span className="skeleton skeleton--line" />
              <span className="skeleton skeleton--line skeleton--short" />
              <span className="skeleton skeleton--line" />
              <span className="skeleton skeleton--block" />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

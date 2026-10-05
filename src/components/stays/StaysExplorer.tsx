'use client';

import { BedDouble, Info, LayoutGrid, List, Map as MapIcon, RotateCcw, SlidersHorizontal, X } from 'lucide-react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useId, useMemo, useState, type ReactNode } from 'react';
import { apiRequest } from '@/lib/api/client';
import { Pagination } from '@/components/shared/Pagination';
import { Modal } from '@/components/ui/Modal';
import { AMENITIES, STAY_TYPES } from '@/lib/catalog/constants';
import type { Stay } from '@/data/stays';
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
import type { PublicMediaAsset } from '@/lib/api/public';
import { RichContentRenderer } from '@/components/content/RichContentRenderer';
import type { RichDocument } from '@/lib/content/rich-document';
import { publicText, richDocumentHasContent, type PublicRecord } from '@/lib/public-content';
import { priceLabel, StaySearchBar } from './StaySearchBar';

interface Slots {
  stays: Stay[];
  advisor: ReactNode;
  notFound: ReactNode;
  reviews: ReactNode;
  faq: ReactNode;
  mapImage: PublicMediaAsset | null;
  content: PublicRecord;
}

/**
 * Listing state machine. The URL is the single source of truth for the applied
 * selection + filters, so reload and back/forward restore the same results.
 */
export function StaysExplorer({ stays, advisor, notFound, reviews, faq, mapImage, content }: Slots) {
  const params = useSearchParams();
  const pathname = usePathname();
  const selection = useMemo(() => parseSelection(params), [params]);
  const filters = useMemo(() => parseFilters(params), [params]);
  const badgeQuery = new URLSearchParams(selection.checkIn && selection.checkOut ? { checkIn: selection.checkIn, checkOut: selection.checkOut } : {}).toString();
  const [badges, setBadges] = useState<{ query: string; items: Array<Pick<Stay, 'id' | 'availabilityStatus' | 'availabilityAsOf'>> }>({ query: badgeQuery, items: stays });
  useEffect(() => {
    const abort = new AbortController();
    const refresh = () => { void apiRequest<{ items: Array<Pick<Stay, 'id' | 'availabilityStatus' | 'availabilityAsOf'>> }>(`/public/stay-availability?${badgeQuery}`, { cache: 'no-store', signal: abort.signal }).then((result) => { if (!abort.signal.aborted) setBadges({ query: badgeQuery, items: result.items }); }).catch(() => { if (!abort.signal.aborted) setBadges({ query: badgeQuery, items: [] }); }); };
    refresh(); window.addEventListener('focus', refresh);
    return () => { abort.abort(); window.removeEventListener('focus', refresh); };
  }, [badgeQuery]);
  const badgeMap = new Map(badges.query === badgeQuery ? badges.items.map((item) => [item.id, item]) : []);
  const dataset = stays.map((stay) => ({ ...stay, availabilityStatus: badgeMap.get(stay.id)?.availabilityStatus ?? 'unknown', availabilityAsOf: badgeMap.get(stay.id)?.availabilityAsOf ?? null } as Stay));
  const hasCatalog = dataset.length > 0;
  const hasAdvisor = !!publicText(content.advisorTitle);
  const guests = selection.adults + selection.children;
  const results = useMemo(() => applyFilters(dataset, filters, guests), [dataset, filters, guests]);
  const counts = useMemo(() => facetCounts(dataset, filters, guests), [dataset, filters, guests]);
  const pages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const page = Math.min(filters.page, pages);
  const pageItems = results.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const hasMap = !!mapImage?.src && pageItems.some((stay) => !!stay.mapPin);
  const query = selectionQuery(selection);

  const [drawer, setDrawer] = useState(false);
  const [draft, setDraft] = useState<StayFilters>(filters);
  const drawerTitle = useId();

  const navigate = (sel: Selection, f: StayFilters) => {
    const base = new URLSearchParams(params);
    const next = writeFilters(f, writeSelection(sel, base));
    window.history.pushState(null, '', `${pathname}?${next.toString()}`);
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
  if (!results.length) {
    const emptyTitle = hasCatalog ? 'Không tìm thấy nơi lưu trú phù hợp' : publicText(content.emptyResultTitle) || 'Chưa có nơi lưu trú được công bố';
    const emptyCta = publicText(content.emptyResultCtaLabel);
    const emptyDescription = hasCatalog ? null : content.emptyResultDescription;
    body = (
      <div className={`state-box stays-empty-state${hasCatalog ? '' : ' stays-empty-state--catalog'}`} role="status">
        {!hasCatalog && <span className="stays-empty-state__icon" aria-hidden="true"><BedDouble size={27} strokeWidth={1.6} /></span>}
        <h2 id={hasCatalog ? undefined : 'stays-count'}>{emptyTitle}</h2>
        {richDocumentHasContent(emptyDescription) && <div><RichContentRenderer document={emptyDescription as RichDocument} /></div>}
        <div className="state-box__actions">
          {hasCatalog && activeFilterCount(filters) > 0 && <button type="button" className="btn btn--light" onClick={reset}><RotateCcw size={15} aria-hidden="true" /> Đặt lại bộ lọc</button>}
          {emptyCta && <a className="btn btn--primary" href={`/lien-he?intent=stay&${query}`}>{emptyCta}</a>}
        </div>
      </div>
    );
  }
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
      {hasCatalog && <div className="stays-search content-shell">
        <StaySearchBar
          selection={selection}
          filters={filters}
          onSearch={(sel) => navigate(sel, { ...filters, page: 1 })}
          onFilters={patchFilters}
        />
      </div>}

      <div className={`stays-layout content-shell${hasCatalog ? '' : ` stays-layout--empty${hasAdvisor ? '' : ' stays-layout--empty-single'}`}`}>
        {hasCatalog && <aside className="stays-side stays-side--left" aria-label="Bộ lọc tìm kiếm">
          <div className="side-card filters-card">{filterPanel}</div>
        </aside>}

        <section className="stays-main" aria-labelledby="stays-count">
          {hasCatalog && <div className="stays-toolbar">
            <p className="stays-toolbar__count" id="stays-count" aria-live="polite">
              {`Có ${results.length} kết quả phù hợp`}
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
              {results.length > 0 && <label className="tool-btn tool-btn--select">
                <span className="sr-only">Sắp xếp</span>
                <select value={filters.sort} onChange={(e) => patchFilters({ sort: e.target.value as StayFilters['sort'] })}>
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>}
              {hasMap && <a className="tool-btn" href="#ban-do">
                <MapIcon size={16} aria-hidden="true" /> Bản đồ
              </a>}
            </div>
            {results.length > 0 && <div className="view-toggle" role="group" aria-label="Kiểu hiển thị">
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
            </div>}
          </div>}
          {hasCatalog && chips.length > 0 && (
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
          {hasCatalog && selection.checkIn && (
            <p className="stays-note">
              <Info size={14} aria-hidden="true" /> Đây là gợi ý theo nhu cầu; tình trạng phòng sẽ được xác nhận khi tư
              vấn.
            </p>
          )}
          {body}
          {pages > 1 && <div className="stays-main__pager">
            <Pagination page={page} pages={pages} onChange={(p) => patchFilters({ page: p })} />
          </div>}
        </section>

        {(hasCatalog || hasAdvisor) && <aside className="stays-side stays-side--right" id={hasMap ? 'ban-do' : undefined} aria-label={hasMap ? 'Bản đồ và tư vấn' : 'Tư vấn'}>
          {hasMap && <StayMapCard stays={pageItems} query={query} image={mapImage} />}
          {advisor}
        </aside>}
      </div>

      <div className="stays-bottom content-shell">
        <div className="stays-bottom__left">{notFound}</div>
        <div className="stays-bottom__mid">
          {reviews}
          {pages > 1 && <div className="stays-bottom__pager">
            <Pagination page={page} pages={pages} onChange={(p) => patchFilters({ page: p })} />
          </div>}
        </div>
        <div className="stays-bottom__right">{faq}</div>
      </div>

      {hasCatalog && <Modal open={drawer} onClose={() => setDrawer(false)} labelledBy={drawerTitle} className="dialog--drawer">
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
      </Modal>}
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

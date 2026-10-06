'use client';

import {
  ArrowRight,
  Binoculars,
  CalendarDays,
  ChevronDown,
  Church,
  Flame,
  Heart,
  House,
  Info,
  Landmark,
  Leaf,
  Map as MapIcon,
  Minus,
  Mountain,
  PawPrint,
  Plus,
  Sailboat,
  Users,
  UsersRound,
} from 'lucide-react';
import Image from '@/components/ui/ManagedImage';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useId, useMemo, useRef, useState } from 'react';
import { DateRangePicker } from '@/components/ui/DateRangePicker';
import { FavoriteButton } from '@/components/ui/FavoriteButton';
import { Modal } from '@/components/ui/Modal';
import { RichContentRenderer } from '@/components/content/RichContentRenderer';
import { Popover } from '@/components/ui/Popover';
import {
  COMBO_CATEGORIES,
} from '@/lib/catalog/constants';
import type { Combo, ComboCategory, ComboLine, ComboSort } from '@/data/combos';
import { formatShort } from '@/lib/dates';
import { setPendingNote } from '@/lib/draft-store';
import { formatVnd } from '@/lib/format';
import { compareComboPrices } from '@/lib/catalog/combo-pricing';
import { readParam } from '@/lib/selection';
import type { PublicRecord } from '@/lib/public-content';
import { publicText, richDocumentHasContent } from '@/lib/public-content';
import type { RichDocument } from '@/lib/content/rich-document';

const LINE_ICON: Record<ComboLine['icon'], typeof Leaf> = {
  leaf: Leaf,
  binoculars: Binoculars,
  food: MapIcon,
  pagoda: Landmark,
  boat: Sailboat,
  tent: House,
  paw: PawPrint,
  bbq: Flame,
  culture: Church,
  family: Users,
  child: UsersRound,
  home: MapIcon,
  team: Leaf,
  mountain: Mountain,
  route: MapIcon,
};

function ChipIcon({ icon }: { icon: string }) {
  const p = { size: 20, 'aria-hidden': true as const };
  if (icon === 'family') return <Users {...p} fill="currentColor" strokeWidth={1.2} />;
  if (icon === 'heart') return <Heart {...p} fill="currentColor" strokeWidth={0} />;
  if (icon === 'team') return <UsersRound {...p} fill="currentColor" strokeWidth={1.2} />;
  if (icon === 'leaf') return <Leaf {...p} fill="currentColor" strokeWidth={1.2} />;
  return <CalendarDays {...p} strokeWidth={1.8} />;
}

const SORTS: { id: ComboSort; label: string }[] = [
  { id: 'popular', label: 'Phổ biến nhất' },
  { id: 'price-asc', label: 'Giá tăng dần' },
  { id: 'price-desc', label: 'Giá giảm dần' },
];

const comboMatches = (combo: Combo, category: ComboCategory) =>
  category === 'all' || (category === '2n1d' ? combo.durationDays === 2 && combo.durationNights === 1 : category === '3n2d' ? combo.durationDays === 3 && combo.durationNights === 2 : combo.audienceTags.includes(category));

const sortCombos = (list: Combo[], sort: ComboSort) => [...list].sort((a, b) => sort === 'price-asc' ? compareComboPrices(a.fromPriceVnd, b.fromPriceVnd) : sort === 'price-desc' ? compareComboPrices(a.fromPriceVnd, b.fromPriceVnd, true) : b.popularity - a.popularity);

export function ComboExplorer({ combos, config }: { combos: Combo[]; config: PublicRecord }) {
  const listTitle = publicText(config.listTitle);
  const hasCatalog = combos.length > 0;
  const emptyCtaLabel = publicText(config.emptyCtaLabel);
  const advisorCtaLabel = publicText(config.advisorCtaLabel);
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const catRaw = readParam(params, 'loai');
  const category: ComboCategory = COMBO_CATEGORIES.some((c) => c.id === catRaw) ? (catRaw as ComboCategory) : 'all';
  const sortRaw = readParam(params, 'sort');
  const sort: ComboSort = SORTS.some((s) => s.id === sortRaw) ? (sortRaw as ComboSort) : 'popular';
  const openId = readParam(params, 'combo');
  const open = openId ? (combos.find((combo) => combo.id === openId || combo.slug === openId) ?? null) : null;
  const pushed = useRef(false);

  const list = useMemo(() => sortCombos(combos.filter((c) => comboMatches(c, category)), sort), [category, combos, sort]);

  const setQuery = (patch: Record<string, string | null>, mode: 'push' | 'replace' = 'push') => {
    const p = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v === null) p.delete(k);
      else p.set(k, v);
    }
    const url = p.toString() ? `${pathname}?${p}` : pathname;
    // Shallow update: Next.js keeps useSearchParams in sync without a server round-trip.
    if (mode === 'push') window.history.pushState(null, '', url);
    else window.history.replaceState(null, '', url);
  };

  const openCombo = (id: string) => {
    pushed.current = true;
    setQuery({ combo: id });
  };
  const closeCombo = () => {
    if (!open) return;
    if (pushed.current) {
      pushed.current = false;
      router.back();
    } else setQuery({ combo: null }, 'replace');
  };

  let body;
  if (!list.length) {
    const emptyTitle = hasCatalog ? 'Không có combo phù hợp với bộ lọc' : publicText(config.emptyTitle) || 'Chưa có combo được công bố';
    body = (
      <div className="state-box catalog-empty-state" role="status">
        {!hasCatalog && <span className="catalog-empty-state__icon" aria-hidden="true"><CalendarDays size={27} strokeWidth={1.6} /></span>}
        <h3>{emptyTitle}</h3>
        {!hasCatalog && richDocumentHasContent(config.emptyDescription) && <div><RichContentRenderer document={config.emptyDescription as RichDocument} /></div>}
        <div className="state-box__actions">
          {category !== 'all' && <button type="button" className="btn btn--light" onClick={() => setQuery({ loai: null })}>Xem tất cả combo</button>}
          {emptyCtaLabel && <Link className="btn btn--primary" href="/lien-he?intent=combo">{emptyCtaLabel}</Link>}
        </div>
      </div>
    );
  }
  else
    body = (
      <ul className="combo-grid">
        {list.map((c, i) => (
          <li key={c.id} className="ccard" data-reveal="card" data-tilt style={{ '--d': `${i * 70}ms` } as React.CSSProperties}>
            <div className="ccard__media">
              <Image src={c.image.src} alt={c.image.alt} fill sizes="(max-width: 767px) 92vw, (max-width: 1279px) 30vw, 220px" className="ccard__img" />
              <span className="ccard__badge">
                <ChipIcon icon={c.badge.icon} />
                {c.badge.label}
              </span>
              <FavoriteButton ns="combo" id={c.id} name={c.title} className="fav ccard__fav" />
            </div>
            <div className="ccard__body">
              <h3 className="ccard__title">{c.title}</h3>
              <p className="ccard__sub">{c.subtitle}</p>
              <ul className="ccard__lines">
                {c.includedHighlights.map((l) => {
                  const Icon = LINE_ICON[l.icon];
                  return (
                    <li key={l.text}>
                      <Icon size={15} aria-hidden="true" fill={l.icon === 'leaf' ? 'currentColor' : 'none'} />
                      {l.text}
                    </li>
                  );
                })}
              </ul>
              <p className="ccard__price">{c.fromPriceVnd !== null && c.fromPriceVnd > 0
                ? <>Từ <strong>{formatVnd(c.fromPriceVnd)}</strong> <span>/ {c.priceUnit}</span></>
                : <strong>Liên hệ để nhận giá</strong>}</p>
              <button type="button" className="btn btn--primary ccard__cta btn-arrow" aria-haspopup="dialog" onClick={() => openCombo(c.id)}>
                Xem chi tiết <ArrowRight size={14} strokeWidth={2.3} aria-hidden="true" />
                <span className="sr-only"> {c.title}</span>
              </button>
            </div>
          </li>
        ))}
      </ul>
    );

  return (
    <>
      <div className={`combo-filters${hasCatalog ? '' : ' combo-filters--empty'}`}>
        <div className="combo-filters__inner content-shell">
          {hasCatalog && <div className="combo-chips" role="group" aria-label="Lọc combo theo loại">
            {COMBO_CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                className="combo-chip"
                aria-pressed={category === c.id}
                onClick={() => setQuery({ loai: c.id === 'all' ? null : c.id })}
              >
                <ChipIcon icon={c.icon} />
                {c.label}
              </button>
            ))}
          </div>}
        </div>
      </div>

      <section className={`combo-list content-shell${hasCatalog ? '' : ' combo-list--empty'}`} aria-labelledby={listTitle ? 'combo-title' : undefined}>
        <div className="combo-list__head">
          {listTitle && <h2 className="section-title" id="combo-title">{listTitle}</h2>}
          {richDocumentHasContent(config.listSubtitle) && <div className="combo-list__sub"><RichContentRenderer document={config.listSubtitle as RichDocument} /></div>}
          {list.length > 1 && <label className="combo-sort">
            <span>Sắp xếp theo</span>
            <span className="combo-sort__select">
              <select value={sort} onChange={(e) => setQuery({ sort: e.target.value === 'popular' ? null : e.target.value })}>
                {SORTS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
              <ChevronDown size={16} aria-hidden="true" />
            </span>
          </label>}
        </div>
        <p className="sr-only" aria-live="polite">
          {list.length} combo phù hợp
        </p>
        {body}
      </section>

      <ComboDetailDialog combo={open} onClose={closeCombo} advisorCtaLabel={advisorCtaLabel} />
    </>
  );
}

function ComboDetailDialog({ combo, onClose, advisorCtaLabel }: { combo: Combo | null; onClose: () => void; advisorCtaLabel: string }) {
  const id = useId();
  return (
    <Modal open={!!combo} onClose={onClose} labelledBy={id} size="lg" className="dialog--combo">
      {combo && <ComboDetail key={combo.id} combo={combo} titleId={id} advisorCtaLabel={advisorCtaLabel} />}
    </Modal>
  );
}

function ComboDetail({ combo, titleId, advisorCtaLabel }: { combo: Combo; titleId: string; advisorCtaLabel: string }) {
  const router = useRouter();
  const [date, setDate] = useState<string | null>(null);
  const [guests, setGuests] = useState(2);
  const [note, setNote] = useState('');
  const [openDay, setOpenDay] = useState(0);
  const [pick, setPick] = useState(false);
  const dateRef = useRef<HTMLButtonElement>(null);
  return (
    <>
      <div className="dialog__media">
        <Image src={combo.image.src} alt={combo.image.alt} fill sizes="(max-width: 820px) 100vw, 820px" />
      </div>
      <p className="combo-d__badge">
        {combo.durationDays} ngày {combo.durationNights} đêm · {combo.badge.label}
      </p>
      <h2 id={titleId} className="dialog__title">
        {combo.title}
      </h2>
      <p className="dialog__lead">{combo.subtitle}</p>
      <p className="dialog__price">{combo.fromPriceVnd !== null && combo.fromPriceVnd > 0
        ? <>Từ <strong>{formatVnd(combo.fromPriceVnd)}</strong> / {combo.priceUnit} (giá tham khảo)</>
        : <strong>Liên hệ để nhận giá</strong>}</p>

      {combo.body ? <RichContentRenderer document={combo.body} /> : null}

      <h3 className="combo-d__h">Lịch trình gợi ý</h3>
      <ul className="combo-d__days">
        {combo.itinerary.map((d, i) => (
          <li key={d.day}>
            <button type="button" aria-expanded={openDay === i} onClick={() => setOpenDay(openDay === i ? -1 : i)}>
              {d.day}
              <ChevronDown size={16} aria-hidden="true" />
            </button>
            {openDay === i && (
              <ul className="combo-d__items">
                {d.items.map((it) => (
                  <li key={it}>{it}</li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>

      <div className="combo-d__incl">
        <section>
          <h3 className="combo-d__h">Bao gồm</h3>
          <ul>
            {combo.included.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </section>
        <section>
          <h3 className="combo-d__h">Chưa bao gồm</h3>
          <ul>
            {combo.excluded.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </section>
      </div>
      <div className="combo-d__form">
        <div className="field">
          <span className="field__label" id={`${titleId}-date`}>
            Ngày dự kiến
          </span>
          <button
            ref={dateRef}
            type="button"
            className="field__input combo-d__date"
            aria-labelledby={`${titleId}-date ${titleId}-datev`}
            aria-haspopup="dialog"
            aria-expanded={pick}
            onClick={() => setPick((v) => !v)}
          >
            <CalendarDays size={16} aria-hidden="true" />
            <span id={`${titleId}-datev`}>{date ? formatShort(date) : 'Chọn ngày'}</span>
          </button>
          <Popover id={`${titleId}-cal`} label="Chọn ngày dự kiến" anchorRef={dateRef} open={pick} onClose={() => setPick(false)}>
            <DateRangePicker
              checkIn={date}
              checkOut={null}
              field="in"
              onFieldChange={() => undefined}
              onChange={(d) => {
                setDate(d);
                if (d) setPick(false);
              }}
              onDone={() => setPick(false)}
            />
          </Popover>
        </div>
        <div className="field">
          <span className="field__label" id={`${titleId}-g`}>
            Số khách
          </span>
          <div className="stepper combo-d__stepper" role="group" aria-labelledby={`${titleId}-g`}>
            <button type="button" className="stepper__btn" onClick={() => setGuests((g) => Math.max(1, g - 1))} disabled={guests <= 1} aria-label="Giảm số khách">
              <Minus size={14} aria-hidden="true" />
            </button>
            <output className="stepper__value">{guests}</output>
            <button type="button" className="stepper__btn" onClick={() => setGuests((g) => Math.min(40, g + 1))} disabled={guests >= 40} aria-label="Tăng số khách">
              <Plus size={14} aria-hidden="true" />
            </button>
          </div>
        </div>
        <label className="field combo-d__note">
          <span className="field__label">Ghi chú ngắn (không bắt buộc)</span>
          <textarea
            className="field__input"
            rows={2}
            maxLength={300}
            value={note}
            placeholder="Ví dụ: có 2 bé nhỏ, muốn lịch trình nhẹ nhàng…"
            onChange={(e) => setNote(e.target.value)}
          />
        </label>
      </div>
      <div className="dialog__actions">
        <Link className="btn btn--light" href={combo.publicPath ?? `/combo-du-lich/${combo.slug}`}>
          Xem trang hành trình <ArrowRight size={16} aria-hidden="true" />
        </Link>
        {(advisorCtaLabel || combo.fromPriceVnd === null || combo.fromPriceVnd <= 0) && <button
          type="button"
          className="btn btn--primary"
          data-autofocus
          onClick={() => {
            setPendingNote(note);
            const p = new URLSearchParams({ intent: 'combo', item: combo.slug, adults: String(guests) });
            if (date) p.set('checkIn', date);
            router.push(`/lien-he?${p}`);
          }}
        >
          {advisorCtaLabel || 'Liên hệ'} <ArrowRight size={16} aria-hidden="true" />
        </button>}
        <p className="combo-d__hint">
          <Info size={14} aria-hidden="true" /> Chưa đặt chỗ hay thanh toán — chỉ gửi nhu cầu sang trang tư vấn.
        </p>
      </div>
    </>
  );
}

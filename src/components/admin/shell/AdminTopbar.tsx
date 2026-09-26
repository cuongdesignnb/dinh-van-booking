'use client';

import { Bell, CalendarDays, ChevronDown, Menu, Search } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';
import { Popover } from '@/components/ui/Popover';
import { apiRequest } from '@/lib/api/client';
import { formatDate } from '@/lib/admin/formatters';
import { pendingBookings, searchAll, type SearchHit } from '@/lib/admin/selectors';
import { useAdmin } from '../AdminStore';
import type { AdminPageMeta } from './page-meta';

const dateKey = (date: Date) => date.toISOString().slice(0, 10);
const shiftDate = (date: Date, days: number) => {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return dateKey(next);
};

const HIT_LABEL: Record<SearchHit['kind'], string> = {
  booking: 'Đặt phòng',
  customer: 'Khách hàng',
  property: 'Phòng nghỉ',
  combo: 'Combo',
  destination: 'Điểm đến',
};

export function AdminTopbar({ meta, onMenu }: { meta: AdminPageMeta; onMenu: () => void }) {
  const { data, range, setRange, role, commit, reset, persisted } = useAdmin();
  const router = useRouter();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchBtn = useRef<HTMLButtonElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);
  const userRef = useRef<HTMLButtonElement>(null);
  const rangeRef = useRef<HTMLButtonElement>(null);
  const [bellOpen, setBellOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [rangeOpen, setRangeOpen] = useState(false);
  const listId = useId();
  const today = dateKey(new Date());
  const rangePresets: { id: string; label: string; from: string; to: string }[] = [
    { id: 'month', label: '30 ngày gần nhất', from: shiftDate(new Date(), -29), to: today },
    { id: 'week', label: '7 ngày gần nhất', from: shiftDate(new Date(), -6), to: today },
    { id: 'today', label: 'Hôm nay', from: today, to: today },
  ];

  const hits = searchAll(data, query);
  const unread = data.inquiries.filter((i) => !i.read);
  const pending = pendingBookings(data);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (paletteOpen) requestAnimationFrame(() => inputRef.current?.focus());
  }, [paletteOpen]);

  const closePalette = () => {
    setPaletteOpen(false);
    setQuery('');
    setCursor(0);
    searchBtn.current?.focus();
  };

  const go = (hit: SearchHit) => {
    closePalette();
    router.push(hit.href);
  };

  return (
    <header className="atop">
      <div className="atop__row">
        <button type="button" className="atop__menu icon-btn" onClick={onMenu} aria-label="Mở menu quản trị">
          <Menu size={20} aria-hidden="true" />
        </button>
        <div className="atop__titles">
          <h1 className="atop__title">
            <LeafGlyph />
            {meta.title}
          </h1>
          <p className="atop__subtitle">{meta.subtitle}</p>
        </div>

        <button type="button" className="atop__search" ref={searchBtn} onClick={() => setPaletteOpen(true)}>
          <Search size={17} aria-hidden="true" />
          <span className="atop__search-text">{meta.placeholder}</span>
          <kbd>Ctrl + K</kbd>
        </button>

        <button
          type="button"
          className="atop__bell icon-btn"
          ref={bellRef}
          aria-haspopup="dialog"
          aria-expanded={bellOpen}
          onClick={() => setBellOpen((v) => !v)}
          aria-label={`Thông báo${unread.length ? `, ${unread.length} chưa đọc` : ''}`}
        >
          <Bell size={19} aria-hidden="true" />
          {unread.length > 0 && <span className="atop__dot" />}
        </button>

        <button
          type="button"
          className="atop__user"
          ref={userRef}
          aria-haspopup="menu"
          aria-expanded={userOpen}
          onClick={() => setUserOpen((v) => !v)}
        >
          <Image src="/images/dinh-van-booking/people/admin-avatar.webp" alt="" width={40} height={40} className="atop__avatar" />
          <span className="atop__user-text">
            <strong>Tài khoản quản trị</strong>
            <small>{role === 'viewer' ? 'Chỉ xem' : role === 'editor' ? 'Biên tập viên' : 'Quản trị viên'}</small>
          </span>
          <ChevronDown size={16} aria-hidden="true" />
        </button>
      </div>

      <div className="atop__row atop__row--second">
        <p className="atop__script handwritten">
          {meta.script.split('\n').map((line) => (
            <span key={line}>{line}</span>
          ))}
        </p>
        <button
          type="button"
          className="atop__range"
          ref={rangeRef}
          aria-haspopup="dialog"
          aria-expanded={rangeOpen}
          onClick={() => setRangeOpen((v) => !v)}
        >
          <CalendarDays size={16} aria-hidden="true" />
          <span>
            {formatDate(range.from)} - {formatDate(range.to)}
          </span>
          <ChevronDown size={16} aria-hidden="true" />
        </button>
      </div>

      {paletteOpen && (
        <div className="apalette" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && closePalette()}>
          <div className="apalette__panel" role="dialog" aria-modal="true" aria-label="Tìm kiếm toàn hệ thống">
            <div className="apalette__field">
              <Search size={18} aria-hidden="true" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setCursor(0);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') closePalette();
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setCursor((c) => Math.min(hits.length - 1, c + 1));
                  }
                  if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setCursor((c) => Math.max(0, c - 1));
                  }
                  if (e.key === 'Enter' && hits[cursor]) go(hits[cursor]);
                }}
                placeholder="Nhập mã đơn, tên khách, phòng nghỉ, combo…"
                aria-controls={listId}
                aria-label="Từ khóa tìm kiếm"
              />
              <kbd>Esc</kbd>
            </div>
            <ul className="apalette__list" id={listId}>
              {query.trim().length < 2 && <li className="apalette__hint">Nhập ít nhất 2 ký tự. Hỗ trợ tìm không dấu.</li>}
              {query.trim().length >= 2 && !hits.length && <li className="apalette__hint">Không tìm thấy kết quả phù hợp.</li>}
              {hits.map((hit, i) => (
                <li key={`${hit.kind}-${hit.id}`}>
                  <button type="button" className={`apalette__hit${i === cursor ? ' is-cursor' : ''}`} onClick={() => go(hit)}>
                    <span className="apalette__kind">{HIT_LABEL[hit.kind]}</span>
                    <span className="apalette__title">{hit.title}</span>
                    <span className="apalette__meta">{hit.meta}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <Popover anchorRef={bellRef} open={bellOpen} onClose={() => setBellOpen(false)} label="Thông báo" id="admin-bell" align="end">
        <div className="apop">
          <div className="apop__head">
            <strong>Thông báo</strong>
            <button
              type="button"
              className="apop__link"
              onClick={() =>
                commit('bell', (draft) => {
                  draft.inquiries.forEach((i) => {
                    i.read = true;
                  });
                }, 'Đã đánh dấu tất cả là đã đọc')
              }
            >
              Đánh dấu đã đọc
            </button>
          </div>
          <ul className="apop__list">
            <li>
              <span className="apop__badge">{unread.length}</span> yêu cầu tư vấn chưa đọc
            </li>
            <li>
              <span className="apop__badge apop__badge--warn">{pending.length}</span> đơn đặt phòng chờ xác nhận
            </li>
            <li>
              <span className="apop__badge apop__badge--info">{data.followUps.filter((f) => !f.done).length}</span> hẹn chăm sóc
              khách chưa hoàn tất
            </li>
          </ul>
          <p className="apop__note">Thông báo chỉ hiển thị các bản ghi đã được API quản trị trả về.</p>
        </div>
      </Popover>

      <Popover anchorRef={userRef} open={userOpen} onClose={() => setUserOpen(false)} label="Tài khoản" id="admin-user" align="end">
        <div className="apop">
          <div className="apop__head">
            <strong>Tài khoản quản trị</strong>
            <span className="apop__muted">Phiên đăng nhập được API xác thực</span>
          </div>
          <p className="apop__note">Vai trò và quyền thao tác được kiểm tra ở backend cho từng endpoint.</p>
          <button type="button" className="abtn abtn--ghost apop__reset" onClick={reset}>
            Làm mới dữ liệu từ API
          </button>
          {persisted && <p className="apop__note">Không lưu dữ liệu quản trị trong trình duyệt.</p>}
          <button
            type="button"
            className="abtn abtn--ghost apop__reset"
            onClick={async () => {
              await apiRequest('/auth/logout', { method: 'POST' });
              window.location.reload();
            }}
          >
            Đăng xuất
          </button>
        </div>
      </Popover>

      <Popover anchorRef={rangeRef} open={rangeOpen} onClose={() => setRangeOpen(false)} label="Khoảng thời gian" id="admin-range" align="end">
        <div className="apop">
          <div className="apop__head">
            <strong>Khoảng thời gian báo cáo</strong>
          </div>
          <ul className="apop__ranges">
            {rangePresets.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  className={`apop__range${range.from === p.from && range.to === p.to ? ' is-active' : ''}`}
                  onClick={() => {
                    setRange({ from: p.from, to: p.to });
                    setRangeOpen(false);
                    rangeRef.current?.focus();
                  }}
                >
                  {p.label}
                </button>
              </li>
            ))}
          </ul>
          <p className="apop__note">Khoảng thời gian chỉ lọc dữ liệu đã được API trả về.</p>
        </div>
      </Popover>
    </header>
  );
}

function LeafGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" className="atop__leaf">
      <path d="M21 3c-8 0-14 3.6-14 10a7 7 0 0 0 2 5l-3 3 1.4 1.4 3-3a7 7 0 0 0 5 2c6.4 0 10-6 10-14 0-2 0-4-.4-4z" fill="#7ba05b" opacity=".85" />
      <path d="M19 6C13 9 9.5 13 7.5 19" stroke="#2e6d3b" strokeWidth="1.3" fill="none" />
    </svg>
  );
}

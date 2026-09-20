'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useId, useState } from 'react';
import { addDays, eachDay, fromKey, toKey } from '@/data/admin/fixture-clock';
import { formatDate, formatDayMonth, num, vnd } from '@/lib/admin/formatters';

export interface DayPoint {
  date: string;
  revenue: number;
  /** Value of stays that end that day but have not completed yet. */
  expected: number;
  bookings: number;
}

/**
 * Revenue (bars, million VND) and bookings (line) on two axes.
 * Every point is reachable with the keyboard and the same numbers are offered
 * as a table for screen readers.
 */
export function RevenueChart({ points, height = 168 }: { points: DayPoint[]; height?: number }) {
  const [active, setActive] = useState<number | null>(null);
  const [show, setShow] = useState({ revenue: true, expected: true, bookings: true });
  const tableId = useId();
  const w = 520;
  const padL = 30;
  const padR = 26;
  const padB = 22;
  const padT = 8;
  const maxRev = Math.max(10_000_000, ...points.map((p) => Math.max(p.revenue, p.expected)));
  const maxBook = Math.max(5, ...points.map((p) => p.bookings));
  const revTicks = 4;
  const stepRev = Math.ceil(maxRev / 1_000_000 / revTicks / 5) * 5;
  const topRev = stepRev * revTicks * 1_000_000;
  const topBook = Math.ceil(maxBook / 5) * 5;
  const innerW = w - padL - padR;
  const innerH = height - padT - padB;
  const bw = Math.max(4, innerW / points.length - 4);
  const x = (i: number) => padL + (innerW / points.length) * (i + 0.5);
  const yRev = (v: number) => padT + innerH - (v / topRev) * innerH;
  const yBook = (v: number) => padT + innerH - (v / topBook) * innerH;
  const linePath = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${yBook(p.bookings).toFixed(1)}`).join(' ');

  return (
    <div className="chart">
      <div className="chart__legend">
        <button type="button" aria-pressed={show.revenue} onClick={() => setShow((s) => ({ ...s, revenue: !s.revenue }))}>
          <span className="chart__swatch chart__swatch--bar" aria-hidden="true" /> Doanh thu (triệu đồng)
        </button>
        <button type="button" aria-pressed={show.expected} onClick={() => setShow((s) => ({ ...s, expected: !s.expected }))}>
          <span className="chart__swatch chart__swatch--expected" aria-hidden="true" /> Dự kiến (chưa hoàn tất)
        </button>
        <button type="button" aria-pressed={show.bookings} onClick={() => setShow((s) => ({ ...s, bookings: !s.bookings }))}>
          <span className="chart__swatch chart__swatch--line" aria-hidden="true" /> Số đơn đặt phòng
        </button>
      </div>
      <div className="chart__plot">
        <svg viewBox={`0 0 ${w} ${height}`} role="img" aria-describedby={tableId} className="chart__svg">
          <title>Doanh thu và số đơn đặt phòng theo ngày</title>
          {Array.from({ length: revTicks + 1 }, (_, i) => {
            const v = (topRev / revTicks) * i;
            const y = yRev(v);
            return (
              <g key={i}>
                <line x1={padL} x2={w - padR} y1={y} y2={y} stroke="#eceee6" strokeWidth="1" />
                <text x={padL - 6} y={y + 3} textAnchor="end" className="chart__tick">
                  {Math.round(v / 1_000_000)}
                </text>
                <text x={w - padR + 6} y={y + 3} className="chart__tick">
                  {Math.round((topBook / revTicks) * i)}
                </text>
              </g>
            );
          })}
          {show.expected &&
            points.map((p, i) => (
              <rect
                key={`e-${p.date}`}
                x={x(i) - bw / 2}
                y={yRev(p.expected)}
                width={bw}
                height={Math.max(0, padT + innerH - yRev(p.expected))}
                rx="2"
                className="chart__bar chart__bar--expected"
              />
            ))}
          {show.revenue &&
            points.map((p, i) => (
              <rect
                key={p.date}
                x={x(i) - bw / 2}
                y={yRev(p.revenue)}
                width={bw}
                height={Math.max(0, padT + innerH - yRev(p.revenue))}
                rx="2"
                className={`chart__bar${active === i ? ' is-active' : ''}`}
              />
            ))}
          {show.bookings && <path d={linePath} className="chart__line" fill="none" />}
          {show.bookings &&
            points.map((p, i) => <circle key={p.date} cx={x(i)} cy={yBook(p.bookings)} r={active === i ? 3.6 : 2.4} className="chart__dot" />)}
          {points.map((p, i) =>
            i % 5 === 0 || i === points.length - 1 ? (
              <text key={`t-${p.date}`} x={x(i)} y={height - 6} textAnchor="middle" className="chart__tick">
                {formatDayMonth(p.date)}
              </text>
            ) : null,
          )}
          {points.map((p, i) => (
            <rect
              key={`hit-${p.date}`}
              x={x(i) - innerW / points.length / 2}
              y={padT}
              width={innerW / points.length}
              height={innerH}
              fill="transparent"
              tabIndex={0}
              role="button"
              aria-label={`Ngày ${formatDate(p.date)}: doanh thu ${vnd(p.revenue)}, dự kiến ${vnd(p.expected)}, ${p.bookings} đơn`}
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive((cur) => (cur === i ? null : cur))}
              onFocus={() => setActive(i)}
              onBlur={() => setActive((cur) => (cur === i ? null : cur))}
            />
          ))}
        </svg>
        {active !== null && points[active] && (
          <div
            className="chart__tip"
            style={{ left: `${(x(active) / w) * 100}%`, top: `${(yRev(points[active].revenue) / height) * 100}%` }}
          >
            <strong>Ngày {formatDate(points[active].date)}</strong>
            <span>
              <i className="chart__swatch chart__swatch--bar" /> Doanh thu: {(points[active].revenue / 1_000_000).toFixed(1)} triệu
            </span>
            {points[active].expected > 0 && (
              <span>
                <i className="chart__swatch chart__swatch--expected" /> Dự kiến: {(points[active].expected / 1_000_000).toFixed(1)} triệu
              </span>
            )}
            <span>
              <i className="chart__swatch chart__swatch--bar" /> Đặt phòng: {points[active].bookings} đơn
            </span>
          </div>
        )}
      </div>
      <table className="sr-only" id={tableId}>
        <caption>Doanh thu và số đơn theo ngày</caption>
        <thead>
          <tr>
            <th scope="col">Ngày</th>
            <th scope="col">Doanh thu</th>
            <th scope="col">Dự kiến</th>
            <th scope="col">Số đơn</th>
          </tr>
        </thead>
        <tbody>
          {points.map((p) => (
            <tr key={p.date}>
              <th scope="row">{formatDate(p.date)}</th>
              <td>{vnd(p.revenue)}</td>
              <td>{vnd(p.expected)}</td>
              <td>{p.bookings}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export interface DonutSlice {
  id: string;
  label: string;
  value: number;
  color: string;
}

export function Donut({ slices, center, caption }: { slices: DonutSlice[]; center: string; caption: string }) {
  const total = slices.reduce((s, x) => s + x.value, 0) || 1;
  const r = 42;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="donut">
      <svg viewBox="0 0 110 110" className="donut__svg" role="img" aria-label={caption}>
        <circle cx="55" cy="55" r={r} className="donut__track" />
        {slices.map((s) => {
          const len = (s.value / total) * c;
          const el = (
            <circle
              key={s.id}
              cx="55"
              cy="55"
              r={r}
              className="donut__slice"
              stroke={s.color}
              strokeDasharray={`${len} ${c - len}`}
              strokeDashoffset={-offset}
            />
          );
          offset += len;
          return el;
        })}
        <text x="55" y="53" textAnchor="middle" className="donut__value">
          {center}
        </text>
        <text x="55" y="66" textAnchor="middle" className="donut__caption">
          Đã đặt
        </text>
      </svg>
      <ul className="donut__legend">
        {slices.map((s) => (
          <li key={s.id}>
            <span className="donut__dot" style={{ background: s.color }} aria-hidden="true" />
            <span className="donut__label">{s.label}</span>
            <span className="donut__count numeric">{num(s.value)} phòng</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Month grid starting on Monday. Dots mark days with activity. */
export function MiniCalendar({
  month,
  selected,
  today,
  marks,
  onSelect,
  onMonth,
  levels,
}: {
  month: string;
  selected: string | null;
  today: string;
  marks: Record<string, number>;
  onSelect: (day: string) => void;
  onMonth: (month: string) => void;
  /** Optional occupancy level per day: 0 free, 1 filling up, 2 full. */
  levels?: Record<string, 0 | 1 | 2>;
}) {
  const first = fromKey(`${month}-01`);
  const start = new Date(first);
  const shift = (first.getDay() + 6) % 7;
  start.setDate(first.getDate() - shift);
  const days = eachDay(toKey(start), addDays(toKey(start), 42));
  const monthLabel = `Tháng ${month.slice(5)}/${month.slice(0, 4)}`;
  const shiftMonth = (delta: number) => {
    const d = fromKey(`${month}-01`);
    d.setMonth(d.getMonth() + delta);
    onMonth(toKey(d).slice(0, 7));
  };
  return (
    <div className="cal">
      <div className="cal__head">
        <button type="button" onClick={() => shiftMonth(-1)} aria-label="Tháng trước">
          <ChevronLeft size={14} aria-hidden="true" />
        </button>
        <strong>{monthLabel}</strong>
        <button type="button" onClick={() => shiftMonth(1)} aria-label="Tháng sau">
          <ChevronRight size={14} aria-hidden="true" />
        </button>
      </div>
      <div className="cal__grid" role="grid" aria-label={monthLabel}>
        {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((d) => (
          <span key={d} className="cal__dow" role="columnheader">
            {d}
          </span>
        ))}
        {days.map((d) => {
          const outside = d.slice(0, 7) !== month;
          const level = levels?.[d];
          return (
            <button
              key={d}
              type="button"
              role="gridcell"
              className={`cal__day${outside ? ' is-outside' : ''}${d === selected ? ' is-selected' : ''}${d === today ? ' is-today' : ''}${
                level !== undefined ? ` cal__day--l${level}` : ''
              }`}
              onClick={() => onSelect(d)}
              aria-current={d === today ? 'date' : undefined}
              aria-label={`${formatDate(d)}${marks[d] ? `, ${marks[d]} hoạt động` : ''}`}
            >
              {Number(d.slice(8))}
              {marks[d] ? <span className="cal__dot" aria-hidden="true" /> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

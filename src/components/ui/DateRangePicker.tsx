'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { addDays, formatLong, fromKey, MONTHS_VI, startOfToday, toKey, WEEKDAYS_VI } from '@/lib/dates';

interface Props {
  checkIn: string | null;
  checkOut: string | null;
  field: 'in' | 'out';
  onFieldChange: (field: 'in' | 'out') => void;
  onChange: (checkIn: string | null, checkOut: string | null) => void;
  onDone: () => void;
}

/** Month grid with roving focus: arrows, Home/End, PageUp/PageDown, Enter. */
export function DateRangePicker({ checkIn, checkOut, field, onFieldChange, onChange, onDone }: Props) {
  const today = useMemo(() => startOfToday(), []);
  const initial = field === 'out' && checkOut ? fromKey(checkOut) : checkIn ? fromKey(checkIn) : today;
  const [month, setMonth] = useState(() => new Date(initial.getFullYear(), initial.getMonth(), 1));
  const [focusKey, setFocusKey] = useState(() => toKey(initial < today ? today : initial));
  const [error, setError] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const shouldFocus = useRef(true);

  useEffect(() => {
    if (!shouldFocus.current) return;
    const btn = gridRef.current?.querySelector<HTMLButtonElement>(`[data-key="${focusKey}"]`);
    btn?.focus();
  }, [focusKey, month]);

  const days = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const offset = (first.getDay() + 6) % 7; // Monday first
    const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    return [
      ...Array.from({ length: offset }, () => null),
      ...Array.from({ length: count }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1)),
    ];
  }, [month]);

  const moveFocus = (next: Date) => {
    const clamped = next < today ? today : next;
    shouldFocus.current = true;
    setFocusKey(toKey(clamped));
    if (clamped.getMonth() !== month.getMonth() || clamped.getFullYear() !== month.getFullYear()) {
      setMonth(new Date(clamped.getFullYear(), clamped.getMonth(), 1));
    }
  };

  const onGridKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const cur = fromKey(focusKey);
    const map: Record<string, () => Date> = {
      ArrowLeft: () => addDays(cur, -1),
      ArrowRight: () => addDays(cur, 1),
      ArrowUp: () => addDays(cur, -7),
      ArrowDown: () => addDays(cur, 7),
      Home: () => addDays(cur, -((cur.getDay() + 6) % 7)),
      End: () => addDays(cur, 6 - ((cur.getDay() + 6) % 7)),
      PageUp: () => new Date(cur.getFullYear(), cur.getMonth() - 1, cur.getDate()),
      PageDown: () => new Date(cur.getFullYear(), cur.getMonth() + 1, cur.getDate()),
    };
    if (map[e.key]) {
      e.preventDefault();
      moveFocus(map[e.key]());
    }
  };

  const select = (d: Date) => {
    const key = toKey(d);
    setError(null);
    if (field === 'in' || !checkIn) {
      const keepOut = checkOut && checkOut > key ? checkOut : null;
      onChange(key, keepOut);
      onFieldChange('out');
      return;
    }
    if (key <= checkIn) {
      setError('Ngày trả phòng phải sau ngày nhận phòng. Vui lòng chọn lại.');
      return;
    }
    onChange(checkIn, key);
    onDone();
  };

  const shiftMonth = (delta: number) => {
    shouldFocus.current = false;
    const next = new Date(month.getFullYear(), month.getMonth() + delta, 1);
    if (next < new Date(today.getFullYear(), today.getMonth(), 1)) return;
    setMonth(next);
  };

  const canPrev = month > new Date(today.getFullYear(), today.getMonth(), 1);

  return (
    <div className="calendar">
      <p className="calendar__hint">
        {field === 'in' ? 'Chọn ngày nhận phòng' : 'Chọn ngày trả phòng'}
      </p>
      <div className="calendar__head">
        <button
          type="button"
          className="icon-btn icon-btn--sm"
          onClick={() => shiftMonth(-1)}
          disabled={!canPrev}
          aria-label="Tháng trước"
        >
          <ChevronLeft size={16} aria-hidden="true" />
        </button>
        <p className="calendar__title" aria-live="polite">
          {MONTHS_VI[month.getMonth()]} {month.getFullYear()}
        </p>
        <button type="button" className="icon-btn icon-btn--sm" onClick={() => shiftMonth(1)} aria-label="Tháng sau">
          <ChevronRight size={16} aria-hidden="true" />
        </button>
      </div>
      <div className="calendar__weekdays" aria-hidden="true">
        {WEEKDAYS_VI.map((w) => (
          <span key={w}>{w}</span>
        ))}
      </div>
      <div className="calendar__grid" ref={gridRef} onKeyDown={onGridKey} role="group" aria-label="Lịch chọn ngày">
        {days.map((d, i) => {
          if (!d) return <span key={`e${i}`} />;
          const key = toKey(d);
          const disabled = d < today;
          const isStart = key === checkIn;
          const isEnd = key === checkOut;
          const inRange = !!checkIn && !!checkOut && key > checkIn && key < checkOut;
          return (
            <button
              key={key}
              type="button"
              data-key={key}
              className="calendar__day"
              data-start={isStart || undefined}
              data-end={isEnd || undefined}
              data-range={inRange || undefined}
              data-today={key === toKey(today) || undefined}
              disabled={disabled}
              tabIndex={key === focusKey ? 0 : -1}
              aria-pressed={isStart || isEnd}
              aria-label={formatLong(key)}
              onClick={() => select(d)}
              onFocus={() => setFocusKey(key)}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
      {error && (
        <p className="calendar__error" role="alert">
          {error}
        </p>
      )}
      <div className="calendar__foot">
        <button
          type="button"
          className="text-btn"
          onClick={() => {
            setError(null);
            onChange(null, null);
            onFieldChange('in');
          }}
        >
          Xóa ngày
        </button>
        <button type="button" className="text-btn text-btn--strong" onClick={onDone}>
          Xong
        </button>
      </div>
    </div>
  );
}

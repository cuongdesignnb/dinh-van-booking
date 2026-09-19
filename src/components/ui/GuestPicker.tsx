'use client';

import { Minus, Plus } from 'lucide-react';

export const GUEST_LIMITS = { adults: { min: 1, max: 10 }, children: { min: 0, max: 6 }, rooms: { min: 1, max: 5 }, total: 12 };

interface Props {
  adults: number;
  childCount: number;
  /** When provided, a "Số phòng" stepper is shown. */
  rooms?: number;
  onChange: (adults: number, children: number, rooms?: number) => void;
  onDone?: () => void;
}

export function GuestPicker({ adults, childCount: children, rooms, onChange, onDone }: Props) {
  const total = adults + children;
  const rows = [
    {
      key: 'adults',
      label: 'Người lớn',
      hint: 'Từ 12 tuổi',
      value: adults,
      canDec: adults > GUEST_LIMITS.adults.min,
      canInc: adults < GUEST_LIMITS.adults.max && total < GUEST_LIMITS.total,
      set: (v: number) => onChange(v, children, rooms === undefined ? undefined : Math.min(rooms, v)),
    },
    {
      key: 'children',
      label: 'Trẻ em',
      hint: 'Dưới 12 tuổi',
      value: children,
      canDec: children > GUEST_LIMITS.children.min,
      canInc: children < GUEST_LIMITS.children.max && total < GUEST_LIMITS.total,
      set: (v: number) => onChange(adults, v, rooms),
    },
    ...(rooms === undefined
      ? []
      : [
          {
            key: 'rooms',
            label: 'Số phòng',
            hint: 'Tối thiểu 1 phòng',
            value: rooms,
            canDec: rooms > GUEST_LIMITS.rooms.min,
            canInc: rooms < GUEST_LIMITS.rooms.max && rooms < adults,
            set: (v: number) => onChange(adults, children, v),
          },
        ]),
  ];
  return (
    <div className="guests">
      {rows.map((r) => (
        <div className="guests__row" key={r.key}>
          <div>
            <p className="guests__label" id={`guest-${r.key}`}>
              {r.label}
            </p>
            <p className="guests__hint">{r.hint}</p>
          </div>
          <div className="stepper" role="group" aria-labelledby={`guest-${r.key}`}>
            <button
              type="button"
              className="stepper__btn"
              onClick={() => r.set(r.value - 1)}
              disabled={!r.canDec}
              aria-label={`Giảm ${r.label.toLowerCase()}`}
            >
              <Minus size={14} aria-hidden="true" />
            </button>
            <output className="stepper__value" aria-live="polite">
              {r.value}
            </output>
            <button
              type="button"
              className="stepper__btn"
              onClick={() => r.set(r.value + 1)}
              disabled={!r.canInc}
              aria-label={`Tăng ${r.label.toLowerCase()}`}
            >
              <Plus size={14} aria-hidden="true" />
            </button>
          </div>
        </div>
      ))}
      <p className="guests__note">Tối đa {GUEST_LIMITS.total} khách cho mỗi lần tìm.</p>
      {onDone && (
        <div className="calendar__foot">
          <span />
          <button type="button" className="text-btn text-btn--strong" onClick={onDone}>
            Xong
          </button>
        </div>
      )}
    </div>
  );
}

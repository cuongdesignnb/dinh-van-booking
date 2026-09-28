'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Stay } from '@/data/stays';
import type { RoomType } from '@/data/types';
import { dateError, parseSelection, readParam, writeSelection, type Selection } from '@/lib/selection';

export type BookingIssue =
  | { kind: 'room'; message: string }
  | { kind: 'dates'; field: 'in' | 'out'; message: string }
  | { kind: 'capacity'; message: string };

interface Ctx {
  stay: Stay;
  selection: Selection;
  room: RoomType | null;
  issue: BookingIssue | null;
  setSelection: (s: Selection) => void;
  chooseRoom: (id: string) => void;
  /** Validates, then routes to /dat-phong or reports what is missing. */
  proceed: () => BookingIssue | null;
  clearIssue: () => void;
}

const BookingCtx = createContext<Ctx | null>(null);

export const useBooking = () => {
  const c = useContext(BookingCtx);
  if (!c) throw new Error('useBooking outside provider');
  return c;
};

/** Guests exceeding the chosen room type (capacity × rooms). */
export function capacityIssue(room: RoomType, sel: Selection): string | null {
  const guests = sel.adults + sel.children;
  if (sel.rooms > room.maxRooms) return `Loại phòng này chỉ nhận tối đa ${room.maxRooms} phòng cho mỗi yêu cầu.`;
  if (guests > room.capacity * sel.rooms)
    return `${room.name} nhận tối đa ${room.capacity} khách/phòng. Với ${guests} khách, bạn cần ít nhất ${Math.ceil(
      guests / room.capacity,
    )} phòng hoặc chọn loại phòng rộng hơn.`;
  return null;
}

/**
 * Selection (dates/guests/rooms) and the chosen room type live in the URL, so
 * they survive reload and back/forward and reach /dat-phong. Price never does.
 */
export function BookingProvider({ stay, children }: { stay: Stay; children: ReactNode }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const selection = useMemo(() => parseSelection(params), [params]);
  const roomId = readParam(params, 'room');
  const room = stay.roomTypes.find((r) => r.id === roomId) ?? null;
  const [issue, setIssue] = useState<BookingIssue | null>(null);

  const write = useCallback(
    (sel: Selection, nextRoom: string | null) => {
      const p = writeSelection(sel, new URLSearchParams(params));
      if (nextRoom) p.set('room', nextRoom);
      else p.delete('room');
      window.history.replaceState(null, '', `${pathname}?${p.toString()}`);
    },
    [params, pathname],
  );

  const value: Ctx = {
    stay,
    selection,
    room,
    issue,
    setSelection: (s) => {
      write(s, room?.id ?? null);
      setIssue((i) => (i?.kind === 'dates' || i?.kind === 'capacity' ? null : i));
    },
    chooseRoom: (id) => {
      write(selection, id);
      setIssue((i) => (i?.kind === 'room' || i?.kind === 'capacity' ? null : i));
    },
    clearIssue: () => setIssue(null),
    proceed: () => {
      let next: BookingIssue | null = null;
      if (!room) next = { kind: 'room', message: 'Vui lòng chọn loại phòng trước khi đặt.' };
      else if (room.pricePerNight <= 0) next = { kind: 'room', message: 'Hạng phòng này chỉ nhận yêu cầu liên hệ.' };
      else {
        const d = dateError(selection);
        if (d) next = { kind: 'dates', ...d };
        else {
          const c = capacityIssue(room, selection);
          if (c) next = { kind: 'capacity', message: c };
        }
      }
      setIssue(next);
      if (!next && room) {
        const p = writeSelection(selection);
        p.set('stay', stay.slug);
        p.set('room', room.id);
        router.push(`/dat-phong?${p.toString()}`);
      }
      return next;
    },
  };

  return <BookingCtx.Provider value={value}>{children}</BookingCtx.Provider>;
}

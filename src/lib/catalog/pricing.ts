import type { Stay } from '@/data/stays';
import { compareComboPrices } from './combo-pricing';

/** 0đ is a contact-only sentinel, not a free room or the lowest quoted rate. */
export const fromPrice = (stay: Stay) => {
  const quoted = stay.roomTypes.map((room) => room.pricePerNight).filter((price) => Number.isFinite(price) && price > 0);
  return quoted.length ? Math.min(...quoted) : 0;
};

export const hasContactOnlyRooms = (stay: Stay) => stay.roomTypes.some((room) => room.pricePerNight === 0);

/** Quoted stays sort before contact-only stays in either price direction. */
export const compareStayPrices = (a: Stay, b: Stay, descending = false) =>
  compareComboPrices(fromPrice(a), fromPrice(b), descending);

export const maxCapacity = (stay: Stay) => Math.max(0, ...stay.roomTypes.map((room) => room.capacity));

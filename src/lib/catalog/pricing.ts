import type { Stay } from '@/data/stays';

export const fromPrice = (stay: Stay) => Math.min(...stay.roomTypes.map((room) => room.pricePerNight));

export const maxCapacity = (stay: Stay) => Math.max(0, ...stay.roomTypes.map((room) => room.capacity));

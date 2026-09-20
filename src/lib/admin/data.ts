import {
  buildBookings,
  buildFollowUps,
  buildInquiries,
  buildInteractions,
} from '@/data/admin/booking-fixtures';
import {
  buildArticles,
  buildCombos,
  buildCustomers,
  buildDestinations,
  buildMedia,
  buildOverrides,
  buildProperties,
  buildRoomTypes,
  buildRoomUnits,
  STAFF,
} from '@/data/admin/fixtures';
import type { AdminData, RateSettings } from './types';

const RATES: RateSettings = {
  weekendEnabled: true,
  weekendDays: [5, 6, 0],
  seasonalEnabled: true,
  seasons: [
    { id: 'mua-tet-2025', name: 'Tết Nguyên Đán 2025', from: '2025-01-25', to: '2025-02-02', kind: 'percent', value: 30, priority: 10, enabled: true },
    { id: 'le-30-4', name: 'Lễ 30/4 – 1/5', from: '2025-04-28', to: '2025-05-02', kind: 'percent', value: 20, priority: 8, enabled: true },
    { id: 'mua-buom', name: 'Mùa bướm Cúc Phương', from: '2025-04-15', to: '2025-05-15', kind: 'percent', value: 10, priority: 5, enabled: false },
  ],
};

/** One deterministic snapshot of the whole demo dataset. */
export function buildAdminData(): AdminData {
  const properties = buildProperties();
  const roomTypes = buildRoomTypes();
  const roomUnits = buildRoomUnits(roomTypes);
  const inventoryOverrides = buildOverrides(roomTypes);
  const customers = buildCustomers();
  const combos = buildCombos();
  const destinations = buildDestinations();

  // The maintenance override holds one unit of each affected room type.
  const maintenanceUnitIds = inventoryOverrides
    .map((o) => roomUnits.find((u) => u.roomTypeId === o.roomTypeId)?.id)
    .filter((v, i, arr): v is string => Boolean(v) && arr.indexOf(v) === i);

  const { bookings, payments } = buildBookings({
    properties,
    roomTypes,
    roomUnits,
    customers,
    combos: combos.map((c) => ({ id: c.id, name: c.name, price: c.price, days: c.days, nights: c.nights })),
    maintenanceUnitIds,
  });

  return {
    properties,
    roomTypes,
    roomUnits,
    inventoryOverrides,
    rates: RATES,
    bookings,
    payments,
    customers,
    inquiries: buildInquiries(),
    interactions: buildInteractions(),
    followUps: buildFollowUps(),
    combos,
    destinations,
    articles: buildArticles(),
    media: buildMedia(),
    users: STAFF,
    analytics: { visits: 2456, visitsPrev: 1919, contentViews: 12680, contentViewsPrev: 8930 },
  };
}

export type FreshnessPolicy = { nearTermDays?: number; nearTermFreshHours?: number; fartherFreshDays?: number };
export type AvailabilityStatus = 'available' | 'sold_out' | 'unknown';
type Day = { capacity: number; blockedCount: number; heldCount: number; reservedCount: number; stopSell: boolean; lastConfirmedAt: Date | null };

export function inventoryFresh(row: { lastConfirmedAt?: Date | null } | undefined, date: Date, policy: FreshnessPolicy, now = new Date()): boolean {
  if (!row?.lastConfirmedAt) return false;
  const near = (date.getTime() - now.getTime()) / 86_400_000 <= (policy.nearTermDays ?? 7);
  const hours = near ? policy.nearTermFreshHours ?? 24 : (policy.fartherFreshDays ?? 7) * 24;
  return now.getTime() - row.lastConfirmedAt.getTime() <= hours * 3_600_000;
}

export function roomAvailability(rows: Array<Day | undefined>, dates: Date[], incident: boolean, policy: FreshnessPolicy, now = new Date(), quantity = 1) {
  const known = dates.length > 0 && rows.length === dates.length && !incident && rows.every((row, i) => row && inventoryFresh(row, dates[i], policy, now)
    && [row.capacity, row.blockedCount, row.heldCount, row.reservedCount].every((n) => Number.isInteger(n) && n >= 0)
    && row.capacity >= row.blockedCount + row.heldCount + row.reservedCount);
  const status: AvailabilityStatus = !known ? 'unknown' : rows.every((row) => row && !row.stopSell && row.capacity - row.blockedCount - row.heldCount - row.reservedCount >= quantity) ? 'available' : 'sold_out';
  return { status, asOf: known ? rows.map((row) => row!.lastConfirmedAt!.toISOString()).sort()[0] ?? null : null };
}

export function propertyAvailability(rooms: Array<{ status: AvailabilityStatus; asOf: string | null }>) {
  const available = rooms.filter((room) => room.status === 'available');
  const status: AvailabilityStatus = available.length ? 'available' : rooms.length && rooms.every((room) => room.status === 'sold_out') ? 'sold_out' : 'unknown';
  const dates = (available.length ? available : rooms).map((room) => room.asOf).filter((date): date is string => !!date).sort();
  return { availabilityStatus: status, availabilityAsOf: status === 'unknown' ? null : dates[0] ?? null };
}

export function badgeDateRange(query: { checkIn?: string; checkOut?: string }, now = new Date()) {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  const parse = (key?: string) => {
    if (!key || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return null;
    const date = new Date(`${key}T00:00:00Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === key ? date : null;
  };
  let from = parse(query.checkIn), to = parse(query.checkOut);
  if (!from || !to || to <= from || (to.getTime() - from.getTime()) / 86_400_000 > 30) { from = parse(today)!; to = new Date(from.getTime() + 86_400_000); }
  const dates = Array.from({ length: (to.getTime() - from.getTime()) / 86_400_000 }, (_, i) => new Date(from.getTime() + i * 86_400_000));
  return { dates, checkIn: from.toISOString().slice(0, 10), checkOut: to.toISOString().slice(0, 10) };
}

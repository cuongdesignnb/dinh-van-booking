import { buildAdminData } from '../src/lib/admin/data';
import { DEMO_TODAY } from '../src/data/admin/fixture-clock';

const d = buildAdminData();
const count = (f: (b: (typeof d.bookings)[number]) => boolean) => d.bookings.filter(f).length;
const nov = d.bookings.filter((b) => b.checkIn >= '2024-11-01' && b.checkIn <= '2024-11-30');
const total = (b: (typeof d.bookings)[number]) => b.lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
const occupiedToday = d.bookings.filter(
  (b) => b.status !== 'cancelled' && b.roomTypeId && b.checkIn <= DEMO_TODAY && b.checkOut > DEMO_TODAY,
).length;
console.log('units', d.roomUnits.length, 'properties', d.properties.length, 'roomTypes', d.roomTypes.length);
console.log('bookings', d.bookings.length, 'nov', nov.length);
console.log('pending', count((b) => b.status === 'pending_confirmation'));
console.log('confirmed', count((b) => b.status === 'confirmed'));
console.log('checked_in', count((b) => b.status === 'checked_in'));
console.log('completed', count((b) => b.status === 'completed'));
console.log('cancelled', count((b) => b.status === 'cancelled'));
console.log('paid', count((b) => b.paymentStatus === 'paid'));
console.log('occupiedToday', occupiedToday);
console.log(
  'revenue completed nov',
  d.bookings.filter((b) => b.status === 'completed').reduce((s, b) => s + total(b), 0).toLocaleString('vi-VN'),
);
console.log('customers', d.customers.length, 'inquiries', d.inquiries.length, 'media', d.media.length);

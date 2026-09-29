import { expect, test } from '@playwright/test';
import { stayContactHref } from '@/lib/contact/stay-contact';

test('contact links carry the exact stay, room and non-sensitive trip selection', () => {
  const href = stayContactHref('khu-nghi-cuc-phuong', {
    checkIn: '2026-10-03', checkOut: '2026-10-05', adults: 3, children: 1, rooms: 2,
  }, '2e6e4efc-1234-4123-8123-0acb9cb043a1');
  const url = new URL(href, 'http://localhost');
  expect(url.pathname).toBe('/lien-he');
  expect(Object.fromEntries(url.searchParams)).toEqual({
    checkIn: '2026-10-03', checkOut: '2026-10-05', adults: '3', children: '1', rooms: '2',
    intent: 'stay', item: 'khu-nghi-cuc-phuong', room: '2e6e4efc-1234-4123-8123-0acb9cb043a1',
  });
  expect(href).not.toContain('phone');
  expect(href).not.toContain('message');
});

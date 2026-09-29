import { expect, test } from '@playwright/test';
import type { Stay } from '@/data/stays';
import { fromPrice, hasContactOnlyRooms } from '@/lib/catalog/pricing';
import { stayTypeFromPropertyKind } from '@/lib/catalog/stay-kind';
import { applyFilters, DEFAULT_FILTERS, facetCounts } from '@/lib/stay-filters';

const image = { src: '/qa-only.png', alt: 'QA fixture', width: 1, height: 1 };
const stay = (id: string, type: Stay['type'], prices: number[]): Stay => ({
  id, slug: id, name: id, type, area: 'cuc-phuong', rating: 0, reviewCount: 0,
  location: 'QA local', address: 'QA local', amenities: [], cardFeatures: [], cardSummary: '',
  tagline: '', description: '', highlights: [], popularity: 0, image, gallery: [], host: null,
  roomTypes: prices.map((pricePerNight, index) => ({
    id: `${id}-${index}`, name: `QA room ${index}`, capacity: 4, areaM2: 0, view: '', description: '',
    pricePerNight, image, breakfastIncluded: false, maxRooms: 1,
  })),
  nearby: [],
});

test('Admin property kinds resolve to public stay filter categories', () => {
  expect(stayTypeFromPropertyKind('lodge')).toBe('eco-lodge');
  expect(stayTypeFromPropertyKind('stilt')).toBe('nha-san');
  expect(stayTypeFromPropertyKind('villa')).toBe('villa');
  expect(stayTypeFromPropertyKind('glamping')).toBe('glamping');
  expect(stayTypeFromPropertyKind('some-future-kind')).toBe('other');
});

test('mixed 0đ and quoted rooms filter and sort by quoted price; contact-only stays stay last', () => {
  const mixed = stay('mixed', 'eco-lodge', [0, 250_000]);
  const quoted = stay('quoted', 'villa', [350_000]);
  const contact = stay('contact', 'glamping', [0]);
  expect(fromPrice(mixed)).toBe(250_000);
  expect(fromPrice(contact)).toBe(0);
  expect(hasContactOnlyRooms(mixed)).toBe(true);
  expect(hasContactOnlyRooms(quoted)).toBe(false);

  const all = [contact, quoted, mixed];
  expect(applyFilters(all, { ...DEFAULT_FILTERS, sort: 'price-asc' }, 2).map((item) => item.id)).toEqual(['mixed', 'quoted', 'contact']);
  expect(applyFilters(all, { ...DEFAULT_FILTERS, sort: 'price-desc' }, 2).map((item) => item.id)).toEqual(['quoted', 'mixed', 'contact']);
  expect(applyFilters(all, { ...DEFAULT_FILTERS, priceMax: 300_000 }, 2).map((item) => item.id)).toEqual(['mixed']);
  expect(applyFilters(all, { ...DEFAULT_FILTERS, types: ['eco-lodge'] }, 2).map((item) => item.id)).toEqual(['mixed']);
  expect(facetCounts(all, DEFAULT_FILTERS, 2).types).toMatchObject({ 'eco-lodge': 1, villa: 1, glamping: 1 });
});

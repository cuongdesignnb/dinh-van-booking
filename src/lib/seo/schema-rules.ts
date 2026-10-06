/**
 * Client-safe schema rules shared by the public JSON-LD builders and the Admin
 * SEO panel, so "Schema status" in Admin reflects what the page really emits.
 */

/** Minimum visible text before a page is substantive enough for index/schema. */
export const MIN_SUBSTANTIVE_TEXT = 160;

/**
 * schema.org lodging subtype from the property kind. Only exact matches get a
 * subtype; anything else (homestay, nhà sàn, villa, glamping…) stays the safe
 * `LodgingBusiness`. VacationRental is never inferred.
 */
const LODGING_SUBTYPES: Record<string, string> = {
  hotel: 'Hotel',
  resort: 'Resort',
  motel: 'Motel',
  bnb: 'BedAndBreakfast',
  'bed-and-breakfast': 'BedAndBreakfast',
};

export function lodgingSchemaType(kind: string | null | undefined): string {
  return (kind && LODGING_SUBTYPES[kind.trim().toLowerCase()]) || 'LodgingBusiness';
}

export type SchemaStatusItem = { type: string; ok: boolean; note?: string };

export type SchemaInputs = {
  kind: 'stay' | 'combo' | 'destination' | 'article' | 'page';
  hasSlug: boolean;
  hasCover: boolean;
  bodyTextLength: number;
  noindex: boolean;
  propertyKind?: string | null;
  roomTypeCount?: number;
  itineraryDays?: number;
  authorName?: string | null;
};

/** What the public page will emit once published and indexable; mirrors `src/lib/seo/schema.ts`. */
export function schemaStatus(input: SchemaInputs): SchemaStatusItem[] {
  const substantive = input.bodyTextLength >= MIN_SUBSTANTIVE_TEXT;
  const missing = (parts: Array<[boolean, string]>) => parts.filter(([ok]) => !ok).map(([, label]) => label);
  const entity = (type: string, parts: Array<[boolean, string]>): SchemaStatusItem => {
    const gaps = missing(parts);
    return { type, ok: !gaps.length, ...(gaps.length ? { note: `thiếu ${gaps.join(', ')}` } : {}) };
  };
  if (input.noindex) return [{ type: 'JSON-LD', ok: false, note: 'trang đang noindex nên không phát schema' }];
  const items: SchemaStatusItem[] = [
    { type: 'WebPage', ok: input.hasSlug, ...(input.hasSlug ? {} : { note: 'chưa Generate đường dẫn' }) },
    { type: 'BreadcrumbList', ok: input.hasSlug, ...(input.hasSlug ? {} : { note: 'chưa Generate đường dẫn' }) },
  ];
  const base: Array<[boolean, string]> = [[input.hasSlug, 'đường dẫn'], [input.hasCover, 'ảnh đại diện'], [substantive, `nội dung ≥ ${MIN_SUBSTANTIVE_TEXT} ký tự`]];
  if (input.kind === 'stay') {
    items.push(entity(lodgingSchemaType(input.propertyKind), [...base, [(input.roomTypeCount ?? 0) > 0, 'hạng phòng hoạt động']]));
    items.push({ type: 'GeoCoordinates', ok: false, note: 'bỏ qua: chưa có toạ độ thật đã xác minh' });
    items.push({ type: 'Offer', ok: false, note: 'chưa bật: cần giá/tồn theo ngày đã xác minh' });
    items.push({ type: 'AggregateRating', ok: false, note: 'chưa đủ điều kiện: chưa có đánh giá first-party đã duyệt' });
  } else if (input.kind === 'combo') {
    items.push(entity('TouristTrip', [...base, [(input.itineraryDays ?? 0) > 0, 'lịch trình']]));
    items.push({ type: 'Offer', ok: false, note: 'chưa bật: cần lịch khởi hành và giá công khai đã xác minh' });
  } else if (input.kind === 'destination') {
    items.push(entity('TouristDestination', base));
    items.push({ type: 'GeoCoordinates', ok: false, note: 'bỏ qua: toạ độ bản đồ minh hoạ không phải toạ độ thật' });
  } else if (input.kind === 'article') {
    items.push(entity('BlogPosting', [...base, [!!input.authorName?.trim(), 'tác giả']]));
  }
  return items;
}

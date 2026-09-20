/**
 * Admin demo fixtures. Every record here is sample data ("Dữ liệu mẫu"):
 * names, phone numbers, e-mails, prices, ratings and analytics are invented for
 * the UI and must not be treated as verified business data.
 *
 * Properties, combos and destinations are derived from the public fixtures so
 * the admin and the website never disagree about the catalogue.
 */
import { combos as publicCombos } from '@/data/combos';
import { destinations as publicDestinations } from '@/data/destinations';
import { stays } from '@/data/stays';
import type {
  AdminCombo,
  AdminDestination,
  Article,
  Customer,
  InventoryOverride,
  MediaAsset,
  Property,
  RoomType,
  RoomUnit,
} from '@/lib/admin/types';
import { addDays, DEMO_TODAY, mulberry32 } from './fixture-clock';

export const STAFF = [
  { id: 'u-dinh-van', name: 'Đinh Vân', role: 'owner' as const },
  { id: 'u-le-thu-trang', name: 'Lê Thu Trang', role: 'editor' as const },
  { id: 'u-pham-hoang-nam', name: 'Phạm Hoàng Nam', role: 'editor' as const },
  { id: 'u-tran-minh-quan', name: 'Trần Minh Quân', role: 'editor' as const },
];

/**
 * Sellable units per property — 26 in the whole demo system. Each room type
 * keeps at least one unit, so the totals shown in the donut, the KPI cards and
 * the inventory table are the same number counted the same way.
 */
const UNITS: Record<string, number> = {
  'cuc-phuong-forest-homestay': 6,
  'an-nhien-retreat': 3,
  'cuc-phuong-eco-lodge': 4,
  'moc-son-homestay': 3,
  'nha-san-cuc-phuong': 3,
  'cuc-phuong-bungalow': 3,
  'green-valley-homestay': 2,
  'trang-an-nature-lodge': 2,
};

const KIND: Record<string, Property['kind']> = {
  homestay: 'homestay',
  'eco-lodge': 'lodge',
  resort: 'resort',
  bungalow: 'bungalow',
  'nha-san': 'stilt',
};

const AREA_LABEL: Record<string, string> = { 'cuc-phuong': 'Cúc Phương', 'trang-an': 'Tràng An' };

const PROPERTY_STATE: Record<string, Property['state']> = {
  'nha-san-cuc-phuong': 'maintenance',
  'trang-an-nature-lodge': 'maintenance',
};

export function buildProperties(): Property[] {
  return stays.map((s, i) => ({
    id: s.id,
    code: `PN-${String(i + 1).padStart(2, '0')}`,
    slug: s.slug,
    name: s.name,
    kind: KIND[s.type],
    area: AREA_LABEL[s.area],
    address: s.address,
    cover: s.image.src,
    gallery: (s.gallery ?? []).map((g) => g.src),
    shortDescription: s.cardSummary,
    description: s.description,
    amenities: s.amenities,
    rating: s.rating,
    reviewCount: s.reviewCount,
    fromPrice: Math.min(...s.roomTypes.map((r) => r.pricePerNight)),
    state: PROPERTY_STATE[s.id] ?? 'active',
    publication: 'published',
    featured: i < 3,
    pinned: i === 0,
    policies: {
      checkIn: '14:00',
      checkOut: '12:00',
      maxGuests: Math.max(...s.roomTypes.map((r) => r.capacity)),
      note: 'Nhận phòng sớm hoặc trả phòng muộn tùy tình trạng phòng.',
    },
    seo: { title: `${s.name} | Đinh Vân Booking`, description: s.cardSummary },
  }));
}

export function buildRoomTypes(): RoomType[] {
  const out: RoomType[] = [];
  for (const s of stays) {
    const total = UNITS[s.id] ?? 2;
    const types = s.roomTypes;
    types.forEach((r, i) => {
      // Spread the property's units over its room types; the remainder goes first.
      const base = Math.max(1, Math.floor(total / types.length));
      const units = i === 0 ? Math.max(1, total - base * (types.length - 1)) : base;
      out.push({
        id: `${s.id}__${r.id}`,
        propertyId: s.id,
        name: r.name,
        capacityMin: Math.max(1, r.capacity - 1),
        capacityMax: r.capacity,
        area: r.areaM2,
        bed: r.capacity > 3 ? '2 giường lớn' : '1 giường lớn',
        units,
        basePrice: r.pricePerNight,
        weekendPrice: Math.round((r.pricePerNight * 1.16) / 10000) * 10000,
        amenities: s.amenities.slice(0, 4),
        state: 'active',
      });
    });
  }
  return out;
}

export function buildRoomUnits(roomTypes: RoomType[]): RoomUnit[] {
  const out: RoomUnit[] = [];
  for (const t of roomTypes) {
    for (let i = 1; i <= t.units; i++) {
      out.push({ id: `${t.id}#${i}`, roomTypeId: t.id, propertyId: t.propertyId, label: `${t.name} ${i}` });
    }
  }
  return out;
}

/** Two units are under maintenance around the demo date. */
export function buildOverrides(roomTypes: RoomType[]): InventoryOverride[] {
  const stilt = roomTypes.find((t) => t.propertyId === 'nha-san-cuc-phuong');
  const trangAn = roomTypes.find((t) => t.propertyId === 'trang-an-nature-lodge');
  const out: InventoryOverride[] = [];
  for (let d = -3; d <= 6; d++) {
    if (stilt)
      out.push({ roomTypeId: stilt.id, date: addDays(DEMO_TODAY, d), flag: 'maintenance', units: 1, reason: 'Sửa mái và thay sàn gỗ' });
    if (trangAn)
      out.push({ roomTypeId: trangAn.id, date: addDays(DEMO_TODAY, d), flag: 'maintenance', units: 1, reason: 'Bảo trì hệ thống nước' });
  }
  return out;
}

const CUSTOMER_SEED: [string, Customer['group'], Customer['source'], string, string[]][] = [
  ['Nguyễn Thị Mai', 'family', 'website', 'Gia đình có trẻ nhỏ', ['Gia đình', 'Trẻ nhỏ']],
  ['Trần Quốc Hùng', 'couple', 'website', 'Cặp đôi, nghỉ dưỡng', ['Cặp đôi', 'Honeymoon']],
  ['Lê Thu Hà', 'friends', 'facebook', 'Nhóm bạn', ['Nhóm bạn', 'Trekking']],
  ['Phạm Minh Đức', 'family', 'direct', 'Gia đình', ['Gia đình', 'Thiên nhiên']],
  ['Hoàng Thu Trang', 'couple', 'website', 'Cặp đôi', ['Cặp đôi', 'Nghỉ dưỡng']],
  ['Nguyễn Văn Long', 'friends', 'zalo', 'Nhóm bạn', ['Nhóm bạn', 'Check-in']],
  ['Trần Mai Lan', 'family', 'website', 'Gia đình có trẻ nhỏ', ['Gia đình', 'Trẻ nhỏ']],
  ['Vũ Minh Khoa', 'solo', 'facebook', 'Cá nhân, khám phá', ['Cá nhân', 'Trekking']],
  ['Phan Thị Ngọc', 'company', 'referral', 'Công ty/team building', ['Công ty', 'Team building']],
  ['Đỗ Quang Huy', 'couple', 'website', 'Cặp đôi', ['Cặp đôi', 'Lãng mạn']],
  ['Vũ Văn Nam', 'couple', 'website', 'Cặp đôi nghỉ cuối tuần', ['Cặp đôi']],
  ['Phạm Thị Hạnh', 'family', 'direct', 'Gia đình 4 người', ['Gia đình']],
  ['Trần Thị Lan', 'friends', 'website', 'Nhóm bạn trẻ', ['Nhóm bạn']],
  ['Đỗ Minh Tuấn', 'family', 'direct', 'Gia đình', ['Gia đình']],
  ['Nguyễn Thùy Linh', 'couple', 'website', 'Cặp đôi', ['Cặp đôi']],
  ['Bùi Anh Tuấn', 'friends', 'facebook', 'Nhóm bạn', ['Nhóm bạn']],
  ['Phạm Ngọc Hà', 'family', 'website', 'Gia đình nhiều thế hệ', ['Gia đình']],
  ['Lương Thị Hoa', 'family', 'referral', 'Gia đình', ['Gia đình', 'Trẻ nhỏ']],
  ['Trịnh Văn Dũng', 'couple', 'website', 'Cặp đôi', ['Cặp đôi']],
  ['Lê Anh Tuấn', 'company', 'website', 'Công ty 20 người', ['Công ty']],
  ['Phạm Ngọc Anh', 'couple', 'zalo', 'Cặp đôi', ['Cặp đôi']],
  ['Nguyễn Hải Yến', 'family', 'website', 'Gia đình', ['Gia đình']],
  ['Vũ Minh Tâm', 'friends', 'facebook', 'Nhóm bạn', ['Nhóm bạn']],
  ['Trần Lan Anh', 'family', 'website', 'Gia đình 4 người', ['Gia đình']],
  ['Lê Văn Kiên', 'solo', 'direct', 'Cá nhân', ['Cá nhân']],
  ['Lê Hoàng Anh', 'couple', 'website', 'Cặp đôi', ['Cặp đôi']],
  ['Nguyễn Thu Hà', 'family', 'website', 'Gia đình', ['Gia đình']],
  ['Lê Thùy Linh', 'friends', 'zalo', 'Nhóm bạn', ['Nhóm bạn']],
  ['Đặng Quốc Bảo', 'company', 'referral', 'Công ty', ['Công ty']],
  ['Ngô Thị Hạnh', 'family', 'website', 'Gia đình', ['Gia đình']],
];

const SURNAMES = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Vũ', 'Đặng', 'Bùi', 'Đỗ', 'Ngô', 'Dương', 'Lý'];
const MIDDLE = ['Thị', 'Văn', 'Minh', 'Thu', 'Hải', 'Ngọc', 'Quang', 'Thanh', 'Hoàng', 'Phương'];
const GIVEN = ['Mai', 'Hùng', 'Hà', 'Đức', 'Trang', 'Long', 'Lan', 'Khoa', 'Ngọc', 'Huy', 'Nam', 'Hạnh', 'Tuấn', 'Linh', 'Dũng', 'Yến', 'Tâm', 'Anh', 'Kiên', 'Bảo', 'Hoa', 'Vy', 'Sơn', 'Thắng'];

const GROUPS: Customer['group'][] = ['family', 'couple', 'friends', 'company', 'solo'];
const SOURCES: Customer['source'][] = ['website', 'facebook', 'zalo', 'direct', 'referral'];
const NEEDS = [
  'Gia đình có trẻ nhỏ',
  'Cặp đôi nghỉ dưỡng',
  'Nhóm bạn trekking',
  'Công ty/team building',
  'Cá nhân khám phá',
  'Gia đình nhiều thế hệ',
];
const TAG_POOL = ['Gia đình', 'Cặp đôi', 'Nhóm bạn', 'Công ty', 'Trẻ nhỏ', 'Trekking', 'Nghỉ dưỡng', 'Check-in', 'Ẩm thực'];
const CITIES = ['Hà Nội', 'Ninh Bình', 'Hải Phòng', 'Nam Định', 'TP. Hồ Chí Minh'];

/** Demo phone numbers: same shape as a Vietnamese mobile number but never dialled. */
const demoPhone = (i: number) => `0900 ${String(100 + (i % 899)).padStart(3, '0')} ${String((i * 37) % 1000).padStart(3, '0')}`;

const mailName = (name: string) =>
  name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .split(' ')
    .slice(-2)
    .join('.');

export function buildCustomers(): Customer[] {
  const rnd = mulberry32(20241115);
  const out: Customer[] = [];
  CUSTOMER_SEED.forEach(([name, group, source, need, tags], i) => {
    out.push({
      id: `kh-${String(i + 1).padStart(3, '0')}`,
      name,
      phone: demoPhone(i + 1),
      email: `${mailName(name)}@example.com`,
      city: CITIES[i % CITIES.length],
      source,
      group,
      need,
      tags,
      preferences: [],
      note: '',
      ownerId: STAFF[i % STAFF.length].id,
      createdAt: addDays(DEMO_TODAY, -(18 + i * 3)),
      // Portraits are never invented for a person: the UI falls back to initials.
      avatar: undefined,
    });
  });
  for (let i = out.length; i < 256; i++) {
    const name = `${SURNAMES[Math.floor(rnd() * SURNAMES.length)]} ${MIDDLE[Math.floor(rnd() * MIDDLE.length)]} ${GIVEN[Math.floor(rnd() * GIVEN.length)]}`;
    out.push({
      id: `kh-${String(i + 1).padStart(3, '0')}`,
      name,
      phone: demoPhone(i + 1),
      email: `${mailName(name)}${i}@example.com`,
      city: CITIES[Math.floor(rnd() * CITIES.length)],
      source: SOURCES[Math.floor(rnd() * SOURCES.length)],
      group: GROUPS[Math.floor(rnd() * GROUPS.length)],
      need: NEEDS[Math.floor(rnd() * NEEDS.length)],
      tags: [TAG_POOL[Math.floor(rnd() * TAG_POOL.length)]],
      preferences: [],
      note: '',
      ownerId: STAFF[Math.floor(rnd() * STAFF.length)].id,
      createdAt: addDays(DEMO_TODAY, -Math.floor(rnd() * 240 + 10)),
    });
  }
  out[0].preferences = ['Gia đình có trẻ nhỏ', 'Thích gần rừng', 'Cần combo 2N1Đ', 'Ưu tiên yên tĩnh', 'Thích chụp ảnh'];
  out[0].note =
    'Muốn tìm nơi yên tĩnh, gần gũi thiên nhiên, phù hợp cho gia đình có 2 bé (5 tuổi và 8 tuổi). Ưu tiên combo 2 ngày 1 đêm, có hoạt động trải nghiệm cho trẻ em.';
  return out;
}

/* ---------------------------------------------------------------- catalogue */

const COMBO_STATE: Record<string, AdminCombo['state']> = { 'green-valley-homestay': 'paused' };
const COMBO_BADGE: Record<string, AdminCombo['badge']> = {
  'trang-an-bai-dinh': 'featured',
  'cuc-phuong-eco-retreat': 'bestseller',
  'ninh-binh-tron-ven': 'seasonal',
};

export function buildCombos(): AdminCombo[] {
  const rnd = mulberry32(777);
  return publicCombos.map((c, i) => {
    const bookings = [186, 142, 98, 76, 64, 53][i] ?? Math.floor(rnd() * 90 + 30);
    return {
      id: c.id,
      slug: c.slug,
      name: c.title,
      area: 'Ninh Bình',
      cover: c.image.src,
      gallery: [c.image.src],
      days: c.durationDays,
      nights: c.durationNights,
      audiences: c.audienceTags.map((a) =>
        a === 'gia-dinh' ? 'Gia đình' : a === 'cap-doi' ? 'Cặp đôi' : a === 'nhom' ? 'Nhóm bạn' : 'Thiên nhiên',
      ),
      tags: c.includedHighlights.map((h) => h.text.split(' ').slice(0, 2).join(' ')),
      price: c.fromPriceVnd,
      priceUnit: 'person',
      childPrice: Math.round((c.fromPriceVnd * 0.7) / 10000) * 10000,
      bookings,
      views: bookings * 42,
      revenue: bookings * c.fromPriceVnd,
      state: COMBO_STATE[c.id] ?? 'selling',
      badge: COMBO_BADGE[c.id] ?? null,
      featured: Boolean(COMBO_BADGE[c.id]),
      summary: c.subtitle,
      itinerary: c.itinerary.map((d, di) => ({
        day: di + 1,
        // The chip already shows "Ngày N", so the title carries the theme.
        title: ['Khởi hành & nhận phòng', 'Khám phá & kết thúc hành trình', 'Trải nghiệm thêm'][di] ?? d.day,
        time: di === 0 ? '07:00 – 17:00' : '07:00 – 16:00',
        activities: d.items,
      })),
      includes: c.included,
      excludes: c.excluded,
      destinationIds: [],
      propertyIds: [],
      promotion:
        c.id === 'trang-an-bai-dinh'
          ? { label: 'Giảm 10% cho nhóm từ 4 người', value: 10, kind: 'percent', until: '2024-12-31' }
          : null,
      terms: ['Giá áp dụng cho đơn mới; đơn đã chốt giữ giá cũ.', 'Nội dung combo là dữ liệu mẫu, chờ chủ cơ sở xác nhận.'],
    };
  });
}

const DEST_CATEGORY: Record<string, AdminDestination['category']> = {
  'thien-nhien': 'nature',
  'van-hoa': 'culture',
  'am-thuc': 'food',
  'check-in': 'checkin',
  'gia-dinh': 'nature',
};

export function buildDestinations(): AdminDestination[] {
  return publicDestinations.map((d, i) => ({
    id: d.id,
    slug: d.id,
    name: d.name,
    category: DEST_CATEGORY[d.tags[0]] ?? 'nature',
    image: d.image.src,
    gallery: [d.image.src, d.nearbyImage?.src, d.homeImage?.src].filter(Boolean) as string[],
    shortDescription: d.summary,
    content: d.description,
    tags: d.activities.slice(0, 3).map((a) => a.split(' ').slice(0, 2).join(' ')),
    publication: i === 5 ? 'hidden' : 'published',
    updatedAt: addDays(DEMO_TODAY, -(i + 1) * 1 - (i > 3 ? 3 : 0)),
    views: 2400 - i * 230,
    seo: {
      title: `${d.name} | Khám phá Ninh Bình | Đinh Vân Booking`,
      description: i === 2 || i === 5 ? '' : d.summary,
      ogImage: i === 2 || i === 5 ? null : d.image.src,
    },
  }));
}

const ARTICLE_SEED: [string, string, string][] = [
  ['Cẩm nang 48 giờ ở Cúc Phương', 'Cẩm nang', 'published'],
  ['Mùa bướm Cúc Phương có gì đặc biệt?', 'Thiên nhiên', 'published'],
  ['Ăn gì ở Ninh Bình khi trời trở lạnh', 'Ẩm thực', 'published'],
  ['Đi Tràng An mùa nào đẹp nhất', 'Cẩm nang', 'draft'],
  ['Homestay cho gia đình có trẻ nhỏ', 'Lưu trú', 'published'],
  ['Trekking nhẹ quanh hồ Yên Quang', 'Trải nghiệm', 'hidden'],
];

export function buildArticles(): Article[] {
  return ARTICLE_SEED.map(([title, category, publication], i) => ({
    id: `bv-${String(i + 1).padStart(2, '0')}`,
    slug: mailName(title).replace(/\./g, '-'),
    title,
    category,
    author: STAFF[i % STAFF.length].name,
    cover: publicDestinations[i % publicDestinations.length].image.src,
    excerpt: 'Bài viết mẫu cho bản demo quản trị, nội dung chờ chủ cơ sở duyệt.',
    content: 'Nội dung chi tiết của bài viết mẫu. Thay bằng nội dung thật trước khi xuất bản.',
    publication: publication as Article['publication'],
    updatedAt: addDays(DEMO_TODAY, -(i * 2 + 1)),
    views: 1800 - i * 210,
    seo: { title, description: i === 3 ? '' : 'Mô tả mẫu cho bài viết.', ogImage: null },
  }));
}

export function buildMedia(): MediaAsset[] {
  const seeds: [string, string][] = [
    ...publicDestinations.map((d) => [d.image.src, d.image.alt] as [string, string]),
    ...stays.map((s) => [s.image.src, s.image.alt] as [string, string]),
    ...publicCombos.map((c) => [c.image.src, c.image.alt] as [string, string]),
    ...publicDestinations.filter((d) => d.nearbyImage).map((d) => [d.nearbyImage!.src, d.nearbyImage!.alt] as [string, string]),
  ];
  return seeds.map(([url, alt], i) => ({
    id: `media-${String(i + 1).padStart(3, '0')}`,
    file: url.split('/').pop() ?? `anh-${i}.webp`,
    url,
    kind: 'image',
    width: 1200,
    height: 630,
    bytes: 180000 + ((i * 7919) % 90000),
    alt,
    caption: '',
    tags: [],
    uploadedAt: addDays(DEMO_TODAY, -(i + 2)),
  }));
}

// FICTIONAL DEMO DATA for UI screenshots / QA only.
// Nothing here is real business data and no app code imports this file.
// Every property / combo / destination name is prefixed with "Demo · ".
import { readFileSync } from 'node:fs';

const REGISTRY = JSON.parse(readFileSync(new URL('./settings-registry.json', import.meta.url), 'utf8'));

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------
const IMG = '/images/dinh-van-booking';
const img = (path, alt, width, height, caption) => ({ src: `${IMG}/${path}`, alt, width, height, ...(caption ? { caption } : {}) });
const doc = (...paragraphs) => ({ type: 'doc', content: paragraphs.map((text) => ({ type: 'paragraph', content: [{ type: 'text', text }] })) });
const vnToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const shift = (day, n) => { const d = new Date(`${day}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const isDay = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
const daysBetween = (a, b) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
const iso = (day, time = '09:00:00') => new Date(`${day}T${time}+07:00`).toISOString();
const hoursAgo = (h) => new Date(Date.now() - h * 3_600_000).toISOString();
const daysAgo = (d) => hoursAgo(d * 24);
const ok = (body) => ({ status: 200, body });
const notFound = (message = 'Not found') => ({ status: 404, body: { message } });
const page = (items, query, defaultSize = 20) => {
  const pageNo = Math.max(1, Number(query.page ?? 1) || 1);
  const pageSize = Math.max(1, Number(query.pageSize ?? defaultSize) || defaultSize);
  return { items: items.slice((pageNo - 1) * pageSize, pageNo * pageSize), total: items.length, page: pageNo, pageSize };
};
const hash = (s) => { let h = 7; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };

// ---------------------------------------------------------------------------
// catalogue: 6 stays (properties) with 2–3 room types each
// ---------------------------------------------------------------------------
const AMENITY_LABEL = { wifi: 'Wi-Fi', breakfast: 'Bữa sáng', view: 'View rừng', kitchen: 'Có bếp', family: 'Phù hợp gia đình', parking: 'Chỗ đậu xe', eco: 'Thân thiện môi trường', pool: 'Hồ bơi' };
const ROOM_AMENITIES = {
  std: [{ code: 'wifi', label: 'Wi-Fi' }, { code: 'hot-water', label: 'Nước nóng' }, { code: 'fan', label: 'Quạt trần' }],
  dlx: [{ code: 'wifi', label: 'Wi-Fi' }, { code: 'balcony', label: 'Ban công riêng' }, { code: 'air-conditioner', label: 'Điều hoà' }, { code: 'hot-water', label: 'Nước nóng' }],
  fam: [{ code: 'wifi', label: 'Wi-Fi' }, { code: 'kitchenette', label: 'Bếp nhỏ' }, { code: 'air-conditioner', label: 'Điều hoà' }, { code: 'garden', label: 'Sân vườn riêng' }],
};
const ROOM_IMG = {
  std: img('rooms/standard-garden.webp', 'Phòng gỗ cửa kính nhìn ra vườn (ảnh minh hoạ)', 234, 81),
  dlx: img('rooms/deluxe-mountain-view.webp', 'Phòng có ban công nhìn ra núi (ảnh minh hoạ)', 235, 81),
  fam: img('rooms/bungalow-family.webp', 'Bungalow gỗ giữa vườn (ảnh minh hoạ)', 234, 81),
};
const room = (id, code, name, kind, capacity, areaM2, view, price, description, extra = {}) => ({
  id, code, name, kind, capacity, areaM2, view, price, description,
  units: extra.units ?? 3, breakfastIncluded: extra.breakfast ?? false, status: extra.status ?? 'active',
  capacityVerified: extra.capacityVerified ?? true, unitKind: extra.unitKind ?? 'room', bedroomCount: extra.bedrooms ?? 1, bathroomCount: 1,
});

// profile drives the fictional inventory mix of each property
export const PROPERTIES = [
  {
    id: 'demo-prop-rung', code: 'DEMO-RUNG', slug: 'demo-nha-rung-cuc-phuong', name: 'Demo · Nhà Rừng Cúc Phương', kind: 'homestay', profile: 'showcase',
    area: 'Cúc Phương', address: 'Thôn Demo 1, xã Cúc Phương, Nho Quan, Ninh Bình (địa chỉ minh hoạ)', featured: true, rating: 4.8, reviewCount: 36,
    amenities: ['wifi', 'breakfast', 'view', 'family', 'parking', 'eco'],
    image: img('stays/cuc-phuong-forest-homestay.webp', 'Cụm nhà gỗ lên đèn giữa rừng (ảnh minh hoạ)', 206, 99),
    home: img('stay-forest.webp', 'Nhà gỗ giữa vườn cây xanh (ảnh minh hoạ)', 264, 104),
    gallery: [img('detail/forest-main.webp', 'Phòng ngủ gỗ nhìn ra rừng (ảnh minh hoạ)', 529, 318, 'Phòng ngủ gỗ nhìn ra rừng'), img('detail/forest-1.webp', 'Nhà gỗ hai tầng (ảnh minh hoạ)', 191, 107, 'Nhà gỗ giữa rừng'), img('detail/forest-2.webp', 'Ban công nhìn thung lũng (ảnh minh hoạ)', 191, 94, 'Ban công'), img('detail/forest-3.webp', 'Sân vườn buổi tối (ảnh minh hoạ)', 191, 107, 'Sân vườn buổi tối')],
    excerpt: 'Nhà gỗ mộc giữa tán rừng, hợp cặp đôi và gia đình nhỏ muốn sống chậm vài ngày.',
    tagline: 'Thức dậy cùng tiếng chim rừng, một ngày chậm rãi bên bếp lửa và hiên gỗ.',
    body: ['Demo · Nhà Rừng Cúc Phương là cơ sở lưu trú hư cấu dùng cho ảnh chụp giao diện. Những căn nhà gỗ nằm dưới tán cây, cửa kính lớn nhìn ra rừng, có hiên ngồi và khu bếp chung.', 'Khách có thể đạp xe vào cổng vườn quốc gia, tham gia bữa tối quây quần hoặc nghỉ ngơi trên võng. Toàn bộ thông tin, giá và tình trạng phòng ở đây chỉ là dữ liệu minh hoạ.'],
    highlights: ['View rừng nguyên sinh', 'Bữa sáng bản địa', 'Hiên gỗ riêng', 'Xe đạp miễn phí'],
    rooms: [
      room('demo-rt-rung-std', 'RUNG-STD', 'Phòng Gỗ Hướng Vườn', 'std', 2, 20, 'Hướng vườn', 650000, 'Phòng gỗ ấm cúng cho cặp đôi, cửa kính nhìn ra vườn cây.', { units: 4, breakfast: true }),
      room('demo-rt-rung-dlx', 'RUNG-DLX', 'Phòng Ban Công Hướng Núi', 'dlx', 3, 28, 'Hướng núi', 890000, 'Rộng hơn, có ban công riêng nhìn ra dãy núi đá vôi.', { units: 3, breakfast: true }),
      room('demo-rt-rung-fam', 'RUNG-FAM', 'Nhà Gỗ Gia Đình', 'fam', 5, 42, 'Sân vườn riêng', 1450000, 'Nhà gỗ hai phòng ngủ, sân vườn riêng, phù hợp gia đình 4–5 người.', { units: 2, bedrooms: 2, unitKind: 'house' }),
    ],
  },
  {
    id: 'demo-prop-dong-chuong', code: 'DEMO-DCH', slug: 'demo-bungalow-ho-dong-chuong', name: 'Demo · Bungalow Hồ Đồng Chương', kind: 'bungalow', profile: 'mixed',
    area: 'Cúc Phương', address: 'Ven hồ Đồng Chương, Nho Quan, Ninh Bình (địa chỉ minh hoạ)', featured: true, rating: 4.7, reviewCount: 21,
    amenities: ['wifi', 'view', 'parking', 'family', 'kitchen'],
    image: img('stays/cuc-phuong-bungalow.webp', 'Bungalow ven hồ (ảnh minh hoạ)', 204, 100),
    home: img('stay-eco-lodge.webp', 'Bungalow giữa cây xanh (ảnh minh hoạ)', 252, 104),
    gallery: [img('stays/cuc-phuong-bungalow.webp', 'Bungalow ven hồ (ảnh minh hoạ)', 204, 100, 'Bungalow ven hồ'), img('detail/forest-2.webp', 'Hiên nhìn ra mặt hồ (ảnh minh hoạ)', 191, 94, 'Hiên nhìn ra hồ'), img('rooms/bungalow-family.webp', 'Bungalow gia đình (ảnh minh hoạ)', 234, 81, 'Bungalow gia đình')],
    excerpt: 'Những căn bungalow nhỏ nhìn ra mặt hồ, yên tĩnh, có bếp chung và chỗ câu cá.',
    tagline: 'Một buổi chiều bên mặt hồ phẳng lặng, gió nhẹ và hoàng hôn sau dãy núi.',
    body: ['Demo · Bungalow Hồ Đồng Chương là dữ liệu minh hoạ. Các bungalow gỗ quây quanh một bãi cỏ rộng sát mép hồ, thích hợp cho nhóm bạn và gia đình có trẻ nhỏ.', 'Buổi tối có thể đốt lửa trại, buổi sáng chèo thuyền kayak quanh hồ. Mọi chi tiết đều không phải dữ liệu kinh doanh thật.'],
    highlights: ['Sát mặt hồ', 'Bếp chung', 'Kayak buổi sáng', 'Lửa trại'],
    rooms: [
      room('demo-rt-dch-lake', 'DCH-LAKE', 'Bungalow Hướng Hồ', 'dlx', 2, 24, 'Hướng hồ', 1200000, 'Bungalow đôi với hiên gỗ nhìn thẳng ra mặt hồ.', { units: 5 }),
      room('demo-rt-dch-fam', 'DCH-FAM', 'Bungalow Gia Đình', 'fam', 4, 36, 'Hướng vườn', 1750000, 'Hai giường lớn, góc chơi cho trẻ em, hiên rộng.', { units: 2, unitKind: 'bungalow' }),
    ],
  },
  {
    id: 'demo-prop-thung-nham', code: 'DEMO-TNH', slug: 'demo-homestay-thung-nham', name: 'Demo · Homestay Thung Nham', kind: 'homestay', profile: 'busy',
    area: 'Tràng An – Thung Nham', address: 'Thôn Demo, Hải Nham, Hoa Lư, Ninh Bình (địa chỉ minh hoạ)', featured: true, rating: 4.9, reviewCount: 52,
    amenities: ['wifi', 'breakfast', 'view', 'parking'],
    image: img('stays/green-valley-homestay.webp', 'Homestay giữa thung lũng xanh (ảnh minh hoạ)', 201, 100),
    home: img('stay-moc-son.webp', 'Homestay giữa đồng lúa (ảnh minh hoạ)', 251, 104),
    gallery: [img('stays/green-valley-homestay.webp', 'Homestay giữa thung lũng (ảnh minh hoạ)', 201, 100, 'Thung lũng xanh'), img('stays/moc-son-homestay.webp', 'Sân homestay (ảnh minh hoạ)', 203, 99, 'Sân nhà'), img('rooms/standard-garden.webp', 'Phòng đôi (ảnh minh hoạ)', 234, 81, 'Phòng đôi')],
    excerpt: 'Homestay nhỏ giữa đồng lúa và núi đá, gần vườn chim Thung Nham, thường kín phòng cuối tuần.',
    tagline: 'Đồng lúa, núi đá và đàn cò bay về tổ lúc chiều muộn.',
    body: ['Demo · Homestay Thung Nham là cơ sở hư cấu. Ngôi nhà ba gian nằm giữa cánh đồng, chủ nhà nấu cơm quê và hướng dẫn đường đạp xe quanh làng.', 'Dữ liệu này được tạo để kiểm tra giao diện trạng thái “hết phòng” và không đại diện cho cơ sở thật nào.'],
    highlights: ['Giữa đồng lúa', 'Cơm quê', 'Gần vườn chim', 'Đạp xe quanh làng'],
    rooms: [
      room('demo-rt-tnh-dbl', 'TNH-DBL', 'Phòng Đôi Hướng Đồng', 'std', 2, 18, 'Hướng đồng lúa', 720000, 'Phòng đôi nhỏ gọn, cửa sổ nhìn ra cánh đồng.', { units: 3, breakfast: true }),
      room('demo-rt-tnh-grp', 'TNH-GRP', 'Phòng Nhóm 4 Người', 'fam', 4, 30, 'Hướng núi', 1150000, 'Hai giường đôi, phù hợp nhóm bạn hoặc gia đình.', { units: 2, breakfast: true }),
    ],
  },
  {
    id: 'demo-prop-nha-san', code: 'DEMO-SAN', slug: 'demo-nha-san-ban-muong', name: 'Demo · Nhà Sàn Bản Mường', kind: 'stilt', profile: 'sparse',
    area: 'Cúc Phương', address: 'Bản Demo, xã Cúc Phương, Nho Quan, Ninh Bình (địa chỉ minh hoạ)', featured: false, rating: 4.6, reviewCount: 14,
    amenities: ['breakfast', 'family', 'eco', 'parking'],
    image: img('stays/nha-san-cuc-phuong.webp', 'Nhà sàn gỗ truyền thống (ảnh minh hoạ)', 206, 100),
    home: img('stay-retreat.webp', 'Nhà sàn giữa vườn (ảnh minh hoạ)', 264, 104),
    gallery: [img('stays/nha-san-cuc-phuong.webp', 'Nhà sàn gỗ (ảnh minh hoạ)', 206, 100, 'Nhà sàn gỗ'), img('detail/forest-3.webp', 'Sân trước nhà sàn (ảnh minh hoạ)', 191, 107, 'Sân trước')],
    excerpt: 'Nhà sàn gỗ kiểu Mường, ngủ tập thể hoặc phòng riêng, phù hợp đoàn trải nghiệm văn hoá.',
    tagline: 'Ngủ trên sàn gỗ, nghe tiếng suối và ăn mâm cơm Mường.',
    body: ['Demo · Nhà Sàn Bản Mường là dữ liệu minh hoạ. Không gian sàn rộng có thể trải đệm cho đoàn 10 người, kèm hai phòng riêng ngăn vách gỗ.', 'Quỹ phòng của cơ sở này chỉ được mở vài ngày tới để minh hoạ trạng thái “chưa mở quỹ”.'],
    highlights: ['Kiến trúc nhà sàn', 'Mâm cơm Mường', 'Phù hợp đoàn', 'Gần suối'],
    rooms: [
      room('demo-rt-san-dorm', 'SAN-DORM', 'Sàn Tập Thể', 'fam', 10, 60, 'Hướng suối', 1900000, 'Không gian sàn chung trải đệm, giá cho cả sàn tối đa 10 khách.', { units: 1, unitKind: 'dorm', breakfast: true }),
      room('demo-rt-san-priv', 'SAN-PRIV', 'Phòng Riêng Trên Sàn', 'std', 2, 16, 'Hướng vườn', 680000, 'Phòng riêng ngăn vách gỗ, đệm đôi, màn chống muỗi.', { units: 2, breakfast: true }),
    ],
  },
  {
    id: 'demo-prop-eco', code: 'DEMO-ECO', slug: 'demo-eco-lodge-suoi-rua', name: 'Demo · Eco Lodge Suối Rùa', kind: 'lodge', profile: 'stale',
    area: 'Cúc Phương', address: 'Đường Demo, Nho Quan, Ninh Bình (địa chỉ minh hoạ)', featured: true, rating: 4.7, reviewCount: 18,
    amenities: ['wifi', 'breakfast', 'view', 'eco', 'pool', 'parking'],
    image: img('stays/cuc-phuong-eco-lodge.webp', 'Eco lodge mái lá giữa rừng (ảnh minh hoạ)', 201, 99),
    home: img('stay-eco-lodge.webp', 'Eco lodge giữa cây xanh (ảnh minh hoạ)', 252, 104),
    gallery: [img('stays/cuc-phuong-eco-lodge.webp', 'Eco lodge (ảnh minh hoạ)', 201, 99, 'Eco lodge'), img('rooms/deluxe-mountain-view.webp', 'Phòng nhìn ra núi (ảnh minh hoạ)', 235, 81, 'Phòng nhìn núi'), img('detail/forest-1.webp', 'Lối đi trong rừng (ảnh minh hoạ)', 191, 107, 'Lối đi trong rừng')],
    excerpt: 'Lodge sinh thái mái lá, hồ bơi nước suối, dùng điện mặt trời và hạn chế nhựa dùng một lần.',
    tagline: 'Ở gọn trong rừng, dùng ít đi và nhìn thấy nhiều hơn.',
    body: ['Demo · Eco Lodge Suối Rùa là cơ sở hư cấu cho ảnh chụp giao diện. Các phòng mái lá nằm rải rác dọc con suối nhỏ, có hồ bơi lọc tự nhiên.', 'Một số ngày của cơ sở này được đánh dấu “cần xác nhận” để minh hoạ dữ liệu tồn phòng chưa được xác nhận lại.'],
    highlights: ['Hồ bơi nước suối', 'Điện mặt trời', 'Không nhựa dùng một lần', 'Tour đêm'],
    rooms: [
      room('demo-rt-eco-std', 'ECO-STD', 'Phòng Mái Lá Tiêu Chuẩn', 'std', 2, 22, 'Hướng rừng', 980000, 'Phòng mái lá mát mẻ, giường đôi, phòng tắm bán lộ thiên.', { units: 4, breakfast: true }),
      room('demo-rt-eco-dlx', 'ECO-DLX', 'Phòng Ven Suối', 'dlx', 3, 30, 'Hướng suối', 1350000, 'Sát con suối, hiên rộng và bồn tắm gỗ.', { units: 3, breakfast: true }),
      room('demo-rt-eco-villa', 'ECO-VILLA', 'Biệt Thự Rừng 2 Phòng Ngủ', 'fam', 6, 70, 'Hướng rừng', 2400000, 'Hai phòng ngủ, phòng khách và bếp riêng — chưa xác minh sức chứa.', { units: 1, bedrooms: 2, unitKind: 'villa', capacityVerified: false }),
    ],
  },
  {
    id: 'demo-prop-trang-an', code: 'DEMO-TAN', slug: 'demo-lodge-ven-song-trang-an', name: 'Demo · Lodge Ven Sông Tràng An', kind: 'resort', profile: 'open',
    area: 'Tràng An', address: 'Ven sông Demo, Trường Yên, Hoa Lư, Ninh Bình (địa chỉ minh hoạ)', featured: false, rating: 4.5, reviewCount: 9,
    amenities: ['wifi', 'breakfast', 'view', 'pool', 'parking', 'family'],
    image: img('stays/trang-an-nature-lodge.webp', 'Lodge ven sông giữa núi đá (ảnh minh hoạ)', 203, 100),
    home: img('stay-retreat.webp', 'Khu nghỉ ven sông (ảnh minh hoạ)', 264, 104),
    gallery: [img('stays/trang-an-nature-lodge.webp', 'Lodge ven sông (ảnh minh hoạ)', 203, 100, 'Lodge ven sông'), img('stays/an-nhien-retreat.webp', 'Khu vườn (ảnh minh hoạ)', 204, 99, 'Khu vườn')],
    excerpt: 'Khu nghỉ nhỏ ven sông, nhìn ra núi đá vôi Tràng An, có hồ bơi và xe đưa đón bến thuyền.',
    tagline: 'Sáng chèo đò qua hang, chiều ngâm mình trong hồ bơi nhìn núi đá.',
    body: ['Demo · Lodge Ven Sông Tràng An là dữ liệu minh hoạ. Khu nghỉ có hai dãy phòng hướng sông, hồ bơi ngoài trời và xe điện đưa đón tới bến thuyền.', 'Toàn bộ giá, tiện ích và đánh giá chỉ phục vụ kiểm tra giao diện.'],
    highlights: ['Hướng sông', 'Hồ bơi ngoài trời', 'Đưa đón bến thuyền', 'Phù hợp gia đình'],
    rooms: [
      room('demo-rt-tan-sup', 'TAN-SUP', 'Phòng Superior Hướng Sông', 'dlx', 2, 26, 'Hướng sông', 1650000, 'Phòng đôi có ban công nhìn ra sông và núi đá.', { units: 6, breakfast: true }),
      room('demo-rt-tan-suite', 'TAN-STE', 'Suite Gia Đình', 'fam', 4, 48, 'Hướng núi đá', 2400000, 'Suite hai không gian, bồn tắm, phù hợp gia đình 4 người.', { units: 2, breakfast: true }),
    ],
  },
];
const PROPERTY_BY_ID = new Map(PROPERTIES.map((p) => [p.id, p]));
const ROOM_BY_ID = new Map(PROPERTIES.flatMap((p) => p.rooms.map((r) => [r.id, { ...r, property: p }])));

// ---------------------------------------------------------------------------
// inventory: deterministic mix of states per property profile
// ---------------------------------------------------------------------------
/** Returns null when the night has no inventory row ("chưa mở quỹ"). */
export function inventoryDay(roomTypeId, stayDate) {
  const roomInfo = ROOM_BY_ID.get(roomTypeId);
  if (!roomInfo || !isDay(stayDate)) return null;
  const offset = daysBetween(vnToday(), stayDate);
  const profile = roomInfo.property.profile;
  const capacity = roomInfo.units;
  const h = hash(`${roomTypeId}:${stayDate}`) % 20;
  const weekday = new Date(`${stayDate}T00:00:00Z`).getUTCDay();
  if (offset < -30 || offset > 75) return null;
  if (profile === 'sparse' && (offset < 2 || offset > 6)) return null; // opened only for a few nights
  if (offset > 40 && h % 3 === 0) return null; // further out: patchy
  if (!roomInfo.capacityVerified) return null;
  // 'showcase': every state visible in one week (first property in admin + partner screens)
  if (profile === 'showcase' && roomInfo.kind === 'fam' && offset >= 4 && offset <= 8) return null;
  let available = Math.max(1, capacity - (h % 3));
  let stopSell = false;
  let dataState = 'fresh';
  let integrityHold = false;
  if (profile === 'busy' && (weekday === 5 || weekday === 6 || h < 7)) available = 0;
  if (profile === 'mixed' && (weekday === 6 || h < 4)) available = 0;
  if (profile === 'open' && h === 0) available = 0;
  if (profile === 'showcase' && roomInfo.kind === 'std' && (weekday === 6 || offset === 1)) available = 0;
  if (profile === 'showcase' && roomInfo.kind === 'dlx' && (offset === 2 || offset === 5 || h % 7 === 0)) dataState = 'stale';
  if (profile === 'showcase' && roomInfo.kind === 'fam' && offset === 2) stopSell = true;
  if (profile === 'mixed' && h === 19) stopSell = true;
  if (profile === 'stale' && (h % 4 === 0)) dataState = 'stale';
  if (profile === 'stale' && h === 7) integrityHold = true;
  const reservedCount = available === 0 && !stopSell ? capacity : Math.min(capacity - available, h % 2);
  const heldCount = Math.max(0, capacity - available - reservedCount);
  const updatedAt = hoursAgo(2 + (h % 30));
  return {
    roomTypeId, stayDate, capacity, blockedCount: 0, heldCount, reservedCount,
    available: dataState === 'stale' ? null : stopSell ? 0 : available,
    version: 1 + (h % 5), stopSell, saleState: stopSell ? 'stop_sell' : 'on_sale', integrityHold, dataState,
    updatedAt, lastConfirmedAt: dataState === 'stale' ? daysAgo(9) : updatedAt,
    lastConfirmedSource: ['admin', 'partner_portal', 'google_sheets'][h % 3],
  };
}

function nightsFrom(from, to, fallbackCount = 14) {
  const start = isDay(from) ? from : vnToday();
  let count = isDay(to) ? daysBetween(start, to) : fallbackCount;
  if (!(count > 0)) count = fallbackCount;
  return Array.from({ length: Math.min(count, 62) }, (_, i) => shift(start, i));
}

function roomStatusForStay(roomTypeId, dates, quantity = 1) {
  const rows = dates.map((d) => inventoryDay(roomTypeId, d));
  if (rows.some((r) => r?.integrityHold)) return 'needs_check';
  if (rows.some((r) => !r)) return 'unknown';
  if (rows.some((r) => r.stopSell || r.available === 0)) return 'sold_out';
  if (rows.some((r) => r.available === null || r.dataState === 'stale')) return 'unknown';
  return rows.every((r) => r.available >= quantity) ? 'available' : 'sold_out';
}
function propertyStatus(property, dates) {
  const states = property.rooms.filter((r) => r.status === 'active' && r.capacityVerified).map((r) => roomStatusForStay(r.id, dates));
  if (states.includes('available')) return 'available';
  if (states.length && states.every((s) => s === 'sold_out')) return 'sold_out';
  return 'unknown';
}

// ---------------------------------------------------------------------------
// public projections
// ---------------------------------------------------------------------------
const FIRST_PUBLISHED = '2026-03-02T03:00:00.000Z';
function publicRoom(r) {
  return {
    id: r.id, name: r.name, unitKind: r.unitKind, bedroomCount: r.bedroomCount, bathroomCount: r.bathroomCount,
    capacity: r.capacity, areaM2: r.areaM2, view: r.view, description: r.description, amenities: ROOM_AMENITIES[r.kind],
    pricePerNight: r.price, image: ROOM_IMG[r.kind], gallery: [ROOM_IMG[r.kind]], breakfastIncluded: r.breakfastIncluded, maxRooms: Math.min(3, r.units),
  };
}
function publicStay(p, dates) {
  const amen = p.amenities;
  return {
    id: p.id, slug: p.slug, publicPath: `/phong-nghi/${p.slug}`, name: p.name,
    metaTitle: `${p.name} | Dữ liệu minh hoạ`, metaDescription: p.excerpt, noindex: true,
    firstPublishedAt: FIRST_PUBLISHED, lastPublicChangedAt: daysAgo(3),
    type: p.kind, area: /tràng|trang/i.test(p.area) ? 'trang-an' : 'cuc-phuong',
    rating: p.rating, reviewCount: p.reviewCount, checkInTime: '14:00', checkOutTime: '12:00',
    location: p.area, address: p.address, amenities: amen,
    amenityLabels: Object.fromEntries(amen.map((c) => [c, AMENITY_LABEL[c]])),
    cardFeatures: amen.slice(0, 3).map((c) => ({ icon: c, label: AMENITY_LABEL[c] })),
    cardSummary: p.excerpt, tagline: p.tagline, description: p.body.join(' '), body: doc(...p.body),
    highlights: p.highlights, badge: p.featured ? 'Nổi bật' : undefined, featured: p.featured, popularity: p.featured ? 1 : 0,
    image: p.image, home: { image: p.home, location: p.area, tags: amen.slice(0, 2).map((c) => AMENITY_LABEL[c]) },
    gallery: p.gallery, galleryNote: 'Ảnh minh hoạ\ncho dữ liệu demo', host: null,
    roomTypes: p.rooms.filter((r) => r.status === 'active' && r.capacityVerified).map(publicRoom),
    mapPin: null, nearby: [],
    houseRules: [{ icon: 'clock', text: 'Nhận phòng từ 14:00, trả phòng trước 12:00.' }, { icon: 'volume', text: 'Giữ yên tĩnh sau 22:00.' }, { icon: 'lock', text: 'Không hút thuốc trong phòng gỗ.' }],
    notes: ['Thông tin trên trang là dữ liệu minh hoạ cho ảnh chụp giao diện.'],
    isDemo: false,
    ...(dates ? { availabilityStatus: propertyStatus(p, dates), availabilityAsOf: hoursAgo(1) } : {}),
  };
}

// ---------------------------------------------------------------------------
// combos, destinations, articles, pages, reviews
// ---------------------------------------------------------------------------
const combo = (id, slug, title, image, days, nights, audienceTags, fromPriceVnd, featured, subtitle, itinerary, included, excluded) => ({ id, slug, title, image, durationDays: days, durationNights: nights, audienceTags, fromPriceVnd, featured, subtitle, itinerary, included, excluded });
export const COMBOS = [
  combo('demo-combo-rung', 'demo-kham-pha-rung-cuc-phuong-2n1d', 'Demo · Khám Phá Rừng Cúc Phương 2N1Đ', img('combos/kham-pha-rung-cuc-phuong.webp', 'Đường mòn trong rừng (ảnh minh hoạ)', 219, 126), 2, 1, ['thien-nhien', 'nhom'], 1290000, true,
    'Đi bộ xuyên rừng, thăm trung tâm cứu hộ linh trưởng và nghỉ đêm nhà gỗ.',
    [{ day: 1, title: 'Vào rừng', items: ['Đón khách tại cổng vườn', 'Thăm trung tâm cứu hộ linh trưởng', 'Nhận phòng nhà gỗ, ăn tối'] }, { day: 2, title: 'Cây chò ngàn năm', items: ['Đi bộ tới cây chò', 'Ăn trưa tại bản', 'Kết thúc hành trình'] }],
    ['1 đêm nhà gỗ', 'Hướng dẫn viên địa phương', 'Vé vào vườn quốc gia'], ['Chi phí cá nhân', 'Đồ uống ngoài thực đơn']),
  combo('demo-combo-gia-dinh', 'demo-ky-nghi-gia-dinh-xanh-3n2d', 'Demo · Kỳ Nghỉ Gia Đình Xanh 3N2Đ', img('combos/ky-nghi-gia-dinh-xanh.webp', 'Gia đình đạp xe (ảnh minh hoạ)', 214, 126), 3, 2, ['gia-dinh'], 2450000, true,
    'Lịch trình nhẹ nhàng cho gia đình có trẻ nhỏ: đạp xe, bơi hồ, làm bánh quê.',
    [{ day: 1, title: 'Nhận phòng', items: ['Nhận bungalow ven hồ', 'Chèo kayak'] }, { day: 2, title: 'Làng quê', items: ['Đạp xe quanh làng', 'Học làm bánh gai'] }, { day: 3, title: 'Trở về', items: ['Ăn sáng', 'Trả phòng'] }],
    ['2 đêm bungalow', 'Xe đạp cho cả nhà', 'Bữa sáng'], ['Vé tham quan ngoài lịch trình']),
  combo('demo-combo-trang-an', 'demo-trang-an-bai-dinh-2n1d', 'Demo · Tràng An – Bái Đính 2N1Đ', img('combos/trang-an-bai-dinh.webp', 'Thuyền trên sông giữa núi đá (ảnh minh hoạ)', 218, 126), 2, 1, ['cap-doi'], 1590000, true,
    'Đi đò qua hang động Tràng An, thăm chùa Bái Đính, nghỉ đêm lodge ven sông.',
    [{ day: 1, title: 'Tràng An', items: ['Đi đò tuyến hang', 'Nhận phòng lodge'] }, { day: 2, title: 'Bái Đính', items: ['Thăm chùa', 'Ăn trưa dê núi'] }],
    ['1 đêm lodge', 'Vé đò', 'Bữa sáng'], ['Xe di chuyển từ Hà Nội']),
  combo('demo-combo-tron-ven', 'demo-ninh-binh-tron-ven-3n2d', 'Demo · Ninh Bình Trọn Vẹn 3N2Đ', img('combos/ninh-binh-tron-ven.webp', 'Toàn cảnh núi đá và đồng lúa (ảnh minh hoạ)', 218, 126), 3, 2, ['gia-dinh', 'nhom'], 2890000, false,
    'Kết hợp rừng Cúc Phương, Tràng An và Hang Múa trong một chuyến đi.',
    [{ day: 1, title: 'Cúc Phương', items: ['Vào rừng', 'Nghỉ nhà gỗ'] }, { day: 2, title: 'Tràng An', items: ['Đi đò', 'Leo Hang Múa'] }, { day: 3, title: 'Ẩm thực', items: ['Chợ quê', 'Kết thúc'] }],
    ['2 đêm lưu trú', 'Vé tham quan chính', 'Xe đưa đón nội tỉnh'], ['Bữa tối tự túc']),
  combo('demo-combo-team', 'demo-team-building-ven-rung-2n1d', 'Demo · Team Building Ven Rừng 2N1Đ', img('combos/team-building-ninh-binh.webp', 'Nhóm bạn hoạt động ngoài trời (ảnh minh hoạ)', 219, 126), 2, 1, ['nhom'], 1890000, false,
    'Trò chơi đồng đội, lửa trại và đêm nhạc acoustic cho nhóm 15–40 người.',
    [{ day: 1, title: 'Gắn kết', items: ['Trò chơi đồng đội', 'Gala lửa trại'] }, { day: 2, title: 'Khám phá', items: ['Đi bộ đường rừng', 'Trả phòng'] }],
    ['Điều phối viên', 'Âm thanh lửa trại', '1 đêm lưu trú'], ['Đồ uống có cồn']),
  combo('demo-combo-eco', 'demo-eco-retreat-cuc-phuong-2n1d', 'Demo · Eco Retreat Cúc Phương 2N1Đ', img('combos/cuc-phuong-eco-retreat.webp', 'Lodge sinh thái giữa rừng (ảnh minh hoạ)', 218, 126), 2, 1, ['cap-doi', 'thien-nhien'], null, false,
    'Nghỉ dưỡng tĩnh lặng, yoga buổi sáng và tour đêm xem đom đóm. Giá theo yêu cầu.',
    [{ day: 1, title: 'Tĩnh lặng', items: ['Nhận phòng mái lá', 'Tour đêm'] }, { day: 2, title: 'Yoga', items: ['Yoga bình minh', 'Trả phòng'] }],
    ['1 đêm lodge', 'Lớp yoga', 'Tour đêm'], ['Spa']),
];

const dest = (id, slug, name, image, location, tags, featured, summary, activities, notes, badge) => ({ id, slug, name, image, location, tags, featured, summary, activities, notes, badge });
export const DESTINATIONS = [
  dest('demo-dest-rung', 'demo-rung-quoc-gia-cuc-phuong', 'Demo · Rừng Quốc Gia Cúc Phương', img('destinations/vuon-quoc-gia-cuc-phuong.webp', 'Tán rừng nguyên sinh (ảnh minh hoạ)', 222, 116), 'Nho Quan, Ninh Bình', ['thien-nhien', 'gia-dinh'], true,
    'Khu rừng nguyên sinh với cây chò ngàn năm, động vật hoang dã và nhiều cung đường đi bộ.', ['Đi bộ tới cây chò ngàn năm', 'Thăm trung tâm cứu hộ linh trưởng', 'Đạp xe trong rừng'], ['Mang giày bám tốt', 'Chuẩn bị thuốc chống côn trùng'], 'Thiên nhiên'),
  dest('demo-dest-trang-an', 'demo-quan-the-trang-an', 'Demo · Quần Thể Tràng An', img('destinations/trang-an.webp', 'Thuyền trên sông Tràng An (ảnh minh hoạ)', 207, 116), 'Hoa Lư, Ninh Bình', ['thien-nhien', 'check-in'], true,
    'Đi đò qua những hang động xuyên núi, giữa núi đá vôi và mặt nước phẳng lặng.', ['Đi đò tuyến hang', 'Ngắm núi đá vôi', 'Chụp ảnh bình minh'], ['Đi sớm để tránh đông', 'Mang mũ và nước'], 'Di sản'),
  dest('demo-dest-hang-mua', 'demo-hang-mua', 'Demo · Hang Múa', img('destinations/hang-mua.webp', 'Đỉnh núi nhìn xuống đồng lúa (ảnh minh hoạ)', 219, 116), 'Hoa Lư, Ninh Bình', ['check-in'], true,
    'Leo vài trăm bậc đá để ngắm toàn cảnh đồng lúa Tam Cốc từ trên cao.', ['Leo bậc đá lên đỉnh', 'Ngắm hoàng hôn'], ['Tránh giờ nắng gắt'], 'Check-in'),
  dest('demo-dest-dong-nguoi-xua', 'demo-dong-nguoi-xua', 'Demo · Động Người Xưa', img('destinations/dong-nguoi-xua.webp', 'Lòng hang đá vôi (ảnh minh hoạ)', 207, 116), 'Cúc Phương, Ninh Bình', ['van-hoa', 'thien-nhien'], true,
    'Hang động gắn với dấu tích cư trú của người tiền sử trong lòng rừng.', ['Thăm hang', 'Tìm hiểu khảo cổ'], ['Mang đèn pin'], 'Văn hoá'),
  dest('demo-dest-yen-quang', 'demo-ho-yen-quang', 'Demo · Hồ Yên Quang', img('destinations/ho-yen-quang.webp', 'Mặt hồ phẳng lặng (ảnh minh hoạ)', 221, 116), 'Nho Quan, Ninh Bình', ['thien-nhien', 'gia-dinh'], true,
    'Hồ nước yên bình cạnh bìa rừng, thích hợp dã ngoại và ngắm hoàng hôn.', ['Dã ngoại ven hồ', 'Chèo thuyền'], ['Không bơi ở khu vực cấm'], 'Thư giãn'),
  dest('demo-dest-am-thuc', 'demo-am-thuc-ninh-binh', 'Demo · Ẩm Thực Ninh Bình', img('destinations/am-thuc-ninh-binh.webp', 'Mâm cơm đặc sản (ảnh minh hoạ)', 223, 116), 'Ninh Bình', ['am-thuc', 'gia-dinh'], false,
    'Cơm cháy, dê núi, ốc núi và những món quê đáng thử khi về Ninh Bình.', ['Ăn cơm cháy', 'Thử dê núi', 'Đi chợ quê'], ['Hỏi giá trước khi gọi món'], 'Ẩm thực'),
];

const article = (id, slug, title, cover, excerpt, readMinutes) => ({ id, slug, title, cover, excerpt, readMinutes });
export const ARTICLES = [
  article('demo-article-mua', 'demo-cuc-phuong-mua-nao-dep', 'Demo · Cúc Phương mùa nào đẹp nhất?', img('seasons/xuan.webp', 'Rừng mùa xuân (ảnh minh hoạ)', 167, 71), 'Gợi ý chọn mùa đi rừng theo nhịp thời tiết và mùa bướm.', 6),
  article('demo-article-hanh-ly', 'demo-chuan-bi-hanh-ly-di-rung', 'Demo · Chuẩn bị hành lý đi rừng 2 ngày', img('seasons/he.webp', 'Lối mòn mùa hè (ảnh minh hoạ)', 162, 71), 'Danh sách đồ cần mang cho chuyến đi bộ ngắn trong rừng.', 4),
  article('demo-article-tre-em', 'demo-di-rung-cung-tre-nho', 'Demo · Đi rừng cùng trẻ nhỏ', img('seasons/thu.webp', 'Rừng mùa thu (ảnh minh hoạ)', 167, 71), 'Những lưu ý để chuyến đi gia đình an toàn và vui vẻ.', 5),
  article('demo-article-am-thuc', 'demo-5-mon-nen-thu', 'Demo · 5 món nên thử ở Ninh Bình', img('destinations/am-thuc-ninh-binh.webp', 'Món ăn địa phương (ảnh minh hoạ)', 223, 116), 'Từ cơm cháy tới dê núi — gợi ý ăn uống cho người lần đầu đến.', 3),
  article('demo-article-dom-dom', 'demo-mua-dom-dom', 'Demo · Mùa đom đóm trong rừng', img('seasons/dong.webp', 'Rừng về đêm (ảnh minh hoạ)', 162, 71), 'Thời điểm và cách xem đom đóm có trách nhiệm.', 4),
];
export const PAGES = [
  { id: 'demo-page-huy-phong', slug: 'demo-chinh-sach-huy-phong', title: 'Demo · Chính sách huỷ phòng', excerpt: 'Trang minh hoạ cho chuyên trang chính sách.' },
];
export const REVIEWS = [
  { id: 'demo-review-1', contentId: 'demo-prop-rung', author: 'Khách demo Minh Anh', rating: 5, quote: 'Nhà gỗ sạch sẽ, buổi sáng nghe chim hót rất thư giãn. (Đánh giá minh hoạ)', date: '2026-08-12' },
  { id: 'demo-review-2', contentId: 'demo-prop-rung', author: 'Khách demo Gia đình Hùng', rating: 5, quote: 'Trẻ con thích đạp xe trong rừng, chủ nhà nhiệt tình. (Đánh giá minh hoạ)', date: '2026-07-28' },
  { id: 'demo-review-3', contentId: 'demo-prop-dong-chuong', author: 'Khách demo Thu Trang', rating: 4, quote: 'Hoàng hôn trên hồ rất đẹp, bếp chung hơi nhỏ. (Đánh giá minh hoạ)', date: '2026-06-03' },
  { id: 'demo-review-4', contentId: 'demo-prop-thung-nham', author: 'Khách demo Quốc Bảo', rating: 5, quote: 'Cơm quê ngon, đồng lúa mùa gặt tuyệt đẹp. (Đánh giá minh hoạ)', date: '2026-09-15' },
];

function publicCombo(c) {
  return {
    id: c.id, slug: c.slug, publicPath: `/combo-du-lich/${c.slug}`, title: c.title, metaTitle: `${c.title} | Dữ liệu minh hoạ`, metaDescription: c.subtitle, noindex: true,
    firstPublishedAt: FIRST_PUBLISHED, lastPublicChangedAt: daysAgo(5), subtitle: c.subtitle,
    body: doc(c.subtitle, 'Lịch trình, giá và dịch vụ trong combo này là dữ liệu minh hoạ để chụp ảnh giao diện, không phải sản phẩm đang bán.'),
    image: c.image, durationDays: c.durationDays, durationNights: c.durationNights, audienceTags: c.audienceTags,
    fromPriceVnd: c.fromPriceVnd, priceUnit: 'person', badge: { label: c.featured ? 'Nổi bật' : 'Đang mở', kind: c.featured ? 'featured' : 'standard' },
    itinerary: c.itinerary, included: c.included, excluded: c.excluded, terms: ['Giá minh hoạ, không áp dụng thực tế.'], departures: [], featured: c.featured, isDemo: false,
  };
}
function publicDestination(d) {
  return {
    id: d.id, slug: d.slug, publicPath: `/diem-den/${d.slug}`, name: d.name, metaTitle: `${d.name} | Dữ liệu minh hoạ`, metaDescription: d.summary, noindex: true,
    firstPublishedAt: FIRST_PUBLISHED, lastPublicChangedAt: daysAgo(8), featured: d.featured, category: d.tags[0], location: d.location,
    summary: d.summary, description: `${d.summary} Nội dung này là dữ liệu minh hoạ cho ảnh chụp giao diện.`,
    body: doc(d.summary, 'Nội dung này là dữ liệu minh hoạ cho ảnh chụp giao diện; thông tin thực tế cần được xác minh trước khi xuất bản.'),
    image: d.image, gallery: [d.image], tags: d.tags, activities: d.activities, notes: d.notes, badge: d.badge, isDemo: false,
  };
}
function publicArticle(a) {
  return {
    id: a.id, slug: a.slug, path: `/bai-viet/${a.slug}`, title: a.title, excerpt: a.excerpt,
    body: doc(a.excerpt, 'Bài viết minh hoạ cho ảnh chụp giao diện. Nội dung không phải hướng dẫn chính thức.'),
    metaTitle: a.title, metaDescription: a.excerpt, noindex: true, cover: a.cover, authorName: 'Biên tập viên demo', readMinutes: a.readMinutes,
    firstPublishedAt: FIRST_PUBLISHED, lastPublicChangedAt: daysAgo(2), isDemo: false,
  };
}
function publicPage(p) {
  return {
    id: p.id, title: p.title, slug: p.slug, path: `/chuyen-trang/${p.slug}`, excerpt: p.excerpt,
    body: doc('Huỷ trước 7 ngày: hoàn 100%. Huỷ trước 3 ngày: hoàn 50%. (Chính sách minh hoạ, không áp dụng thực tế.)'),
    metaTitle: p.title, metaDescription: p.excerpt, noindex: true, cover: null, updatedAt: daysAgo(10), firstPublishedAt: FIRST_PUBLISHED, lastPublicChangedAt: daysAgo(10),
  };
}

// ---------------------------------------------------------------------------
// media library (re-uses images already shipped in public/)
// ---------------------------------------------------------------------------
const SITE_IMAGES = {
  hero: img('hero-cuc-phuong-balcony.webp', 'Hiên nhà gỗ nhìn ra núi rừng (ảnh minh hoạ)', 1672, 941),
  partner: img('pages/partner-homestay.webp', 'Tranh màu nước homestay nhà sàn (ảnh minh hoạ)', 1200, 600),
  promo: img('experience-promo.webp', 'Du khách bên dòng nước (ảnh minh hoạ)', 275, 271),
  staysHero: img('pages/stays-hero.webp', 'Không gian lưu trú giữa núi rừng (ảnh minh hoạ)', 1448, 212),
  destinationsHero: img('pages/destinations-hero.webp', 'Phong cảnh Ninh Bình (ảnh minh hoạ)', 1448, 228),
  combosHero: img('pages/combo-hero.webp', 'Phong cảnh núi rừng (ảnh minh hoạ)', 1448, 172),
  bookingHero: img('pages/checkout-hero.webp', 'Hiên nhà nhìn ra núi (ảnh minh hoạ)', 1448, 138),
  contactHero: img('pages/contact-hero.webp', 'Thung lũng xanh (ảnh minh hoạ)', 1448, 250),
  mapStays: img('pages/map-stays.webp', 'Bản đồ minh hoạ nơi lưu trú', 266, 192),
  mapDestinations: img('pages/map-destinations.webp', 'Bản đồ minh hoạ điểm đến', 495, 142),
  mapContact: img('pages/map-contact.webp', 'Bản đồ minh hoạ', 456, 253),
  advisor: img('people/advisor-profile.webp', 'Chân dung người tư vấn (ảnh minh hoạ)', 117, 135),
  advisorStays: img('pages/advisor-stays.webp', 'Người tư vấn (ảnh minh hoạ)', 276, 196),
  scenic: img('pages/contact-scenic.webp', 'Cảnh quan (ảnh minh hoạ)', 465, 160),
  itinerary: img('pages/itinerary-photo.webp', 'Ảnh hành trình (ảnh minh hoạ)', 130, 113),
  note: img('people/advisor-note.webp', 'Ghi chú người tư vấn (ảnh minh hoạ)', 102, 110),
};
const MEDIA_BY_SRC = new Map();
const MEDIA = [];
function registerMedia(asset) {
  if (!asset?.src) return null;
  if (MEDIA_BY_SRC.has(asset.src)) return MEDIA_BY_SRC.get(asset.src);
  const n = MEDIA.length + 1;
  const file = asset.src.split('/').pop();
  const item = {
    id: `demo-media-${String(n).padStart(3, '0')}`, url: asset.src, storageKey: `demo/${file}`, originalFilename: file, mimeType: 'image/webp',
    byteSize: String(18000 + ((hash(asset.src) % 90) * 1000)), width: asset.width, height: asset.height, altText: asset.alt, caption: asset.caption ?? null,
    renditions: {}, createdAt: daysAgo(40 - (n % 30)), usage: { count: n % 3, inUse: n % 3 > 0 },
  };
  MEDIA.push(item);
  MEDIA_BY_SRC.set(asset.src, item);
  return item;
}
const SITE_MEDIA = Object.fromEntries(Object.entries(SITE_IMAGES).map(([key, asset]) => [key, registerMedia(asset).id]));
for (const p of PROPERTIES) { registerMedia(p.image); p.gallery.forEach(registerMedia); }
Object.values(ROOM_IMG).forEach(registerMedia);
for (const c of COMBOS) registerMedia(c.image);
for (const d of DESTINATIONS) registerMedia(d.image);
for (const a of ARTICLES) registerMedia(a.cover);
const mediaRef = (asset) => registerMedia(asset);
const albumItem = (asset) => { const m = mediaRef(asset); return { mediaId: m.id, url: m.url, alt: m.altText ?? '' }; };
const siteAssets = Object.fromEntries(MEDIA.map((m) => [m.id, { id: m.id, src: m.url, alt: m.altText, width: m.width, height: m.height, caption: m.caption ?? undefined }]));

// ---------------------------------------------------------------------------
// settings (registry defaults + demo overrides)
// ---------------------------------------------------------------------------
const settingOverrides = {
  'brand.identity': { name: 'Cúc Phương Travel', shortName: 'Cúc Phương Travel', tagline: 'Lưu trú bản địa, trải nghiệm thật', description: doc('Bản demo giao diện với dữ liệu hư cấu về lưu trú và hành trình Cúc Phương – Ninh Bình.'), logoMediaId: null, faviconMediaId: null },
  'brand.contact': { phone: '0900000000', hotline: '0900000000', zaloUrl: 'https://zalo.me/0900000000', email: 'demo@example.invalid', address: null, mapUrl: null },
  'brand.social': { facebook: 'https://facebook.com/', instagram: 'https://instagram.com/', youtube: 'https://youtube.com/', tiktok: null },
  'brand.businessHours': { weekdays: '07:30 – 21:00', weekend: '07:30 – 22:00', note: doc('Giờ làm việc minh hoạ.') },
  'site.header': { mottoLine1: 'Du lịch bản địa', mottoLine2: 'Kết nối những giá trị thật', ctaLabel: 'Đặt ngay', ctaTarget: '/phong-nghi' },
  'site.footer': { quote: 'Những chuyến đi không chỉ để đến, mà còn để lưu lại những trải nghiệm đáng nhớ.', quoteAuthor: 'Cúc Phương Travel', motto: 'Du lịch gần hơn những giá trị bản địa', copyrightText: '© {year} Cúc Phương Travel · Bản demo dữ liệu minh hoạ' },
  'home.sections': { order: ['hero', 'search', 'trust', 'featured', 'why', 'contact', 'stats', 'partner', 'reviews', 'combos', 'destinations', 'promo', 'faq'], hidden: ['combos', 'destinations', 'promo', 'faq'] },
  'home.hero': { enabled: true, kicker: 'Khám phá Cúc Phương', titleLine1: 'Lưu trú giữa thiên nhiên,', titleLine2: 'trải nghiệm những điều thật', signature: 'Những chuyến đi đẹp hơn khi có người bản địa đồng hành', description: doc('Cúc Phương Travel giúp bạn tìm nơi lưu trú phù hợp và lên hành trình khám phá Cúc Phương – Ninh Bình, với sự tư vấn trực tiếp từ người địa phương.'), note: 'Cúc Phương đợi bạn...', imageMediaId: SITE_MEDIA.hero, mobileImageMediaId: null },
  'home.trust': { enabled: true, items: [
    { id: 'stay', icon: 'leaf', line1: 'Lưu trú chọn lọc', line2: null, enabled: true },
    { id: 'support', icon: 'heart', line1: 'Hỗ trợ tận tâm', line2: null, enabled: true },
    { id: 'local', icon: 'users', line1: 'Trải nghiệm bản địa', line2: null, enabled: true },
    { id: 'confirm', icon: 'shield', line1: 'Xác nhận rõ ràng', line2: null, enabled: true },
  ] },
  'home.why': { enabled: true, title: 'Vì sao chọn Cúc Phương Travel?', intro: doc('Một dịch vụ nhỏ, luôn đặt trải nghiệm của bạn lên hàng đầu.'), reasons: [
    { id: 'support', icon: 'message', title: 'Tư vấn cá nhân, tận tâm', description: 'Trao đổi trực tiếp để gợi ý chỗ ở phù hợp với nhu cầu và lịch trình của bạn.', enabled: true },
    { id: 'local', icon: 'leaf', title: 'Hiểu rõ địa phương', description: 'Người địa phương gợi ý điểm đến và trải nghiệm quanh Cúc Phương – Ninh Bình.', enabled: true },
    { id: 'confirm', icon: 'bolt', title: 'Xác nhận rõ ràng, minh bạch', description: 'Tình trạng phòng và giá được xác nhận trước khi bạn hoàn tất đặt phòng.', enabled: true },
    { id: 'stay', icon: 'house', title: 'Lưu trú được chọn lọc', description: 'Chỉ hiển thị những nơi lưu trú đã được cập nhật thông tin và xuất bản.', enabled: true },
  ] },
  'home.featured': { enabled: true, title: 'Lưu trú nổi bật', subtitle: 'Những chỗ ở được chọn lọc tại Cúc Phương – Ninh Bình', ctaLabel: 'Xem tất cả', ctaTarget: '/phong-nghi', limit: 4, selectionMode: 'featured' },
  'home.stats': { enabled: true, title: 'Những con số biết nói', note: 'Số liệu minh hoạ trong bản demo', items: [
    { id: 'bookings', icon: 'calendar', value: '120+', label: 'Lượt đặt (demo)', enabled: true },
    { id: 'happy', icon: 'smile', value: '96%', label: 'Khách hài lòng (demo)', enabled: true },
    { id: 'partners', icon: 'star', value: '12', label: 'Đối tác lưu trú (demo)', enabled: true },
    { id: 'guests', icon: 'users', value: '480+', label: 'Lữ khách (demo)', enabled: true },
  ] },
  'home.partner': { enabled: true, title: 'Cùng nhau phát triển du lịch địa phương', description: doc('Bạn là chủ homestay, bungalow hoặc nhà nghỉ tại Cúc Phương – Ninh Bình? Đăng ký cổng đối tác để giới thiệu nơi lưu trú của bạn và cập nhật thông tin phòng cùng Cúc Phương Travel.'), quote: 'Lưu giữ những giá trị địa phương, cùng nhau', primaryLabel: 'Đăng ký hợp tác', primaryTarget: '/doi-tac?mode=register', secondaryLabel: 'Tìm hiểu thêm', secondaryTarget: '/lien-he', imageMediaId: SITE_MEDIA.partner },
  'home.combos': { enabled: true, title: 'Combo du lịch', subtitle: 'Gợi ý hành trình và dịch vụ được cập nhật trên hệ thống', ctaLabel: 'Xem combo', ctaTarget: '/combo-du-lich', limit: 3 },
  'home.destinations': { enabled: true, title: 'Khám phá Cúc Phương – Ninh Bình', subtitle: 'Những điểm đến được cập nhật trên hệ thống', ctaLabel: 'Xem tất cả', ctaTarget: '/diem-den', limit: 6, selectionMode: 'featured' },
  'home.testimonials': { enabled: true, title: 'Khách hàng nói về chúng mình', ctaLabel: 'Xem thêm', limit: 2 },
  'home.promo': { enabled: true, titleLine1: 'Không chỉ là', titleLine2: 'một nơi để nghỉ...', body: doc('Cúc Phương còn có những trải nghiệm thiên nhiên và hành trình đáng để bạn dành thời gian khám phá.'), ctaLabel: 'Khám phá ngay', ctaTarget: '/diem-den', quote: 'Đi để gần thiên nhiên hơn.', imageMediaId: SITE_MEDIA.promo },
  'home.contactPanel': { enabled: true, title: 'Bạn cần tư vấn riêng?', description: doc('Liên hệ để được gợi ý lưu trú và lịch trình phù hợp cho chuyến đi Cúc Phương – Ninh Bình.'), advisorName: 'Đinh Vân', advisorRole: 'Người tư vấn địa phương', phoneCtaLabel: 'Gọi cho Đinh Vân', zaloCtaLabel: 'Nhắn Zalo', note: 'Xin chào! Mình là người địa phương, cùng bạn khám phá Cúc Phương!', imageMediaId: null },
  'home.faq': { enabled: true, title: 'Câu hỏi thường gặp', items: [
    { id: 'preparation', enabled: true, question: 'Tôi cần cung cấp gì khi muốn được tư vấn?', answer: doc('Thời gian dự kiến, số người, nhu cầu lưu trú và những điểm bạn muốn trải nghiệm.') },
    { id: 'confirmation', enabled: true, question: 'Thông tin phòng và giá có được xác nhận trước khi đặt không?', answer: doc('Có. Tình trạng phòng, mức giá và điều kiện đặt sẽ được xác nhận trước khi hoàn tất yêu cầu.') },
    { id: 'call', enabled: true, question: 'Tôi có thể gọi trực tiếp để trao đổi không?', answer: doc('Có. Đây là số điện thoại minh hoạ trong bản demo.') },
  ] },
  'contact.page': { enabled: true, heroEyebrow: 'Liên hệ', title: 'Cùng lên kế hoạch cho chuyến đi Cúc Phương', intro: doc('Chia sẻ nhu cầu lưu trú, thời gian dự kiến và số người để được hỗ trợ dễ dàng hơn.'), heroImageMediaId: SITE_MEDIA.contactHero, promises: [],
    formTitle: 'Gửi yêu cầu tư vấn', formIntro: doc('Thông tin của bạn được dùng để liên hệ và hỗ trợ cho yêu cầu này.'), formMessageLabel: 'Bạn đang cần hỗ trợ điều gì?', formMessagePlaceholder: 'Ví dụ: cần phòng cho gia đình, dự kiến đi 2 ngày 1 đêm...', formPrivacyNote: null, formSubmitLabel: 'Gửi yêu cầu', formSuccessMessage: doc('Đã nhận yêu cầu (demo).'),
    quickTitle: 'Liên hệ trực tiếp', quickIntro: doc('Bạn có thể gọi trực tiếp nếu cần trao đổi nhanh.'), hoursTitle: 'Giờ làm việc', advisorName: 'Đinh Vân', advisorRole: 'Người tư vấn địa phương', advisorDescription: doc('Hỗ trợ gợi ý lưu trú và hành trình tại khu vực Cúc Phương – Ninh Bình.'), advisorImageMediaId: null, advisorHighlights: [], advisorNote: null,
    mapTitle: 'Khu vực hỗ trợ', mapDescription: doc('Cúc Phương – Tràng An – Tam Cốc (bản đồ minh hoạ).'), mapImageMediaId: SITE_MEDIA.mapContact, scenicImageMediaId: SITE_MEDIA.scenic, scriptNote: null, showFaq: false, faqTitle: null, faqs: [] },
  // Same truthful copy as the backend bootstrap; only contact details are demo values.
  'about.page': { enabled: true, heroEyebrow: 'Về mình', title: 'Xin chào, mình là Đinh Vân', intro: doc('Người tư vấn địa phương của Cúc Phương Travel – một dịch vụ nhỏ, độc lập, giúp bạn chọn chỗ nghỉ và lên lịch trình cho chuyến đi Cúc Phương – Ninh Bình.'), heroImageMediaId: SITE_MEDIA.hero,
    phoneCtaLabel: 'Gọi cho Đinh Vân', zaloCtaLabel: 'Nhắn Zalo', contactCtaLabel: 'Gửi yêu cầu tư vấn',
    storyTitle: 'Câu chuyện của mình', greeting: 'Rất vui được làm quen với bạn!',
    story: { type: 'doc', content: [
      'Cúc Phương Travel là một dịch vụ nhỏ và độc lập, do mình – Đinh Vân – trực tiếp phụ trách. Mình tư vấn, hỗ trợ đặt chỗ nghỉ và gợi ý lịch trình cho những ai muốn đến Cúc Phương và các điểm quanh Ninh Bình.',
      'Trước khi giới thiệu một chỗ nghỉ hay một lịch trình, mình tự kiểm tra thông tin và chỉ gợi ý những gì phù hợp với nhu cầu của bạn. Điều gì chưa chắc chắn, mình sẽ nói rõ để bạn cân nhắc.',
      'Từ lúc bạn bắt đầu tìm hiểu cho đến khi đã tới nơi, bạn có thể gọi điện hoặc nhắn Zalo để mình hỗ trợ.',
    ].map((text) => ({ type: 'paragraph', content: [{ type: 'text', text }] })) },
    portraitMediaId: null, signatureNote: 'Hẹn gặp bạn ở Cúc Phương!', quote: 'Mình chỉ gợi ý những chỗ nghỉ và lịch trình mà mình đã tự kiểm tra.',
    valuesTitle: 'Điều mình luôn giữ', valuesIntro: 'Những nguyên tắc nhỏ để chuyến đi của bạn rõ ràng và yên tâm hơn.', values: [
      { id: 'checked', enabled: true, icon: 'check', title: 'Tự kiểm tra trước khi gợi ý', text: 'Mình xem kỹ thông tin chỗ nghỉ và lịch trình trước khi giới thiệu cho bạn.' },
      { id: 'personal', enabled: true, icon: 'message', title: 'Tư vấn theo nhu cầu thật', text: 'Gợi ý dựa trên thời gian, số người và mong muốn của chính bạn.' },
      { id: 'clear', enabled: true, icon: 'shield', title: 'Rõ ràng, minh bạch', text: 'Tình trạng phòng, giá và điều kiện đặt được xác nhận với bạn trước khi hoàn tất.' },
      { id: 'reachable', enabled: true, icon: 'phone', title: 'Luôn giữ liên lạc', text: 'Bạn có thể gọi điện hoặc nhắn Zalo cho mình trong suốt chuyến đi.' },
    ],
    stepsTitle: 'Cách mình đồng hành', stepsIntro: 'Bốn bước đơn giản, từ lúc bạn liên hệ đến khi lên đường.', steps: [
      { id: 'share', enabled: true, title: 'Bạn chia sẻ nhu cầu', text: 'Gọi, nhắn Zalo hoặc gửi yêu cầu: thời gian dự kiến, số người và kiểu chỗ nghỉ bạn thích.' },
      { id: 'suggest', enabled: true, title: 'Mình kiểm tra và gợi ý', text: 'Mình kiểm tra chỗ nghỉ, lịch trình phù hợp rồi gửi bạn vài lựa chọn kèm lưu ý.' },
      { id: 'confirm', enabled: true, title: 'Xác nhận rõ ràng', text: 'Tình trạng phòng, giá và điều kiện đặt được xác nhận trước khi bạn quyết định.' },
      { id: 'support', enabled: true, title: 'Hỗ trợ khi bạn tới nơi', text: 'Cần hỏi đường hay đổi kế hoạch giữa chuyến, bạn cứ gọi hoặc nhắn cho mình.' },
    ],
    areasTitle: 'Khu vực mình hỗ trợ', areasIntro: 'Cúc Phương và những điểm quanh Ninh Bình – nơi mình giúp bạn chọn chỗ nghỉ và lên lịch trình.', areas: [
      { id: 'national-park', enabled: true, icon: 'trees', title: 'Vườn quốc gia Cúc Phương', text: 'Rừng nguyên sinh, đường mòn và các điểm tham quan trong vườn quốc gia.', linkLabel: 'Xem điểm đến', linkTarget: '/diem-den', imageMediaId: null },
      { id: 'stays', enabled: true, icon: 'house', title: 'Chỗ nghỉ quanh Cúc Phương', text: 'Homestay, nhà nghỉ, bungalow gần rừng – chọn theo nhu cầu và ngân sách của bạn.', linkLabel: 'Xem chỗ nghỉ', linkTarget: '/phong-nghi', imageMediaId: null },
      { id: 'ninh-binh', enabled: true, icon: 'mountain', title: 'Các điểm quanh Ninh Bình', text: 'Gợi ý kết hợp Cúc Phương với những điểm tham quan khác trong tỉnh Ninh Bình.', linkLabel: 'Xem điểm đến', linkTarget: '/diem-den', imageMediaId: null },
    ],
    showFaq: true, faqTitle: 'Bạn có thể đang thắc mắc', faqs: [
      { id: 'who', enabled: true, question: 'Cúc Phương Travel là công ty du lịch lớn phải không?', answer: doc('Không. Cúc Phương Travel là một dịch vụ nhỏ, độc lập, do Đinh Vân trực tiếp tư vấn và hỗ trợ khách.') },
      { id: 'checked', enabled: true, question: 'Chỗ nghỉ có được kiểm tra trước khi gợi ý không?', answer: doc('Có. Đinh Vân tự kiểm tra thông tin chỗ nghỉ và lịch trình trước khi gợi ý; tình trạng phòng và giá được xác nhận với bạn trước khi đặt.') },
      { id: 'contact', enabled: true, question: 'Làm sao để liên hệ với Đinh Vân?', answer: doc('Bạn có thể gọi theo số điện thoại trên trang này, nhắn Zalo hoặc gửi yêu cầu ở trang Liên hệ.') },
    ],
    ctaTitle: 'Bắt đầu chuyến đi Cúc Phương của bạn', ctaText: doc('Kể cho mình nghe bạn định đi khi nào, đi mấy người – mình sẽ gợi ý chỗ nghỉ và lịch trình phù hợp.'), ctaStaysLabel: 'Xem chỗ nghỉ',
    areaServed: 'Cúc Phương, Ninh Bình', seoTitle: 'Về mình – Đinh Vân', seoDescription: 'Đinh Vân – người tư vấn địa phương của Cúc Phương Travel, tự kiểm tra và gợi ý chỗ nghỉ, lịch trình Cúc Phương – Ninh Bình, hỗ trợ bạn qua điện thoại, Zalo.' },
  'catalog.staysPage': { heroTitle: 'Phòng nghỉ Cúc Phương', heroKicker: 'Gợi ý lưu trú cho hành trình gần thiên nhiên', heroDescription: doc('Khám phá các nơi lưu trú (dữ liệu minh hoạ) hoặc liên hệ để trao đổi nhu cầu của bạn.'), heroImageMediaId: SITE_MEDIA.staysHero, heroNote: null,
    reviewsTitle: 'Khách hàng nói gì', reviewsSubtitle: doc('Đánh giá minh hoạ trong bản demo.'), advisorTitle: 'Cần gợi ý chỗ nghỉ?', advisorDescription: doc('Gọi để trao đổi về thời gian đi, số người và nhu cầu lưu trú.'), advisorCtaLabel: 'Liên hệ tư vấn', advisorImageMediaId: null, advisorBenefits: [],
    faqTitle: 'Câu hỏi về lưu trú', faqs: [{ id: 'checkin', enabled: true, question: 'Giờ nhận phòng là mấy giờ?', answer: doc('Thường từ 14:00, tuỳ cơ sở (thông tin minh hoạ).') }, { id: 'kids', enabled: true, question: 'Có phù hợp với trẻ nhỏ không?', answer: doc('Nhiều cơ sở có phòng gia đình; hãy hỏi trước khi đặt.') }],
    mapTitle: 'Bản đồ nơi lưu trú', mapImageMediaId: SITE_MEDIA.mapStays, emptyResultTitle: 'Chỗ nghỉ đang được cập nhật', emptyResultDescription: doc('Nội dung đang được cập nhật.'), emptyResultCtaLabel: 'Liên hệ tư vấn', emptyHelpTitle: null, emptyHelpDescription: null, emptyHelpCtaLabel: null },
  'catalog.stayDetail': { introTitle: 'Giới thiệu', introQuote: null, introQuoteAuthor: 'Chủ nhà demo', roomsTitle: 'Hạng phòng', amenitiesTitle: 'Tiện ích', reviewsTitle: 'Đánh giá của khách', factsTitle: 'Thông tin nhanh', checkInLabel: 'Nhận phòng', checkOutLabel: 'Trả phòng', breakfastLabel: 'Bữa sáng', houseRulesTitle: 'Nội quy', notesTitle: 'Lưu ý', notesThanks: 'Cảm ơn bạn đã quan tâm!', bookingNote: 'Giá và tình trạng phòng là dữ liệu minh hoạ.' },
  'catalog.destinationDetail': { eyebrow: 'Điểm đến', activitiesTitle: 'Hoạt động gợi ý', notesTitle: 'Lưu ý' },
  'catalog.destinationsPage': { heroKicker: 'Khám phá theo cách của bạn', heroTitle: 'Điểm đến Cúc Phương – Ninh Bình', heroDescription: doc('Gợi ý những điểm đến (dữ liệu minh hoạ) cho hành trình gần thiên nhiên.'), heroQuote: null, heroImageMediaId: SITE_MEDIA.destinationsHero, listTitle: 'Khám phá điểm đến', listSubtitle: doc('Tìm cảm hứng cho chuyến đi theo cách của riêng bạn.'), advisorCtaLabel: 'Liên hệ tư vấn', emptyTitle: 'Điểm đến đang được cập nhật', emptyDescription: doc('Đang cập nhật nội dung.'),
    noteTitle: null, noteBody: null, noteAuthor: null, noteImageMediaId: null, mapImageMediaId: SITE_MEDIA.mapDestinations, itineraryImageMediaId: null, itineraryTitle: null, itinerarySubtitle: null, itineraries: [], seasonsTitle: null, seasonsSubtitle: null, seasons: [] },
  'catalog.combosPage': { heroTitle: 'Combo du lịch Cúc Phương', heroKicker: 'Chọn hành trình phù hợp', heroDescription: doc('Các combo trong bản demo là dữ liệu minh hoạ.'), heroImageMediaId: SITE_MEDIA.combosHero, listTitle: 'Combo du lịch', listSubtitle: doc('Chọn nhịp điệu phù hợp cho chuyến đi của bạn.'), advisorCtaLabel: 'Liên hệ tư vấn', emptyTitle: 'Combo du lịch đang được chuẩn bị', emptyDescription: doc('Bạn có thể liên hệ để chia sẻ nhu cầu chuyến đi.'), emptyCtaLabel: 'Liên hệ tư vấn',
    quoteLeft: null, quoteRight: null, benefitsTitle: null, benefits: [], stepsTitle: null, stepsSubtitle: null, steps: [], reviewsTitle: 'Khách hàng chia sẻ', faqTitle: null, faqs: [] },
  'catalog.bookingPage': { heroTitle: 'Đặt phòng Cúc Phương', heroKicker: 'Bắt đầu từ nhu cầu của bạn', heroDescription: doc('Chọn nơi lưu trú hoặc liên hệ để được hỗ trợ.'), heroImageMediaId: SITE_MEDIA.bookingHero, helpTitle: 'Cần hỗ trợ đặt phòng?', helpDescription: doc('Gọi để trao đổi trực tiếp về nhu cầu lưu trú.') },
  'catalog.staticPages': { eyebrow: 'Thông tin hữu ích', title: 'Chuyên trang', description: doc('Những thông tin hữu ích để chuẩn bị chuyến đi thuận tiện hơn.') },
  'catalog.articlesPage': { eyebrow: 'Cẩm nang Cúc Phương', title: 'Bài viết', description: doc('Góc đọc dành cho những ai yêu hành trình khám phá Cúc Phương – Ninh Bình.') },
  'seo.defaults': { titleTemplate: '%s | Cúc Phương Travel', defaultTitle: 'Cúc Phương Travel — Cúc Phương, Ninh Bình', defaultDescription: 'Bản demo giao diện với dữ liệu minh hoạ.', canonicalBase: null, ogMediaId: null, robotsIndex: false, verification: { google: null, bing: null } },
  'ops.dataMode': { usesDemoData: true, demoBanner: 'Dữ liệu minh hoạ cho ảnh chụp giao diện.' },
  'partnerPortal.enabled': true,
  'inventoryCalendar.enabled': true,
  'publicAvailability.enabled': true,
  'sheetsSync.enabled': false,
  'sheetsSync.importEnabled': false,
};
// DEMO_SEO_INDEX=1 flips the demo into an "approved, indexable" site so JSON-LD and
// canonical tags can be checked; pair it with SEO_INDEXING_ALLOWED=true and
// SEO_APPROVED_CANONICAL_ORIGIN=https://cucphuongtravel.example.com on the Next server.
if (process.env.DEMO_SEO_INDEX === '1') {
  settingOverrides['seo.defaults'] = { ...settingOverrides['seo.defaults'], canonicalBase: 'https://cucphuongtravel.example.com', robotsIndex: true };
  settingOverrides['ops.dataMode'] = { ...settingOverrides['ops.dataMode'], usesDemoData: false };
  // The frontend policy (src/lib/seo/policy.ts) only accepts a plain-string brand description.
  settingOverrides['brand.identity'] = { ...settingOverrides['brand.identity'], description: 'Bản demo giao diện với dữ liệu hư cấu về lưu trú và hành trình Cúc Phương – Ninh Bình.' };
}
const SETTINGS = REGISTRY.map((d, i) => {
  const custom = Object.prototype.hasOwnProperty.call(settingOverrides, d.key);
  const base = d.defaultValue;
  const value = custom ? (base && typeof base === 'object' && !Array.isArray(base) ? { ...base, ...settingOverrides[d.key] } : settingOverrides[d.key]) : base;
  return { key: d.key, group: d.group, label: d.label, ...(d.description ? { description: d.description } : {}), isPublic: d.isPublic, value, isDefault: !custom, version: custom ? 1 + (i % 4) : 0, updatedAt: custom ? daysAgo(1 + (i % 20)) : null };
});

// ---------------------------------------------------------------------------
// personas
// ---------------------------------------------------------------------------
export const ADMIN_PERMISSIONS = [
  'dashboard.read', 'booking.read', 'booking.write', 'booking.cancel', 'catalog.read', 'catalog.write', 'inventory.read', 'inventory.write',
  'content.read', 'content.write', 'content.publish', 'media.read', 'media.write', 'media.delete', 'crm.read', 'crm.write',
  'coupon.read', 'coupon.write', 'finance.read', 'finance.write', 'refund.approve', 'report.read', 'settings.read', 'settings.write',
  'partner.read', 'partner.review', 'partner.grant', 'sheets.read', 'sheets.manage', 'user.read', 'user.write', 'audit.read',
];
export const USERS = {
  admin: { id: 'demo-user-owner', email: 'owner@demo.invalid', fullName: 'Quản Trị Demo', roles: ['owner'], permissions: ADMIN_PERMISSIONS, sessionId: 'demo-session-admin' },
  partner: { id: 'demo-user-partner', email: 'doitac@demo.invalid', fullName: 'Đối Tác Demo Nhà Rừng', roles: ['partner'], permissions: [], sessionId: 'demo-session-partner' },
};

// ---------------------------------------------------------------------------
// admin: customers, bookings, inquiries, coupons, payments
// ---------------------------------------------------------------------------
const today = vnToday();
const CUSTOMERS = [
  ['demo-cus-1', 'Khách Demo Nguyễn An', '0900000101', 'an.demo@example.invalid', 'Hà Nội', 'website', 'family'],
  ['demo-cus-2', 'Khách Demo Trần Bình', '0900000102', null, 'Hải Phòng', 'phone', 'couple'],
  ['demo-cus-3', 'Khách Demo Lê Chi', '0900000103', 'chi.demo@example.invalid', 'Nam Định', 'zalo', 'group'],
  ['demo-cus-4', 'Khách Demo Phạm Dũng', '0900000104', 'dung.demo@example.invalid', 'Hà Nội', 'website', 'family'],
  ['demo-cus-5', 'Khách Demo Hoàng Em', '0900000105', null, 'Thanh Hoá', 'referral', 'solo'],
  ['demo-cus-6', 'Khách Demo Vũ Giang', '0900000106', 'giang.demo@example.invalid', 'TP. Hồ Chí Minh', 'facebook', 'couple'],
].map(([id, fullName, phone, email, city, source, groupKind], i) => ({ id, fullName, phone, email, city, need: ['Phòng gia đình cuối tuần', 'Phòng đôi yên tĩnh', 'Đoàn 12 người', 'Combo 3N2Đ', 'Một đêm gần cổng vườn', 'Nghỉ dưỡng ven sông'][i], note: 'Hồ sơ khách hàng hư cấu cho ảnh chụp.', source, groupKind, version: 1 + i, createdAt: daysAgo(30 - i * 4) }));

const bk = (n, cusIdx, roomTypeId, status, inOffset, nights, adults, children, createdDaysAgo) => {
  const r = ROOM_BY_ID.get(roomTypeId);
  const checkIn = shift(today, inOffset), checkOut = shift(today, inOffset + nights);
  const total = r.price * nights;
  const c = CUSTOMERS[cusIdx];
  return {
    id: `demo-booking-${n}`, publicCode: `DV-DEMO-${1000 + n}`, bookingStatus: status, paymentPlan: 'deposit', channel: n % 3 === 0 ? 'admin' : 'website',
    checkIn: `${checkIn}T00:00:00.000Z`, checkOut: `${checkOut}T00:00:00.000Z`, adults, children, totalVnd: String(total), dueNowVnd: String(Math.round(total * 0.3)),
    version: 1 + (n % 3), expiresAt: status === 'pending_confirmation' ? new Date(Date.now() + (40 + n) * 60_000).toISOString() : null, createdAt: daysAgo(createdDaysAgo),
    customer: { fullName: c.fullName, phone: c.phone, email: c.email }, customerId: c.id, propertyId: r.property.id,
    lines: [{ id: `demo-line-${n}`, kind: 'room', label: `${r.property.name} · ${r.name}`, quantity: 1, grossVnd: String(total), netVnd: String(total), priceBreakdown: null, reservations: [{ status: status === 'pending_confirmation' ? 'held' : 'reserved', expiresAt: null, nights: Array.from({ length: nights }, (_, i) => ({ stayDate: shift(checkIn, i), quantity: 1 })) }] }],
    payments: ['confirmed', 'checked_in', 'completed'].includes(status) ? [{ id: `demo-pay-${n}`, amountVnd: String(Math.round(total * 0.3)), method: 'bank_transfer', status: 'posted', refunds: [] }] : [],
    events: [{ id: `demo-ev-${n}-1`, eventType: 'created', fromStatus: null, toStatus: 'pending_confirmation', detail: 'Tạo từ website (demo)', actorLabel: 'Hệ thống', createdAt: daysAgo(createdDaysAgo) }, ...(status !== 'pending_confirmation' ? [{ id: `demo-ev-${n}-2`, eventType: 'status_changed', fromStatus: 'pending_confirmation', toStatus: status, detail: null, actorLabel: 'Quản Trị Demo', createdAt: daysAgo(Math.max(0, createdDaysAgo - 1)) }] : [])],
    notes: n % 2 ? [{ id: `demo-note-${n}`, body: 'Khách muốn nhận phòng sớm nếu có thể (ghi chú minh hoạ).', createdAt: daysAgo(1), author: { fullName: 'Quản Trị Demo' } }] : [],
  };
};
const BOOKINGS = [
  bk(1, 0, 'demo-rt-rung-fam', 'pending_confirmation', 5, 2, 2, 2, 0),
  bk(2, 1, 'demo-rt-dch-lake', 'pending_confirmation', 9, 1, 2, 0, 1),
  bk(3, 2, 'demo-rt-san-dorm', 'confirmed', 12, 1, 9, 0, 3),
  bk(4, 3, 'demo-rt-rung-dlx', 'confirmed', 2, 2, 2, 1, 4),
  bk(5, 4, 'demo-rt-tnh-dbl', 'checked_in', -1, 2, 1, 0, 6),
  bk(6, 5, 'demo-rt-tan-sup', 'completed', -8, 2, 2, 0, 15),
  bk(7, 0, 'demo-rt-eco-std', 'cancelled', 20, 1, 2, 0, 7),
  bk(8, 2, 'demo-rt-rung-std', 'expired', 3, 1, 2, 0, 2),
];
const countBy = (items, key) => items.reduce((acc, item) => ({ ...acc, [item[key]]: (acc[item[key]] ?? 0) + 1 }), {});

const INQUIRIES = [
  ['new', true, 'stay', 'demo-prop-rung', 'Phòng gia đình 2 đêm cuối tuần, có trẻ 5 tuổi.'],
  ['new', false, 'combo', 'demo-combo-gia-dinh', 'Combo 3N2Đ cho 4 người lớn, 2 trẻ em.'],
  ['contacted', false, 'stay', 'demo-prop-dong-chuong', 'Bungalow hướng hồ, cần xe đón từ ga Ninh Bình.'],
  ['quoted', true, 'combo', 'demo-combo-team', 'Đoàn công ty 25 người, cần lửa trại.'],
  ['won', false, 'destination', 'demo-dest-trang-an', 'Tư vấn lịch đi Tràng An 1 ngày.'],
  ['lost', false, 'stay', 'demo-prop-eco', 'Biệt thự rừng 2 phòng ngủ dịp lễ.'],
].map(([stage, priority, intent, relatedContentId, message], i) => {
  const c = CUSTOMERS[i];
  const title = PROPERTY_BY_ID.get(relatedContentId)?.name ?? COMBOS.find((x) => x.id === relatedContentId)?.title ?? DESTINATIONS.find((x) => x.id === relatedContentId)?.name ?? null;
  return {
    id: `demo-inquiry-${i + 1}`, customerId: c.id, customer: { name: c.fullName, phone: c.phone, email: c.email }, intent, relatedContentId, relatedContentTitle: title,
    relatedRoomTypeId: null, relatedRoomName: null, desiredCheckIn: shift(today, 7 + i * 3), desiredCheckOut: shift(today, 9 + i * 3), adults: 2 + (i % 3), children: i % 2,
    requestedRooms: 1 + (i % 2), message, stage, priority, version: 1 + i, source: c.source, createdAt: hoursAgo(5 + i * 20), updatedAt: hoursAgo(2 + i * 10),
  };
});

function customerDetail(c) {
  const inq = INQUIRIES.filter((x) => x.customerId === c.id);
  return {
    ...c, _count: { inquiries: inq.length, bookings: BOOKINGS.filter((b) => b.customerId === c.id).length },
    inquiries: inq.map((x) => ({ id: x.id, stage: x.stage, createdAt: x.createdAt,
      interactions: [{ id: `${x.id}-int`, channel: 'phone', body: 'Đã gọi tư vấn lần đầu (minh hoạ).', occurredAt: hoursAgo(20), author: { fullName: 'Quản Trị Demo' } }],
      followUps: [{ id: `${x.id}-fu`, purpose: 'Gửi báo giá chi tiết', dueAt: iso(shift(today, 1)), status: 'open', assignee: { fullName: 'Quản Trị Demo' } }] })),
    bookings: BOOKINGS.filter((b) => b.customerId === c.id).map((b) => ({ id: b.id, publicCode: b.publicCode, bookingStatus: b.bookingStatus, checkIn: b.checkIn, checkOut: b.checkOut, totalVnd: b.totalVnd })),
  };
}

const COUPONS = [
  { id: 'demo-coupon-1', code: 'DEMOXANH10', name: 'Giảm 10% mùa xanh (demo)', discountType: 'percent', percentBps: 1000, amountVnd: null, maxDiscountVnd: '300000', minSubtotalVnd: '1000000', usageLimit: 50, perCustomerLimit: 1, reservedUses: 2, committedUses: 7, active: true, version: 2, startsAt: iso(shift(today, -10)), endsAt: iso(shift(today, 50)), _count: { redemptions: 9 } },
  { id: 'demo-coupon-2', code: 'DEMOGIADINH', name: 'Giảm 200k gia đình (demo)', discountType: 'fixed', percentBps: null, amountVnd: '200000', maxDiscountVnd: null, minSubtotalVnd: '1500000', usageLimit: null, perCustomerLimit: 2, reservedUses: 0, committedUses: 3, active: true, version: 1, startsAt: null, endsAt: null, _count: { redemptions: 3 } },
  { id: 'demo-coupon-3', code: 'DEMOHE2026', name: 'Hè 2026 (demo, đã tắt)', discountType: 'percent', percentBps: 1500, amountVnd: null, maxDiscountVnd: '500000', minSubtotalVnd: null, usageLimit: 20, perCustomerLimit: 1, reservedUses: 0, committedUses: 20, active: false, version: 4, startsAt: iso('2026-06-01'), endsAt: iso('2026-08-31'), _count: { redemptions: 20 } },
];
const PAYMENTS = BOOKINGS.filter((b) => b.payments.length).map((b, i) => ({
  id: b.payments[0].id, bookingId: b.id, method: 'bank_transfer', provider: null, externalReference: `CK-DEMO-${5500 + i}`, status: 'posted', amountVnd: b.payments[0].amountVnd,
  postedAt: daysAgo(2 + i), note: 'Ghi nhận thủ công (demo)', verifiedBy: { fullName: 'Quản Trị Demo' }, booking: { id: b.id, publicCode: b.publicCode, customer: { fullName: b.customer.fullName, phone: b.customer.phone } }, refunds: [],
}));
const REFUNDS = [{ id: 'demo-refund-1', paymentId: PAYMENTS[0]?.id, amountVnd: '200000', reason: 'Khách đổi ngày (minh hoạ)', status: 'requested', createdAt: daysAgo(1), payment: { booking: { publicCode: PAYMENTS[0]?.booking.publicCode, customer: { fullName: PAYMENTS[0]?.booking.customer.fullName } } } }];

// ---------------------------------------------------------------------------
// admin: catalogue / content projections
// ---------------------------------------------------------------------------
function adminRoom(r) {
  return {
    id: r.id, code: r.code, name: r.name, description: r.description, unitKind: r.unitKind, bedroomCount: r.bedroomCount, bathroomCount: r.bathroomCount,
    maxAdults: r.capacityVerified ? Math.max(1, r.capacity - 1) : null, maxChildren: r.capacityVerified ? Math.min(2, r.capacity - 1) : null, maxOccupancy: r.capacityVerified ? r.capacity : null,
    bedSummary: r.view, capacityVerified: r.capacityVerified, amenities: ROOM_AMENITIES[r.kind], areaSqm: r.areaM2, unitCount: r.units, status: r.status, version: 2,
    gallery: [albumItem(ROOM_IMG[r.kind])], rate: { id: `${r.id}-rate`, code: 'BAR', name: 'Giá tiêu chuẩn', baseRateVnd: r.price, weekendRateVnd: Math.round(r.price * 1.15 / 10000) * 10000, breakfastIncluded: r.breakfastIncluded, depositBps: 3000 },
  };
}
function adminProperty(p, i) {
  const cover = mediaRef(p.image);
  return {
    id: p.id, contentId: `${p.id}-content`, title: p.name, description: p.body.join(' '), descriptionDocument: doc(...p.body), metaTitle: null, metaDescription: null, noindex: true,
    contentVersion: 3, slug: p.slug, path: `/phong-nghi/${p.slug}`, excerpt: p.excerpt, code: p.code, kind: p.kind, area: p.area, address: p.address,
    operatingStatus: 'active', publicationStatus: i === 5 ? 'draft' : 'published', featured: p.featured, version: 4, updatedAt: daysAgo(i + 1), publishAt: null,
    cover: { mediaId: cover.id, url: cover.url, alt: cover.altText }, gallery: p.gallery.map(albumItem), roomTypes: p.rooms.map(adminRoom),
  };
}
function contentMedia(asset) { const m = mediaRef(asset); return [{ mediaId: m.id, role: 'cover', position: 0, url: m.url }]; }
function contentItems(kind) {
  const base = (id, title, slug, prefix, excerpt, asset, i, extra) => ({
    id, kind, title, slug, path: slug ? `${prefix}/${slug}` : null, excerpt, body: doc(excerpt ?? title, 'Nội dung minh hoạ cho ảnh chụp giao diện.'),
    publicationStatus: ['published', 'published', 'published', 'draft', 'review', 'published'][i % 6], publishAt: null, metaTitle: null, metaDescription: null,
    noindex: true, featured: i < 3, version: 1 + i, updatedAt: daysAgo(i * 2 + 1), media: asset ? contentMedia(asset) : [], ogMediaId: null, ...extra,
  });
  if (kind === 'combo') return COMBOS.map((c, i) => base(c.id, c.title, c.slug, '/combo-du-lich', c.subtitle, c.image, i, { details: { combo: {
    code: c.id.toUpperCase().replace(/-/g, '_'), durationDays: c.durationDays, durationNights: c.durationNights, pricingUnit: 'person', area: 'Cúc Phương', audienceTags: c.audienceTags,
    inclusions: c.included, exclusions: c.excluded, terms: ['Giá minh hoạ, không áp dụng thực tế.'], destinationIds: [DESTINATIONS[i % DESTINATIONS.length].id],
    days: c.itinerary.map((d) => ({ dayNo: d.day, title: d.title, timeRange: null, activities: d.items.map((text) => ({ text, timeText: null })) })),
    departures: c.fromPriceVnd ? [{ departureDate: shift(today, 14 + i), returnDate: shift(today, 14 + i + c.durationNights), capacity: 20, adultPriceVnd: c.fromPriceVnd, childPriceVnd: Math.round(c.fromPriceVnd * 0.7), status: 'open' }] : [],
  } } }));
  if (kind === 'destination') return DESTINATIONS.map((d, i) => base(d.id, d.name, d.slug, '/diem-den', d.summary, d.image, i, { details: { destination: { category: d.tags[0], location: d.location, mapX: 20 + i * 10, mapY: 30 + i * 6 } } }));
  if (kind === 'article') return ARTICLES.map((a, i) => base(a.id, a.title, a.slug, '/bai-viet', a.excerpt, a.cover, i, { details: { article: { authorName: 'Biên tập viên demo', readMinutes: a.readMinutes } } }));
  if (kind === 'page') return PAGES.map((p, i) => base(p.id, p.title, p.slug, '/chuyen-trang', p.excerpt, null, i, { publicationStatus: 'published', details: {} }));
  if (kind === 'stay') return PROPERTIES.map((p, i) => base(`${p.id}-content`, p.name, p.slug, '/phong-nghi', p.excerpt, p.image, i, { details: {} }));
  return [];
}
const ALL_CONTENT = () => ['combo', 'destination', 'article', 'page', 'stay'].flatMap(contentItems);

function adminInventoryRows(roomTypeId, from, to) {
  return nightsFrom(from, to).map((stayDate) => {
    const d = inventoryDay(roomTypeId, stayDate);
    if (!d) return { roomTypeId, stayDate, onSale: false, capacity: null, blockedCount: null, heldCount: null, reservedCount: null, stopSell: false, available: null, version: null };
    return { roomTypeId, stayDate, onSale: true, capacity: d.capacity, blockedCount: d.blockedCount, heldCount: d.heldCount, reservedCount: d.reservedCount, stopSell: d.stopSell, available: d.available ?? 0, version: d.version };
  });
}
function matrixRooms(p) { return p.rooms.map((r) => ({ id: r.id, name: r.name, code: r.code, status: r.status, capacityVerified: r.capacityVerified, approvedPoolLimit: r.units + 2 })); }
function matrixItems(p, from, to, roomFilter) {
  const dates = nightsFrom(from, to, 7);
  return p.rooms.filter((r) => !roomFilter || roomFilter(r)).flatMap((r) => dates.map((d) => inventoryDay(r.id, d)).filter(Boolean));
}

function dashboardSummary() {
  return {
    generatedAt: new Date().toISOString(), sources: { bookings: 'demo', inquiries: 'demo', content: 'demo' },
    bookings: { total: BOOKINGS.length, byStatus: countBy(BOOKINGS, 'bookingStatus') }, newInquiries: INQUIRIES.filter((x) => x.stage === 'new').length,
    customers: CUSTOMERS.length, published: { stays: 5, combos: COMBOS.length, destinations: DESTINATIONS.length }, content: { draft: 2, review: 1, published: 12 },
    inventoryAlerts: 4, holdsExpiringWithinHour: 2, payments: { posted: PAYMENTS.length }, refunds: { requested: REFUNDS.length },
    recordedPaymentsVnd: String(PAYMENTS.reduce((sum, p) => sum + Number(p.amountVnd), 0)),
  };
}
const ACTIVITY = [
  { id: 'a1', at: hoursAgo(1), kind: 'booking', title: 'Đơn DV-DEMO-1001 chờ xác nhận', detail: 'Demo · Nhà Rừng Cúc Phương · Nhà Gỗ Gia Đình' },
  { id: 'a2', at: hoursAgo(3), kind: 'inquiry', title: 'Yêu cầu tư vấn mới từ Khách Demo Nguyễn An', detail: 'Phòng gia đình 2 đêm cuối tuần' },
  { id: 'a3', at: hoursAgo(8), kind: 'inventory', title: 'Đối tác cập nhật quỹ phòng', detail: 'Demo · Nhà Rừng Cúc Phương · 7 đêm' },
  { id: 'a4', at: hoursAgo(26), kind: 'content', title: 'Xuất bản combo Demo · Tràng An – Bái Đính 2N1Đ', detail: null },
  { id: 'a5', at: hoursAgo(50), kind: 'payment', title: 'Ghi nhận chuyển khoản DV-DEMO-1004', detail: 'Ghi nhận thủ công' },
];
function reportSummary(query) {
  return {
    from: query.from ?? `${today.slice(0, 7)}-01`, toExclusive: shift(query.to ?? today, 1), timezone: 'Asia/Ho_Chi_Minh',
    bookingSummary: { total: BOOKINGS.length, byStatus: Object.entries(countBy(BOOKINGS, 'bookingStatus')).map(([status, count]) => ({ status, count, bookingValueVnd: String(BOOKINGS.filter((b) => b.bookingStatus === status).reduce((s, b) => s + Number(b.totalVnd), 0)) })) },
    revenueSummary: { postedPaymentsVnd: dashboardSummary().recordedPaymentsVnd, settledRefundsVnd: '0', netCashVnd: dashboardSummary().recordedPaymentsVnd, paymentCount: PAYMENTS.length, refundCount: 0 },
    inquiryConversion: { total: INQUIRIES.length, won: 1, conversionBps: 1667, byStage: Object.entries(countBy(INQUIRIES, 'stage')).map(([stage, count]) => ({ stage, count })) },
    inventory: { listedRoomNights: '412', capacity: '1240', blocked: '18', held: '6', reserved: '96', available: '1120' },
    customerAcquisition: { total: CUSTOMERS.length, bySource: Object.entries(countBy(CUSTOMERS, 'source')).map(([source, count]) => ({ source, count })) },
    contentPublication: { published: 12, draft: 2, review: 1 }, scope: { bookingsPaymentsRefundsInventory: { propertyId: query.propertyId ?? null, roomTypeId: query.roomTypeId ?? null }, inquiryCustomerContent: 'global' },
  };
}

// ---------------------------------------------------------------------------
// partners (admin side + partner portal)
// ---------------------------------------------------------------------------
const ORG1 = { id: 'demo-org-nha-rung', name: 'Demo · Tổ chức Lưu trú Nhà Rừng', legalName: 'Demo · Hộ kinh doanh Nhà Rừng (hư cấu)', contactName: 'Đối Tác Demo Nhà Rừng', email: 'doitac@demo.invalid', phone: '0900000201', address: 'Nho Quan, Ninh Bình (minh hoạ)', organizationType: 'property_owner', status: 'active', verificationStatus: 'verified_by_admin', version: 3, createdAt: daysAgo(60) };
const ORG2 = { id: 'demo-org-thung-nham', name: 'Demo · Hợp tác xã Thung Nham', legalName: null, contactName: 'Đối Tác Demo Thung Nham', email: 'htx.demo@example.invalid', phone: '0900000202', address: 'Hoa Lư, Ninh Bình (minh hoạ)', organizationType: 'agency', status: 'pending_review', verificationStatus: 'manual_review', version: 1, createdAt: daysAgo(4) };
const MEMBERS = [
  { userId: 'demo-user-partner', name: 'Đối Tác Demo Nhà Rừng', email: 'doitac@demo.invalid', disabled: false, role: 'owner', status: 'active', version: 1 },
  { userId: 'demo-user-manager', name: 'Quản Lý Demo Lan', email: 'lan.demo@example.invalid', disabled: false, role: 'manager', status: 'active', version: 2 },
  { userId: 'demo-user-viewer', name: 'Nhân Viên Demo Tú', email: 'tu.demo@example.invalid', disabled: false, role: 'viewer', status: 'pending', version: 1 },
];
const CAP_FULL = { canReadInventory: true, canWriteInventory: true, canEditRates: true, canEditProfile: true, canUploadMedia: true };
const CAP_VIEW = { canReadInventory: true, canWriteInventory: false, canEditRates: false, canEditProfile: false, canUploadMedia: false };
const GRANTS = [
  { id: 'demo-grant-rung', propertyId: 'demo-prop-rung', caps: CAP_FULL, expiresAt: null, version: 2 },
  { id: 'demo-grant-dong-chuong', propertyId: 'demo-prop-dong-chuong', caps: CAP_VIEW, expiresAt: iso(shift(today, 90)), version: 1 },
];
const orgRef = (o) => ({ id: o.id, name: o.name, status: o.status });
const adminGrant = (g) => {
  const p = PROPERTY_BY_ID.get(g.propertyId);
  return { id: g.id, organization: orgRef(ORG1), property: { id: p.id, title: p.name, roomTypes: p.rooms.map((r) => ({ id: r.id, name: r.name, code: r.code })) }, status: 'active', roomTypeScope: ['*'], ...g.caps, expiresAt: g.expiresAt, version: g.version };
};
const ADMIN_APPLICATIONS = [
  { id: 'demo-app-2', status: 'pending', version: 1, submittedAt: daysAgo(4), reviewNote: null, applicant: { id: 'demo-user-htx', email: 'htx.demo@example.invalid', fullName: 'Đối Tác Demo Thung Nham', disabledAt: null }, organization: { id: ORG2.id, name: ORG2.name, phone: ORG2.phone, address: ORG2.address, organizationType: ORG2.organizationType, status: ORG2.status, verificationStatus: ORG2.verificationStatus } },
  { id: 'demo-app-1', status: 'approved', version: 2, submittedAt: daysAgo(60), reviewNote: 'Đã xác minh (minh hoạ).', applicant: { id: 'demo-user-partner', email: 'doitac@demo.invalid', fullName: 'Đối Tác Demo Nhà Rừng', disabledAt: null }, organization: { id: ORG1.id, name: ORG1.name, phone: ORG1.phone, address: ORG1.address, organizationType: ORG1.organizationType, status: ORG1.status, verificationStatus: ORG1.verificationStatus } },
];
const ADMIN_ORGS = [
  { ...ORG1, counts: { grants: 2, claims: 0, applications: 1 }, members: MEMBERS },
  { ...ORG2, counts: { grants: 0, claims: 1, applications: 1 }, members: [{ userId: 'demo-user-htx', name: 'Đối Tác Demo Thung Nham', email: 'htx.demo@example.invalid', disabled: false, role: 'owner', status: 'pending', version: 1 }] },
];
const thungNham = PROPERTY_BY_ID.get('demo-prop-thung-nham');
const ADMIN_CLAIMS = [{ id: 'demo-claim-1', organization: orgRef(ORG2), property: { id: thungNham.id, title: thungNham.name, publicationStatus: 'published', roomTypes: thungNham.rooms.map((r) => ({ id: r.id, name: r.name, code: r.code, status: r.status })) }, status: 'pending', reason: 'Chúng tôi là đơn vị vận hành cơ sở này (lý do minh hoạ).', version: 1, createdAt: daysAgo(2), reviewNote: null }];
const ADMIN_REVISIONS = [{ id: 'demo-rev-1', organization: { id: ORG1.id, name: ORG1.name }, property: { id: 'demo-prop-rung', title: 'Demo · Nhà Rừng Cúc Phương' }, roomTypeId: null, targetRatePlanId: null, revision: 3, baseVersion: 4, contentBaseVersion: 3, proposed: { excerpt: 'Nhà gỗ giữa rừng, thêm bữa tối quây quần cuối tuần (đề xuất minh hoạ).', checkInTime: '13:00' }, status: 'pending', version: 1, author: { fullName: 'Đối Tác Demo Nhà Rừng', email: 'doitac@demo.invalid' }, submittedAt: hoursAgo(30) }];
const SHEETS = { enabled: false, importEnabled: false, adapter: 'fake-test-only', items: [{
  id: 'demo-workbook-1', spreadsheetId: 'demo-not-connected-00000000', title: 'Demo · Workbook thử nghiệm (chưa kết nối)', periodStart: `${today.slice(0, 7)}-01`, periodEndExclusive: shift(`${today.slice(0, 7)}-01`, 31).slice(0, 8) + '01',
  status: 'paused', importPaused: true, exportPaused: true, projectionBatches: [], bindings: [], createdAt: daysAgo(12), runs: [],
}] };

function partnerGrant(g) {
  const p = PROPERTY_BY_ID.get(g.propertyId);
  return {
    id: p.id, propertyId: p.id, organizationId: ORG1.id, organizationName: ORG1.name, name: p.name, code: p.code, area: p.area, address: p.address, excerpt: p.excerpt,
    descriptionDocument: doc(...p.body), checkInTime: '14:00', checkOutTime: '12:00', houseRules: ['Giữ yên tĩnh sau 22:00', 'Không hút thuốc trong phòng gỗ'], notes: ['Dữ liệu minh hoạ'],
    gallery: p.gallery.map((a, i) => { const m = mediaRef(a); return { id: m.id, url: m.url, altText: m.altText, role: i === 0 ? 'cover' : 'gallery', position: i }; }),
    publicPath: `/phong-nghi/${p.slug}`, publicationStatus: 'published', version: 4, contentVersion: 3, capabilities: g.caps,
    roomTypes: p.rooms.map((r) => ({
      id: r.id, code: r.code, name: r.name, status: r.status, version: 2, capacityVerified: r.capacityVerified, inventoryScope: 'pooled', description: r.description, bedSummary: r.view, areaSqm: r.areaM2,
      unitKind: r.unitKind, bedroomCount: r.bedroomCount, bathroomCount: r.bathroomCount, maxAdults: Math.max(1, r.capacity - 1), maxChildren: Math.min(2, r.capacity - 1),
      ratePlans: g.caps.canEditRates ? [{ id: `${r.id}-rate`, code: 'BAR', name: 'Giá tiêu chuẩn', baseRateVnd: String(r.price), weekendRateVnd: String(Math.round(r.price * 1.15 / 10000) * 10000), breakfastIncluded: r.breakfastIncluded, minStayNights: 1, maxStayNights: null, inclusions: [], version: 1 }] : [],
    })),
  };
}
function partnerInventory(propertyId, from, toExclusive) {
  const p = PROPERTY_BY_ID.get(propertyId);
  if (!p || !GRANTS.some((g) => g.propertyId === propertyId)) return null;
  const dates = nightsFrom(from, toExclusive, 7);
  return p.rooms.filter((r) => r.status === 'active').flatMap((r) => dates.map((stayDate) => {
    const d = inventoryDay(r.id, stayDate);
    if (!d) return { roomTypeId: r.id, roomTypeName: r.name, stayDate, dataState: 'missing', saleState: 'not_on_sale', available: null, capacity: null, blockedCount: null, heldCount: null, reservedCount: null, version: null, lastConfirmedAt: null, updatedAt: null, lastConfirmedSource: null, integrityHold: false };
    return { roomTypeId: r.id, roomTypeName: r.name, stayDate, dataState: d.dataState, saleState: d.stopSell ? 'stop_sell' : 'open', available: d.integrityHold ? null : d.available, capacity: d.capacity, blockedCount: d.blockedCount, heldCount: d.heldCount, reservedCount: d.reservedCount, version: d.version, lastConfirmedAt: d.lastConfirmedAt, updatedAt: d.updatedAt, lastConfirmedSource: d.lastConfirmedSource, integrityHold: d.integrityHold };
  }));
}
const PARTNER_NOTIFICATIONS = [
  { id: 'demo-noti-1', kind: 'revision', title: 'Đề xuất hồ sơ đang chờ duyệt', body: 'Đề xuất sửa mô tả Demo · Nhà Rừng Cúc Phương đã được gửi (minh hoạ).', read: false, createdAt: hoursAgo(30) },
  { id: 'demo-noti-2', kind: 'inventory', title: 'Cần xác nhận quỹ phòng', body: 'Một số đêm tuần sau chưa được xác nhận lại (minh hoạ).', read: false, createdAt: hoursAgo(6) },
  { id: 'demo-noti-3', kind: 'grant', title: 'Đã cấp quyền xem Demo · Bungalow Hồ Đồng Chương', body: 'Quyền chỉ xem, không chỉnh sửa (minh hoạ).', read: true, createdAt: daysAgo(9) },
];

// ---------------------------------------------------------------------------
// public availability search (shared by /public/availability and /partners/availability)
// ---------------------------------------------------------------------------
function availabilitySearch(query) {
  const checkIn = query.checkIn, checkOut = query.checkOut;
  if (!isDay(checkIn) || !isDay(checkOut) || daysBetween(checkIn, checkOut) < 1 || daysBetween(checkIn, checkOut) > 30) return { status: 404, body: { message: 'Cần chọn ngày nhận và trả phòng hợp lệ.' } };
  const dates = nightsFrom(checkIn, checkOut);
  const quantity = Number(query.rooms ?? 1) || 1;
  const area = (query.area ?? '').trim().toLowerCase();
  const items = PROPERTIES.filter((p) => (!area || p.area.toLowerCase().includes(area) || p.name.toLowerCase().includes(area)) && (!query.kind || p.kind === query.kind)).map((p) => {
    const rooms = p.rooms.filter((r) => r.status === 'active' && r.capacityVerified);
    const states = rooms.map((r) => ({ r, s: roomStatusForStay(r.id, dates, quantity) }));
    const pick = states.find((x) => x.s === 'available') ?? states.find((x) => x.s === 'needs_check') ?? states.find((x) => x.s === 'unknown') ?? states[0];
    const status = pick.s === 'unknown' ? 'stale' : pick.s;
    return {
      propertyId: p.id, roomTypeId: pick.r.id, name: p.name, roomTypeName: pick.r.name, area: p.area, excerpt: p.excerpt, path: `/phong-nghi/${p.slug}`,
      cover: { url: p.image.src, alt: p.image.alt, width: p.image.width, height: p.image.height }, status, requestVerification: status === 'stale' || status === 'needs_check',
      availableForStay: status === 'available', priceMode: 'published_rate', lastConfirmedAt: status === 'stale' ? daysAgo(9) : hoursAgo(3), checkIn, checkOut, nights: dates.length, quantity,
    };
  });
  return ok({ enabled: true, items, generatedAt: new Date().toISOString(), timezone: 'Asia/Ho_Chi_Minh', checkIn, checkOut });
}

// ---------------------------------------------------------------------------
// navigation
// ---------------------------------------------------------------------------
const NAV = [
  { label: 'Trang chủ', href: '/' },
  { label: 'Lưu trú', href: '/phong-nghi' },
  { label: 'Trải nghiệm', href: '/combo-du-lich' },
  { label: 'Cẩm nang', href: '/diem-den' },
  { label: 'Về mình', href: '/ve-minh' },
  { label: 'Dành cho đối tác', href: '/doi-tac' },
];
const menuPayload = () => ({ key: 'primary', name: 'Menu chính', isDefault: false, items: NAV.map((n, i) => ({ id: `0000000${i + 1}-demo-4000-8000-00000000000${i + 1}`, label: n.label, contentId: null, externalUrl: n.href, href: n.href, position: i, enabled: true, kind: 'external', publicationStatus: null })) });

// ---------------------------------------------------------------------------
// router
// ---------------------------------------------------------------------------
const unauthorized = () => ({ status: 401, body: { message: 'Chưa đăng nhập (demo persona anon).' } });
const forbidden = () => ({ status: 403, body: { message: 'Không đủ quyền (demo persona).' } });

function normalizeQuery(query) {
  if (!query) return {};
  if (query instanceof URLSearchParams) return Object.fromEntries(query.entries());
  return { ...query };
}

/**
 * @param {{ method?: string, path: string, query?: URLSearchParams | Record<string,string>, persona?: 'admin'|'partner'|'anon', body?: unknown }} req
 * @returns {{ status: number, body: unknown } | null}  null = unknown endpoint
 */
export function handle({ method = 'GET', path, query, persona = 'anon', body } = {}) {
  method = method.toUpperCase();
  const q = normalizeQuery(query);
  const seg = path.replace(/\/+$/, '').split('/').filter(Boolean).map((s) => decodeURIComponent(s));
  const user = USERS[persona] ?? null;
  const isAdmin = persona === 'admin';
  const isPartner = persona === 'partner';

  // ---------------- auth ----------------
  if (seg[0] === 'auth') {
    if (seg[1] === 'csrf') return ok({ csrfToken: 'demo-csrf-token', expiresAt: new Date(Date.now() + 86_400_000).toISOString() });
    if (seg[1] === 'me') return user ? ok(user) : unauthorized();
    if (seg[1] === 'login') return user ? ok({ user, csrfToken: 'demo-csrf-token', expiresAt: new Date(Date.now() + 86_400_000).toISOString() }) : { status: 401, body: { message: 'Bản demo: dùng persona admin hoặc partner.' } };
    if (seg[1] === 'logout') return ok({ ok: true });
  }

  // ---------------- public (no auth) ----------------
  if (seg[0] === 'public' && method === 'GET') {
    const [, a, b] = seg;
    if (a === 'site') {
      const settings = Object.fromEntries(SETTINGS.filter((s) => s.isPublic).map((s) => [s.key, s.value]));
      return ok({ settings, features: { publicAvailability: true, partnerPortal: true }, media: { logo: null, favicon: null, og: null }, assets: siteAssets, generatedAt: new Date().toISOString() });
    }
    if (a === 'navigation') return ok(NAV);
    if (a === 'stays' && !b) {
      const hasDates = isDay(q.checkIn) && isDay(q.checkOut);
      const dates = hasDates ? nightsFrom(q.checkIn, q.checkOut) : nightsFrom(today, shift(today, 1));
      const items = PROPERTIES.filter((p) => q.featured !== 'true' || p.featured).sort((x, y) => Number(y.featured) - Number(x.featured)).map((p) => publicStay(p, dates));
      return ok({ items, generatedAt: new Date().toISOString() });
    }
    if (a === 'stays' && b) { const p = PROPERTIES.find((x) => x.slug === b || x.id === b); return p ? ok(publicStay(p)) : notFound('Không tìm thấy chỗ nghỉ'); }
    if (a === 'stay-availability') {
      const dates = isDay(q.checkIn) && isDay(q.checkOut) ? nightsFrom(q.checkIn, q.checkOut) : nightsFrom(today, shift(today, 1));
      return ok({ items: PROPERTIES.map((p) => ({ id: p.id, availabilityStatus: propertyStatus(p, dates), availabilityAsOf: hoursAgo(1) })), generatedAt: new Date().toISOString() });
    }
    if (a === 'availability') return availabilitySearch(q);
    if (a === 'combos' && !b) return ok({ items: COMBOS.map(publicCombo), generatedAt: new Date().toISOString() });
    if (a === 'combos' && b) { const c = COMBOS.find((x) => x.slug === b); return c ? ok(publicCombo(c)) : notFound('Không tìm thấy combo'); }
    if (a === 'destinations' && !b) return ok({ items: DESTINATIONS.map(publicDestination), generatedAt: new Date().toISOString() });
    if (a === 'destinations' && b) { const d = DESTINATIONS.find((x) => x.slug === b); return d ? ok(publicDestination(d)) : notFound('Không tìm thấy điểm đến'); }
    if (a === 'articles' && !b) return ok({ items: ARTICLES.map(publicArticle), generatedAt: new Date().toISOString() });
    if (a === 'articles' && b) { const x = ARTICLES.find((y) => y.slug === b); return x ? ok(publicArticle(x)) : notFound('Không tìm thấy bài viết'); }
    if (a === 'reviews') {
      const items = REVIEWS.filter((r) => !q.contentId || r.contentId === q.contentId).map((r) => { const rest = { ...r }; delete rest.contentId; return { ...rest, avatar: null, isDemo: false }; });
      return ok({ items, generatedAt: new Date().toISOString() });
    }
    if (a === 'pages' && !b) return ok({ items: PAGES.map(publicPage).map(({ id, title, slug, path: p, updatedAt, noindex }) => ({ id, title, slug, path: p, updatedAt, noindex })), generatedAt: new Date().toISOString() });
    if (a === 'pages' && b) { const p = PAGES.find((x) => x.slug === b); return p ? ok(publicPage(p)) : notFound('Không tìm thấy chuyên trang'); }
    if (a === 'seo' && b === 'urls') {
      const paths = ['/', '/phong-nghi', '/combo-du-lich', '/diem-den', '/lien-he', '/ve-minh', '/bai-viet', '/chuyen-trang', ...PROPERTIES.map((p) => `/phong-nghi/${p.slug}`), ...COMBOS.map((c) => `/combo-du-lich/${c.slug}`), ...DESTINATIONS.map((d) => `/diem-den/${d.slug}`), ...ARTICLES.map((x) => `/bai-viet/${x.slug}`), ...PAGES.map((x) => `/chuyen-trang/${x.slug}`)];
      return ok({ items: paths.map((p) => ({ path: p, lastModified: daysAgo(2) })) });
    }
    if (a === 'seo' && b === 'policy') return ok({ indexingAllowed: false, canonicalOrigin: null, blockedReasons: ['Môi trường triển khai chưa bật SEO_INDEXING_ALLOWED.', 'Nội dung website đang chờ xác minh (bản demo).'], structuredData: { core: true, offers: false, reviews: false, vacationRental: false, blockedCommercialReasons: { offers: 'Bản demo.', reviews: 'Bản demo.', vacationRental: 'Bản demo.' } } });
    if (a === 'legacy-target' || a === 'routes' || a === 'favicon.png') return notFound();
    return null;
  }

  // ---------------- mutations (never persisted) ----------------
  if (method !== 'GET' && method !== 'HEAD') return mutation(method, seg, q, body, persona);

  // ---------------- partner portal ----------------
  if (seg[0] === 'partners') {
    if (!user) return unauthorized();
    const [, a, b] = seg;
    if (!isPartner) {
      if (a === 'context') return ok({ partner: { id: user.id, email: user.email, fullName: user.fullName }, applications: [], organizations: [] });
      return ok({ items: [] });
    }
    if (a === 'context') return ok({
      partner: { id: user.id, email: user.email, fullName: user.fullName },
      applications: [{ id: 'demo-app-1', status: 'approved', version: 2, submittedName: user.fullName, submittedPhone: ORG1.phone, reviewNote: null, submittedAt: daysAgo(60), organization: { name: ORG1.name, address: ORG1.address } }],
      organizations: [{ id: ORG1.id, name: ORG1.name, status: 'active', verificationStatus: ORG1.verificationStatus, membershipRole: 'owner', membershipStatus: 'active',
        grants: GRANTS.map((g) => ({ id: g.id, propertyId: g.propertyId, propertyName: PROPERTY_BY_ID.get(g.propertyId).name, propertyStatus: 'published', status: 'active', ...g.caps, roomTypeScope: ['*'] })) }],
    });
    if (a === 'properties' && !b) return ok({ items: GRANTS.map(partnerGrant) });
    if (a === 'notifications') return ok({ items: PARTNER_NOTIFICATIONS });
    if (a === 'profile-revisions') return ok({ items: [{ id: 'demo-rev-1', propertyId: 'demo-prop-rung', propertyName: 'Demo · Nhà Rừng Cúc Phương', roomTypeId: null, revision: 3, status: 'pending', reviewNote: null, proposed: ADMIN_REVISIONS[0].proposed, submittedAt: hoursAgo(30) }, { id: 'demo-rev-0', propertyId: 'demo-prop-rung', propertyName: 'Demo · Nhà Rừng Cúc Phương', roomTypeId: 'demo-rt-rung-dlx', revision: 2, status: 'approved', reviewNote: 'Đã duyệt (minh hoạ).', proposed: {}, submittedAt: daysAgo(12) }] });
    if (a === 'members') return ok({ items: MEMBERS });
    if (a === 'inventory') {
      const items = partnerInventory(q.propertyId, q.from, q.toExclusive);
      return items ? ok({ items, generatedAt: new Date().toISOString(), timezone: 'Asia/Ho_Chi_Minh', range: { from: q.from, toExclusive: q.toExclusive } }) : forbidden();
    }
    if (a === 'media') { const items = MEDIA.slice(0, 8).map((m) => ({ id: m.id, url: m.url, altText: m.altText, caption: m.caption, width: m.width, height: m.height, visibility: 'public', createdAt: m.createdAt })); return ok({ items, page: 1, pageSize: 24, total: items.length }); }
    if (a === 'property-access-claims' && b === 'candidates') return ok({ items: [thungNham, PROPERTY_BY_ID.get('demo-prop-nha-san')].filter((p) => !q.search || p.name.toLowerCase().includes(q.search.toLowerCase())).map((p) => ({ id: p.id, code: p.code, name: p.name, area: p.area, path: `/phong-nghi/${p.slug}` })) });
    if (a === 'availability') return availabilitySearch(q);
    return null;
  }

  // ---------------- admin / staff ----------------
  const staffRoots = new Set(['admin', 'properties', 'content', 'media', 'inquiries', 'navigation', 'settings', 'ai']);
  if (!staffRoots.has(seg[0])) return null;
  if (!user) return unauthorized();
  if (!isAdmin) return forbidden();
  const [root, a, b, c] = seg;

  if (root === 'admin') {
    if (a === 'dashboard' && b === 'summary') return ok(dashboardSummary());
    if (a === 'dashboard' && b === 'activity') return ok({ items: ACTIVITY });
    if (a === 'bookings' && !b) {
      const s = (q.search ?? '').toLowerCase();
      const items = BOOKINGS.filter((x) => (!q.status || x.bookingStatus === q.status) && (!q.propertyId || x.propertyId === q.propertyId) && (!s || `${x.publicCode} ${x.customer.fullName} ${x.customer.phone}`.toLowerCase().includes(s)));
      return ok(page(items, q));
    }
    if (a === 'bookings' && b) { const x = BOOKINGS.find((y) => y.id === b); return x ? ok(x) : notFound('Không tìm thấy đặt phòng'); }
    if (a === 'inventory' && b === 'room-types') return ok({ items: PROPERTIES.flatMap((p) => p.rooms.filter((r) => r.status === 'active' && r.capacityVerified).map((r) => ({ id: r.id, code: r.code, name: r.name, propertyId: p.id, propertyName: p.name, status: r.status }))) });
    if (a === 'inventory' && b === 'properties') return ok({ items: PROPERTIES.map((p) => ({ id: p.id, code: p.code, name: p.name, roomTypes: matrixRooms(p) })) });
    if (a === 'inventory' && b === 'matrix') { const p = PROPERTY_BY_ID.get(q.propertyId); return p ? ok({ items: matrixItems(p, q.from, q.to), generatedAt: new Date().toISOString() }) : notFound('Không tìm thấy cơ sở'); }
    if (a === 'inventory' && !b) return ROOM_BY_ID.has(q.roomTypeId) ? ok({ items: adminInventoryRows(q.roomTypeId, q.from, q.to) }) : notFound('Không tìm thấy hạng phòng');
    if (a === 'customers' && !b) {
      const s = (q.search ?? '').toLowerCase();
      return ok(page(CUSTOMERS.filter((x) => !s || `${x.fullName} ${x.phone} ${x.email} ${x.source}`.toLowerCase().includes(s)).map((x) => ({ ...x, _count: customerDetail(x)._count })), q));
    }
    if (a === 'customers' && b) { const x = CUSTOMERS.find((y) => y.id === b); return x ? ok(customerDetail(x)) : notFound('Không tìm thấy khách hàng'); }
    if (a === 'coupons' && !b) return ok(page(COUPONS.filter((x) => !q.status || (q.status === 'active') === x.active), q));
    if (a === 'coupons' && c === 'redemptions') return ok({ items: BOOKINGS.slice(2, 4).map((x, i) => ({ id: `demo-red-${i}`, status: 'committed', savingsVnd: '150000', booking: { publicCode: x.publicCode, bookingStatus: x.bookingStatus, customer: { fullName: x.customer.fullName } } })) });
    if (a === 'payments') return ok(page(PAYMENTS.filter((x) => !q.status || x.status === q.status), q, 50));
    if (a === 'refunds') return ok(page(REFUNDS.filter((x) => !q.status || x.status === q.status), q, 50));
    if (a === 'reports' && b === 'summary') return ok(reportSummary(q));
    if (a === 'partner-applications') return ok({ items: ADMIN_APPLICATIONS });
    if (a === 'partner-organizations') return ok({ items: ADMIN_ORGS });
    if (a === 'property-access-claims') return ok({ items: ADMIN_CLAIMS });
    if (a === 'partner-grants') return ok({ items: GRANTS.map(adminGrant) });
    if (a === 'partner-revisions') return ok({ items: ADMIN_REVISIONS });
    if (a === 'sheets' && b === 'workbooks') return ok(SHEETS);
    if (a === 'partner-user-candidates') {
      const s = (q.search ?? '').trim().toLowerCase();
      if (s.length < 2) return ok({ items: [] });
      const people = [
        { id: 'demo-user-partner', fullName: 'Đối Tác Demo Nhà Rừng', email: 'doitac@demo.invalid', disabled: false, partnerOrganizations: [{ id: ORG1.id, name: ORG1.name, status: 'active', membershipStatus: 'active' }] },
        { id: 'demo-user-htx', fullName: 'Đối Tác Demo Thung Nham', email: 'htx.demo@example.invalid', disabled: false, partnerOrganizations: [{ id: ORG2.id, name: ORG2.name, status: 'pending_review', membershipStatus: 'pending' }] },
        { id: 'demo-user-new', fullName: 'Người Dùng Demo Mới', email: 'moi.demo@example.invalid', disabled: false, partnerOrganizations: [] },
      ];
      return ok({ items: people.filter((x) => `${x.fullName} ${x.email}`.toLowerCase().includes(s) || s.includes('demo')) });
    }
    if (a === 'partner-property-candidates') {
      const s = (q.search ?? '').trim().toLowerCase();
      return ok({ items: PROPERTIES.filter((p) => !s || `${p.name} ${p.code}`.toLowerCase().includes(s)).map((p) => ({ id: p.id, name: p.name, code: p.code, roomTypes: p.rooms.map((r) => ({ id: r.id, name: r.name, code: r.code })) })) });
    }
    return null;
  }
  if (root === 'properties' && !a) return ok({ items: PROPERTIES.map(adminProperty) });
  if (root === 'properties' && a && !b) { const i = PROPERTIES.findIndex((p) => p.id === a); return i >= 0 ? ok(adminProperty(PROPERTIES[i], i)) : notFound(); }
  if (root === 'content' && !a) {
    let items = q.kind ? contentItems(q.kind) : ALL_CONTENT();
    if (q.status) items = items.filter((x) => x.publicationStatus === q.status);
    if (q.kind === 'page') items = items.map((x) => ({ ...x, publishAt: null }));
    return ok(page(items, q, 100));
  }
  if (root === 'content' && a) { const x = ALL_CONTENT().find((y) => y.id === a); return x ? ok(x) : notFound('Không tìm thấy nội dung'); }
  if (root === 'media' && !a) {
    const s = (q.search ?? '').toLowerCase();
    const listed = MEDIA.filter((m) => /\/(stays|combos|destinations)\//.test(m.url)).slice(0, 12);
    return ok(page(listed.filter((m) => !s || `${m.originalFilename} ${m.altText}`.toLowerCase().includes(s)), q, 24));
  }
  if (root === 'media' && a) { const m = MEDIA.find((x) => x.id === a); return m ? ok(m) : notFound('Không tìm thấy ảnh'); }
  if (root === 'inquiries' && !a) return ok({ ...page(INQUIRIES, q, 100) });
  if (root === 'inquiries' && a) { const x = INQUIRIES.find((y) => y.id === a); return x ? ok(x) : notFound(); }
  if (root === 'navigation') return ok(menuPayload());
  if (root === 'settings' && !a) return ok({ groups: [...new Set(SETTINGS.map((s) => s.group))], items: SETTINGS });
  if (root === 'settings' && a) { const s = SETTINGS.find((x) => x.key === a); return s ? ok(s) : notFound(); }
  if (root === 'ai' && a === 'settings') return ok(AI_SETTINGS);
  return null;
}

const AI_SETTINGS = {
  version: 1, encryption: 'session_secret',
  content: { baseUrl: 'https://api.example.invalid/v1', model: 'demo-text-model', wire: 'responses', maxOutputTokens: 2048, keyConfigured: false, maskedKey: null, keySource: 'none' },
  image: { baseUrl: 'https://api.example.invalid/v1', model: 'demo-image-model', imageSize: '1024x1024', imageQuality: 'medium', keyConfigured: false, maskedKey: null, keySource: 'none' },
};

/** Mutations return plausible echoes; nothing is stored. */
function mutation(method, seg, q, body, persona) {
  if (persona === 'anon' && !['inquiries', 'quotes'].includes(seg[0])) return unauthorized();
  const input = body && typeof body === 'object' ? body : {};
  const [root, a, b] = seg;
  if (root === 'content' && a && b === 'status') { const x = ALL_CONTENT().find((y) => y.id === a); return x ? ok({ ...x, publicationStatus: input.status ?? x.publicationStatus, version: x.version + 1 }) : notFound(); }
  if (root === 'content' && a && method === 'PUT') { const x = ALL_CONTENT().find((y) => y.id === a); return x ? ok({ ...x, ...input, version: x.version + 1 }) : notFound(); }
  if (root === 'content' && !a && method === 'POST') return ok({ ...contentItems(input.kind ?? 'article')[0], ...input, id: 'demo-content-new', version: 1, media: [] });
  if (root === 'inquiries' && a) { const x = INQUIRIES.find((y) => y.id === a); return x ? ok({ ...x, stage: input.stage ?? x.stage, version: x.version + 1 }) : notFound(); }
  if (root === 'inquiries' && !a) return ok({ id: 'demo-inquiry-new' });
  if (root === 'media' && a && method === 'PATCH') { const m = MEDIA.find((x) => x.id === a); return m ? ok({ ...m, ...input }) : notFound(); }
  if (root === 'media' && a === 'upload') return ok(MEDIA[0]);
  if (root === 'navigation') return ok(menuPayload());
  if (root === 'ai' && a === 'settings') return ok(AI_SETTINGS);
  if (root === 'properties' && a && b === 'rooms') { const i = PROPERTIES.findIndex((p) => p.id === a); return i >= 0 ? ok(adminProperty(PROPERTIES[i], i)) : notFound(); }
  if (root === 'properties' && a && method === 'PATCH') { const i = PROPERTIES.findIndex((p) => p.id === a); return i >= 0 ? ok(adminProperty(PROPERTIES[i], i)) : notFound(); }
  if (root === 'admin' && a === 'inventory' && b === 'available' && seg[3] === 'preview') return ok({ items: (input.changes ?? []).map((ch) => ({ stayDate: ch.stayDate, beforeAvailable: inventoryDay(ch.roomTypeId, ch.stayDate)?.available ?? 0, available: ch.available })) });
  if (root === 'partners' && a === 'inventory' && b === 'bulk' && seg[3] === 'preview') return ok({ atomic: true, items: (input.changes ?? []).map((ch) => { const d = inventoryDay(ch.roomTypeId, ch.stayDate) ?? { capacity: 0, blockedCount: 0, heldCount: 0, reservedCount: 0, stopSell: false }; return { roomTypeId: ch.roomTypeId, stayDate: ch.stayDate, before: { capacity: d.capacity, blockedCount: d.blockedCount, heldCount: d.heldCount, reservedCount: d.reservedCount, stopSell: d.stopSell }, after: { available: Math.max(0, d.capacity - d.reservedCount - (ch.externalSoldCount ?? 0)), stopSell: !!ch.stopSell } }; }) });
  if (root === 'partners' && a === 'inventory' && b === 'bulk') return ok({ items: [], replayed: false, syncStatus: 'queued' });
  if (root === 'partners' && a === 'profile-revisions') return ok({ status: 'pending', replayed: false });
  if (root === 'partners' && a === 'property-access-claims') return ok({ status: 'pending' });
  if (root === 'partners' && a === 'media' && b === 'upload') { const m = MEDIA[0]; return ok({ id: m.id, url: m.url, altText: m.altText, width: m.width, height: m.height, visibility: 'public' }); }
  if (root === 'admin' && a === 'partner-grants' && method === 'POST') return ok({ id: 'demo-grant-rung', status: 'active', version: 1 });
  if (root === 'admin' && a === 'partner-organizations' && b === 'manual') return ok({ id: 'demo-org-manual', name: input.name ?? 'Demo · Tổ chức mới', status: 'active', membershipStatus: 'active' });
  if (root === 'admin' && a === 'sheets' && seg[3] === 'sync') return ok({ runId: 'demo-run', status: 'skipped_demo' });
  if (root === 'admin' && a === 'sheets' && seg[2] === 'bindings') return ok({ projectionStatus: 'projected', message: 'Demo: không ghi lên Google Sheets.' });
  if (root === 'admin' && a === 'bookings' && b && seg[3]) { const x = BOOKINGS.find((y) => y.id === b); return x ? ok(x) : notFound(); }
  if (root === 'admin' && a === 'customers' && b) { const x = CUSTOMERS.find((y) => y.id === b); return x ? ok(customerDetail(x)) : notFound(); }
  return ok({ ok: true, demo: true, note: 'Bản demo: không lưu dữ liệu.' });
}

/**
 * Combo fixtures. Itineraries, inclusions and prices are mockup copy
 * (`isDemo: true`); activities and access must be verified before sale.
 * Prices are per person — never compare with per-room prices.
 */
import type { ImageAsset } from './types';
import type { RichDocument } from '@/lib/content/rich-document';

const IMG = '/images/dinh-van-booking';

export type ComboAudience = 'gia-dinh' | 'cap-doi' | 'nhom' | 'thien-nhien';
export type ComboCategory = 'all' | '2n1d' | '3n2d' | ComboAudience;

export const COMBO_CATEGORIES: { id: ComboCategory; label: string; icon: string }[] = [
  { id: 'all', label: 'Tất cả combo', icon: 'calendar' },
  { id: '2n1d', label: '2N1D', icon: 'calendar' },
  { id: '3n2d', label: '3N2D', icon: 'calendar' },
  { id: 'gia-dinh', label: 'Gia đình', icon: 'family' },
  { id: 'cap-doi', label: 'Cặp đôi', icon: 'heart' },
  { id: 'nhom', label: 'Nhóm – Team', icon: 'team' },
  { id: 'thien-nhien', label: 'Trải nghiệm thiên nhiên', icon: 'leaf' },
];

export interface Combo {
  id: string;
  slug: string;
  publicPath?: string;
  metaTitle?: string | null;
  metaDescription?: string | null;
  noindex?: boolean;
  firstPublishedAt?: string | null;
  lastPublicChangedAt?: string | null;
  title: string;
  subtitle: string;
  /** Published CMS body; demo fixtures may omit it. */
  body?: RichDocument;
  durationDays: number;
  durationNights: number;
  badge: { label: string; icon: 'calendar' | 'family' | 'team' };
  audienceTags: ComboAudience[];
  includedHighlights: ComboLine[];
  fromPriceVnd: number;
  priceUnit: 'người';
  popularity: number;
  image: ImageAsset;
  itinerary: { day: string; items: string[] }[];
  included: string[];
  excluded: string[];
  isDemo?: boolean;
}

export interface ComboLine {
  icon: 'leaf' | 'binoculars' | 'food' | 'pagoda' | 'boat' | 'tent' | 'paw' | 'bbq' | 'culture' | 'family' | 'child' | 'home' | 'team' | 'mountain' | 'route';
  text: string;
}

const img = (src: string, alt: string): ImageAsset => ({ src, alt, width: 220, height: 126 });

export const combos: Combo[] = [
  {
    id: 'kham-pha-rung-cuc-phuong',
    slug: 'kham-pha-rung-cuc-phuong',
    title: 'Khám phá rừng Cúc Phương',
    subtitle: 'Thiên nhiên gọi tên bạn',
    durationDays: 2,
    durationNights: 1,
    badge: { label: '2N1D', icon: 'calendar' },
    audienceTags: ['thien-nhien', 'nhom'],
    includedHighlights: [
      { icon: 'leaf', text: 'Trekking rừng nguyên sinh' },
      { icon: 'binoculars', text: 'Thăm Trung tâm cứu hộ linh trưởng' },
      { icon: 'food', text: 'Ẩm thực bản địa, homestay xanh' },
    ],
    fromPriceVnd: 1350000,
    priceUnit: 'người',
    popularity: 100,
    image: img(`${IMG}/combos/kham-pha-rung-cuc-phuong.webp`, 'Nhóm du khách đi bộ trên đường rừng'),
    itinerary: [
      { day: 'Ngày 1', items: ['Đón khách, nhận phòng homestay', 'Trekking rừng nguyên sinh', 'Ăn tối món bản địa'] },
      { day: 'Ngày 2', items: ['Thăm khu cứu hộ linh trưởng', 'Ăn trưa, kết thúc hành trình'] },
    ],
    included: ['1 đêm homestay', 'Các bữa ăn theo lịch trình', 'Hướng dẫn viên địa phương'],
    excluded: ['Vé tham quan (tư vấn theo thời điểm)', 'Chi phí cá nhân'],
    isDemo: true,
  },
  {
    id: 'trang-an-bai-dinh',
    slug: 'trang-an-bai-dinh',
    title: 'Tràng An – Bái Đính',
    subtitle: 'Di sản trong một hành trình',
    durationDays: 2,
    durationNights: 1,
    badge: { label: '2N1D', icon: 'calendar' },
    audienceTags: ['cap-doi', 'gia-dinh'],
    includedHighlights: [
      { icon: 'boat', text: 'Tham quan Tràng An (chèo thuyền)' },
      { icon: 'pagoda', text: 'Vãn cảnh chùa Bái Đính' },
      { icon: 'food', text: 'Ẩm thực Ninh Bình đặc sắc' },
    ],
    fromPriceVnd: 1290000,
    priceUnit: 'người',
    popularity: 95,
    image: img(`${IMG}/combos/trang-an-bai-dinh.webp`, 'Thuyền trên sông Tràng An giữa núi đá vôi'),
    itinerary: [
      { day: 'Ngày 1', items: ['Đi thuyền Tràng An', 'Ăn trưa đặc sản', 'Nhận phòng, nghỉ ngơi'] },
      { day: 'Ngày 2', items: ['Vãn cảnh Bái Đính', 'Kết thúc hành trình'] },
    ],
    included: ['1 đêm lưu trú', 'Bữa ăn theo lịch trình', 'Xe di chuyển trong lịch trình'],
    excluded: ['Vé thuyền, vé tham quan (tư vấn theo thời điểm)', 'Chi phí cá nhân'],
    isDemo: true,
  },
  {
    id: 'cuc-phuong-eco-retreat',
    slug: 'cuc-phuong-eco-retreat',
    title: 'Cúc Phương Eco Retreat',
    subtitle: 'Sống chậm giữa thiên nhiên',
    durationDays: 3,
    durationNights: 2,
    badge: { label: '3N2D', icon: 'calendar' },
    audienceTags: ['thien-nhien', 'cap-doi'],
    includedHighlights: [
      { icon: 'home', text: 'Nghỉ dưỡng homestay giữa rừng' },
      { icon: 'paw', text: 'Trekking – quan sát động vật' },
      { icon: 'bbq', text: 'BBQ, đốt lửa trại, ngắm sao' },
    ],
    fromPriceVnd: 2350000,
    priceUnit: 'người',
    popularity: 90,
    image: img(`${IMG}/combos/cuc-phuong-eco-retreat.webp`, 'Bàn ghế gỗ bên hồ giữa rừng xanh'),
    itinerary: [
      { day: 'Ngày 1', items: ['Nhận phòng, nghỉ ngơi', 'Dạo vườn, ăn tối'] },
      { day: 'Ngày 2', items: ['Trekking, quan sát thiên nhiên', 'BBQ buổi tối'] },
      { day: 'Ngày 3', items: ['Thư giãn buổi sáng', 'Kết thúc hành trình'] },
    ],
    included: ['2 đêm homestay', 'Bữa ăn theo lịch trình', 'Hướng dẫn trekking'],
    excluded: ['Vé tham quan (tư vấn theo thời điểm)', 'Chi phí cá nhân'],
    isDemo: true,
  },
  {
    id: 'ninh-binh-tron-ven',
    slug: 'ninh-binh-tron-ven',
    title: 'Ninh Bình trọn vẹn',
    subtitle: 'Thiên nhiên – Văn hóa – Con người',
    durationDays: 3,
    durationNights: 2,
    badge: { label: '3N2D', icon: 'calendar' },
    audienceTags: ['gia-dinh', 'thien-nhien'],
    includedHighlights: [
      { icon: 'route', text: 'Tràng An – Hang Múa – Tam Cốc' },
      { icon: 'culture', text: 'Làng cổ Hoa Lư – văn hóa bản địa' },
      { icon: 'food', text: 'Ẩm thực đặc sản, nghỉ dưỡng tiện nghi' },
    ],
    fromPriceVnd: 2190000,
    priceUnit: 'người',
    popularity: 85,
    image: img(`${IMG}/combos/ninh-binh-tron-ven.webp`, 'Du khách đội mũ ngắm thung lũng Ninh Bình'),
    itinerary: [
      { day: 'Ngày 1', items: ['Tràng An', 'Nhận phòng'] },
      { day: 'Ngày 2', items: ['Hang Múa', 'Tam Cốc'] },
      { day: 'Ngày 3', items: ['Khám phá văn hóa bản địa', 'Kết thúc hành trình'] },
    ],
    included: ['2 đêm lưu trú', 'Bữa ăn theo lịch trình', 'Xe di chuyển trong lịch trình'],
    excluded: ['Vé tham quan (tư vấn theo thời điểm)', 'Chi phí cá nhân'],
    isDemo: true,
  },
  {
    id: 'ky-nghi-gia-dinh-xanh',
    slug: 'ky-nghi-gia-dinh-xanh',
    title: 'Kỳ nghỉ gia đình xanh',
    subtitle: 'Gắn kết yêu thương',
    durationDays: 2,
    durationNights: 1,
    badge: { label: 'Gia đình', icon: 'family' },
    audienceTags: ['gia-dinh', 'thien-nhien'],
    includedHighlights: [
      { icon: 'leaf', text: 'Lịch trình nhẹ nhàng, an toàn' },
      { icon: 'child', text: 'Trải nghiệm thiên nhiên cho trẻ em' },
      { icon: 'home', text: 'Nghỉ homestay/farmstay thân thiện' },
    ],
    fromPriceVnd: 1890000,
    priceUnit: 'người',
    popularity: 80,
    image: img(`${IMG}/combos/ky-nghi-gia-dinh-xanh.webp`, 'Gia đình đi dạo trên đường rừng'),
    itinerary: [
      { day: 'Ngày 1', items: ['Nhận phòng', 'Hoạt động thiên nhiên cho trẻ em', 'Ăn tối gia đình'] },
      { day: 'Ngày 2', items: ['Dạo rừng nhẹ nhàng', 'Kết thúc hành trình'] },
    ],
    included: ['1 đêm lưu trú gia đình', 'Bữa ăn theo lịch trình', 'Hoạt động trải nghiệm'],
    excluded: ['Vé tham quan (tư vấn theo thời điểm)', 'Chi phí cá nhân'],
    isDemo: true,
  },
  {
    id: 'team-building-ninh-binh',
    slug: 'team-building-ninh-binh',
    title: 'Team building Ninh Bình',
    subtitle: 'Kết nối – Bứt phá – Cùng nhau',
    durationDays: 2,
    durationNights: 1,
    badge: { label: 'Nhóm – Team', icon: 'team' },
    audienceTags: ['nhom'],
    includedHighlights: [
      { icon: 'team', text: 'Hoạt động team building ngoài trời' },
      { icon: 'mountain', text: 'Khám phá thiên nhiên, văn hóa' },
      { icon: 'route', text: 'Lịch trình linh hoạt theo nhu cầu' },
    ],
    fromPriceVnd: 1690000,
    priceUnit: 'người',
    popularity: 75,
    image: img(`${IMG}/combos/team-building-ninh-binh.webp`, 'Nhóm bạn giơ tay trên đỉnh núi'),
    itinerary: [
      { day: 'Ngày 1', items: ['Hoạt động nhóm ngoài trời', 'Gala tối (theo nhu cầu)'] },
      { day: 'Ngày 2', items: ['Khám phá thiên nhiên', 'Kết thúc hành trình'] },
    ],
    included: ['1 đêm lưu trú', 'Bữa ăn theo lịch trình', 'Điều phối hoạt động'],
    excluded: ['Vé tham quan (tư vấn theo thời điểm)', 'Chi phí cá nhân'],
    isDemo: true,
  },
];

export const combosById = new Map(combos.map((c) => [c.id, c]));

export const comboMatches = (combo: Combo, category: ComboCategory) => {
  if (category === 'all') return true;
  if (category === '2n1d') return combo.durationDays === 2 && combo.durationNights === 1;
  if (category === '3n2d') return combo.durationDays === 3 && combo.durationNights === 2;
  return combo.audienceTags.includes(category);
};

export type ComboSort = 'popular' | 'price-asc' | 'price-desc';

export const sortCombos = (list: Combo[], sort: ComboSort) =>
  [...list].sort((a, b) =>
    sort === 'price-asc'
      ? a.fromPriceVnd - b.fromPriceVnd
      : sort === 'price-desc'
        ? b.fromPriceVnd - a.fromPriceVnd
        : b.popularity - a.popularity,
  );

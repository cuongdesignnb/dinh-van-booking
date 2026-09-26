/**
 * Destination fixtures. Descriptions, tips, seasons, distances and itineraries
 * are mockup copy (`isDemo: true`) — not verified travel guidance. Opening
 * hours, ticket prices and access rules are intentionally absent.
 */
import type { ImageAsset } from './types';
import type { RichDocument } from '@/lib/content/rich-document';

const IMG = '/images/dinh-van-booking';

export type DestinationCategory = 'thien-nhien' | 'van-hoa' | 'check-in' | 'am-thuc' | 'gia-dinh';

export const DESTINATION_CATEGORIES: { id: DestinationCategory | 'all'; label: string }[] = [
  { id: 'all', label: 'Tất cả' },
  { id: 'thien-nhien', label: 'Thiên nhiên' },
  { id: 'van-hoa', label: 'Văn hóa' },
  { id: 'check-in', label: 'Check-in' },
  { id: 'am-thuc', label: 'Ẩm thực' },
  { id: 'gia-dinh', label: 'Gia đình' },
];

export type TipIcon = 'monkey' | 'walk' | 'center' | 'boat' | 'camera' | 'leaf' | 'check' | 'search' | 'plus' | 'mountain' | 'sun' | 'pin' | 'view' | 'food' | 'goat' | 'dish';

export interface Destination {
  id: string;
  slug?: string;
  publicPath?: string;
  metaTitle?: string | null;
  metaDescription?: string | null;
  noindex?: boolean;
  firstPublishedAt?: string | null;
  lastPublicChangedAt?: string | null;
  name: string;
  /** Short line used on the homepage strip. */
  subtitle: string;
  badge: string;
  tags: DestinationCategory[];
  summary: string;
  tips: { icon: TipIcon; text: string }[];
  description: string;
  /** Published CMS body; demo fixtures may omit it. */
  body?: RichDocument;
  activities: string[];
  notes: string[];
  image: ImageAsset;
  homeImage?: ImageAsset;
  nearbyImage?: ImageAsset;
  /** Distance/time from Cúc Phương Forest Homestay — demo copy. */
  fromStay?: { distance: string; time: string };
  /** Position on the illustrated map (percent). */
  mapPos?: { x: number; y: number };
  featured: boolean;
  isDemo?: boolean;
}

const img = (src: string, alt: string, width: number, height: number): ImageAsset => ({ src, alt, width, height });

export const destinations: Destination[] = [
  {
    id: 'vuon-quoc-gia-cuc-phuong',
    name: 'Vườn quốc gia Cúc Phương',
    subtitle: 'Khám phá rừng nguyên sinh',
    badge: 'Thiên nhiên',
    tags: ['thien-nhien', 'gia-dinh'],
    summary: 'Khu rừng nguyên sinh đầu tiên của Việt Nam với hệ sinh thái đa dạng.',
    tips: [
      { icon: 'monkey', text: 'Ngắm voọc mông trắng' },
      { icon: 'walk', text: 'Đi bộ xuyên rừng' },
      { icon: 'center', text: 'Tham quan Trung tâm cứu hộ' },
    ],
    description:
      'Rừng già với những cây cổ thụ lớn, lối mòn xuyên rừng và các chương trình bảo tồn động vật. Phù hợp đi bộ nhẹ nhàng cùng gia đình.',
    activities: ['Đi bộ trên các lối mòn trong rừng', 'Thăm trung tâm cứu hộ động vật', 'Ngắm cây cổ thụ'],
    notes: ['Mang giày đi bộ, nước uống', 'Giữ yên lặng, không cho động vật ăn', 'Mang rác ra khỏi rừng'],
    image: img(`${IMG}/destinations/vuon-quoc-gia-cuc-phuong.webp`, 'Lối mòn giữa rừng già Cúc Phương', 222, 115),
    homeImage: img(`${IMG}/destination-cuc-phuong.webp`, 'Cổng gỗ Vườn quốc gia Cúc Phương giữa rừng', 163, 80),
    nearbyImage: img(`${IMG}/nearby/vuon-quoc-gia-cuc-phuong.webp`, 'Cổng gỗ Vườn quốc gia Cúc Phương', 143, 52),
    fromStay: { distance: '2.5 km', time: '5 phút' },
    mapPos: { x: 8, y: 20 },
    featured: true,
    isDemo: true,
  },
  {
    id: 'ho-yen-quang',
    name: 'Hồ Yên Quang',
    subtitle: 'Vẻ đẹp yên bình giữa núi rừng',
    badge: 'Thiên nhiên',
    tags: ['thien-nhien', 'gia-dinh'],
    summary: 'Hồ nước trong xanh, phẳng lặng nằm giữa rừng, như một bức tranh thủy mặc.',
    tips: [
      { icon: 'boat', text: 'Chèo thuyền, ngắm cảnh' },
      { icon: 'camera', text: 'Chụp ảnh bình minh/hoàng hôn' },
      { icon: 'leaf', text: 'Không gian yên tĩnh, thư giãn' },
    ],
    description: 'Mặt hồ phẳng lặng soi bóng núi đá vôi, đẹp nhất vào sáng sớm và lúc hoàng hôn.',
    activities: ['Ngắm bình minh trên mặt hồ', 'Chụp ảnh phong cảnh', 'Dạo quanh bờ hồ'],
    notes: ['Hỏi người địa phương trước khi xuống thuyền', 'Mang áo khoác mỏng buổi sáng sớm'],
    image: img(`${IMG}/destinations/ho-yen-quang.webp`, 'Mặt hồ xanh giữa núi rừng', 222, 115),
    homeImage: img(`${IMG}/destination-yen-quang.webp`, 'Mặt hồ xanh phản chiếu dãy núi', 160, 80),
    nearbyImage: img(`${IMG}/nearby/ho-yen-quang.webp`, 'Mặt hồ Yên Quang', 143, 52),
    fromStay: { distance: '6 km', time: '12 phút' },
    mapPos: { x: 14, y: 88 },
    featured: true,
    isDemo: true,
  },
  {
    id: 'dong-nguoi-xua',
    name: 'Động Người Xưa',
    subtitle: 'Dấu tích lịch sử hàng nghìn năm',
    badge: 'Văn hóa',
    tags: ['van-hoa'],
    summary: 'Di tích khảo cổ đặc biệt với dấu tích người tiền sử, mang giá trị lịch sử lớn.',
    tips: [
      { icon: 'check', text: 'Khám phá dấu tích nghìn năm' },
      { icon: 'search', text: 'Tìm hiểu lịch sử khảo cổ' },
      { icon: 'plus', text: 'Kết hợp tham quan rừng' },
    ],
    description: 'Hang động nằm sâu trong rừng, lối vào rợp bóng cây, gắn với dấu tích người tiền sử.',
    activities: ['Tham quan hang động', 'Nghe hướng dẫn về khảo cổ', 'Kết hợp đi bộ trong rừng'],
    notes: ['Đường vào có bậc đá, nên mang giày bám', 'Mang đèn pin nhỏ'],
    image: img(`${IMG}/destinations/dong-nguoi-xua.webp`, 'Lòng hang động với nhũ đá', 208, 115),
    homeImage: img(`${IMG}/destination-dong-nguoi-xua.webp`, 'Nhóm du khách đi bộ trên đường rừng dẫn vào động', 161, 80),
    nearbyImage: img(`${IMG}/nearby/dong-nguoi-xua.webp`, 'Lối vào Hang Người Xưa', 143, 52),
    fromStay: { distance: '4 km', time: '10 phút' },
    mapPos: { x: 7.5, y: 50 },
    featured: true,
    isDemo: true,
  },
  {
    id: 'trang-an',
    name: 'Tràng An',
    subtitle: 'Non nước hữu tình, di sản thế giới',
    badge: 'Thiên nhiên',
    tags: ['thien-nhien', 'gia-dinh'],
    summary: 'Di sản thế giới với hệ thống hang động kỳ vĩ, sông nước thơ mộng.',
    tips: [
      { icon: 'boat', text: 'Đi thuyền qua hang động' },
      { icon: 'mountain', text: 'Ngắm núi đá vôi trùng điệp' },
      { icon: 'leaf', text: 'Trải nghiệm thiên nhiên di sản' },
    ],
    description: 'Ngồi thuyền len qua các hang xuyên thủy, giữa non nước hữu tình của quần thể danh thắng.',
    activities: ['Đi thuyền theo tuyến tham quan', 'Ngắm núi đá vôi', 'Chụp ảnh phong cảnh'],
    notes: ['Nên đi sớm để tránh nắng', 'Mang mũ, kem chống nắng'],
    image: img(`${IMG}/destinations/trang-an.webp`, 'Thuyền trên sông giữa núi đá vôi Tràng An', 208, 115),
    homeImage: img(`${IMG}/destination-trang-an.webp`, 'Thuyền nhỏ trên sông giữa các núi đá vôi Tràng An', 164, 80),
    mapPos: { x: 64, y: 38 },
    featured: true,
    isDemo: true,
  },
  {
    id: 'hang-mua',
    name: 'Hang Múa',
    subtitle: 'Ngắm Tam Cốc từ trên cao',
    badge: 'Check-in',
    tags: ['check-in'],
    summary: 'Chinh phục gần 500 bậc đá để ngắm trọn vẻ đẹp Tam Cốc từ trên cao.',
    tips: [
      { icon: 'sun', text: 'Săn bình minh, hoàng hôn' },
      { icon: 'pin', text: 'Check-in đỉnh Ngọa Long' },
      { icon: 'view', text: 'View toàn cảnh ngoạn mục' },
    ],
    description: 'Đường bậc đá dẫn lên đỉnh núi, từ trên cao nhìn xuống cánh đồng và dòng sông Tam Cốc.',
    activities: ['Leo bậc đá lên đỉnh', 'Chụp ảnh toàn cảnh', 'Ngắm hoàng hôn'],
    notes: ['Bậc đá dốc, cần sức khỏe tốt', 'Mang nước và giày bám'],
    image: img(`${IMG}/destinations/hang-mua.webp`, 'Đường bậc đá trên đỉnh núi Hang Múa', 220, 115),
    mapPos: { x: 63, y: 70 },
    featured: true,
    isDemo: true,
  },
  {
    id: 'am-thuc-ninh-binh',
    name: 'Ẩm thực Ninh Bình',
    subtitle: 'Thưởng thức đặc sản địa phương',
    badge: 'Ẩm thực',
    tags: ['am-thuc', 'gia-dinh'],
    summary: 'Thưởng thức hương vị đặc sản dân dã, đậm chất vùng đất cố đô.',
    tips: [
      { icon: 'food', text: 'Cơm cháy giòn rụm' },
      { icon: 'goat', text: 'Dê núi Ninh Bình' },
      { icon: 'dish', text: 'Gỏi cá nhệch, ốc núi, nem chua' },
    ],
    description: 'Dê núi, cơm cháy, rau rừng… những món ăn mộc mạc đậm vị núi rừng Ninh Bình.',
    activities: ['Thưởng thức cơm cháy', 'Ăn dê núi', 'Ghé chợ quê'],
    notes: ['Hỏi giá trước khi gọi món', 'Nhờ Đinh Vân gợi ý quán phù hợp'],
    image: img(`${IMG}/destinations/am-thuc-ninh-binh.webp`, 'Mâm đặc sản Ninh Bình', 222, 115),
    homeImage: img(`${IMG}/destination-am-thuc.webp`, 'Mâm cơm với nhiều món đặc sản địa phương', 176, 80),
    featured: true,
    isDemo: true,
  },
  {
    id: 'trung-tam-cuu-ho-linh-truong',
    name: 'Trung tâm cứu hộ linh trưởng',
    subtitle: 'Tìm hiểu công tác bảo tồn',
    badge: 'Thiên nhiên',
    tags: ['thien-nhien', 'gia-dinh'],
    summary: 'Nơi cứu hộ và bảo tồn các loài linh trưởng quý hiếm.',
    tips: [
      { icon: 'monkey', text: 'Tìm hiểu về linh trưởng' },
      { icon: 'leaf', text: 'Câu chuyện bảo tồn' },
      { icon: 'camera', text: 'Tham quan theo hướng dẫn' },
    ],
    description: 'Trung tâm tìm hiểu về công tác cứu hộ, bảo tồn linh trưởng trong khu vực Vườn quốc gia.',
    activities: ['Tham quan theo hướng dẫn', 'Tìm hiểu về bảo tồn'],
    notes: ['Tuân thủ hướng dẫn của nhân viên', 'Không cho động vật ăn'],
    image: img(`${IMG}/nearby/trung-tam-cuu-ho-linh-truong.webp`, 'Chú voọc ngồi trên cành cây', 143, 52),
    nearbyImage: img(`${IMG}/nearby/trung-tam-cuu-ho-linh-truong.webp`, 'Chú voọc ngồi trên cành cây', 143, 52),
    fromStay: { distance: '3 km', time: '8 phút' },
    featured: false,
    isDemo: true,
  },
];

export const destinationsById = new Map(destinations.map((d) => [d.id, d]));
export const featuredDestinations = destinations.filter((d) => d.featured);
/** The five destinations shown on the homepage strip, in mockup order. */
export const HOME_DESTINATION_IDS = [
  'vuon-quoc-gia-cuc-phuong',
  'ho-yen-quang',
  'dong-nguoi-xua',
  'trang-an',
  'am-thuc-ninh-binh',
];

export interface ItineraryStop {
  time: string;
  icon: 'car' | 'leaf' | 'food' | 'mountain' | 'water' | 'camera' | 'bed' | 'sun';
  title: string;
  detail?: string;
}

export interface Itinerary {
  id: string;
  label: string;
  sub: string;
  days: { title?: string; stops: ItineraryStop[] }[];
  isDemo: true;
}

export const itineraries: Itinerary[] = [
  {
    id: '1-ngay',
    label: '1 ngày',
    sub: 'Gần gũi thiên nhiên',
    days: [
      {
        stops: [
          { time: '08:00', icon: 'car', title: 'Khởi hành từ Hà Nội' },
          { time: '10:00', icon: 'leaf', title: 'Tham quan Vườn quốc gia Cúc Phương', detail: 'Đi bộ rừng, thăm Trung tâm cứu hộ linh trưởng' },
          { time: '12:00', icon: 'food', title: 'Ăn trưa đặc sản địa phương' },
          { time: '14:00', icon: 'mountain', title: 'Tham quan Động Người Xưa' },
          { time: '16:00', icon: 'water', title: 'Hồ Yên Quang', detail: 'Chèo thuyền, thư giãn, chụp ảnh' },
          { time: '17:30', icon: 'car', title: 'Kết thúc hành trình, trở về Hà Nội' },
        ],
      },
    ],
    isDemo: true,
  },
  {
    id: '2-ngay-1-dem',
    label: '2 ngày 1 đêm',
    sub: 'Trọn vẹn trải nghiệm',
    days: [
      {
        title: 'Ngày 1 — Rừng Cúc Phương',
        stops: [
          { time: '08:00', icon: 'car', title: 'Khởi hành, nhận phòng homestay' },
          { time: '10:30', icon: 'leaf', title: 'Đi bộ rừng Cúc Phương' },
          { time: '15:00', icon: 'water', title: 'Hồ Yên Quang lúc chiều' },
          { time: '19:00', icon: 'bed', title: 'Ăn tối, nghỉ đêm giữa rừng' },
        ],
      },
      {
        title: 'Ngày 2 — Tràng An',
        stops: [
          { time: '07:30', icon: 'sun', title: 'Ăn sáng, trả phòng' },
          { time: '09:30', icon: 'water', title: 'Đi thuyền Tràng An' },
          { time: '12:30', icon: 'food', title: 'Ăn trưa cơm cháy, dê núi' },
          { time: '15:00', icon: 'car', title: 'Kết thúc hành trình' },
        ],
      },
    ],
    isDemo: true,
  },
  {
    id: '3-ngay-2-dem',
    label: '3 ngày 2 đêm',
    sub: 'Khám phá sâu hơn',
    days: [
      {
        title: 'Ngày 1 — Đến Cúc Phương',
        stops: [
          { time: '09:00', icon: 'car', title: 'Khởi hành, nhận phòng' },
          { time: '14:00', icon: 'mountain', title: 'Động Người Xưa' },
          { time: '19:00', icon: 'bed', title: 'Nghỉ đêm homestay' },
        ],
      },
      {
        title: 'Ngày 2 — Rừng và hồ',
        stops: [
          { time: '07:00', icon: 'leaf', title: 'Đi bộ rừng buổi sáng' },
          { time: '13:30', icon: 'water', title: 'Hồ Yên Quang' },
          { time: '19:00', icon: 'food', title: 'Ăn tối món bản địa' },
        ],
      },
      {
        title: 'Ngày 3 — Tràng An, Hang Múa',
        stops: [
          { time: '08:00', icon: 'water', title: 'Đi thuyền Tràng An' },
          { time: '15:00', icon: 'camera', title: 'Hang Múa lúc chiều' },
          { time: '17:30', icon: 'car', title: 'Kết thúc hành trình' },
        ],
      },
    ],
    isDemo: true,
  },
];

export interface Season {
  id: string;
  name: string;
  months: string;
  summary: string;
  tips: string[];
  image: ImageAsset;
  isDemo: true;
}

export const seasons: Season[] = [
  {
    id: 'xuan',
    name: 'Mùa xuân',
    months: 'Tháng 2 - 4',
    summary: 'Rừng cây đâm chồi, hoa nở rực rỡ, thời tiết dễ chịu.',
    tips: ['Thích hợp đi bộ rừng', 'Mang áo mỏng, ô nhỏ phòng mưa phùn'],
    image: img(`${IMG}/seasons/xuan.webp`, 'Cây hoa hồng nở giữa rừng mùa xuân', 168, 72),
    isDemo: true,
  },
  {
    id: 'he',
    name: 'Mùa hè',
    months: 'Tháng 5 - 8',
    summary: 'Mùa xanh mát, lý tưởng cho trải nghiệm rừng và sông nước.',
    tips: ['Đi sớm để tránh nắng', 'Chuẩn bị đồ chống côn trùng'],
    image: img(`${IMG}/seasons/he.webp`, 'Đường rừng xanh mát mùa hè', 162, 72),
    isDemo: true,
  },
  {
    id: 'thu',
    name: 'Mùa thu',
    months: 'Tháng 9 - 11',
    summary: 'Thời tiết mát mẻ, cảnh sắc nên thơ, thích hợp check-in.',
    tips: ['Cánh đồng và núi rừng đẹp lúc hoàng hôn', 'Mang áo khoác mỏng buổi tối'],
    image: img(`${IMG}/seasons/thu.webp`, 'Cánh đồng lúa chín dưới núi lúc hoàng hôn', 168, 72),
    isDemo: true,
  },
  {
    id: 'dong',
    name: 'Mùa đông',
    months: 'Tháng 12 - 1',
    summary: 'Sương mờ huyền ảo, không khí trong lành, yên tĩnh.',
    tips: ['Mang áo ấm', 'Buổi sáng có sương, nên đi muộn hơn'],
    image: img(`${IMG}/seasons/dong.webp`, 'Núi rừng chìm trong sương mù', 162, 72),
    isDemo: true,
  },
];

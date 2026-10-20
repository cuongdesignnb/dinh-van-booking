/**
 * Points of interest for the Cúc Phương park map on /diem-den.
 * Positions are SVG coordinates of real OpenStreetMap locations (see park-map-geo.ts).
 * Names, walking times and the "guide required" rule come from the park's visitor map.
 * Descriptions stay factual and short; anything not confirmed is left out rather than guessed.
 */
import { projectLatLng } from './park-map-geo';

export type ParkPointKind = 'cave' | 'tree' | 'village' | 'nature' | 'service' | 'lake' | 'stay';

export interface ParkPoint {
  id: string;
  /** Number printed on the park's visitor map, when it has one. */
  no?: number;
  name: string;
  /** French / English names as written on the park map. */
  alt?: string;
  kind: ParkPointKind;
  x: number;
  y: number;
  summary: string;
  /** Walking times shown on the park map, e.g. "Từ Trung tâm Bống: khoảng 30 phút". */
  routes?: string[];
  /** Slug of a published destination page for this point, if any. */
  destinationSlug?: string;
  /** Show the label on the map without hovering (main landmarks only). */
  pinned?: boolean;
  /** Position estimated from the park's visitor map (not found in OpenStreetMap). */
  approx?: boolean;
  /** Where the label sits relative to the pin (default: below). */
  labelSide?: 'bottom' | 'top' | 'left' | 'right';
  /** Lodging from OpenStreetMap: real coordinates, used for the directions link. */
  lat?: number;
  lng?: number;
}

export const PARK_KIND_LABEL: Record<ParkPointKind, string> = {
  cave: 'Hang động',
  tree: 'Cây cổ thụ',
  village: 'Bản làng',
  nature: 'Núi & thác',
  lake: 'Hồ',
  service: 'Dịch vụ & bảo tồn',
  stay: 'Nơi lưu trú quanh vườn',
};

export const PARK_POINTS: ParkPoint[] = [
  {
    id: 'trung-tam-du-khach', name: 'Khu trung tâm du khách', alt: 'Visitor center', kind: 'service', x: 1397, y: 906, pinned: true, labelSide: 'left',
    summary: 'Cửa ngõ của vườn, nơi đón khách. Quanh khu này có trung tâm giới thiệu cứu hộ – bảo tồn động, thực vật hoang dã, các chương trình cứu hộ và bảo tồn động vật, nhà hàng, bảo tàng và vườn thực vật.',
    routes: ['Đến Hồ Mạc: khoảng 15 phút theo đường ô tô', 'Đến Trung tâm Bống: theo đường ô tô chính xuyên vườn'],
  },
  {
    id: 'cuu-ho-linh-truong', name: 'Trung tâm Cứu hộ Linh trưởng Nguy cấp', alt: 'Rescue & conservation programmes', kind: 'service', x: 1414, y: 918,
    summary: 'Thuộc khu các chương trình cứu hộ và bảo tồn động vật gần cổng vườn. Trung tâm thành lập năm 1993, cứu hộ và bảo tồn các loài linh trưởng nguy cấp của Việt Nam.',
    destinationSlug: 'trung-tam-cuu-ho-linh-truong-cuc-phuong',
  },
  {
    id: 'ho-mac', name: 'Hồ Mạc', alt: 'Lac Mac · Mac lake', kind: 'lake', x: 1359, y: 861,
    summary: 'Hồ nước gần khu trung tâm du khách, trên trục đường ô tô vào vườn.',
    routes: ['Đến khu trung tâm du khách: khoảng 15 phút đường ô tô', 'Gần cổng vườn'],
  },
  {
    id: 'ho-yen-quang', name: 'Hồ Yên Quang', alt: 'Lac Yen Quang · Yen Quang lake', kind: 'lake', x: 1411, y: 680, approx: true,
    summary: 'Hồ lớn nằm ở rìa phía đông của vườn, hướng về Nho Quan.',
  },
  {
    id: 'con-moong', no: 20, name: 'Động Con Moong', alt: 'Grotte de Con Moong · Con Moong cave', kind: 'cave', x: 892, y: 823,
    summary: 'Hang động có trên sơ đồ tham quan của vườn, được biết đến là một di chỉ khảo cổ thời tiền sử.',
  },
  {
    id: 'dong-nguoi-xua', no: 9, name: 'Động Người Xưa', alt: 'Grotte Dang · Dang cave (of prehistoric men)', kind: 'cave', x: 1139, y: 649, pinned: true, labelSide: 'right',
    summary: 'Còn gọi là hang Đắng. Năm 1966 các nhà khảo cổ khai quật và tìm thấy mộ táng cùng công cụ đá; hài cốt được xác định khoảng 7.500 năm. Hang dài khoảng 300 m, chia ba khoang.',
    routes: ['Từ đường ô tô: khoảng 6 phút đi bộ'],
    destinationSlug: 'dong-nguoi-xua-cuc-phuong',
  },
  {
    id: 'cay-dang-11', no: 11, name: 'Cây Đăng cổ thụ', alt: 'Arbre centenaire · Ancient tree', kind: 'tree', x: 1056, y: 676,
    summary: 'Cây cổ thụ trên tuyến đi bộ phía nam đường rừng, gần Động Người Xưa.',
    routes: ['Từ đường ô tô: khoảng 1 giờ đi bộ', 'Đến đường ô tô qua tuyến phía nam: khoảng 1 giờ 30 phút'],
  },
  {
    id: 'cay-dang-12', no: 12, name: 'Cây Đăng cổ thụ', alt: 'Arbre centenaire · Ancient tree', kind: 'tree', x: 985, y: 513,
    summary: 'Cây cổ thụ gần đường rừng Cúc Phương, đoạn giữa Trung tâm Bống và Động Người Xưa.',
    routes: ['Từ đường ô tô: khoảng 16–32 phút đi bộ'],
  },
  {
    id: 'trung-tam-bong', no: 10, name: 'Trung tâm Bống', alt: 'Centre du parc · Park center', kind: 'service', x: 750, y: 328, pinned: true, labelSide: 'right',
    summary: 'Khu trung tâm giữa rừng, cuối đường ô tô. Đây là điểm xuất phát của nhiều tuyến đi bộ tới các cây cổ thụ, Động Sơn Cung và Đỉnh Mây Bạc.',
    routes: ['Đến Cây Chò chỉ: khoảng 30 phút', 'Đến Cây Nhội cổ thụ: khoảng 1 giờ', 'Đến Đỉnh Mây Bạc: khoảng 2 giờ'],
  },
  {
    id: 'cay-cho-chi', no: 13, name: 'Cây Chò chỉ', alt: 'Grand arbre · Big tree', kind: 'tree', x: 815, y: 402, labelSide: 'top',
    summary: 'Cây cổ thụ lớn trên tuyến đi bộ ngắn từ Trung tâm Bống.',
    routes: ['Từ Trung tâm Bống: khoảng 30 phút đi bộ'],
  },
  {
    id: 'cay-nghin-nam', name: 'Cây nghìn năm tuổi', alt: 'Thousand Year Old Tree', kind: 'tree', x: 754, y: 258, labelSide: 'top',
    summary: 'Cây cổ thụ ở phía bắc Trung tâm Bống, có đường mòn riêng dẫn tới (trên bản đồ là tuyến “Thousand Year Old Tree Trail”).',
  },
  {
    id: 'cay-nhoi', no: 15, name: 'Cây Nhội cổ thụ', alt: 'Arbre centenaire · Ancient tree', kind: 'tree', x: 714, y: 322,
    summary: 'Cây cổ thụ phía tây Trung tâm Bống, trên tuyến đi bộ trong rừng.',
    routes: ['Từ Trung tâm Bống: khoảng 1 giờ'],
  },
  {
    id: 'dong-son-cung', no: 17, name: 'Động Sơn Cung', alt: 'Grotte du palais · Palace cave', kind: 'cave', x: 771, y: 267,
    summary: 'Hang động phía bắc Trung tâm Bống, trên tuyến đi bộ lên vùng núi.',
    routes: ['Từ Trung tâm Bống: khoảng 1 giờ đi bộ'],
  },
  {
    id: 'dinh-may-bac', no: 16, name: 'Đỉnh Mây Bạc', alt: 'Nuages d’argent · Silver cloudy peak', kind: 'nature', x: 786, y: 274, pinned: true, labelSide: 'top',
    summary: 'Đỉnh núi trên tuyến đi bộ dài hơn từ Trung tâm Bống.',
    routes: ['Từ Trung tâm Bống: khoảng 2 giờ', 'Theo sơ đồ của vườn có tuyến nối tiếp xuống đường ô tô'],
  },
  {
    id: 'ban-khanh', no: 19, name: 'Bản Khanh', alt: 'Village de Khanh', kind: 'village', x: 344, y: 166,
    summary: 'Bản làng ở thuỳ tây bắc của vườn, có homestay đón khách đi bộ đường dài.',
      },
  {
    id: 'ban-cao-dang', no: 23, name: 'Bản Cao Đăng', alt: 'Village de Cao Dang', kind: 'village', x: 110, y: 255, approx: true,
    summary: 'Bản làng ở cực tây của vườn, gần Thác Mây.',
    routes: ['Đến Trung tâm du lịch số 2: khoảng 2 giờ'],
  },
  {
    id: 'thac-may', no: 24, name: 'Thác Mây', alt: 'Cascade May · May waterfall', kind: 'nature', x: 170, y: 290, approx: true,
    summary: 'Thác nước ở khu vực phía tây vườn, gần Bản Cao Đăng.',
  },
  {
    id: 'trung-tam-du-lich-2', name: 'Trung tâm du lịch số 2', alt: 'Centre de tourisme Nº2', kind: 'service', x: 222, y: 342, approx: true,
    summary: 'Điểm dịch vụ ở phía tây vườn, đầu tuyến đi Bản Cao Đăng.',
    routes: ['Đến Bản Cao Đăng: khoảng 2 giờ'],
  },
  {
    id: 'ban-bien', no: 22, name: 'Bản Biện', alt: 'Village de Bien', kind: 'village', x: 340, y: 250, approx: true,
    summary: 'Bản làng phía tây vườn, trên tuyến đi bộ dài nối với Trung tâm Bống và Bản Khanh.',
    routes: ['Đến Bản Khanh: khoảng 1 giờ', 'Đến Cây Nhội cổ thụ: khoảng 5 giờ'],
  },
  {
    id: 'ban-trac', no: 21, name: 'Bản Trạc', alt: 'Village de Trac', kind: 'village', x: 505, y: 92, approx: true,
    summary: 'Bản làng ở rìa phía bắc vườn, về phía Hòa Bình.',
    routes: ['Đến Bản Khanh: khoảng 6 giờ'],
  },
  {
    id: 'cay-sau', no: 14, name: 'Cây Sấu cổ thụ', alt: 'Arbre centenaire · Ancient tree', kind: 'tree', x: 766, y: 354, approx: true,
    summary: 'Cây cổ thụ gần Trung tâm Bống.',
    routes: ['Từ Trung tâm Bống: khoảng 30 phút đi bộ'],
  },
  {
    id: 'cay-dang-dong-dau', no: 18, name: 'Cây Dăng Đồng Dâu', alt: 'Arbre centenaire de Dong Dau · Dong Dau ancient tree', kind: 'tree', x: 862, y: 332, approx: true,
    summary: 'Cây cổ thụ nằm giữa Đỉnh Mây Bạc và đường rừng Cúc Phương.',
    routes: ['Từ Đỉnh Mây Bạc: khoảng 1 giờ 30 phút', 'Xuống đường ô tô: khoảng 1 giờ'],
  },
  {
    id: 'tram-kiem-lam-1', name: 'Trạm kiểm lâm số 1', alt: 'Poste de rangers Nº1', kind: 'service', x: 912, y: 482, approx: true,
    summary: 'Trạm kiểm lâm trên đường rừng Cúc Phương, gần lối lên tuyến Cây Dăng Đồng Dâu.',
  },
  {
    id: 'tram-kiem-lam-dang', name: 'Trạm kiểm lâm Dang', alt: 'Poste de rangers Dang', kind: 'service', x: 1236, y: 772, approx: true,
    summary: 'Trạm kiểm lâm trên đường rừng, đoạn giữa Động Người Xưa và khu trung tâm du khách.',
    routes: ['Đến Cây Đăng cổ thụ (11): khoảng 1 giờ 30 phút đi bộ'],
  },
  {
    id: 'xuong-hoa-thach', name: 'Bộ xương hóa thạch', alt: 'Fossile de dinosaure · Dinosaur fossil', kind: 'nature', x: 912, y: 772, approx: true,
    summary: 'Điểm có dấu tích hóa thạch, đánh dấu trên sơ đồ tham quan của vườn.',
  },
];

/* Lodging around the park as mapped in OpenStreetMap (named places only), for reference.
   Cúc Phương Travel does not represent these businesses. */
const OSM_STAYS: Array<{ id: string; name: string; type: string; lat: number; lng: number }> = [
  { id: 'stay-park-guesthouse', name: 'Cuc Phuong National Park Guesthouse', type: 'Nhà nghỉ', lat: 20.25008, lng: 105.71451 },
  { id: 'stay-kha-hang-binh-tan', name: 'Kha Hang Binh Tan', type: 'Nhà nghỉ', lat: 20.24138, lng: 105.72497 },
  { id: 'stay-bong', name: 'Nhà nghỉ ở Bống', type: 'Nhà nghỉ', lat: 20.3482, lng: 105.5977 },
  { id: 'stay-khanh-1', name: 'Cuc Phuong Homestay - Khanh Village', type: 'Homestay', lat: 20.36488, lng: 105.52896 },
  { id: 'stay-khanh-2', name: 'Khanh Village - Cuc Phuong Homestay', type: 'Homestay', lat: 20.38673, lng: 105.5196 },
  { id: 'stay-bo-pho-ve-rung', name: 'Homestay Bỏ Phố Về Rừng', type: 'Homestay', lat: 20.33526, lng: 105.51076 },
  { id: 'stay-quang-duc', name: 'Quang Duc Homestay & Restaurant', type: 'Homestay, nhà hàng', lat: 20.33319, lng: 105.51854 },
  { id: 'stay-phuoc-tam', name: 'Phuôc Tám', type: 'Nhà nghỉ', lat: 20.39361, lng: 105.62049 },
];

const GATE = { name: 'cổng vườn (khu trung tâm du khách)', lat: 20.25003, lng: 105.71528 };
const BONG = { name: 'Trung tâm Bống', lat: 20.3483, lng: 105.5979 };
const km = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const r = Math.PI / 180;
  const h = Math.sin(((b.lat - a.lat) * r) / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(((b.lng - a.lng) * r) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
};

export const PARK_STAYS: ParkPoint[] = OSM_STAYS.map((stay) => {
  const { x, y } = projectLatLng(stay.lat, stay.lng);
  const toGate = km(stay, GATE);
  const toBong = km(stay, BONG);
  const near = toGate <= toBong ? { ...GATE, d: toGate } : { ...BONG, d: toBong };
  const distance = near.d < 0.3 ? `Ngay cạnh ${near.name}` : `Cách ${near.name} khoảng ${near.d.toFixed(1).replace('.', ',')} km (đường chim bay)`;
  return {
    id: stay.id, name: stay.name, alt: stay.type, kind: 'stay', x: Math.round(x), y: Math.round(y), lat: stay.lat, lng: stay.lng,
    summary: 'Cơ sở lưu trú có trên OpenStreetMap. Thông tin chỉ để tham khảo; Cúc Phương Travel không đại diện cho cơ sở này. Hãy liên hệ trực tiếp cơ sở, hoặc nhờ Đinh Vân tư vấn chỗ nghỉ phù hợp.',
    routes: [distance],
  };
});

export const PARK_MAP_NOTE = 'Vị trí và thời gian đi bộ tham khảo theo sơ đồ tham quan của Vườn quốc gia Cúc Phương. Các tuyến đi phải có hướng dẫn viên của vườn đi cùng; hãy hỏi ban quản lý vườn về tuyến đang mở trước khi đi.';

/** A photo of a map point. Admin-managed albums come first; these are the fallback. */
export interface ParkPhoto {
  src: string;
  /** Small version for the pin and the thumbnail strip. */
  thumb?: string;
  alt: string;
  width: number;
  height: number;
  /** Author · licence · source, required for Commons photos. */
  credit?: string;
  href?: string;
}

/* Freely licensed photos from Wikimedia Commons that are verifiably of the point itself
   (file title or description names the place). Places without such a photo get none:
   a generic forest or cave picture would mislead visitors. */
export const PARK_COMMONS_PHOTOS: Record<string, ParkPhoto[]> = {
  'cay-nghin-nam': [
    { src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/58/Thousand_year_old_tree_in_Cuc_Phuong_National_Park%2C_Vietnam.jpg/960px-Thousand_year_old_tree_in_Cuc_Phuong_National_Park%2C_Vietnam.jpg', thumb: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/58/Thousand_year_old_tree_in_Cuc_Phuong_National_Park%2C_Vietnam.jpg/330px-Thousand_year_old_tree_in_Cuc_Phuong_National_Park%2C_Vietnam.jpg', alt: 'Cây nghìn năm tuổi trong Vườn quốc gia Cúc Phương', width: 960, height: 1280, credit: 'TomFitzhenry · CC BY-SA 4.0 · Wikimedia Commons', href: 'https://commons.wikimedia.org/wiki/File:Thousand_year_old_tree_in_Cuc_Phuong_National_Park,_Vietnam.jpg' },
  ],
  'cuu-ho-linh-truong': [
    { src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/2024-03-28-Pygathrix_nemaeus-3147.jpg/960px-2024-03-28-Pygathrix_nemaeus-3147.jpg', thumb: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/2024-03-28-Pygathrix_nemaeus-3147.jpg/330px-2024-03-28-Pygathrix_nemaeus-3147.jpg', alt: 'Voọc chà vá chân nâu tại Trung tâm Cứu hộ Linh trưởng Nguy cấp', width: 960, height: 1440, credit: 'Superbass · CC BY-SA 4.0 · Wikimedia Commons', href: 'https://commons.wikimedia.org/wiki/File:2024-03-28-Pygathrix_nemaeus-3147.jpg' },
    { src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f0/Primates_-_Endangered_Primate_Rescue_Center%2C_Cuc_Phuong_National_Park_%2837627417282%29.jpg/960px-Primates_-_Endangered_Primate_Rescue_Center%2C_Cuc_Phuong_National_Park_%2837627417282%29.jpg', thumb: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f0/Primates_-_Endangered_Primate_Rescue_Center%2C_Cuc_Phuong_National_Park_%2837627417282%29.jpg/330px-Primates_-_Endangered_Primate_Rescue_Center%2C_Cuc_Phuong_National_Park_%2837627417282%29.jpg', alt: 'Các cá thể linh trưởng tại trung tâm cứu hộ', width: 960, height: 720, credit: 'U.S. Government Accountability Office · Public domain · Wikimedia Commons', href: 'https://commons.wikimedia.org/wiki/File:Primates_-_Endangered_Primate_Rescue_Center,_Cuc_Phuong_National_Park_(37627417282).jpg' },
    { src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Primate_-_Endangered_Primate_Rescue_Center%2C_Cuc_Phuong_National_Park_%2837610607266%29.jpg/960px-Primate_-_Endangered_Primate_Rescue_Center%2C_Cuc_Phuong_National_Park_%2837610607266%29.jpg', thumb: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Primate_-_Endangered_Primate_Rescue_Center%2C_Cuc_Phuong_National_Park_%2837610607266%29.jpg/330px-Primate_-_Endangered_Primate_Rescue_Center%2C_Cuc_Phuong_National_Park_%2837610607266%29.jpg', alt: 'Một cá thể linh trưởng tại trung tâm cứu hộ', width: 960, height: 720, credit: 'U.S. Government Accountability Office · Public domain · Wikimedia Commons', href: 'https://commons.wikimedia.org/wiki/File:Primate_-_Endangered_Primate_Rescue_Center,_Cuc_Phuong_National_Park_(37610607266).jpg' },
    { src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b7/Primates_-_Endangered_Primate_Rescue_Center%2C_Cuc_Phuong_National_Park_%2837610616456%29.jpg/960px-Primates_-_Endangered_Primate_Rescue_Center%2C_Cuc_Phuong_National_Park_%2837610616456%29.jpg', thumb: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b7/Primates_-_Endangered_Primate_Rescue_Center%2C_Cuc_Phuong_National_Park_%2837610616456%29.jpg/330px-Primates_-_Endangered_Primate_Rescue_Center%2C_Cuc_Phuong_National_Park_%2837610616456%29.jpg', alt: 'Linh trưởng tại Trung tâm Cứu hộ Linh trưởng Nguy cấp', width: 960, height: 720, credit: 'U.S. Government Accountability Office · Public domain · Wikimedia Commons', href: 'https://commons.wikimedia.org/wiki/File:Primates_-_Endangered_Primate_Rescue_Center,_Cuc_Phuong_National_Park_(37610616456).jpg' },
    { src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/33/Baby_primate_-_Endangered_Primate_Rescue_Center%2C_Cuc_Phuong_National_Park_%2837627416892%29.jpg/960px-Baby_primate_-_Endangered_Primate_Rescue_Center%2C_Cuc_Phuong_National_Park_%2837627416892%29.jpg', thumb: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/33/Baby_primate_-_Endangered_Primate_Rescue_Center%2C_Cuc_Phuong_National_Park_%2837627416892%29.jpg/330px-Baby_primate_-_Endangered_Primate_Rescue_Center%2C_Cuc_Phuong_National_Park_%2837627416892%29.jpg', alt: 'Linh trưởng con tại trung tâm cứu hộ', width: 960, height: 1280, credit: 'U.S. Government Accountability Office · Public domain · Wikimedia Commons', href: 'https://commons.wikimedia.org/wiki/File:Baby_primate_-_Endangered_Primate_Rescue_Center,_Cuc_Phuong_National_Park_(37627416892).jpg' },
  ],
};

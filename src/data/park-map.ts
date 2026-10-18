/**
 * Points of interest for the illustrated Cúc Phương park map on /diem-den.
 * Positions are relative (0–1920 × 0–1028 viewBox) and only approximate the
 * layout of the national park's visitor map; names, walking times and the
 * "guide required" rule come from that map. Descriptions stay factual and
 * short; anything not confirmed is left out rather than guessed.
 */

export type ParkPointKind = 'cave' | 'tree' | 'village' | 'nature' | 'service' | 'lake';

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
}

export const PARK_KIND_LABEL: Record<ParkPointKind, string> = {
  cave: 'Hang động',
  tree: 'Cây cổ thụ',
  village: 'Bản làng',
  nature: 'Núi & thác',
  lake: 'Hồ',
  service: 'Dịch vụ & bảo tồn',
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
];

export const PARK_MAP_NOTE = 'Vị trí và thời gian đi bộ tham khảo theo sơ đồ tham quan của Vườn quốc gia Cúc Phương. Các tuyến đi phải có hướng dẫn viên của vườn đi cùng; hãy hỏi ban quản lý vườn về tuyến đang mở trước khi đi.';

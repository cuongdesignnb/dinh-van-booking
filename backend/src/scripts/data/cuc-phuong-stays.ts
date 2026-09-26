/**
 * Curated, source-backed seed manifest for accommodation around Cúc Phương.
 *
 * This file intentionally contains facts needed to create a draft catalogue
 * record only.  It does not contain Google Maps media, ratings, reviews,
 * prices, room counts, coordinates, or availability.
 */

export const CUC_PHUONG_IMPORT_VERSION = '2026-09-22.v1';
export const CUC_PHUONG_CHECKED_AT = '2026-09-22';
export const CUC_PHUONG_AREA = 'Cúc Phương, Ninh Bình';

export type SourceKind = 'official' | 'ota' | 'directory' | 'press' | 'derived';

export type FieldSource = {
  key: string;
  url: string;
  kind: SourceKind;
  checkedAt: string;
  fields: readonly string[];
  note?: string;
};

export type ImportedRoomType = {
  code: string;
  name: string;
  description: string;
  maxAdults: number;
  maxChildren: number;
  maxOccupancy: number;
  areaSqm: number | null;
  status: 'inactive';
};

export type ImportedSupplier = {
  name: string;
  contactPhone?: string;
  note?: string;
};

export type ImportedStay = {
  code: string;
  title: string;
  kind: string;
  area: string;
  address: string;
  slug: string;
  excerpt: string;
  description: string;
  aliases: readonly string[];
  confidence: 'high' | 'medium';
  supplier?: ImportedSupplier;
  roomTypes?: readonly ImportedRoomType[];
  sources: readonly FieldSource[];
};

const officialTourism = (fields: readonly string[], note?: string): FieldSource => ({
  key: 'ninh-binh-tourism-accommodation-list',
  url: 'https://sodulich.ninhbinh.gov.vn/vi/co-so-luu-tru/co-so-luu-tru-du-lich-da-tham-dinh-va-kiem-tra-du-dieu-kien-toi-thieu-148.html',
  kind: 'official',
  checkedAt: CUC_PHUONG_CHECKED_AT,
  fields,
  note,
});

const wyndham = (fields: readonly string[]): FieldSource => ({
  key: 'wyndham-grand-vedana-official',
  url: 'https://www.wyndhamhotels.com/en-ca/wyndham-grand/ninh-binh-vietnam/wyndham-grand-vedana-ninh-binh/overview',
  kind: 'official',
  checkedAt: CUC_PHUONG_CHECKED_AT,
  fields,
});

const vedana = (fields: readonly string[]): FieldSource => ({
  key: 'vedana-official',
  url: 'https://www.vedanaresort.com/',
  kind: 'official',
  checkedAt: CUC_PHUONG_CHECKED_AT,
  fields,
});

const mineral = (fields: readonly string[]): FieldSource => ({
  key: 'cuc-phuong-mineral-retreat-official',
  url: 'https://cucphuongmineralretreat.com/',
  kind: 'official',
  checkedAt: CUC_PHUONG_CHECKED_AT,
  fields,
});

const cucPhuongResort = (fields: readonly string[], note?: string): FieldSource => ({
  key: 'cuc-phuong-resort-official-accommodation',
  url: 'https://cucphuongresort.com.vn/accommodation/',
  kind: 'official',
  checkedAt: CUC_PHUONG_CHECKED_AT,
  fields,
  note,
});

const booking = (key: string, url: string, fields: readonly string[]): FieldSource => ({
  key,
  url,
  kind: 'ota',
  checkedAt: CUC_PHUONG_CHECKED_AT,
  fields,
  note: 'Chỉ dùng để đối chiếu tên và sự hiện diện của cơ sở; không nhập nội dung thương mại từ OTA.',
});

const press = (fields: readonly string[]): FieldSource => ({
  key: 'ninh-binh-press-silver-cloud',
  url: 'https://baoninhbinh.org.vn/glamping-san-pham-du-lich-he-day-hua-hen/d2023032215063906.htm',
  kind: 'press',
  checkedAt: CUC_PHUONG_CHECKED_AT,
  fields,
});

const silverCloudDirectory = (fields: readonly string[]): FieldSource => ({
  key: 'silver-cloud-retreat-listing',
  url: 'https://www.tripadvisor.com.vn/Hotel_Review-g303945-d27420251-Reviews-Silver_Cloud_Retreat-Ninh_Binh_Ninh_Binh_Province.html',
  kind: 'directory',
  checkedAt: CUC_PHUONG_CHECKED_AT,
  fields,
  note: 'Chỉ dùng để đối chiếu tên và địa điểm; không nhập rating, review hay giá.',
});

const derived = (fields: readonly string[], note: string): FieldSource => ({
  key: 'catalog-normalization',
  url: 'https://sodulich.ninhbinh.gov.vn/vi/co-so-luu-tru/co-so-luu-tru-du-lich-da-tham-dinh-va-kiem-tra-du-dieu-kien-toi-thieu-148.html',
  kind: 'derived',
  checkedAt: CUC_PHUONG_CHECKED_AT,
  fields,
  note,
});

const mineralRoomTypes: readonly ImportedRoomType[] = [
  {
    code: 'EXECUTIVE-VILLA',
    name: 'Executive Villa',
    description: 'Hạng phòng được ghi nhận từ website chính chủ; sức chứa, đơn vị phòng và điều kiện bán đang chờ xác minh. Không mở bán.',
    maxAdults: 1,
    maxChildren: 0,
    maxOccupancy: 1,
    areaSqm: 43,
    status: 'inactive',
  },
  {
    code: 'PREMIUM-VILLA',
    name: 'Premium Villa',
    description: 'Hạng phòng được ghi nhận từ website chính chủ; sức chứa, đơn vị phòng và điều kiện bán đang chờ xác minh. Không mở bán.',
    maxAdults: 1,
    maxChildren: 0,
    maxOccupancy: 1,
    areaSqm: 37,
    status: 'inactive',
  },
  {
    code: 'FAMILY-VILLA',
    name: 'Family Villa',
    description: 'Hạng phòng được ghi nhận từ website chính chủ; sức chứa, đơn vị phòng và điều kiện bán đang chờ xác minh. Không mở bán.',
    maxAdults: 1,
    maxChildren: 0,
    maxOccupancy: 1,
    areaSqm: 32,
    status: 'inactive',
  },
  {
    code: 'FAMILY-SUITE-BUNGALOW',
    name: 'Family Suite Bungalow',
    description: 'Hạng phòng được ghi nhận từ website chính chủ; sức chứa, đơn vị phòng và điều kiện bán đang chờ xác minh. Không mở bán.',
    maxAdults: 1,
    maxChildren: 0,
    maxOccupancy: 1,
    areaSqm: 49,
    status: 'inactive',
  },
  {
    code: 'DELUXE-BUNGALOW',
    name: 'Deluxe Bungalow',
    description: 'Hạng phòng được ghi nhận từ website chính chủ; sức chứa, đơn vị phòng và điều kiện bán đang chờ xác minh. Không mở bán.',
    maxAdults: 1,
    maxChildren: 0,
    maxOccupancy: 1,
    areaSqm: 49,
    status: 'inactive',
  },
];

const allFields = ['code', 'title', 'kind', 'area', 'address', 'slug', 'excerpt', 'description', 'aliases', 'confidence'];

/**
 * The 11 canonical records. Keep aliases here because they are part of the
 * deduplication decision, not user-facing copy.
 */
export const CUC_PHUONG_STAYS: readonly ImportedStay[] = [
  {
    code: 'CP-WYNDHAM-VEDANA',
    title: 'Wyndham Grand Vedana Ninh Binh',
    kind: 'resort',
    area: CUC_PHUONG_AREA,
    address: 'Thôn Đồng Tâm, xã Cúc Phương, huyện Nho Quan, Ninh Bình',
    slug: 'wyndham-grand-vedana-ninh-binh',
    excerpt: 'Khu nghỉ dưỡng Vedana tại Cúc Phương; hồ sơ đang chờ xác minh trực tiếp trước khi xuất bản.',
    description: 'Khu nghỉ dưỡng mang thương hiệu Wyndham tại khu vực Đồng Tâm, Cúc Phương. Bản ghi này chỉ lưu thông tin nhận diện và địa chỉ đối chiếu; chưa mở bán.',
    aliases: ['Wyndham Vedana', 'Vedana Resort Ninh Bình', 'Wyndham Grand Vedana'],
    confidence: 'high',
    supplier: { name: 'Wyndham Grand Vedana Ninh Binh', contactPhone: '+84-229-3593777' },
    sources: [
      wyndham([...allFields, 'supplier']),
      vedana(['title', 'area', 'address', 'aliases']),
      officialTourism(['title', 'area', 'address', 'aliases'], 'Danh sách chính thức có tên Vedana Resort Ninh Bình.'),
      derived(['code', 'slug', 'excerpt', 'description', 'confidence'], 'Mã, slug và mô tả là dữ liệu chuẩn hoá nội bộ từ các nguồn đối chiếu.'),
    ],
  },
  {
    code: 'CP-MINERAL-RETREAT',
    title: 'Cúc Phương Mineral Retreat',
    kind: 'resort',
    area: CUC_PHUONG_AREA,
    address: 'Khu vực Đồng Tâm, xã Cúc Phương, huyện Nho Quan, Ninh Bình',
    slug: 'cuc-phuong-mineral-retreat',
    excerpt: 'Khu nghỉ dưỡng Cúc Phương Mineral Retreat; dữ liệu lưu trú đang chờ xác minh trực tiếp.',
    description: 'Cơ sở nghỉ dưỡng tại khu vực Cúc Phương, được đối chiếu với website chính chủ và hồ sơ tên cũ liên quan. Chỉ ghi nhận năm hạng phòng, chưa tạo phòng thực tế hay mở bán.',
    aliases: ['Cúc Phương Resort & Spa', 'Cuc Phuong Resort', 'Tropical Retreat', 'Hồ câu resort', 'Ruby Villa', 'Ovana Villa', 'Quê Nhà Villa'],
    confidence: 'high',
    supplier: { name: 'Cúc Phương Mineral Retreat', contactPhone: '+84-85-272-7979', note: 'Số liên hệ công khai từ website chính chủ; cần xác minh lại trước khi dùng vận hành.' },
    roomTypes: mineralRoomTypes,
    sources: [
      mineral(['title', 'area', 'address', 'aliases', 'supplier', 'roomTypes']),
      cucPhuongResort(['title', 'aliases', 'roomTypes'], 'Website tên cũ được dùng để đối chiếu năm hạng phòng và diện tích công bố.'),
      officialTourism(['title', 'area', 'address', 'aliases'], 'Danh sách chính thức có tên Cúc Phương Resort & Spa.'),
      derived(['code', 'slug', 'kind', 'excerpt', 'description', 'confidence'], 'Mã, slug và mô tả là dữ liệu chuẩn hoá nội bộ; các hồ sơ con được gộp theo quyết định biên tập.'),
    ],
  },
  {
    code: 'CP-CUC-PHUONG-BUNGALOW',
    title: 'Cúc Phương Bungalow / Cúc Phương Hotel',
    kind: 'bungalow',
    area: CUC_PHUONG_AREA,
    address: 'Khu vực Đồng Tâm, xã Cúc Phương, huyện Nho Quan, Ninh Bình',
    slug: 'cuc-phuong-bungalow',
    excerpt: 'Cơ sở lưu trú mang tên Cúc Phương Bungalow; hồ sơ được gộp với tên Cúc Phương Hotel.',
    description: 'Cơ sở lưu trú được chuẩn hoá thành một property cho hai tên Cúc Phương Bungalow và Cúc Phương Hotel. Chưa xác minh trực tiếp tình trạng khai thác hiện tại.',
    aliases: ['Cúc Phương Hotel', 'Cuc Phuong Bungalow'],
    confidence: 'medium',
    sources: [
      booking('cuc-phuong-bungalow-booking', 'https://www.booking.com/hotel/vn/cuc-phuong.html', ['title', 'area', 'address', 'aliases']),
      booking('cuc-phuong-bungalow-trip', 'https://vn.trip.com/hotels/-hotel-detail-6344188/cuc-phuong-bungalow/', ['title', 'aliases']),
      derived(['code', 'slug', 'kind', 'excerpt', 'description', 'confidence'], 'Hai tên hiển thị được gộp thành một mã chuẩn để tránh tạo bản ghi trùng.'),
    ],
  },
  {
    code: 'CP-NATIONAL-PARK-LODGE',
    title: 'Khu lưu trú Vườn quốc gia Cúc Phương',
    kind: 'lodge',
    area: CUC_PHUONG_AREA,
    address: 'Trong Vườn quốc gia Cúc Phương, xã Cúc Phương, huyện Nho Quan, Ninh Bình',
    slug: 'khu-luu-tru-vuon-quoc-gia-cuc-phuong',
    excerpt: 'Khu lưu trú trong Vườn quốc gia Cúc Phương; hồ sơ đang chờ xác minh dịch vụ và tồn phòng.',
    description: 'Khu lưu trú nằm trong phạm vi Vườn quốc gia Cúc Phương. Bản ghi chỉ phục vụ quản trị nội bộ và chưa chứa hạng phòng, giá hoặc tồn phòng.',
    aliases: ['KS Vườn QG Cúc Phương', 'Khu lưu trú VQG Cúc Phương'],
    confidence: 'medium',
    sources: [
      officialTourism(['title', 'area', 'address', 'aliases'], 'Danh sách chính thức có tên khách sạn Vườn quốc gia Cúc Phương.'),
      booking('national-park-lodge-secondary', 'https://nhahangdenuininhbinh.vn/luu-tru/nha-nghi-vuon-quoc-gia-cuc-phuong/', ['title', 'area', 'address', 'aliases'],),
      derived(['code', 'slug', 'kind', 'excerpt', 'description', 'confidence'], 'Tên chuẩn được rút gọn theo ngữ cảnh quản trị; không suy diễn quy mô lưu trú.'),
    ],
  },
  {
    code: 'CP-MEBI',
    title: 'Hotel Cúc Phương Mebi',
    kind: 'lodge',
    area: CUC_PHUONG_AREA,
    address: 'Khu vực đường rừng Cúc Phương, xã Cúc Phương, huyện Nho Quan, Ninh Bình',
    slug: 'hotel-cuc-phuong-mebi',
    excerpt: 'Hotel Cúc Phương Mebi; bản ghi nhận diện đang chờ xác minh trực tiếp.',
    description: 'Cơ sở lưu trú mang tên Hotel Cúc Phương Mebi trong khu vực Cúc Phương. Chỉ lưu nhận diện và khu vực tham chiếu, chưa mở bán.',
    aliases: ['Cúc Phương Mebi', 'Cuc Phuong Mebi Hotel'],
    confidence: 'medium',
    sources: [
      booking('cuc-phuong-mebi-booking', 'https://www.booking.com/hotel/vn/cuc-phuong-mebi.html', ['title', 'area', 'address', 'aliases']),
      derived(['code', 'slug', 'kind', 'excerpt', 'description', 'confidence'], 'Địa chỉ được giữ ở mức khu vực vì nguồn đối chiếu không đủ để xác nhận số nhà.'),
    ],
  },
  {
    code: 'CP-HAO-THAM',
    title: 'Nhà nghỉ Hảo Thắm',
    kind: 'lodge',
    area: CUC_PHUONG_AREA,
    address: 'Thôn Nga 3, xã Cúc Phương, huyện Nho Quan, Ninh Bình',
    slug: 'nha-nghi-hao-tham',
    excerpt: 'Nhà nghỉ Hảo Thắm tại Cúc Phương; hồ sơ cần xác minh lại trước khi vận hành.',
    description: 'Nhà nghỉ Hảo Thắm được ghi nhận trong danh sách cơ sở lưu trú du lịch tại xã Cúc Phương. Bản ghi đang ở trạng thái chờ xác minh.',
    aliases: ['Hảo Thắm', 'Nhà nghỉ Hảo Thắm Cúc Phương'],
    confidence: 'high',
    supplier: { name: 'Nhà nghỉ Hảo Thắm', contactPhone: '0329-218-656' },
    sources: [
      officialTourism(['title', 'area', 'address', 'aliases', 'supplier'], 'Danh sách chính thức ghi nhận Nhà nghỉ Hảo Thắm tại thôn Nga 3.'),
      derived(['code', 'slug', 'kind', 'excerpt', 'description', 'confidence'], 'Mã và slug là chuẩn hoá nội bộ; số liên hệ cần xác minh lại với chủ cơ sở.'),
    ],
  },
  {
    code: 'CP-THUNG-DIN',
    title: 'Thung Đin Homestay',
    kind: 'homestay',
    area: CUC_PHUONG_AREA,
    address: 'Khu vực thôn Nga, xã Cúc Phương, huyện Nho Quan, Ninh Bình',
    slug: 'thung-din-homestay',
    excerpt: 'Thung Đin Homestay tại Cúc Phương; thông tin vận hành đang chờ xác minh.',
    description: 'Homestay mang tên Thung Đin trong khu vực Cúc Phương. Chưa nhập thông tin phòng, giá hay tồn phòng; cần xác minh trực tiếp trước khi sử dụng.',
    aliases: ['Thung Đin', 'Thung Din Homestay'],
    confidence: 'medium',
    sources: [
      booking('thung-din-agoda', 'https://www.agoda.com/vi-vn/thung-din-homestay-h64245279/hotel/ninh-binh-vn.html', ['title', 'area', 'address', 'aliases']),
      derived(['code', 'slug', 'kind', 'excerpt', 'description', 'confidence'], 'Tên chuẩn và địa chỉ khu vực được biên tập từ nguồn đối chiếu; không lấy thông tin thương mại.'),
    ],
  },
  {
    code: 'CP-LOLI-HILL',
    title: 'The Loli Hill Homestay',
    kind: 'homestay',
    area: CUC_PHUONG_AREA,
    address: 'Khu vực đường rừng Cúc Phương, xã Cúc Phương, huyện Nho Quan, Ninh Bình',
    slug: 'the-loli-hill-homestay',
    excerpt: 'The Loli Hill Homestay; bản ghi nhận diện đang chờ xác minh với cơ sở.',
    description: 'Homestay The Loli Hill trong khu vực Cúc Phương. Bản ghi chỉ có thông tin nhận diện cơ bản và chưa được đưa lên trang công khai.',
    aliases: ['The Loli Hill', 'Loli Hill Homestay'],
    confidence: 'medium',
    sources: [
      booking('the-loli-hill-booking', 'https://www.booking.com/hotel/vn/the-loli-hill-homestay.html', ['title', 'area', 'address', 'aliases']),
      derived(['code', 'slug', 'kind', 'excerpt', 'description', 'confidence'], 'Địa chỉ giữ ở mức khu vực để tránh suy diễn từ bản đồ hoặc nguồn không chính thức.'),
    ],
  },
  {
    code: 'CP-VILLA-1972',
    title: 'Villa 1972 – Cúc Phương Nature Retreat',
    kind: 'villa',
    area: CUC_PHUONG_AREA,
    address: 'Khu vực Nga Ba, xã Cúc Phương, huyện Nho Quan, Ninh Bình',
    slug: 'villa-1972-cuc-phuong-nature-retreat',
    excerpt: 'Villa 1972 – Cúc Phương Nature Retreat; thông tin cần xác minh trước khi xuất bản.',
    description: 'Cơ sở lưu trú mang tên Villa 1972 – Cúc Phương Nature Retreat trong khu vực Cúc Phương. Chưa nhập thông tin thương mại hoặc tồn phòng.',
    aliases: ['Villa 1972', 'Cúc Phương Nature Retreat'],
    confidence: 'medium',
    sources: [
      booking('villa-1972-airbnb', 'https://www.airbnb.it/rooms/1475242129274403339', ['title', 'area', 'address', 'aliases']),
      derived(['code', 'slug', 'kind', 'excerpt', 'description', 'confidence'], 'Tên chuẩn là quyết định biên tập để gộp cách gọi Villa 1972 và Cúc Phương Nature Retreat.'),
    ],
  },
  {
    code: 'CP-SILVER-CLOUD',
    title: 'Silver Cloud Retreat',
    kind: 'glamping',
    area: CUC_PHUONG_AREA,
    address: 'Khu vực Đồng Tâm, xã Cúc Phương, huyện Nho Quan, Ninh Bình',
    slug: 'silver-cloud-retreat',
    excerpt: 'Silver Cloud Retreat tại Cúc Phương; hồ sơ đang chờ xác minh vận hành.',
    description: 'Mô hình lưu trú Silver Cloud Retreat tại khu vực Cúc Phương. Nguồn báo chí và hồ sơ đối chiếu xác nhận tên cơ sở; dữ liệu bán phòng chưa được nhập.',
    aliases: ['Silver Cloud', 'Silver Cloud Glamping'],
    confidence: 'medium',
    sources: [
      press(['title', 'area', 'address', 'aliases']),
      silverCloudDirectory(['title', 'aliases']),
      derived(['code', 'slug', 'kind', 'excerpt', 'description', 'confidence'], 'Địa chỉ khu vực được chuẩn hoá từ nguồn đối chiếu; không dùng thông tin đánh giá.'),
    ],
  },
  {
    code: 'CP-AN-GARDEN',
    title: 'AN Garden Homestay',
    kind: 'homestay',
    area: CUC_PHUONG_AREA,
    address: 'Khu vực Cúc Phương, huyện Nho Quan, Ninh Bình',
    slug: 'an-garden-homestay',
    excerpt: 'AN Garden Homestay tại Cúc Phương; thông tin cần xác minh trực tiếp.',
    description: 'Homestay AN Garden trong khu vực Cúc Phương. Bản ghi được tạo để đội vận hành xác minh chủ cơ sở trước khi bổ sung phòng và điều kiện bán.',
    aliases: ['AN Garden', 'An Garden Homestay'],
    confidence: 'medium',
    sources: [
      booking('an-garden-booking', 'https://www.booking.com/hotel/vn/an-garden-homestay-nho-quan.en-gb.html', ['title', 'area', 'address', 'aliases']),
      derived(['code', 'slug', 'kind', 'excerpt', 'description', 'confidence'], 'Địa chỉ được giữ ở cấp khu vực vì chưa có nguồn đủ tin cậy để xác nhận chi tiết hơn.'),
    ],
  },
];

export const CUC_PHUONG_PENDING_VERIFICATION = [
  'Wasabi Glamping',
  'Cúc Phương Suối Hoa Homestay',
  'Cúc Phương Forest Home',
  'Đức Huyền',
] as const;

function normalized(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Pure validation is shared by the CLI and unit tests, before any DB write. */
export function validateCucPhuongManifest(records: readonly ImportedStay[] = CUC_PHUONG_STAYS): string[] {
  const problems: string[] = [];
  const codes = new Set<string>();
  const slugs = new Set<string>();
  const aliases = new Map<string, string>();
  const forbiddenSource = /(?:google\.com|google\.vn|googleusercontent\.com|maps\.google)/i;
  const forbiddenKeys = /(?:price|rate|review|rating|inventory|availability|unit|image|photo|media|latitude|longitude|coordinate)/i;

  for (const item of records) {
    if (codes.has(item.code)) problems.push(`Trùng code: ${item.code}`);
    codes.add(item.code);
    if (slugs.has(item.slug)) problems.push(`Trùng slug: ${item.slug}`);
    slugs.add(item.slug);
    if (!item.sources.length) problems.push(`${item.code}: thiếu nguồn`);

    const sourcedFields = new Set(item.sources.flatMap((source) => source.fields));
    for (const field of allFields) {
      if (!sourcedFields.has(field)) problems.push(`${item.code}: thiếu nguồn cho trường ${field}`);
    }
    if (item.roomTypes && !sourcedFields.has('roomTypes')) problems.push(`${item.code}: thiếu nguồn cho roomTypes`);
    if (item.supplier && !sourcedFields.has('supplier')) problems.push(`${item.code}: thiếu nguồn cho supplier`);

    for (const source of item.sources) {
      if (forbiddenSource.test(source.url)) problems.push(`${item.code}: URL nguồn không được là Google: ${source.url}`);
      if (source.checkedAt !== CUC_PHUONG_CHECKED_AT) problems.push(`${item.code}: ngày kiểm tra nguồn không đồng nhất`);
    }
    for (const alias of item.aliases) {
      const key = normalized(alias);
      const previous = aliases.get(key);
      if (previous && previous !== item.code) problems.push(`Trùng alias: ${alias} (${previous}, ${item.code})`);
      aliases.set(key, item.code);
    }
    if (item.roomTypes) {
      const roomCodes = new Set<string>();
      for (const room of item.roomTypes) {
        if (room.status !== 'inactive') problems.push(`${item.code}/${room.code}: room type phải inactive`);
        if (roomCodes.has(room.code)) problems.push(`${item.code}: trùng room code ${room.code}`);
        roomCodes.add(room.code);
      }
    }

    const serialized = JSON.stringify(item);
    if (forbiddenKeys.test(serialized)) {
      // The manifest may mention "roomTypes" but must not carry any live
      // booking, pricing, rating, review, media, or map fields.
      const keys = Object.keys(item).filter((key) => forbiddenKeys.test(key));
      if (keys.length) problems.push(`${item.code}: chứa trường cấm ${keys.join(', ')}`);
    }
  }
  return problems;
}

const manifestProblems = validateCucPhuongManifest();
if (manifestProblems.length) {
  throw new Error(`Manifest Cúc Phương không hợp lệ:\n${manifestProblems.join('\n')}`);
}

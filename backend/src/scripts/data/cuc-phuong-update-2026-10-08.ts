/**
 * Source-backed supplement to the 2026-09-22 Cúc Phương manifest.
 *
 * Adds one new draft stay found in the official Ninh Bình tourism list and
 * fills the national-park lodge record with its official unit types. Like v1
 * it carries no prices, unit counts, ratings, media, coordinates or
 * availability: room capacity stays an unverified sentinel hidden in Admin.
 */
import { ROOM_AMENITY_CODES } from '../../catalog/room-amenities';
import { CUC_PHUONG_AREA, CUC_PHUONG_STAYS, type FieldSource, type ImportedSupplier } from './cuc-phuong-stays';

export const CUC_PHUONG_UPDATE_VERSION = '2026-10-08.v2';
export const CUC_PHUONG_UPDATE_CHECKED_AT = '2026-10-08';

export type UpdateStay = {
  code: string;
  title: string;
  kind: string;
  area: string;
  address: string;
  excerpt: string;
  description: string;
  aliases: readonly string[];
  confidence: 'high' | 'medium';
  supplier?: ImportedSupplier;
  sources: readonly FieldSource[];
};

export type SupplementRoom = {
  code: string;
  name: string;
  description: string;
  unitKind: 'room' | 'suite' | 'villa' | 'bungalow' | 'whole_house' | 'stilt_house' | 'dorm_bed' | 'tent' | 'other';
  bedSummary?: string;
  amenityCodes?: readonly string[];
};

export type CopyUpdate = {
  /** Applied only while the stored description still equals this text. */
  expectedCurrentDescription: string;
  description: string;
  excerpt: string;
  metaDescription: string;
};

export type PropertySupplement = {
  propertyCode: string;
  copy?: CopyUpdate;
  rooms: readonly SupplementRoom[];
  sources: readonly FieldSource[];
};

const tourismList = (fields: readonly string[], note?: string): FieldSource => ({
  key: 'ninh-binh-tourism-accommodation-list',
  url: 'https://sodulich.ninhbinh.gov.vn/vi/co-so-luu-tru/co-so-luu-tru-du-lich-da-tham-dinh-va-kiem-tra-du-dieu-kien-toi-thieu-148.html',
  kind: 'official',
  checkedAt: CUC_PHUONG_UPDATE_CHECKED_AT,
  fields,
  note,
});

const parkLodging = (fields: readonly string[], note?: string): FieldSource => ({
  key: 'cuc-phuong-park-food-and-lodging',
  url: 'https://cucphuongtourism.com/index.php/vi/tourism/food-and-lodging-.html',
  kind: 'official',
  checkedAt: CUC_PHUONG_UPDATE_CHECKED_AT,
  fields,
  note,
});

const derived = (fields: readonly string[], note: string): FieldSource => ({
  key: 'catalog-normalization',
  url: 'https://sodulich.ninhbinh.gov.vn/vi/co-so-luu-tru/co-so-luu-tru-du-lich-da-tham-dinh-va-kiem-tra-du-dieu-kien-toi-thieu-148.html',
  kind: 'derived',
  checkedAt: CUC_PHUONG_UPDATE_CHECKED_AT,
  fields,
  note,
});

const stayFields = ['code', 'title', 'kind', 'area', 'address', 'excerpt', 'description', 'aliases', 'confidence'];

export const CUC_PHUONG_NEW_STAYS: readonly UpdateStay[] = [
  {
    code: 'CP-DUC-HUYEN',
    title: 'Nhà nghỉ Đức Huyền',
    kind: 'lodge',
    area: CUC_PHUONG_AREA,
    address: 'Thôn Đồng Quân, xã Cúc Phương, huyện Nho Quan, Ninh Bình',
    excerpt: 'Nhà nghỉ Đức Huyền tại thôn Đồng Quân, xã Cúc Phương; hồ sơ đang chờ xác minh trực tiếp.',
    description:
      'Nhà nghỉ Đức Huyền có tên trong danh sách cơ sở lưu trú du lịch đã thẩm định của Sở Du lịch Ninh Bình, địa chỉ thôn Đồng Quân, xã Cúc Phương. Danh sách có hiệu lực đến 31/12/2022 nên tình trạng hoạt động hiện tại cần xác minh; chưa có hạng phòng, giá hay tồn phòng.',
    aliases: ['Đức Huyền', 'N.nghỉ Đức Huyền'],
    confidence: 'medium',
    supplier: {
      name: 'Nhà nghỉ Đức Huyền',
      contactPhone: '0856957219',
      note: 'Số công bố trong danh sách Sở Du lịch Ninh Bình (hiệu lực 31/12/2022; số khác: 0326624268). Cần xác minh trước khi vận hành.',
    },
    sources: [
      tourismList(['title', 'kind', 'area', 'address', 'aliases', 'supplier'], 'Hạng "ĐĐK", quyết định 159/QĐ-SDL; danh sách hiệu lực đến 31/12/2022.'),
      derived(['code', 'excerpt', 'description', 'confidence'], 'Mã và mô tả là chuẩn hoá nội bộ; không có nguồn công khai mới hơn xác nhận còn hoạt động.'),
    ],
  },
];

const PARK_V1_DESCRIPTION =
  'Khu lưu trú nằm trong phạm vi Vườn quốc gia Cúc Phương. Bản ghi chỉ phục vụ quản trị nội bộ và chưa chứa hạng phòng, giá hoặc tồn phòng.';
const PARK_SUMMARY =
  'Khu lưu trú trong Vườn quốc gia Cúc Phương gồm ba khu: cổng Vườn, Hồ Mạc và Trung tâm (Bống), với phòng nghỉ, căn riêng biệt và nhà sàn.';

export const CUC_PHUONG_SUPPLEMENTS: readonly PropertySupplement[] = [
  {
    propertyCode: 'CP-NATIONAL-PARK-LODGE',
    copy: {
      expectedCurrentDescription: PARK_V1_DESCRIPTION,
      description:
        'Khu lưu trú trong Vườn quốc gia Cúc Phương được chia thành ba khu: khu cổng Vườn, khu Hồ Mạc và khu Trung tâm (Bống). Các kiểu chỗ ở gồm phòng nghỉ, phòng VIP, căn hộ riêng biệt, nhà sàn dùng khu vệ sinh chung và nhà sàn tập thể dành cho đoàn đông. Mỗi khu có nhà hàng phục vụ khách. Khu Trung tâm (Bống) chỉ có điện thắp sáng khoảng 4 giờ vào buổi tối.',
      excerpt: PARK_SUMMARY,
      metaDescription: PARK_SUMMARY,
    },
    rooms: [
      { code: 'NP-GATE-ROOM', name: 'Phòng nghỉ – Khu cổng Vườn', unitKind: 'room', description: 'Phòng có vệ sinh khép kín, điều hòa và wifi tại khu cổng Vườn.', amenityCodes: ['room_private_bathroom', 'room_air_conditioning', 'room_wifi'] },
      { code: 'NP-GATE-STILT', name: 'Nhà sàn – Khu cổng Vườn', unitKind: 'other', description: 'Phòng trong nhà sàn tại khu cổng Vườn, dùng khu vệ sinh chung, có nước nóng và quạt.' },
      { code: 'NP-GATE-VIP-1', name: 'Phòng VIP (Loại I) – Khu cổng Vườn', unitKind: 'room', bedSummary: 'Giường đôi', description: 'Phòng đôi có vệ sinh khép kín, điều hòa, TV, nóng lạnh và wifi.', amenityCodes: ['room_private_bathroom', 'room_air_conditioning', 'room_tv', 'room_wifi'] },
      { code: 'NP-GATE-VIP-NEW', name: 'Phòng VIP (Mới) – Khu cổng Vườn', unitKind: 'room', bedSummary: 'Giường đôi', description: 'Phòng đôi có tiện nghi tương tự Phòng VIP (Loại I).', amenityCodes: ['room_private_bathroom', 'room_air_conditioning', 'room_tv', 'room_wifi'] },
      // VN page lists air-con + TV, EN page lists a fan: amenities stay unset until verified.
      { code: 'NP-MAC-BUNGALOW', name: 'Căn hộ riêng biệt – Khu Hồ Mạc', unitKind: 'bungalow', description: 'Căn riêng biệt tại khu Hồ Mạc.' },
      { code: 'NP-MAC-GROUP-STILT', name: 'Nhà sàn tập thể – Khu Hồ Mạc', unitKind: 'stilt_house', description: 'Nhà sàn tập thể dành cho đoàn đông, tính theo nguyên căn.' },
      { code: 'NP-BONG-BUNGALOW', name: 'Căn hộ riêng biệt – Khu Trung tâm (Bống)', unitKind: 'bungalow', description: 'Căn riêng biệt tại khu Trung tâm (Bống), có nước nóng và điều hòa.', amenityCodes: ['room_air_conditioning', 'room_private_bathroom'] },
      { code: 'NP-BONG-STILT', name: 'Nhà sàn – Khu Trung tâm (Bống)', unitKind: 'other', description: 'Phòng đơn giản trong nhà sàn tại khu Trung tâm (Bống), dùng khu vệ sinh chung.' },
      { code: 'NP-BONG-TWO-STOREY', name: 'Nhà hai tầng – Khu Trung tâm (Bống)', unitKind: 'room', bedSummary: '4 giường đơn', description: 'Phòng đơn giản trong nhà hai tầng tại khu Trung tâm (Bống).' },
      { code: 'NP-BONG-GROUP-STILT', name: 'Nhà sàn tập thể – Khu Trung tâm (Bống)', unitKind: 'stilt_house', description: 'Nhà sàn tập thể dành cho đoàn đông, tính theo nguyên căn.' },
    ],
    sources: [
      parkLodging(['copy', 'rooms'], 'Trang ghi ngày 28/8/2016; bản tiếng Anh mâu thuẫn ở tiện nghi Hồ Mạc và giá Bống. Không nhập giá.'),
      tourismList(['propertyCode'], 'Danh sách Sở Du lịch ghi "KS vườn QG-CP", hạng 1 sao, xã Cúc Phương.'),
    ],
  },
];

/** Pure validation shared by the CLI and unit tests, before any DB write. */
export function validateCucPhuongUpdate(
  newStays: readonly UpdateStay[] = CUC_PHUONG_NEW_STAYS,
  supplements: readonly PropertySupplement[] = CUC_PHUONG_SUPPLEMENTS,
): string[] {
  const problems: string[] = [];
  const v1Codes = new Set(CUC_PHUONG_STAYS.map((item) => item.code));
  const forbiddenSource = /(?:google\.com|google\.vn|googleusercontent\.com|maps\.google)/i;
  const forbiddenKeys = /(?:price|rate|review|rating|inventory|availability|unitCount|image|photo|media|latitude|longitude|coordinate)/i;
  const allSources = [...newStays.flatMap((item) => item.sources), ...supplements.flatMap((item) => item.sources)];

  for (const source of allSources) {
    if (forbiddenSource.test(source.url)) problems.push(`URL nguồn không được là Google: ${source.url}`);
    if (source.checkedAt !== CUC_PHUONG_UPDATE_CHECKED_AT) problems.push(`Ngày kiểm tra nguồn không đồng nhất: ${source.key}`);
  }

  const codes = new Set<string>();
  for (const item of newStays) {
    if (v1Codes.has(item.code) || codes.has(item.code)) problems.push(`Trùng code: ${item.code}`);
    codes.add(item.code);
    const sourced = new Set(item.sources.flatMap((source) => source.fields));
    for (const field of stayFields) if (!sourced.has(field)) problems.push(`${item.code}: thiếu nguồn cho trường ${field}`);
    if (item.supplier && !sourced.has('supplier')) problems.push(`${item.code}: thiếu nguồn cho supplier`);
    const keys = Object.keys(item).filter((key) => forbiddenKeys.test(key));
    if (keys.length) problems.push(`${item.code}: chứa trường cấm ${keys.join(', ')}`);
  }

  for (const supplement of supplements) {
    if (!v1Codes.has(supplement.propertyCode)) problems.push(`${supplement.propertyCode}: chỉ bổ sung cho bản ghi đã có trong manifest v1`);
    const sourced = new Set(supplement.sources.flatMap((source) => source.fields));
    if (supplement.copy && !sourced.has('copy')) problems.push(`${supplement.propertyCode}: thiếu nguồn cho copy`);
    if (supplement.rooms.length && !sourced.has('rooms')) problems.push(`${supplement.propertyCode}: thiếu nguồn cho rooms`);
    const roomCodes = new Set<string>();
    for (const room of supplement.rooms) {
      if (!/^[A-Z0-9_-]+$/.test(room.code) || room.code.length > 40) problems.push(`${supplement.propertyCode}/${room.code}: room code không hợp lệ`);
      if (roomCodes.has(room.code)) problems.push(`${supplement.propertyCode}: trùng room code ${room.code}`);
      roomCodes.add(room.code);
      for (const code of room.amenityCodes ?? []) {
        if (!(ROOM_AMENITY_CODES as readonly string[]).includes(code)) problems.push(`${supplement.propertyCode}/${room.code}: tiện nghi không hợp lệ ${code}`);
      }
      const keys = Object.keys(room).filter((key) => forbiddenKeys.test(key));
      if (keys.length) problems.push(`${supplement.propertyCode}/${room.code}: chứa trường cấm ${keys.join(', ')}`);
    }
  }
  return problems;
}

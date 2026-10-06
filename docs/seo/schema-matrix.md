# Ma trận Schema / JSON-LD (spec §26–§41, §62–§65)

Code:
- `src/lib/seo/schema-core.ts`: builders thuần;
- `src/lib/seo/schema.ts`: bọc `server-only`;
- `src/lib/seo/schema-rules.ts`: luật dùng chung với panel SEO trong Admin;
- `src/components/seo/JsonLd.tsx`: render phía server, serializer escape `<`, U+2028 và U+2029.

**Điều kiện phát JSON-LD trên mọi trang:**
- index đã bật (`getSeoPolicy().indexingAllowed`) và `seo.structuredData.core !== false`;
- trang đủ điều kiện index;
- không noindex;
- không có query lọc.

Hiện tại site đang đóng index nên **không trang nào phát JSON-LD**. Phần dưới đây được kiểm bằng chế độ "approved" của demo API và bằng unit test.

## @id ổn định (§27)
- `https://domain/#organization`
- `https://domain/#website`
- `https://domain/path#webpage`
- `https://domain/path#breadcrumb`
- `https://domain/path#itemlist`
- Thực thể: `/phong-nghi/x#lodging`, `/combo-du-lich/x#trip`, `/diem-den/x#destination`, `/bai-viet/x#article`, `/ve-minh#faq`, `/#advisor` (Person).

Mọi URL đều tuyệt đối, dựa trên origin đã được Owner duyệt (không HTTP, không localhost/Docker host, không query). URL trong schema là URL **hiện tại**, nên sau khi Generate thì `@id` và `url` tự đổi theo, không cần rebuild.

## Theo route

| Route | Graph | Điều kiện | Không bao giờ phát |
|---|---|---|---|
| `/` | Organization, WebSite, WebPage | Có ít nhất một nội dung đủ điều kiện (cùng điều kiện với index) | TravelAgency nếu chưa xác minh |
| `/phong-nghi`, `/combo-du-lich`, `/diem-den`, `/bai-viet`, `/chuyen-trang` | CollectionPage (`mainEntity` → ItemList), BreadcrumbList, ItemList | ItemList chỉ gồm nội dung đã xuất bản, indexable, URL hiện tại, dữ liệu thật | — |
| `/phong-nghi/[slug]` | WebPage (`mainEntity` → lodging), BreadcrumbList, **LodgingBusiness** hoặc Hotel/Resort/Motel/BedAndBreakfast (chỉ khi `kind` khớp đúng; homestay, nhà sàn, villa, glamping, lodge → LodgingBusiness) | Có ảnh, mô tả ≥ 160 ký tự, không demo, không noindex. Các trường: name, url, description, image, PostalAddress (`streetAddress` + `VN`), `checkinTime`/`checkoutTime` **chỉ khi hiển thị trên trang**, `amenityFeature` (nhãn tiện nghi đang hiển thị) | GeoCoordinates (`mapX/mapY` chỉ là vị trí minh hoạ), Offer/price, AggregateRating/Review, VacationRental, số phòng held/reserved, telephone riêng của cơ sở |
| `/combo-du-lich/[slug]` | WebPage, BreadcrumbList, **TouristTrip** (itinerary = ItemList theo ngày) | Có lịch trình, ảnh, nội dung | Offer/price (`seo.structuredData.offers` đang khoá) |
| `/diem-den/[slug]` | WebPage, BreadcrumbList, **TouristDestination** | Có ảnh, nội dung | GeoCoordinates, Place giả |
| `/bai-viet/[slug]` | WebPage, BreadcrumbList, **BlogPosting**: headline, image, datePublished (`firstPublishedAt`), dateModified (`lastPublicChangedAt`), author **Person**, publisher `#organization`, mainEntityOfPage, `inLanguage=vi-VN` | Đủ tác giả, ảnh, ngày, nội dung. Thiếu một thứ thì chỉ phát WebPage + Breadcrumb | Author dạng Organization giả |
| `/lien-he` | **ContactPage** (`about` → `#organization`), BreadcrumbList, Organization + **ContactPoint** (telephone/email đang hiển thị) | `contact.page.enabled` và có trong sitemap | openingHours (chưa có dữ liệu dạng cấu trúc), địa chỉ khi chưa xác minh |
| `/ve-minh` | **AboutPage** (`mainEntity` → Person), Person (`worksFor` → `#organization`), FAQPage (FAQ đang hiển thị), BreadcrumbList | `about.page.enabled` + có tiêu đề | TravelAgency inline (đã bỏ trong task này) |
| `/[slug]` (CMS) | WebPage, BreadcrumbList | Có ảnh và nội dung | Đoán AboutPage/ContactPage theo tiêu đề (§38) |
| `/dat-phong`, `/lich-phong`, `/doi-tac/**`, `/admin/**` | **Không có** | — | — |

## TravelAgency / LocalBusiness (§28, §65)
Organization chỉ chuyển thành `TravelAgency` (cùng `@id`) khi:
- Owner bật **Cài đặt → SEO → Dữ liệu có cấu trúc → "Đã xác minh thông tin doanh nghiệp (TravelAgency)"** (`seo.structuredData.localBusiness`, mặc định `false`);
- **và** settings có tên brand, số điện thoại (`brand.contact.phone` hoặc `hotline`) và địa chỉ (`brand.contact.address`).

Khi đó schema có thêm telephone, email (nếu có), PostalAddress và `areaServed` (lấy từ `about.page.areaServed`). Nếu thiếu một trong các điều kiện trên, schema giữ là Organization.

## Đánh giá / sao (§33, §64)
Hiện không có quy trình đánh giá first-party được kiểm duyệt và chứng minh nguồn gốc, nên **không phát AggregateRating/Review ở bất kỳ đâu**. Công tắc `seo.structuredData.reviews` không có tác dụng (API `seo/policy` luôn trả `reviews:false`). Không cam kết rich result, sao hay thứ hạng (§63).

## FAQ (§40)
Chỉ `/ve-minh` có FAQPage, và chỉ chứa FAQ đang hiển thị. Không sinh FAQ ẩn.

## Kiểm chứng
- `npm run seo:test` → `tests/seo-unit/technical-seo.spec.ts` (19 test). Các test kiểm: @id; subtype; không rating/geo/offer; TravelAgency chỉ khi đã xác minh; ContactPage; AboutPage không có TravelAgency inline; serializer không thoát được khỏi thẻ `<script>`.
- `scripts/seo/seo-qa.mjs` chế độ approved (demo API + `next start` production) → `artifacts/seo/2026-10-06/seo-qa-approved.json`: **280/280 PASS**.
  - Kiểm 11 trang mẫu: `/`, 4 trang danh sách, 4 trang chi tiết, `/lien-he`, `/ve-minh`.
  - Nội dung kiểm: JSON parse; không thoát khỏi `<script>`; @id tuyệt đối trên origin đã duyệt; breadcrumb; không có khoá cấm; không localhost.

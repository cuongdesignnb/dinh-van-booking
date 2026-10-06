# Audit route hiện tại (spec §57)

Ngày: 2026-10-06 · START_SHA thực tế `a049e88` · Nguồn: `src/app/**`, `npm run seo:routes` (`scripts/check-human-routes.mjs`), QA `scripts/seo/seo-qa.mjs`.

**Kết luận: mọi route cho người dùng đã là tiếng Việt không dấu, chữ thường, nối bằng `-`. Không cần đổi tên route nào (§13), nên không có migration route/redirect mới.** Việc audit chỉ đăng ký các route vào `src/lib/routes.ts`, thêm lint, và sửa chính sách index/metadata/schema của từng route.

Chú thích:
- **vi-ascii**: kết quả lint.
- **Index**: chính sách khi Owner đã bật index. Hiện tại toàn site vẫn đóng (`INDEXING_ACTIVATION=NOT_CHANGED`).
- **Sitemap**: chỉ khi index đã bật và nội dung đủ điều kiện.
- **Canonical**: URL tuyệt đối trên origin đã được Owner duyệt.

## Public

| Route | Source | vi-ascii | Index | Metadata | Schema | Sitemap | Canonical | Hành động trong task |
|---|---|---|---|---|---|---|---|---|
| `/` | `src/app/page.tsx` | PASS | Có, khi đã có ít nhất 1 nơi lưu trú hoặc điểm đến công khai đủ điều kiện | `seo.defaults` (title, description), OG, Twitter | Organization (TravelAgency nếu Owner xác minh), WebSite, WebPage | Có | `https://…/` | Sửa tiêu đề lặp brand; sửa lỗi policy mô tả brand dạng rich text |
| `/phong-nghi` | `src/app/phong-nghi/page.tsx` | PASS | Có. Mọi query lọc/sắp xếp/ngày → noindex | `seo.pages.stays` | CollectionPage, BreadcrumbList, ItemList | Có | sạch, bỏ UTM | Kiểm tra lại; ItemList có `@id` |
| `/phong-nghi/[slug]` | `src/app/phong-nghi/[slug]/page.tsx` | PASS | Có nếu đủ dữ liệu (ảnh, mô tả ≥ 160 ký tự, có hạng phòng) | `metaTitle`/`metaDescription` từ DB; ảnh bìa làm OG | WebPage, BreadcrumbList, LodgingBusiness hoặc subtype (`#lodging`) | Có | URL hiện tại. Slug cũ → 308 | Subtype, PostalAddress, giờ nhận/trả (chỉ khi hiển thị), tiện nghi; @id ổn định |
| `/combo-du-lich` | `src/app/combo-du-lich/page.tsx` | PASS | Có | `seo.pages.combos` | CollectionPage, BreadcrumbList, ItemList | Có | sạch | — |
| `/combo-du-lich/[slug]` | `src/app/combo-du-lich/[slug]/page.tsx` | PASS | Có nếu có lịch trình, ảnh, nội dung | DB | WebPage, BreadcrumbList, TouristTrip (`#trip`), không có Offer | Có | URL hiện tại | @id ổn định |
| `/diem-den` | `src/app/diem-den/page.tsx` | PASS | Có | `seo.pages.destinations` | CollectionPage, BreadcrumbList, ItemList | Có | sạch | — |
| `/diem-den/[slug]` | `src/app/diem-den/[slug]/page.tsx` | PASS | Có | DB | WebPage, BreadcrumbList, TouristDestination (`#destination`), không có geo | Có | URL hiện tại | @id ổn định; ghi rõ không dùng toạ độ minh hoạ |
| `/bai-viet` | `src/app/bai-viet/page.tsx` | PASS | Có khi có bài đủ điều kiện | `seo.pages.articles` | CollectionPage, BreadcrumbList, ItemList | Có | sạch | — |
| `/bai-viet/[slug]` | `src/app/bai-viet/[slug]/page.tsx` | PASS | Có | DB, `og:type=article` | WebPage, BreadcrumbList, BlogPosting (`#article`, author là Person) | Có | URL hiện tại | Checklist xuất bản bắt buộc có tác giả |
| `/lien-he` | `src/app/lien-he/page.tsx` | PASS | Có | `seo.pages.contact` | **Mới:** ContactPage, BreadcrumbList, Organization + ContactPoint (chỉ số đang hiển thị) | Có | sạch | Thêm JSON-LD |
| `/ve-minh` | `src/app/ve-minh/page.tsx` | PASS | Có (`about.page.enabled` + có tiêu đề) | `about.page` (seoTitle, seoDescription, ogDescription, ogImage) | AboutPage, Person, FAQPage, BreadcrumbList | Có | sạch | Person `worksFor` → `#organization` (bỏ TravelAgency inline chưa xác minh) |
| `/chuyen-trang` | `src/app/chuyen-trang/page.tsx` | PASS | Có khi có trang | `seo.pages.staticPages` | CollectionPage, ItemList | Có | sạch | — |
| `/chuyen-trang/[slug]` | `src/app/chuyen-trang/[slug]/page.tsx` | PASS | — (đường dẫn cũ) | — | — | Không | — | 308 → `/<slug>` (từ 09/2026, giữ nguyên) |
| `/[slug]` (trang CMS) | `src/app/[slug]/page.tsx` | PASS | Có nếu đủ dữ liệu | DB | WebPage, BreadcrumbList | Có | URL hiện tại | Không đoán AboutPage/ContactPage theo tiêu đề |
| `/dat-phong` | `src/app/dat-phong/page.tsx` | PASS | **Không** (noindex, nofollow) | settings | Không | Không | Không | Middleware thêm header noindex cố định |
| `/lich-phong` | `src/app/lich-phong/page.tsx` | PASS | **Không** (công cụ tra theo ngày) | Tiêu đề trang + brand lấy từ settings | Không | Không | Không | Sửa canonical tương đối (trước đây có thể ra `localhost`) và brand hardcode |
| `/doi-tac`, `/doi-tac/chinh-sua` | `src/app/doi-tac/**` | PASS | **Không** | noindex, nofollow; brand lấy từ settings | Không | Không | Không | Header noindex; bỏ brand hardcode trong title |

## Admin (`/admin/**`): luôn noindex, nofollow; robots.txt chặn `/admin/`; không schema; không sitemap

`/admin`, `/admin/bao-cao`, `/admin/cai-dat`, `/admin/chuyen-trang[/them|/[id]]`, `/admin/combo-du-lich[/them|/[id]]`, `/admin/dat-phong[/them|/[id]]`, `/admin/diem-den[/them|/[id]]`, `/admin/doi-tac`, `/admin/doi-tac/cap-quyen`, `/admin/hang-phong[/them|/[roomId]]`, `/admin/khach-hang`, `/admin/khuyen-mai`, `/admin/menu`, `/admin/noi-dung[/them|/[id]]`, `/admin/phong-nghi[/them|/[id]]`, `/admin/thanh-toan`, `/admin/thu-vien-anh`, `/admin/ton-phong`, `/admin/yeu-cau-tu-van`.

Tất cả PASS vi-ascii. `menu` là từ mượn nằm trong whitelist của lint. Title admin lấy brand từ settings (`Quản trị — {brand}`).

## Ngoại lệ kỹ thuật

`/api/**`, `/media/**`, `/_next/**`, `/robots.txt`, `/sitemap.xml`, `/icon.svg`, `/apple-icon.png`, `/favicon.ico`.

## Kiểm tra tự động

- `npm run seo:routes`:
  - kết quả: `routes=55 pages=51 reservedParity=PASS linkLiteralProblems=0` → `ROUTE_LINT=PASS`;
  - lint cũng kiểm: route mới phải đăng ký trong `src/lib/routes.ts`; route gốc phải nằm trong danh sách slug bảo lưu; link nội bộ dạng chuỗi phải hợp lệ;
  - thử âm tính: `src/app/Phòng_Test` và `src/app/about` đều bị bắt (có dấu/gạch dưới; tiếng Anh ngoài whitelist; chưa đăng ký; chưa bảo lưu).
- Slug hệ thống bảo lưu (backend `RESERVED_SLUGS` = frontend `RESERVED_ROOT_SEGMENTS`): thêm `doi-tac` và `lich-phong`. Trước đây một trang CMS có thể chiếm `/doi-tac`.

# Current state audit — trước khi dựng backend

Ngày audit: 2026-09-20. Repo: `dinh-van-booking` (nhánh `main`). Audit này đọc source thật trong
repo, không suy đoán từ dự án khác.

## 1. Framework, phiên bản, package manager

| Hạng mục | Thực tế trong repo |
|---|---|
| Frontend | Next.js 15.5.19 (App Router), React 19, TypeScript 5 |
| Package manager | npm (có `package-lock.json`) |
| Node trên máy dev | v20.15.1 (API sẽ chạy Node 24 trong container) |
| Styling | CSS thuần theo route trong `src/styles/*.css` + `src/app/globals.css`, token `--dvb-*` |
| Font | `next/font/google`: Playfair Display, Roboto Condensed, Dancing Script (subset `vietnamese`) |
| Icon | `lucide-react` + `simple-icons`, thêm SVG tự vẽ trong `src/components/ui/Decor.tsx` |
| Test | Playwright 1.x — 92 test (public + admin + navigation) |
| Docker | Chưa có gì trong repo |
| Backend / ORM / DB | **Chưa có.** Không có API route nào ngoài trang Next; không có Prisma/TypeORM; không có kết nối DB |
| Auth | **Chưa có.** `/admin` mở công khai, chỉ `noindex` |
| Deploy hiện tại | Vercel (project `dinh-van-booking`), alias `dinh-van-booking.vercel.app` |

## 2. Route thực tế

Public: `/`, `/phong-nghi`, `/phong-nghi/[slug]` (8 slug, `generateStaticParams`), `/combo-du-lich`,
`/diem-den`, `/lien-he`, `/dat-phong`, `not-found`.

Admin: `/admin`, `/admin/dat-phong`, `/admin/phong-nghi`, `/admin/combo-du-lich`, `/admin/diem-den`,
`/admin/noi-dung`, `/admin/khach-hang`, `/admin/yeu-cau-tu-van`, cộng 4 route panel “ngoài phạm vi”
(`/admin/khuyen-mai`, `/admin/thanh-toan`, `/admin/bao-cao`, `/admin/cai-dat`).

Tất cả route public dùng `await searchParams` nên là dynamic; `/phong-nghi/[slug]` là SSG.

## 3. Nguồn dữ liệu hiện tại — toàn bộ là fixture trong bundle

| File | Nội dung | Ai đọc |
|---|---|---|
| `src/data/stays.ts` | 8 nơi lưu trú, room types, gallery, host, mapPin, tiện ích, FAQ | Public listing/detail, homepage, admin (qua fixtures admin) |
| `src/data/combos.ts` | 6 combo, itinerary, included/excluded | Public combo, admin D |
| `src/data/destinations.ts` | 7 điểm đến, tips, itineraries, seasons | Public destinations, admin E |
| `src/data/reviews.ts`, `src/data/home-fixtures.ts` | Review demo, nội dung homepage (hero, trust, promo, FAQ) | Public |
| `src/data/admin/fixtures.ts` | Property/room type/unit/override/customer/combo/destination/article/media cho admin | Admin store |
| `src/data/admin/booking-fixtures.ts` | Sinh 245 booking + payment + inquiry + follow-up theo seed cố định | Admin store |
| `src/data/admin/fixture-clock.ts` | Đồng hồ demo cố định `2024-11-15T12:00+07:00` | Admin store, selectors |
| `src/config/site.ts` | Tên thương hiệu, tagline, contact (`null`), social (`null`) | Public + admin |

Trạng thái lưu tại client: `dvb:favorites:v2` (yêu thích), `dvb:admin:v1` (toàn bộ dữ liệu admin sau
khi sửa). Không có API nào được gọi; mọi mutation chỉ đổi state trong máy người dùng.

## 4. Form và hành động chưa gửi đi đâu

- `/lien-he`: `ConsultationForm` chỉ mở hộp xem trước, adapter `src/lib/services/consultation.ts`
  (`demoAdapter`) không gửi.
- `/dat-phong`: `Checkout` tính tiền bằng `src/lib/booking/pricing.ts` rồi dừng ở bản xem trước.
- Admin: mọi thao tác đi qua `commit()` trong `src/components/admin/AdminStore.tsx` → chỉnh
  `structuredClone` của fixture, lưu localStorage, hiện toast “Đã lưu trong bản demo”.
- Xuất CSV (`src/components/admin/bookings/export.ts`) dựng file từ fixture trong trình duyệt.
- Upload ảnh trong `MediaPicker`/`MediaLibrary` chỉ tạo `URL.createObjectURL`, sống trong phiên.

## 5. Logic nghiệp vụ đã có (giữ lại, chuyển xuống server)

| Module | File | Ghi chú khi port sang backend |
|---|---|---|
| Tính giá checkout | `src/lib/booking/pricing.ts` | Có unit test; công thức add-on/coupon/deposit sẽ chuyển thành pricing service đọc DB |
| Quy tắc giá theo ngày | `src/lib/admin/selectors.ts` (`priceForDate`, `seasonConflicts`) | Thành `rate_plans` + `rate_rules` |
| Tồn phòng theo ngày | `selectors.ts` (`inventoryForDay`, `roomTypeAvailability`, `occupancyForRange`) | Thành `inventory_days` + reservation ledger |
| Trạng thái booking/thanh toán | `src/lib/admin/types.ts` | Giữ enum, thêm `expired`, `no_show`, refund states |
| Checklist SEO | `selectors.ts` (`seoChecklist`) | Tính lại từ `content_nodes` |
| Chọn ngày/khách | `src/lib/selection.ts`, `src/lib/dates.ts` | Giữ cho UI, backend validate lại |

## 6. Điểm phải sửa khi nối API (nợ kỹ thuật đã biết)

1. `AdminStore` là store fixture + localStorage: thay bằng data layer gọi API, giữ nguyên chữ ký
   `commit()` để các màn không phải viết lại.
2. Đồng hồ demo `DEMO_TODAY` nằm khắp selector admin: thay bằng thời gian thật theo
   `BUSINESS_TIMEZONE`, giữ khả năng chạy test với clock cố định.
3. `src/config/site.ts` đang hardcode tên/tagline và contact `null`: chuyển sang bảng `settings`,
   đọc qua API (yêu cầu “không hardcode bất cứ vị trí nào”).
4. Nội dung homepage (`home-fixtures.ts`): chuyển thành `pages` + `page_sections` + `section_items`.
5. `generateStaticParams` ở trang chi tiết: đổi sang dữ liệu DB (hoặc dynamic + revalidate).
6. Favorites/ghim: `user_pins` cho admin; yêu thích phía khách vẫn có thể ở client nhưng phải nêu rõ.
7. Ảnh: toàn bộ nằm trong `public/images/**` do trích từ mockup → nhập thành `media_assets` thật,
   chuyển sang WebP và xóa bản gốc theo yêu cầu của chủ dự án.

## 7. Cấu hình và secret

Repo chưa có `.env` nào ngoài `NEXT_DIST_DIR` (tùy chọn) và `VERCEL_DEPLOYMENT_ID` (do Vercel cấp).
Không có secret nào trong repo. Stack mới sẽ dùng `.env.docker` / `.env.runtime` (gitignore) và
`.secrets/` sinh tại máy, không commit.

## 8. Tài nguyên máy đích (dev hiện tại)

Docker Desktop 29.5.3 (engine Linux), Compose v5.1.4. Cổng 18473–18476 đang trống (xem
`runtime-ports.md`). Không có container nào đang chạy. PostgreSQL/Redis chưa cài trên host.

## 9. Kết luận cho bước dựng backend

Repo **chưa có backend**, nên đi theo stack mặc định của tài liệu: NestJS 11 + Fastify, Prisma +
PostgreSQL 18, Redis + BullMQ, gateway Nginx, tất cả trong compose project `dvb-booking`. Frontend
giữ nguyên Next.js hiện có, chỉ thay lớp dữ liệu.

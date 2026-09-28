# Bản đồ màn hình → API

> Snapshot lịch sử ngày 2026-09-20. Các cột “Nguồn hiện tại” và “Trạng thái” bên dưới không phản ánh runtime sau các đợt tích hợp API; xem [kế hoạch và gate end-to-end 2026-09-28](../END_TO_END_COMPLETION_PLAN_2026-09-28.md).

Cột **Trạng thái** nói đúng những gì đã chạy được tính đến 2026-09-20:
✅ có endpoint thật và đã kiểm thử · 🔧 bảng đã có, chưa có endpoint · ⬜ chưa bắt đầu.

Frontend hiện vẫn đọc fixture trong bundle; cột "Nguồn hiện tại" ghi lại điều đó để biết
chỗ nào còn phải cắt sang API (giai đoạn 6).

## Công khai

| Màn | Dữ liệu cần | Endpoint | Nguồn hiện tại | Trạng thái |
|---|---|---|---|---|
| Toàn site (header, footer, liên hệ, SEO) | Thương hiệu, liên hệ, mạng xã hội, giờ làm việc, SEO, bảo trì | `GET /api/v1/settings/public` | `src/config/site.ts` | ✅ |
| Trang chủ | Thứ tự và bật/tắt từng khối | `GET /api/v1/settings/public` (`home.sections`) | `src/data/home-fixtures.ts` | ✅ (endpoint) / 🔧 (khối nội dung) |
| Trang chủ — nơi lưu trú nổi bật | Danh sách property + giá từ | `GET /api/v1/catalog/stays` | `src/data/stays.ts` | ⬜ |
| `/phong-nghi` | Lọc theo khu vực, sức chứa, giá | `GET /api/v1/catalog/stays` | `src/data/stays.ts` | ⬜ |
| `/phong-nghi/[slug]` | Chi tiết, hạng phòng, tiện ích, ảnh | `GET /api/v1/public/routes?path=` | `src/data/stays.ts` | 🔧 (bảng + route đã có) |
| `/combo-du-lich` | Combo, lịch khởi hành, giá | `GET /api/v1/catalog/combos` | `src/data/combos.ts` | ⬜ |
| `/diem-den` | Điểm đến, mẹo, mùa | `GET /api/v1/public/routes?path=` | `src/data/destinations.ts` | 🔧 |
| Bài viết | Nội dung giàu định dạng | `GET /api/v1/public/routes?path=` | — | ✅ (đọc theo path đã chạy) |
| `/dat-phong` — tính giá | Báo giá theo ngày, phụ thu, mã giảm | `POST /api/v1/quotes` | `src/lib/booking/pricing.ts` | ⬜ |
| `/dat-phong` — đặt | Giữ chỗ, tạo đơn | `POST /api/v1/bookings` | bản xem trước | ⬜ |
| `/lien-he` | Gửi yêu cầu tư vấn | `POST /api/v1/inquiries` | `demoAdapter` | ⬜ |
| Tra cứu đơn | Xem đơn bằng mã + token | `GET /api/v1/bookings/by-token` | — | 🔧 (`booking_access_tokens`) |
| Ảnh | Phục vụ file WebP | `GET /media/**` | `public/images/**` | ✅ |

## Quản trị

| Màn | Thao tác | Endpoint | Trạng thái |
|---|---|---|---|
| Đăng nhập | Đăng nhập, đăng xuất, đổi mật khẩu, phiên hiện tại | `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`, `POST /auth/change-password` | ✅ |
| A — Tổng quan | Số liệu hôm nay, sắp đến, doanh thu | `GET /api/v1/reports/overview` | ⬜ |
| B — Đặt phòng | Danh sách, lọc, chi tiết, đổi trạng thái, ghi chú | `GET/POST/PATCH /api/v1/bookings` | ⬜ |
| B — Xuất CSV | Kết xuất theo bộ lọc | `GET /api/v1/bookings/export` | ⬜ |
| C — Phòng nghỉ | CRUD property, hạng phòng, đơn vị phòng | `GET/POST/PUT /api/v1/catalog/properties` | 🔧 |
| C — Giá | Rate plan, mùa giá, quy tắc | `PUT /api/v1/catalog/rate-plans` | 🔧 |
| C — Tồn phòng | Xem và khoá phòng theo ngày | `GET/PATCH /api/v1/inventory/days` | 🔧 |
| D — Combo | CRUD combo, lịch khởi hành, chỗ | `GET/POST/PUT /api/v1/catalog/combos` | 🔧 |
| E — Nội dung | Danh sách, soạn thảo, phiên bản, xuất bản | `GET/POST/PUT /api/v1/content`, `PATCH /api/v1/content/:id/status`, `GET /api/v1/content/:id/revisions` | ✅ |
| E — Thư viện ảnh | Tải lên (tự chuyển WebP), sửa alt, xoá | `GET/POST/PATCH/DELETE /api/v1/media` | ✅ |
| E — SEO | Checklist trước khi xuất bản | trả trong lỗi 400 của `PATCH /content/:id/status` | ✅ |
| F — Khách hàng | CRUD, tag, ghi chú, lịch sử | `GET/POST/PUT /api/v1/customers` | 🔧 |
| G — Yêu cầu tư vấn | Pipeline, trao đổi, nhắc việc | `GET/PATCH /api/v1/inquiries` | 🔧 |
| Thanh toán | Ghi nhận thu, hoàn tiền | `POST /api/v1/payments`, `POST /api/v1/refunds` | 🔧 |
| Khuyến mãi | Mã giảm giá | `GET/POST /api/v1/coupons` | 🔧 |
| Cài đặt | Mọi cấu hình, theo nhóm | `GET /api/v1/settings`, `PUT /api/v1/settings/:key`, `DELETE /api/v1/settings/:key` | ✅ |
| Nhật ký | Ai sửa gì, khi nào | `GET /api/v1/audit-logs` | 🔧 (`audit_logs` đã ghi) |

## Cấu hình — không hardcode ở đâu

Yêu cầu "mọi nơi phải cài đặt được trong admin" hiện thực bằng bảng `settings` cộng
registry `backend/src/settings/settings.registry.ts`. Mỗi khoá có giá trị mặc định, cờ
"công khai" và số phiên bản để khoá lạc quan.

| Nhóm | Khoá | Thay cho chỗ hardcode nào |
|---|---|---|
| brand | `brand.identity`, `brand.contact`, `brand.social`, `brand.businessHours` | `src/config/site.ts` |
| booking | `booking.rules`, `booking.cancellation`, `booking.payment` | Hằng số trong `pricing.ts`, chính sách trong fixture |
| locale | `locale.formats` | Định dạng tiền và ngày rải rác trong `formatters.ts` |
| seo | `seo.defaults`, `analytics.providers` | Metadata tĩnh trong `layout.tsx` |
| content | `home.sections`, `content.editor` | Thứ tự khối trong `page.tsx`, `home-fixtures.ts` |
| media | `media.processing` | `MAX_UPLOAD_BYTES` và danh sách MIME trong `MediaPicker.tsx` |
| crm | `crm.pipeline` | Enum giai đoạn trong `types.ts` |
| ops | `notifications.channels`, `ops.maintenance`, `ops.dataMode` | Cờ `usesDemoData` trong `site.ts` |

Giá trị lưu trong DB được **trộn** với mặc định, nên thêm khoá con mới vào registry
không làm hỏng bản ghi cũ. `GET /settings/public` chỉ trả các khoá `isPublic`, đã có
kiểm thử chặn rò rỉ `media.processing` và `notifications.channels`.

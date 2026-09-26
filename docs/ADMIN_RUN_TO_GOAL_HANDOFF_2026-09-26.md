# Đinh Vân Booking — Admin run-to-goal handoff

**Cập nhật:** 2026-09-27 · local Windows + Docker Compose. Đây là biên bản audit/local test, không phải phê duyệt deploy. Production không được truy cập hay thay đổi.

## Runtime và dữ liệu local

- URL: `http://127.0.0.1:18473`; tài khoản quản trị `halabcreative@gmail.com`. Mật khẩu chỉ lưu ở `.secrets/owner_password`, không ghi trong repo.
- Compose local: API, web, worker, gateway, PostgreSQL, Redis đang chạy; API/PostgreSQL healthcheck healthy; `GET /`, `/api/v1/health`, `/robots.txt` đều 200. Local app services được build/restart, không xoá/reset volume PostgreSQL, Redis hoặc media.
- PostgreSQL sau cleanup: 11 `content_nodes`, 11 `properties`, 5 `room_types`, 0 `room_units`, 0 `rate_plans`, 0 `media_assets`, 0 `inquiries`, 0 `customers`, 1 menu/5 items, 0 settings, 2 users, 5 roles, 21 permissions. 11 property đều draft/chờ xác minh.
- Migration history có 5 migration áp dụng; một lần chạy init cũ được ghi `rolled_back` và có lần áp dụng thành công. Không có migration pending.
- Một draft kiểm thử trước đó đã sống qua restart `api/web/worker`, đọc lại đúng ID rồi được xoá qua API/version. Menu được restore. Test mới tạo/xoá đúng bản ghi destination/combo/property; DB không còn `ATG-*` fixture.

## Tình trạng route quản trị

Ma trận chi tiết gồm component, API, bảng DB, mutation, browser test và trạng thái tại [`docs/admin/admin-run-to-goal-matrix.md`](admin/admin-run-to-goal-matrix.md). Nguồn fixture/store legacy từng file và line ở [`docs/admin/admin-legacy-findings.md`](admin/admin-legacy-findings.md).

- `REAL_API`: phòng nghỉ, combo, điểm đến, yêu cầu tư vấn, bài viết/CMS, chuyên trang, menu, Media Library và cài đặt.
- `PENDING`: tổng quan/báo cáo, quản trị đặt phòng, hồ sơ khách hàng, khuyến mãi và thanh toán; giao diện báo pending, không dựng form/KPI thành công giả.
- Layout quản trị dùng `AdminAuthGate` + `AdminShell`; bỏ `AdminStoreProvider` khỏi cây route và bỏ shell dependency vào local role/toast. API session/cookie/CSRF và permissions là nguồn xác thực.
- Nội dung công khai lấy từ API/PostgreSQL; draft không xuất hiện public. SEO indexing gate vẫn đóng.

## Kiểm thử chạy trong lượt audit

| Kiểm tra | Kết quả | Bằng chứng |
|---|---|---|
| Frontend lint | PASS | `npm run lint -- --no-warn-ignored` |
| Frontend typecheck | PASS | `npm run typecheck` |
| Frontend build | PASS | `npm run build` và Docker web production build |
| Playwright | PASS | 28/28, workers=1 trên gateway local; admin shell, responsive 1440/1024/768/390, catalogue lifecycle, public data, pricing, robots/sitemap/noindex/404 |
| Admin lifecycle mới | PASS | `tests/admin/run-to-goal.spec.ts`: destination + combo tạo/sửa/xoá draft, public draft 404; property tạo/sửa/xoá kèm room/unit/rate thật, public draft 404; dữ liệu test được dọn |
| Backend build/unit | PASS | `scripts/backend.sh test`: runner tự cài deps, generate Prisma, build source rồi chạy 11/11 unit test |
| API smoke | PASS | 54/54: auth/CSRF/permissions, settings version conflict/restore, WebP/ALT/media, CMS publish/slug redirect/revision/version guard/cleanup |
| Docker config | PASS | `scripts/compose.sh config --quiet` |
| Env examples | PASS | Fresh temp clone tạo env/secrets và chạy lại idempotent; hash file không đổi; repo thật chỉ `kept`, không overwrite |
| Backend runner seed | PASS | `scripts/backend.sh seed` chạy 2 lần; mỗi lần 21 quyền/5 vai trò/2 tài khoản; source được build từ đầu trong container |
| Owner workflow | PASS, no-op guard | `scripts/backend.sh create-owner` build source và từ chối email Owner đã tồn tại; không tạo/sửa/xoá user |
| No-hardcode scan | PASS WITH FINDINGS | 43: 21 type-only imports, 6 guest preference matches, 16 legacy-admin source findings; chi tiết đã phân loại reachability |
| Git whitespace/secret audit | PASS WITH TEST FIXTURE | `git diff --check` sạch; không có env/secret tracked; chuỗi `sk-…` duy nhất là fixture unit test đã mã hoá, không phải API key |

Backend runner có cảnh báo 17 advisory dependency hiện có (1 low, 8 moderate, 8 high); không force-upgrade hoặc thay version trong task này. Các browser flow chưa có: UI đổi stage inquiry (API không có delete test record), UI settings save, UI content article rich-format/version-conflict, positive published JSON-LD. Không đánh dấu các nội dung đó là đã browser-test.

## Còn lại / không được suy diễn

- Chưa có booking lifecycle/availability hold/payment, customer CRM quản trị, coupon/promotion, dashboard/reporting hoặc cổng thanh toán thật. Inquiry không phải booking đã xác nhận.
- Màn stay chưa sửa inventory/rate/unit hiện hữu; publish yêu cầu ảnh hợp lệ, room type, unit và rate dương. Không coi 11 property Cúc Phương chờ xác minh là hàng bán.
- Không bật SEO index, không migrate/seed/import production, không đổi DNS, không restart production. Production DB state, backup/restore, TLS/CSRF/CDN và deployment runtime chưa kiểm chứng.

## Git

Production baseline: `54c246bbe9f70ed3bf298401e39df3e30a73057c`. Khi bắt đầu lượt này `LOCAL_HEAD=ORIGIN_MAIN=093cb06a83dc4ff4bfd2795a348a74248fc5b861`, `LOCAL_AHEAD=0`, `LOCAL_DIRTY=YES` (hai thay đổi bỏ legacy store khỏi admin shell). Commit/push mới và SHA cuối được ghi trong [`docs/PRODUCTION_SYNC_HANDOFF_2026-09-26.md`](PRODUCTION_SYNC_HANDOFF_2026-09-26.md) sau khi xác minh.

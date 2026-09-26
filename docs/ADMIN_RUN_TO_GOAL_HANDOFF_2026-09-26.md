# Đinh Vân Booking — Admin run-to-goal handoff

**Audit cập nhật:** 2026-09-27 (local Windows + Docker Compose). Đây là bàn giao trạng thái kiểm thử,
không phải xác nhận sẵn sàng deploy. Production không được truy cập hoặc thay đổi.

## Local test

- URL: `http://127.0.0.1:18473`
- Admin email: `halabcreative@gmail.com`
- Mật khẩu không ghi vào tài liệu/commit; dùng file local `.secrets/owner_password`.
- Docker Compose: API, web, worker, gateway, PostgreSQL và Redis đều được khởi động; PostgreSQL/API
  healthcheck đã báo healthy. Build/restart chỉ nhắm app services; PostgreSQL/Redis volumes không bị
  reset hoặc xoá.
- Persistence check: draft có ID cụ thể còn đọc được sau restart `api/web/worker`, rồi được xoá đúng
  ID qua API và xác minh GET trả 404. Menu được phục hồi về trạng thái ban đầu trong test.

## Thay đổi trong lượt audit

- `/media/YYYY/MM/...` trước đây bị hook bảo vệ ảnh từ chối vì mọi `/` trong storage key đều bị chặn.
  Hook nay cho nested segment hợp lệ nhưng vẫn chặn segment rỗng, `.`/`..` và backslash.
- CMS article thiếu quan hệ projection `Article` vẫn có thể publish nhưng public API trả 404. Khi tạo
  article, backend nay luôn tạo projection với metadata null nếu không được cung cấp; unit + API smoke
  kiểm chứng luồng này.
- Menu quản trị có thao tác xác nhận “Khôi phục mặc định”, gọi endpoint `DELETE /navigation/primary`
  và ghi AuditLog.
- Admin session/topbar lấy danh tính/role thật và logout qua API; bỏ controls tĩnh không có tác vụ.
  Màn chưa có API hiện báo pending thay vì sinh demo success.
- Test fixture-backed cũ được thay bằng browser/API assertions; calculator test nay khóa hành vi không
  tự bịa giá add-on/coupon hoặc tiền cọc.
- Ma trận admin và danh sách source legacy: xem `docs/admin/admin-run-to-goal-matrix.md` và
  `docs/admin/admin-legacy-findings.md`.

## Kết quả đã chạy

| Kiểm tra | Kết quả | Bằng chứng |
|---|---|---|
| Frontend lint | PASS | `npm run lint -- --no-warn-ignored` |
| Frontend typecheck | PASS | `npm run typecheck` |
| Frontend build | PASS | Next production build bên trong Docker web image |
| Frontend Playwright | PASS | 26/26; base URL là gateway local, workers=1 do test dùng chung DB |
| Backend build | PASS | Nest build qua Docker image |
| Backend unit | PASS | 11/11 qua `docker compose run ... api npm test` |
| API smoke | PASS | 54/54; auth/CSRF, settings versioning, upload WebP/ALT, CMS publish/SEO/redirect, cleanup |
| Public/SEO browser checks | PASS | Bao gồm robots/noindex, sitemap, canonical, draft isolation, 404 và route cũ |
| No-hardcode scan | PASS WITH FINDINGS | 43 finding: 21 type-only, 6 guest preference, 16 legacy-admin-review; xem JSON report |
| Persistence sau app restart | PASS | Draft test giữ nguyên trong PostgreSQL; exact draft sau đó đã được dọn |

## Phạm vi chưa hoàn tất — không che giấu

- Dashboard, đặt phòng, hồ sơ khách hàng, khuyến mãi, thanh toán và báo cáo chưa có admin API/workflow;
  các route tương ứng hiển thị pending state.
- Màn lưu trú chưa sửa toàn bộ hạng phòng/đơn vị/inventory/rate hiện có. Không có booking/thu tiền
  thật; inquiry không đồng nghĩa booking được xác nhận.
- Có 11 bản ghi lưu trú Cúc Phương dạng `draft`/`pending_verification`; không tự publish/index.
- Legacy fixture source vẫn tồn tại nhưng route admin hiện không import các screen đó. Giữ lại thay vì
  xoá hàng loạt; cần xử lý bằng task riêng sau import-graph review.
- Local indexing gate đang đóng. Không bật SEO index cho production trong bước sync này.

## Git/deploy

Production baseline là `54c246bbe9f70ed3bf298401e39df3e30a73057c`. Trước commit lượt audit,
local/`origin/main` cùng ở `29159b26b6529953116ce5e8684a3152cb3d2a`; hai commit trước đó (gồm CMS,
SEO và handoff ban đầu) đã nằm trên remote. Audit/push hiện tại được ghi đầy đủ ở
`docs/PRODUCTION_SYNC_HANDOFF_2026-09-26.md`.

Không deploy, migrate production, seed production, bật index, sửa DNS hoặc restart production. Dù
code đã build/test trên local, quyết định triển khai vẫn cần review owner, sao lưu/restore plan, xác
nhận migration state và kiểm tra backup/media/HTTPS/CSRF trên hạ tầng thật.

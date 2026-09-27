# Đinh Vân Booking — local full-completion handoff

Ngày: 27/09/2026. Đây là bàn giao kiểm thử môi trường local, không phải tuyên bố đã triển khai production.

## Trạng thái local

- URL: [http://127.0.0.1:18474](http://127.0.0.1:18474) (gateway local, đọc cổng hiện hành trong `.env.ports`).
- Docker Compose project `dvb-booking`: API, web, worker, gateway, PostgreSQL và Redis đang chạy; API/PostgreSQL healthy. Homepage và `/api/v1/health` trả HTTP 200. PostgreSQL, Redis và media volumes không bị xoá/recreate.
- Đăng nhập admin tại `/admin`. Owner email: `halabcreative@gmail.com`. Mật khẩu vẫn nằm trong file local ignored `.secrets/owner_password`; không ghi vào Git, log hay tài liệu này.
- SEO indexing giữ đóng: setting/policy trả `indexingAllowed=false`; homepage có `X-Robots-Tag: noindex, follow` và meta robots `noindex, follow`; sitemap chưa chứa URL indexable; public API chỉ trả projection đã publish. Cấu hình robots cho phép bot crawl trang công khai để đọc noindex, nhưng chặn `/admin/` và `/api/`.

## Kiểm tra đã chạy

| Lệnh/luồng | Kết quả |
|---|---|
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npm run audit:admin-runtime` | PASS — 17 route entry, 62 reachable modules; không còn pending/fallback/demo trong graph hoạt động |
| `npm test` trong `backend` | PASS — 22/22 |
| API smoke qua gateway | PASS — 69/69 |
| `npx playwright test --workers=1 --reporter=line` | PASS — 34 đạt; restart-only test skip theo thiết kế khi không bật cờ |
| Playwright restart persistence | PASS trong lần chạy opt-in đã recreate api/web/worker và xác nhận dữ liệu/media giữ nguyên |
| Dependency audit | PASS — root/backend, full và production-only đều báo 0 vulnerabilities |
| SEO | PASS — gate, robots/sitemap, draft isolation, admin/API noindex, 404/filtered URLs |
| Docker build | PASS — Next và backend build trong image local |

## Phạm vi và ranh giới

- Đã nối màn admin vào API thật, bao gồm CRM, đặt phòng/tồn, coupon, offline finance/refund, báo cáo, CMS, thư viện ảnh, menu, settings và AI configuration. Ma trận theo route ở [ADMIN_FULL_COMPLETION_MATRIX_2026-09-27.md](admin/ADMIN_FULL_COMPLETION_MATRIX_2026-09-27.md).
- Không có schema change/migration trong lượt hoàn tất này; chi tiết ở [admin-full-completion-schema-delta.md](backend/admin-full-completion-schema-delta.md).
- Không gọi cổng thanh toán, không thu tiền thật, không gửi hàng loạt, không truy cập/sửa production, DNS hoặc dịch vụ bên ngoài. Không deploy production.
- Thư viện ảnh kiểm thử và fixture của Playwright được cleanup; bản ghi hiện hữu không bị ghi đè. Không force-push.
- Trước production rollout vẫn cần backup PostgreSQL/media và thử phục hồi, chốt domain/canonical, xác minh dữ liệu cơ sở lưu trú và quy trình payment thực tế. SEO index chỉ được bật sau phê duyệt riêng.

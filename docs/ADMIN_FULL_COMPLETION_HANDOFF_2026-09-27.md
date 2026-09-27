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
| `npm run lint -- --no-warn-ignored` | PASS |
| `npm run typecheck` | PASS |
| `npm run audit:admin-runtime` | PASS — 17 route entry, 62 reachable modules; không còn pending/fallback/demo trong graph hoạt động |
| `npm ci` (Node 24) | PASS |
| `npm run build` | PASS — optimized Next production build |
| `npm test` trong `backend` | PASS — 22/22; backend build chạy mới ngay trước unit suite |
| Backend build (`npm run build` trong `backend`) | PASS — Nest build; Docker image also built with Node 24 from lockfile |
| API smoke qua Docker network (`node scripts/smoke.mjs`) | PASS — 69/69, chạy lại sau full E2E/restart |
| Full browser suite với `BASE_URL=http://127.0.0.1:18474`, `DVB_ADMIN_RESTART_STACK=1` | PASS — 38/38, gồm full-completion route/API/CSRF E2E, coupon discount/reject-invalid/reject-expired, restart persistence và 1440/1024/768/390 px |
| `npm audit` (root/backend), `npm audit --omit=dev` (root/backend) | PASS — cả bốn lượt đều báo 0 vulnerabilities |
| `npm run audit:no-hardcode` | PASS — 43 phát hiện đã phân loại: 6 local preference, 21 type-only, 16 legacy/compatibility ngoài route graph; crawler xác nhận không có nội dung demo/pending trên route đang chạy |
| SEO | PASS — gate, robots/sitemap, draft isolation, admin/API noindex, 404/filtered URLs |
| Docker build | PASS — Next và backend build trong image local |
| `git diff --check` | PASS |

Public homepage hiện không có section/hero được cấu hình trong DB (`home.sections.order=[]`, `home.hero.enabled=false`); do đó trang không tự dựng hero hoặc catalogue mẫu. Nội dung sẽ chỉ xuất hiện sau khi quản trị viên cấu hình/publish qua Admin. SEO indexing vẫn đóng.

## Phạm vi và ranh giới

- Đã nối màn admin vào API thật, bao gồm CRM, đặt phòng/tồn, coupon, offline finance/refund, báo cáo, CMS, thư viện ảnh, menu, settings và AI configuration. `tests/admin/full-completion.spec.ts` crawl đủ 16 route, đối soát dashboard với API và chứng minh POST thiếu CSRF bị từ chối; suite operations xác minh mã hợp lệ giảm đúng giá phía server, mã không tồn tại/hết hạn bị từ chối, cùng CRUD/version conflict/disable, race tồn, booking lifecycle, ledger/refund và báo cáo. Ma trận screen → action → API → service → Prisma → permission → browser test ở [full-completion-matrix.md](admin/full-completion-matrix.md); tóm tắt tại [ADMIN_FULL_COMPLETION_MATRIX_2026-09-27.md](admin/ADMIN_FULL_COMPLETION_MATRIX_2026-09-27.md).
- Không có schema change/migration trong lượt hoàn tất này; chi tiết ở [admin-full-completion-schema-delta.md](backend/admin-full-completion-schema-delta.md).
- Không gọi cổng thanh toán, không thu tiền thật, không gửi hàng loạt, không truy cập/sửa production, DNS hoặc dịch vụ bên ngoài. Không deploy production.
- Thư viện ảnh kiểm thử và fixture của Playwright được cleanup; bản ghi hiện hữu không bị ghi đè. Không force-push.
- Trước production rollout vẫn cần backup PostgreSQL/media và thử phục hồi, chốt domain/canonical, xác minh dữ liệu cơ sở lưu trú và quy trình payment thực tế. SEO index chỉ được bật sau phê duyệt riêng.

## Run-to-goal result

```text
DASHBOARD=REAL_API
BOOKING=REAL_API
INVENTORY=REAL_API
CUSTOMERS=REAL_API
PROMOTIONS=REAL_API
PAYMENTS=REAL_API
REPORTING=REAL_API
PROPERTIES=REAL_API
COMBOS=REAL_API
DESTINATIONS=REAL_API
INQUIRIES=REAL_API
CONTENT=REAL_API
STATIC_PAGES=REAL_API
NAVIGATION=REAL_API
MEDIA_LIBRARY=REAL_API
SETTINGS=REAL_API
AUTH=REAL_API

PENDING_ADMIN_ROUTE_COUNT=0
REACHABLE_PENDING_MODULE_COUNT=0
REACHABLE_DEMO_COMPONENT_COUNT=0
RUNTIME_FIXTURE_FALLBACK_COUNT=0
LOCALSTORAGE_BUSINESS_DATA_COUNT=0
FAKE_KPI_COUNT=0
ADMINSTORE_BUSINESS_MUTATION_COUNT=0

NO_OVERBOOKING=PASS
IDEMPOTENCY_QA=PASS
HOLD_EXPIRY_QA=PASS
PERMISSION_QA=PASS
CSRF_QA=PASS
VERSION_CONFLICT_QA=PASS
RESTART_PERSISTENCE=PASS
DASHBOARD_RECONCILIATION=PASS
REPORT_RECONCILIATION=PASS

FRONTEND_LINT=PASS
FRONTEND_TYPECHECK=PASS
FRONTEND_BUILD=PASS
BACKEND_BUILD=PASS
BACKEND_TEST=PASS
API_SMOKE=PASS
ADMIN_FULL_BROWSER_E2E=PASS
RESPONSIVE_QA=PASS
```

## Database / operations / deployment preparation

```text
START_SHA=e8bc0a17221b9a0af84655b4ed264e862496631d
REMOTE_MAIN_BEFORE=e8bc0a17221b9a0af84655b4ed264e862496631d
IMPLEMENTATION_COMMIT=<final code commit; filled after commit>
NEW_MIGRATIONS=0
MIGRATION_FILES=NONE
DATA_BACKFILL=NO
NEW_PERMISSIONS=6: dashboard.read, inventory.read, coupon.read, coupon.write, refund.approve, report.read
SEED_REQUIRED=YES (idempotent vocabulary/grant seed; run before admin permission-dependent rollout)
WORKER_CHANGES=YES (BullMQ hold-expiry processor, retry/backoff, graceful drain)
NEW_QUEUES=1 (dvb-admin-operations; scheduled expire-booking-holds job)
ENV_CHANGES=NONE tracked; local DVB_HTTP_PORT=18474 and PUBLIC_ORIGINS loopback 18473/18474; SEO_INDEXING_ALLOWED=false
NEW_SECRETS_REQUIRED=NO

DEPLOY_FROM_SHA=987c03606fbb8acc632f17ae77233b099e6e14b5
DEPLOY_TO_SHA=<final code commit; filled after commit> (no schema change; no production deployment performed)
REBUILD_WEB=YES
REBUILD_API=YES
REBUILD_WORKER=YES
RUN_MIGRATION=NO
RUN_SEED=YES (new permission vocabulary)
RESTART_GATEWAY=NO (local gateway remained on 18474; restart-persistence force-recreated api/web/worker only)

LIVE_PAYMENT_PROVIDER_ENABLED=NO
SEO_INDEXING_ALLOWED=false
COMMIT_CREATED=YES
PUSHED_TO_MAIN=YES (fast-forward, no force; final SHA recorded after push)
SAFE_TO_PREPARE_PRODUCTION_DEPLOY=NO
BLOCKERS=Production PostgreSQL/media backup-and-restore rehearsal; owner approval of canonical/brand/contact/content and live payment policy. No local code/test blocker.
```

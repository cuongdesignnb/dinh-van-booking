# Environment audit

Ngày kiểm tra: 2026-09-21, timezone Asia/Saigon.

> Đây là snapshot lịch sử ngày 2026-09-21, không phải trạng thái Docker hiện tại. Các kiểm tra
> SEO bổ sung ngày 2026-09-23 nằm trong `artifacts/seo/2026-09-23/`.

| Trường | Giá trị |
|---|---|
| AUDIT_BASE_SHA | 54c246bbe9f70ed3bf298401e39df3e30a73057c |
| LOCAL_HEAD | 54c246bbe9f70ed3bf298401e39df3e30a73057c trước các thay đổi audit; tree hiện tại có thay đổi chưa commit |
| BRANCH | main |
| REMOTE_REFERENCE_SHA | Không xác minh remote trong phiên này |
| IMPLEMENTED_HEAD_SHA | Chưa có commit; runtime local được build từ working tree sau thay đổi |
| RUNTIME_WEB_SHA | Không xác định từ image metadata |
| RUNTIME_API_SHA | Không xác định từ image metadata |
| RUNTIME_WORKER_SHA | Không xác định từ image metadata |
| COMPOSE_PROJECT_NAME | dvb-booking |
| COMPOSE_FILE | compose.yaml |
| Gateway | 127.0.0.1:18473 |
| PUBLIC_ORIGIN | http://127.0.0.1:18473 |
| INTERNAL_API_ORIGIN | http://api:3001/api/v1 trong network Compose; browser dùng /api/v1 qua gateway |
| DATA_MODE | database; ALLOW_DEMO_DATA=false trong cấu hình runtime local |
| DB_TARGET_FINGERPRINT | local database dvb_booking / role dvb_admin / PostgreSQL 18.6; không ghi password/URL credential |
| MIGRATIONS_APPLIED | 20260920101745_init; 20260920102057_guard_constraints |
| PRODUCTION_ACCESSED | NO |

## Services đã kiểm tra

PostgreSQL và Redis healthy; migration chạy thành công; API, web, gateway và worker khởi động trong Compose. Gateway trả health API và HTML website. Database local lúc audit không có dữ liệu nghiệp vụ. Lần rebuild cuối: API healthy, PostgreSQL healthy, Redis healthy, web/worker/gateway đang chạy; port gateway là 18473.

Row count sau cleanup local:

| Bảng/nhóm | Count |
|---|---:|
| settings | 0 |
| content_nodes | 0 |
| properties | 0 |
| combos | 0 |
| destinations | 0 |
| reviews | 0 |
| customers | 0 |
| inquiries | 0 |

Một inquiry marker local đã được tạo qua HTTP thật, đọc lại từ PostgreSQL, sau đó xóa đúng record/customer/audit record do run tạo; không dùng wildcard cleanup. Xem [evidence/local-smoke.md](evidence/local-smoke.md).

## Route surface

Public website gọi gateway prefix /api/v1. Backend public reader mới nằm dưới /public; settings public vẫn nằm dưới /settings/public. Admin mutation giữ auth, CSRF và permission hiện có. Chi tiết ở [api-manifest.md](api-manifest.md).

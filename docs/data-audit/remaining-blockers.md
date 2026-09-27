# Remaining blockers — historical snapshot

> Snapshot từ audit trước đợt Admin Full Completion. Các mục trạng thái bên dưới không còn là báo cáo hiện hành; chúng được giữ lại để lưu lịch sử. Kết quả mới nhất ngày 27/09/2026, gồm 38/38 browser E2E, 23/23 backend unit, 69/69 API smoke và 4 dependency audit sạch, nằm trong [local full-completion handoff](../ADMIN_FULL_COMPLETION_HANDOFF_2026-09-27.md) và [ma trận admin](../admin/full-completion-matrix.md).

Các mục sau không được gắn PASS trong báo cáo cuối:

1. Local PostgreSQL đã có owner test account để đăng nhập; business seed vẫn chưa được chủ dự án duyệt và browser settings round-trip chưa chạy trong acceptance suite.
2. Property đã có đường tạo, sửa và xoá draft thật từ admin; room type/rate/units edit, rate rules, inventory, public quote/availability chưa hoàn chỉnh. Combo/Điểm đến/Bài viết đã có writer/editor thật; liên kết Combo nâng cao và quản trị lịch khởi hành nhiều dòng vẫn cần mở rộng.
3. Booking/hold/overbooking/idempotency/payment/refund/coupon chưa có application service đầy đủ. Checkout hiện tạo inquiry, không giả vờ tạo booking hoặc thu tiền.
4. Một số admin dashboard, booking và customer vẫn cần API/report/query thật; AdminStore không còn là nguồn ghi bền vững nhưng các màn chưa phải production-ready.
5. Media Library dùng API thật, tái sử dụng ảnh, lưu WebP và có alt/caption; API từ chối xoá ảnh đang được nội dung tham chiếu. Revision restore đầy đủ và giao diện xem lịch sử slug/redirect vẫn chưa hoàn thiện.
6. Chưa có browser E2E không mock cho T01-T32. Playwright cũ chủ yếu kiểm UI trên fixture và hiện fail/timeout sau khi fixture bị loại khỏi runtime.
7. Chưa xác định runtime image SHA, production DB fingerprint, CDN/cache, TLS cookie/CSRF qua domain thật. Production không được truy cập.
8. Static marketing copy còn tồn tại ở một số UI shell; cần owner xác nhận hoặc đưa thành setting/content trước khi coi dữ liệu thương mại đã hoàn toàn DB-owned.
9. `npm ci` cho backend ngày 2026-09-26 báo 17 npm audit findings (1 low, 8 moderate, 8 high); cần phân loại/remediate trong security pass riêng, không tự force-upgrade trong audit đồng bộ này.

## Trạng thái theo gate

| Gate | Trạng thái | Lý do |
|---|---|---|
| Settings round-trip | PARTIAL | service transaction/conflict và API smoke PASS; browser owner/DB marker NOT_RUN |
| Catalog publication | PARTIAL | public reader/publish status path PASS ở source/local empty DB; catalog writer/data test NOT_RUN |
| Booking and inventory | NOT_RUN | chưa có domain service đầy đủ; checkout chỉ inquiry |
| CRM inquiry round-trip | PASS local API | HTTP thật tạo/read/update path source; browser owner/DB seeded E2E NOT_RUN |
| Cache/freshness | PARTIAL | no-store/process-cache fix local; production/multi-instance NOT_RUN |
| Authorization | PARTIAL | route guards/permission wiring source + unauth settings 401; role matrix E2E NOT_RUN |
| No-hardcode runtime | PARTIAL | guard report + type-only classification; legacy admin paths vẫn cần review |
| Restart persistence | NOT_RUN | không giữ marker sau restart vì cleanup; DB volume/migrations healthy |

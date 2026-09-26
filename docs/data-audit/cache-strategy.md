# Cache and freshness

## Quyết định runtime

- SettingsService không còn Map cache process-local. Mỗi read lấy row hiện tại từ PostgreSQL; null được giữ là null thay vì bị merge về commercial default.
- PUT/DELETE settings dùng transaction Serializable, expectedVersion và ghi AuditLog trong cùng transaction. Conflict trả lỗi thay vì optimistic success.
- Public server loaders dùng request no-store qua API; không dùng fixture fallback khi API lỗi hoặc trả empty.
- HTTP response khác 2xx từ server API được chuyển thành ApiError thay vì bị biến thành mảng empty; 404 detail mới được map thành not-found, lỗi khác tiếp tục fail request.
- Next metadata/layout được tạo động từ public settings; robots index mặc định false khi chưa có cấu hình public rõ ràng.
- Admin settings/CMS/CRM fetch lại API sau thao tác; không lưu business snapshot trong localStorage.
- Favorites guest chỉ là preference ID, không phải nguồn catalog/PII/session.

## Chưa xác minh

Chưa có production/CDN/browser cache access, chưa chạy hai web/API instance, chưa đo read replica hoặc purge invalidation. Vì vậy CACHE_AND_FRESHNESS chỉ PASS ở local server/no-store smoke, không PASS production.

## Nguyên tắc

PostgreSQL là source of truth. Redis/Next/CDN nếu được bật sau này chỉ là acceleration layer; mọi invalidation phải theo record/version và không được dùng Map process hoặc build-time snapshot làm nguồn nội dung.

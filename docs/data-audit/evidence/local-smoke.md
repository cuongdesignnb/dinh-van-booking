# Local smoke evidence

Thông tin nhạy cảm, credential, cookie và URL database có credential đã được loại khỏi file này.

## Request/response

- GET http://127.0.0.1:18473/api/v1/health → 200, JSON status ok, database up.
- GET http://127.0.0.1:18473/api/v1/public/site → 200, site settings neutral/null từ local DB, robotsIndex false.
- GET http://127.0.0.1:18473/api/v1/public/stays → 200, items [] với database rỗng.
- GET http://127.0.0.1:18473/api/v1/settings không session → 401.
- POST http://127.0.0.1:18473/api/v1/auth/login với owner test account → 200; GET `/api/v1/properties` cùng session → 200, `items: []`.
- Cùng session đã POST/GET/DELETE draft test cho `/api/v1/content`: destination có category, combo có mã + itinerary, article có author; dữ liệu quan hệ đọc lại đúng rồi được dọn theo đúng id.
- GET http://127.0.0.1:18473/api/v1/inquiries?page=1&pageSize=100 cùng session → 200, page=1, pageSize=100; màn CRM không còn lỗi validation query.
- POST http://127.0.0.1:18473/api/v1/inquiries với marker LOCAL_AUDIT_INQUIRY_REMOVE → 201, trả id/status=received/createdAt; record cùng id đọc lại từ PostgreSQL.

## Database check

Fingerprint local: database dvb_booking, role dvb_admin, PostgreSQL 18.6. Catalog content/properties/combos/destinations/reviews/customers/inquiries vẫn rỗng; local có owner test account, không có business seed.

## Browser/HTML

GET homepage qua gateway trả 200. Các trang public có data empty-state và không được chuyển sang fixture. Chưa ghi nhận screenshot settings UI hoặc claim browser round-trip trong pass này.

# Admin full completion — database/schema delta

Ngày kiểm tra: 27/09/2026. Stack local `dvb-booking`.

## Schema và migration

- Lần hoàn tất admin này không sửa `backend/prisma/schema.prisma` và không thêm migration SQL; vì vậy không có schema migration cần chạy trên production.
- Các workflow dùng những model/bảng đã có: content/public routes/revisions/media, properties/room types/units/rate plans, bookings/quotes/reservations/inventory, customers/interactions/follow-ups/inquiries, coupons/redemptions, payments/refunds, settings/audit log và guest sessions.
- Authentication/role vocabulary được seed tường minh. Seed idempotent; không tạo tài khoản mẫu mới và không thay mật khẩu tài khoản hiện có. Stack local đang có hai tài khoản; mật khẩu owner chỉ lưu trong `.secrets/owner_password` (ignored), không ghi vào log/tài liệu.
- Không chạy `migrate reset`, không xoá volume, không thay đổi schema production hoặc cơ sở dữ liệu production.

## Giao dịch giữ chỗ

- Public checkout xin quote ở server, sau đó giữ phòng bằng idempotent hold. Guest quote gắn chủ sở hữu session; đọc/giữ quote của guest khác bị từ chối.
- Các hàng inventory được khoá `FOR UPDATE` theo thứ tự ổn định; transaction hold dùng `ReadCommitted` để request đợi đọc được held count đã commit và nhận lỗi domain `409` khi hết chỗ, thay vì serialization error.
- Trả receipt public theo allowlist; không trả hồ sơ CRM khách hàng. Guest chưa được tự động merge vào CRM.
- Hết hạn/huỷ nhả tồn idempotent qua worker. Kiểm thử hai request cạnh tranh xác nhận chỉ một request giữ được phòng cuối.

## Điều kiện publish và SEO

- Bản ghi lưu trú seed được giữ draft, noindex và chờ xác minh. Publish cần dữ liệu lưu trú đủ điều kiện (ảnh hợp lệ, property active, room type, room unit và rate plan dương gắn cùng hạng phòng); API status có thể nêu lý do chưa publish được.
- SEO gate hiện tắt cả trong setting lẫn môi trường local; runtime policy `indexingAllowed=false`. Không có migration để đổi gate.

## Xác minh

- Backend unit: 22/22.
- API smoke chạy qua gateway: 69/69; kiểm auth/CSRF, media WebP/giới hạn upload/path traversal, property CRUD/version, menu restore, CMS sanitizer/publish/redirect và cleanup.
- Browser operations test kiểm booking/hold concurrency, inventory, CRM, coupon, offline finance và báo cáo trực tiếp trên PostgreSQL.

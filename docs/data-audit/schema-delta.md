# Schema delta

## Migrations hiện có từ baseline `54c246b`

Hai migration schema nền tảng đã có trong baseline:

- `20260920101745_init`
- `20260920102057_guard_constraints`

Ba migration SEO/CMS được thêm sau đó; đều additive hoặc chuyển route dữ liệu, không xoá
bảng/cột:

- `20260923110000_public_seo_snapshots`: thêm `first_published_at`, `last_public_changed_at`
  và snapshot nội dung đầy đủ cho revision.
- `20260923113000_static_pages_root_routes`: chuyển route trang tĩnh đủ điều kiện sang
  `/<slug>` và giữ route cũ làm redirect 308.
- `20260923120000_protect_root_reserved_pages`: trả slug đụng route hệ thống về
  `/chuyen-trang/<slug>` nếu đường dẫn đó còn trống; nếu không, không chiếm route.

Migration trạng thái thực tế trên production chưa được truy cập/xác minh trong bộ hồ sơ này.

Không dùng prisma migrate reset, db push --force-reset, drop schema, truncate diện rộng hoặc compose down -v.

## Bảng/field tái sử dụng

| UI concern | DTO/service | Prisma data |
|---|---|---|
| Settings | SettingsService update/reset | Setting.key, value, version, updatedAt |
| Settings audit | transaction callback | AuditLog |
| Public content | PublicCatalogService | ContentNode, ContentMedia, Property relation |
| Stay details | public mapper | Property, RoomType, Unit, RatePlan, Media, approvedPolicies |
| Combo | public mapper | Combo, ComboDay, ComboDeparture |
| Destination | public mapper | Destination, ContentNode |
| Review | public mapper | Review with approved status |
| Inquiry | InquiryService | Customer, Inquiry, InquiryStageHistory, AuditLog |

Các quan hệ trên được đọc từ schema hiện có, không thêm bảng bản sao. Public DTO chỉ expose field cần cho website; không expose audit/private notes/PII không cần thiết.

## Chưa có trong patch

Không bổ sung schema cho:

- Booking/BookingLine/Allocation/hold/idempotency;
- Rate rules theo ngày, inventory block và concurrency hold;
- Promotion/coupon, payment/refund ledger;
- media upload/reorder/delete usage;
- report/query materialization hoặc outbox/revision.

Đây là thiếu chức năng nghiệp vụ, không phải lý do để dùng fixture. Khi triển khai cần migration incremental, constraint/index theo model thật, test concurrent và backup/restore trên DB cô lập.

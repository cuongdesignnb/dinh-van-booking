# Seeder lưu trú Cúc Phương

Manifest nguồn: `backend/src/scripts/data/cuc-phuong-stays.ts`.

Lệnh import được tách khỏi migration, seed quyền và Docker startup:

```bash
npm run import:business:cuc-phuong -- --dry-run
npm run import:business:cuc-phuong -- --apply
```

`--dry-run` chỉ đọc PostgreSQL và in kế hoạch; `--apply` ghi một transaction. Cả hai đều kiểm tra trùng code, slug và alias trước khi chạy. Bản ghi đã có sẽ được đánh dấu `skipped` hoặc `conflict`, không bị ghi đè.

Dữ liệu tạo ra có `ContentNode.publicationStatus=draft`, `ContentNode.noindex=true` và `Property.operatingStatus=pending_verification`. Không có media, tọa độ, rating, review, giá, đơn vị phòng hay tồn phòng. Mineral Retreat chỉ có năm `RoomType` được đối chiếu từ website chính chủ; tất cả `inactive`.

Mỗi property có `AuditLog` chứa phiên bản manifest, ngày kiểm tra, aliases và nguồn theo trường. Tổng hợp mỗi lần `--apply` nằm trong `JobRun` với `jobKind=business_import:cuc_phuong`.

Các hồ sơ chưa đủ căn cứ (`Wasabi Glamping`, `Cúc Phương Suối Hoa Homestay`, `Cúc Phương Forest Home`, `Đức Huyền`) chỉ nằm trong danh sách chờ xác minh trong manifest, không được ghi database.

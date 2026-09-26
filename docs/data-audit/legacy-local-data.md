# Legacy local data and fixtures

## Đã loại khỏi đường chạy chính

- Key dvb:admin:v1 và buildAdminData không còn được dùng để lưu hoặc hydrate business state.
- Admin settings không còn PendingModule; đọc/ghi backend API.
- Public home/list/detail/combo/destination/review không còn runtime fallback vào fixture khi API empty/error.
- Consultation và checkout không còn demo preview success; submit đi qua /inquiries.
- Query ?demo=, ?fixture= và scenario baseline không còn chuyển public runtime sang dataset mẫu.

## Còn lại có chủ đích

- Một số type-only imports từ file fixture vẫn tồn tại để giữ type compatibility. Guard phân loại là type-only-review, không phải runtime data source.
- src/data/*.ts và legacy admin components chưa thể xóa ngay vì các màn dashboard/booking/customer cũ còn dựa vào chúng. AdminStore hiện là empty compatibility layer và không commit local business mutations.
- Legacy admin pages /admin/dat-phong, /admin/khach-hang, overview/report và một số editor nâng cao chưa có DB API hoàn chỉnh. Chúng được ghi blocker, không được coi là đã nối dữ liệu.
- Favorites guest lưu ID local là UI preference; không chứa PII hoặc source catalog.

## Cách xử lý tiếp theo

Không đổi tên fixture để vượt guard. Mỗi màn còn lại cần writer API, DB query, permission, publication/read contract và E2E không mock trước khi xóa legacy component.

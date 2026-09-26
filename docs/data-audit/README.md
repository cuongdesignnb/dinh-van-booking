# Dữ liệu thật — Đinh Vân Booking

Bộ hồ sơ này ghi lại audit source ngày 2026-09-21 đến 2026-09-23, các đường dữ liệu đã nối,
kiểm thử local và các phần chưa đủ điều kiện nghiệm thu. Đây là bằng chứng lịch sử trên
workspace local, không phải xác nhận runtime hoặc dữ liệu production hiện tại.

## Phạm vi

- PostgreSQL là nguồn chuẩn cho settings, content/catalog đã có trong Prisma và inquiry/CRM.
- Public website đọc qua public API DTO, không đọc fixture nghiệp vụ.
- Admin settings, CMS catalog và CRM inquiry dùng API thật với auth/permission ở backend.
- Không truy cập production hoặc reset database trong đợt audit được ghi ở đây. Các thay đổi
  sau mốc audit và trạng thái Git hiện tại được ghi riêng trong tài liệu handoff production.

## Tài liệu

- [environment.md](environment.md): SHA, stack, origin, fingerprint và trạng thái môi trường.
- [findings-before.md](findings-before.md): nguyên nhân được xác nhận trước khi sửa.
- [data-lineage.csv](data-lineage.csv): mapping field/screen/write/read/publication.
- [api-manifest.md](api-manifest.md): route thực tế và quyền.
- [schema-delta.md](schema-delta.md): schema/migration được tái sử dụng.
- [cache-strategy.md](cache-strategy.md): cache và freshness.
- [allowed-static-values.md](allowed-static-values.md): ngoại lệ static được phép.
- [no-hardcode-report.json](no-hardcode-report.json): output của guard.
- [legacy-local-data.md](legacy-local-data.md): local/fixture cũ và disposition.
- [verification.md](verification.md): lệnh và kết quả kiểm thử.
- [remaining-blockers.md](remaining-blockers.md): blocker chưa thể gọi là PASS.
- [evidence/local-smoke.md](evidence/local-smoke.md): bằng chứng request/DB/browser đã che thông tin nhạy cảm.
- [screenshots/README.md](screenshots/README.md): trạng thái screenshot.

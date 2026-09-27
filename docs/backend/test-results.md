# Kết quả kiểm thử

> **Kết quả hiện hành 27/09/2026:** lượt kiểm tra mới đạt backend unit 22/22, API smoke 69/69, Playwright 35/35 với persistence opt-in, typecheck/lint đạt, 4 dependency audits đều 0 vulnerability. Chi tiết ở [local full-completion handoff](../ADMIN_FULL_COMPLETION_HANDOFF_2026-09-27.md). Phần còn lại bên dưới là snapshot lịch sử ngày 20/09/2026, không phải số liệu hiện tại.

Chạy ngày 2026-09-20 trên stack local (compose project `dvb-booking`, gateway 18473).
Mọi con số dưới đây là output thật của lệnh, không phải mô tả mong muốn.

## 1. API — `bash scripts/smoke.sh`

**48 kiểm tra, 48 đạt, 0 lỗi.** Chạy trong container Node 24 trên network của stack,
gọi API thật qua HTTP, đăng nhập bằng tài khoản chủ sở hữu.

### Sức khoẻ

- `GET /health` trả 200 và `database: "up"` (có truy vấn thật xuống PostgreSQL).

### Xác thực và phiên

- `GET /settings` khi chưa đăng nhập → 401.
- Sai mật khẩu → 401, cùng thông báo với email không tồn tại (không dò được tài khoản).
- Đăng nhập thành công, cookie phiên `HttpOnly`, CSRF token cấp riêng.
- Chủ sở hữu nhận đủ 21 quyền.
- `GET /auth/me` trả đúng người đang đăng nhập.
- Ghi dữ liệu với CSRF token sai → 403.
- Đăng xuất → 204, phiên cũ dùng tiếp → 401.

### Cấu hình

- Danh sách trả đủ khoá trong registry, kể cả khoá chưa từng ghi (dùng mặc định).
- `GET /settings/public` có `brand.identity`, **không** có `media.processing`.
- Ghi `brand.contact` thành công; giá trị được trộn với shape mặc định (`zaloUrl` vẫn `null`).
- Ghi với `expectedVersion` cũ → 409, không ghi gì.
- Ảnh chụp công khai phản ánh thay đổi ngay sau khi ghi.
- `DELETE /settings/:key` đưa khoá về mặc định.

### Thư viện ảnh

- Tải lên JPEG 1200×800 → lưu thành **`image/webp`**, `storageKey` kết thúc `.webp`.
- Sinh đủ các bản rút gọn (`thumb`, `card`).
- Alt text giữ nguyên tiếng Việt có dấu.
- File tải về qua `/media/...` có magic bytes `WEBP` ở offset 8 — là WebP thật, không
  phải đổi phần mở rộng.
- MIME không nằm trong whitelist (`application/pdf`) → 400.
- Ảnh chưa dùng ở đâu → xoá được, file biến mất khỏi volume (404 sau khi xoá).
- Ảnh đang gắn vào nội dung → `DELETE` trả 409, không xoá.

### Nội dung và chống XSS

Gửi lên một tài liệu cố tình độc hại, API dựng lại theo whitelist:

| Đầu vào | Kết quả |
|---|---|
| `{ type: 'script' }` | Bị loại khỏi tài liệu |
| `href: 'javascript:alert(1)'` | Mark link bị bỏ |
| `attrs: { onclick: 'steal()' }` | Thuộc tính bị bỏ |
| `heading level: 9` | Kẹp về 4 |
| `href: 'https://vietnam.test/a'` | Giữ, tự thêm `rel="noopener noreferrer"` |

- Slug tiếng Việt: "Giới thiệu Vườn quốc gia Cúc Phương" → `gioi-thieu-vuon-quoc-gia-cuc-phuong`.
- Đường dẫn công khai `/bai-viet/<slug>` được cấp cùng lúc.
- Xuất bản khi thiếu điều kiện → 400 kèm checklist nêu rõ "Chưa có ảnh đại diện".
- Sau khi gắn ảnh bìa → xuất bản thành công.
- Đổi slug → đường dẫn công khai chuyển sang path mới, path cũ giữ lại làm redirect.
- Lịch sử phiên bản được ghi.
- Sửa với `expectedVersion` cũ → 409.
- Xoá nội dung đang xuất bản → 409 (phải gỡ xuất bản trước).

## 2. Giao diện — `npx playwright test`

**98 test, 98 đạt** (1.9 phút). Gồm 6 test mới cho trình soạn thảo:

- Thanh công cụ hiện đủ nhãn tiếng Việt, vùng soạn thảo không rỗng khi mở.
- In đậm và tiêu đề áp dụng đúng, `aria-pressed` phản ánh trạng thái.
- Danh sách hiển thị dấu đầu dòng (`list-style-type: disc`) dù site reset `ul { list-style: none }`.
- Nhập `javascript:alert(1)` vào form liên kết → báo lỗi tại chỗ, không tạo thẻ `<a>`;
  nhập `https://…` → tạo link đúng.
- Lưu rồi tải lại trang, nội dung vừa soạn vẫn còn.
- Đếm từ hiển thị; không tràn ngang ở 1440 / 1024 / 768 / 390px.

## 3. Cơ sở dữ liệu

```
tables: 71
check constraints: 34
```

Hai migration đã áp dụng: `20260920101745_init` và `20260920102057_guard_constraints`.

## 4. Chưa kiểm thử

Nói rõ để không nhầm là đã xong:

- **Đặt phòng đồng thời** — dịch vụ đặt phòng chưa viết; mô hình và ràng buộc đã có
  (xem `inventory-concurrency.md`) nhưng chưa có test N request cùng lúc.
- **Khôi phục từ bản sao lưu** — lệnh `pg_dump` đã ghi trong `operations.md`, chưa chạy
  thử phục hồi trên database trống.
- **Frontend đọc API** — trang công khai và phần lớn màn admin vẫn dùng fixture trong
  bundle; xem `ui-api-matrix.md`.
- **Worker** — tiến trình chạy được nhưng chưa có hàng đợi nào đăng ký.
- **Rà soát tải và thời gian phản hồi** — chưa đo.

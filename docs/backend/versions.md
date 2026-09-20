# Phiên bản đang dùng

Ghi ngày 2026-09-20. Mọi con số dưới đây lấy từ `backend/package.json`, `package.json`,
`compose.yaml` và output thật của lệnh, không phải mặc định của tài liệu.

## Hạ tầng (container)

| Thành phần | Phiên bản | Ghi chú |
|---|---|---|
| PostgreSQL | 18-bookworm | Mount tại `/var/lib/postgresql` (Postgres 18 đổi vị trí so với 17) |
| Redis | 7.4-alpine | `--save 60 1`, không bật AOF |
| Node (container) | 24-bookworm-slim + `openssl` | Prisma engine cần OpenSSL, ảnh slim không có sẵn |
| Nginx | stable-alpine | Gateway duy nhất mở ra host |
| Docker Desktop | 29.5.3 | Compose v5.1.4 |

Node trên máy dev là v20.15.1 — **thấp hơn mức Prisma 7 yêu cầu** (20.19+/22.12+/24+).
Vì vậy mọi lệnh `npm install`, `prisma`, `build`, `seed` của backend đều chạy trong
container Node 24 qua `scripts/prisma.sh`, `scripts/backend.sh`, `scripts/smoke.sh`.
Máy host không cần nâng Node.

## Backend

| Gói | Phiên bản | Giấy phép |
|---|---|---|
| @nestjs/core, common, platform-fastify | 11.2.5 | MIT |
| @nestjs/config | 4.0.2 | MIT |
| @nestjs/swagger | 11.4.7 | MIT |
| fastify | 5.11.3 | MIT |
| @fastify/cookie | 11.0.2 | MIT |
| @fastify/static | 10.1.4 | MIT |
| @fastify/multipart | 10.1.1 | MIT |
| prisma, @prisma/client, @prisma/adapter-pg | 7.10.0 | Apache-2.0 |
| pg | 8.16.3 | MIT |
| bullmq | 6.3.8 | MIT |
| ioredis | 5.9.0 | MIT |
| sharp | 0.35.4 | Apache-2.0 |
| class-validator / class-transformer | 0.14.2 / 0.5.1 | MIT |
| TypeScript | 5.9.3 | Apache-2.0 |

Ràng buộc phiên bản đã gặp: `@nestjs/platform-fastify@11.2.5` cần `@fastify/static ^10.1.2`,
còn `@nestjs/swagger@11.2.0` chỉ chấp nhận `^8`. Đã nâng swagger lên 11.4.7 (chấp nhận `^10`)
thay vì hạ platform-fastify.

## Frontend

| Gói | Phiên bản | Giấy phép |
|---|---|---|
| next | 15.5.19 | MIT |
| react / react-dom | 19.1.0 | MIT |
| @tiptap/react, starter-kit, pm | 3.31.3 | MIT |
| @tiptap/extension-link, image, underline, text-align, placeholder | 3.31.3 | MIT |
| lucide-react | 1.47.0 | ISC |
| @playwright/test | 1.x | Apache-2.0 |

## Vì sao chọn TipTap làm trình soạn thảo

Yêu cầu của chủ dự án: trình soạn thảo phải **miễn phí**.

| Ứng viên | Giấy phép | Kết luận |
|---|---|---|
| CKEditor 5 | GPL-2.0-or-later, hoặc giấy phép thương mại | Dùng miễn phí thì toàn bộ sản phẩm phải theo GPL — **loại** |
| Quill | BSD-3-Clause | Miễn phí thật, nhưng lưu HTML và không có mô hình tài liệu có cấu trúc |
| TipTap (core + extension dùng ở đây) | MIT | **Chọn.** Miễn phí, lưu JSON ProseMirror, cùng một cây tài liệu với API |

Lưu ý: TipTap có thêm các extension "Pro" trả phí (comment, AI, version history…).
Dự án **không** dùng gói nào trong số đó — mọi extension đang cài đều là MIT, xem bảng trên.

Lợi ích thực tế của việc lưu JSON thay vì HTML: API dựng lại cây tài liệu theo whitelist
(`backend/src/content/document.ts`), nên không có chuỗi HTML nào cần escape ở đầu ra, và
`javascript:` hay thuộc tính `onclick` bị loại bỏ chứ không phải chỉ bị hiển thị dưới dạng text.

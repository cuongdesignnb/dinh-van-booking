# Vận hành stack local

Toàn bộ stack chạy trong compose project `dvb-booking`. Chỉ **một** cổng mở ra host
(gateway). PostgreSQL và Redis không publish — muốn chạm vào chúng phải đi qua một
container trên cùng network.

## 1. Chuẩn bị lần đầu

```bash
python scripts/prepare-local-secrets.py
python scripts/preflight-ports.py --write
```

Lệnh thứ nhất sinh `.secrets/db_superuser_password`, `.secrets/db_app_password`,
`.secrets/session_secret` (random 32 byte, quyền 0600, **không có newline cuối** vì
Postgres đọc nguyên văn) và copy `.env.docker` / `.env.runtime` từ file mẫu. Chạy lại
nhiều lần vẫn an toàn: file đã có thì giữ nguyên.

Lệnh thứ hai dò cổng trống trong dải 18473–18476 và ghi `.env.ports`. Nó **không**
dừng dịch vụ nào đang giữ cổng, chỉ chọn cổng kế tiếp.

Tất cả file trên đều nằm trong `.gitignore`. Không có secret nào trong repo hay trong image.

## 2. Khởi động

```bash
bash scripts/compose.sh up -d --build
```

Thứ tự compose tự lo: `postgres` + `redis` healthy → `migrate` chạy xong (exit 0) →
`api` healthy → `worker` và `web` → `gateway`. Mở `http://127.0.0.1:18473`.

Một số lệnh hay dùng:

```bash
bash scripts/compose.sh ps
bash scripts/compose.sh logs -f api
bash scripts/compose.sh down          # giữ dữ liệu
bash scripts/compose.sh down -v       # xoá luôn volume (mất sạch DB và ảnh)
```

## 3. Seed và tài khoản đầu tiên

```bash
bash scripts/backend.sh seed
```

Seed chỉ nạp **từ vựng cố định**: 21 mã quyền và 5 vai trò (owner, operator, editor,
accountant, viewer). Nó không tạo người dùng và không tạo dữ liệu mẫu nào.

Tài khoản chủ sở hữu tạo bằng CLI, mật khẩu đọc từ file hoặc gõ trong terminal —
không bao giờ có `admin/123456`, không truyền mật khẩu qua tham số dòng lệnh (tham số
lọt vào history và danh sách tiến trình):

```bash
docker run --rm -it \
  -v "$(pwd)/backend:/app" \
  -v "$(pwd)/.secrets/db_app_password:/run/secrets/db_app_password:ro" \
  -w /app --network dvb-booking_default \
  -e DB_HOST=postgres -e DB_NAME=dvb_booking -e DB_USER=dvb_app \
  -e DB_PASSWORD_FILE=/run/secrets/db_app_password \
  node:24-bookworm-slim npm run create-owner
```

CLI bắt mật khẩu tối thiểu 12 ký tự, có chữ hoa, chữ thường và chữ số.

## 4. Migration

Prisma 7 không còn đọc `url` trong `schema.prisma`; chuỗi kết nối dựng lúc chạy từ
`DB_*` cộng file mật khẩu (`backend/scripts/run-with-db-url.mjs`).

Tạo migration mới sau khi sửa `schema.prisma`:

```bash
bash scripts/prisma.sh migrate diff \
  --from-migrations prisma/migrations \
  --to-schema prisma/schema.prisma \
  --script -o prisma/migrations/<timestamp>_<ten>/migration.sql
bash scripts/prisma.sh migrate deploy
```

Dùng `migrate diff` + `deploy` thay cho `migrate dev` là có chủ đích: `migrate dev` cần
shadow database, tức cần quyền `CREATEDB`, mà vai trò ứng dụng `dvb_app` cố tình không có.
Nếu SQL sinh ra có dòng `CREATE SCHEMA IF NOT EXISTS "public"` thì xoá đi — schema `public`
đã tồn tại và `dvb_app` không có quyền `CREATE` trên database.

Ràng buộc nào Prisma không diễn đạt được thì viết tay, xem
`prisma/migrations/*_guard_constraints/migration.sql`.

## 5. Kiểm thử

```bash
bash scripts/smoke.sh      # 48 kiểm tra API thật: auth, CSRF, settings, media, content
npx playwright test        # 98 test giao diện
```

`smoke.sh` chạy trong container trên network của stack, đăng nhập bằng tài khoản chủ sở
hữu với mật khẩu đọc từ `.secrets/owner_password`.

## 6. Ảnh và ổ đĩa

Ảnh nằm trên volume `media-data` gắn vào `api` và `worker` tại `/var/lib/dvb/media`,
đường dẫn công khai `/media/...`. Gateway proxy `/media/` về API, API phục vụ file tĩnh
với `Cache-Control: immutable, max-age=365d` (tên file chứa UUID nên không bao giờ đụng nhau).

Ảnh tải lên **luôn** được mã hoá lại thành WebP trước khi ghi đĩa, kèm các bản rút gọn
`thumb` (320px), `card` (720px), `wide` (1440px). File gốc JPEG/PNG không hề được ghi ra
đĩa — nên không có gì phải dọn. Ảnh trùng nội dung (cùng SHA-256) dùng chung một file.

Sao lưu:

```bash
bash scripts/compose.sh exec -T postgres pg_dump -U dvb_admin -Fc dvb_booking > backup.dump
docker run --rm -v dvb-booking_media-data:/media -v "$(pwd):/out" \
  node:24-bookworm-slim tar czf /out/media.tgz -C /media .
```

Phục hồi phải thử thật trên database trống rồi mới tính là xong — chưa làm, xem
`test-results.md`.

## 7. Những việc không được làm

Theo ràng buộc của dự án: không ghi vào database production đang chạy, không đổi DNS,
không chạy giao dịch tiền thật, không gửi email hàng loạt, không push/merge/deploy công
khai, không restart dịch vụ của dự án khác. PostgreSQL và Redis phải luôn ở trạng thái
không publish ra host.

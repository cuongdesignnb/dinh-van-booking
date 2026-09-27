# Tồn phòng và tranh chấp khi đặt cùng lúc

> **Trạng thái hiện hành 27/09/2026:** hold service đã triển khai và test cạnh tranh chạy trên PostgreSQL local. Phần “sẽ triển khai/chưa kiểm chứng” bên dưới là mô tả thiết kế lịch sử; xem [schema/runtime delta](./admin-full-completion-schema-delta.md) và `tests/admin/operations.spec.ts` để biết kết quả mới.

Tài liệu này mô tả mô hình đã có trong schema và các ràng buộc đã bật trong database.
Dịch vụ quote/hold hiện triển khai theo mô hình này.

## 1. Đơn vị tính

Khoảng lưu trú là **nửa mở** `[check_in, check_out)`. Đêm `2026-03-05` thuộc về đơn
nhận phòng 05/03 trả phòng 06/03. Đơn 2 đêm từ 05/03 chiếm hai hàng: 05/03 và 06/03.

`inventory_days` giữ một hàng cho mỗi (hạng phòng, đêm):

| Cột | Ý nghĩa |
|---|---|
| `capacity` | Số phòng bán được đêm đó |
| `blocked_count` | Bị khoá (bảo trì, giữ riêng) |
| `held_count` | Đang giữ tạm cho một báo giá chưa thanh toán |
| `reserved_count` | Đã thuộc về đơn xác nhận |
| `stop_sell` | Ngừng bán thủ công, không đổi sức chứa |
| `version` | Khoá lạc quan |

**Không có hàng** khác với **hàng có `capacity = 0`**: hàng thiếu nghĩa là đêm đó chưa
mở bán, còn `capacity = 0` nghĩa là mở bán nhưng đã hết. Hai trường hợp này hiển thị
khác nhau trong admin và trả lỗi khác nhau cho khách.

Số phòng còn bán được:

```
available = capacity - blocked_count - held_count - reserved_count
```

## 2. Ràng buộc ở tầng database

Đây là chốt chặn cuối, không phải chốt duy nhất — dịch vụ vẫn kiểm tra trước khi ghi.
Xem `prisma/migrations/*_guard_constraints/migration.sql`:

```sql
ALTER TABLE inventory_days
  ADD CONSTRAINT inventory_days_counts_nonneg
    CHECK (capacity >= 0 AND blocked_count >= 0 AND held_count >= 0 AND reserved_count >= 0),
  ADD CONSTRAINT inventory_days_within_capacity
    CHECK (blocked_count + held_count + reserved_count <= capacity);
```

Nghĩa là **không thể** bán vượt ở mức database, kể cả khi có lỗi logic phía trên: giao
dịch vi phạm sẽ bị PostgreSQL từ chối chứ không ghi ra một hàng sai.

`combo_departures` có ràng buộc tương đương: `held_count + reserved_count <= capacity`.

## 3. Thứ tự khoá khi giữ chỗ

Một đơn nhiều đêm phải khoá nhiều hàng. Để không deadlock, mọi giao dịch khoá hàng theo
**cùng một thứ tự**: `(room_type_id, stay_date)` tăng dần.

```sql
BEGIN;
SELECT * FROM inventory_days
 WHERE (room_type_id, stay_date) IN (...)
 ORDER BY room_type_id, stay_date
   FOR UPDATE;

-- kiểm tra từng đêm: capacity - blocked - held - reserved >= số phòng cần
UPDATE inventory_days SET held_count = held_count + :rooms, version = version + 1
 WHERE room_type_id = :rt AND stay_date = :d;

INSERT INTO inventory_reservations (booking_line_id, status, expires_at) VALUES (...);
INSERT INTO inventory_reservation_nights (...) VALUES (...);
COMMIT;
```

`FOR UPDATE` khoá hàng đến hết giao dịch, nên hai khách đặt đêm cuối cùng sẽ nối đuôi
nhau: người thứ hai đọc được giá trị đã cập nhật và bị từ chối, chứ không cùng đọc
"còn 1 phòng" rồi cùng ghi.

## 4. Vòng đời một chỗ giữ

```
quote tạo ra  ──▶ held (expires_at = now + HOLD_TTL_MINUTES)
                    │
       khách trả ───┼──▶ reserved  ──▶ (nhận phòng) ──▶ consumed
                    │
     hết hạn / huỷ ─┴──▶ released  (trả lại held_count)
```

- Giữ chỗ hết hạn được worker quét theo `(status, expires_at)` — đã có index.
- Việc nhả chỗ là **idempotent**: `released_at` chỉ đặt một lần, nên chạy lại job không
  trừ hai lần.
- `booking_quotes.expires_at` và chỗ giữ dùng chung mốc thời gian; báo giá hết hạn thì
  chỗ giữ cũng đã được nhả.

## 5. Mã giảm giá

`coupons` có `reserved_uses` và `committed_uses` tách riêng, cùng ràng buộc
`reserved_uses + committed_uses <= usage_limit`. Đặt chỗ giữ một lượt dùng, thanh toán
chuyển nó sang `committed`, huỷ thì nhả. `coupon_redemptions` có khoá duy nhất
`(coupon_id, booking_id)` nên một đơn không thể dùng cùng mã hai lần do bấm nút hai lần.

## 6. Bấm hai lần và gửi lại request

`idempotency_keys` khoá duy nhất theo `(principal_scope, operation, key)` và lưu ảnh
chụp phản hồi. Client gửi lại cùng một khoá sẽ nhận đúng phản hồi cũ thay vì tạo đơn
thứ hai. `payments` có khoá duy nhất `(provider, external_reference)` để cùng một giao
dịch từ cổng thanh toán không ghi nhận hai lần.

## 7. Khoá lạc quan cho màn admin

Mọi bảng admin sửa được đều có `version`. Client gửi `expectedVersion`; lệch thì API
trả `409` kèm `currentVersion` và không ghi gì. Đã có kiểm thử thật cho `settings` và
`content` trong `scripts/smoke.mjs`; các module sau dùng lại đúng cơ chế đó.

## 8. Kiểm chứng hiện hành

Test operations tạo hai request cạnh tranh cho lượng tồn cuối cùng; đúng một request
giữ được phòng, request còn lại nhận lỗi miền `409`, và ràng buộc PostgreSQL giữ
`held + reserved + blocked` trong giới hạn `capacity`. Test cũng bao phủ idempotency,
quyền sở hữu guest quote và job nhả chỗ hết hạn. Không có kiểm thử tải N-node hoặc
benchmark throughput trong lần này.

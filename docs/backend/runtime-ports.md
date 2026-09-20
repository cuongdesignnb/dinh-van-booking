# Cổng và preflight — máy dev hiện tại

Preflight chạy lúc 2026-09-20T17:00:56 trên máy phát triển
(Windows 11 + Docker Desktop, engine Linux 29.5.3, compose v5.1.4).

| Cổng | Trạng thái lúc kiểm tra | Dùng cho |
|---|---|---|
| 18473 | trống | Gateway Nginx (bind 127.0.0.1) |
| 18474 | trống | Dự phòng nếu 18473 bị chiếm |
| 18475 | trống | Dự phòng |
| 3100 | đang bị chiếm | `next start` khi chạy test giao diện ngoài Docker |

PostgreSQL (5432) và Redis (6379) **không publish ra host**; chỉ nằm trong mạng của compose
project `dvb-booking`. Trạng thái cổng trên host lúc kiểm tra: 5432 trống,
6379 trống — không ảnh hưởng vì stack không bind hai cổng này.

Lệnh chạy lại: `python scripts/preflight-ports.py`.

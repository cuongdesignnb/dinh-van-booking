# API manifest

Prefix qua gateway: /api/v1. Các route dưới đây là route được đọc từ backend source và kiểm tra bằng local HTTP smoke. Không có route nào dưới đây là bằng chứng production.

## Public unauthenticated

| Method | Path | Mục đích | Nguồn / rule |
|---|---|---|---|
| GET | /health | readiness | API + database status |
| GET | /settings/public | settings allowlist cho website | public settings, neutral defaults, no secrets |
| GET | /public/site | site settings DTO | settings public |
| GET | /public/stays | listing | active properties + published content + active room/rate relation |
| GET | /public/stays/:slug | detail | same publication gate, 404 if missing |
| GET | /public/combos | combo listing | published/active combo data |
| GET | /public/destinations | destinations | active/published destination data |
| GET | /public/reviews?contentId= | approved reviews | approved only |
| POST | /inquiries | consultation/booking request | public DTO validation; Customer + Inquiry + audit transaction |

## Authenticated admin

| Method | Path | Permission | Mục đích |
|---|---|---|---|
| GET | /auth/me | session | auth gate |
| POST | /auth/login | public auth flow | login thật; no fake user |
| POST | /auth/logout | session | logout |
| GET | /settings | settingsRead | list settings |
| GET | /settings/:key | settingsRead | one setting |
| PUT | /settings/:key | settingsWrite | expectedVersion + Serializable setting/audit transaction |
| DELETE | /settings/:key | settingsWrite | reset/delete + audit transaction |
| GET | /content?kind= | contentRead | CMS list |
| GET | /content/:id | contentRead | CMS editor detail + typed Combo/Điểm đến/Bài viết fields |
| POST | /content | contentWrite | tạo bản nháp + route + revision + typed relation details |
| PUT | /content/:id | contentWrite | sửa nội dung, relation details, media + expectedVersion |
| GET | /content/:id/revisions | contentRead | lịch sử revision |
| POST | /content/:id/revisions/:revisionId/restore | contentWrite | khôi phục revision |
| PATCH | /content/:id/status | contentPublish | publish/draft/archive với publish checklist |
| DELETE | /content/:id | contentWrite | xoá nội dung chưa xuất bản |
| POST | /media/upload | mediaWrite | upload ảnh thật, chuyển WebP và tạo MediaAsset |
| GET | /properties | catalogRead | nơi lưu trú + loại phòng + bảng giá thật |
| GET | /properties/:id | catalogRead | chi tiết nơi lưu trú thật |
| POST | /properties | catalogWrite | tạo content + property + room type + rate + units trong một transaction |
| PATCH | /properties/:id | catalogWrite | sửa metadata, SEO, slug, trạng thái vận hành và cover với version-check |
| DELETE | /properties/:id?expectedVersion= | catalogWrite | xoá draft aggregate an toàn; chặn property đã xuất bản |
| GET | /inquiries | crmRead | CRM inbox |
| PATCH | /inquiries/:id | crmWrite | stage update + history/audit |

Property edit/delete, rate-rule/inventory/booking/payment và các trường liên kết Combo nâng cao còn lại chưa đầy đủ cho toàn bộ UI hiện có; chúng được ghi là blocker, không được thay bằng stub hoặc fixture.

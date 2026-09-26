# Findings before fix

Các phát hiện dưới đây được đối chiếu từ local HEAD 54c246b... và source working tree trước khi sửa. Đây là root cause ở cấp code, không phải kết luận về production runtime.

| ID | Bằng chứng | Root cause | Xử lý |
|---|---|---|---|
| F01 | src/components/admin/AdminStore.tsx | AdminStore khởi tạo buildAdminData, commit clone state rồi ghi localStorage key dvb:admin:v1; không gọi API | Thay data repository runtime bằng empty compatibility store; các module đã hoàn thiện gọi API trực tiếp |
| F02 | src/config/site.ts; src/components/home/SiteFooter.tsx | previewLabels/siteConfig chứa nguồn thương mại static cho phone, email, địa chỉ, brand và mode demo | SiteDataProvider đọc settings public; field thiếu render trung tính |
| F03 | src/components/home/FeaturedStays.tsx; src/app/phong-nghi/[slug]/page.tsx | Public listing/detail/metadata lấy stays fixture và resolve slug trong file | Thêm PublicCatalogService/DTO, public loaders và publication gate |
| F04 | src/lib/services/consultation.ts | demoAdapter trả status preview thay vì tạo record | POST /inquiries tạo Customer + Inquiry + audit trong transaction |
| F05 | src/app/admin/cai-dat/page.tsx | Settings route chỉ hiển thị PendingModule | SettingsScreen đọc/PUT/reset API với expectedVersion |
| F06 | backend/src/settings/settings.service.ts | Map cache theo process; merge null về default; setting và audit có thể tách transaction | Bỏ process cache, preserve null, Serializable update/reset và audit cùng transaction |
| F07 | backend/src/app.module.ts; backend/src/content/content.controller.ts | Có auth/content CRUD nhưng thiếu public catalog reader và CRM inquiry reader | Thêm PublicModule và InquiryModule; không gỡ auth controller quản trị |
| F08 | src/components/booking/Checkout.tsx | Checkout có scenario baseline, add-on/coupon fixture và success preview | Bỏ preview path; submit inquiry API; add-on/coupon runtime để empty cho đến khi có model/API |
| F09 | admin catalog/CRM screens | Một số màn admin vẫn dựng từ AdminStore/fixture, không có write API tương ứng | Hoàn thiện Settings, CMS content, catalog list publish và InquiryInbox; các màn nghiệp vụ còn lại ghi blocker |

## Không được suy diễn

Không có quyền production trong phiên này nên không xác minh được SHA image đang phục vụ người dùng, DB production, CDN hoặc cookie/CSRF qua domain thật. Health 200 chỉ là readiness smoke test, không phải bằng chứng round-trip nghiệp vụ.

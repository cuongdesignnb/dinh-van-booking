# Allowed static values

Các ngoại lệ dưới đây là technical/UI data, không phải nguồn nghiệp vụ thật.

| Phạm vi/file | Loại | Lý do được phép | Không được chứa |
|---|---|---|---|
| src/lib/catalog/constants.ts | enum/category/taxonomy | filter labels và taxonomy kỹ thuật | property, giá, rating, review, contact |
| src/lib/catalog/pricing.ts | pure mapping/helper | format/derive dữ liệu API đã nhận | giá fallback hoặc currency amount thương mại |
| src/data/*.ts type exports | type-only compatibility | giữ type cho component trong khi source runtime chuyển API | runtime import vào public/admin |
| src/components/** icon maps | icon/label | presentation | business record |
| src/styles/** | CSS token/layout | UI design system | số liệu KPI/catalog |
| src/lib/booking/pricing.ts | empty arrays hiện tại | chưa có model/API add-on/coupon; tránh hiển thị giả | DVAN10, price, payment total |
| src/config/site.ts | empty compatibility shape | giữ contract build; runtime lấy public API | brand/contact/SEO commercial default |
| browser localStorage favorites | ID preference | guest UI preference | PII, token, session, business state |
| draft/editor state | unsent UI draft | trạng thái tạm, có nhãn draft | coi là saved/published |

Fixture files còn trong src/data để phục vụ type/legacy tests và cần được tiếp tục loại khỏi production dependency graph. Không whitelist toàn bộ src/data/**.

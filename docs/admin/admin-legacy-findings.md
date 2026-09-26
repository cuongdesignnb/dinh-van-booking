# Admin legacy findings — 2026-09-27

## Kết luận ngắn

Các URL admin hiện không còn render những màn demo cũ. Route mapping ở `src/app/admin/**/page.tsx`
chỉ dùng CMS/property/inquiry/media/menu/settings API mới hoặc `PendingModule` trung thực. Tuy vậy,
repo vẫn giữ một lượng source demo cũ chưa được xoá; không được nối lại các component đó như một thay
thế nhanh cho API thật.

## Đã xác nhận

1. `src/app/admin/page.tsx`, `dat-phong`, `khach-hang`, `khuyen-mai`, `thanh-toan`, `bao-cao` dùng
   `PendingModule`; không hiển thị fixture/KPI hoặc báo lưu giả.
2. Các route hoạt động import `PropertyCatalogScreen`, `AdminContentList`, `InquiryInbox`,
   `MenuManager`, `MediaLibrary` hoặc `SettingsScreen`; router không import các màn fixture cũ.
3. `AdminStore` còn làm compatibility/toast shell, nhưng dữ liệu khởi tạo là rỗng, không ghi business
   state vào localStorage và `commit()` luôn trả lỗi “chưa có endpoint API”. Auth gate và server API
   mới là nơi xác thực/kiểm quyền.
4. `src/lib/favorites.ts` lưu ID yêu thích phía khách; đây là preference UI, không phải hồ sơ/booking
   hoặc dữ liệu CRM.
5. `npm run audit:no-hardcode` tạo 43 finding: 21 type-only import đã bị erase khi build, 6 finding
   guest preference được cho phép, 16 finding thuộc nhóm review legacy admin. 16 là số finding, không
   phải 16 route đang hoạt động. Báo cáo máy đọc được: `docs/data-audit/no-hardcode-report.json`.

## Source legacy chưa dọn

Các file dưới đây còn code fixture hoặc gọi compatibility store nhưng không được các page hiện hành
import trực tiếp:

- Booking/overview: `src/components/admin/bookings/**`, `src/components/admin/overview/OverviewScreen.tsx`.
- Catalogue cũ: `src/components/admin/combos/CombosScreen.tsx`,
  `src/components/admin/properties/PropertiesScreen.tsx`, `RatePanels.tsx`,
  `src/components/admin/content/DestinationEditor.tsx`, `ContentScreen.tsx`.
- CRM cũ: `src/components/admin/crm/CrmScreen.tsx`, `CustomerPanel.tsx`.
- Bộ dữ liệu và tính toán cũ: `src/lib/admin/data.ts`, `selectors.ts`, `formatters.ts`,
  `src/data/admin/**`.

Các test admin/public trước đây cũng kiểm tra nội dung mẫu và thông báo demo. Trong nhánh audit này,
chúng đã được thay bằng test API-backed và test public/SEO. Trước khi xoá source legacy, cần kiểm tra
toàn bộ import graph, screenshot/spec còn dùng hay không, rồi xoá theo phạm vi riêng; hiện tại giữ lại
để tránh xoá nhầm tài sản người dùng.

## Rủi ro vận hành còn lại

- Booking, khách hàng, khuyến mãi, thanh toán và báo cáo vẫn chưa có quản trị workflow/API đầy đủ.
- Nơi lưu trú có thể tạo/sửa hồ sơ, nhưng màn hiện không quản lý đầy đủ hạng phòng, đơn vị, inventory
  và lịch giá đã có. Không quảng bá các bản ghi `pending_verification` thành hàng đang bán.
- Add-on/coupon không có dữ liệu giá thương mại hợp lệ thì không được tự bịa giá; calculator hiện từ
  chối add-on thiếu giá và không tự tính khoản đặt cọc/đã thu.
- Local CMS có 11 nơi lưu trú dạng draft, chưa có dữ liệu public được phê duyệt. Không bật index hoặc
  publish thay chủ sở hữu.
- Tệp `docs/admin/implementation-status.md` vẫn còn chi tiết thiết kế fixture cũ; đã gắn nhãn rõ là
  tài liệu lưu trữ, không phải bảng trạng thái hiện hành.

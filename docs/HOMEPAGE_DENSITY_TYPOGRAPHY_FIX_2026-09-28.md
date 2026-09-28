# DVB homepage density, detail layout và album bàn giao (local)

Ngày: 2026-09-28

Baseline `main`: `2147aa1b13fe1f4cef6a40262190e583022a1652`

Phạm vi: source, test, Docker local. Không triển khai production, không thay đổi dữ liệu kinh doanh production.

## Nguyên nhân và cách sửa

- Một nơi lưu trú nổi bật từng bị CSS `data-count='1'` kéo thành card ngang 60/40. Đã bỏ special case: card luôn dọc, chiều rộng giới hạn và ảnh giữ tỷ lệ cố định. Main và promo vẫn đứng cạnh nhau trên desktop.
- Khối “Vì sao chọn” từng ép năm cột và `white-space: nowrap`, khiến nội dung dài từ DB chồng lên nhau. Grid tự thích ứng số lý do, chữ tự xuống dòng, khoảng cách icon/label và các mục được mở rộng. Không cắt ngắn nội dung DB.
- Trang chi tiết nơi lưu trú từng có các phần thông tin, đặt phòng và tư vấn lệch/chồng nhau với copy dài. Bố cục lưới rõ vùng, các khối tăng chiều cao theo nội dung và responsive; bỏ nút Menu nổi ở góc phải desktop.
- Cài đặt “Dải cam kết” từng đặt toggle và danh sách repeater trên hai nửa của cùng một hàng grid, gây khoảng trắng khổng lồ. Repeater và section nay chiếm toàn chiều rộng, toggle nằm trên.
- “Hoạt động gần đây” từng trả action key và UUID. API nay trả nhãn tiếng Việt, tên đối tượng/cài đặt và người thao tác khi có; ẩn bản ghi bootstrap kỹ thuật khỏi danh sách gần đây.

## Hạng phòng, album và giá liên hệ

- Admin **Phòng nghỉ** có nút **Hạng phòng (số lượng)** ngay trên mỗi cơ sở. Trang sửa nơi lưu trú có danh sách hạng phòng và nút **Thêm hạng phòng**, mở form riêng. Mỗi hạng phòng có tên, sức chứa, trạng thái, giá và album chọn qua Media Library. Quỹ phòng theo ngày vẫn là mục quản lý tồn riêng; ảnh gắn với hạng phòng để hiển thị cho khách.
- Cơ sở lưu trú và điểm đến có album nhiều ảnh, có thể chọn lại media sẵn có, thay thứ tự hoặc bỏ ảnh khỏi album. Public API trả album và trang chi tiết có gallery xem ảnh. Media đang gắn nội dung không thể bị xoá khỏi thư viện.
- Giá hạng phòng bằng `0` là **Liên hệ để nhận giá**, không phải đặt miễn phí: trang danh sách, card, trang chi tiết và CTA dẫn đến `/lien-he`; API báo giá từ chối đặt trực tuyến với bảng giá 0. Bản nháp vẫn không xuất hiện ngoài public.
- Không có migration schema hay thay đổi `.env` cho đợt này; album dùng các vai trò `ContentMedia` hiện có.

## Kiểm chứng

Ảnh chụp: [390](../artifacts/home-real-density-390.png), [768](../artifacts/home-real-density-768.png), [1024](../artifacts/home-real-density-1024.png), [1440](../artifacts/home-real-density-1440.png), [1920](../artifacts/home-real-density-1920.png), [chi tiết desktop](../artifacts/stay-detail-density-1440.png), [chi tiết mobile](../artifacts/stay-detail-density-390.png), [cài đặt Dải cam kết](../artifacts/admin-trust-layout-1440.png).

| Tiêu chí | Kết quả |
|---|---|
| SINGLE_STAY_VERTICAL_CARD / STAY_IMAGE_ASPECT_RATIO_SAFE | PASS |
| FEATURED_PROMO_COMPOSITION | PASS |
| WHY_DYNAMIC_COLUMNS / WHY_TEXT_WRAP / WHY_TEXT_NO_OVERLAP | PASS |
| CONTACT_TEXT_NO_OVERLAP / NO_HORIZONTAL_SCROLL | PASS |
| RESPONSIVE_390 / 768 / 1024 / 1440 / 1920 | PASS |
| MANAGED_MEDIA_REGRESSION / HOMEPAGE_STRUCTURE_REGRESSION / SLUG_LIFECYCLE_REGRESSION | PASS |
| Hạng phòng và album từ Admin sang public / giá 0 liên hệ | PASS |
| Settings trust layout 390 / 1440 | PASS |

Kiểm thử tự tạo dữ liệu QA độc lập và dọn sau test. Sau khi khắc phục quyền Docker của môi trường chạy, PostgreSQL local còn 11 nơi lưu trú gốc, 0 yêu cầu tư vấn QA, 0 property/content/media QA theo marker. Không có dữ liệu sản xuất nào được thay đổi.

Các lệnh xác nhận: `npm run lint`, `npm run typecheck`, `npm run build`, `npm --prefix backend run build`, `npm --prefix backend test` (39/39), Git Bash `scripts/smoke.sh` (69/69), `npx playwright test --workers=1` (49 đạt, 3 skipped theo cấu hình), `npm run audit:no-hardcode`, `npm run audit:admin-runtime`, `npm run audit:public-content`.

`audit:no-hardcode` vẫn liệt kê 42 phát hiện trong các module legacy/compatibility ngoài đường chạy hiện tại; script hoàn tất mã 0. Audit graph của Admin ghi nhận 0 fixture fallback/module demo reachable, audit public-content ghi nhận 0 cho toàn bộ metric hardcode yêu cầu. Các module legacy đó không được sửa trong đợt giao diện này.

`NEW_MIGRATIONS=0`

`ENV_CHANGES=0`

`PRODUCTION_DEPLOYMENT=NO`

`SAFE_TO_DEPLOY=YES` sau khi CI và quy trình release độc lập của dự án xác nhận trên commit cuối.

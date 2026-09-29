# Báo cáo tiến độ cho BA — Đinh Vân Booking

**Ngày chốt thông tin:** 29/09/2026

**Môi trường kiểm tra:** Docker local tại `http://127.0.0.1:18473`
**Kết luận:** Đã có các luồng Admin → API/PostgreSQL → giao diện khách hoạt động trên local, nhưng **chưa đủ điều kiện nghiệm thu toàn hệ thống hoặc triển khai production**.

## 1. Đã thực hiện

### Nơi lưu trú, hạng phòng và bán phòng

- Tách **nơi lưu trú** (hồ sơ khách sạn/homestay/khu nghỉ) khỏi **hạng phòng**. Một nơi lưu trú có thể có nhiều hạng; mỗi hạng có tên/mã, kiểu chỗ ở, sức chứa, số phòng/căn, giá, tiện nghi và album riêng. Admin có danh sách hạng theo từng cơ sở, lối sửa từng hạng và nút tạo hạng khác cho đúng cơ sở đó.
- Bỏ việc tự sinh “phòng tiêu chuẩn”, số phòng hoặc giá mẫu khi tạo nơi lưu trú. Hạng chưa xác minh có thể lưu tạm ẩn nhưng không được bật bán khi thiếu điều kiện cần thiết.
- 11 cơ sở Cúc Phương hiện là bản nháp/chờ xác minh; riêng Cúc Phương Mineral Retreat có 5 hạng được ghi nhận nhưng chưa xác minh sức chứa, giá và tồn. Không tự xuất bản hoặc tự tạo thông tin thương mại.
- Trên client, hạng giá `0`/chưa có giá chuyển sang **Liên hệ**, không tạo đơn đặt miễn phí; hạng có giá dương đã công bố vẫn đi qua luồng báo giá/giữ phòng. CTA liên hệ có thể chuyển đúng ngữ cảnh cơ sở và hạng phòng sang form tư vấn.

### Nội dung, media và giao diện khách

- Các trang public đọc nội dung đã xuất bản từ API/DB; bản nháp không lộ ra ngoài và khi API lỗi không dùng dữ liệu demo để che lỗi. Trang chủ, menu, danh mục, bài viết và chuyên trang có dữ liệu/cấu hình từ hệ thống quản trị.
- Media Library hỗ trợ chọn lại ảnh, ALT và ảnh WebP; ảnh đang được sử dụng bị chặn xoá. Trình soạn thảo nội dung phong phú được dùng cho bài viết/chuyên trang và nội dung liên quan.
- Chỉnh trạng thái rỗng của nơi lưu trú, combo và điểm đến: không còn bộ lọc, phân trang hay nút mở danh sách vô nghĩa khi catalogue thật sự chưa có mục công khai. Phần copy hiển thị cho khách được tách khỏi ngôn ngữ kỹ thuật của Admin.
- Album điểm đến và nơi lưu trú hiển thị nhiều ảnh; dialog hỗ trợ bàn phím, trả focus về nút mở khi đóng và có placeholder rõ ràng nếu ảnh lỗi. Đã chỉnh một số bố cục responsive, vùng tư vấn và thanh đặt phòng mobile để tránh chồng lấn/tràn ngang.
- Chế độ chặn lập chỉ mục tìm kiếm vẫn **bật**; không suy ra quyền mở SEO hoặc công khai dữ liệu nháp.

### Vận hành và độ ổn định

- Đã kiểm các luồng Admin CRUD/xuất bản nội dung, chỉnh cài đặt, Media Library, yêu cầu tư vấn, báo giá, giữ phòng, tồn phòng và một số báo cáo bằng dữ liệu QA có dọn lại.
- Form liên hệ và thao tác giữ phòng có kiểm tra idempotency cho một số trường hợp mất request/phản hồi rồi gửi lại trong cùng phiên. Những trường hợp mất session hoặc thay đổi ngữ cảnh chưa được chứng minh đầy đủ.
- Có ma trận theo dõi 14 trang public và 17 trang Admin, chỉ rõ luồng nào đã kiểm bằng trình duyệt/API và luồng nào mới được đối chiếu mã nguồn.

## 2. Bằng chứng kiểm thử hiện có

| Kiểm tra | Kết quả và giới hạn |
|---|---|
| Playwright toàn bộ trước thay đổi gallery cuối | **108 đạt, 4 bài opt-in chưa chạy**. Không tính 4 bài bị bỏ qua là đạt. |
| Sau thay đổi gallery cuối | **2 bài E2E liên quan đạt**: điểm đến/combo và album nơi lưu trú; đã kiểm ảnh lỗi, bàn phím, focus ở 390px và 1440px. **Chưa chạy lại full suite** sau thay đổi này. |
| Backend và API | Backend **61/61** unit tests và API smoke **69/69** ở lượt kiểm trước thay đổi gallery chỉ thuộc frontend. |
| Chất lượng build | Lint, typecheck và Docker web build đạt sau thay đổi gallery. |
| Dữ liệu local sau test | **11 nơi lưu trú, 5 hạng phòng, 0 đơn vị phòng, 0 yêu cầu tư vấn, 0 nơi lưu trú công khai**; không còn fixture QA mới từ các bài vừa chạy. |

Ảnh/đoạn nội dung QA chỉ chứng minh luồng và hình học, **không phải ảnh hoặc thông tin kinh doanh đã được chủ cơ sở phê duyệt**.

## 3. Chưa hoàn tất / BA cần xác nhận

1. **Dữ liệu kinh doanh:** chủ dự án cần xác minh từng cơ sở, quyền dùng ảnh và ALT, tên/hạng phòng, sức chứa, giá, tồn, chính sách và thông tin liên hệ. 10 cơ sở hiện chưa có hạng phòng đã xác minh; không được tự tạo giá/tồn để lấp chỗ trống.
2. **Nghiệm thu giao diện thật:** cần kiểm lại tất cả trang chính với ảnh và copy đã duyệt, dữ liệu ngắn/dài, 0/1/n phần tử, bàn phím/focus, ảnh lỗi, mobile dialog/checkout và trạng thái API lỗi. Các bài QA hiện chưa bao phủ mọi trường hợp.
3. **Luồng lỗi và thanh toán:** tiếp tục kiểm quyền, xung đột phiên bản, mất mạng ở từng tác vụ; thanh toán trực tuyến cần quyết định nhà cung cấp/quy trình riêng. Ledger offline không đồng nghĩa đã thu tiền online.
4. **Release:** cần staging UAT, kiểm backup/restore trong môi trường đích, TLS/cookie/domain/canonical, monitoring và kế hoạch rollback. AI chưa được xác nhận với API key thật. SEO indexing chỉ mở sau phê duyệt riêng.

## 4. Trạng thái bàn giao

- Có thể cho BA kiểm tra **bản local**, đặc biệt `/admin/hang-phong` và các trang public, nhưng **không đánh dấu DONE toàn dự án**.
- Những thay đổi đang ở workspace local trên nhánh `main`, **chưa commit/push**; chưa triển khai production.
- Tiêu chí hoàn tất là dữ liệu kinh doanh được duyệt, giao diện client được nghiệm thu bằng dữ liệu thật, API/booking chạy ổn định trong các trạng thái chính, toàn bộ kiểm thử trên cùng phiên bản mã đạt và staging/release được duyệt.

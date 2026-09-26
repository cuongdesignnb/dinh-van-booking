# AI soạn nội dung và tạo ảnh

## Cấu hình

Trong **Quản trị → Cài đặt → AI nội dung & ảnh**, cấu hình riêng provider viết nội dung và provider tạo ảnh:

- Base URL phải là HTTPS công khai; API tương thích OpenAI có thể dùng Responses API hoặc Chat Completions cho nội dung.
- Điền model và dán API key. Key không được trả lại trình duyệt; CSDL chỉ giữ bản mã hoá AES-256-GCM. Nếu cần xoá key CSDL, dùng nút xoá trong form.
- Có thể đặt `AI_CONTENT_API_KEY`, `AI_IMAGE_API_KEY` và các biến `AI_CONTENT_BASE_URL`, `AI_CONTENT_MODEL`, `AI_CONTENT_WIRE`, `AI_IMAGE_BASE_URL`, `AI_IMAGE_MODEL`, `AI_IMAGE_SIZE`, `AI_IMAGE_QUALITY` làm cấu hình dự phòng phía máy chủ. Key trong CSDL được ưu tiên hơn biến môi trường.
- Mặc định khoá mã hoá được dẫn xuất từ `SESSION_SECRET`. Có thể dùng `AI_SETTINGS_ENCRYPTION_KEY` hoặc `AI_SETTINGS_ENCRYPTION_KEY_FILE` làm khoá riêng. Giữ khoá đã chọn ổn định; đổi khoá sẽ làm key đã lưu không giải mã được.

## Luồng biên tập

1. Nút **AI viết nội dung và tạo ảnh** xuất hiện trong các rich-text editor của bài viết, chuyên trang, nơi lưu trú, combo và điểm đến.
2. Người biên tập nhập brief; tạo ảnh là lựa chọn riêng, không bật mặc định. Hệ thống chỉ trả bản xem trước, không tạo ContentNode và không xuất bản.
3. Khi duyệt, nội dung HTML đã kiểm tra được đưa vào TipTap; tiêu đề, trích yếu và meta được điền vào form tương ứng. Người biên tập vẫn phải bấm lưu bản nháp và dùng luồng xuất bản riêng.
4. Ảnh tạo thành công được đưa qua pipeline Media Library hiện tại: xác thực, đổi WebP, tạo rendition, lưu ALT/chú thích. Nếu tạo ảnh lỗi, bản nội dung và ảnh thành công vẫn có thể dùng.

## Bảo vệ dữ liệu

- Prompt và phản hồi AI đi qua backend; provider key không xuất hiện trong API đọc cài đặt hoặc audit log.
- HTML chỉ cho phép một allow-list nhỏ; script, thuộc tính sự kiện, H1, URL ngoài và route nội bộ không tồn tại đều bị từ chối.
- Internal links chỉ chọn route hiện hành đã xuất bản, không demo, không lịch xuất bản tương lai; nơi lưu trú còn phải hoạt động và có hạng phòng, đơn vị phòng, rate plan hợp lệ. Mỗi route dùng tối đa một anchor dài 2–8 từ.
- Endpoint kiểm tra HTTPS, chặn đích mạng riêng, đặt timeout và giới hạn số yêu cầu theo tài khoản. Hạn mức hiện tại là 5 lần/10 phút trên mỗi tiến trình API.
- Việc sinh nội dung/ảnh có thể phát sinh phí từ provider theo tài khoản API của bạn.

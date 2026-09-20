# AGENT OPUS — LẬP TRÌNH 6 MÀN HÌNH ADMIN ĐINH VÂN BOOKING

> **Nhiệm vụ:** tiếp tục trên source hiện có, lập trình giao diện admin thật theo 6 ảnh trong thư mục `references/`. Không trả về một bản kế hoạch thay cho code; không thiết kế lại thành dashboard SaaS chung chung.
>
> **Thương hiệu:** Đinh Vân Booking — booking phòng và trải nghiệm tại Cúc Phương, Ninh Bình. Giữ tinh thần cá nhân, bản địa, thân thiện; tone xanh rừng, trắng ngà, kem và xanh sage của website phía khách hàng.
>
> **Phạm vi:** frontend admin hoàn chỉnh cho 6 nhóm màn hình và các trạng thái tương tác liên quan. Có dữ liệu demo nhất quán, sẵn lớp nối API. Không tự triển khai backend, cổng thanh toán, gửi tin nhắn thật hoặc đồng bộ OTA trong nhiệm vụ này.
>
> **Đích nghiệm thu:** đúng bố cục từng ảnh, font tiếng Việt hiển thị tốt, icon SVG sắc nét, thao tác được, responsive, có screenshot đối chiếu. Build thành công không đồng nghĩa giao diện đã đạt.

---

## 1. Đọc ảnh trong `references/` trước khi code

Chủ dự án sẽ lưu ảnh với tên `a`, `b`, `c`, `d`, `e`, `f`. Hiểu `\references` là thư mục `references` trong **root của dự án đang làm**, không tự hiểu là thư mục gốc của ổ đĩa Windows. Trong code, dùng đường dẫn phù hợp nền tảng; không hardcode đường dẫn máy chủ dự án.

### 1.1. Quy ước đặt tên đề xuất

| File tham chiếu | Màn hình | Dấu hiệu nhận diện trong ảnh | Route đề xuất |
|---|---|---|---|
| `references/a.png` | A — Tổng quan | 6 KPI, biểu đồ doanh thu, donut phòng, lịch, bảng booking và yêu cầu tư vấn | `/admin` |
| `references/b.png` | B — Quản lý đặt phòng | Bảng booking lớn, bộ lọc phía trên, cột phải có lịch và chi tiết `#DP2403` | `/admin/dat-phong` |
| `references/c.png` | C — Quản lý phòng nghỉ | 5 KPI, 4 thẻ nơi lưu trú, bảng loại phòng, quy định giá, tồn phòng 7 ngày | `/admin/phong-nghi` |
| `references/d.png` | D — Quản lý combo du lịch | Danh sách combo bên trái, chi tiết Tràng An – Bái Đính và lịch trình bên phải | `/admin/combo-du-lich` |
| `references/e.png` | E — Điểm đến & nội dung | Bảng điểm đến trái, form chỉnh sửa phải, preview SEO và thư viện ảnh | `/admin/diem-den` |
| `references/f.png` | F — Khách hàng & yêu cầu tư vấn | Bảng CRM, pipeline 4 cột, hồ sơ và lịch sử trao đổi ở phải | `/admin/khach-hang` |

**Đây là quy ước đề xuất, không được giả định người dùng đã lưu đúng thứ tự.** Nếu `b.png` thực tế là màn điểm đến, phải nhận diện theo tiêu đề/nội dung ảnh và gán đúng màn, không lập trình sai chỉ vì tên file.

Chấp nhận `.png`, `.jpg`, `.jpeg`, `.webp`, tên viết hoa/thường và ảnh có hậu tố. Đọc kích thước thật của từng file. Nếu có nhiều ứng viên cùng ký tự, nhận diện trực quan; không chọn tùy tiện hoặc xóa ảnh còn lại.

Trước khi sửa giao diện, tạo `docs/admin/reference-map.md` ghi:

```text
Màn hình | File thực tế | Kích thước | Route | Trạng thái nhận diện
A Tổng quan | references/<ten-that> | <W × H> | /admin | Đã đối chiếu
...
```

Nếu thiếu một ảnh, hoàn thiện các màn có ảnh và ghi rõ màn còn thiếu reference. Có thể dựng phần thiếu theo hệ component chung nhưng phải đánh dấu là **suy rộng thiết kế**, không nói đã đối chiếu với ảnh không có.

### 1.2. Thứ tự ưu tiên khi có khác biệt

1. Yêu cầu rõ ràng trong tài liệu và tên thương hiệu đúng **Đinh Vân Booking**.
2. Bố cục, thứ tự khối, tỷ lệ hình ảnh và trạng thái chính của ảnh tương ứng.
3. Tính nhất quán của admin shell, dữ liệu và nghiệp vụ giữa các màn.
4. Chi tiết mẫu như số liệu, ngày, điện thoại, email và câu chữ trang trí.

Ảnh mockup có thể có chữ “Đinh Văn”, giá khác nhau, sidebar hơi lệch độ rộng hoặc số liệu không khớp. **Không sao chép lỗi này vào hệ thống.** Giữ phong cách hình ảnh, sửa lỗi tên/logic và ghi vào `docs/admin/reference-deviations.md`.

Không dùng screenshot làm background toàn trang, không đặt hotspot lên ảnh, không rasterize bảng/form. Text, input, icon, chart, bảng và button phải được render bằng component thật. Không dùng `zoom`, `scale()` toàn trang hoặc font siêu nhỏ để ép khớp artboard.

---

## 2. Audit source và lựa chọn triển khai

Đọc `AGENTS.md`, `README`, `package.json`, lockfile, routes, UI components, font và asset hiện có. Kiểm tra thay đổi chưa commit trước khi làm; không ghi đè công việc của người khác.

- Nếu dự án đã dùng Next.js/React, tiếp tục đúng framework và package manager đó. Không tạo thêm ứng dụng admin riêng bên ngoài source.
- Nếu đã có admin layout hoặc design system, refactor có kiểm soát để đạt mẫu; không nhân bản shell cho từng trang.
- Nếu chưa có nền frontend, dùng **Next.js App Router + TypeScript**, CSS Modules hoặc Tailwind kết hợp CSS riêng. Không đổi major version chỉ để làm giao diện.
- Ưu tiên thư viện đã có. Bảng, calendar, form, chart, dialog, editor phải dùng API phù hợp phiên bản thực tế trong lockfile; không copy API cũ rồi tắt TypeScript để build.
- Dùng `lucide-react` cho icon chức năng. Chart ưu tiên thư viện hiện có, hoặc SVG/React; không thêm nhiều thư viện cùng chức năng.
- Không biến root layout thành Client Component chỉ vì một vài widget cần state. Tách các phần tương tác ở ranh giới phù hợp.
- Không sửa public homepage, URL công khai hay dữ liệu production để phục vụ demo admin. CSS admin phải được scope, ví dụ `.dvb-admin` và token prefix `--dvb-admin-*`.
- Không tự push, merge, deploy hoặc sử dụng credential production. Nếu đã có auth thật, giữ nguyên và tích hợp layout sau auth; không tạo đường vòng bỏ qua đăng nhập.

### 2.1. Hai chế độ dữ liệu

**Demo/local:** CRUD tác động lên store demo; có trạng thái loading, lỗi, lưu thành công trong demo và reset. Giao diện ghi ngắn “Dữ liệu mẫu” tại vị trí ít ảnh hưởng layout; không giấu nhãn chỉ khi chụp screenshot.

**API:** dùng adapter thật chỉ khi repo đã có contract phù hợp và được phép. Không trộn demo với dữ liệu thật trên cùng màn mà không phân biệt. Không gửi mutation tới backend đang chạy chỉ để thử UI.

Thông báo demo phải đúng bản chất: **“Đã lưu trong bản demo”**, **“Đã cập nhật booking mẫu”**. Không thông báo đã thu tiền, gửi Zalo, đồng bộ Booking.com hoặc xuất bản website thật nếu chưa có tích hợp.

---

## 3. Admin shell dùng chung

### 3.1. Cấu trúc tổng thể

```text
┌──────────────────┬─────────────────────────────────────────────────────┐
│ LOGO + THƯƠNG HIỆU│ PAGE TITLE / SUBTITLE       SEARCH / BELL / PROFILE  │
│                  │                              DATE RANGE              │
│ SIDEBAR MENU     ├─────────────────────────────────────────────────────┤
│                  │ KPI / FILTER / TABLE / DETAIL / CHART THEO TỪNG MÀN   │
│                  │                                                     │
│ ẢNH NÚI RỪNG     │                                                     │
│ LỜI NHẮN NHỎ     ├─────────────────────────────────────────────────────┤
│                  │ FOOTER NHẸ / BRAND / LỜI NHẮN                        │
└──────────────────┴─────────────────────────────────────────────────────┘
```

Ảnh gốc trong hội thoại có kích thước 1448 × 1086 px. Khi nhận file người dùng, kiểm tra kích thước thật; lấy bản gốc không bị resize làm đối chiếu chính nếu có.

Thông số khởi tạo, cần tinh chỉnh bằng ảnh:

| Thành phần | Quy tắc |
|---|---|
| Sidebar desktop | Khoảng 200 px; dùng một token dùng chung |
| Sidebar thu gọn | Khoảng 72 px; tooltip tên menu và nút mở rộng |
| Khoảng cách content | 14–20 px; khoảng cách card 10–16 px |
| Header nội dung | Khoảng 105–120 px khi có subtitle và date range |
| Card | Nền trắng, bo 8–12 px, border nhẹ, shadow mềm |
| Control | Cao 34–40 px desktop; tăng vùng bấm ở tablet/mobile |
| Hàng bảng compact | Khoảng 32–40 px, vẫn đọc được đầy đủ |
| Footer | Gọn, nằm theo flow; không fixed che bảng/form |

Một số ảnh có sidebar hẹp hơn ảnh Tổng quan. Dùng ảnh A để chốt shell thống nhất, rồi điều chỉnh grid bên trong từng màn; không để logo/menu nhảy vị trí khi chuyển route. Sai khác shell có chủ ý so với từng mockup phải ghi rõ, không che bằng CSS chỉ riêng trong test.

Sidebar có scroll riêng cho menu nếu chiều cao không đủ. Ảnh trang trí không được đè lên “Báo cáo”, “Cài đặt” hoặc làm menu cuối không truy cập được. Main dùng cuộn trang tự nhiên; chỉ tạo scroll cục bộ cho bảng/pipeline khi thật sự cần.

### 3.2. Sidebar

Giữ đúng thứ tự và phong cách icon trong mẫu:

| Menu | Đích / hành vi |
|---|---|
| Tổng quan | `/admin` — active chỉ khi đúng route gốc |
| Đặt phòng | `/admin/dat-phong` |
| Phòng nghỉ | `/admin/phong-nghi` |
| Combo du lịch | `/admin/combo-du-lich` |
| Điểm đến | `/admin/diem-den` |
| Khách hàng | `/admin/khach-hang` |
| Yêu cầu tư vấn | `/admin/yeu-cau-tu-van`, dùng module F với tab tư vấn active |
| Nội dung website | `/admin/noi-dung`, dùng module E với tab Bài viết active |
| Khuyến mãi | Route đang có; nếu chưa có, thông báo module ngoài phạm vi đợt này |
| Thanh toán | Route đang có; nếu chưa có, thông báo module ngoài phạm vi đợt này |
| Báo cáo | Route đang có; nếu chưa có, thông báo module ngoài phạm vi đợt này |
| Cài đặt | Route đang có; nếu chưa có, thông báo module ngoài phạm vi đợt này |

Bốn mục cuối vẫn có mặt để giống ảnh, nhưng **không tự tính là đã triển khai đầy đủ**. Không dẫn 404, không dùng `href="#"` vô nghĩa, không dựng bốn module lớn ngoài yêu cầu. Các tác vụ liên quan trong 6 màn vẫn có dialog/editor cục bộ theo tài liệu.

Active item: nền xanh đậm, chữ/icon trắng, viền hoặc halo sage nhạt. Inactive: nền trong suốt, chữ tối. Badge tư vấn đỏ lấy từ số yêu cầu chưa xử lý, không hardcode “3” sau khi dữ liệu thay đổi. Các route con chỉ active đúng một menu chính.

Logo núi dùng SVG riêng hoặc asset thương hiệu hiện có. Wordmark là text serif **Đinh Vân Booking**; tagline nhỏ **“Ở ĐÂY CÓ NHỮNG CHUYẾN ĐI Ý NGHĨA”**. Không crop logo kèm text mờ từ ảnh.

### 3.3. Topbar và footer

Topbar có title/subtitle trái; ô tìm kiếm toàn hệ thống, gợi ý `Ctrl + K`/`⌘ K`, chuông, avatar và tên **Đinh Vân / Quản trị viên** ở phải. Date range nằm ở hàng dưới theo mẫu.

Command palette tìm trong dữ liệu demo các booking, nơi lưu trú, combo, khách hàng; chọn kết quả phải đi đúng route và mở đúng record. Không chỉ hiện một ô search không có kết quả. Dùng phím Escape đóng và trả focus.

Chuông mở popover thông báo; “Đánh dấu đã đọc” cập nhật badge. Avatar mở menu hồ sơ hoặc action có sẵn. Chưa có auth thì không tự tạo đăng xuất giả ảnh hưởng ứng dụng; ghi rõ chế độ demo.

Date range dùng một state chia sẻ cho các chỉ số có cùng scope. Mỗi widget có scope riêng phải ghi rõ, ví dụ “Hôm nay”, “Tháng đang chọn”, “Toàn thời gian”. Không đổi date picker mà số liệu giữ nguyên vô cớ.

Footer dùng nền kem, silhouette núi/rừng mờ và lời nhắn nhỏ **“Cùng nhau lan tỏa những chuyến đi ý nghĩa”**. Không kéo footer thành một section landing page lớn. Năm demo có thể theo fixture để so ảnh; năm thật lấy từ config, không mặc định 2024 là hiện tại.

---

## 4. Design tokens, font và icon

### 4.1. Tone màu và bề mặt

Các giá trị sau là điểm khởi tạo theo quan sát, không phải số đo màu tuyệt đối:

```css
.dvb-admin {
  --dvb-admin-bg: #f6f7f0;
  --dvb-admin-surface: #ffffff;
  --dvb-admin-cream: #f7f4e9;
  --dvb-admin-green-950: #123b29;
  --dvb-admin-green-900: #164b30;
  --dvb-admin-green-800: #1e623b;
  --dvb-admin-green-700: #287747;
  --dvb-admin-sage: #a6bc9c;
  --dvb-admin-mint: #e7f4e9;
  --dvb-admin-text: #1b2b25;
  --dvb-admin-muted: #697487;
  --dvb-admin-border: #e8ece6;
  --dvb-admin-warning: #9a5800;
  --dvb-admin-warning-bg: #fff3d6;
  --dvb-admin-danger: #be3442;
  --dvb-admin-danger-bg: #fff0f1;
  --dvb-admin-info: #226bb4;
  --dvb-admin-info-bg: #edf5ff;
  --dvb-admin-radius: 10px;
  --dvb-admin-shadow: 0 3px 16px rgb(19 53 31 / 5%);
  --dvb-admin-sidebar-width: 200px;
}
```

CTA xanh đậm, gradient rất nhẹ nếu cần; không neon, không glassmorphism đậm, không nền đen. Vàng/đỏ/xanh dương chỉ dùng cho ý nghĩa trạng thái hoặc nhãn phụ. Lá góc trang và ảnh núi mờ là lớp trang trí, không che focus, không chặn pointer, không hạ tương phản nội dung.

### 4.2. Bộ font ưu tiên

| Vai trò | Font | Thiết lập khởi tạo |
|---|---|---|
| Logo, H1, tiêu đề card quan trọng | **Playfair Display** | 600–700; H1 28–32 px; H2 18–21 px |
| Menu, bảng, form, button, tooltip | **Roboto Condensed** | 400–700; body 13–14 px; metadata 12 px |
| Lời nhắn viết tay | **Dancing Script** | 500–600; 22–28 px; không dùng trong bảng/form |
| Con số KPI | Serif như mẫu; số tiền trong bảng dùng UI font | 26–32 px KPI; `tabular-nums` cho cột số |

Đây là lựa chọn gần phong cách ảnh, **không khẳng định nhận diện được font gốc từ hình raster**. Metadata chính thức của cả ba family có subset `vietnamese`.[T2][T3][T4] Nếu homepage đã triển khai đúng bộ font này, tái sử dụng, không tải thêm một bộ trùng.

Với Next.js, dùng `next/font/google` hoặc `next/font/local` phù hợp repo. `next/font/google` self-host font trong ứng dụng, không bắt trình duyệt khách tải font trực tiếp từ Google.[T1] Môi trường build không tải được nguồn font thì dùng asset local hợp lệ; không lặng lẽ thay bằng font hệ thống.

Ví dụ cấu hình khi dự án chưa có:

```ts
import {
  Playfair_Display,
  Roboto_Condensed,
  Dancing_Script,
} from 'next/font/google';

export const headingFont = Playfair_Display({
  subsets: ['latin', 'latin-ext', 'vietnamese'],
  weight: ['600', '700'],
  display: 'swap',
  variable: '--font-dvb-heading',
});

export const uiFont = Roboto_Condensed({
  subsets: ['latin', 'latin-ext', 'vietnamese'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-dvb-ui',
});

export const handwritingFont = Dancing_Script({
  subsets: ['latin', 'latin-ext', 'vietnamese'],
  weight: ['500', '600'],
  display: 'swap',
  variable: '--font-dvb-handwriting',
});
```

Gắn các CSS variable vào wrapper/layout phù hợp; đặt `lang="vi"`. Không thêm `<html>` lồng bên trong root layout đã có.

```css
.dvb-admin { font-family: var(--font-dvb-ui), Arial, sans-serif; }
.dvb-admin h1,
.dvb-admin .panel-heading,
.dvb-admin .brand-wordmark {
  font-family: var(--font-dvb-heading), Georgia, serif;
}
.dvb-admin .handwritten {
  font-family: var(--font-dvb-handwriting), cursive;
  line-height: 1.3;
  padding-block: 0.1em;
  overflow: visible;
}
.dvb-admin .numeric { font-variant-numeric: tabular-nums; }
```

Không dùng chữ viết tay cho giá, tên khách hoặc nhãn trạng thái. Không làm title quá đậm/to khiến dashboard giống poster. Không dùng italic giả nếu font/style tương ứng chưa được tải; kiểm tra các lời trích dẫn dùng italic.

### 4.3. Kiểm tra tiếng Việt bắt buộc

Source, JSON, CSV và Markdown dùng UTF-8. Giữ nguyên dấu, chuẩn hóa NFC khi nhập dữ liệu; không bỏ dấu để “sửa font”. Thử chuỗi này ở cả ba family:

```text
Đinh Vân Booking — Cúc Phương, Ninh Bình
Quản lý đặt phòng, yêu cầu tư vấn, tỷ lệ lấp đầy
Nguyễn Thị Mai · Trần Quốc Hùng · Lê Thu Hà
Ă Â Đ Ê Ô Ơ Ư ă â đ ê ô ơ ư
Ắ Ằ Ẳ Ẵ Ặ Ấ Ầ Ẩ Ẫ Ậ Ế Ề Ể Ễ Ệ
Ố Ồ Ổ Ỗ Ộ Ớ Ờ Ở Ỡ Ợ Ứ Ừ Ử Ữ Ự
128.450.000đ — 4,8% — 15/11/2024
```

Chờ `document.fonts.ready`, kiểm tra request font, computed style và **Rendered Fonts**. Không coi `document.fonts.check(...) === true` là bằng chứng font có đầy đủ glyph; API này không kiểm tra individual glyph coverage và có thể trả true với tên font không tồn tại.[T7]

Không có ô vuông, dấu bị cắt, ký tự `U+FFFD` hoặc mojibake. Quét `Ä‘`, `Æ°`, `áº`, `á»` như tín hiệu cần xem lại, không tự xóa mọi ký tự “Â/Ã” vì chúng có thể hợp lệ.

### 4.4. Icon SVG

Lucide React cung cấp component render inline SVG, có thể chỉnh size, màu và stroke.[T5] Import trực tiếp các export **đã kiểm tra tồn tại trong phiên bản cài đặt**. Không import toàn bộ icon rồi tìm bằng string tùy ý để che lỗi tên.

| Nhóm | Gợi ý icon chức năng |
|---|---|
| Sidebar | House, CalendarDays, BedDouble, Map, MapPin, Users, MessageCircle, FileText, Tag, CreditCard, ChartColumn, Settings |
| Thao tác | Search, Plus, Pencil, Eye, MoreHorizontal, Download, Printer, Check, X, Trash2 |
| Tình trạng | CircleCheck, Clock, ShieldCheck, Wrench, CircleAlert |
| Tiện ích | Wifi, Coffee, Bath, Mountain, Bike, AirVent |
| Điều hướng | ChevronDown, ChevronLeft, ChevronRight, Menu, Bell |

Tên trên là gợi ý, không thay thế kiểm tra export thực tế. Icon nhỏ 14–16 px, sidebar 20–22 px, KPI 24–28 px, stroke khoảng 1.8–2 px; `currentColor`, `flex-shrink: 0`. Icon trang trí `aria-hidden`; nút chỉ có icon phải có accessible name và vùng bấm rõ.

Không dùng emoji, Wingdings, Font Awesome font, ký tự Unicode thay icon hay CDN icon. Zalo/logo xã hội dùng SVG thương hiệu hợp lệ riêng; không giả định thư viện icon chức năng có đầy đủ brand logo. Thiếu logo Zalo thì dùng button chữ “Chat Zalo” rõ ràng, không vẽ biểu tượng sai.

---

## 5. Ảnh và trang trí

Tái sử dụng asset website công khai đã có: ảnh rừng/hiên gỗ/phòng ngủ, cover combo, ảnh điểm đến, logo núi, lá và silhouette footer. Tên file/slug asset phải thống nhất xuyên public/admin, không chọn ngẫu nhiên mỗi lần render.

- Không dùng một ảnh cho mọi phòng; thumbnail trong bảng/booking phải đúng `propertyId`.
- `object-fit: cover`, căn `object-position` từng ảnh; giữ tỉ lệ người và nội thất.
- Không crop nguyên card có chữ/button/heart từ screenshot rồi chèn lại UI lên trên. Crop vùng ảnh sạch chỉ để preview khi chất lượng cho phép; ghi nguồn và hạn chế.
- Avatar trong mockup là minh họa, không coi là ảnh thật của khách hàng/chủ thương hiệu. Ưu tiên avatar đã được cung cấp hoặc initials; không gán ảnh người thật bất kỳ cho hồ sơ.
- Lưu asset ổn định trong dự án, không hotlink ảnh không rõ quyền sử dụng. Ảnh là tài nguyên dữ liệu; không nhúng toàn bộ screenshot vào bundle app.
- Có `asset-audit.md`: tên asset, đã có/chưa có, vị trí sử dụng, bản thay thế và sai khác còn lại.

Thiếu ảnh sạch không được dùng làm lý do bỏ các màn. Hoàn thiện phần code có thể làm, dùng bản thay thế phù hợp và báo đúng sai khác; không tự nhận khớp 100%.

---

## 6. Dữ liệu dùng chung — không hardcode từng màn độc lập

### 6.1. Mô hình frontend tối thiểu

Các entity cần ID ổn định và liên kết thật trong demo:

```text
Property       Nơi lưu trú: homestay/resort/lodge; cover, location, amenities.
RoomType       Loại phòng của một Property; sức chứa, giá, tiện nghi.
RoomUnit       Phòng vật lý hoặc đơn vị inventory đã xác định rõ.
InventoryDay   RoomType/RoomUnit + ngày + số lượng + blocked/maintenance.
RateRule       Giá cơ bản/cuối tuần/mùa/override theo đêm lưu trú.
Booking        Khách, dịch vụ, ngày, số lượng, trạng thái đặt phòng, price snapshot.
BookingLine    Phòng/combo/add-on, số lượng, đơn giá, đơn vị tính, thành tiền.
PaymentRecord  Giao dịch demo/API, trạng thái riêng, số tiền, reference.
Customer       Thông tin liên hệ, tags, preferences, người phụ trách.
Inquiry        Một yêu cầu tư vấn; customerId, nguồn, giai đoạn, ownerId.
Interaction    Lịch sử trao đổi hoặc ghi chú nội bộ, channel và timestamp.
FollowUp       Hẹn chăm sóc khách, hạn, người phụ trách, trạng thái.
Combo          Lịch trình, inclusions/exclusions, giá và lịch khởi hành.
Destination    Danh mục, nội dung, ảnh, slug, metadata, trạng thái xuất bản.
Article        Bài viết có nội dung, ảnh, metadata, trạng thái.
MediaAsset     File, alt, caption, kích thước, đối tượng đang sử dụng.
```

Không bắt buộc tạo database trong nhiệm vụ UI. Dùng types và service/repository interface để thay demo adapter bằng API sau này. Không gọi `fetch` rải rác trực tiếp trong mọi component.

### 6.2. Phân biệt trạng thái

```ts
type BookingStatus =
  | 'pending_confirmation'
  | 'confirmed'
  | 'checked_in'
  | 'completed'
  | 'cancelled';

type PaymentStatus =
  | 'unpaid'
  | 'partially_paid'
  | 'paid'
  | 'partially_refunded'
  | 'refunded';

type PublishingStatus = 'draft' | 'published' | 'hidden';
type InquiryStage = 'new' | 'consulting' | 'waiting' | 'won';
```

Có thể bổ sung trạng thái cần thiết nếu contract đang có yêu cầu, nhưng không trộn các nhóm. “Đã thanh toán” không thay thế “Đã xác nhận”. “Đang hoạt động” của nơi lưu trú không đồng nghĩa “Còn phòng” cho ngày đang tìm.

Bảng booking được giữ **một cột Trạng thái như ảnh**, bên trong hiển thị badge đặt phòng chính và nhãn thanh toán phụ khi cần. Panel chi tiết có hai trường riêng. Các tổng hợp theo payment và booking có thể chồng lặp; không cộng chúng như các nhóm loại trừ nhau.

“Đã chốt” là trạng thái của **Inquiry**, không phải trạng thái vĩnh viễn của Customer. Cột chăm sóc khách có thể lấy từ inquiry đang chọn/gần nhất nhưng phải ghi rõ nguồn. Một khách được có nhiều inquiry và nhiều booking.

### 6.3. Ngày, tiền, KPI và số đếm

Để đối chiếu ảnh, dùng một `demoClock` cố định, ví dụ `2024-11-15T12:00:00+07:00`, và khoảng báo cáo tháng 11/2024. Đây là **ngày của dữ liệu demo lịch sử**, không phải ngày hiện tại. Tách khỏi clock thật khi nối API. Không gọi `new Date()` tùy tiện ở mọi widget khiến screenshot mỗi lần khác nhau.

Ngày nhận/trả lưu dạng `YYYY-MM-DD`; sự kiện có giờ lưu timestamp với timezone rõ ràng. Hiển thị `dd/MM/yyyy`, giờ 24h. Không chuyển date-only qua UTC gây lệch ngày. Điều kiện lưu trú dùng khoảng `[checkIn, checkOut)`; khách trả ngày nào thì không chiếm đêm ngày đó.

Tiền VND lưu dạng số nguyên. Tính tổng từ line items và điều chỉnh; không lấy text đã format để tính. Tách rõ tổng giá trị booking, tiền đã thu và khoản còn phải thu. Khi có refund, theo dõi riêng nghĩa vụ hoàn tiền; không âm thầm đổi số âm thành 0.

Định nghĩa các chỉ số trước khi render:

| Chỉ số | Quy tắc |
|---|---|
| Booking hôm nay | Count theo ngày tạo trong timezone đã chọn; khác với khách check-in hôm nay |
| Check-in/check-out | Theo ngày lưu trú và trạng thái hợp lệ, không theo `createdAt` |
| Công suất hôm nay | Số unit đã chiếm / số unit có thể kinh doanh cùng ngày; maintenance/blocked phải được xử lý nhất quán |
| Công suất theo kỳ | Room-nights đã chiếm / room-nights có thể kinh doanh; không lấy phần trăm của một ngày làm tháng |
| Doanh thu demo | Chọn một quy tắc, ví dụ giá trị booking hoàn tất theo ngày hoàn tất; ghi rõ đây là chỉ số demo, không đánh đồng với tiền đã thu |
| Combo bán chạy | Tên combo + số lượt đặt trong kỳ; không dùng số combo đang bán để thay lượt đặt |
| Tỷ lệ chuyển đổi | Booking hợp lệ / lượt xem tương ứng trong cùng kỳ; thiếu dữ liệu thì hiển thị “Chưa có dữ liệu” |
| SEO cần bổ sung | Số record thiếu trường theo checklist nội bộ; không gọi đây là điểm xếp hạng Google |

Không sao chép các mâu thuẫn số học trong ảnh. Ví dụ `86.250.000 + 32.200.000 + 9.500.000 = 127.950.000`, không phải `128.450.000`. Tính bằng selector chung rồi ghi sai khác mẫu. Doanh thu combo cùng kỳ phải khớp giữa Tổng quan và trang Combo.

Các yêu cầu khác:

- Số lượt lọc, pagination, badge, card, chart và bảng đều lấy từ cùng store/selector. Nếu hiển thị “245 đơn” thì phải có 245 bản ghi demo có thể phân trang, không chỉ 15 dòng cố định.
- Seed đủ dữ liệu kiểm tra nhiều trang; ưu tiên generator có seed cố định, không `Math.random()` trong render.
- RoomUnit, RoomType và Property là ba cấp khác nhau. Không ghi tổng 18 phòng nhưng cộng hàng inventory ra 26 mà không giải thích scope.
- Chart doanh thu theo ngày phải có tổng khớp kỳ tương ứng; donut legend cộng khớp tổng; số calendar lấy từ inventory/booking thật trong demo.
- Chỉ số tăng/giảm chọn màu theo ý nghĩa: giảm yêu cầu tồn đọng có thể là tốt; không mặc định mọi dấu âm đều đỏ. Không chia cho 0; kỳ trước bằng 0 dùng “Mới phát sinh” hoặc dấu gạch phù hợp.
- Tên, rating, giá, ưu đãi, contact trong ảnh là dữ liệu mẫu, không được đưa thành dữ liệu kinh doanh đã xác minh.

### 6.4. Store và trạng thái lỗi

Dùng store chung ở admin layout, hoặc giải pháp state sẵn có. Các mutation chạy qua adapter `Promise` có validation; cập nhật thành công phải xuất hiện trên màn khác liên quan. Có rollback/giữ form khi lỗi; disable submit trong khi đang lưu để tránh gửi lặp.

Demo có thể persist vào storage có version và nút reset. Bắt lỗi quota/unavailable; không lưu secrets hoặc dữ liệu khách thật trong localStorage. File upload preview có thể chỉ sống trong phiên, phải nói rõ nếu không persist được qua reload; không giả báo đã upload lên server.

Tạo cơ chế test nội bộ để bật trạng thái rỗng, lỗi mạng giả lập và quyền chỉ xem; không để điều khiển debug chiếm màn hình chính.

---

## 7. Màn A — Tổng quan

**Reference:** ảnh có tiêu đề “Tổng quan”. **Route:** `/admin`. Sidebar active “Tổng quan”.

### 7.1. Bố cục bắt buộc

```text
TOPBAR / DATE RANGE
6 KPI TRÊN MỘT HÀNG Ở VIEWPORT CHUẨN
┌──────────────────────────┬─────────────────┬─────────────────┐
│ DOANH THU + BOOKING CHART │ DONUT PHÒNG     │ LỊCH THÁNG      │
├──────────────────────────┼─────────────────┼─────────────────┤
│ BOOKING SẮP TỚI           │ CẦN XÁC NHẬN    │ TƯ VẤN GẦN ĐÂY  │
├──────────────────────────┼─────────────────┼─────────────────┤
│ TOP NƠI LƯU TRÚ           │ THAO TÁC NHANH  │ TỔNG DOANH THU  │
└──────────────────────────┴─────────────────┴─────────────────┘
FOOTER
```

Hàng chart và bảng dưới dùng tỷ lệ khởi tạo khoảng **46% / 26% / 28%**, tinh chỉnh theo ảnh sau khi trừ gap. Không biến toàn bộ thành các block full-width xếp dọc trên desktop. KPI cao khoảng 140–155 px; icon trong ô nền pastel, label nhỏ, số lớn và change caption dưới.

### 7.2. Nội dung và tương tác

**Sáu KPI:** đơn đặt phòng hôm nay, doanh thu tháng, tỷ lệ lấp đầy phòng, yêu cầu tư vấn mới, combo bán chạy, lượt truy cập website. Có tooltip định nghĩa/scope. Nhấn KPI booking/tư vấn mở trang liên quan với bộ lọc tương ứng. Analytics chưa tích hợp dùng số demo có đánh dấu, không cài tracking bên ngoài tự động.

**Biểu đồ doanh thu & đơn đặt phòng:** cột xanh nhạt cho doanh thu, đường xanh đậm cho booking; trục VND/triệu đồng và số booking tách rõ. Tooltip ngày, tiền và số đơn. Chọn kỳ làm đổi dữ liệu. Có legend toggle, tooltip dùng được bằng bàn phím hoặc bảng dữ liệu thay thế. Không dùng ảnh chart hoặc vẽ đường ngẫu nhiên.

Trong ảnh có tooltip quanh ngày 15/11; trạng thái nghỉ không cần ép tooltip luôn mở. Chụp thêm trạng thái hover tương ứng để đối chiếu. Khi viewport hẹp, rút gọn tick label nhưng không mất đơn vị.

**Donut tình trạng phòng:** giữa có phần trăm, bên cạnh legend đã đặt/còn trống/bảo trì/tạm khóa và số phòng. Có total và “Xem chi tiết” dẫn tới inventory của C. Count và phần trăm theo định nghĩa ở mục 6, không hardcode 78% khi dữ liệu không còn khớp.

**Lịch tháng:** tuần bắt đầu T2, có prev/next, ngày chọn xanh đậm và dot hoạt động. Click ngày lọc danh sách booking/check-in liên quan; đánh dấu ngày không chỉ dựa vào màu. Thay tháng phải render đúng số ngày và thứ.

**Đặt phòng sắp tới:** khoảng 5 dòng hiển thị, cột mã, khách, nơi lưu trú/dịch vụ, ngày nhận, đêm, trạng thái và menu. Nhấn mã/dòng mở B với record đã chọn; button bên trong row không kích hoạt nhầm row navigation.

**Cần xác nhận:** danh sách 4 record có ảnh, khách/ngày, nút “Xác nhận”. Nút mở confirm dialog nêu rõ booking, không đổi trạng thái ngay bằng một click vô tình; demo kiểm tra conflict và cập nhật đồng bộ KPI/list.

**Tư vấn gần đây:** avatar/initial, tên, preview nhu cầu, timestamp, unread dot. Click mở F đúng inquiry; đánh dấu đã đọc cập nhật badge, không tự chuyển thành “Đã chốt”.

**Top phòng nghỉ/dịch vụ:** 5 mini card ngang ở desktop, ảnh + hạng + tên + lượt đặt + rating mẫu. Xếp hạng tính từ cùng dữ liệu theo kỳ.

**Thao tác nhanh:** thêm phòng nghỉ → C create drawer; tạo combo → D create editor; duyệt đặt phòng → B lọc pending; trả lời khách → F tab tư vấn lọc new.

**Tổng quan doanh thu:** các hàng phòng nghỉ/combo/dịch vụ khác và tổng; khớp KPI/biểu đồ theo cùng scope. Không viết một bộ số khác độc lập.

### 7.3. Nghiệm thu A

- Đủ 6 KPI, 3 hàng nội dung nhiều cột, không đổi bố cục thành dashboard khác.
- Chart, donut, lịch và các action hoạt động bằng dữ liệu.
- Click booking/inquiry/quick action đi đúng màn và đúng record.
- Chụp trạng thái mặc định và chart tooltip; kiểm tra mọi tổng số.

---

## 8. Màn B — Quản lý đặt phòng

**Reference:** bảng nhiều dòng + lịch và panel chi tiết bên phải. **Route:** `/admin/dat-phong`.

### 8.1. Bố cục

Main chia khoảng **73% / 27%**, gap 12–16 px. Cột trái: filter hai hàng, bảng booking, 3 widget nhỏ phía dưới. Cột phải: summary 6 ô, lịch công suất, selected booking panel. Không chuyển panel phải thành modal mặc định trên desktop; đây là phần của layout ảnh.

Filters gồm từ khóa; khoảng thời gian; trạng thái booking; kênh đặt; loại dịch vụ; số khách; xóa bộ lọc; **Xuất Excel**. Bộ lọc thời gian phải nói đang lọc theo “Ngày nhận phòng” hay “Ngày tạo đơn”; tránh nhãn mơ hồ. Payment filter có thể đặt trong mục lọc nâng cao.

### 8.2. Bảng booking

Các cột theo ảnh:

```text
Checkbox | # | Mã đặt phòng | Khách hàng | Dịch vụ / Phòng
Ngày nhận | Ngày trả | SL khách | Tổng tiền | Trạng thái | Nguồn | Thao tác
```

Header panel có số record, “Đã chọn N đơn”, dropdown hành động, nút thực hiện. Footer có page size 15/30/50, tổng số kết quả, current page và prev/next. Bảng dùng HTML semantic, sticky header trong vùng cuộn khi cần; tiền căn phải, ngày không wrap tùy tiện, tên có thể wrap/ellipsis kèm cách xem đầy đủ.

Search theo mã, tên, điện thoại; hỗ trợ tìm không dấu ở index tìm kiếm nhưng không làm mất dấu dữ liệu hiển thị. Filter/sort trước rồi mới paginate. Thay filter reset page 1; Back/Forward khôi phục query và selected record hợp lý. Không đưa điện thoại/email hoặc ghi chú riêng tư vào URL.

Checkbox header thể hiện indeterminate. Chọn tất cả phải nói rõ “trang này”; không âm thầm áp dụng lên toàn bộ dataset. Dữ liệu bộ lọc thay đổi thì clear selection hoặc giữ các ID hợp lệ với thông báo rõ. Bulk action chỉ áp dụng record đủ điều kiện và trả kết quả từng nhóm, không báo tất cả thành công khi một số thất bại.

### 8.3. Cột phải và thao tác

**Summary:** chờ xác nhận, đã xác nhận, đã thanh toán, hoàn tất, đã hủy, tổng cộng. Paid là chỉ số thanh toán có thể trùng booking status; không cộng 5 ô để suy ra tổng. Nhấn ô tạo filter tương ứng.

**Lịch công suất:** ngày có trạng thái trống nhiều/gần đầy/hết theo inventory, có text/tooltip bổ trợ. Click ngày cập nhật bộ lọc hoặc panel xem tình trạng, không tự sửa dữ liệu phòng.

**Chi tiết:** mặc định chọn booking tương ứng `#DP2403` nếu fixture có; hiển thị khách, nơi lưu trú, loại phòng, ngày, số đêm, khách, tiền và payment badge. Tabs: Thông tin chung / Khách hàng / Thanh toán / Ghi chú. Selected row và detail phải cùng ID; có empty state nếu record bị lọc/xóa.

Action bắt buộc:

| Action | Hành vi |
|---|---|
| Xác nhận | Dialog xác nhận + kiểm tra điều kiện/ngày/inventory; lưu demo và log |
| Hủy đơn | Dialog nêu ảnh hưởng, bắt nhập lý do; không xóa lịch sử hoặc tự hoàn tiền |
| Gửi tin nhắn | Composer preview; cho copy nội dung; chưa tích hợp thì không báo đã gửi |
| In phiếu đặt phòng | Bản in DOM sạch, ẩn sidebar/action; ghi “Bản demo” khi dùng fixture |
| Ghi chú | Ghi chú nội bộ có author/time, không tự gửi cho khách |
| Xem thanh toán | Liệt kê payment records, số đã thu, còn thu, refund nếu có |

Có drawer **Tạo đặt phòng / Sửa thông tin** qua action route, toolbar gọn hoặc menu phù hợp. Chưa có ảnh riêng thì suy rộng component, không cần tự tạo trang mới ngoài shell. Form gồm chọn/tạo khách; nơi lưu trú; loại phòng/combo; ngày; số phòng/khách; add-on; ghi chú và bản tính tiền. Không chốt booking chỉ vì form valid: phải kiểm tra inventory trong demo adapter; API thật về sau phải kiểm tra phía server.

Không tự cho phép chuyển `cancelled → completed`, hoàn tất đơn tương lai hoặc trả phòng trước nhận phòng. Booking đã xác nhận có thay đổi giá/ngày phải hiển thị phần thay đổi trước khi lưu. Các rule demo là rule UI đã ghi rõ, không thay thế contract nghiệp vụ thật.

**Widget cuối:** check-in hôm nay, check-out hôm nay, booking gần đây; mỗi widget có khoảng 3 dòng và “Xem tất cả”. Nhãn số liệu lấy từ đúng query, không giữ số 6/4 khi dữ liệu chỉ có 3.

### 8.4. Xuất file

“Xuất Excel” phải tạo `.xlsx` hợp lệ từ dữ liệu được chọn/đã lọc, ghi rõ phạm vi trước khi tải. Tái sử dụng thư viện export phù hợp repo và kiểm tra file mở được; không đổi đuôi CSV thành `.xlsx`. Chưa thể tạo `.xlsx` thì hiển thị lựa chọn **Xuất CSV** đúng tên và báo phần Excel còn thiếu, không giả thành công.

CSV phải hỗ trợ tiếng Việt, escaping, newline và chống spreadsheet formula injection từ các ô người dùng nhập. Khi xuất XLSX, dữ liệu text không được tự biến thành công thức. Không export token, note mật hoặc field ngoài quyền người dùng.

### 8.5. Nghiệm thu B

- Lọc/sort/pagination/selection tác động thật, URL reload vẫn mở đúng context.
- Chi tiết có 4 tab, xác nhận/hủy có confirm, reason và trạng thái lỗi.
- Booking status và payment status riêng; hủy đơn không tự hoàn tiền.
- Export đúng định dạng và phạm vi; bản in đọc được.
- Không chỉ vẽ bảng tĩnh rồi để mọi dấu ba chấm vô dụng.

---

## 9. Màn C — Quản lý phòng nghỉ

**Reference:** 4 accommodation card + 3 panel loại phòng/giá/inventory. **Route:** `/admin/phong-nghi`.

### 9.1. Bố cục và danh sách

Phía trên có 5 KPI: tổng số phòng hoặc nơi lưu trú **ghi rõ đơn vị**, đang hoạt động, sắp kín chỗ, đang bảo trì, doanh thu phòng. Sau đó filter keyword, loại lưu trú, khu vực, trạng thái, mức giá/đêm, xóa lọc, **Thêm phòng nghỉ**.

Panel danh sách có sort, grid/list toggle và page size. Desktop chuẩn hiển thị **4 card trên một hàng**, ảnh rộng ở trên; thông tin không bị ép xuống 10 px để giữ hàng.

Bốn ví dụ theo ảnh: Cúc Phương Forest Homestay; An Nhiên Retreat; Mộc Sơn Homestay; Cúc Phương Eco Lodge. Dùng cùng record/giá/ảnh đã có ở public fixture nếu dự án có, sửa sự hoán đổi ảnh hoặc giá trong mockup theo ID đã chuẩn hóa.

Card có publication/operating badge, tên, mã property riêng, location, rating mẫu, giá từ/đêm, tiện ích, sức chứa, loại giường, số phòng còn theo ngày và 3 action **Chỉnh sửa / Xem chi tiết / Tạm ẩn**. Không dùng mã booking `#DP...` làm property ID.

Heart ở góc ảnh nếu giữ để sát mẫu thì định nghĩa là **ghim nội bộ** với label và state, không nhập nhằng với yêu thích khách hàng hoặc “nổi bật trên trang chủ”. Nổi bật public là một field riêng trong editor.

### 9.2. Thêm/sửa nơi lưu trú

Drawer/editor rộng, có tabs hoặc sections: Thông tin chung / Loại phòng / Ảnh & tiện ích / Chính sách / SEO. Dùng cùng UI primitive với màn E.

Form tối thiểu:

| Nhóm | Trường |
|---|---|
| Chung | Tên, slug, loại lưu trú, mô tả ngắn, mô tả chi tiết |
| Vị trí | Địa chỉ mô tả, khu vực; tọa độ optional nếu đã có nguồn thật |
| Chủ cơ sở | Tên/đầu mối liên hệ từ config; không đoán số điện thoại |
| Ảnh | Cover, gallery, alt/caption, thứ tự, điểm crop |
| Tiện ích | Danh sách checkbox/tag theo dữ liệu dùng chung |
| Hiển thị | Draft/published/hidden; cờ nổi bật độc lập |
| Chính sách | Nhận/trả phòng, số khách tối đa, phụ thu và ghi chú |
| SEO | Meta title/description, slug; theo pattern E |

Chọn ảnh từ media picker; reorder bằng drag/drop **và** nút di chuyển cho bàn phím. Preview ảnh chỉ là local nếu chưa có upload API. Validate tên/slug bắt buộc, slug uniqueness trong demo, giá không âm, sức chứa hợp lý. Cảnh báo unsaved changes khi đóng drawer/chuyển record.

“Tạm ẩn” đổi publication, không xóa property và không hủy booking đã có. “Bảo trì” là điều kiện inventory theo phạm vi/ngày, không tự gán bằng việc ẩn public page.

### 9.3. Ba panel phía dưới

**Trái — Loại phòng & Quy định giá:** bảng tên loại, sức chứa, giá thường, giá cuối tuần, trạng thái, menu và nút thêm. Mỗi loại phòng thuộc một nơi lưu trú được chọn; thêm selector scope nhỏ nếu cần, không trộn các loại của nhiều nơi mà không có cột nhận diện. Modal thêm/sửa có sức chứa, giường, số unit, đơn giá, loại đơn vị tính và tiện ích.

**Giữa — Giá & mùa cao điểm:** toggle weekend rate, toggle seasonal rate, danh sách mùa, khoảng ngày, kiểu số tiền/phần trăm và menu sửa. Tạo/sửa mùa có validation range. Cho xem **preview giá theo ngày trước khi lưu**. Chọn thứ nào là cuối tuần qua config, không hardcode thứ 6–CN thành quy định bắt buộc.

Nếu chưa có engine nghiệp vụ, rule demo mặc định: `override theo ngày > mùa có priority cao nhất > giá cuối tuần > giá cơ bản`; không cộng dồn nhiều phần trăm mơ hồ. Cùng priority và chồng khoảng ngày phải báo conflict hoặc yêu cầu giải quyết. Đây là quy tắc demo để test, khi nối backend dùng contract thật.

**Phải — Tình trạng phòng 7 ngày:** cột ngày/thứ và hàng loại phòng, số còn bán, màu xanh/vàng/đỏ, có legend. Bộ ngày dựa trên demoClock hoặc ngày chọn. Click ô mở drawer inventory của loại/ngày: tổng, đã đặt, giữ chỗ, bảo trì, tạm khóa, còn lại. Empty/missing data khác số 0.

Chỉnh block/bảo trì có confirm và lý do, preview ảnh hưởng tới booking; không cho số bán được âm hoặc giảm capacity dưới số đang chiếm mà không báo conflict. Nếu UI demo chưa giải được conflict, giữ dữ liệu cũ và báo rõ, không tự hủy khách.

### 9.4. Nghiệm thu C

- Có đủ 4 card desktop và 3 panel dưới; switch grid/list hoạt động.
- Thêm/sửa/ẩn/ghim local có phản hồi và persistence đúng chế độ.
- Property, room type và inventory phân biệt rõ; số total không mâu thuẫn.
- Giá preview đổi theo ngày; bảo trì theo ngày, không tự biến thành xóa.
- Ngày hết phòng, lỗi rule và unsaved form được kiểm tra.

---

## 10. Màn D — Quản lý combo du lịch

**Reference:** danh sách combo bên trái và chi tiết bên phải. **Route:** `/admin/combo-du-lich`.

### 10.1. Bố cục

5 KPI trên: combo đang bán, combo nổi bật, doanh thu combo trong kỳ, tỷ lệ chuyển đổi, combo sắp hết chỗ. Filter thời lượng, đối tượng, trạng thái, khoảng giá, tìm kiếm và **Tạo combo mới**.

Phần dưới chia khoảng **47% / 53%**: danh sách card ngang ở trái; chi tiết selected combo ở phải. Không chuyển thành 6 card nhỏ dạng public listing. Giữ hàng filter gọn, đủ không gian cho itinerary và summary.

Mỗi list card có ảnh, badge nổi bật/bán chạy/theo mùa và thời lượng; tên, khu vực, đối tượng, tag; giá, lượt đặt, trạng thái và menu. Selected card có border xanh nhạt. Có sort và pagination thật. Các combo mẫu ưu tiên theo ảnh; ID combo tách khỏi ID nơi lưu trú dù có tên gần nhau.

### 10.2. Chi tiết combo được chọn

Mặc định chọn **Tràng An – Bái Đính**, thời lượng **2N1Đ**, giá mẫu **1.290.000đ/người** nếu phù hợp fixture. Header có trạng thái, chỉnh sửa và menu.

Ảnh lớn bên trái của detail, số liệu tóm tắt bên phải: giá/đơn vị tính, lượt đặt, doanh thu theo kỳ hoặc toàn thời gian, conversion, ưu đãi đang áp dụng. Badge và lời viết tay trên cover là layer DOM khi ảnh gốc không có; không lặp hai lần chữ đã nằm trong ảnh.

Gallery button mở lightbox đủ ảnh thực tế. Không ghi “12 ảnh” khi dataset chỉ có 3. Không thêm chart/section lớn ngoài mẫu chỉ vì muốn dashboard trông nhiều tính năng hơn.

Các tab:

| Tab | Chức năng |
|---|---|
| Lịch trình | Timeline từng ngày; tiêu đề, thời gian, danh sách hoạt động; khối bao gồm/không bao gồm |
| Thông tin chung | Tên, mô tả, đối tượng, tags, điểm đến, lưu trú đi kèm, điều kiện sử dụng |
| Hình ảnh | Gallery, cover, alt, sort, chọn từ media library |
| Giá & lịch khởi hành | Đơn vị giá, giá người lớn/trẻ em nếu có, ngày khởi hành, tổng chỗ/còn chỗ, đóng mở bán |
| Đánh giá | Danh sách review demo, lọc, xem chi tiết; không tự tạo review thật |

Lịch trình mặc định có 2 ngày; mục bao gồm/không bao gồm dùng icon check/x rõ, không dùng emoji. Nội dung lịch trình và giá trong ảnh là fixture, không coi là tour/chính sách thực tế đã xác nhận.

### 10.3. Tạo/sửa và trạng thái

Editor/modal lớn dùng cùng shell component, có tên/slug/cover, thời lượng ngày/đêm, đối tượng, destination IDs, mô tả, itinerary, inclusions/exclusions, pricing, departures, publication và nổi bật.

- Thêm/xóa/sắp xếp ngày và hoạt động, có nút lên/xuống ngoài kéo thả. Nếu thời lượng 2 ngày thì không lưu 3 ngày itinerary mà không cảnh báo.
- Chọn giá theo người/nhóm/combo rõ ràng; đơn vị đồng bộ ở list/detail/booking.
- Capacity không âm; đã giữ/đã bán không được vượt sức chứa sau chỉnh sửa mà không báo conflict. Combo dùng phòng cần hiển thị tồn theo contract demo, không khẳng định đồng bộ real-time.
- Chỉnh giá/combo không sửa giá snapshot của booking đã chốt. Có note phân biệt “Giá mới cho đơn mới”.
- Duplicate tạo ID/slug mới và trạng thái nháp, không nhân bản booking/review/analytics cũ.
- Tạm dừng đóng mở bán combo mới, không hủy booking cũ. Xóa/archiving phải check liên kết và có confirm.
- Ưu đãi demo có giá trị, đơn vị, điều kiện, ngày hiệu lực; hết hạn theo demoClock thì không ghi đang áp dụng. Không triển khai toàn bộ module Khuyến mãi ngoài phạm vi.
- Những nội dung kiểu “VAT theo yêu cầu hóa đơn”, “có bảo hiểm” trong ảnh phải là text demo/chờ xác nhận, không tự thiết lập thành chính sách kinh doanh thật.

Nút “Xem booking liên quan” hoặc click lượt đặt dẫn tới B với comboId. Không giả nhận dữ liệu analytics từ bên thứ ba.

### 10.4. Nghiệm thu D

- Đủ 5 KPI, filter, list-detail đúng tỷ lệ và 5 tab dùng được.
- Đổi selected combo cập nhật ảnh, giá, ngày, metadata và stats đồng bộ.
- Tạo/sửa/duplicate/ẩn, itinerary reorder và departure editor hoạt động local.
- Giá và thời lượng thống nhất, không thay đổi lịch sử booking khi sửa catalog.

---

## 11. Màn E — Điểm đến & nội dung website

**Reference:** bảng điểm đến + form chỉnh sửa bên phải. **Routes:** `/admin/diem-den`, `/admin/noi-dung` dùng cùng module.

### 11.1. Bố cục chính

Title **“Quản lý điểm đến & nội dung”**, subtitle về cập nhật nội dung/hình ảnh. Bốn tab: **Điểm đến / Bài viết / SEO & nội dung / Thư viện ảnh**. Khi vào `/admin/diem-den`, tab Điểm đến active; `/admin/noi-dung` mở Bài viết và sidebar active Nội dung website.

Hàng KPI: điểm đến hiển thị, bài viết xuất bản, tệp media, trang cần bổ sung SEO, lượt xem nội dung. KPI phải có scope; số media không lấy từ số ảnh đang hiển thị trong strip.

Main chia khoảng **58% / 42%**: list và media strip trái; editor với SEO preview/checklist/actions phải. Giữ editor là panel nội tuyến ở desktop, không bật overlay đen ngay khi tải trang.

### 11.2. Tab Điểm đến

Header list: search, category filter, publication filter, **Thêm điểm đến**. Cột: checkbox, thumbnail, tên, danh mục, mô tả ngắn, trạng thái, cập nhật, SEO checklist, thao tác.

Các mẫu: Vườn quốc gia Cúc Phương, Hồ Yên Quang, Động Người Xưa, Tràng An, Ẩm thực Ninh Bình, Hang Múa, Thung Nham. Không lặp một ảnh cho tất cả. Nội dung được coi là fixture; không yêu cầu Agent xác minh thông tin du lịch để hoàn thành UI.

Click row mở editor đúng record. Checkbox dùng cho selection, không đồng nghĩa record đang sửa. Edit/duplicate/menu ở từng row phải hoạt động. Duplicate mở một draft mới, không reuse slug public.

### 11.3. Editor bên phải

Header **“Chỉnh sửa điểm đến”** và nút đóng; 4 tab **Thông tin chung / Hình ảnh & media / Nội dung chi tiết / SEO**.

**Thông tin chung:** thumbnail có “Thay đổi ảnh”; tên bắt buộc; slug; danh mục; publication; mô tả ngắn có counter; tags có thêm/xóa. Form phải có labels, inline validation và trạng thái lưu.

Slug tự gợi ý từ title khi tạo mới; sau khi người dùng sửa slug thì không tự ghi đè. Record đã published đổi title không tự đổi slug. Nếu đổi slug đã xuất bản, hiển thị cảnh báo và bản nháp mapping chuyển hướng để tích hợp backend; không giả nói đã tạo redirect production.

**Hình ảnh & media:** chọn cover/gallery, upload preview, alt/caption, sắp xếp, xem đang dùng ở đâu. Picker là component chung C/D/E. Link đến media phải mở đúng asset.

**Nội dung chi tiết:** editor có paragraph, headings, bold, italic, list, link, image. Dùng editor đang có hoặc giải pháp phù hợp repo; các toolbar phải thao tác thật, không là icon trang trí. Không render HTML tùy ý không được kiểm tra; validate URL/link và xử lý nội dung nhập theo cơ chế an toàn của editor.

**SEO:** meta title, meta description, slug, canonical optional và OG image; counter/gợi ý hiển thị, không biến số ký tự thành bảo đảm thứ hạng. Domain lấy từ `siteUrl`; chưa có domain thật dùng giá trị preview `.example`, không tự nhận `dinhvanbooking.com` thuộc chủ dự án.

Dưới form giữ **preview kết quả tìm kiếm mô phỏng** với Desktop/Mobile toggle và **checklist xuất bản** như ảnh. Checklist gồm tên, mô tả, cover, danh mục, nội dung chi tiết, metadata, alt; trạng thái computed từ record đang sửa. Nhãn “Đủ trường cơ bản/Cần bổ sung” rõ nghĩa hơn điểm “SEO tốt” tuyệt đối. Không hứa Google sẽ hiển thị đúng y hệt snippet mô phỏng.

**Footer editor:** Xóa/ẩn ở trái, Xem trước và Lưu thay đổi ở phải. Save chỉ bật khi dirty và dữ liệu hợp lệ. Đang lưu không cho double-submit; lỗi giữ nguyên text đã nhập. Unsaved changes cần confirm khi đổi record, đóng hoặc chuyển tab/module làm mất dữ liệu.

“Xem trước” mở bản render demo từ draft trong modal/route riêng có nhãn bản nháp. Không xuất bản thật chỉ vì bấm preview/save; publication transition là action rõ ràng. Với API có sẵn, chỉ thông báo xuất bản khi response xác nhận thành công.

### 11.4. Ba tab còn lại phải có nội dung thật

Đây là **trạng thái suy rộng từ bộ component E**, không yêu cầu tự tạo ba concept thiết kế khác:

- **Bài viết:** list tiêu đề/thumbnail/danh mục/tác giả/trạng thái/cập nhật; search/filter; thêm/sửa bằng editor chung; nháp/xuất bản/ẩn và preview. Không thêm AI viết bài tự động ngoài yêu cầu.
- **SEO & nội dung:** bảng record thiếu trường, loại nội dung, trường thiếu, action mở editor đúng tab. Bộ lọc thiếu meta title/description/alt/cover. Checklist phản ánh dữ liệu thực, không chạy GSC hay đánh giá ranking giả.
- **Thư viện ảnh:** grid tài nguyên, filter loại/search, uploader có validate loại/kích thước theo config, progress local rõ, asset detail với alt/caption/kích thước/usage; multi-select. Không xóa asset đang được dùng nếu chưa có cách thay thế, phải nêu đối tượng liên quan.

Media strip dưới bảng Điểm đến hiển thị ảnh liên quan + ô thêm; “Xem tất cả” chuyển đúng tab media cùng context. Upload preview không đồng nghĩa upload server. Không lưu dữ liệu binary lớn vào localStorage tùy tiện.

### 11.5. Nghiệm thu E

- Bố cục table/editor/media/SEO đúng hình, tab và toolbar hoạt động.
- Có tạo, sửa, duplicate, preview, ẩn; slug và unsaved changes xử lý đúng.
- Tags/media/metadata cập nhật và giữ trạng thái local theo chế độ demo.
- Checklist không fake; thao tác xóa có kiểm tra liên kết và confirm.
- Save admin demo không tự thay đổi public website production.

---

## 12. Màn F — Khách hàng & yêu cầu tư vấn

**Reference:** bảng CRM, pipeline và selected customer panel. **Routes:** `/admin/khach-hang`, `/admin/yeu-cau-tu-van`.

### 12.1. Bố cục

Title **“Khách hàng & yêu cầu tư vấn”**. Tabs Khách hàng / Yêu cầu tư vấn. 5 KPI: khách mới, yêu cầu chưa xử lý, khách quay lại, tỷ lệ phản hồi, yêu cầu ưu tiên hôm nay.

Main chia khoảng **69% / 31%**: trái là filters + bảng + pipeline; phải là hồ sơ và tác vụ chăm sóc. Không cho panel phải rơi xuống dưới ở viewport chuẩn vì một cột bảng quá rộng; xử lý width/ellipsis/cell layout trước.

Filter: search theo tên/liên hệ/nhu cầu, nguồn khách, nhóm khách, stage của inquiry đang xem, bộ lọc thêm. Search field hiển thị nội dung đã nhập, không loại bỏ dấu trong ô người dùng.

### 12.2. Bảng khách hàng

Cột: selection, avatar/tên, điện thoại, nhu cầu chính, lần đặt gần nhất, số booking, giá trị VND, tags, trạng thái chăm sóc và nhân viên phụ trách. Có sort, pagination và row action. Tiền, lần đặt cuối, số booking derive theo customerId, không nhập tay từng row.

Record mặc định chọn Nguyễn Thị Mai nếu fixture có. Tên và điện thoại/email trong ảnh là mẫu; demo dùng liên hệ không thực sự gọi/gửi được, hoặc che số. Không mở `tel:`/Zalo đến số minh họa có thể thuộc một người thật.

Thêm/sửa khách từ action phù hợp, không cần nhét nút lớn ngoài bố cục. Form có tên, contact, nhóm, tags, owner và ghi chú. Phát hiện trùng liên hệ để cảnh báo; không tự merge/xóa hồ sơ khi chưa xác nhận. Không tạo tính năng thu thập thông tin nhạy cảm không liên quan chuyến đi.

### 12.3. Panel khách được chọn

Header avatar, tên, nhãn nguồn/trạng thái, menu; hàng contact và vị trí nếu đã có. Tabs **Thông tin / Lịch sử trao đổi / Lịch sử đặt phòng**.

**Thông tin:** tags nhu cầu/sở thích, note mô tả, nút chỉnh sửa. Ví dụ tag gia đình, gần rừng, yên tĩnh, combo 2N1Đ; chỉ là dữ liệu demo. Khi có nhiều inquiry, chọn inquiry đang chăm sóc rõ ràng để không đổi stage sai yêu cầu.

**Lịch sử trao đổi:** conversation timeline có author/time/channel; phân biệt ghi chú nội bộ với tin đã gửi. “Ghi chú nhanh” lưu note và thêm timeline. Chưa có chat integration thì composer chỉ soạn/copy, không tạo dấu tick “đã gửi” giả.

**Lịch sử đặt phòng:** mã, ngày, loại phòng/combo, tiền, booking status và payment status; click booking mở B đúng record, có cách quay về khách.

**Hẹn follow-up:** ngày, giờ, mục đích, người phụ trách; validation theo demoClock trong demo. Cho tạo/sửa/hoàn tất hẹn; hiển thị quá hạn và sắp tới. Chỉ là lịch nội bộ của ứng dụng, không tự kết nối Google Calendar hay cam kết push notification khi chưa triển khai.

Các nút cuối:

| Nút | Hành vi |
|---|---|
| Gọi lại | Chỉ mở số thật đã cấu hình/quyền phù hợp; trong demo mở preview/copy số mẫu, không gọi |
| Chat Zalo | Chỉ mở URL đã xác nhận; demo là preview nội dung, không tự gửi |
| Tạo booking | Mở drawer B hoặc route với customerId/inquiryId; điền sẵn nhu cầu hợp lệ |
| Đánh dấu đã xử lý | Đổi xử lý của inquiry được chọn, không tự chuyển mọi yêu cầu của khách thành won |

### 12.4. Pipeline tư vấn

Bốn cột đúng mẫu: **Mới nhận / Đang tư vấn / Chờ phản hồi / Đã chốt**. Mỗi cột có count, màu nhẹ, khoảng 3 card ban đầu và “Xem thêm N yêu cầu”. Card có avatar/initial, tên, tóm tắt, timestamp.

Kéo card giữa cột phải cập nhật stage, log và count; có menu “Chuyển trạng thái” cho bàn phím/touch. Giữ card ở cột cũ khi mutation lỗi. Không chỉ làm animation kéo mà data không đổi.

Khi chuyển sang Đã chốt, yêu cầu liên kết booking đã tạo hoặc ghi rõ kết quả chốt theo rule demo. Không tự sinh booking hoặc đánh dấu đã thanh toán bằng thao tác kéo thả. Một booking được tạo lại từ cùng inquiry phải có cảnh báo chống tạo trùng.

Tab Yêu cầu tư vấn cho phép xem pipeline mở rộng hoặc list yêu cầu từ cùng component, lọc theo stage/owner/hạn follow-up; chọn card cập nhật detail tương ứng. Tab Khách hàng mặc định vẫn giữ bố cục có bảng + pipeline phía dưới như ảnh.

### 12.5. Nghiệm thu F

- Bảng, profile, pipeline và KPI lấy cùng Customer/Inquiry/Booking store.
- Có create/edit, note, tags, assign owner, follow-up, chuyển stage và mở booking.
- Kéo thả có cập nhật thật và có cách thay thế bằng bàn phím.
- Không gửi tin/đặt cuộc gọi thật từ demo; không coi note là tin nhắn đã gửi.
- Đánh dấu xử lý và Đã chốt là hai hành vi khác nhau, áp dụng đúng inquiry.

---

## 13. Luồng xuyên màn hình phải kiểm thử

Không nghiệm thu từng route riêng mà bỏ các liên kết nghiệp vụ. Các luồng dưới đây phải thao tác được trong demo:

| Luồng | Kết quả phải có |
|---|---|
| A → booking sắp tới → B | Đúng row/detail selected; ngày, tiền, khách không đổi |
| A → yêu cầu tư vấn → F | Mở đúng inquiry và customer; read state cập nhật |
| F → tạo booking → B | Điền sẵn customer/nhu cầu; lưu hợp lệ rồi lịch sử khách có booking mới |
| B → xác nhận | A/B cập nhật pending/confirmed; inventory cập nhật theo rule demo |
| B → hủy | Booking lưu lý do, inventory giải phóng đúng khoảng đêm; payment không tự refund |
| C → sửa nơi lưu trú | List/detail/booking lookup dùng thông tin catalog mới, booking price snapshot cũ giữ nguyên |
| C → block inventory | Calendar/công suất phản ánh phạm vi thay đổi, conflict được báo |
| D → xem booking combo | B lọc đúng comboId, không mất danh tính khách |
| E → chọn ảnh → C hoặc D | Cùng media asset/metadata; không sinh ảnh trùng vô ích |
| F → chuyển inquiry stage | Count ở pipeline/badge/KPI thay đổi nhất quán |
| F → ghi follow-up | Hiện ở lịch nội bộ liên quan, reload demo theo quy tắc persistence |

Chọn ID không tồn tại/đã ẩn có not-found/empty state trong shell, không crash và không hiển thị nhầm record đầu tiên.

---

## 14. Trạng thái UI, responsive và accessibility

### 14.1. States dùng chung

Mỗi list/detail/form phải có đủ: loading, empty, filtered-empty, error + retry, selected, saving, success đúng chế độ, validation error, unsaved changes và no-permission nếu có quyền.

Không để thao tác chỉ gọi `alert('Coming soon')` cho các chức năng đã đặc tả. Với module ngoài phạm vi, hiển thị panel thông tin gọn nói rõ phần chưa triển khai; không giả dữ liệu cho thấy module hoàn tất.

Mutation quan trọng có confirm; lỗi không mất form; toast tự biến mất nhưng lỗi field còn cho tới khi sửa. Tránh focus bị nhảy về đầu trang khi save/filter. File chọn không hợp lệ báo tên file và lý do, không im lặng.

### 14.2. Responsive

| Viewport | Hành vi |
|---|---|
| 1448 × 1086 | Bản đối chiếu ảnh chính; sidebar mở, nhiều cột như mẫu |
| 1440 × 900 | Nội dung được cuộn tự nhiên; không ép footer vào viewport bằng cắt bớt card |
| 1280 × 900 | Có thể giảm gap/thu sidebar; giữ detail readable, bảng scroll trong panel |
| 1024 × 900 | Sidebar thu gọn; KPI 3+2 hoặc 3+3; list-detail có thể chuyển drawer |
| 768 × 1024 | Navigation drawer; card 2 cột; filter wrap; table cuộn cục bộ |
| 390 × 844 và 375 × 812 | Sidebar drawer, KPI 1–2 cột, detail full-screen drawer, form 1 cột |

Mobile không scale nguyên artboard. Không ẩn booking/payment/error chỉ để trang gọn. Trong bảng nhỏ có thể dùng column visibility và row detail, nhưng mọi thông tin vẫn truy cập được. Pipeline cuộn ngang riêng hoặc chọn từng stage; không làm toàn bộ document tràn ngang.

Body mobile khoảng 14–16 px, label/cell không dưới mức đọc được. Điểm bấm mobile tối thiểu 44 × 44 px là tiêu chí của dự án; icon nhỏ có wrapper hit-area, không nhất thiết phóng nét SVG. Form có bottom action bar thì chừa khoảng đệm và safe area để không che trường cuối/bàn phím.

### 14.3. Khả năng sử dụng

Dùng landmarks, heading hợp lý, table header đúng, input có label, error liên kết bằng `aria-describedby`, trạng thái không chỉ thể hiện bằng màu. Đồ thị có thông tin thay thế; tooltip không phải nơi duy nhất chứa dữ liệu cần thiết.

Modal phải quản lý focus, hỗ trợ Tab/Shift+Tab trong modal, Escape và trả focus khi đóng theo pattern WAI-ARIA.[T8] Editor panel inline ở desktop không được giả `aria-modal` hoặc khóa focus toàn trang. Khi chuyển thành modal drawer ở mobile thì áp dụng hành vi modal thật.

Không button trong button hoặc button lồng trong link. Shortcut toàn cục không làm hỏng việc gõ trong editor/input. Toggle có label và state; dùng confirm cho destructive action. Drag/drop phải có phương án lên/xuống hoặc chuyển trạng thái bằng menu.

Đảm bảo zoom 200% còn đọc và thao tác được. Không dùng `overflow-x: hidden` toàn trang như cách sửa tràn bảng.

### 14.4. Motion

Transition gọn 120–220 ms cho hover, menu, drawer, chọn row. Không parallax/particles/typewriter trong admin; không dùng hiệu ứng lá bay che nội dung. Nội dung luôn có mặt, không `opacity: 0` chờ animation mới hiển thị.

Tôn trọng `prefers-reduced-motion`. Screenshot chụp ở trạng thái nghỉ; không thay đổi layout chỉ khi chạy test.

### 14.5. Quyền và dữ liệu nội bộ

Giữ auth/permission của repo nếu đã có. Với demo chỉ kiểm tra UI owner/editor/viewer và nói rõ đây không phải lớp bảo vệ thật. Ẩn button phía client không thay thế server authorization; không đưa secret hoặc API key quản trị vào bundle.

Admin không đưa vào sitemap và có `noindex`; **noindex không phải bảo mật**. Không công bố demo chứa dữ liệu khách thật. Log/screenshot/export kiểm thử dùng fixture, không tự ghi lại PII production. Không bật auth bypass để dễ chụp màn hình.

---

## 15. Cấu trúc source gợi ý

Thích nghi với cấu trúc repo hiện tại, không di chuyển hàng loạt file chỉ để khớp cây này:

```text
references/
  a.png ... f.png                  # Ảnh đầu vào; nhận diện theo nội dung thực tế
src/
  app/
    admin/
      layout.tsx
      page.tsx
      dat-phong/page.tsx
      phong-nghi/page.tsx
      combo-du-lich/page.tsx
      diem-den/page.tsx
      noi-dung/page.tsx            # Cùng module E, entry tab khác
      khach-hang/page.tsx
      yeu-cau-tu-van/page.tsx      # Cùng module F, entry tab khác
  components/admin/
    shell/
      AdminShell.tsx
      AdminSidebar.tsx
      AdminTopbar.tsx
      AdminFooter.tsx
      AdminCommandPalette.tsx
    shared/
      StatCard.tsx
      FilterBar.tsx
      DataTable.tsx
      StatusBadge.tsx
      Pagination.tsx
      DateRangePicker.tsx
      ConfirmDialog.tsx
      FormDrawer.tsx
      MediaPicker.tsx
      EmptyState.tsx
      ErrorState.tsx
    overview/                     # A: chart, donut, calendar, list widgets
    bookings/                     # B: table, detail, create/edit, print view
    properties/                   # C: grid/list, editor, rates, inventory
    combos/                       # D: list, detail, itinerary, departures
    content/                      # E: list, editor, SEO preview, media
    crm/                          # F: customer table, profile, pipeline, follow-up
  lib/admin/
    types.ts
    formatters.ts
    validators.ts
    selectors.ts
    permissions.ts
    repositories/
      contracts.ts
      demo.ts
      api.ts                      # Chỉ triển khai khi có API thật được phép
  data/admin/
    fixtures.ts
    fixture-clock.ts
  styles/
    admin-tokens.css
    admin.css
public/images/dinh-van-booking/
docs/admin/
  reference-map.md
  asset-audit.md
  reference-deviations.md
  ui-verification.md
  implementation-status.md
  screenshots/
tests/admin/
  navigation.spec.ts
  overview.spec.ts
  bookings.spec.ts
  properties.spec.ts
  combos.spec.ts
  content.spec.ts
  crm.spec.ts
  consistency.spec.ts
```

Không tạo một file `page.tsx` hàng nghìn dòng chứa mọi table/form của 6 màn. Cũng không tạo abstraction quá chung khiến mỗi card phải truyền hàng chục prop khó căn ảnh. Shared UI có giá trị thì tái sử dụng; phần bố cục riêng để trong module tương ứng.

Có thể dùng query như `?selected=<id>`, `?tab=seo`, `?stage=new` để mở deep link; validate giá trị và dùng ID không chứa PII. Reset filter không được làm người dùng mất form đang chỉnh mà không cảnh báo.

---

## 16. Kiểm thử kỹ thuật và thị giác

### 16.1. Kiểm tra trước khi chụp

Chạy lint, typecheck, production build và test theo script thực tế trong `package.json`. Nếu chưa có script, bổ sung phù hợp; không giả định CLI lint của một phiên bản framework khác vẫn dùng được. Không tắt rule/TypeScript chỉ để báo PASS.

Kiểm tra console: không hydration mismatch, invalid nesting, missing key, failed image/font request, undefined icon export. Không chấp nhận chỉ chạy dev server rồi bỏ qua build.

Dữ liệu, demoClock và selected record cố định. Storage được reset về fixture gốc cho mỗi bài test; mutation test không làm ảnh của màn tiếp theo thay đổi ngoài ý muốn. Browser context có locale/timezone nhất quán, zoom 100%, device scale factor 1.

### 16.2. Chụp đầy đủ 6 màn

Mỗi màn chụp:

```text
A/B/C/D/E/F — viewport chuẩn 1448 × 1086 hoặc đúng kích thước nguồn đã xác nhận
A/B/C/D/E/F — full-page desktop
A/B/C/D/E/F — mobile 390 × 844
Các màn có bảng/form — thêm 1280 × 900, 1024 × 900 và 375 × 812
```

Đợi font ready, ảnh load/decode, skeleton biến mất và chart có kích thước. Nếu ảnh lazy chưa tải, cuộn qua để tải rồi trở lại vị trí cần chụp. Không sửa tài liệu/ảnh chuẩn để làm bài test pass.

Đối chiếu 1:1 với ảnh người dùng bằng overlay 50% và ảnh diff nếu có công cụ. So theo nhóm: shell → vị trí/width các panel → typography → ảnh → icon → bề mặt → trạng thái tương tác. Không resize/scale actual để giấu sai lệch.

Các trạng thái mở rộng cần thêm screenshot:

- B: selected booking, confirm/cancel dialog, validation lỗi và bản in.
- C: create/edit drawer, modal giá, inventory conflict.
- D: selected combo và itinerary editor.
- E: editor, media picker, SEO tab, unsaved changes.
- F: selected customer, kéo/chuyển inquiry và follow-up form.

### 16.3. Phân biệt hai loại baseline

**Design reference** là PNG người dùng đặt trong `references/`. Đây là đích để căn chỉnh.

**Regression baseline** là screenshot của code đã được đối chiếu/duyệt. Playwright hỗ trợ screenshot comparison, nhưng kết quả render có thể khác theo môi trường, vì vậy phải cố định môi trường khi so.[T6] Tạo baseline từ bản code đầu tiên rồi test PASS không chứng minh đã giống thiết kế.

Không tự tuyên bố “100%” từ SSIM hoặc pixelmatch. Ảnh/font chưa có lớp gốc, antialias và các điều chỉnh dữ liệu đúng logic đều phải liệt kê. Mục tiêu căn các mép/grid tới sai lệch khoảng 2–4 px ở vùng có thể tái tạo, nhưng không cắt chữ hoặc phá khả năng dùng để đạt con số đó.

Báo cáo theo vùng, ví dụ:

```text
A / Sidebar: đã khớp hình học; ảnh trang trí là bản thay thế.
B / Booking table: bố cục đã đối chiếu; payment sublabel bổ sung để rõ nghiệp vụ.
E / Form: font đúng; asset cover chưa có bản sạch, đã ghi asset-audit.
```

### 16.4. Các bài test chức năng tối thiểu

| Nhóm | Ca kiểm thử |
|---|---|
| Navigation | Đủ 6 màn, 2 entry tab phụ, direct URL/reload, active sidebar, không 404 |
| Global search | Tìm booking/customer/property, chọn đúng record, Escape trả focus |
| Date/filter | Đổi range, clear, no results, invalid query, reset pagination |
| Table | Sort, page size, selection indeterminate, bulk đúng phạm vi |
| Booking | Create, pending → confirmed, cancel có lý do, payment không tự đổi |
| Pricing | Giá thường/cuối tuần/mùa, xung đột rule, số tiền và đơn vị |
| Inventory | Ngày checkout không bị giữ thêm đêm, maintenance, over-capacity conflict |
| Combo | Ngày/đêm khớp itinerary, reorder, duplicate draft, historical price giữ nguyên |
| Content | Slug giữ sau manual edit, unsaved guard, tags, preview, missing SEO fields |
| Media | File hợp lệ/không hợp lệ, chọn cover, reorder, asset đang dùng không bị xóa nhầm |
| CRM | Thêm note, đổi owner/stage, follow-up, inquiry không lẫn customer status |
| Export/print | Unicode, đúng filter, đúng loại file, không formula injection từ text |
| Error | Save failure không mất form, retry, double-click không tạo hai record |
| A11y | Keyboard modal, close/return focus, SVG accessible label, zoom 200% |
| Consistency | Count/tổng tiền/occupancy/selected ID thống nhất xuyên A–F |

Mỗi bài test ghi lệnh, kết quả và bằng chứng. Nếu môi trường không có browser hoặc không chạy được một nhóm test, báo rõ nhóm đó **chưa được kiểm chứng**, không gán PASS và không xóa test để che hạn chế.

---

## 17. Trình tự thực hiện — làm đến khi có đủ 6 màn

### Giai đoạn 1 — Audit và mapping

Đọc source, nhận diện đủ ảnh, đo kích thước, lập `reference-map.md`; kiểm tra asset/font/library/route hiện có. Chốt điểm khác biệt và phạm vi demo. Không hỏi lại chủ dự án bố cục đã thể hiện rõ trong ảnh.

### Giai đoạn 2 — Nền UI dùng chung

Dựng AdminShell, menu/topbar/footer, tokens, ba vai trò font, icon SVG, form/table/dialog primitives. Tạo fixture/store và clock; kiểm tra glyph tiếng Việt trước khi dựng hàng chục component.

### Giai đoạn 3 — Dựng đủ 6 màn chính

Hoàn thiện khung A–F trước, không chỉ chăm chút A rồi bỏ năm màn còn lại. Thứ tự gợi ý: A → B → C → D → E → F. Mỗi màn phải có ảnh đối chiếu, selected/default state và nội dung chính đúng.

### Giai đoạn 4 — Hoàn thiện tương tác

Thêm các drawer/modal/form/tab đã đặc tả; filter/sort/pagination, chart/calendar, media, editor, pipeline và các deep link. Tích hợp state xuyên màn; lỗi/empty/permission/demo feedback đầy đủ.

### Giai đoạn 5 — Responsive và kiểm chứng

Chạy build/tests, kiểm tra font/icon, chụp desktop/mobile, overlay với ảnh. Sửa geometry/spacing trước, sau đó text/icon/surface. Lặp đến khi đạt tiêu chí; không dùng việc thiếu một asset để dừng các phần còn làm được.

### Giai đoạn 6 — Bàn giao

Bàn giao code trong repo, lệnh chạy, routes thực tế, source thay đổi, checklist mỗi màn, screenshot và lỗi/sai khác còn lại. Không cung cấp preview URL chưa thực sự chạy/kiểm tra. Không tự deploy production.

---

## 18. Checklist hoàn thành

```text
[ ] Đã nhận diện ảnh a–f bằng nội dung, không nhầm thứ tự file.
[ ] Có reference-map.md với file/kích thước/route thực tế.
[ ] Dùng đúng tên Đinh Vân Booking, không lỗi Văn/Vân.
[ ] Cả 6 màn chính đã có code, không chỉ Tổng quan.
[ ] AdminShell dùng chung, active sidebar đúng, không làm hỏng public website.
[ ] Màu xanh–kem, serif/UI/script đúng vai trò, không đổi sang template chung.
[ ] Font đã tải và render thật; dấu tiếng Việt không lỗi/cắt/mất glyph.
[ ] Icon SVG có export hợp lệ; không emoji/icon font/ảnh icon mờ.
[ ] Bảng, form, chart, calendar là component thật, không phải screenshot.
[ ] A có 6 KPI và đủ các khối đa cột theo ảnh.
[ ] B có filter, table, selected detail, action, export và print.
[ ] C có 4 card, editor, loại phòng, rule giá và inventory.
[ ] D có list-detail, 5 tab, itinerary và departure editor.
[ ] E có table-editor, SEO preview/checklist, nội dung và media.
[ ] F có CRM table, profile, pipeline, note và follow-up.
[ ] Chức năng thêm/sửa/ẩn/tìm/lọc/đổi trạng thái đã thao tác được.
[ ] Booking status, payment status, publishing và inquiry stage tách biệt.
[ ] Giá/KPI/count/occupancy dùng chung nguồn dữ liệu, không chép lỗi số học mẫu.
[ ] Các luồng A→B, A→F, F→B, B↔C và catalog/media đã kiểm tra.
[ ] Demo không gọi/gửi tin/thu tiền/publish/đồng bộ OTA thật.
[ ] Không giả module Khuyến mãi/Thanh toán/Báo cáo/Cài đặt đã hoàn tất.
[ ] Có loading/empty/error/retry/validation/unsaved/conflict state.
[ ] Responsive 1448/1280/1024/768/390/375 không che dữ liệu hay nút.
[ ] Keyboard, focus, modal và zoom 200% dùng được.
[ ] Lint/typecheck/build và browser tests có kết quả thực tế.
[ ] Có screenshot của đủ 6 màn desktop/mobile, overlay và deviation log.
[ ] Thiếu asset/font/API/test đã được ghi đúng, không tự nhận 100%.
[ ] Không tự push/merge/deploy production, không thay dữ liệu thật.
```

### Mẫu báo cáo Agent phải trả cuối công việc

```text
ĐÃ TRIỂN KHAI
A — Tổng quan: <route / trạng thái>
B — Đặt phòng: <route / trạng thái>
C — Phòng nghỉ: <route / trạng thái>
D — Combo du lịch: <route / trạng thái>
E — Điểm đến & nội dung: <route / trạng thái>
F — Khách hàng & tư vấn: <route / trạng thái>

FONT THỰC TẾ: ...
ICON / LOGO: ...
CHẾ ĐỘ DỮ LIỆU: DEMO / API — phạm vi thực tế...
TƯƠNG TÁC ĐÃ THỬ: ...
LINT / TYPECHECK / BUILD: ...
BROWSER / RESPONSIVE / A11Y: ...
SCREENSHOT / OVERLAY: <đường dẫn thật>
SAI KHÁC SO VỚI ẢNH: ...
PHẦN CHƯA KIỂM CHỨNG / CHƯA TRIỂN KHAI: ...
ASSET / THÔNG TIN CẦN CHỦ WEBSITE CUNG CẤP: ...
LỆNH CHẠY: ...
PRODUCTION: Chưa triển khai / trạng thái thực tế được phép.
```

Không cần chủ dự án duyệt lại từng section để tiếp tục code nếu không có blocker thực sự. Khi thiếu thông tin kinh doanh, dùng config `null`/demo có nhãn và hoàn thiện UI; không tự bịa dữ liệu thật hoặc hỏi đi hỏi lại.

---

## 19. Nguồn kỹ thuật để Agent đối chiếu

Nguồn bên dưới chỉ hỗ trợ quyết định về font, SVG, screenshot và accessibility. Chúng không xác minh giá phòng, số liệu kinh doanh, đánh giá, thông tin khách hay địa chỉ trong ảnh. Các route, kích thước, token và rule demo trong tài liệu là lựa chọn thiết kế/triển khai, không phải tiêu chuẩn bắt buộc của thư viện.

**[T1] Next.js — Font Optimization:** Google/local fonts và self-hosting.

`https://nextjs.org/docs/app/getting-started/fonts`

**[T2] Google Fonts — Playfair Display metadata:** family và subset tiếng Việt.

`https://raw.githubusercontent.com/google/fonts/main/ofl/playfairdisplay/METADATA.pb`

**[T3] Google Fonts — Roboto Condensed metadata:** family và subset tiếng Việt.

`https://raw.githubusercontent.com/google/fonts/main/ofl/robotocondensed/METADATA.pb`

**[T4] Google Fonts — Dancing Script metadata:** family và subset tiếng Việt.

`https://raw.githubusercontent.com/google/fonts/main/ofl/dancingscript/METADATA.pb`

**[T5] Lucide — React:** inline SVG, imports và cấu hình icon.

`https://lucide.dev/guide/react`

**[T6] Playwright — Visual comparisons:** screenshot assertion và ảnh hưởng môi trường render.

`https://playwright.dev/docs/test-snapshots`

**[T7] MDN — FontFaceSet.check():** giới hạn của phép kiểm tra, không chứng minh đủ glyph.

`https://developer.mozilla.org/en-US/docs/Web/API/FontFaceSet/check`

**[T8] W3C WAI-ARIA APG — Modal Dialog Pattern:** focus, keyboard và modal semantics.

`https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/`

---

## 20. Lệnh giao việc ngắn

```text
Đọc toàn bộ DINH_VAN_BOOKING_ADMIN_OPUS.md, AGENTS.md và source hiện có.
Mở tất cả ảnh trong references/; nhận diện đúng 6 màn bằng nội dung ảnh,
không mặc định tên a–f luôn đúng thứ tự.

Lập trình đầy đủ admin Đinh Vân Booking theo từng ảnh:
Tổng quan, Đặt phòng, Phòng nghỉ, Combo du lịch,
Điểm đến & nội dung, Khách hàng & yêu cầu tư vấn.

Giữ tone xanh–kem, font serif/UI/script, icon SVG và bố cục như mẫu.
Dùng chung shell/component/data, hoàn thiện CRUD demo, filters,
forms, drawer, calendar, chart, media, pipeline và responsive.

Không chỉ trả kế hoạch. Sau mỗi màn hãy chạy browser, chụp screenshot,
đối chiếu ảnh, sửa sai khác và kiểm tra font/icon tiếng Việt.
Không báo đã gửi tin/thu tiền/publish thật khi mới làm frontend.
Không tự push, merge hoặc deploy production.
Bàn giao code và bằng chứng kiểm thử của đủ 6 màn.
```

# AGENT OPUS — LẬP TRÌNH 6 MÀN HÌNH ĐINH VÂN BOOKING

> **Bản tổng hợp:** toàn bộ quy chuẩn dùng chung và sáu đặc tả màn hình trong một file Markdown.
>
> **Đầu ra yêu cầu cho Agent:** frontend responsive có tương tác, đúng các ảnh trong thư mục `references/`, có kiểm tra font/icon và bằng chứng đối chiếu bằng trình duyệt. Tài liệu này không phải xác nhận website đã được lập trình.

## Cách thực hiện

Đọc quy chuẩn chung trước, sau đó triển khai lần lượt 01 → 02 → 03 → 04 → 05 → 06. Giữ nhận diện homepage hiện có; không dựng lại thiết kế khác. Nếu dùng bản này, không cần đọc lặp các file màn hình riêng vì nội dung giống nhau.

Ảnh cần đi cùng tài liệu để đối chiếu: `references/01-phong-nghi.png`, `02-chi-tiet-phong.png`, `03-combo-du-lich.png`, `04-diem-den.png`, `05-lien-he.png`, `06-dat-phong.png`. Trong gói ZIP, toàn bộ ảnh nằm đúng thư mục; khi chỉ tải MD riêng, cần cung cấp các ảnh tham chiếu cho Agent.

## Mục lục

- [Quy chuẩn chung](#quy-chuan)
- [01 — Danh sách phòng nghỉ](#mh-01)
- [02 — Chi tiết phòng nghỉ](#mh-02)
- [03 — Combo du lịch](#mh-03)
- [04 — Điểm đến](#mh-04)
- [05 — Liên hệ / tư vấn riêng](#mh-05)
- [06 — Đặt phòng / xem lại](#mh-06)

---

<a id="quy-chuan"></a>

## AGENT OPUS — QUY CHUẨN CHUNG CHO 6 MÀN HÌNH ĐINH VÂN BOOKING

> **Mục tiêu:** lập trình giao diện thật, bám sát sáu ảnh tham chiếu đã được cung cấp; cùng hệ thiết kế với homepage. Không sáng tạo lại bố cục, không chỉ dựng trang tĩnh bằng ảnh.
>
> **Thương hiệu duy nhất:** **Đinh Vân Booking**. Không viết thành “Đinh Văn Booking”. Phong cách cá nhân, bản địa, gần gũi với thiên nhiên Cúc Phương — Ninh Bình; không biến thành giao diện sàn OTA đại trà.
>
> **Phạm vi:** frontend responsive và tương tác đầy đủ để trình diễn. Chưa triển khai backend, thu tiền, xác nhận tồn phòng, gửi email/SMS, admin hoặc đăng nhập mới.

### 1. Đọc đầu vào và xác định phạm vi

Đọc `AGENTS.md`, source, `package.json`, lockfile, tài liệu homepage và assets hiện có trước khi sửa. Tiếp tục trong dự án đang có; không dựng ứng dụng thứ hai. Nếu chưa có source, khởi tạo **Next.js App Router + TypeScript**; dùng CSS Modules hoặc Tailwind kết hợp CSS riêng. Không tự nâng major framework/UI library để làm nhiệm vụ này.

Sáu file màn hình trong bộ này:

| Mã | File đặc tả | Route đề xuất | Ảnh chuẩn |
|---|---|---|---|
| 01 | `01_PHONG_NGHI.md` | `/phong-nghi` | `references/01-phong-nghi.png` |
| 02 | `02_CHI_TIET_PHONG.md` | `/phong-nghi/[slug]` | `references/02-chi-tiet-phong.png` |
| 03 | `03_COMBO_DU_LICH.md` | `/combo-du-lich` | `references/03-combo-du-lich.png` |
| 04 | `04_DIEM_DEN.md` | `/diem-den` | `references/04-diem-den.png` |
| 05 | `05_LIEN_HE.md` | `/lien-he` | `references/05-lien-he.png` |
| 06 | `06_DAT_PHONG.md` | `/dat-phong` | `references/06-dat-phong.png` |

Cả sáu PNG có kích thước **1448 × 1086 px**. `references/00-homepage.png` dùng đối chiếu nhận diện và regression, không phải yêu cầu thiết kế lại trang chủ. `references/manifest.json` ghi tên ảnh gốc, kích thước và SHA-256 để tránh chọn nhầm ảnh.

Đặc tả mới thay thế các hành vi tạm của homepage: menu không còn chỉ cuộn tới section; phòng nghỉ phải mở route chi tiết thật. **Không đổi diện mạo homepage**, chỉ nối các liên kết và state cần thiết.

Không tự push, merge, deploy production, tạo tài khoản dịch vụ, mua asset hoặc thực hiện giao dịch. Chỉ làm những thao tác này khi có yêu cầu riêng.

### 2. Thứ tự ưu tiên và các ngoại lệ có chủ đích

Ưu tiên: bố cục ảnh chuẩn → hình ảnh → font/nhịp chữ → màu/icon → tương tác → responsive → motion nhẹ. Tuy nhiên, tính đúng đắn, khả năng sử dụng và tính trung thực của thông tin không được hy sinh để sao chép lỗi trong ảnh.

Ảnh thiết kế có một số chi tiết không nhất quán. Bắt buộc hiệu chỉnh khi code:

- Menu active phải theo route, không để “Trang chủ” active trên trang chi tiết/đặt phòng như một số ảnh.
- Số kết quả, facet count, số ảnh gallery và pagination phải phản ánh dữ liệu thật trong fixture.
- Add-on được tính tiền phải ở trạng thái đã chọn; giá phải đúng room type. Không chép mâu thuẫn ở ảnh checkout.
- Các chuỗi sai dấu “Đinh Văn” sửa thành “Đinh Vân”. Điện thoại, email, địa chỉ chi tiết, đánh giá, năm và lời cam kết trong ảnh chưa phải thông tin đã xác minh.
- Không gán ảnh nhân vật minh họa thành ảnh thật của chủ thương hiệu hoặc khách hàng.

Ghi các hiệu chỉnh trên trong `docs/ui-verification.md`, phân biệt với sai lệch do chưa làm được. Không lấy ngoại lệ làm lý do đổi bố cục hoặc bỏ bớt section.

**Cấm:** screenshot phủ toàn trang, canvas giả UI, hotspot trên ảnh, `zoom`/`transform: scale()` thu nhỏ artboard, chữ nhúng ảnh thay DOM, emoji/icon font, `href="#"` vô nghĩa, button lồng button/link, tắt typecheck để né lỗi.

Mục tiêu là sát mẫu nhất có thể. Không báo “giống 100%” nếu chưa đối chiếu hoặc vẫn dùng ảnh/font thay thế. PNG không chứa tên font gốc hoặc tất cả lớp hình sạch.

### 3. Hệ thiết kế chung

#### 3.1. Màu, khoảng cách, bề mặt

Tái sử dụng token đã có của homepage. Bộ dưới đây là điểm khởi tạo theo mẫu, không phải phép đo màu tuyệt đối:

```css
:root {
  --dvb-green-950: #153524;
  --dvb-green-900: #194526;
  --dvb-green-800: #235c31;
  --dvb-green-700: #2e6d3b;
  --dvb-sage: #8eaa79;
  --dvb-cream: #f6f4ec;
  --dvb-paper: #fffefa;
  --dvb-surface: #ffffff;
  --dvb-text: #18221c;
  --dvb-muted: #6d746f;
  --dvb-border: #e8ebe4;
  --dvb-rating: #f2a11a;
  --dvb-radius-card: 10px;
  --dvb-radius-button: 8px;
  --dvb-radius-search: 23px;
  --dvb-shadow-card: 0 2px 12px rgb(27 54 32 / 5%);
  --dvb-shadow-floating: 0 8px 24px rgb(15 36 18 / 14%);
}
.content-shell {
  width: min(1376px, calc(100% - 72px));
  margin-inline: auto;
}
```

Nền trắng/kem, xanh rừng đậm ở CTA, vàng nhỏ ở rating, ánh đèn gỗ ấm trong ảnh. Không neon, nền đen, gradient tím, khung kính quá mạnh, card bo 30–40 px hoặc shadow đen nặng. Lá ở mép và silhouette rừng footer chỉ là trang trí nhẹ.

Lề mỗi màn có thể khác chút theo ảnh. Header/hero dùng container riêng nếu cần; không ép mọi section chung tọa độ. Dùng Grid/Flex; absolute chỉ dành cho trang trí, badge và các lớp overlay thật sự.

#### 3.2. Font — không được thay tùy ý

| Vai trò | Font ưu tiên | Weight | Cỡ desktop khởi tạo |
|---|---|---|---|
| Logo, H1, H2 | Playfair Display | 600–700 | Logo 20–22; H1 34–44; H2 20–26 px |
| Menu, tên phòng, form, giá, nội dung | Roboto Condensed | 400–700 | Nội dung 12–14; tên/giá 14–16 px |
| Lời nhắn, câu viết tay, chữ ký | Dancing Script | 400–600 | 22–36 px tùy vị trí |

Đây là bộ font thay thế được chọn theo hình dáng ảnh, không khẳng định đúng tên font gốc. Ba family đều khai báo subset tiếng Việt trong metadata chính thức. [S2][S3][S4]

Dùng `next/font/google` và khai báo tập trung một lần; Next.js phục vụ font cùng ứng dụng thay vì để trình duyệt tải font từ Google lúc truy cập. [S1] Nếu build không lấy được font, dùng `next/font/local` với asset do dự án cung cấp hoặc lấy từ nguồn được phép và đã kiểm tra glyph. Không âm thầm chuyển sang font hệ thống. Bộ bàn giao này **không chứa file font**.

```ts
// src/app/fonts.ts — tái sử dụng file đang có nếu đã cấu hình.
import { Playfair_Display, Roboto_Condensed, Dancing_Script } from 'next/font/google';

export const displayFont = Playfair_Display({
  subsets: ['latin', 'latin-ext', 'vietnamese'],
  weight: ['600', '700'], style: 'normal', display: 'swap',
  variable: '--font-dvb-display',
});
export const uiFont = Roboto_Condensed({
  subsets: ['latin', 'latin-ext', 'vietnamese'],
  weight: ['400', '500', '600', '700'], style: 'normal', display: 'swap',
  variable: '--font-dvb-ui',
});
export const scriptFont = Dancing_Script({
  subsets: ['latin', 'latin-ext', 'vietnamese'],
  weight: ['400', '500', '600'], style: 'normal', display: 'swap',
  variable: '--font-dvb-script',
});
```

Gắn đủ ba biến trên root layout và `lang="vi"`. Tên export/options phải được typecheck với phiên bản đang cài. Không tạo thêm một bộ font ở mỗi route.

```css
body {
  font-family: var(--font-dvb-ui), Arial, sans-serif;
  font-synthesis: none;
}
h1, h2, .brand-wordmark {
  font-family: var(--font-dvb-display), Georgia, serif;
}
.handwritten {
  font-family: var(--font-dvb-script), cursive;
  font-style: normal;
  line-height: 1.25;
  padding-block: .08em;
  overflow: visible;
}
```

Nếu dùng italic ở quote, tải face italic thật phù hợp thay vì nghiêng giả. Không `scaleX` text. Chỉnh sai xuống dòng theo thứ tự: font đã render → weight → container → size → spacing. Không làm chữ quá nhỏ để nhét trang vào 1086 px. Mobile: body/form 14–16 px, input ưu tiên 16 px, metadata tối thiểu 12 px theo tiêu chí dự án.

#### 3.3. UTF-8 và dấu tiếng Việt

Mọi source/JSON/MD dùng UTF-8, nội dung NFC. Thêm `.editorconfig` nếu chưa có. Không bỏ dấu, không `escape/unescape`, không coi UTF-8 là Latin-1.

Chuỗi test cho cả ba font:

```text
Đinh Vân Booking — Cúc Phương, Ninh Bình
Đặt phòng, trải nghiệm, nghỉ dưỡng, những điều bình yên.
Ă Â Đ Ê Ô Ơ Ư ă â đ ê ô ơ ư
Ắ Ằ Ẳ Ẵ Ặ Ấ Ầ Ẩ Ẫ Ậ Ế Ề Ể Ễ Ệ
Ố Ồ Ổ Ỗ Ộ Ớ Ờ Ở Ỡ Ợ Ứ Ừ Ử Ữ Ự
650.000đ / đêm — 1.200.000đ / người
```

Đợi `document.fonts.ready`; kiểm tra network font, font-face được tải và **Rendered Fonts** trong DevTools trên chữ có dấu. Một mình computed `font-family` hoặc `document.fonts.check()` không đủ xác nhận glyph/font thực sự đang render. [S7] Kiểm tra cả cold load, warm load và zoom 200%.

Không cắt dấu bởi `line-height` quá chặt/`overflow: hidden`. Scan `U+FFFD` và chuỗi mojibake như `Ä‘`, `Æ°`, `áº`, `á»`; không gán mọi chữ “Â/Ã” hợp lệ thành lỗi.

#### 3.4. Icon và logo

Dùng `lucide-react` hoặc bộ SVG chức năng tương đương đã có. Lucide render icon bằng inline SVG, hỗ trợ size, color, stroke qua props. [S5] Xác minh export tồn tại trong phiên bản lockfile; không đoán tên và không dùng dynamic import toàn thư viện.

| Nhóm | Biểu tượng cần có |
|---|---|
| Điều hướng | Search, ArrowRight, ChevronDown/Left/Right, Menu, X |
| Tìm phòng | CalendarDays, Users, SlidersHorizontal, Tag, House |
| Thẻ phòng | Heart, Star, MapPin, Wifi, Coffee, BedDouble |
| Nội dung | Leaf, Map, Clock, ShieldCheck, MessageCircle, Phone, Mail |
| Checkout | Check, Pencil, LockKeyhole, CreditCard, Landmark, Bike, Car |

Tên trên là gợi ý; chọn export hợp lệ, không tắt lỗi TypeScript. Icon nhỏ 14–16 px, CTA 16–20 px, form 22–26 px, feature 26–32 px; stroke khoảng 1.7–2 px; `currentColor`, `flex-shrink: 0`, kích thước không bằng 0. Filled heart/star/leaf dùng SVG phù hợp để khớp ảnh.

Logo núi dùng SVG riêng; wordmark là text. Social/Zalo dùng SVG thương hiệu có nguồn hợp lệ; không giả định Lucide có đủ logo thương hiệu. Thiếu asset thì hiển thị nút chữ đúng nghĩa và ghi rõ, không vẽ biểu tượng sai. Không emoji hoặc icon font ở bất kỳ màn hình nào.

Nút icon có `aria-label`; favorite có `aria-pressed`; SVG trang trí `aria-hidden`. Kiểm tra màu ở normal/hover/active/disabled/focus. Không để icon trắng biến mất trên nền trắng.

### 4. Shell chung và liên kết giữa các trang

Header cao khoảng 50–54 px ở desktop chuẩn. Trái: logo và tagline; giữa: menu; phải: thông điệp bản địa, nút search tròn, nút “Đặt ngay” xanh. Không thêm login, giỏ hàng, switch ngôn ngữ hoặc banner lạ.

| Thành phần | Hành vi |
|---|---|
| Logo, Trang chủ | `/` |
| Phòng nghỉ | `/phong-nghi`; active cả route chi tiết |
| Combo du lịch | `/combo-du-lich` |
| Điểm đến | `/diem-den` |
| Liên hệ | `/lien-he` |
| Search header | Mở search dialog dùng bộ chọn ngày/khách chung |
| Đặt ngay | Mở `/phong-nghi` để chọn; chỉ tới checkout khi đã có lựa chọn hợp lệ |

Header mặc định không sticky nếu homepage không sticky. Nếu có sticky, giữ nguyên trạng thái đầu trang và không che focus/anchor. Không active nhầm “Trang chủ” trên checkout; checkout nhấn CTA chứ không cần thêm menu mới.

Footer cùng logo, liên kết, contact, social, quote và silhouette rừng nhạt. Footer checkout có cột hỗ trợ như ảnh. Giữ chiều cao gọn và style nhất quán, không chép sáu bản component khác nhau.

Contact lấy từ `siteConfig`, trường chưa xác minh để `null`. Không tạo `tel:`, Zalo/social/email hoặc đường chỉ dẫn đến giá trị giả trong ảnh. Khi thiếu config, mở dialog “Thông tin liên hệ đang được cập nhật”, không để CTA chết. Copyright lấy năm cấu hình/hiện tại, không khóa 2024.

### 5. Ảnh và dữ liệu demo

Mở đúng PNG từng trang trước khi code. Tìm ảnh sạch trong source trước. Có thể dùng crop **chỉ chứa ảnh** đủ chất lượng để preview; không crop cả chữ, badge, heart hoặc giá rồi vẽ UI lần nữa. Không đặt PNG tham chiếu làm nền của route.

Hero nhiều trang có chữ, bảng gỗ và người đã ghép sẵn: không mặc định tách sạch được. Nếu thiếu ảnh nền/portrait nguyên bản, chuẩn bị asset phù hợp có nguồn sử dụng, ghi sai khác vào `docs/asset-audit.md` và tiếp tục hoàn thiện phần còn lại. Không gọi ảnh thay thế là khớp tuyệt đối.

Asset local, alt phù hợp, ảnh trang trí alt rỗng; mỗi ảnh có kích thước/tỷ lệ, `object-fit: cover`, `object-position` riêng. Chỉ ưu tiên tải hero/ảnh chính thực sự quan trọng. Gallery/map/dialog nặng tải khi cần; không hotlink ảnh ngẫu nhiên. API của `next/image` dùng đúng phiên bản repo.

Tất cả giá, ratings, tên khách, mô tả, ưu đãi, tiện ích, thời gian và địa chỉ trong mẫu là **fixture**, không phải xác minh thương mại. Đánh dấu `isDemo` trong dữ liệu; preview đặt `noindex`, không phát structured data Hotel/Offer/Review từ fixture. Trước public production phải có dữ liệu/ảnh/quyền sử dụng và thông tin nhận diện đã duyệt.

Bản đồ minh họa có nhãn nhỏ “Bản đồ minh họa”, không giả định pins đúng địa lý. Chỉ bật chỉ đường thật khi có dữ liệu vị trí đã xác nhận. Không tự lấy vị trí hiện tại của người dùng.

Không nhúng cam kết chưa xác nhận như “30 phút”, “24/7”, “không qua trung gian”, “1.000+ khách”, “SSL 256-bit” thành sự thật đã kiểm chứng. Preview có thể giữ copy thiết kế để duyệt, nhưng phải đưa vào danh sách cần chủ website duyệt và không phát hành như thông tin thật.

### 6. Kiến trúc và state chia sẻ

Gợi ý dưới đây không bắt buộc đổi cấu trúc repo đang ổn:

```text
src/
  app/(public)/
    phong-nghi/page.tsx
    phong-nghi/[slug]/page.tsx
    combo-du-lich/page.tsx
    diem-den/page.tsx
    lien-he/page.tsx
    dat-phong/page.tsx
  components/
    layout/                 # Header, Footer, BrandLogo, MobileMenu
    shared/                 # Hero, DateRangePicker, GuestPicker, FavoriteButton
    stays/                  # Filters, StayCard variants, Gallery, RoomTypeCard
    combos/                 # ComboFilters, ComboCard, ComboDetailDialog
    destinations/           # DestinationCard, ItineraryTabs, LocalMapPreview
    contact/                # ConsultationForm, AdvisorCard, QuickContact
    booking/                # Steps, GuestForm, AddOns, PriceSummary, ReviewStep
    ui/                     # Button, Dialog, Drawer, Tabs, Accordion, Field
  data/fixtures/            # Dữ liệu có type, ID/slug ổn định
  config/site.ts
  lib/booking/              # Validation, dates, filters, price calculations
  lib/services/            # Adapter demo, hợp đồng để nối API sau
  styles/                   # Tokens và page-specific modules
public/images/dinh-van-booking/
docs/                       # Asset audit, verification, implementation status
tests/                      # Unit, interaction, visual regression
```

Render nội dung tĩnh bằng server components khi phù hợp; chỉ widget cần state mới client. Không dùng `window/localStorage/Date.now()` trực tiếp trong render gây hydration lệch. Không tạo store toàn cục cho mọi chi tiết nhỏ.

Dùng chung selection ngày/khách/phòng và favorites theo ID. Query URL chỉ chứa dữ liệu tìm kiếm không nhạy cảm, ví dụ:

```text
/phong-nghi?checkIn=2026-10-16&checkOut=2026-10-18&adults=2&children=0&rooms=1
/dat-phong?stay=cuc-phuong-forest-homestay&room=standard-garden&checkIn=2026-10-16&checkOut=2026-10-18&adults=2&children=0&rooms=1
/lien-he?intent=combo&item=kham-pha-rung-cuc-phuong
```

Đây chỉ là ví dụ, không khóa ngày trên UI. Parse/validate query; ID lạ, `NaN`, giá âm, checkout trước check-in phải được xử lý. Không nhận giá từ query hoặc localStorage như nguồn tin cậy. **Không đặt tên, số điện thoại, email, ghi chú vào URL, analytics hoặc log.**

Có thể lưu favorites/nhu cầu không nhạy cảm trong localStorage với version key và try/catch. Thông tin khách giữ trong memory trong flow; không tự persist dữ liệu cá nhân. Khi reload checkout có selection hợp lệ từ URL thì khôi phục lựa chọn, không khôi phục PII từ nơi không được phép.

Ngày lưu `YYYY-MM-DD` theo nghĩa ngày lịch; số đêm là chênh lệch ngày lịch, không phải số giờ qua timezone. Format hiển thị `vi-VN`; parse validation trước khi tính. Tối thiểu 1 người lớn, 1 phòng; children không âm; giới hạn occupancy theo fixture. Sức chứa không có nghĩa còn phòng theo ngày.

Dữ liệu qua adapter có trạng thái loading/empty/error để kiểm thử. Khi chưa có API, không tạo API route giả trả “đặt thành công”, không gửi form ra dịch vụ ngoài. UI chỉ được thông báo bản nháp/bản xem trước chưa gửi.

### 7. Responsive, accessibility và motion

| Chiều rộng | Quy tắc nền |
|---|---|
| 1448 px | Đối chiếu ảnh 1:1; giữ số cột và bố cục từng màn |
| 1280–1439 px | Giữ bố cục khi còn đọc được; giảm gap/lề vừa phải |
| 1024–1279 px | Giảm cột card, chuyển sidebar phụ xuống dưới hoặc thành drawer |
| 768–1023 px | Card 2–3 cột tùy màn, form 2 cột, header gọn |
| 375–767 px | Nội dung theo luồng một cột; lề 16–20 px; filter/menu drawer |

Không thu nhỏ toàn artboard, không giấu toàn section, không dùng `overflow-x: hidden` toàn trang để che lỗi. Heading và form không tràn; ảnh người không che CTA. Nút chính mobile cao 44 px trở lên theo tiêu chí dự án. Sticky bottom action phải có safe-area và padding cuối trang, không che nút/form/footer.

Một H1/trang, cấp H2/H3 đúng, landmark semantic, label thật, error liên kết input, focus-visible. Dialog/drawer trap focus, Escape, focus return, scroll lock đúng; không lồng hai focus trap hoạt động. Calendar/popover không bị `overflow: hidden` của hero cắt; portal cần z-index nhất quán.

Animation chỉ phục vụ phản hồi: 160–220 ms hover/focus, lift card tối đa 2–3 px, ảnh hover tối đa 1.03, mở dialog nhẹ. Không typewriter, autoplay testimonial, hạt bay hoặc parallax mạnh. Hỗ trợ `prefers-reduced-motion`; nội dung không phụ thuộc `opacity: 0` chờ JS.

### 8. Đối chiếu hình ảnh và nghiệm thu

Vòng lặp bắt buộc: **code → chạy trình duyệt → chụp → overlay ảnh chuẩn → liệt kê sai khác → sửa → chụp lại**. Không chỉ chạy build rồi kết luận giao diện đúng.

Mỗi màn chụp tại 1448 × 1086, deviceScaleFactor 1, zoom 100%, cùng browser/OS. Thêm 1440 × 900, 1024 × 900, 768 × 1024, 390 × 844 và 375 × 812 để kiểm tra responsive. Các kích thước phụ không có ảnh chuẩn trực tiếp.

Fixture/clock cố định trong môi trường kiểm thử; không random quote/ảnh; reset favorites; đóng popup; đợi font, decode ảnh, xử lý lazy loading rồi trở lại đầu trang. Chụp viewport và full-page riêng; không crop giấu phần tràn, không scale ảnh actual.

Overlay PNG gốc và actual opacity 50% cùng tọa độ. Đo mép header/hero/search/card/sidebar/footer; hướng tới sai số hình học khoảng 2–4 px khi asset cho phép. Đây là mục tiêu căn chỉnh, không phải cam kết tự động hoặc lý do cắt nội dung.

Dùng Playwright để lưu screenshot và regression; môi trường render ảnh hưởng kết quả so sánh nên phải cố định. [S6] **Ảnh chuẩn thiết kế khác baseline regression:** chỉ duyệt baseline từ code sau khi đã đối chiếu ảnh thiết kế; tạo baseline từ lần code đầu rồi test PASS không chứng minh bám mẫu. Không dùng một chỉ số SSIM/pixelmatch để tự nhận “100%”.

Artifact nghiệm thu:

```text
docs/ui-verification.md
docs/asset-audit.md
docs/implementation-status.md
artifacts/ui/01-phong-nghi/desktop.png
artifacts/ui/01-phong-nghi/full-page.png
artifacts/ui/01-phong-nghi/mobile.png
artifacts/ui/01-phong-nghi/overlay.png
# Tương tự cho 02..06, và ảnh trạng thái tương tác quan trọng.
```

Chạy lint/typecheck/build/test theo scripts thật của repo; thêm script nếu cần, không giả định command cũ của framework vẫn tồn tại. Không tắt rule hoặc che lỗi. Kiểm tra console, hydration, failed assets, keyboard, 200% zoom, back/forward, reload và điều hướng giữa trang.

Các test xuyên suốt: chọn ngày/khách từ homepage → listing → chi tiết → checkout giữ selection; favorites giữ giữa homepage/listing/detail; combo tư vấn chuyển đúng ngữ cảnh; form chưa gửi không báo thành công; checkout thay add-on cập nhật tổng đúng; route lỗi có state hợp lệ; nội dung demo không phát schema thương mại.

### 9. Trình tự thực hiện và bàn giao

1. Audit source, mở đủ 6 reference; xác nhận assets thật/thiếu và các component homepage tái sử dụng.
2. Hoàn thiện font, SVG, tokens, header/footer, widgets dùng chung trước.
3. Dựng 01 → 02 → 03 → 04 → 05 → 06; mỗi màn hoàn thiện desktop, responsive, state và test trước khi đánh dấu xong.
4. Nối luồng xuyên trang; sửa dead links và hợp nhất fixture/selection.
5. Chạy test và visual review toàn bộ, kiểm tra homepage không bị hồi quy.

Bảng báo cáo từng màn dùng trạng thái `DONE / PARTIAL / BLOCKED`, không đánh dấu DONE khi mới có route hoặc ảnh tĩnh. Thiếu asset không ngăn phần còn lại nhưng phải khai báo độ lệch. Nêu rõ việc Agent đã làm và phần chủ website cần cung cấp, không giao việc chỉnh source cho Editor.

```text
MÀN HÌNH / ROUTE:
REFERENCE ĐÃ ĐỐI CHIẾU:
LAYOUT / FONT / ICON:
TRẠNG THÁI TƯƠNG TÁC:
DESKTOP / TABLET / MOBILE:
LINT / TYPECHECK / BUILD / TEST:
SCREENSHOT / OVERLAY:
HIỆU CHỈNH LỖI TRONG MOCKUP:
SAI KHÁC CÒN LẠI:
ASSET / NỘI DUNG CẦN CHỦ WEBSITE DUYỆT:
```

Chỉ báo URL preview sau khi đã thực sự chạy và kiểm tra. Không tự triển khai production. Nhiệm vụ của Agent là làm và kiểm chứng, không chỉ trả lại kế hoạch.

### 10. Nguồn kỹ thuật

Nguồn dưới đây dành cho triển khai font/icon/test, không xác minh giá phòng, địa chỉ, lời chứng thực hoặc thông tin du lịch trong mockup.

- **[S1] Next.js — Font Optimization:** `https://nextjs.org/docs/app/getting-started/fonts`
- **[S2] Google Fonts — Playfair Display metadata:** `https://raw.githubusercontent.com/google/fonts/main/ofl/playfairdisplay/METADATA.pb`
- **[S3] Google Fonts — Roboto Condensed metadata:** `https://raw.githubusercontent.com/google/fonts/main/ofl/robotocondensed/METADATA.pb`
- **[S4] Google Fonts — Dancing Script metadata:** `https://raw.githubusercontent.com/google/fonts/main/ofl/dancingscript/METADATA.pb`
- **[S5] Lucide React — inline SVG:** `https://lucide.dev/guide/react`
- **[S6] Playwright — Visual comparisons:** `https://playwright.dev/docs/test-snapshots`
- **[S7] MDN — FontFaceSet.check:** `https://developer.mozilla.org/en-US/docs/Web/API/FontFaceSet/check`

---

<a id="mh-01"></a>

## MÀN HÌNH 01 — DANH SÁCH PHÒNG NGHỈ

> **Agent Opus:** lập trình route `/phong-nghi` bám sát ảnh dưới đây. Đọc `00_QUY_CHUAN_CHUNG.md` trước; dùng lại shell, Playfair Display / Roboto Condensed / Dancing Script, token xanh–kem và icon SVG của homepage. Không đổi thành layout listing khác.

![Màn hình danh sách phòng nghỉ](./references/01-phong-nghi.png)

### 1. Mục tiêu và bố cục

Khách tìm chỗ nghỉ theo nhu cầu, xem nhanh thông tin, mở chi tiết hoặc nhờ Đinh Vân tư vấn. Đây là listing curated mang tính cá nhân, không phải bảng quản trị.

```text
HEADER CHUNG — PHÒNG NGHỈ ACTIVE
HERO: BREADCRUMB / TIÊU ĐỀ / CÂU VIẾT TAY / NHÀ GỖ
SEARCH BAR NỔI: NGÀY / KHÁCH / GIÁ / LOẠI / TIỆN ÍCH / SORT / CTA
BỘ LỌC TRÁI     KẾT QUẢ + VIEW TOGGLE                BẢN ĐỒ
                4 THẺ × 2 HÀNG                      TƯ VẤN CÁ NHÂN
TƯ VẤN NHỎ      TESTIMONIALS + PAGINATION             FAQ
FOOTER CHUNG
```

Tại 1448 px, khởi tạo lề nội dung khoảng 36 px, sidebar trái 205–210 px, phải 275–280 px, gap 18–20 px; phần giữa khoảng 840–855 px. Search bar gần full width, nằm chồng nhẹ tại mép dưới hero. Hero khoảng 170–185 px dưới header, không lấy chiều cao hero homepage áp cho màn này. Đo lại PNG khi overlay; không dùng các số ước lượng như tọa độ tuyệt đối.

```css
.stays-layout {
  display: grid;
  grid-template-columns: 205px minmax(0, 1fr) 276px;
  gap: 20px;
  align-items: start;
}
.stays-results-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}
```

Không bỏ sidebar phải để nới card. Không đổi bốn card một hàng thành hai card ở viewport chuẩn. Không thêm khoảng trắng lớn giữa các khối.

### 2. Hero và thanh tìm kiếm

Breadcrumb “Trang chủ › Phòng nghỉ”; dấu phân cách bằng SVG. Copy chính:

```text
Phòng nghỉ Cúc Phương
Những nơi dừng chân giữa thiên nhiên trong lành

Từ homestay ấm cúng giữa rừng, đến những lodge mộc mạc bên núi,
Đinh Vân Booking tuyển chọn những nơi lưu trú chất lượng, để hành trình của bạn thêm trọn vẹn.
```

H1 serif trắng, dòng phụ viết tay. Bên phải có nhà gỗ/giường/đèn ấm; câu viết tay nhỏ “Một đêm ở rừng là một cuộc hẹn với bình yên”. Gradient trái đủ tối, không làm tối toàn ảnh. Lá sát mép, không che form.

Search bar nền trắng, bo 20–24 px, shadow mềm; các ô có icon trên nền kem và separator mảnh. Thứ tự:

| Ô | Mặc định | Tương tác |
|---|---|---|
| Ngày nhận phòng / Ngày trả phòng | Chọn ngày | Date range picker chung, trả phòng sau nhận phòng |
| Số khách | 2 khách | Adults/children/rooms, tối thiểu 1 adult và 1 room |
| Khoảng giá | Tất cả | Chọn preset hoặc nhập min/max, đồng bộ sidebar |
| Loại lưu trú | Tất cả | Chọn nhiều loại |
| Tiện ích | Tất cả | Chọn nhiều tiện ích |
| Sắp xếp | Phổ biến nhất | Featured, giá tăng, giá giảm, đánh giá cao |
| Tìm phòng | CTA xanh đậm | Validate, áp dụng, cập nhật URL và kết quả |

Ô giá/loại/tiện ích trên thanh và sidebar phải dùng cùng state. Không có hai bộ filter mâu thuẫn. Draft trong popover chỉ commit khi áp dụng; sidebar có thể cập nhật ngay, nhưng phải có một state kết quả đã áp dụng làm nguồn chuẩn.

### 3. Sidebar bộ lọc

Tiêu đề “Bộ lọc tìm kiếm”, nút “Đặt lại” có icon reset. Các nhóm accordion mở như ảnh: khoảng giá; loại lưu trú; tiện ích nổi bật; đánh giá.

Loại: Homestay, Eco Lodge, Resort, Bungalow, Nhà sàn. Tiện ích: Wi-Fi miễn phí, Bữa sáng, View rừng / núi, Có bếp, Phù hợp gia đình, Chỗ đậu xe, Thân thiện môi trường. Rating: từ 4.5, 4.0, 3.5 trở lên.

Price slider có hai thumb, kèm cách nhập số bằng bàn phím; không chỉ dùng kéo chuột. Khoảng hiển thị mẫu 300.000đ–2.000.000đ+ là cấu hình demo, không hardcode giới hạn thấp hơn giá trong dataset. Checkbox nhỏ nhưng vùng nhấn đủ rộng, nhãn và số lượng căn đều.

Filter nhiều lựa chọn: **OR trong một nhóm**, **AND giữa các nhóm**. Rating là một ngưỡng duy nhất, nên dùng radio được style gần checkbox hoặc cấu hình rõ không tích nhiều ngưỡng vô nghĩa. Facet count có quy ước thống nhất, tính từ dataset sau các nhóm khác; không copy số `(12)`, `(20)` khi chỉ có tám chỗ nghỉ.

Đặt lại xóa bộ lọc và reset sort/page, giữ ngày/khách đã nhập; ghi rõ bằng tooltip/help text nếu cần. Khi filter đổi, quay về trang 1.

Card cuối sidebar: “Không tìm thấy phòng phù hợp?”; CTA “Nhận tư vấn miễn phí” mở `/lien-he?intent=stay` cùng selection không nhạy cảm.

### 4. Thẻ phòng và dữ liệu ban đầu

Mỗi card: ảnh ngang trên cùng khoảng 2.1:1; heart trên ảnh; tên đậm; rating vàng/counter; location; ba tiện ích nhỏ; mô tả 2–3 dòng; giá trái/CTA phải ở đáy. Card gọn, nền trắng, border nhạt và bo 8–10 px. Không dùng variant card quá cao của trang khác.

Dữ liệu mẫu để dựng đúng thứ tự và giá ảnh, không phải bảng giá đã xác minh:

| ID/slug | Tên | Rating / số đánh giá | Giá mẫu/đêm |
|---|---|---|---:|
| `cuc-phuong-forest-homestay` | Cúc Phương Forest Homestay | 4.9 / 128 | 650.000đ |
| `an-nhien-retreat` | An Nhiên Retreat | 4.8 / 96 | 850.000đ |
| `cuc-phuong-eco-lodge` | Cúc Phương Eco Lodge | 4.9 / 112 | 1.200.000đ |
| `moc-son-homestay` | Mộc Sơn Homestay | 4.7 / 85 | 700.000đ |
| `nha-san-cuc-phuong` | Nhà sàn Cúc Phương | 4.6 / 74 | 600.000đ |
| `cuc-phuong-bungalow` | Cúc Phương Bungalow | 4.7 / 62 | 900.000đ |
| `green-valley-homestay` | Green Valley Homestay | 4.5 / 48 | 550.000đ |
| `trang-an-nature-lodge` | Tràng An Nature Lodge | 4.8 / 91 | 1.500.000đ |

Card đầu badge “Bán chạy”. Có tám ảnh phù hợp khác nhau, không lặp ảnh để lấp grid. Property Tràng An không được gán vị trí Cúc Phương một cách máy móc; địa chỉ trong fixture và production phải tách biệt.

Tên và “Xem chi tiết” tới đúng `/phong-nghi/[slug]`, mang theo ngày/khách đã chọn. Heart không kích hoạt điều hướng; không bọc toàn card bằng link rồi nhét button vào. Tên phòng vẫn đọc được đầy đủ; nếu cần giới hạn dòng, có cách xem toàn bộ tên mà không phụ thuộc hover trên mobile.

Toolbar: “Có 8 kết quả phù hợp” tính từ dữ liệu, nút Dạng lưới / Dạng danh sách. Chuyển list dùng cùng dataset/filter/favorite; ảnh trái, thông tin giữa, giá/CTA phải. Không reset search khi đổi view.

Pagination phải thật: nếu tám kết quả và page size tám thì một trang, không làm nút 2/3 giả như mockup. Để test nhiều trang, dùng fixture mở rộng riêng với ID khác và count đúng. Giữ style pagination của ảnh, ghi ngoại lệ này trong báo cáo.

### 5. Sidebar phải và cuối trang

Map card: heading “Xem vị trí trên bản đồ”, preview xanh nhạt, pins và popover property đang chọn. CTA “Xem bản đồ lớn” mở dialog; khi chỉ có illustration thì ghi “Bản đồ minh họa”, không giả chỉ đường thật. Click pin đổi property preview và có link chi tiết. Không yêu cầu geolocation.

Advisor card: chân dung minh họa bên phải, “Cần tư vấn chọn phòng?” bằng script bên trái; giới thiệu ngắn, nút “Chat với Đinh Vân”; ba lợi ích dưới và chữ ký nhỏ. Contact CTA theo config, thiếu config mở tư vấn nội bộ. Không kéo ảnh người méo tỷ lệ.

Cuối giữa: tiêu đề đánh giá, ba review card ngang nhỏ có avatar, quote, tên, sao. Pagination nằm đúng khu vực kết quả; controls review riêng, không dùng chung index với pagination phòng. Bên phải là FAQ năm câu. Xem tất cả FAQ mở dialog đầy đủ, không link 404. Review là demo, không phát review schema.

### 6. Tương tác và trạng thái

| Trạng thái | Kết quả cần có |
|---|---|
| Default | 8 card, grid, 2 khách, không popup, chưa chọn favorite |
| Applied filters | Kết quả/count/URL đồng bộ, có chip xóa filter |
| No results | “Chưa có chỗ nghỉ phù hợp với bộ lọc này”, reset và tư vấn; không đổ lỗi hết phòng |
| Loading | Skeleton cùng footprint card, không nhảy layout lớn |
| Load error | Thông báo + thử lại, giữ selection |
| Invalid dates | Error cạnh date group, focus tới trường lỗi |
| Favorite | Cập nhật ngay, đồng bộ listing/homepage/detail, reload an toàn |
| Back/forward | Khôi phục filter/sort/page hợp lệ từ URL |

Không có API availability thì không ghi “Còn phòng” theo ngày. Sau search có thể giải thích “Đây là gợi ý theo nhu cầu; tình trạng phòng sẽ được xác nhận khi tư vấn.”

### 7. Responsive và cấu trúc component

Từ 1024–1279 px: giữ sidebar trái nếu đủ rộng, kết quả 2–3 cột; sidebar phải xuống dưới. Tablet: filter drawer, card hai cột. Mobile: search thu gọn nhưng chỉnh được đầy đủ, toolbar Lọc / Sắp xếp / Bản đồ, card một cột; drawer có Đặt lại / Áp dụng và số kết quả. Không render filter desktop ẩn nhưng vẫn nhận tab focus.

Component đề xuất: `StaysHero`, `StaySearchBar`, `StayFilterPanel`, `ResultsToolbar`, `StayCard`, `StayListRow`, `StayMapDialog`, `AdvisorCard`, `ReviewsStrip`, `FaqAccordion`, `Pagination`. Tái sử dụng card bằng variant `listing`, không copy logic của homepage.

### 8. Checklist nghiệm thu riêng

```text
[ ] Desktop đúng 3 cột lớn; vùng giữa 4 card × 2 hàng.
[ ] Search bar nằm tại mép hero, không chuyển thành một section khác.
[ ] Sidebar và search bar đồng bộ filter; counts/pagination không giả.
[ ] Grid/list, reset, sort, price inputs, keyboard đều dùng được.
[ ] Cả 8 route chi tiết đúng dữ liệu; heart không mở route.
[ ] Ngày/khách được giữ khi chuyển detail và back.
[ ] Map/FAQ/tư vấn có hành vi thật, không dùng contact giả.
[ ] Có loading, empty, error và fixture test tương ứng.
[ ] Screenshot desktop/mobile/overlay và kiểm tra font/icon hoàn tất.
```

---

<a id="mh-02"></a>

## MÀN HÌNH 02 — CHI TIẾT PHÒNG NGHỈ

> **Agent Opus:** lập trình `/phong-nghi/[slug]`, ảnh chuẩn là property `cuc-phuong-forest-homestay`. Đọc `00_QUY_CHUAN_CHUNG.md`; giữ ba font, tone xanh–kem, logo/SVG và phong cách tư vấn cá nhân. Dùng chung data với listing, không tạo một property khác cùng tên.

![Màn hình chi tiết phòng](./references/02-chi-tiet-phong.png)

### 1. Cấu trúc desktop

Trang này **không có hero panorama như listing**. Sau header là breadcrumb mảnh rồi gallery và thông tin property.

```text
HEADER — PHÒNG NGHỈ ACTIVE
BREADCRUMB                                      SHARE / SAVE
GALLERY: ẢNH LỚN + 3 THUMB    TÊN / RATING / VỊ TRÍ / HIGHLIGHTS
GALLERY TIẾP                HOST CARD            BOOKING CARD
GIỚI THIỆU + TIỆN NGHI                           BOOKING CARD TIẾP
3 ROOM TYPE CARD             NHẬN/TRẢ PHÒNG       GHI CHÚ VIẾT TAY
                            ĐỊA ĐIỂM XUNG QUANH
3 REVIEW CARD                NỘI QUY              HỖ TRỢ CÁ NHÂN
FOOTER
```

Ở viewport 1448 px: nội dung rộng khoảng 1360–1376 px; gallery khoảng 725–735 px; vùng giữa khoảng 330–345 px; booking khoảng 265–275 px; gap 16–22 px. Gallery cao khoảng 315–325 px. Số liệu là khởi tạo, cần đo ảnh.

Dùng CSS Grid với named areas hoặc grid-row span để gallery, title, host và booking ăn khớp; **không** làm một “top row” cao bằng booking rồi để khoảng trống lớn dưới gallery. Booking có thể span hai hàng; intro/amenities nằm ngay dưới gallery như ảnh.

Gợi ý tổ chức: root grid ba cột `gallery/content – host/info – booking`; title span cột 2–3; gallery span hai hàng đầu; intro+amenities span cột 1–2; các khối dưới dùng nested grid. Không absolute-position cả trang để xử lý các phần so le.

### 2. Breadcrumb, gallery và ảnh

Breadcrumb: Trang chủ → Phòng nghỉ → tên chỗ nghỉ; có thể giữ cấp Cúc Phương bằng filter location thật nếu có, không thêm link rỗng. Share/Save góc phải.

Gallery trái gồm một ảnh lớn khoảng 73% chiều rộng và cột ba thumbnail khoảng 27%, gap 6–8 px. Ảnh lớn phòng gỗ/cửa kính/view núi; ba ảnh phụ nhà gỗ, ban công, sân tối có đèn. Các mép bo 8–10 px.

Ảnh lớn có lời viết tay trắng ở dưới trái và nút đen mờ “Xem tất cả … ảnh” dưới phải. Thumbnail cuối overlay `+N`. **Số lượng lấy từ gallery thật**; không hiển thị 28 ảnh nếu chỉ có bốn asset. Không nhân bản cùng ảnh 28 lần.

Click ảnh/nút mở `GalleryDialog`: ảnh lớn, counter, thumbnails, prev/next, Escape, phím trái/phải; có caption/alt. Focus trap, trả focus đúng nút, mobile swipe nếu thực hiện được ổn định. Không autoplay. Chỉ preload ảnh liền kề; xử lý ảnh lỗi bằng fallback có nhãn, không vỡ dialog.

### 3. Thông tin property và chủ nhà

Copy đầu trang:

```text
Bán chạy
Cúc Phương Forest Homestay

Một homestay giữa rừng xanh, nơi bạn được sống chậm,
hít thở thiên nhiên và cảm nhận sự bình yên thật sự.
```

Tên H1 serif đậm 28–34 px, rating mẫu 4.9 / 128, location có pin; không biến title thành heading hero 48 px. Bốn highlights nhỏ: View núi rừng, Không gian xanh, Bữa sáng bản địa, Thân thiện môi trường.

Host card nền kem nhạt: avatar tròn, “Chủ nhà: Anh Nam”, dòng phụ, quote và “Xem hồ sơ chủ nhà”. Link mở dialog nội bộ về host fixture, không đi 404. Đây là nhân vật/nội dung minh họa. Model `property.host` độc lập với `site.advisor`; không tự coi Anh Nam và Đinh Vân là cùng người chỉ vì ảnh minh họa tương tự.

Share: dùng khả năng chia sẻ trình duyệt nếu có, fallback copy link; thông báo copy chỉ sau khi thực sự thành công, thất bại có cách chọn/sao chép thủ công. Save dùng chung favorite theo `stayId`.

### 4. Booking card bên phải

Nền trắng, shadow rất nhẹ, giá ở đầu “Từ 650.000đ / đêm”, badge nhỏ, ngày nhận/trả hai ô cạnh nhau, selector khách, CTA full width xanh “Đặt phòng ngay”, dòng giải thích dưới.

Giá `Từ` là giá thấp nhất phù hợp của room type chưa chọn; khi đã chọn phòng thì hiện giá đúng phòng đó. Không giữ 650.000đ sau khi chọn phòng 1.200.000đ. Không tự xác nhận giá cho ngày cụ thể khi chưa có pricing API.

Flow CTA:

- Chưa chọn room type: cuộn/focus “Các loại phòng & gói dịch vụ”, làm rõ cần chọn loại phòng; không bí mật chọn room đắt nhất.
- Đã chọn room nhưng thiếu ngày/khách: focus trường cần nhập và validate.
- Lựa chọn hợp lệ: điều hướng `/dat-phong` với IDs và selection; không đưa price/PII vào URL.

Nếu booking card sticky trên desktop, dùng offset phù hợp header và không vượt footer; trạng thái đầu trang vẫn đúng ảnh. Mobile dùng thanh giá/CTA dưới có safe-area, bấm mở booking sheet dùng cùng state, không thêm một form tách biệt.

Copy “Không cần thanh toán ngay” và “Xác nhận nhanh trong 5 phút” của mẫu là thông tin cần chủ website xác nhận. Ở prototype chưa có API: giải thích tình trạng phòng/phương thức xác nhận đang là mô phỏng, không hiển thị booking đã thành công.

### 5. Giới thiệu, tiện nghi và room types

Giới thiệu khoảng một đoạn ngắn 4–5 dòng ở desktop, mô tả kiến trúc gỗ, không gian thiên nhiên và nhu cầu phù hợp; không bổ sung bài SEO dài làm đổi chiều cao. Quote nhỏ nền kem bên dưới, chữ ký Đinh Vân Booking ở phải.

Tiện nghi cạnh giới thiệu: grid chip viền nhạt với SVG. Wi-Fi miễn phí, Điều hòa 2 chiều, Phòng tắm riêng, Đồ vệ sinh cá nhân, Ban công view núi, Khu vực làm việc, Bữa sáng bản địa, Không hút thuốc. “Xem tất cả” mở dialog nhóm tiện nghi; không mở một popup trống.

Ba room type card cùng hàng bên dưới gallery:

| ID | Tên hiển thị mẫu | Sức chứa mẫu | Diện tích mẫu | Giá/đêm |
|---|---|---:|---:|---:|
| `standard-garden` | Phòng Standard Garden | 2 người | 20 m² | 650.000đ |
| `deluxe-mountain-view` | Phòng Deluxe Mountain View | 3 người | 28 m² | 850.000đ |
| `bungalow-family` | Bungalow Family | 4 người | 40 m² | 1.200.000đ |

Ảnh ngang, tên đậm, icon sức chứa/diện tích/view, mô tả 2–3 dòng, giá và nút “Chọn phòng”. Card giữa badge “Phổ biến”. Tất cả là fixture để test, không công bố thành thông số đã xác minh.

Chọn phòng cập nhật `selectedRoomTypeId`, highlight viền, label “Đã chọn”, giá booking và occupancy. Khi số khách vượt sức chứa, giải thích và đề nghị chọn loại/số phòng phù hợp. Quy ước prototype: tổng guests tính adults + children cho kiểm tra capacity; không tự bịa chính sách miễn phí trẻ em hoặc gộp nhiều loại phòng. Số phòng nhân vào capacity và room subtotal khi được phép chọn nhiều phòng cùng loại.

Không ghi “còn 1 phòng” khi không có tồn kho. “Không phù hợp số khách” khác “hết phòng”; phân biệt rõ trong state và thông báo.

### 6. Khối thông tin bên phải và đáy trang

“Lịch nhận phòng & thông tin cần biết”: 14:00 nhận, 12:00 trả; gửi hành lý/nhận sớm tùy tình trạng; bữa sáng 06:30–09:00; hỗ trợ tour/xe. Các giờ là fixture, đưa vào data không hardcode JSX.

“Một vài lưu ý nhỏ…”: note kem, script xanh, checklist mang giấy tờ, giữ vệ sinh, không gây ồn, tôn trọng văn hóa và giữ rừng. Đây là checklist thông tin; checkbox trang trí dùng SVG không giả input nhận thao tác, hoặc implement checklist có state thật nếu muốn đánh dấu.

“Địa điểm xung quanh”: bốn ảnh nhỏ rừng Cúc Phương, hồ Yên Quang, Động Người Xưa, khu cứu hộ; tên, khoảng cách/thời gian từ fixture có cờ demo. Không tính khoảng cách từ pins minh họa. Click mở destination dialog dùng chung màn 04 hoặc route sẵn có.

“Nội quy nhà nghỉ”: list SVG nhỏ, không làm bảng dài. Review: ba card ngang như ảnh, avatar, tên, sao/ngày, quote, ảnh khách; dùng dataset demo, “Xem tất cả” mở review dialog có sort cơ bản. Counter tổng demo có thể lớn hơn ba review preview, nhưng dialog phải nói rõ chỉ có nội dung mẫu, không giả tải đủ 128 reviews.

Support card nhỏ phía dưới phải với advisor minh họa, câu viết tay và CTA Zalo/gọi/nhắn tin. Không gán contact của host cho advisor hoặc ngược lại.

### 7. Responsive, route data và trạng thái

Tablet: gallery trên, title/booking dưới theo hai cột; room types 2 cột khi cần; không giữ ba cột lớn quá chật. Mobile: title → gallery → giá/booking summary → highlights/host → giới thiệu → tiện nghi → room types → check-in/nearby/rules/reviews/support; nhóm đảo thứ tự phải có luồng đọc DOM hợp lý. Có thể xếp gallery thành ảnh chính + thumbnail strip.

Mọi slug trong listing dùng chung template với đúng dữ liệu riêng; không luôn render Forest Homestay. Slug không tồn tại có not-found thân thiện, CTA về danh sách. Loading giữ khung gallery; thiếu ảnh/room types có state rõ; lỗi adapter có thử lại.

Component: `PropertyGallery`, `PropertyHeading`, `HostCard`, `StayBookingCard`, `AmenitiesGrid`, `RoomTypeCard`, `CheckInFacts`, `HouseRules`, `NearbyDestinations`, `ReviewCards`, `AdvisorMiniCard`.

### 8. Checklist nghiệm thu riêng

```text
[ ] Không thêm panorama hero; giữ đúng gallery lớn + 3 thumbnails.
[ ] Heading/host/booking/intro đúng vị trí so le, không khoảng trống giả.
[ ] Gallery count đúng asset; dialog dùng chuột/bàn phím/mobile được.
[ ] Chọn từng room type đổi đúng giá, sức chứa, selected state.
[ ] CTA checkout truyền đúng room ID/ngày/khách và không truyền giá.
[ ] Favorites đồng bộ listing/home; share có fallback và error state.
[ ] Amenities, host, reviews, nearby đều có điểm đến/dialog thật.
[ ] Không lẫn chủ nhà Anh Nam với advisor Đinh Vân.
[ ] Not-found/loading/empty/error có đủ; mobile sticky không che form.
[ ] Có screenshot desktop/mobile/overlay, glyph tiếng Việt và icon đã kiểm tra.
```

---

<a id="mh-03"></a>

## MÀN HÌNH 03 — COMBO DU LỊCH

> **Agent Opus:** lập trình `/combo-du-lich` theo ảnh, đọc `00_QUY_CHUAN_CHUNG.md` trước. Giữ Playfair Display / Roboto Condensed / Dancing Script, SVG và tone xanh–kem. Không chuyển sáu combo thành một carousel khổng lồ hoặc trang blog.

![Màn hình combo du lịch](./references/03-combo-du-lich.png)

### 1. Bố cục desktop cần tái tạo

```text
HEADER — COMBO DU LỊCH ACTIVE
HERO PANORAMA / HEADLINE TRÁI / NGƯỜI DU LỊCH BÊN PHẢI
BREADCRUMB + FILTER CHIPS + LỜI NHẮN VIẾT TAY
HEADING “CÁC COMBO NỔI BẬT”                         SORT
6 COMBO CARD TRÊN MỘT HÀNG
QUOTE NHỎ     4 LỢI ÍCH ĐẶT CÙNG NGƯỜI BẢN ĐỊA     QUOTE NHỎ
QUY TRÌNH 4 BƯỚC NẰM NGANG
3 TESTIMONIAL CARD                                FAQ
FOOTER
```

Ở 1448 px: lề khoảng 36 px, hero khoảng 170–180 px dưới header, filter/breadcrumb khoảng 75–85 px; card có ảnh chiếm phần trên, nội dung gọn bên dưới. Mỗi card rộng khoảng 220 px với gap 12–14 px. Tham số chỉ là khởi tạo, cần đo lại PNG.

```css
.combo-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 14px;
}
.combo-bottom-grid {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
  gap: 24px;
}
```

Không thêm sidebar hoặc khối lọc bên trái; không đổi sáu cột thành ba cột ở viewport chuẩn. Các CTA đáy card phải thẳng hàng; mô tả có chiều dài có kiểm soát, không fixed height cắt nội dung.

### 2. Hero và category chips

Hero núi đá vôi/thung lũng, ánh sáng ấm; người đội mũ đeo balô ở phải, không đè text. Copy:

```text
Combo du lịch Cúc Phương – Ninh Bình
Nhiều trải nghiệm hơn – Chuyến đi ý nghĩa hơn

Những hành trình được thiết kế bởi người bản địa, kết hợp hài hòa giữa thiên nhiên,
văn hóa, ẩm thực và nghỉ dưỡng. Đi dễ dàng hơn, trọn vẹn hơn cùng Đinh Vân Booking.
```

H1 serif 34–40 px, dòng hai viết tay khoảng 30–35 px. Lời nhắn bên phải “Không chỉ là chuyến đi mà là những câu chuyện đáng nhớ…”. Không biến lời nhắn thành CTA thứ hai.

Filter chips theo thứ tự: **Tất cả combo — 2N1D — 3N2D — Gia đình — Cặp đôi — Nhóm – Team — Trải nghiệm thiên nhiên**. Pill active xanh đậm, các pill khác trắng, icon SVG xanh, shadow nhẹ; vùng nền kem. Breadcrumb nhỏ phía trên chips. Bên phải câu “Chọn hành trình phù hợp với bạn nhé!”.

Prototype sử dụng **một category filter active** trong hàng chip để hành vi rõ ràng; mỗi combo có duration và nhiều audience tags để lọc được. Đây là filter button `aria-pressed`, không lạm dụng tab role khi không có tabpanel riêng. Sort: Phổ biến nhất, Giá tăng dần, Giá giảm dần; reset page khi đổi tiêu chí.

### 3. Sáu combo card

Mỗi card: ảnh khoảng 1.7–1.8:1, badge duration/audience ở góc trái, heart góc phải; tên sans đậm, câu phụ một dòng, ba dòng included có SVG nhỏ, giá đậm `/ người`, CTA xanh full width “Xem chi tiết”. Card trắng, viền nhạt, bo khoảng 9 px.

Fixture và thứ tự giống ảnh:

| ID | Tên | Badge | Giá mẫu/người |
|---|---|---|---:|
| `kham-pha-rung-cuc-phuong` | Khám phá rừng Cúc Phương | 2N1D | 1.350.000đ |
| `trang-an-bai-dinh` | Tràng An – Bái Đính | 2N1D | 1.290.000đ |
| `cuc-phuong-eco-retreat` | Cúc Phương Eco Retreat | 3N2D | 2.350.000đ |
| `ninh-binh-tron-ven` | Ninh Bình trọn vẹn | 3N2D | 2.190.000đ |
| `ky-nghi-gia-dinh-xanh` | Kỳ nghỉ gia đình xanh | Gia đình | 1.890.000đ |
| `team-building-ninh-binh` | Team building Ninh Bình | Nhóm – Team | 1.690.000đ |

Gợi ý ba dòng nội dung mẫu trên từng card:

| Combo | Dòng 1 | Dòng 2 | Dòng 3 |
|---|---|---|---|
| Khám phá rừng | Trekking rừng nguyên sinh | Thăm khu cứu hộ linh trưởng | Ẩm thực bản địa, homestay xanh |
| Tràng An – Bái Đính | Tham quan Tràng An | Vãn cảnh Bái Đính | Ẩm thực Ninh Bình |
| Eco Retreat | Nghỉ dưỡng giữa thiên nhiên | Trekking, quan sát thiên nhiên | BBQ, trải nghiệm buổi tối |
| Ninh Bình trọn vẹn | Tràng An – Hang Múa – Tam Cốc | Khám phá văn hóa bản địa | Đặc sản và nghỉ dưỡng |
| Gia đình xanh | Lịch trình nhẹ nhàng | Trải nghiệm cho gia đình | Homestay gần thiên nhiên |
| Team building | Hoạt động nhóm ngoài trời | Thiên nhiên và văn hóa | Lịch trình theo nhu cầu |

Các lịch trình/quyền tham quan là **copy mẫu**, cần kiểm chứng trước kinh doanh; không hứa hoạt động đặc biệt được phép chỉ vì có trong mockup. Không bịa thêm “đã bán”, giảm giá, số chỗ còn lại hoặc departures có sẵn.

Data gồm `id`, `slug`, `title`, `subtitle`, `durationDays`, `durationNights`, `audienceTags`, `includedHighlights`, `fromPriceVnd`, `priceUnit`, `image`, `itinerary`, `isDemo`. Không suy duration từ badge Gia đình/Team; fixture phải có trường riêng.

### 4. Xem chi tiết combo — trạng thái bổ sung cần hoạt động

Chưa có ảnh riêng cho trang chi tiết combo. **Không tự mở rộng thành một trang thiết kế khác** trong nhiệm vụ này. Mặc định mở `ComboDetailDialog`/drawer, giữ cùng visual system; nếu dự án đã có route tương ứng thì tái sử dụng.

Dialog chứa ảnh, tên, duration, giá tham khảo, itinerary theo ngày bằng accordion, bao gồm/chưa bao gồm, chính sách mẫu có nhãn demo; trường ngày dự kiến/số khách, ghi chú ngắn và CTA “Nhờ Đinh Vân tư vấn combo này”. Nội dung luôn theo combo được click, không sáu nút cùng mở một mẫu.

CTA chuyển `/lien-he?intent=combo&item=<slug>` và truyền ngày/khách không nhạy cảm. Form contact hiển thị chip ngữ cảnh có thể bỏ. Không chuyển combo sang checkout phòng nếu chưa có mô hình giá/room mapping cho combo; không dùng giá/người như giá/phòng.

Heart hoạt động theo `comboId`, namespace khác favorites của stay/destination. Back/Escape đóng dialog, trả focus; mobile drawer cuộn nội dung bên trong đúng cách.

### 5. Lợi ích và quy trình bốn bước

Bên dưới cards là một hàng: quote trái nền kem “Những chuyến đi nhỏ tạo nên những thay đổi lớn”, giữa heading “Vì sao nên đặt combo cùng người bản địa?” và bốn feature; phải quote “Đi cùng người địa phương để cảm nhận Ninh Bình thật khác!”.

Bốn feature: Am hiểu địa phương / Lịch trình tối ưu / Dịch vụ tận tâm / Du lịch có trách nhiệm. Icon tròn kem, text ngắn; không biến thành bốn card cao.

Process band ngang nền xanh rất nhạt: intro “Quy trình đặt combo đơn giản” và bốn số trong hình tròn xanh, nối mũi tên SVG:

```text
1. Tư vấn — Nhận nhu cầu, gợi ý lịch trình.
2. Chốt lịch — Thống nhất ngày, số lượng, yêu cầu.
3. Giữ phòng — Theo phương án đã được xác nhận.
4. Khởi hành — Chuẩn bị và tận hưởng chuyến đi.
```

Copy trong ảnh có đề cập đặt cọc; đưa qua config/policy demo, không mặc định mọi combo đều cọc giống nhau. Steps là mô tả quy trình, không tạo nút giả có vẻ thực hiện giao dịch.

### 6. Testimonials và FAQ

Đáy trái khoảng 2/3 chiều rộng có heading, “Xem tất cả”, ba review card với avatar tròn, quote ngắn, rating, tên và nơi ở mẫu. Không autoplay; xem thêm mở dialog hoặc thay slide có state.

Đáy phải khoảng 1/3 là FAQ bốn accordion: giá gồm gì, tùy chỉnh lịch trình, trẻ em tính giá thế nào, hoàn/hủy. Câu trả lời demo phải ghi rõ chính sách tùy combo/chờ xác nhận, không tự viết điều khoản ràng buộc. Không trả lời “miễn phí hoàn hủy” khi chưa có chính sách.

### 7. Responsive và trạng thái

1280 px giữ sáu cột chỉ khi chữ vẫn đọc được; dưới mức phù hợp chuyển 3 cột, tablet 2–3, mobile một cột hoặc hai khi đủ chiều rộng. Không ép sáu card nhỏ trên điện thoại. Chips cuộn ngang có chỉ báo hoặc wrap, trang không tràn ngang. Process chuyển timeline dọc; lợi ích 2 × 2; reviews/FAQ xếp dọc.

Các states cần đủ: category selected, sort, favorites, detail drawer, loading, no results, error + retry. Empty phải có “Xem tất cả combo” và “Nhận tư vấn riêng”. Sort và filter hoạt động cùng nhau; giá cùng unit mới sort chung. Nếu fixture sau này có giá theo đoàn thì không so trực tiếp với giá/người mà không có quy ước.

Component: `CombosHero`, `ComboCategoryFilters`, `ComboSort`, `ComboCard`, `ComboDetailDialog`, `LocalBookingBenefits`, `BookingProcess`, `Testimonials`, `FaqAccordion`.

### 8. Checklist nghiệm thu riêng

```text
[ ] Đúng hero, filter chips và 6 combo card trên một hàng ở 1448 px.
[ ] Badge/ảnh/tên/giá theo đúng thứ tự fixture, không dùng cùng ảnh cho nhiều card.
[ ] Mọi chip/sort/heart hoạt động, có empty/loading/error.
[ ] 6 nút Xem chi tiết mở đúng nội dung combo, không link 404.
[ ] CTA tư vấn chuyển đúng ngữ cảnh, không làm sai đơn vị giá sang checkout phòng.
[ ] Giữ hàng lợi ích, process 4 bước, reviews + FAQ đúng tỷ lệ.
[ ] Mobile drawer, focus, accordion, scroll và vùng chạm hoạt động.
[ ] Font/icon/ảnh, screenshot desktop/mobile và overlay đã kiểm tra.
```

---

<a id="mh-04"></a>

## MÀN HÌNH 04 — ĐIỂM ĐẾN / KHÁM PHÁ CÚC PHƯƠNG – NINH BÌNH

> **Agent Opus:** lập trình `/diem-den` theo ảnh. Đọc `00_QUY_CHUAN_CHUNG.md`, giữ font serif / sans gọn / script, xanh–kem, icon SVG và giọng nói của người tư vấn bản địa. Không đổi thành magazine hoặc trang bài viết dài.

![Màn hình điểm đến](./references/04-diem-den.png)

### 1. Bố cục tổng thể

```text
HEADER — ĐIỂM ĐẾN ACTIVE
HERO: BREADCRUMB / HEADLINE / LANDSCAPE / TRAVELER
CATEGORY CHIPS + THÔNG ĐIỆP BẢN ĐỊA
HEADING + 6 DESTINATION CARD MỘT HÀNG
LỊCH TRÌNH TIMELINE     4 THẺ THEO MÙA     BẢN ĐỒ
LỊCH TRÌNH TIẾP        4 THẺ THEO MÙA     LỜI NHẮN ĐINH VÂN
FOOTER
```

Lề khoảng 36 px, hero 220–235 px dưới header, chips strip khoảng 50–60 px. Bên dưới sáu card ngang. Lower section là ba cột, cột giữa hẹp hơn; khởi tạo tỷ lệ `1.2fr .95fr 1.3fr`, gap 16–20 px. Đo lại reference để chỉnh, không biến lower section thành ba section full-width.

```css
.destinations-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 14px;
}
.discovery-lower-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(0, .95fr) minmax(0, 1.3fr);
  gap: 18px;
}
```

### 2. Hero và category filters

Copy:

```text
Khám phá thiên nhiên kỳ diệu
Cúc Phương - Ninh Bình

Nơi rừng xanh, núi đá, văn hóa và những trải nghiệm chân thật
cùng tạo nên hành trình đáng nhớ.

Không chỉ là một điểm đến, mà là hành trình trở về với thiên nhiên,
văn hóa và chính mình...
```

Dòng đầu script trắng; H1 serif lớn; nội dung sans. Phải là nhân vật du lịch nhìn cảnh núi/thung lũng. Lời nhắn nhỏ theo phong cách viết tay, không che mặt/hình nhân vật hoặc headline.

Category chips: **Tất cả — Thiên nhiên — Văn hóa — Check-in — Ẩm thực — Gia đình**. Icon SVG lần lượt danh mục/lá hoặc cây/di tích/camera/dao nĩa/nhóm người. Một chip active; filter dựa trên tags, không dựa tên hiển thị. Dòng thông điệp bên phải “Những điểm đến không chỉ để ngắm, mà để cảm nhận”.

Không làm “Gia đình” rỗng vô lý do fixture không được gắn tags; một điểm có thể thuộc nhiều nhóm. Mỗi category dùng button `aria-pressed`.

### 3. Sáu card điểm đến

Ảnh ngang phía trên, heart góc phải, category badge dưới trái ảnh. Bên dưới là tiêu đề serif gọn, mô tả 2–3 dòng, ba tip icon và CTA xanh “Xem chi tiết”. Giữ card/CTA cao tương đối đều, không chèn giá vào màn này.

| ID | Tiêu đề | Nhóm hiển thị | Hướng hình ảnh |
|---|---|---|---|
| `vuon-quoc-gia-cuc-phuong` | Vườn quốc gia Cúc Phương | Thiên nhiên | Rừng già, lối đi/cây lớn |
| `ho-yen-quang` | Hồ Yên Quang | Thiên nhiên | Mặt hồ và núi xanh |
| `dong-nguoi-xua` | Động Người Xưa | Văn hóa | Hang/nhũ đá hoặc lối vào động |
| `trang-an` | Tràng An | Thiên nhiên | Thuyền, nước, núi đá vôi |
| `hang-mua` | Hang Múa | Check-in | Đỉnh núi/đường bậc đá |
| `am-thuc-ninh-binh` | Ẩm thực Ninh Bình | Ẩm thực | Mâm món địa phương |

Nội dung demo bám chiều dài ảnh: giới thiệu điểm, hoạt động gợi ý, trải nghiệm chụp ảnh/thiên nhiên/ẩm thực. Không tự khẳng định giá vé, giờ mở cửa, an toàn tuyệt đối, quyền vào khu bảo tồn hoặc hoạt động đang được cho phép. Thông tin mùa, lịch trình, khoảng cách và các tuyên bố du lịch trong mockup phải có cờ chưa xác minh.

“Xem tất cả điểm đến” ở heading mở drawer danh sách đầy đủ/ô tìm kiếm; nếu dataset chỉ có sáu thì hiển thị đúng sáu, không giả có thêm. Favorite theo `destinationId`, đồng bộ với nearby card trên màn chi tiết phòng nếu có cùng ID.

### 4. Destination detail dialog

Chưa có ảnh trang chi tiết riêng, nên dùng một `DestinationDetailDialog` có cùng visual system; không tự thiết kế thêm route lớn trừ khi đã có trong dự án.

Nội dung: ảnh, tên, nhóm, mô tả ngắn, hoạt động gợi ý, lưu ý tham quan, gallery nhỏ nếu có, CTA “Nhờ Đinh Vân gợi ý lịch trình”. Chỉ hiển thị vé/giờ/địa chỉ chính xác khi đã có dữ liệu xác minh; nếu thiếu thì “Liên hệ để được tư vấn thông tin phù hợp thời điểm đi”. Không render chuỗi “undefined”.

CTA tới `/lien-he?intent=destination&item=<slug>`; có thể thêm link “Tìm phòng nghỉ” tới listing với location tag đã khai báo, không lọc bằng khoảng cách bịa. Share/favorite có state thật. Close/Escape/back trả focus.

### 5. Gợi ý lịch trình — cột trái

Heading “Gợi ý lịch trình khám phá”, subtitle ngắn, Xem thêm. Ba tabs cùng hàng: **1 ngày / 2 ngày 1 đêm / 3 ngày 2 đêm**, dòng phụ bên dưới; tab đầu active xanh đậm.

Bên trong: timeline dọc với chấm và đường xanh, giờ ở trái, SVG và nội dung bên phải. Một ảnh dọc nhỏ cùng lời viết tay “Một ngày đủ để yêu thêm thiên nhiên Việt Nam” ở cạnh; không để ảnh che timeline.

Mẫu 1 ngày để dựng UI:

| Giờ demo | Hoạt động demo |
|---|---|
| 08:00 | Khởi hành |
| 10:00 | Tham quan Cúc Phương |
| 12:00 | Ăn trưa, nghỉ ngơi |
| 14:00 | Khám phá điểm tham quan trong lịch trình |
| 16:00 | Ngắm cảnh, chụp ảnh |
| 17:30 | Kết thúc hành trình |

Giờ này chỉ để trình diễn, không phải tư vấn thời gian di chuyển đã kiểm chứng. Agent chuẩn bị dữ liệu mẫu riêng cho cả ba tabs; 2N1D/3N2D có group theo ngày, không chỉ thay active màu rồi giữ nội dung cũ. Không tự chèn một tuyến đường bất khả thi để đủ các mốc.

Tabs có `role=tablist/tab/tabpanel`, Arrow/Home/End phù hợp, tabpanel liên kết đúng. Xem thêm mở itinerary dialog đầy đủ; ở trang giữ độ gọn gần ảnh. Mobile timeline không bị cắt chân chữ/đè giờ.

### 6. Du lịch theo mùa — cột giữa

Heading, một câu dẫn và grid 2 × 2: ảnh nhỏ, tên mùa, khoảng tháng, mô tả ngắn. Ảnh xuân/hè/thu/đông cùng tone thiên nhiên. Reference gợi ý xuân 2–4, hè 5–8, thu 9–11, đông 12–1; đưa qua fixture, **không coi đây là dự báo thời tiết hoặc thời điểm du lịch bảo đảm**.

Card mùa nếu được thiết kế clickable thì phải mở `SeasonTipsDialog` với nội dung riêng và CTA tư vấn; nếu chỉ là thông tin thì không dùng cursor pointer hoặc hover giống nút. Không mở trang 404. Khuyến nghị cho chuyến đi thật cần chủ website kiểm tra theo thời điểm.

### 7. Bản đồ và lời nhắn — cột phải

Map panel ở trên: heading “Bản đồ khám phá địa phương”, helper text, link xem bản đồ lớn. Có nhãn/pin Cúc Phương, hồ Yên Quang, Động Người Xưa, Tràng An, Hang Múa theo illustration.

Trong prototype, hiển thị ảnh/SVG minh họa nền, labels bằng DOM/SVG rõ nét và nhãn “Bản đồ minh họa”. Không dùng tọa độ phần trăm của ảnh làm kinh độ/vĩ độ thực tế. Click marker mở preview destination đúng ID; map dialog có danh sách tương đương để người dùng bàn phím tiếp cận. Chỉ bật chỉ đường khi có URL/tọa độ đã xác nhận.

Advisor note phía dưới: “Lời nhắn từ Đinh Vân”, quote ngắn về kết nối thiên nhiên/bản địa, tên ký, script bên phải và portrait minh họa. Không biến thành card bán hàng có nhiều nút; giữ cảm giác lời nhắn cá nhân như ảnh.

### 8. Responsive và trạng thái

Desktop 6 card ngang; 1024–1279 px có thể 3 cột; tablet 2–3; mobile một cột hoặc hai nếu vẫn đọc được. Lower section tablet 2 cột rồi advisor/map xuống dưới; mobile itinerary → mùa → map → lời nhắn. Hero giữ người/cảnh bên phải khi có thể; trang trí dư có thể ẩn nhưng không mất nội dung chính.

States: lọc theo category, favorite, destination dialog, itinerary tabs, season dialog, map dialog, loading/empty/error. Empty có reset; lỗi không phá header/footer. Không yêu cầu đăng nhập để xem hoặc lưu local.

Component: `DestinationsHero`, `DestinationCategoryFilters`, `DestinationCard`, `DestinationDetailDialog`, `ItineraryTabs`, `ItineraryTimeline`, `SeasonCard`, `LocalMapPreview`, `LocalMapDialog`, `AdvisorNote`.

### 9. Checklist nghiệm thu riêng

```text
[ ] Hero/chips/6 card và lower grid ba cột bám đúng reference.
[ ] Category filters làm thay đổi dataset thật, favorite không mở card.
[ ] Mỗi card mở đúng detail; Xem tất cả không là link rỗng.
[ ] Cả 3 itinerary tabs có dữ liệu và accessibility đúng.
[ ] Mùa/map là thông tin demo, không giả dữ liệu thời gian thực/vị trí thật.
[ ] Markers/dialog có điều khiển bàn phím và fallback danh sách.
[ ] CTA tư vấn mang đúng ngữ cảnh điểm đến.
[ ] Responsive không mất các khối, font/icon và overlay đã kiểm tra.
```

---

<a id="mh-05"></a>

## MÀN HÌNH 05 — LIÊN HỆ / TƯ VẤN RIÊNG

> **Agent Opus:** lập trình `/lien-he` theo ảnh; đọc `00_QUY_CHUAN_CHUNG.md` trước. Trọng tâm là người tư vấn cá nhân, không phải trung tâm hỗ trợ của một tập đoàn. Giữ ba font, logo núi và icon SVG, xanh–kem, chân dung minh họa cùng tone.

![Màn hình liên hệ](./references/05-lien-he.png)

### 1. Cấu trúc desktop

```text
HEADER — LIÊN HỆ ACTIVE
HERO: XIN CHÀO / HEADLINE / 3 CAM KẾT       PORTRAIT / HIÊN GỖ
FORM TƯ VẤN         LIÊN HỆ NHANH         4 CAM KẾT
FORM TIẾP           PROFILE CÁ NHÂN       MAP / VỊ TRÍ
FAQ                 SOCIAL + LỜI NHẮN     SCENIC CTA
FOOTER
```

Hero khoảng 245–260 px sau header, nội dung chính ba cột. Khởi tạo `1.35fr .95fr 1.25fr`, gap 14–18 px, lề 36 px. Cột form khoảng 510 px, profile khoảng 355 px, map khoảng 480 px tại viewport chuẩn. Đo lại PNG để chỉnh. Bố cục này khác trang checkout hai cột, không dùng chung nguyên layout.

Card nền trắng ngà/kem rất nhẹ; tiêu đề serif rõ; form có khoảng cách đủ thao tác nhưng không đẩy cả trang thành landing page dài. Lower row tiếp nối ba cột chính.

### 2. Hero cá nhân

Copy:

```text
Xin chào!
Rất vui được lắng nghe
kế hoạch của bạn!

Hãy chia sẻ mong muốn của bạn, Đinh Vân sẽ tư vấn tận tình
để giúp bạn có một chuyến đi Cúc Phương – Ninh Bình thật trọn vẹn.
```

“Xin chào!” script, H1 hai dòng serif trắng. Ba feature dưới: Tư vấn chân thành / Gợi ý phù hợp nhu cầu và ngân sách / Đồng hành trước – trong – sau chuyến đi. Icon trong vòng tròn kem, text trắng gọn.

Bên phải là portrait minh họa đội mũ/đồ outdoor, hiên gỗ, núi phía sau; giữ tỷ lệ người và không để đầu chạm header. Lời nhắn script “Những chuyến đi đẹp bắt đầu từ những cuộc trò chuyện chân thành.” và chữ ký. Không tự thay bằng ảnh người thật trên mạng gán tên Đinh Vân.

### 3. Form tư vấn — cột trái

Heading “Gửi yêu cầu tư vấn riêng”, subtitle “Chia sẻ với Đinh Vân kế hoạch của bạn, mình sẽ phản hồi sớm nhất!”. Form không có email bắt buộc vì ảnh không có; không tự thêm nhiều trường.

| Trường | Quy định UI |
|---|---|
| Họ và tên | Bắt buộc, text, `autocomplete=name`, trim nhưng không phá dấu/khoảng cách trong tên |
| Số điện thoại | Bắt buộc, `type=tel`, inputMode phù hợp, cho phép định dạng có khoảng trắng/+ |
| Ngày nhận phòng dự kiến | Không bắt buộc; date picker, không nhận ngày đã qua theo clock ứng dụng |
| Số khách dự kiến | Không bắt buộc; guest picker chung, không số âm/NaN |
| Nhu cầu hoặc lời nhắn | Textarea, tối đa 500 ký tự hiển thị, counter góc dưới; không log nội dung |

Hai trường mỗi hàng đầu, textarea full width. Field trắng, viền xám nhạt, bo 7–8 px, icon xanh bên trái, label ngoài input. Mẫu placeholder tên “Ví dụ: Nguyễn Văn A”; số điện thoại dùng “Ví dụ: 09xx xxx xxx” để không vô tình quảng bá số thật chưa xác nhận.

Validate khi blur/submit, không báo đỏ mọi ô ngay khi mở trang. Tên cho phép dấu, nhiều từ, tên quốc tế, không dùng regex chỉ A–Z. Phone normalize ký tự phân cách, kiểm tra hình thức hợp lý; không khẳng định chủ sở hữu/số hoạt động, không hardcode danh sách đầu số chưa được duyệt. Nếu không phân loại được, cho thông báo dễ hiểu thay vì từ chối tùy tiện.

Thông báo mẫu: “Vui lòng nhập họ và tên”, “Vui lòng kiểm tra số điện thoại”, “Ngày dự kiến không hợp lệ”, “Lời nhắn tối đa 500 ký tự”. Error liên kết bằng `aria-describedby`, input `aria-invalid`; summary khi submit lỗi đưa focus tới trường đầu. Counter không cần đọc lại với screen reader mỗi phím nếu gây ồn.

CTA full width xanh, icon send, text **“Gửi yêu cầu tư vấn ngay”**; đang xử lý dùng text rõ nghĩa và ngăn double submit. Dòng riêng tư dưới nút lấy từ config/copy đã duyệt; không tự thêm lời bảo đảm pháp lý hoặc bảo mật tuyệt đối.

### 4. Ngữ cảnh từ các màn khác

Đọc `intent` và `item` hợp lệ từ query: stay/combo/destination. Dùng ID tra fixture; không render trực tiếp HTML từ query. Hiện chip nhỏ trên form như “Tư vấn: Khám phá rừng Cúc Phương” có nút bỏ, hoặc nhãn context trong vùng lời nhắn; không thêm banner cao làm lệch layout.

Ngày/khách nhận từ selection nếu có; không ghi đè nội dung khách đang gõ khi re-render. Context không hợp lệ thì bỏ và vẫn cho nhập form. Không đưa tên, phone, ghi chú vào URL để giữ context.

### 5. Hành vi gửi khi chưa có backend

Trong nhiệm vụ này, form phải validate và phản hồi thật ở frontend, **nhưng không được giả gửi thành công**.

```text
idle → editing → validating
invalid → errors (giữ dữ liệu)
valid + demo adapter → preview (chưa gửi)
```

Bản preview/dialog sau khi thông tin hợp lệ hiển thị:

```text
Thông tin tư vấn của bạn đã được kiểm tra tại giao diện.
Đây là bản xem trước; yêu cầu chưa được gửi đến Đinh Vân.
```

Có tóm tắt có thể sửa, nút quay lại, sao chép nội dung sau hành động người dùng, và liên hệ thật chỉ khi config hợp lệ. Không toast “Đã gửi thành công”, không fake mã yêu cầu, không tự clear form khiến người dùng tưởng đã gửi.

Tách adapter để sau này nối API; trạng thái loading/error có thể kiểm thử bằng adapter fixture xác định, không random. Chỉ khi có API được giao riêng, phản hồi thành công đã xác nhận mới được chuyển sang `submitted`. Không tự tạo endpoint gửi email hoặc dùng dịch vụ form ngoài.

PII chỉ ở memory trong flow, không localStorage/sessionStorage, analytics, console hoặc query string. Không tạo file tải về chứa PII tự động. Copy clipboard phải qua click chủ động và báo trạng thái thực tế.

### 6. Liên hệ nhanh và profile — cột giữa

Khối đầu: heading “Liên hệ nhanh với Đinh Vân”, hai card CTA cạnh nhau. Gọi ngay nền xanh, icon phone trắng; Zalo nền trắng, logo thương hiệu hợp lệ màu xanh. Nếu số/URL chưa có, giữ nhãn “Thông tin đang cập nhật” và mở fallback dialog khi bấm; không tạo liên kết tới số 0901/0912 trong ảnh.

Profile card bên dưới: ảnh vuông bên trái đoạn giới thiệu, tên **Đinh Vân** serif, dòng phụ “Người tư vấn & bạn đồng hành”, quote ngắn, bốn dòng icon về địa phương, tư vấn, đồng hành, trải nghiệm. Chữ ký script ở đáy, nền silhouette nhạt.

Không mặc định advisor là chủ sở hữu các homestay. Copy “Chủ nhà”/“Hơn 1.000+ du khách” trong ảnh phải được chủ website xác nhận; dùng mô tả trung tính hoặc giữ trong fixture có cờ chưa duyệt, không công bố thành tích giả. Portrait chỉ là minh họa, không phải nhận diện thật.

### 7. Cam kết và map — cột phải

Cam kết card: bốn icon lớn trong vòng tròn kem, nhãn 2–3 dòng, heading “Cam kết từ Đinh Vân Booking”. Các ý: Phản hồi nhanh / Tư vấn phù hợp / Chi phí rõ ràng / Đồng hành chuyến đi. Mốc “30 phút”, “không phát sinh chi phí ẩn” trong ảnh không tự thành SLA vận hành.

Map card: heading “Chúng tôi ở đây”, location label chung “Cúc Phương – Ninh Bình”, link chỉ đường, map xanh nhạt, pin tên thương hiệu, note script. Địa chỉ cụ thể/đơn vị hành chính trong ảnh chưa phải địa chỉ xác minh hiện tại; để config quản lý, không tự chốt từ mockup.

Nếu chỉ có map illustration: label nhỏ “Bản đồ minh họa”, nút mở bản lớn nội bộ; không chèn tọa độ đoán vào map provider. Khi có location URL đã duyệt, chỉ đường mở tab mới an toàn. Không xin vị trí của khách.

### 8. FAQ, social và scenic CTA

Dưới form: ba accordion FAQ về giờ nhận/trả, hỗ trợ tour, gia đình có trẻ nhỏ; Xem tất cả mở thêm câu trong dialog hoặc mở rộng vùng thật. Câu trả lời định hướng tư vấn, không áp chính sách một chỗ nghỉ cho tất cả.

Dưới profile: “Kết nối cùng Đinh Vân Booking”, social SVG Facebook/Instagram/YouTube/TikTok/website, câu viết tay bên dưới. Mỗi link chỉ hoạt động với URL config đã xác minh; không tự trỏ về homepage của mạng xã hội như thể đó là tài khoản thương hiệu.

Dưới map: ảnh scenic thấp, script trắng trên gradient đủ tối, CTA “Tư vấn riêng ngay” cuộn/focus form. Dùng `scroll-margin-top` nếu header sticky; không reload trang làm mất dữ liệu đang nhập.

### 9. Responsive, component và kiểm thử

Tablet: form rộng một cột trái, contact/profile phải; map/FAQ/social xuống dưới theo nhóm. Mobile: hero → quick contact → form → profile → cam kết → map → FAQ/social/scenic CTA. H1 không đè portrait; có thể crop portrait về bên phải hoặc giảm trang trí. Form input cao tối thiểu 44 px theo tiêu chí dự án, textarea đủ cao để nhập, bàn phím không che submit.

Component: `ContactHero`, `ConsultationForm`, `ConsultationPreviewDialog`, `QuickContactCards`, `AdvisorProfile`, `ServicePromises`, `ContactMap`, `ContactFaq`, `SocialLinks`, `ScenicContactCta`.

Test tối thiểu: form trống; tên có dấu; phone có khoảng trắng/+; ngày quá khứ; 500/501 ký tự; valid form chỉ mở preview; double submit; sửa lại từ preview; query context combo/destination; contact config null; lỗi adapter fixture; không PII trong URL/storage/log.

### 10. Checklist nghiệm thu riêng

```text
[ ] Giữ hero cá nhân và ba cột form/profile/map như ảnh.
[ ] Form đủ field, label, icon, error, counter và focus đúng.
[ ] Context stay/combo/destination được điền đúng, bỏ context được.
[ ] Valid form chưa có API không báo gửi thành công, không tạo mã giả.
[ ] Phone/Zalo/social/map không sử dụng thông tin thật suy đoán.
[ ] Không gán chân dung minh họa thành ảnh thật hoặc bịa thành tích/SLA.
[ ] FAQ/scenic CTA/dialog hoạt động, dữ liệu form không bị mất vô lý.
[ ] Mobile dễ nhập, không lộ PII qua persistence/URL/log.
[ ] Có screenshot desktop/mobile/overlay và font/icon đã kiểm tra.
```

---

<a id="mh-06"></a>

## MÀN HÌNH 06 — ĐẶT PHÒNG / THÔNG TIN KHÁCH / XEM LẠI

> **Agent Opus:** lập trình `/dat-phong` theo ảnh; đọc `00_QUY_CHUAN_CHUNG.md` trước. Phạm vi là UI flow và phép tính frontend với fixture, **không thực hiện thanh toán hoặc giữ tồn phòng thật**. Giữ font, SVG, xanh–kem và phong cách cá nhân.

![Màn hình đặt phòng](./references/06-dat-phong.png)

### 1. Mục tiêu và cấu trúc desktop

```text
HEADER CHUNG
HERO THẤP: ĐẶT PHÒNG CÙNG ĐINH VÂN BOOKING
BREADCRUMB / DẢI THÔNG ĐIỆP NHỎ
STEP INDICATOR 1 → 2 → 3                SUMMARY ẢNH / PHÒNG / NGÀY
1. THÔNG TIN KHÁCH                      SUMMARY CHI TIẾT TIỀN
2. DỊCH VỤ BỔ SUNG                      TỔNG / TRẢ TRƯỚC / CÒN LẠI
3. MÃ GIẢM GIÁ & GHI CHÚ                CTA GIỮ CHỖ / REVIEW
4. PHƯƠNG ÁN THANH TOÁN                 HỖ TRỢ
DẢI 4 LỢI ÍCH
FOOTER BIẾN THỂ CÓ LIÊN KẾT CHÍNH SÁCH
```

Ở 1448 px: container chính khoảng 1260–1280 px với lề rộng hơn listing; cột trái khoảng 800–815 px, cột phải 415–430 px, gap 28–32 px. Hero thấp khoảng 135–145 px dưới header. Không dùng hero lớn như contact; không mở sidebar bộ lọc trên checkout.

```css
.checkout-shell {
  width: min(1276px, calc(100% - 96px));
  margin-inline: auto;
}
.checkout-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.9fr) minmax(0, 1fr);
  gap: 30px;
  align-items: start;
}
```

Mọi kích thước là điểm khởi tạo, chỉnh theo overlay. Các form card nền trắng, bo 8–10 px, shadow nhẹ; tiêu đề section có số trong vòng tròn xanh. Summary viền/shadow mảnh; khoản tiền quan trọng xanh đậm.

### 2. Điều kiện vào trang và step flow

Trang cần `stayId/slug`, `roomTypeId`, ngày nhận/trả, adults/children/rooms hợp lệ. Resolve từ IDs, không tin price trong query. Direct `/dat-phong` thiếu selection hiển thị empty state có CTA “Chọn phòng nghỉ”, không tự chọn ngẫu nhiên một phòng để người dùng tưởng đã đặt.

Ảnh chuẩn là trạng thái **bước 2: Thông tin khách**. Để chụp đúng, mở route với selection fixture hợp lệ từ màn 02.

| Bước | Nội dung | Điều kiện |
|---|---|---|
| 1. Chọn phòng | Listing/detail hoặc edit-selection sheet | Room type/ngày/khách hợp lệ |
| 2. Thông tin khách | Form/add-on/coupon/payment plan như ảnh | Validate thông tin cần thiết |
| 3. Xác nhận | Xem lại bản nháp và lựa chọn | Không tự tạo booking/payment thành công |

Steps dùng semantic ordered list, `aria-current=step`; không cho bấm bước sau để bỏ validation. Quay lại sửa giữ draft trong memory, không đưa PII vào URL. Step 1 sửa selection bằng sheet hoặc route có provider giữ memory; không dùng link mù làm mất toàn bộ draft.

Copy hero:

```text
Đặt phòng cùng Đinh Vân Booking
Chỉ vài bước đơn giản để bắt đầu hành trình đáng nhớ của bạn
Thiên nhiên thật gần, trải nghiệm thật ý nghĩa
```

Giữ cảnh núi và hiên gỗ bên phải, script nhỏ, breadcrumb dưới hero. Không active “Trang chủ” nhầm trên header.

### 3. Thông tin khách — khối 1

Hai hàng, ba trường mỗi hàng ở desktop:

| Field | Bắt buộc | Quy tắc |
|---|---|---|
| Họ và tên | Có | Unicode, trim đầu/cuối, không regex ASCII-only |
| Số điện thoại | Có | `type=tel`, normalize phân cách, validate hình thức hợp lý |
| Email | Có trong flow demo này | `type=email`, autocomplete; không tự gửi mail |
| Quốc tịch | Không | Default Việt Nam, select có labels tiếng Việt |
| Số lượng khách | Có | Guest picker chung; chỉnh làm cập nhật summary và giá liên quan |
| Yêu cầu đặc biệt | Không | Ngắn, ví dụ giờ đến/ăn chay; giới hạn có hướng dẫn |

Label có dấu * rõ nhưng không chỉ dùng màu để biểu thị. Placeholder không là value. Giữ input thấp gọn trên desktop, mobile tối thiểu 44 px vùng thao tác. Validation cạnh field, focus đầu lỗi khi submit. Không thu giấy tờ định danh/thông tin thẻ thanh toán trong nhiệm vụ này.

`specialRequest` và `bookingNote` ở khối 3 là hai field riêng có mục đích rõ; không ghi đè nhau. Giới hạn mẫu 300 và 500 ký tự, không mất dấu tiếng Việt.

### 4. Dịch vụ bổ sung — khối 2

Bốn card cùng hàng: ảnh trên, checkbox góc trái, tên/giá/description dưới. Toàn card là label hợp lệ cho một checkbox, không lồng button; chọn ảnh hoặc nhãn đều cập nhật cùng state.

| Add-on ID | Tên mẫu | Đơn giá fixture | Cách tính rõ ràng |
|---|---|---:|---|
| `breakfast` | Ăn sáng đặc sản địa phương | 150.000đ | Theo khách tính phí × số ngày ăn sáng |
| `airport-transfer` | Xe đón tiễn sân bay | 300.000đ | Theo số lượt, không nhân số khách/đêm |
| `forest-tour` | Tour khám phá Cúc Phương | 450.000đ | Theo số người tham gia, một lần trong kỳ nghỉ |
| `bike-rental` | Thuê xe đạp | 50.000đ | Theo số xe × số ngày thuê |

Đây là mức giá giả lập để tái tạo UI, **không phải báo giá dịch vụ thật**. Mỗi add-on có `unit`, `quantity`, `selected`, constraints; không chỉ lưu boolean rồi tự nhân tất cả cùng một công thức.

Khi chọn dịch vụ cần số lượng, mở controls gọn trong card hoặc sheet: lượt xe, người tour, số xe/ngày thuê. Summary phải cho thấy số lượng. Bỏ chọn thì xóa khoản tiền và không để quantity cũ âm/NaN.

Nếu room fixture đã gồm bữa sáng thì không thu thêm cùng loại bữa sáng: disable/label “Đã bao gồm” hoặc lựa chọn nâng cấp riêng. Default fixture dùng tính tiền bên dưới phải đánh dấu **chưa gồm bữa sáng**.

### 5. Mã giảm giá và ghi chú — khối 3

Hai cột: coupon input + nút “Áp dụng” bên trái, ghi chú bên phải. Coupon trim/uppercase; fixture hợp lệ `DVAN10` giảm 10% trên subtotal đủ điều kiện của demo. Có pending, applied, invalid, remove. Reapply cùng mã không cộng dồn. Đổi selection/add-on tính lại discount; tổng không âm.

Mã không hợp lệ không được vẫn render dòng giảm tiền như thể thành công. “Xóa mã” khôi phục giá. Không tự kết nối hệ thống coupon thật hoặc cho rằng mã minh họa dùng được khi public.

### 6. Phương án và phương thức thanh toán — khối 4

Ảnh đặt ba ô ngang nhưng đang trộn **số tiền trả trước** với **phương thức trả tiền**. Code phải tách state, vẫn giữ hình học gần mẫu:

- Hai ô đầu thuộc radio group `paymentPlan`: **Đặt cọc 30%** / **Thanh toán toàn bộ**.
- Ô thứ ba “Chuyển khoản ngân hàng” là nhóm/phần phương thức hoặc trigger xem hướng dẫn, **không phải radio thứ ba cạnh tranh với 30%/100%**. Có thể chọn cọc và chuyển khoản cùng lúc.

`paymentPlan` và `paymentMethod` là hai trường độc lập. Chỉ hiển thị phương thức đang được cấu hình. Chưa có thông tin ngân hàng thật thì mở panel “Phương thức thanh toán đang được cập nhật — đây là giao diện mô phỏng”, không dựng QR nhận tiền, số tài khoản hoặc tên người nhận giả.

Không thêm Stripe/Square/PayPal/VNPAY chỉ vì đã dùng ở dự án khác. Không thu thông tin thẻ, không tạo payment intent hay webhook trong task UI này. Copy “SSL 256-bit”, “bảo mật tuyệt đối”, “xác nhận SMS” trong ảnh không tự coi là năng lực đã triển khai.

### 7. Summary bên phải và công thức tính

Summary gồm heading; ảnh chỗ nghỉ có tên; ngày nhận/trả có giờ/đêm; room type/khách; “Thay đổi lựa chọn phòng”; bảng tiền; tổng lớn; khoản trả trước và còn lại; CTA chính; thông tin chính sách và support.

Ngày/thứ tính từ ngày đang chọn bằng locale `vi-VN`, không hardcode “Thứ 6” cho ngày khác. Không dùng ngày 2024 như lựa chọn mặc định hiện tại. Môi trường test dùng clock cố định và ngày tương lai hợp lệ.

Model tính tiền dùng số nguyên VND, formatter chung. Cấu trúc tối thiểu:

```ts
type PaymentPlan = 'deposit' | 'full';
type PaymentMethod = 'bank-transfer' | null;

type PriceSummary = {
  roomSubtotalVnd: number;
  addOnSubtotalVnd: number;
  subtotalVnd: number;
  discountVnd: number;
  totalVnd: number;
  dueNowVnd: number;
  remainingVnd: number;
};
```

Công thức demo:

```text
nights           = số ngày lịch giữa checkOut và checkIn, phải > 0
roomSubtotal     = nightlyRate × nights × roomCount
breakfast        = 150000 × breakfastGuests × breakfastDays, nếu chọn
transfer         = 300000 × transferTrips, nếu chọn
tour             = 450000 × tourParticipants, nếu chọn
bike             = 50000 × bikeCount × rentalDays, nếu chọn
subtotal         = roomSubtotal + các khoản add-on đã chọn
discount         = min(subtotal, round(subtotal × 0.10)), nếu DVAN10 hợp lệ
total            = max(0, subtotal - discount)
dueNow           = paymentPlan=deposit ? round(total × 0.30) : total
remaining        = total - dueNow
```

Trong fixture baseline: số ngày ăn sáng bằng số đêm, người tính phí bằng adults + children để mô phỏng; đây không phải chính sách giá trẻ em thật. Số người tour do người dùng chọn, tối đa số khách. Số ngày thuê xe là trường riêng, mặc định bằng số đêm nhưng không tự tính thêm ngày checkout; hiển thị rõ cách tính. Bữa sáng/tour không nhân thêm roomCount. Giới hạn số lượt/xe hợp lý trong config, validate trước khi tính.

Demo không thêm thuế/phí chưa có dữ liệu. Không ghi “đã bao gồm toàn bộ thuế/phí” chỉ vì fixture chưa tính. Sau này backend phải là nguồn giá cuối; frontend không có quyền quyết định tổng tiền giao dịch.

#### Fixture đối chiếu nhất quán

Ảnh gốc chưa tích Tour nhưng lại tính 900.000đ; room type Bungalow trong summary cũng không khớp giá thấp nhất. **Sửa hai lỗi này trong preview:** chọn `standard-garden` giá 650.000đ và tích cả breakfast + forest-tour; ghi ngoại lệ trong report. Giữ tổng tiền như mẫu:

| Khoản | Phép tính | VND |
|---|---|---:|
| Phòng Standard Garden | 650.000 × 2 đêm × 1 phòng | 1.300.000 |
| Ăn sáng | 150.000 × 2 người × 2 ngày | 600.000 |
| Tour rừng | 450.000 × 2 người | 900.000 |
| Tạm tính | Tổng ba khoản | 2.800.000 |
| DVAN10 | Giảm 10% | -280.000 |
| Tổng | Sau giảm | 2.520.000 |
| Trả trước 30% | 2.520.000 × 30% | 756.000 |
| Còn lại | Tổng – trả trước | 1.764.000 |

Đây là **fixture chụp ảnh/test được cấu hình rõ**. Khách tương tác bình thường không bị tự thêm dịch vụ/coupon mà chưa chọn. Bản preview có thể nạp fixture này bằng scenario dữ liệu, không dùng CSS/hotspot riêng cho screenshot và không bỏ validation.

### 8. CTA, bước xem lại và trạng thái kết quả

Giữ style CTA “Giữ chỗ ngay” trong ảnh ở bước 2; click thực hiện validation rồi sang bước 3 xem lại. Ngay trong bước review phải nói rõ đây là mô phỏng, không có phòng bị giữ và chưa có thanh toán.

Bước 3 không có ảnh riêng, dựng cùng components: heading “Kiểm tra thông tin đặt phòng”, summary lựa chọn, thông tin khách, dịch vụ, tổng và plan; nút sửa từng phần, checkbox xác nhận thông tin đã kiểm tra. CTA demo dùng **“Lưu bản nháp trên giao diện”** hoặc **“Xem trước yêu cầu”**, không “Đã đặt thành công”. Bản nháp chỉ ở memory và có thông báo chưa gửi.

Không sinh mã booking nhìn như mã thật, không gắn trạng thái `confirmed/paid` dựa vào click. Không hiển thị QR/thành công chuyển khoản sau một timeout. Khi chưa có API, trạng thái kết thúc chỉ `draft/review/demo-preview`.

State machine tối thiểu:

```text
missing-selection → chọn phòng
valid-selection → editing
editing + invalid form/selection → validation-errors
editing + valid data → review
review → edit (giữ memory draft)
review + demo action → demo-preview (chưa gửi/chưa thanh toán)
```

Các state integration tương lai như `submitting/payment-pending/confirmed` có thể định nghĩa interface/test harness nhưng không kích hoạt giả ở runtime demo. Không làm integration thật nếu chưa có yêu cầu riêng.

Link “Điều khoản dịch vụ”, “Chính sách hủy phòng”, “Chính sách thanh toán” mở dialog nội dung đã được chủ website duyệt. Chưa có thì ghi đang cập nhật; không tự viết cam kết pháp lý. Support dùng contact config thật hoặc fallback, không lấy số trong ảnh.

### 9. Responsive và accessibility

Tablet giữ hai cột nếu đọc được; dưới khoảng 1024 px đưa summary thành khối theo luồng. Mobile thứ tự: hero ngắn → steps → summary thu gọn chỉnh được → thông tin khách → add-ons → coupon/note → plan/method → tổng chi tiết → CTA/support. Add-ons hai cột hoặc một cột, không bốn card quá hẹp.

Có thể dùng sticky bottom tổng tiền + tiếp tục, nhưng phải đọc cùng state/validation và có padding/safe-area; không hai nút submit tạo hai lần xử lý. Error không bị bar che; đưa focus đúng field. Summary accordion có accessible state; `aria-live=polite` chỉ thông báo tổng thay đổi gọn, không đọc lại cả trang mỗi phím.

Dropdown/date picker/phone/email hoạt động trên mobile; khi bàn phím mở không che trường đang sửa. Không disable submit vô thời hạn mà không giải thích còn thiếu gì. Prevent double click trong transition bằng state thật.

### 10. Kiểm thử phép tính và hành vi bắt buộc

Tách hàm thuần để unit test, UI chỉ đọc một `PriceSummary`; không tính lại bằng công thức khác ở sticky/mobile/summary.

| Test | Kết quả với fixture baseline |
|---|---|
| Baseline: 2 đêm, breakfast + tour, DVAN10, cọc | Tổng 2.520.000; trả trước 756.000; còn lại 1.764.000 |
| Bỏ tour, giữ breakfast + DVAN10 | Subtotal 1.900.000; tổng 1.710.000; cọc 513.000; còn 1.197.000 |
| Bỏ tất cả add-on và coupon | Tổng 1.300.000; cọc 390.000; còn 910.000 |
| Baseline, chuyển trả toàn bộ | Trả trước 2.520.000; còn 0 |
| Baseline, xóa coupon | Tổng 2.800.000; cọc 840.000; còn 1.960.000 |
| Baseline, thêm 1 lượt transfer | Subtotal 3.100.000; tổng 2.790.000; cọc 837.000 |
| Reapply DVAN10 nhiều lần | Vẫn chỉ giảm một lần |
| Đổi Standard thành Family, giữ các lựa chọn baseline | Subtotal 3.900.000; tổng 3.510.000; cọc 1.053.000 |
| Same-day/checkout trước check-in/NaN/ID sai | Chặn, thông báo tiếng Việt, không tạo tổng NaN/âm |

Test thêm: roomCount=2 không nhân đôi tour/breakfast tự động; occupancy quá mức; child count; người tour vượt guests; rentalDays=0 khi chọn xe; query có price giả bị bỏ qua; sửa rồi review giữ dữ liệu; thiếu contact config; không PII vào URL/storage/log; không network payment/email ngoài ý muốn.

Component: `CheckoutHero`, `BookingSteps`, `GuestInformationForm`, `AddOnCard`, `CouponForm`, `PaymentPlanSelector`, `PaymentMethodPanel`, `BookingSummary`, `BookingReview`, `DraftPreview`, `SupportCard`.

### 11. Checklist nghiệm thu riêng

```text
[ ] Đúng hai cột form/summary, hero thấp, steps và bốn khối đánh số.
[ ] Direct route thiếu selection có empty state, không chọn phòng ngầm.
[ ] Form có đủ label/validation, số khách đồng bộ pricing/occupancy.
[ ] Add-on checkbox/quantity và dòng tiền hoàn toàn khớp.
[ ] Room type Standard/Deluxe/Family không lẫn giá.
[ ] Payment plan khác payment method, cọc + chuyển khoản chọn được cùng lúc.
[ ] Test số tiền trong bảng đã chạy, một nguồn tính cho mọi summary.
[ ] Step 3 xem lại/sửa được, không giả giữ chỗ/booking/paid thành công.
[ ] Không có QR/tài khoản/cổng thanh toán hoặc contact tự bịa.
[ ] Responsive/keyboard/safe-area/error focus đúng, không che submit.
[ ] Có screenshot desktop/mobile/overlay và báo rõ hiệu chỉnh lỗi trong ảnh.
```

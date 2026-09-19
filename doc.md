# AGENT OPUS — LẬP TRÌNH HOMEPAGE ĐINH VÂN BOOKING

> **Nhiệm vụ:** xây dựng giao diện frontend thật theo đúng **ảnh tham chiếu mới nhất**, hướng tới pixel-perfect; không thiết kế lại, không làm một website chỉ tương tự về chủ đề.
>
> **Thương hiệu:** Đinh Vân Booking. **Lĩnh vực:** tư vấn, booking phòng tại Cúc Phương, Ninh Bình. **Tinh thần:** cá nhân, bản địa, thân thiện; không phải giao diện của một sàn đặt phòng đại trà.
>
> **Ưu tiên:** bố cục và hình ảnh → typography tiếng Việt → màu sắc → icon → tương tác → responsive. Tất cả đều phải được kiểm tra bằng trình duyệt, không chỉ bằng việc đọc source.

## 1. Đầu vào, phạm vi và nguyên tắc thực hiện

Ảnh chuẩn là **`dinh-van-booking-reference.png`**, kích thước gốc **1448 × 1086 px**, đi kèm tài liệu này. Đây là bản có nút “Đặt ngay” kèm mũi tên, bốn thẻ phòng và một thẻ quảng bá bên phải.

![Ảnh tham chiếu giao diện Đinh Vân Booking](./dinh-van-booking-reference.png)

Đọc `AGENTS.md`, cấu trúc source, `package.json`, lockfile và các component/assets sẵn có trước khi sửa. Nếu có dự án đang chạy, làm việc trong dự án đó; không tự tạo thêm một ứng dụng độc lập, không nâng major dependencies ngoài phạm vi.

Nếu chưa có source, dùng **Next.js App Router + TypeScript**, CSS Modules hoặc Tailwind kết hợp CSS tùy biến. Giữ phiên bản thư viện tương thích và khóa bằng lockfile. Đây là lựa chọn triển khai của tài liệu, không phải yêu cầu phải chuyển framework của một dự án đã có.

Phạm vi là homepage responsive và các tương tác frontend cần thiết. Chưa làm backend, thanh toán, quản lý tồn phòng, đăng nhập hoặc admin. Không tự push, merge hay triển khai production nếu chưa được giao. Giao diện có thể dùng dữ liệu mẫu có cấu trúc để nối API sau.

**Không được làm:**

- Không đổi thành landing page tối giản khác bố cục; không thêm hero cao 600–800 px, section khổng lồ hoặc khoảng trắng làm mất tỷ lệ của ảnh.
- Không dùng ảnh chụp toàn trang làm website, canvas toàn trang, hoặc đặt các hotspot lên ảnh để giả giao diện. Chữ, nút, biểu mẫu và thẻ phải là DOM thật.
- Không dùng emoji, icon font, ký tự Unicode giả icon, ảnh icon mờ hoặc thư viện icon tải từ CDN.
- Không làm toàn bộ trang thành Client Component khi chỉ một số phần cần state.
- Không dùng `transform: scale(...)`, CSS `zoom` hoặc thu nhỏ toàn bộ trang để ép screenshot khớp ảnh.

**Về mục tiêu 100%:** ảnh là bản render, không chứa thông tin tên font gốc và không có sẵn tất cả lớp ảnh nền sạch. Phải tái tạo sát nhất có thể, đo và đối chiếu thật. Không tự tuyên bố khớp 100% nếu chưa kiểm tra, hoặc khi ảnh nền/font còn thay thế. Ghi rõ sai khác còn lại, tiếp tục hoàn thiện phần có thể làm, không lấy hạn chế asset làm lý do dừng toàn bộ công việc.

## 2. Bản đồ bố cục desktop

Thiết lập viewport kiểm tra chính **1448 × 1086**, device scale factor 1, browser zoom 100%, scroll ở đầu trang. Đây là kích thước đối chiếu, không phải chiều cao cố định của website trên mọi thiết bị.

Các mốc dưới đây là **ước lượng khởi tạo từ ảnh**; mở PNG và đo lại khi căn chỉnh. Không coi chúng là tọa độ CSS tuyệt đối cho toàn trang.

| Khu vực | Vị trí / tỷ lệ cần tái tạo |
|---|---|
| Header | Cao khoảng 50–54 px; nền trắng ngà; logo trái, menu giữa, tiện ích phải |
| Hero | Ngay dưới header, cao khoảng 312–316 px ở viewport chuẩn; cảnh núi rừng và hiên nhà gỗ |
| Thanh tìm phòng | Trong phần dưới bên trái hero; xấp xỉ x=86, y=288, rộng 750 px, cao 66 px |
| Dải cam kết | Ngay sau hero, cao khoảng 45–47 px; bốn nhóm icon/text ngang |
| Phòng nghỉ + quảng bá | Bắt đầu khoảng y=427; lề nội dung khoảng 36–38 px; bốn thẻ trái và một panel phải |
| Vì sao chọn + khám phá | Khối trái ở phần dưới, chiếm khoảng 62% chiều rộng nội dung |
| Đánh giá + liên hệ cá nhân | Khối phải ở phần dưới, chiếm khoảng 36%, cách trái khoảng 20 px |
| Footer | Bắt đầu khoảng y=993; nền kem và silhouette rừng/núi rất nhạt |

Bố cục tổng thể:

```text
HEADER: LOGO                  MENU                  SEARCH / CTA
HERO: TEXT + SEARCH                 NÚI RỪNG + HIÊN NHÀ GỖ
TRUST STRIP:          4 CỤM ICON VÀ NỘI DUNG
FEATURED:     4 THẺ PHÒNG                    PANEL TRẢI NGHIỆM
LOWER LEFT: VÌ SAO CHỌN             LOWER RIGHT: ĐÁNH GIÁ
LOWER LEFT: 5 ĐIỂM ĐẾN              LOWER RIGHT: LIÊN HỆ CÁ NHÂN
FOOTER: LOGO / LINKS / CONTACT / SOCIAL / QUOTE
```

Không xếp “Vì sao chọn”, “Đánh giá”, “Khám phá” và “Liên hệ” thành bốn section full-width liên tiếp trên desktop: như vậy sai bố cục ảnh.

Khởi tạo grid, sau đó tinh chỉnh bằng overlay:

```css
.content-shell {
  width: min(1376px, calc(100% - 72px));
  margin-inline: auto;
}
.featured-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 276px;
  gap: 20px;
  align-items: stretch;
}
.stay-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}
.lower-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.65fr) minmax(0, 1fr);
  gap: 20px;
}
.destination-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 10px;
}
```

Header và phần chữ hero có container riêng để khớp vị trí trong ảnh. Không ép tất cả section dùng một left padding nếu ảnh cho thấy chúng khác nhau. Chỉ dùng `position: absolute` cho lớp trang trí, overlay ảnh, badge, icon nổi và các thành phần thực sự chồng lớp.

## 3. Màu sắc và chi tiết bề mặt

Giữ tone **xanh rừng — trắng ngà — kem — xanh lá dịu**, điểm vàng nhẹ ở rating và ánh sáng nhà gỗ. Không thay bằng xanh neon, gradient tím hoặc nền đen.

Bộ token sau là điểm khởi tạo theo quan sát, không phải bảng màu trích xuất tuyệt đối:

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
  --dvb-shadow-search: 0 8px 24px rgb(15 36 18 / 16%);
}
```

CTA là xanh đậm, có thể dùng gradient xanh rất nhẹ như ảnh. Border mảnh, shadow mềm, bo góc vừa phải. Không biến mọi phần thành pill, không dùng shadow đen dày. Họa tiết lá ở mép trang và rừng dưới footer phải mờ, không tranh chấp với nội dung.

## 4. Typography — yêu cầu đặc biệt quan trọng

### 4.1. Bộ font đề xuất

Đây là **font thay thế được chọn theo hình dáng trong ảnh**, không khẳng định là font gốc:

| Vai trò | Font ưu tiên | Weight khởi tạo | Cách dùng |
|---|---|---|---|
| Logo, H1 và heading section | **Playfair Display** | 600–700 | Serif rõ nét, giữ chất nghỉ dưỡng cá nhân |
| Menu, nội dung, nhãn, giá, nút | **Roboto Condensed** | 400–700 | Dáng gọn, hợp mật độ nội dung trong ảnh |
| Câu viết tay, chữ ký, lời nhắn | **Dancing Script** | 400–600 | Chỉ dùng ở các điểm nhấn viết tay |

Metadata chính thức của cả ba font có subset `vietnamese`. [S2][S3][S4]

Có thể thử **Lora 700** thay Playfair Display nếu đối chiếu cho thấy hình chữ sát hơn; Lora cũng có subset tiếng Việt. [S5] Chỉ chốt **một** font serif cho giao diện, không tải cả hai font serif lên bản cuối chỉ để thử nghiệm.

Không dùng Arial/Inter/Geist cho tất cả phần chữ. Không thay Dancing Script bằng font mặc định `cursive` của hệ điều hành. Font viết tay phải đẹp và đọc được các dấu của “Đinh Vân”, “Cúc Phương”, “trải nghiệm”, “bình yên”.

### 4.2. Cấu hình font trong Next.js

Dùng `next/font/google` để self-host font cùng ứng dụng; trình duyệt người dùng không phải lấy font trực tiếp từ Google. Đây là cơ chế được tài liệu Next.js mô tả. [S1] Nếu môi trường build không truy cập được nguồn font, dùng `next/font/local` với file có nguồn và giấy phép phù hợp, đã kiểm tra glyph tiếng Việt; không lặng lẽ đổi sang font hệ thống.

Ví dụ `src/app/fonts.ts`:

```ts
import {
  Playfair_Display,
  Roboto_Condensed,
  Dancing_Script,
} from 'next/font/google';

export const displayFont = Playfair_Display({
  subsets: ['latin', 'latin-ext', 'vietnamese'],
  weight: ['600', '700'],
  style: 'normal',
  display: 'swap',
  variable: '--font-dvb-display',
});

export const uiFont = Roboto_Condensed({
  subsets: ['latin', 'latin-ext', 'vietnamese'],
  weight: ['400', '500', '600', '700'],
  style: 'normal',
  display: 'swap',
  variable: '--font-dvb-ui',
});

export const scriptFont = Dancing_Script({
  subsets: ['latin', 'latin-ext', 'vietnamese'],
  weight: ['400', '500', '600'],
  style: 'normal',
  display: 'swap',
  variable: '--font-dvb-script',
});
```

Gắn cả ba biến trên root layout, đặt `lang="vi"`. Giữ cấu trúc layout, metadata và providers đang có của dự án.

```tsx
<html
  lang="vi"
  className={`${displayFont.variable} ${uiFont.variable} ${scriptFont.variable}`}
>
  <body>{children}</body>
</html>
```

```css
body {
  font-family: var(--font-dvb-ui), Arial, sans-serif;
  font-weight: 400;
  color: var(--dvb-text);
  font-synthesis: none;
}
h1, h2, .brand-wordmark {
  font-family: var(--font-dvb-display), Georgia, serif;
}
.handwritten {
  font-family: var(--font-dvb-script), cursive;
  font-style: normal;
  font-weight: 500;
  line-height: 1.2;
  padding-block: 0.08em;
  overflow: visible;
}
```

Không dùng italic giả cho font chỉ tải bản normal. Nếu một component thật sự cần italic, tải style tương ứng hoặc dùng kiểu chữ đã có; không để `font-synthesis: none` làm mất phong cách mà không kiểm tra.

### 4.3. Thang chữ để bắt đầu căn chỉnh

| Thành phần | Cỡ desktop tham khảo | Lưu ý |
|---|---|---|
| Wordmark header | 20–22 px | Bold, tagline nhỏ bên dưới |
| H1 hero | 40–44 px | Hai dòng giống ảnh; line-height khoảng 1.04–1.12 |
| “cùng Đinh Vân Booking” | 31–35 px | Viết tay, nhẹ hơn H1 |
| Lời dẫn viết tay đầu hero | 20–23 px | Hai dòng, không to bằng H1 |
| Heading section | 23–26 px | Tinh chỉnh độ đậm và độ rộng chữ |
| Heading đánh giá | 20–22 px | Không vượt chiều rộng panel |
| Heading viết tay trong panel | 29–35 px | Giữ khoảng thở cho dấu tiếng Việt |
| Menu, nút, nội dung chính | 12–14 px | Cân theo mật độ ảnh tại 1448 px |
| Tên phòng, giá | 14–16 px | Tên phòng gọn; giá đậm |
| Metadata thẻ, footer | 11–12 px | Không thu nhỏ hơn chỉ để che lỗi layout |

Không lấy các cỡ này làm lý do cắt dấu hoặc ép chữ bằng `scaleX`. Nếu chữ xuống dòng khác mẫu, kiểm tra đúng font đã tải → weight → chiều rộng container → font-size → letter-spacing. Không lạm dụng tracking âm.

### 4.4. Không mojibake, không thiếu glyph

Tất cả source, JSON và Markdown dùng UTF-8. Thêm `.editorconfig` với `charset = utf-8`. Nội dung tiếng Việt viết trực tiếp và chuẩn hóa NFC khi nhập dữ liệu. Không xử lý UTF-8 như Latin-1, không dùng thủ thuật `escape/unescape`, không bỏ dấu để chữa lỗi font.

Chuỗi thử bắt buộc cho cả ba font:

```text
Đinh Vân Booking — Cúc Phương, Ninh Bình
Đặt phòng dễ dàng hơn, trở về những điều bình yên.
Phòng nghỉ tuyển chọn • Trải nghiệm trọn vẹn
Ă Â Đ Ê Ô Ơ Ư ă â đ ê ô ơ ư
Ắ Ằ Ẳ Ẵ Ặ Ấ Ầ Ẩ Ẫ Ậ Ế Ề Ể Ễ Ệ
Ố Ồ Ổ Ỗ Ộ Ớ Ờ Ở Ỡ Ợ Ứ Ừ Ử Ữ Ự
Từ 1.200.000đ / đêm
```

Kiểm tra dấu không bị cắt ở phần trên/dưới dòng, không xuất hiện ô vuông, ký tự thay thế `U+FFFD`, hoặc các chuỗi mojibake như `Ä‘`, `Æ°`, `áº`, `á»`. Không đánh dấu mọi ký tự `Â`/`Ã` là lỗi vì bản thân chúng có thể là chữ tiếng Việt hợp lệ.

## 5. Icon và logo — dùng SVG thật

Dùng **`lucide-react`** cho icon chức năng. Lucide React cung cấp các component inline SVG và cho phép tùy chỉnh kích thước, màu, stroke. [S6] Import trực tiếp các icon đã xác minh tồn tại ở phiên bản trong lockfile; TypeScript phải kiểm tra được. Không tự đoán tên export rồi tắt lỗi build.

| Vị trí | Icon gợi ý / hướng xử lý |
|---|---|
| Tìm kiếm / ngày / khách | Search, CalendarDays, UserRound hoặc Users |
| Dropdown / điều hướng | ChevronDown, ChevronLeft, ChevronRight, ArrowRight |
| Yêu thích / rating | Heart; Star SVG tô vàng cho rating |
| Cam kết | Leaf, Heart, ShieldCheck, Users |
| Lý do lựa chọn | UserRound, House, MessageCircle, Tag, Map |
| Liên hệ | Phone, Mail, MapPin |
| Menu mobile | Menu, X |

Thông số khởi tạo: icon nhỏ 14–16 px; icon nút 16–18 px; icon search form 23–25 px; icon lý do lựa chọn 25–29 px. Stroke khoảng 1.7–2 px, `currentColor`, `flex-shrink: 0`. Icon trong dải cam kết có thể dùng bản filled SVG tùy biến để sát ảnh, không ép mọi icon phải là nét mảnh.

Logo núi là một `DinhVanMark` SVG riêng: cụm đỉnh núi, nét cây/rừng và chân núi màu xanh đậm. Wordmark **“Đinh Vân Booking” phải là text**, không cắt nguyên logo kèm chữ từ screenshot thành ảnh mờ. Ưu tiên file logo gốc nếu dự án có.

Logo mạng xã hội và Zalo phải dùng SVG thương hiệu hợp lệ, lưu local hoặc component SVG riêng. **Không giả định Lucide có Facebook, Instagram, TikTok, YouTube hoặc Zalo** ở phiên bản đang dùng. Không thay logo Zalo bằng emoji hoặc ký tự trong vòng tròn. Chưa có asset hợp lệ thì dùng nút chữ rõ ràng và ghi asset còn thiếu, không vẽ nhầm thương hiệu.

Icon trang trí đặt `aria-hidden="true"`. Nút chỉ có icon phải có accessible name, ví dụ `aria-label="Tìm phòng"`, `aria-label="Lưu phòng nghỉ"`; nút yêu thích dùng `aria-pressed`. Hover/focus không được làm icon biến mất vì mất màu, mất kích thước hoặc bị container cắt.

## 6. Chuẩn bị ảnh và các lớp trang trí

Chất lượng và bố cục ảnh quyết định độ giống rất lớn. Không thay ảnh rừng/núi/hiên nhà bằng biển, khách sạn đô thị hoặc ảnh ngẫu nhiên chỉ cùng màu xanh.

| Asset dự kiến | Yêu cầu hình ảnh |
|---|---|
| `hero-cuc-phuong.webp` | Panorama núi đá vôi, thung lũng xanh, sương và nắng sớm; hiên nhà gỗ cùng đèn ấm ở bên phải |
| `stay-forest.webp` | Bungalow/nhà gỗ giữa cây xanh, ánh đèn ấm |
| `stay-retreat.webp` | Phòng ngủ cửa kính lớn, giường và view xanh |
| `stay-eco-lodge.webp` | Cụm bungalow cạnh mặt nước, núi/rừng phía sau |
| `stay-moc-son.webp` | Phòng ngủ và ban công nhìn ra thiên nhiên |
| `experience-promo.webp` | Người đội mũ đeo balô nhìn cảnh núi, nằm về góc dưới phải |
| `destination-*.webp` | Năm ảnh: rừng Cúc Phương, hồ Yên Quang, đường vào động, Tràng An, ẩm thực |
| `advisor-cutout.webp` | Nhân vật minh họa đội mũ, mặc đồ outdoor ở panel liên hệ; ưu tiên lớp nền trong suốt |
| `testimonial-avatar.webp` | Avatar minh họa tròn theo mẫu |
| `leaves-*.svg`, `forest-footer.svg` | Lá mờ ở mép và silhouette rừng/núi dưới chân trang |

**Quy trình asset:** tìm ảnh gốc trong source/tệp được cung cấp trước. Có thể crop vùng chỉ chứa ảnh từ reference để làm preview nếu đủ sạch; không crop kèm giá, chữ, trái tim hoặc badge rồi render chúng lần nữa bằng DOM. Không dùng crop nhỏ phóng lớn làm hero.

Ảnh tham chiếu là ảnh đã ghép chữ và UI. Hero, bảng gỗ và panel liên hệ **không mặc nhiên là các asset sạch có thể tách hoàn hảo**. Khi thiếu lớp gốc, ghi vào `docs/asset-audit.md`, phục dựng lớp ảnh bằng công cụ thực sự sẵn có hoặc dùng ảnh thay thế phù hợp có nguồn sử dụng. Mô tả rõ phần nào chưa trùng; không giấu sai khác.

Không mặc định có sẵn công cụ sinh/chỉnh ảnh hoặc credentials dịch vụ. Không để việc thiếu một ảnh ngăn cản hoàn thiện layout, font, icon và tương tác. Tuy nhiên, ảnh thay thế vẫn là sai khác cần báo, không được tính là đã khớp tuyệt đối.

Chữ viết tay, tiêu đề quảng bá, lời nhắn và CTA phải là text DOM. Riêng chữ trên vật thể trong ảnh như bảng gỗ có thể là texture trang trí; không lặp lại cùng chữ thành hai lớp. Khi phục dựng bảng gỗ sạch, ưu tiên đặt lại lời nhắn bằng text riêng.

Ảnh thumbnail dùng `object-fit: cover` với `object-position` được căn từng tấm; không lặp một ảnh cho nhiều phòng. Lưu asset local, không hotlink nguồn bất ổn. Với `next/image`, khai báo kích thước hoặc container có tỷ lệ, thêm `sizes` theo layout; chỉ ưu tiên tải ảnh hero thực sự quan trọng. Kiểm tra API phù hợp phiên bản cài đặt.

Ảnh người trong mockup là **minh họa**, không được tuyên bố là ảnh thật của chủ thương hiệu/khách hàng. Không tự lấy ảnh người thật bất kỳ để gán danh tính Đinh Vân.

## 7. Đặc tả từng khu vực

### 7.1. Header

Nền trắng ngà, gọn, không dùng glassmorphism quá mạnh. Logo núi bên trái, wordmark serif xanh và tagline nhỏ **“Ở ĐÂY CÓ NHỮNG CHUYẾN ĐI Ý NGHĨA”**.

Menu theo thứ tự: **Trang chủ — Phòng nghỉ — Combo du lịch — Điểm đến — Liên hệ**. “Trang chủ” xanh đậm, underline mảnh. Bên phải là icon lá và hai dòng **“Du lịch bản địa / Kết nối những giá trị thật”**, nút tìm kiếm tròn, nút xanh **“Đặt ngay”** kèm mũi tên.

Không thêm số điện thoại lớn, language switcher, nút đăng nhập, giỏ hàng hoặc thông báo nổi làm đổi hình mẫu. Header mặc định không sticky; nếu code nền đã có sticky, bảo đảm trạng thái ở đầu trang vẫn khớp và không che nội dung/focus.

### 7.2. Hero

Giữ vùng trái đủ tối bằng gradient chuyển sang trong suốt ở phía phải. Không phủ đen toàn bộ ảnh. Hiên gỗ, ánh đèn, lan can và cây xanh bên phải phải còn rõ; khối chữ không tràn vào vùng này.

Copy và ngắt dòng desktop:

```text
Về với thiên nhiên,
trở về những điều bình yên

Đặt phòng Cúc Phương
Ninh Bình dễ dàng hơn

cùng Đinh Vân Booking

Local hỗ trợ tận tâm · Phòng nghỉ tuyển chọn · Trải nghiệm trọn vẹn
Đồng hành cùng bạn khám phá vẻ đẹp nguyên sơ của Cúc Phương và Ninh Bình.
```

Dòng đầu và “cùng Đinh Vân Booking” dùng font viết tay. H1 trắng, serif đậm. H1 chỉ có một trên trang. Lời nhắn nhỏ bên phải dùng font viết tay:

```text
Cúc Phương
luôn đẹp hơn,
khi có bạn ở đây!
```

Bảng gỗ ở phải có lời nhắn **“Những chuyến đi đẹp bắt đầu từ những người đáng tin...”** và chữ ký **“Đinh Vân Booking”**. Giữ như chi tiết nền, không biến thành panel UI lớn.

### 7.3. Thanh tìm phòng

Đặt **trong hero**, dưới phần chữ, không chuyển thành search bar full-width bên dưới. Khung trắng, viền kem/xanh nhạt dày vừa phải, bo khoảng 23 px. Bên trong gồm:

| Ô | Nhãn | Giá trị mặc định |
|---|---|---|
| Calendar | Ngày nhận phòng | Chọn ngày |
| Calendar | Ngày trả phòng | Chọn ngày |
| User | Số khách | 2 khách |
| CTA xanh | Tìm phòng | Icon search phía trước |

Icon nằm trong ô nền kem nhạt. Separator dọc rất mảnh. Button xanh có chiều cao hài hòa với khung ngoài. Calendar/popover phải mở ra thật, bàn phím dùng được, không bị hero `overflow: hidden` cắt; dùng portal phù hợp.

### 7.4. Dải cam kết

Bốn cụm nằm trên một hàng, nền kem nhạt:

```text
Phòng nghỉ chất lượng / tuyển chọn kỹ lưỡng
Tư vấn tận tình như người địa phương
Giá tốt, không qua trung gian
Đồng hành trước - trong - sau chuyến đi
```

Icon lần lượt lá, trái tim, khiên, nhóm người. Không đóng mỗi cụm thành một card lớn. Đây là copy từ mockup để đối chiếu; các tuyên bố thương mại cần được chủ website xác nhận trước khi xuất bản thật.

### 7.5. Phòng nghỉ nổi bật và panel quảng bá

Heading **“Phòng nghỉ nổi bật”**, icon lá nhỏ, subtitle **“Những nơi lưu trú được yêu thích nhất tại Cúc Phương”**. “Xem tất cả” có mũi tên, căn phải khu vực bốn thẻ, không căn tận mép ngoài của panel quảng bá.

Bốn thẻ phòng theo đúng thứ tự, hiển thị đủ tại desktop. Ảnh nằm trên, gần tỷ lệ 2.5:1; bên dưới tên phòng, một dòng rating, location, tags, cuối thẻ là giá trái và CTA phải. Border rất nhẹ, shadow mềm. Không thêm gallery dots, nút đặt ngay thứ hai hoặc mô tả dài.

| Tên phòng mẫu | Rating / số đánh giá mẫu | Nội dung vị trí | Tiện ích ngắn | Giá mẫu / đêm |
|---|---|---|---|---:|
| Cúc Phương Forest Homestay | 4.9 / 128 | Gần Vườn quốc gia Cúc Phương | Không gian xanh · Phù hợp gia đình | 650.000đ |
| An Nhiên Retreat | 4.8 / 96 | Giữa thiên nhiên yên tĩnh | View núi · Không gian riêng tư | 850.000đ |
| Cúc Phương Eco Lodge | 4.9 / 112 | Gần hồ Yên Quang | Không gian xanh · Trải nghiệm thiên nhiên | 1.200.000đ |
| Mộc Sơn Homestay | 4.7 / 85 | Gần trung tâm, thuận tiện di chuyển | Phòng hiện đại · Phù hợp cặp đôi | 700.000đ |

Mỗi thẻ có heart trắng ở góc trên phải ảnh; thẻ đầu có badge xanh **“Bán chạy”**. Không còn heart/badge bị “in sẵn” trên ảnh nền phía dưới icon thật. Giá có chữ “Từ”, phần tiền đậm, `/ đêm` nhỏ. CTA **“Xem chi tiết”** kèm mũi tên.

Panel quảng bá bên phải bắt đầu gần ngang heading section, cao đến đáy thẻ. Nền kem, cảnh núi và nhân vật ở dưới phải. Nội dung:

```text
Không chỉ là
phòng nghỉ...

Mà còn là những trải nghiệm
đáng nhớ giữa thiên nhiên
Cúc Phương.

Khám phá ngay

“Đi để thấy
thiên nhiên thật tuyệt!”
```

### 7.6. Vì sao nên chọn

Ở phía trái của lower grid. Heading hai dòng **“Vì sao nên chọn / Đinh Vân Booking?”** và phần giới thiệu ngắn. Bên cạnh là năm icon trong vòng tròn kem, nhãn gọn bên dưới:

```text
Người địa phương / tư vấn tận tâm
Phòng nghỉ / tuyển chọn kỹ
Hỗ trợ nhanh chóng / qua Zalo, điện thoại
Giá tốt / không qua trung gian
Gợi ý lịch trình, điểm đến / phù hợp nhu cầu
```

Copy giới thiệu: **“Không chỉ đặt phòng, mình đồng hành cùng bạn trong suốt hành trình khám phá Cúc Phương - Ninh Bình.”** Giữ cùng một hàng như mẫu khi đủ chiều rộng; không biến thành năm khối cao.

### 7.7. Đánh giá khách hàng

Ở phía phải của lower grid, phía trên panel liên hệ. Heading **“Khách hàng nói về Đinh Vân Booking”**, link “Xem thêm”. Một card ngang với avatar tròn bên trái, nội dung phải, nút prev/next và pagination dots nhỏ.

Nội dung mặc định dùng để đối chiếu:

```text
“Chuyến đi Cúc Phương của gia đình mình thật tuyệt vời!
Anh Đinh Vân tư vấn rất nhiệt tình, phòng đẹp, đúng như
hình ảnh. Cảm giác rất an tâm vì có người bản địa hỗ trợ.”

Nguyễn Thu Hà
Gia đình có trẻ nhỏ
```

Đây là testimonial mẫu của thiết kế, không phải đánh giá đã xác minh. Không xuất review structured data từ nội dung này. Nếu dựng các slide khác để thử tương tác, gắn cờ demo trong dữ liệu và giữ slide trên làm trạng thái mặc định. Không autoplay.

### 7.8. Khám phá Cúc Phương - Ninh Bình

Nằm dưới “Vì sao chọn” trong cùng cột trái. Heading **“Khám phá Cúc Phương - Ninh Bình”**, subtitle **“Không chỉ là nghỉ dưỡng, mà còn là những trải nghiệm đáng nhớ.”** và “Xem tất cả”.

Năm thẻ ảnh nằm ngang:

| Tên | Dòng phụ |
|---|---|
| Vườn quốc gia Cúc Phương | Khám phá rừng nguyên sinh |
| Hồ Yên Quang | Vẻ đẹp yên bình giữa núi rừng |
| Động người xưa | Dấu tích lịch sử hàng nghìn năm |
| Tràng An - Ninh Bình | Non nước hữu tình, di sản thế giới |
| Ẩm thực Ninh Bình | Thưởng thức đặc sản địa phương |

Chữ nằm bên dưới ảnh, không đặt toàn bộ tiêu đề lên ảnh tối như một thiết kế khác. Thẻ bo góc nhỏ, khoảng cách gọn. Đây là copy mẫu từ hình, không phải dữ liệu hướng dẫn du lịch đã được kiểm chứng.

### 7.9. Panel liên hệ cá nhân

Nằm dưới testimonial ở cột phải. Nền cảnh núi xanh nhạt, nhân vật minh họa ở phải; vùng text ở trái có lớp nền đủ sáng. Không để người che CTA hoặc bị méo tỷ lệ đầu/cơ thể.

```text
Bạn cần tư vấn riêng?

Hãy liên hệ với mình để được gợi ý phòng nghỉ,
lịch trình phù hợp nhất nhé!

Nhắn Zalo ngay     Gọi cho mình

Đinh Vân – Người bản địa, luôn sẵn sàng hỗ trợ bạn!
```

Lời nhắn nhỏ cạnh nhân vật: **“Hẹn gặp bạn ở Cúc Phương!”**. Dùng heart SVG nếu cần, không dùng emoji. Nút Zalo xanh đậm; nút gọi nền sáng, icon xanh.

### 7.10. Footer

Nền kem với silhouette rừng/núi mờ. Các cột gọn: logo và tagline; liên kết nhanh; thông tin liên hệ; theo dõi mình; câu trích dẫn. Mạng xã hội theo thứ tự Facebook, Instagram, YouTube, TikTok.

Quote: **“Những chuyến đi không chỉ để đến, mà còn để yêu thêm cuộc sống này.” — Đinh Vân Booking**. Dòng cuối có copyright và **“Du lịch bản địa - Lan tỏa những giá trị thật”**.

Số điện thoại bị che, email, địa chỉ chi tiết và năm copyright trong ảnh là dữ liệu minh họa. Đưa qua config, không tự bịa số điện thoại hoặc gắn link email/Zalo tưởng tượng. Với preview đối chiếu có thể giữ nhãn mẫu; không biến chúng thành liên hệ hoạt động. Trước production phải thay thông tin đã xác nhận; không cố định năm 2024 từ hình cho website thật.

## 8. Tách dữ liệu và cấu hình

Tách nội dung khỏi JSX để có thể thay dữ liệu mà không phá giao diện. Gợi ý cấu trúc:

```text
src/
  app/
    layout.tsx
    page.tsx
    globals.css
    fonts.ts
  components/
    home/
      SiteHeader.tsx
      HeroSection.tsx
      BookingSearch.tsx
      TrustStrip.tsx
      FeaturedStays.tsx
      StayCard.tsx
      ExperiencePromo.tsx
      WhyChooseUs.tsx
      DestinationGrid.tsx
      Testimonials.tsx
      PersonalContact.tsx
      SiteFooter.tsx
    ui/
      BrandLogo.tsx
      BrandIcons.tsx
      DateRangePicker.tsx
      GuestPicker.tsx
      DetailDialog.tsx
      ConsultationDialog.tsx
  data/
    home-fixtures.ts
  config/
    site.ts
public/
  images/dinh-van-booking/
docs/
  reference/dinh-van-booking-reference.png
  asset-audit.md
  ui-verification.md
tests/
  home.spec.ts
```

Đây là gợi ý tổ chức; tái sử dụng cấu trúc tốt đang có thay vì di chuyển source vô ích. Không tạo hàng loạt abstraction khó chỉnh pixel.

Config phải phân biệt rõ `preview` và `production`, trạng thái dữ liệu demo, phone/email/social/Zalo URL chưa xác nhận. Các trường chưa có để `null`; không dùng URL thật suy đoán. Phòng nghỉ lưu giá dạng số VND, rating dạng số, đánh giá dạng số, ảnh có alt, ID/slug ổn định. Format tiền nhất quán với ảnh, không hardcode giá trong nhiều component.

Preview đặt `noindex` và không công bố structured data về giá, availability hoặc review mẫu. Không gửi thông tin người dùng đến backend/dịch vụ ngoài khi chưa có tích hợp thật. Ghi chặn phát hành production nếu vẫn còn thông tin thương mại/nhận diện chưa xác nhận.

## 9. Các tương tác phải hoạt động

| Thành phần | Hành vi tối thiểu |
|---|---|
| Trang chủ | Trở về đầu trang |
| Phòng nghỉ / Điểm đến / Liên hệ | Scroll tới section thật, có target ID đúng |
| Combo du lịch | Mở hộp tư vấn combo; không thêm section lớn ngoài ảnh |
| Search header / Đặt ngay | Đưa focus tới biểu mẫu tìm phòng |
| Chọn ngày | Chọn range thật; trả phòng sau nhận phòng; thông báo lỗi bằng tiếng Việt |
| Số khách | Popover tăng/giảm, giới hạn hợp lý; cập nhật nhãn |
| Tìm phòng | Validate rồi hiển thị/lọc gợi ý fixture; không giả báo còn phòng theo ngày |
| Heart | Toggle, cập nhật accessible state; có thể lưu localStorage sau hydration |
| Xem chi tiết / thẻ điểm đến | Mở dialog chi tiết frontend hoặc route đã có; không điều hướng 404 |
| Xem tất cả | Mở danh sách/dialog phù hợp từ dữ liệu hiện có; không dùng `href="#"` vô nghĩa |
| Prev/next đánh giá | Đổi slide demo bằng state, có nhãn accessible |
| Zalo / gọi / social | Chỉ mở liên hệ khi URL/số đã cấu hình hợp lệ |

Nếu chưa có liên hệ thật, nút mở dialog nói rõ **“Thông tin liên hệ đang được cập nhật”**, cho người xem sao chép nhu cầu đã chọn; không mở số điện thoại mẫu. Nếu chưa có backend, không hiển thị “Gửi thành công” hoặc “Đặt phòng thành công”.

Sau tìm kiếm preview, hiển thị giải thích ngắn: **“Đây là gợi ý theo nhu cầu; tình trạng phòng sẽ được xác nhận khi tư vấn.”** Chỉ hiện khi tương tác, không chèn banner vào trạng thái ban đầu làm lệch ảnh.

Lưu ngày ở dạng ngày địa phương, tránh chuyển UTC gây lệch ngày. Form có label thật và lỗi liên kết đúng input. Dialog/popover hỗ trợ Escape, focus trap phù hợp, trả focus về nút mở; không có button lồng trong link hoặc button khác.

## 10. Responsive mà không phá thiết kế

Desktop là bản đối chiếu chính. Trên màn hình nhỏ phải tái bố trí, không thu nhỏ nguyên artboard.

| Khoảng rộng | Quy tắc |
|---|---|
| Từ 1280 px | Bốn phòng + panel bên phải; lower grid hai cột; năm điểm đến ngang |
| 1024–1279 px | Giảm lề hợp lý; giữ bố cục nếu nội dung không tràn, nếu cần phòng 2 × 2; không ép chữ quá nhỏ |
| 768–1023 px | Header gọn; search 2 × 2; phòng hai cột; panel quảng bá chuyển vị trí; lower grid có thể xếp dọc |
| Dưới 768 px | Menu drawer; hero cao theo nội dung; search xếp dọc; card phòng một cột hoặc carousel có chỉ báo rõ |
| 375–430 px | Lề 16–20 px; body khoảng 14–16 px, metadata tối thiểu 12 px; H1 khoảng 30–34 px |

Mobile không ẩn toàn bộ các section để rút ngắn trang. Lời viết tay trang trí phụ có thể ẩn hoặc dịch vị trí để tránh đè chữ. Panel liên hệ được reflow để nhân vật không chèn lên nút. Footer xếp hai cột hoặc một cột; social dễ bấm.

Điểm chạm mobile tối thiểu 44 × 44 px theo tiêu chí dự án; nút icon nhỏ có thể tăng vùng hit-area bằng wrapper mà không phóng to nét icon. Kiểm tra không có horizontal overflow, không dùng `overflow-x: hidden` toàn trang để che lỗi grid. Thử zoom 200% để bảo đảm không mất nội dung hoặc thao tác.

## 11. Motion nhẹ, trạng thái tĩnh phải khớp ảnh

Chỉ cần transition tinh tế: button 160–220 ms, ảnh card hover scale tối đa khoảng 1.03, card nâng tối đa 2–3 px, dialog/popover mở nhẹ. Dùng CSS nếu đủ; không thêm thư viện animation nặng chỉ để hover.

Không dùng typewriter cho H1, carousel autoplay, hiệu ứng hạt hoặc parallax mạnh. Không đặt nội dung mặc định `opacity: 0` rồi phụ thuộc JavaScript mới hiển thị. Khi `prefers-reduced-motion: reduce`, bỏ chuyển động không thiết yếu. Khi screenshot, đưa mọi animation về trạng thái nghỉ; không thay bố cục chỉ riêng trong chế độ test.

## 12. Quy trình kiểm tra font và icon

**Font:** đợi `document.fonts.ready`, kiểm tra request font không 404/CORS/CSP error. Đối chiếu computed font-family với biến CSS đã cấu hình. Với các dòng thử, dùng `document.fonts.load(...)` và kiểm tra face thực sự được tải; sau đó kiểm tra **Rendered Fonts** trong DevTools trên heading, body và chữ viết tay.

Không coi `document.fonts.check(...) === true` là bằng chứng font đúng hay đủ glyph: API này có thể trả true trong trường hợp font chỉ định không có, và không kiểm tra toàn bộ glyph như một phép kiểm chứng typography. [S8] Cần kết hợp font face/network, rendered fonts và quan sát chữ tiếng Việt.

**Icon:** chạy typecheck/build với imports thật; mở mọi trạng thái hover, active, dialog và mobile menu. Mỗi nút icon phải chứa SVG có kích thước khác 0, viewBox hợp lệ, màu rõ. Kiểm tra star/heart, mũi tên, logo social và logo núi ở mức zoom 100% và 200%.

Kiểm tra cold load và reload lại: trang không được chỉ đúng font từ lần tải thứ hai. Không để `font-display` hoặc animation làm screenshot chụp lúc font còn fallback.

## 13. Kiểm tra thị giác và đối chiếu thật

Playwright hỗ trợ chụp và so sánh screenshot; kết quả có thể khác giữa hệ điều hành/browser, nên cố định môi trường khi so regression. [S7]

Thực hiện theo vòng lặp: **code → chạy browser → screenshot → overlay ảnh chuẩn → liệt kê sai khác → sửa → chụp lại**. Tối thiểu kiểm tra các nhóm: hình học tổng thể, hero/search, card/panel, typography, icon, footer. Không dừng ở lần render đầu.

Chụp các viewport: **1448 × 1086**, **1440 × 900**, **1024 × 900**, **768 × 1024**, **390 × 844** và **375 × 812**. Chỉ viewport 1448 có ảnh chuẩn trực tiếp; các viewport còn lại kiểm tra responsive và chức năng, không tự gán tỷ lệ giống ảnh.

Yêu cầu khi chụp chuẩn:

- Dữ liệu fixture cố định, không random ảnh/quote; chưa chọn ngày; 2 khách; chưa mở popup; heart mặc định chưa chọn.
- Ảnh tải và decode xong, font sẵn sàng, không loading skeleton; cuộn qua trang để tải ảnh lazy rồi trở lại đầu trước khi chụp.
- Chụp cả viewport gốc và full-page để phát hiện nội dung tràn dài hoặc bị cắt. Không crop giấu phần sai.
- Overlay ảnh chuẩn và actual cùng tỷ lệ 1:1, opacity 50%; xuất thêm diff khi có công cụ. Không scale actual để ép giống chuẩn.

**Phân biệt hai loại baseline:** PNG đi kèm là chuẩn thiết kế để đối chiếu thủ công/overlay. Screenshot Playwright của chính website là baseline regression chỉ sau khi giao diện đã được đối chiếu và duyệt. Việc tạo baseline từ bản code đầu tiên rồi test PASS **không chứng minh** website giống ảnh mẫu.

Mục tiêu hình học: các mép container, card, search bar và đường chia section sai lệch không đáng kể, hướng tới khoảng 2–4 px ở viewport chuẩn nếu asset cho phép. Đây là tiêu chí căn chỉnh, không phải lý do cắt nội dung hoặc bỏ qua khả năng sử dụng. Mọi vùng còn sai do asset/font phải nêu riêng.

Không dùng SSIM/pixelmatch đơn lẻ để tuyên bố “đạt 100%”: ảnh khác và antialias chữ có thể làm chỉ số thay đổi; bố cục sai cũng không được bỏ qua chỉ vì một chỉ số tổng thể có vẻ tốt.

## 14. Kiểm tra kỹ thuật và khả năng sử dụng

Chạy lint, typecheck, production build và browser tests theo package manager/commands của repo. Nếu repo chưa có script tương ứng, bổ sung rõ ràng; không giả định lệnh cũ của framework vẫn tồn tại ở phiên bản mới. Không sửa rule để che lỗi.

Kiểm tra console error, hydration mismatch, key warning, request thất bại; ảnh/font phải tải đủ. Xác minh bằng thao tác thật: chọn ngày hợp lệ và không hợp lệ, tăng/giảm khách, search, favorites, mở/đóng detail, menu mobile, các CTA và mọi link.

Dùng HTML semantic: header, nav, main, section, footer; một H1; cấu trúc H2/H3 hợp lý. Ảnh nội dung có alt, ảnh trang trí alt rỗng. Focus nhìn thấy, tương phản chữ đủ rõ; không làm text trắng trên vùng ảnh sáng mà thiếu lớp nền. Không chọn màu xám quá nhạt chỉ để gần ảnh khi người dùng không đọc được.

Không publish giá/đánh giá minh họa thành dữ liệu thật, không thêm schema hotel/review sai thực tế. Đây là nhiệm vụ UI; chỉ cấu hình metadata tối thiểu và trạng thái preview, không tự mở rộng sang chiến dịch SEO hay backend.

## 15. Trình tự làm việc và tiêu chí hoàn thành

**Bước 1 — Audit đầu vào.** Xác nhận đúng ảnh 1448 × 1086, đọc source và kiểm tra asset. Lập danh sách asset có/thiếu; không chọn nhầm ảnh cũ.

**Bước 2 — Dựng nền.** Cấu hình ba font, tokens, logo SVG và hệ icon. Tạo trang thử typography nội bộ hoặc component test; không thêm trang thử vào menu website.

**Bước 3 — Dựng bố cục.** Hoàn thiện header, hero/search, trust strip, featured/promo, lower grid, footer theo ảnh. Chốt hình học trước khi thêm chuyển động.

**Bước 4 — Hoàn thiện chi tiết.** Gắn ảnh đúng bố cục, chỉnh object-position, độ đậm chữ, line-break, nét icon, border/shadow, trang trí lá/rừng.

**Bước 5 — Tương tác và responsive.** Hoàn thiện states, dialog, validation, menu; kiểm tra các breakpoint và bàn phím.

**Bước 6 — Kiểm chứng và sửa.** Build, chạy browser, overlay, kiểm tra glyph và icon; sửa sai khác đến khi đạt tiêu chí. Không chỉ trả kế hoạch hoặc snippet rồi dừng.

Checklist cuối:

```text
[ ] Dùng đúng ảnh mới nhất, không tự đổi bố cục.
[ ] Header / hero / search / trust strip đúng vị trí và tỷ lệ.
[ ] Desktop có đủ 4 thẻ phòng + 1 panel quảng bá.
[ ] Lower grid giữ hai cột với các section đúng nhóm.
[ ] Logo, serif heading, sans nội dung, chữ viết tay đúng vai trò.
[ ] Dấu tiếng Việt hiển thị đủ, không bị cắt, không mojibake.
[ ] Font thực sự tải và render đúng, không chỉ là fallback.
[ ] Toàn bộ icon là SVG hợp lệ, không emoji/icon font/export lỗi.
[ ] Không dùng screenshot làm giao diện hoặc crop UI để giả component.
[ ] Search, ngày, khách, favorites, dialog, menu và CTA có hành vi thật.
[ ] Không fake tồn phòng, booking thành công hoặc gửi form thành công.
[ ] Responsive không tràn ngang, không che nội dung, thao tác được.
[ ] Không có console/hydration error hoặc asset request thất bại.
[ ] Lint / typecheck / production build và test liên quan đã chạy.
[ ] Có screenshot desktop/mobile và đối chiếu ảnh chuẩn.
[ ] Dữ liệu demo và contact chưa xác minh được phân biệt rõ.
[ ] Asset/font còn thay thế được liệt kê; không tự nhận đạt 100%.
```

Bàn giao source thay đổi, lệnh chạy, danh sách file chính, `docs/asset-audit.md`, `docs/ui-verification.md`, screenshot actual/overlay và kết quả test. Chỉ cung cấp địa chỉ preview khi đã thực sự chạy hoặc deploy được và đã kiểm tra.

Báo cáo cuối cho chủ dự án bằng tiếng Việt, gọn nhưng có bằng chứng:

```text
ĐÃ TRIỂN KHAI: ...
FONT THỰC TẾ: ...
ICON / LOGO: ...
KIỂM TRA DESKTOP & MOBILE: ...
LINT / TYPECHECK / BUILD: ...
ẢNH CHỤP / OVERLAY: ...
SAI KHÁC SO VỚI MẪU: ...
THÔNG TIN / ASSET CẦN CHỦ WEBSITE XÁC NHẬN: ...
PRODUCTION: CHƯA TRIỂN KHAI / trạng thái thực tế đã được cho phép.
```

## 16. Tài liệu kỹ thuật đối chiếu

Các nguồn dưới đây phục vụ lựa chọn công nghệ/font và phương pháp test. Chúng không phải nguồn xác nhận giá phòng, nhận xét, địa điểm hoặc thông tin liên hệ trong mockup.

**[S1] Next.js — Font Optimization:** self-hosting, Google fonts, local fonts.

`https://nextjs.org/docs/app/getting-started/fonts`

**[S2] Google Fonts — Playfair Display metadata:** tên family, weight range và subset tiếng Việt.

`https://raw.githubusercontent.com/google/fonts/main/ofl/playfairdisplay/METADATA.pb`

**[S3] Google Fonts — Roboto Condensed metadata:** tên family và subset tiếng Việt.

`https://raw.githubusercontent.com/google/fonts/main/ofl/robotocondensed/METADATA.pb`

**[S4] Google Fonts — Dancing Script metadata:** handwriting family và subset tiếng Việt.

`https://raw.githubusercontent.com/google/fonts/main/ofl/dancingscript/METADATA.pb`

**[S5] Google Fonts — Lora metadata:** phương án serif thay thế và subset tiếng Việt.

`https://raw.githubusercontent.com/google/fonts/main/ofl/lora/METADATA.pb`

**[S6] Lucide — React:** inline SVG components, imports và tùy chỉnh.

`https://lucide.dev/guide/react`

**[S7] Playwright — Visual comparisons:** screenshot assertions và sự phụ thuộc môi trường render.

`https://playwright.dev/docs/test-snapshots`

**[S8] MDN — FontFaceSet.check():** giới hạn của phép kiểm tra, không dùng thay cho xác minh glyph/font thực tế.

`https://developer.mozilla.org/en-US/docs/Web/API/FontFaceSet/check`

---

**Lệnh thực hiện:** bắt đầu audit source và ảnh ngay, sau đó lập trình, chạy thử và tự đối chiếu. Chỉ hỏi khi gặp thiếu thông tin thật sự ngăn cản bước tiếp theo. Không yêu cầu chủ dự án mô tả lại bố cục đã có trong ảnh; không tự biến nhiệm vụ tái tạo mẫu thành nhiệm vụ sáng tạo một giao diện mới.

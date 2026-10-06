# Route map (spec §16)

Nguồn sự thật: `src/lib/routes.ts` (`PUBLIC_ROUTES`, `ADMIN_ROUTES`, `CONTENT_SECTIONS`, `RESERVED_ROOT_SEGMENTS`, `ALWAYS_NOINDEX_PATTERN`). Backend dùng `backend/src/content/slug.ts` (`pathForContent`, `RESERVED_SLUGS`). `npm run seo:routes` kiểm tra hai danh sách này khớp nhau.

| Loại | Route canonical | Index | Sitemap | Schema chính |
|---|---|---|---|---|
| Trang chủ | `/` | Có | Có | Organization, WebSite, WebPage |
| Danh sách phòng | `/phong-nghi` | Có (query lọc/ngày → noindex) | Có | CollectionPage, ItemList |
| Chi tiết phòng | `/phong-nghi/[slug]` | Có nếu đủ dữ liệu | Có nếu đủ dữ liệu | LodgingBusiness / subtype |
| Combo | `/combo-du-lich` | Có | Có | CollectionPage, ItemList |
| Chi tiết combo | `/combo-du-lich/[slug]` | Có nếu đủ dữ liệu | Có nếu đủ dữ liệu | TouristTrip |
| Điểm đến | `/diem-den` | Có | Có | CollectionPage, ItemList |
| Chi tiết điểm đến | `/diem-den/[slug]` | Có | Có | TouristDestination |
| Bài viết | `/bai-viet` | Có | Có | CollectionPage, ItemList |
| Chi tiết bài viết | `/bai-viet/[slug]` | Có | Có | BlogPosting |
| Chuyên trang (danh sách) | `/chuyen-trang` | Có | Có | CollectionPage, ItemList |
| Trang CMS | `/[slug]` (gốc) | Có nếu đủ dữ liệu | Có | WebPage |
| Liên hệ | `/lien-he` | Có | Có | ContactPage |
| Về mình | `/ve-minh` | Có | Có | AboutPage, Person, FAQPage |
| Đặt phòng | `/dat-phong` | **Không** | Không | — |
| Tra cứu tồn | `/lich-phong` | **Không** (công cụ tìm theo ngày; nội dung mỏng và thay đổi theo query) | Không | — |
| Đối tác | `/doi-tac`, `/doi-tac/**` | **Không** | Không | — |
| Admin | `/admin/**` | **Không** (robots.txt chặn) | Không | — |
| Kỹ thuật | `/api/**`, `/media/**`, `/_next/**`, `/robots.txt`, `/sitemap.xml`, icon | — | — | — |

**Đường dẫn cũ:**
- `/chuyen-trang/[slug]` → 308 → `/[slug]`.
- Slug cũ của bất kỳ nội dung nào → 308 thẳng tới URL hiện tại (một bước), qua middleware và `GET /api/v1/public/routes/resolve`.
- Chữ hoa → 308 về chữ thường.
- Dấu `/` cuối → 308 về URL không có `/`.
- `?combo=` / `?d=` cũ → 308 tới chi tiết nếu nội dung còn công khai, ngược lại 404.

**"Có" chỉ áp dụng sau khi Owner bật index** (spec §17, §66):
- `SEO_INDEXING_ALLOWED=true`;
- `SEO_APPROVED_CANONICAL_ORIGIN=https://…`;
- `seo.defaults.robotsIndex=true` và `canonicalBase` trùng origin đó;
- `ops.dataMode.usesDemoData=false`;
- tên và mô tả brand có nội dung.

Hiện tại toàn site đang **noindex**.

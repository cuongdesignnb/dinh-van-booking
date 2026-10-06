# Vận hành Technical SEO sau deploy (spec §68)

> Task này **không** bật index production, **không** submit Search Console và **không** deploy. Các bước dưới đây là việc của Owner/vận hành sau khi Owner duyệt.

## 0. Bật index (Owner quyết định, §17/§66)
Cần đủ cả năm điều kiện, thiếu một là site vẫn noindex:
1. Env của web container: `SEO_INDEXING_ALLOWED=true`.
2. Env: `SEO_APPROVED_CANONICAL_ORIGIN=https://<domain chính thức>`. Phải là HTTPS, không port, không path.
3. Admin → Cài đặt → SEO mặc định: `canonicalBase` = **đúng** origin ở bước 2, và `robotsIndex = true`.
4. `ops.dataMode.usesDemoData = false`.
5. `brand.identity` có tên và mô tả. Mô tả dạng rich text giờ đã được chấp nhận; lỗi cũ đã sửa trong task này.

Kiểm tra: `GET /api/v1/public/seo/policy` → `indexingAllowed: true`, `blockedReasons: []`.

## 1. robots.txt
`curl -s https://<domain>/robots.txt`, kỳ vọng:
```
User-Agent: *
Allow: /
Disallow: /admin/
Disallow: /api/
Sitemap: https://<domain>/sitemap.xml   ← chỉ xuất hiện khi index đã bật
```
robots.txt không bao giờ chặn toàn site, để bot vẫn đọc được thẻ noindex.

## 2. sitemap.xml
`curl -s https://<domain>/sitemap.xml`:
- Chỉ gồm URL **hiện tại**, đã xuất bản, indexable, không demo, không query, trên đúng origin.
- Không có `/admin`, `/api`, `/dat-phong`, `/doi-tac`, `/lich-phong`, URL redirect cũ, bản nháp, bản lưu trữ hay trang 404.
- `lastmod` lấy từ `lastPublicChangedAt`. Giá trị này chỉ đổi khi nội dung công khai thay đổi, không đổi theo mỗi request.
- Kiểm nhanh vài URL trong sitemap: phải trả 200 và `<meta name="robots" content="index, follow">`.
- Script dùng được cho production (chỉ đọc): `SEO_QA_BASE=https://<domain> SEO_QA_ORIGIN=https://<domain> SEO_QA_MODE=approved SEO_QA_BROWSER=0 node scripts/seo/seo-qa.mjs`. Lưu ý: script này kèm các đường dẫn mẫu của demo; với production hãy đọc phần robots, sitemap, private, query và redirect, hoặc sửa danh sách `DEMO` trong script cho phù hợp.

## 3. URL Inspection (Search Console, sau khi Owner giao)
Kiểm mẫu: `/`, `/phong-nghi`, 1 chi tiết phòng, 1 combo, 1 điểm đến, 1 bài viết, `/lien-he`, `/ve-minh`. Kỳ vọng "URL is on Google / can be indexed" và "User-declared canonical = Google-selected canonical".

## 4. Rich Results Test / Schema validator
Kiểm cùng bộ mẫu ở mục 3. Kỳ vọng:
- JSON-LD hợp lệ;
- Breadcrumb hợp lệ;
- không có cảnh báo về review/offer (vì không phát).

Không cam kết rich result hay sao (§63).

## 5. Submit sitemap
Search Console → Sitemaps → `https://<domain>/sitemap.xml`. **Chỉ làm khi Owner giao.**

## 6. Theo dõi redirect / 404
- Đổi slug **chỉ bằng nút Generate** trong Admin. URL cũ tự 308 về URL mới; xem tab "Lịch sử đường dẫn" trong form.
- Search Console → Pages → "Page with redirect" là bình thường cho các URL cũ. Nếu thấy "Redirect error" thì kiểm tra `GET /api/v1/public/routes/resolve?path=/…`.
- 404 tăng đột biến: kiểm tra nội dung vừa bị lưu trữ hoặc xoá. **Không** redirect 404 về trang chủ.
- Nhật ký đổi slug: `audit_logs` với `action='content.slug_generated'`.

## 7. Canonical mismatch
- Canonical luôn là `https://<domain>` + path chữ thường, không có `/` cuối, không query.
- UTM/gclid/fbclid/msclkid → canonical về URL sạch. Các tham số lọc/sắp xếp/ngày trên trang danh sách → noindex, không canonical.
- Nếu Google chọn canonical khác: kiểm tra trùng nội dung giữa các trang, hoặc `canonicalBase` có sai origin không (ví dụ www và không www).

## 8. Core Web Vitals
Search Console → Core Web Vitals, hoặc PageSpeed Insights cho cùng bộ mẫu.
- Ảnh hero dùng `priority` và được preload. Ảnh còn lại lazy. Ảnh `next/image fill` nằm trong khung có kích thước cố định nên không gây CLS.
- Nội dung quan trọng (H1, mô tả, link nội bộ, JSON-LD) đã có trong HTML SSR.
- Task này không chạy Lighthouse và không đặt mục tiêu điểm 100.

## Lệnh kiểm tra trong repo
- `npm run seo:routes`: lint route tiếng Việt không dấu, registry, parity slug bảo lưu.
- `npm run seo:test`: lint ở trên + 19 unit test cho policy, canonical, title, schema.
- `bash scripts/backend.sh test`: test backend, gồm vòng đời slug.
- `SEO_E2E_BASE=http://localhost:18473 node scripts/seo/slug-e2e.mjs`: chỉ chạy trên local/staging, vì script tạo rồi xoá nội dung `[QA-SEO]`.

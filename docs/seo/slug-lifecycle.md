# Vòng đời slug (spec §3–§11, §51–§54, §59)

**Nguyên tắc:** tiêu đề là nội dung hiển thị, còn slug là địa chỉ URL. Không thao tác Lưu/Tạo/Sửa nào tự suy ra hay đổi slug từ tiêu đề. **Chỉ nút Generate** tạo hoặc đổi slug.

## Code
- `backend/src/content/slug.ts`:
  - `normalizeSlug` / `slugify`: bỏ dấu, `đ`→`d`, chữ thường, chỉ `[a-z0-9-]`, tối đa 120 ký tự;
  - `isValidSlug`, `RESERVED_SLUGS`, `pathForContent`.
- `backend/src/content/slug-lifecycle.ts`:
  - `previewSlug` (chỉ đọc);
  - `assertCreateSlug` (dùng khi tạo mới);
  - `applyGeneratedSlug` (hành động duy nhất ghi slug);
  - `routeHistory`;
  - `slugOwners`: slug hiện tại và mọi route lịch sử đều tính là đã có chủ.
- `backend/src/content/slug-routes.ts` → `switchCurrentRoute`: route cũ được đặt `isCurrent=false, redirectStatus=308`, route mới `isCurrent=true`. Unique index `public_routes_one_current_per_content` đảm bảo mỗi nội dung có đúng một URL hiện tại.
- Admin: `src/components/admin/shared/AdminSlugField.tsx` (Generate, xác nhận, lịch sử). Component này dùng chung cho Nội dung/Combo/Điểm đến/Chuyên trang (`AdminContentList`) và Nơi lưu trú (`PropertyCatalogScreen`).

## API (cookie phiên Admin + CSRF)

| Endpoint | Quyền | Mô tả |
|---|---|---|
| `POST /api/v1/content/slug/preview` `{kind, source}` | content.write | Generate trên form tạo mới: trả slug, path, `conflict`, `suggestion` (`-2`…), `reserved`. Không ghi gì. |
| `POST /api/v1/content/:id/slug/preview` `{source}` | content.write | So sánh với URL hiện tại: `unchanged`, `conflict`, `reactivatesHistory`, `requiresConfirmation`. |
| `POST /api/v1/content/:id/slug/generate` `{source, expectedVersion, confirmPublicChange?}` | content.write | Áp dụng. Trả `{slug, path, previousPath, redirectCreated, version, unchanged}`. |
| `GET /api/v1/content/:id/routes` | content.read | URL hiện tại và các URL cũ (308, ngày đổi, người đổi). |
| `POST /api/v1/properties/slug/preview`, `POST /api/v1/properties/:id/slug/preview`, `POST /api/v1/properties/:id/slug/generate`, `GET /api/v1/properties/:id/routes` | catalog.write / catalog.read | Tương tự cho nơi lưu trú. `expectedVersion` = `contentVersion`. |

**Thay đổi API (BA cần biết):**
- `PUT /content/:id` và `PATCH /properties/:id` **không còn nhận `slug`**. Gửi `slug` sẽ bị 400 (`forbidNonWhitelisted`, hoặc `slug_not_editable`).
- `POST /content` và `POST /properties` chỉ nhận `slug` đúng như kết quả Generate (đúng định dạng, không bảo lưu, chưa có chủ). Thiếu `slug` thì nội dung được lưu ở trạng thái "Chưa tạo" và **không có route**.
- Bản nháp tạo từ Cổng đối tác không còn tự có slug (`slug: null, path: null`). Admin sẽ Generate khi duyệt.
- Khôi phục revision không còn đổi URL.

## Luồng tạo mới
1. Nhập tiêu đề. Ô đường dẫn hiển thị **"Chưa tạo"**; gõ tiêu đề không tạo slug.
2. Bấm **Generate**. Server trả slug, path và cảnh báo trùng nếu có (ví dụ: "…đã thuộc nội dung khác. Đề xuất: `/bai-viet/x-2`" kèm nút "Dùng x-2"). Hậu tố `-2` chỉ được dùng khi Admin bấm chọn.
3. Có thể nhập "cụm từ tạo đường dẫn" khác thay cho tiêu đề.
4. Lưu bản nháp. Slug được gửi một lần, server kiểm tra lại trong transaction serializable.
5. Xuất bản bị chặn nếu chưa có slug: "Slug/đường dẫn chưa được tạo. Hãy bấm Generate trước khi xuất bản."

## Luồng sửa
- Sửa tiêu đề, nội dung, SEO, ảnh hoặc trạng thái rồi Lưu: slug giữ nguyên (đã có test unit và E2E).
- **Generate lại slug** → preview → hộp xác nhận. Với nội dung đã công khai, hộp xác nhận ghi: "Bạn sắp thay đổi URL công khai. URL cũ / URL mới. Hệ thống sẽ giữ redirect vĩnh viễn…" và hai nút [Huỷ] [Generate & đổi URL]. Server cũng bắt buộc `confirmPublicChange=true` cho nội dung đã công khai; thiếu thì trả 400 `public_url_change_unconfirmed`.
- Nội dung đã công khai mà trùng slug → **409 `slug_conflict`** (kèm gợi ý). Không bao giờ tự thêm hậu tố.
- Slug bảo lưu (ví dụ `phong-nghi`, `admin`, `doi-tac`) → 400 `slug_reserved`.
- `expectedVersion` cũ → 409 `version_conflict`.
- Sau khi Generate, form nhận `version` mới nên bấm Lưu tiếp vẫn hoạt động.

## Redirect
- Mọi URL lịch sử redirect **thẳng** tới URL hiện tại (`old1→current`, `old2→current`). Không có chuỗi redirect, không có vòng lặp. Generate lại về một slug cũ của chính nội dung đó sẽ kích hoạt lại đúng route đó, không tạo bản trùng.
- Route lịch sử vẫn thuộc nội dung cũ, nên nội dung khác **không được chiếm** (409).
- Lưu trữ / gỡ xuất bản: URL hiện tại và URL cũ đều trả **404**, không redirect về trang chủ. Đồng thời không vào sitemap, không có JSON-LD.
- Xoá vĩnh viễn (chỉ áp dụng cho bản chưa xuất bản): route bị xoá theo cascade → 404. Muốn trả **410** cần bảng tombstone, tức là cần migration. Task này không làm (§72: ưu tiên MIGRATIONS=0; spec chấp nhận 404).
  - Hệ quả: sau khi xoá vĩnh viễn, các URL cũ của nội dung đó **được giải phóng** và nội dung mới có thể dùng lại. Muốn giữ URL đã từng công khai, hãy **Lưu trữ** thay vì Xoá: lưu trữ giữ route nên slug vẫn bị chiếm.
- Redirect sang một nội dung thay thế (308 do Admin chọn) chưa có UI. Hiện không có cơ chế nào redirect nội dung đã xoá.

## Nhật ký
Mỗi lần Generate ghi `audit_logs.action = 'content.slug_generated'` gồm:
- `diff` = `{fromSlug, toSlug, fromPath, toPath, redirectCreated, expectedVersion, version}`;
- `actorId`, `createdAt`.

Bảng lịch sử trong Admin lấy người đổi và ngày đổi từ nhật ký này.

## Kiểm thử
- Unit backend:
  - `slug.spec.ts`: bộ vector tiếng Việt §59, `isValidSlug`, slug bảo lưu;
  - `slug-lifecycle.spec.ts`: tạo, sửa, Generate, 308 một bước, không loop, slug lịch sử bị chiếm, 409, 400, 404;
  - `slug-routes.spec.ts`.
  - Tổng: 95/95.
- E2E thật (Docker local): `scripts/seo/slug-e2e.mjs` → `artifacts/seo/2026-10-06/slug-e2e.json`, **32/32 PASS**. Dùng nội dung QA `[QA-SEO]`, đã xoá sạch sau khi chạy.

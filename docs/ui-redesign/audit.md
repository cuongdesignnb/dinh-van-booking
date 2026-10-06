# UI/UX audit — Đinh Vân Booking (Phase A, 2026-10-06)

Baseline: `main` @ 89ddafe, production build, rendered against the fictional demo API in
`scripts/ui-demo/` (screenshot tooling only, no app fallback). P1 = blocks comprehension or use,
P2 = clear quality issue, P3 = polish.

## Cross-cutting

| Issue | Direction | P |
|---|---|---|
| Three separate visual dialects (public `.btn`, admin `.abtn`, partner `.partner-*`/`.admin-btn`) with hard-coded hex colours, 12–13 px body text, 26–34 px controls | One token layer (`styles/design-system/tokens.css`) + shared `.ui-*` primitives; legacy token names mapped onto it; 44 px controls, 14–15 px body text | P1 |
| Status shown as raw enums or colour only (`pending_review · manual_review`, `stop-sell`, dots without text) | Status pill = dot + Vietnamese label; never colour alone | P1 |
| Internal/technical copy in UI (PostgreSQL, payments posted, Hold, grant, roomTypeScope, phiên bản/expectedVersion, ALT, Media Library, lô) | Plain operational Vietnamese; technical values stay in payloads only | P1 |
| Handwritten script lines, quotes and leaf decor in every admin header/sidebar/footer compete with content | Keep script for public brand moments only; admin/partner get calm, dense-but-readable surfaces | P2 |
| Reduced motion only partly honoured (some modules animate regardless) | Global `prefers-reduced-motion` rule + motion utilities that only run under `no-preference` | P2 |
| Modals used for everything, including long edit flows | Side drawer (bottom sheet on phones) for record edits; modal only for confirmations | P2 |

## Public

| Screen | Problems | Direction | P |
|---|---|---|---|
| `/` | Hero ok; trust strip and "why us" read small and grey; FAQ/footers dense | Larger type scale, stronger section rhythm, clearer CTA hierarchy, consistent cards and badges | P2 |
| `/phong-nghi` | 7-field floating search bar is heavy; filter sidebar tiny (12–13 px); availability badge small | Simpler search, readable filters, clear Còn/Hết/Đang cập nhật badge, mobile filter drawer kept | P1 |
| `/phong-nghi/[slug]` | Gallery fine; long description runs edge to edge; booking card visually weak | Constrained reading width, stronger booking card with price/state, clear room-type cards | P2 |
| `/combo-du-lich`, `/diem-den` | Cards consistent but small text and chips | Token-based cards/chips, consistent empty/error states | P3 |
| `/lien-he`, `/dat-phong` | Long forms with small labels; step indicator weak | `.ui-field` sizing, grouped sections, clearer stepper | P2 |
| `/lich-phong` | Reads like a technical report ("Có quỹ phù hợp theo lần xác nhận gần nhất"), inputs are a 4×2 raw grid | Search bar with date/guest grouping, result cards with status pill "Còn phòng / Hết phòng / Cần xác nhận" | P1 |

## Admin

| Screen | Problems | Direction | P |
|---|---|---|---|
| Shell | Light sidebar with 18 flat items, decorative quote; topbar repeats page title then module repeats it again | Dark forest sidebar grouped by job (Vận hành / Sản phẩm / Khách hàng / Website / Hệ thống), breadcrumb topbar, one page title, skip link, ≤1100 px drawer | P1 |
| `/admin` | KPI captions mention PostgreSQL/posted; duplicated "Tổng quan vận hành" heading | Plain captions, KPI grid with icons, cards on tokens | P2 |
| `/admin/dat-phong`, `/admin/khach-hang`, `/admin/yeu-cau-tu-van` | Small dense tables, tiny pagination | Sticky table headers, 44 px rows, status pills, mobile scroll fallback | P2 |
| `/admin/phong-nghi`, `/admin/hang-phong` | Card list with mixed action weights; "Bản nháp · Chờ xác minh" grey label | Clear status pill, primary action emphasised, consistent card layout | P2 |
| `/admin/ton-phong` | Matrix already usable, but: modal edit, no state counts, legend at bottom, no sticky room column, mobile stacks every room | Legend with counts on top, sticky room column + date header, drawer edit with stepper, 3-step bulk drawer with per-night preview, mobile = one room at a time as a day list | P1 |
| `/admin/doi-tac` | Raw enums (`pending_review · manual_review`), long cards | Status pills + translated labels, tab bar on shared tabs | P1 |
| `/admin/doi-tac/cap-quyen` | Flat 3-card form; permission = 5 raw checkboxes; jargon | Wizard: Chọn người → Chọn cơ sở → Chọn phạm vi → Chọn mức quyền (Chỉ xem / Quản lý phòng / Quản lý đầy đủ / Tùy chỉnh) → Lưu, with review summary | P1 |
| `/admin/combo-du-lich`, `/admin/diem-den`, `/admin/noi-dung`, `/admin/thu-vien-anh`, `/admin/menu`, `/admin/cai-dat` | Long editors without sticky actions; settings is one long form | Section cards, sticky action footer, consistent fields | P2 |

## Partner (`/doi-tac`)

| Problem | Direction | P |
|---|---|---|
| Login: plain two-column text + small form, tabs without tab semantics | Branded split layout, proper tablist, 44 px fields | P2 |
| Dashboard is one 4000 px page: notifications, search, property list, room edit cards, media library, calendar, advanced bulk, revisions, members, claims all stacked | Welcome header → property switcher cards (with plain access level "Chỉ xem / Quản lý phòng / Quản lý đầy đủ") → tabs (Lịch phòng, Hồ sơ cơ sở, Tra cứu phòng, Thông báo, Tổ chức) | P1 |
| Jargon: grant, phiên bản N, ALT, Media Library, lô, quỹ phòng nâng cao | Plain wording; versions are sent but not shown | P1 |
| Advanced bulk is an inline `<details>` under the calendar | "Cập nhật nâng cao" drawer with preview step | P2 |

# Implementation status — 6 inner screens (2026-09-19)

> Snapshot lịch sử của giai đoạn UI fixture. Không dùng bảng trạng thái bên dưới để đánh giá runtime hiện tại; xem [kế hoạch và gate end-to-end 2026-09-28](END_TO_END_COMPLETION_PLAN_2026-09-28.md).

Status legend: **DONE** = layout + states + responsive + tests verified in a browser;
**PARTIAL** = works, with differences listed. Nothing here is deployed; no commits or pushes were made.

| # | Route | Reference | Status |
|---|---|---|---|
| 01 | `/phong-nghi` | `docs/reference/01-phong-nghi.png` | DONE (differences below) |
| 02 | `/phong-nghi/[slug]` (8 slugs) | `02-chi-tiet-phong.png` (Forest Homestay) | DONE for Forest Homestay; PARTIAL for the other 7 (no gallery/host data in mockups) |
| 03 | `/combo-du-lich` (+ detail dialog `?combo=`) | `03-combo-du-lich.png` | DONE |
| 04 | `/diem-den` (+ detail dialog `?d=`) | `04-diem-den.png` | DONE |
| 05 | `/lien-he` | `05-lien-he.png` | DONE |
| 06 | `/dat-phong` | `06-dat-phong.png` (step 2) | DONE — step 3 review built from the same components (no reference image) |

## Per screen

### 01 — Phòng nghỉ
- **Layout / font / icon:** 206 px filters · results (4 × 2) · 278 px map + advisor; floating 7-field search bar at the hero edge; bottom row not-found card · reviews · FAQ. Playfair / Roboto Condensed / Dancing Script, Lucide + custom SVG.
- **Interaction:** search bar and sidebar share one applied state in the URL (`types`, `amenities`, `min`, `max`, `rating`, `sort`, `view`, `page` + selection). OR within a group, AND between groups; facet counts computed with the other groups applied. Two-thumb price slider (mouse, touch, arrow keys, debounced commit) + typed min/max in the search popover. Removable filter chips, reset keeps dates/guests, grid/list view, real pagination (1 page for 8 stays; `?fixture=extended` gives 16 stays / 2 pages for testing). Empty (reset + consult), loading (`?demo=loading`, same-footprint skeleton), error (`?demo=error`, retry keeps selection). Illustrated map with clickable pins, preview, large-map dialog with keyboard list. Mobile: Lọc / Sắp xếp / Bản đồ toolbar and a filter drawer with "Áp dụng (n kết quả)".
- **Mockup corrections:** facet counts and pagination reflect the 8 fixtures (mockup shows 12/20 and pages 1-2-3); "Đinh Văn" on the wooden sign rendered as "Đinh Vân".

### 02 — Chi tiết phòng
- Gallery (large + 3 thumbnails, "+N" and "Xem tất cả N ảnh" from the real gallery count = 6, not 28), gallery dialog with arrows/keyboard/swipe, captions, adjacent-image preload, image-error fallback.
- Booking card: "Từ" = lowest room price until a room is chosen, then that room's price; CTA without room scrolls/focuses room types; missing/invalid dates focus the date field; capacity check (adults + children vs capacity × rooms); valid → `/dat-phong?stay&room&checkIn&checkOut&adults&children&rooms` (no price in URL). Mobile sticky price bar with safe-area.
- Room types select/"Đã chọn"; share (Web Share → clipboard → manual copy field) and save (shared favourites); host dialog (states host ≠ advisor); amenities dialog; reviews dialog with sort and a note that only 3 demo reviews exist; nearby places link to `/diem-den?d=…`; unknown slug → friendly 404 with CTA; loading skeleton.
- **Mockup corrections:** active menu = "Phòng nghỉ" (mockup shows "Trang chủ"); gallery count; "Xác nhận nhanh trong 5 phút" replaced by "Xác nhận phòng khi tư vấn".

### 03 — Combo du lịch
- 7 category chips (`aria-pressed`, single active, URL `?loai=`), sort (popular / price ↑ / price ↓), 6 cards on one row, per-combo favourites (`combo` namespace), detail dialog (`?combo=` so Back closes it) with itinerary accordion, included/excluded, demo policy note, date + guests + short note, CTA → `/lien-he?intent=combo&item=<slug>` (note handed over in memory only). Empty / loading / error states (`?demo=`).
- Benefits row, 4-step process band (vertical timeline on mobile), reviews + "Xem tất cả" dialog, FAQ with non-binding answers.

### 04 — Điểm đến
- 6 category chips filtering by tags (Gia đình is non-empty), 6 cards, favourites (`destination` namespace), "Xem tất cả điểm đến" drawer with diacritic-insensitive search, detail dialog (`?d=`) with activities/notes, "Liên hệ để được tư vấn thông tin phù hợp thời điểm đi", CTA → `/lien-he?intent=destination&item=…`, share with fallback.
- Itinerary tabs (`tablist`/`tab`/`tabpanel`, Arrow/Home/End) with distinct data for 1 ngày, 2N1Đ, 3N2Đ and a full-itinerary dialog; seasons 2×2 with tips dialog; illustrated map with keyboard-accessible pins + large-map dialog and list; advisor note.

### 05 — Liên hệ
- Hero, form (name, phone, date, guests, message with 0/500 counter), validation on blur/submit with `aria-invalid`/`aria-describedby`, error summary and focus on the first error, Unicode names, phone normalisation (spaces, `+`), past dates blocked by the picker.
- Valid submit → **preview dialog only**: "Đây là bản xem trước; yêu cầu chưa được gửi đến Đinh Vân." Copy-to-clipboard, back to edit (data kept). Adapter in `src/lib/services/consultation.ts` (`demoAdapter` never sends; `?demo=adapter-error` exercises the error state). No PII in URL, storage or logs.
- Context chip from `intent`/`item` (stay/combo/destination), removable. Quick-contact cards, profile, promises, illustrated map, FAQ, social (all channels `null` → "đang cập nhật" dialog), scenic CTA focusing the form.
- **Mockup corrections:** phone numbers in the image are not rendered; "Chủ nhà & …" changed to "Người tư vấn & bạn đồng hành"; "trong 30 phút", "không phát sinh chi phí ẩn", "1.000+ du khách" replaced by neutral wording (listed for owner approval).

### 06 — Đặt phòng
- Entry requires valid `stay`, `room`, dates and guests; otherwise an empty state ("Bạn chưa chọn phòng nghỉ" / "Ngày lưu trú chưa hợp lệ"). Price never read from the URL.
- Steps (`<ol>`, `aria-current="step"`), guest form (name, phone, email, nationality, guests, special request ≤300), add-ons as checkbox cards with their own quantities (transfer trips, tour participants ≤ guests, bikes × days ≤ nights), coupon (trim/uppercase, `DVAN10`, pending/applied/invalid/remove, applies once), note ≤500, **payment plan (deposit/full) separate from payment method (bank transfer)**; the method panel says it is being updated — no account number / QR.
- One pure function `calculatePrice` (`src/lib/booking/pricing.ts`) feeds every total; 11 unit tests cover the brief's table.
- "Giữ chỗ ngay" validates → step 3 review (edit links, confirmation checkbox) → "Xem trước yêu cầu" → demo-preview dialog: "chưa được gửi, chưa có phòng nào được giữ và chưa có thanh toán". No booking code, no success state.
- `?scenario=baseline` loads the brief's fixture (breakfast + tour + DVAN10) for screenshots/tests.
- **Mockup corrections:** Standard Garden (650.000đ) instead of "Bungalow hướng rừng", tour ticked because it is charged, weekday computed from the date (no hard-coded "Thứ 6 … 2024"), "SSL 256-bit", "SMS", "Hỗ trợ 24/7" removed.

## Shared
- Header menu is route-based with correct active item; "Đặt ngay" → `/phong-nghi`; header search focuses the page's search form or opens a search dialog (date + guests → listing).
- Favourites: one versioned store (`dvb:favorites:v2`, migrates v1) shared across homepage, listing, detail, combos, destinations; hydration-safe.
- Selection (dates/guests/rooms) travels via URL between home → listing → detail → checkout.
- Checkout footer variant with "Hỗ trợ" policy links (dialogs say content is pending approval).

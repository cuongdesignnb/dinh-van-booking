# UI redesign v2 — "Cúc Phương Travel" running log

Spec: `/home/openclaw/projects/dinh-van-booking-TASK-v2.md`. Mockup: `docs/ui-redesign/reference/cuc-phuong-travel-home.jpg`.
START_SHA = 4a6bf48 (reference mockup committed in ae2d273).
Rule for successors: build on what is committed; never reset / force-push. Commit + push after each chunk.

## Plan
1. Shell: new `CucPhuongMark` SVG logo, header (nav + search icon + VN pill + Đăng nhập/Đăng ký → `/doi-tac`), hamburger drawer, compact dark-green footer.
2. Home rewrite: hero (eyebrow, 2-line serif title, trust row, script quotes), overlapping 5-field search card, featured stay cards (shared `StayCard`), why + founder (monogram when no image), stats band (`home.stats`, hidden when empty), partner band (`home.partner`) + testimonials list (real reviews only).
3. Backend: new settings keys `home.stats` / `home.partner` (empty defaults), bootstrap copy renamed to Cúc Phương Travel, menu labels per spec; admin settings field meta.
4. Retire legacy home/header/footer CSS from `globals.css`, delete `public-refresh.css`, new `src/styles/site/*.css`.
5. Phase 2 routes: `/phong-nghi` (+detail), `/combo-du-lich` (+detail), `/diem-den` (+detail), `/lien-he`, `/dat-phong`, `/lich-phong`.
6. QA (demo API), screenshots in `artifacts/ui-redesign-v2/`, Docker web rebuild, local DB brand update, final report.

## Done
- ae2d273 reference mockup committed

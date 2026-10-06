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
- 1a5d7bd / 2e502f9 shell (logo, header, drawer, footer), home rewrite, backend settings `home.stats`/`home.partner`, bootstrap brand copy, globals.css legacy home/header retired, `public-refresh.css` deleted
- c335350 `PageHero` + `SectionHead` on /phong-nghi, /combo-du-lich, /diem-den, /lien-he, /dat-phong
- 6541add combo + destination detail rebuilt (photo hero, content cards, sticky offer card, `site/detail.css`)
- 3baf1b2 /phong-nghi uses shared `StayCard` (grid + `sc--row`), `ListingCard` deleted; dead CSS pruned with `scripts/ui-demo/prune-css.mjs`
- 7244dd7 contact page cards/icons/monogram; floating filter bars on combos/destinations

- cedd556..ebf1ea7 stay detail decor removed, favicon, QA (prod build) all PASS, screenshots + composite, backend build/test PASS, Docker web+api+worker rebuilt, local DB brand update (`--only brand.,site.,home.,seo.`), primary menu updated via Admin API
- final report: `docs/ui-redesign/final-report-v2.md`

## Next
- Nothing required. Task finished; production deploy intentionally not done.

## Dev notes
- Demo: `DEMO_API_PORT=4100 node scripts/ui-demo/server.mjs`; `NEXT_DIST_DIR=.next-dev INTERNAL_API_BASE_URL=http://127.0.0.1:4100/api/v1 npx next dev -p 3199`
- Shots: `node scripts/ui-demo/shots-batch.mjs /tmp/s 1440 name=/route ...`; split tall shots with `scripts/ui-demo/split.mjs`

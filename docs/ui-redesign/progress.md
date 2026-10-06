# UI redesign — running log

Spec: `dinh-van-booking-TASK.md` (phases A–F). START_SHA = 89ddafe. Plan per screen: `audit.md`.
Rule for successors: build on what is committed; never reset / force-push. Commit + push after each chunk.

## Done
- Phase A audit (`audit.md`) — 7507024
- Phase B design system (`src/styles/design-system/`, `src/components/ui/system.tsx`), admin shell, inventory matrix WIP, partner portal WIP — 7507024
- Phase C part 1: `/lich-phong` search + result cards, `/phong-nghi` slim search bar (dates/guests only, sort in toolbar), stays/badge CSS, drawer visibility fix, `scripts/ui-demo/qa.mjs`

- Phase C part 2: `src/styles/public-refresh.css` (home hero height, trust strip, section heads, grids that fill rows, why/destinations, FAQ, contact, footer type scale); route layers appended to `stay-detail.css` (sticky booking card), `combos.css`, `destinations.css` (3-col auto-fill cards, no clipped CTA), `checkout.css` (centred empty state); tiny 9–12 px sizes lifted in route CSS; `/lich-phong` timestamp format
- Build note: on this 4 GB box `npm run build` can stall in its lint step; use `npx next build --no-lint` + separate `npm run lint` while iterating

- Phase D/E: `src/styles/admin-refresh.css` (compact module section bars under the shell h1, plain status pills, filter toolbar grid, sticky table heads, sticky editor save bars, `.dvb-admin .ui-btn` colour fix); `/admin/doi-tac/cap-quyen` rewritten as 5-step wizard (Chọn người → Chọn cơ sở → Chọn phạm vi → Chọn mức quyền [Chỉ xem / Quản lý phòng / Quản lý đầy đủ / Tùy chỉnh] → Lưu) sending the identical `/admin/partner-grants` payload; jargon removed from dashboard/partners/content/media/CRM copy; inventory drawer facts grid fix
- Phase F: full QA (`scripts/ui-demo/qa.mjs`) 25 routes × 1440/1024/768/390 all green; 16 §13 screenshots in `artifacts/ui-redesign/`; `npm run lint`, `typecheck`, `build` pass

## Status
Done — see `final-report.md`. Nothing pending from the spec; remaining gaps are listed there.

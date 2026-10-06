# UI redesign — running log

Spec: `dinh-van-booking-TASK.md` (phases A–F). START_SHA = 89ddafe. Plan per screen: `audit.md`.
Rule for successors: build on what is committed; never reset / force-push. Commit + push after each chunk.

## Done
- Phase A audit (`audit.md`) — 7507024
- Phase B design system (`src/styles/design-system/`, `src/components/ui/system.tsx`), admin shell, inventory matrix WIP, partner portal WIP — 7507024
- Phase C part 1: `/lich-phong` search + result cards, `/phong-nghi` slim search bar (dates/guests only, sort in toolbar), stays/badge CSS, drawer visibility fix, `scripts/ui-demo/qa.mjs`

## Next
- Phase C: `/`, `/phong-nghi/[slug]`, `/combo-du-lich`, `/diem-den`, `/lien-he`, `/dat-phong` polish
- Phase D/E: admin routes §6, inventory §7 gaps, partner permission wizard §8, partner portal copy
- Phase F: QA run (`scripts/ui-demo/qa.mjs`), screenshots to `artifacts/ui-redesign/`, final report

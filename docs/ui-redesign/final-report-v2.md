# UI redesign v2 — "Cúc Phương Travel" final report

Spec: `/home/openclaw/projects/dinh-van-booking-TASK-v2.md` · Mockup: `docs/ui-redesign/reference/cuc-phuong-travel-home.jpg`

## Git
- START_SHA=4a6bf48
- FINAL_SHA=see the last commit `docs: UI redesign v2 final report` on `main` (this file is part of it)
- REMOTE_MAIN_AFTER=equal to FINAL_SHA (`git rev-parse HEAD origin/main` checked after the push)
- WORKTREE=clean
- Production deploy: NOT done (not authorized)

## What changed
- New site shell: round mountain-mark SVG logo (`CucPhuongMark`), white header (6-item nav, search, "VN" pill with a "Sắp có tiếng Anh" tooltip, Đăng nhập/Đăng ký → `/doi-tac`), hamburger drawer, compact dark-green footer. Favicon is now `src/app/icon.svg` + `apple-icon.png` (same mark).
- Homepage rewritten to the mockup: photo hero (gold eyebrow, 2-line serif title, trust row, script notes), a 5-field search card overlapping the hero, "Lưu trú nổi bật" cards, why grid + advisor block (monogram "ĐV", since the image setting is null), stats band, partner CTA + testimonials, footer.
- Inner routes share `PageHero` / `SectionHead` and the same tokens. `/phong-nghi` uses the same `StayCard` as the homepage (grid and a new row variant); `ListingCard` was deleted. Combo and destination detail pages were rebuilt (photo hero, content cards, itinerary timeline, sticky offer card that moves first on mobile). Contact page: icon cards, advisor monogram, duplicated social links removed. Combos/destinations: the filter bars float over the hero edge. The old leaf sprites, the `Decor.tsx` component and the floating script lines were removed.
- Legacy CSS retired: `public-refresh.css`, `mobile-nav.css`, `availability-badge.css` and most of the old home/header/footer rules in `globals.css` were deleted. The `phero`/`lcard`/leaf rules and every other selector no source file references were pruned from the public stylesheets with `scripts/ui-demo/prune-css.mjs` (≈2,700 lines removed). New `src/styles/site/{base,shell,home,stay-card,detail}.css`.
- Backend:
  - New settings `home.stats` and `home.partner` with empty defaults, editable in Admin → Cài đặt.
  - Bootstrap copy renamed to Cúc Phương Travel; the advisor stays "Đinh Vân".
  - Bootstrap menu labels follow the spec.
  - Missing `partner` key fixed in `refresh-public-catalog-copy.ts`.
  - The seed has a new `--only <prefixes>` scope and `DIFFERS` markers in its output.

## Routes (demo API, production build `next start`)
| Route | Result |
|---|---|
| `/` | PASS |
| `/phong-nghi` (grid + list) | PASS |
| `/phong-nghi/[slug]` | PASS |
| `/combo-du-lich` | PASS |
| `/combo-du-lich/[slug]` | PASS |
| `/diem-den` | PASS |
| `/diem-den/[slug]` | PASS |
| `/lien-he` | PASS |
| `/dat-phong` (empty + with selection) | PASS |
| `/lich-phong` (with search) | PASS |

## Viewports
`scripts/ui-demo/qa.mjs --only=public`: 11 routes × 1440/1024/768/390. The log is in `artifacts/ui-redesign-v2/qa-results.txt`.
- 1440 PASS · 1024 PASS · 768 PASS · 390 PASS
- HTTP 200 everywhere; CONSOLE_ERRORS=0; HYDRATION_ERRORS=0; horizontal overflow 0; keyboard focus visible on the first Tab stops; `prefers-reduced-motion` passes (0 running animations) on all 11 routes.
- Still a manual judgement: the Phase 2 pages were reviewed visually at 1440 and 390. Not every page was eyeballed at 1024/768; the automated checks passed there.

## Checks
- TYPECHECK=PASS (`npm run typecheck`)
- LINT=PASS (`npm run lint`)
- BUILD=PASS (`next build --no-lint` into `.next-pub` + separate lint; the Docker web image build ran `next build` again and passed)
- BACKEND_CHANGES=YES (settings registry, bootstrap data + spec, catalog-copy refresh fix, seed `--only`)
- BACKEND_BUILD=PASS (`scripts/backend.sh build`)
- BACKEND_TESTS=PASS (79/79, `scripts/backend.sh test`)

## Brand rename
- Code: APPLIED. `grep -rn "Đinh Vân Booking" src` → 0 hits. The only backend hits left are test fixtures (`settings.service.spec.ts`, `slug.spec.ts`) and the spec assertion that the bootstrap no longer contains the old name. Repo/package names, `--dvb-*` tokens and code identifiers are unchanged.
- Local DB: APPLIED.
  - Dry-run: `seed:public-bootstrap -- --dry-run --only brand.,site.,home.,seo.`. It showed 11 differing keys, all inside brand/site/home/seo; catalog.* and contact.page were identical and left untouched. Every key was still at version 1, so there were no Admin edits to lose.
  - Apply: `--apply --replace-existing --only brand.,site.,home.,seo. --actor-email admin@dinhvan.local` → `SETTING_REPLACED=11`, `SETTING_CREATED=1` (home.partner), `MEDIA_IMPORTED=2` (new hero + partner image), `DVB_PUBLIC_BOOTSTRAP_APPLY=PASS`. Audit log entries were written by the script.
  - The primary menu already existed, so the seed skips it. It was updated through the Admin API (`PUT /api/v1/navigation/primary` as the owner) to: Trang chủ, Lưu trú, Trải nghiệm, Cẩm nang, Về mình (/lien-he), Dành cho đối tác (/doi-tac). The old "Tra cứu phòng" (/lich-phong) item was kept but disabled (reversible in Admin → Menu); the route itself still works and `/phong-nghi` links to it.
  - Verified on http://localhost:18473: `<title>` = "Cúc Phương Travel — Cúc Phương, Ninh Bình | Cúc Phương Travel", the header shows the new brand and 6-item nav, and the HTML has 0 "Đinh Vân Booking" hits.

## Docker
- DOCKER_WEB_REBUILT=YES (`compose.sh up -d --build web`)
- DOCKER_API_WORKER_REBUILT=YES (`compose.sh up -d --build api worker`; migrate ran clean)
- `/`, `/phong-nghi`, `/admin`, `/lien-he`, `/combo-du-lich`, `/diem-den`, `/lich-phong`, `/dat-phong`, `/doi-tac`, `/icon.svg` → 200 via :18473.
- The local DB's 11 stays are unpublished drafts, so on the real stack the featured-stays row and the `/phong-nghi` list are empty by design. Nothing was published.

## KNOWN_GAPS (no-fake-data rule and other limits)
- **Stay card distance** ("Cách vườn quốc gia 1.2 km"): the API has no distance field, so the card shows the location line instead.
- **Ratings, prices, availability pills**: only from real API fields. On the real stack no stays are published, so the row is hidden.
- **"Những con số biết nói" stats band**: rendered only from the Admin setting `home.stats`. Its default is empty, so it is hidden on the real stack. The demo screenshots fill it with demo numbers labelled "(demo)".
- **Testimonials**: only real published reviews; the real stack has none, so the section is hidden.
- **Founder portrait**: the mockup's stock photo was replaced by a monogram "ĐV" with an illustrated mountain, because the advisor image setting is null. The handwritten greeting is generic and truthful, and the signature is "Đinh Vân".
- **Language pill**: "VN" only, non-interactive, tooltip "Sắp có tiếng Anh". There is no language dropdown.
- **"Đăng nhập / Đăng ký"**: these go to the partner portal `/doi-tac` (no customer accounts).
- **Heart icon**: client-side favourite toggle only.
- **Search card "Bạn muốn đi đâu?"**: the destination options come from real data and the type list from catalog constants. Nothing is invented.
- **Density**: the homepage keeps the mockup's order and components but has somewhat more vertical spacing than the mockup (see the composite).
- **Out of scope / unchanged**: admin and partner screens (brand name/logo only); `/bai-viet` and `/chuyen-trang` still use `static-pages.css` with the new tokens; `/lich-phong` result cards keep their own layout (they show per-night availability that `StayCard` doesn't have).

## Screenshots (`artifacts/ui-redesign-v2/`, demo API, production build)
- `home-1440.png`, `home-390.png`
- `stays-1440.png`, `stays-390.png`
- `stay-detail-1440.png`
- `combos-1440.png`, `combo-detail-1440.png`
- `destinations-1440.png`, `destination-detail-1440.png`
- `contact-1440.png`
- `booking-1440.png`, `availability-1440.png`
- `home-1440-vs-mockup.png` (mockup left, build right)
- `real-stack-home-1440.png` (http://localhost:18473 after the DB brand update)
- `qa-results.txt`

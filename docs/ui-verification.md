# UI verification — 2026-09-19

Environment: Windows 11, Playwright 1.x Chromium headless shell, deviceScaleFactor 1,
production build (`next build && next start -p 3100`).

## Checks

| Check | Result |
|---|---|
| `npm run lint` | pass, 0 problems |
| `npm run typecheck` | pass |
| `npm run build` | pass, `/` statically prerendered, first-load JS 123 kB |
| `npm test` (7 Playwright tests) | 7/7 pass |
| Console errors, failed requests | none, at all 6 viewports |
| Horizontal overflow | 0 px at 1448, 1440, 1024, 768, 390, 375 |
| Fonts | Playfair Display, Roboto Condensed, Dancing Script served by `next/font` (self-hosted), all `loaded`; computed families asserted on h1, body, handwritten |
| Vietnamese text | no mojibake (`Ä‘ Æ° áº á»`) and no U+FFFD in rendered text |
| Icon buttons | every icon-only control has a visible, non-zero SVG plus `aria-label` |

Interactions covered by tests: search validation (Vietnamese errors), date range with an
invalid check-out, guest stepper, suggestion dialog with the "tình trạng phòng sẽ được xác nhận"
note, favorite toggle persisted across reload, room detail dialog, Zalo contact-pending
dialog, combo dialog, testimonial next, header "Đặt ngay" focusing the form, mobile drawer
open/close via anchor.

## Screenshots (`docs/screenshots/`)

- `actual-<w>x<h>.png` and `actual-<w>x<h>-full.png` for all six viewports.
- `reference-vs-actual-overlay.png` — 50/50 blend with the reference at 1448 × 1086.
- `reference-vs-actual-diff.png` — amplified difference.

Captures are taken after fonts, images and reveal animations settle; ambient loops (falling
leaves, lantern flicker) are paused for determinism.

## Remaining differences vs. the reference (1448 × 1086)

- Section edges (header, hero, search bar, trust strip, cards, promo, lower grid, footer) line up
  within ~2–5 px. Individual text lines differ by up to ~6–8 px, mostly the signature line and
  hero sub-copy, because the substitute fonts have different metrics than the mockup's.
- Fonts are substitutes chosen by shape (the mockup's original fonts are unknown). The mockup's
  handwriting is more calligraphic than Dancing Script.
- All photos are 1× crops of the reference with inpainted areas (see `asset-audit.md`); they are
  soft on high-DPI screens and in enlarged mobile layouts.
- The logo mark is redrawn, not the original file.
- Mean absolute luminance difference over the full frame: 26/255. This number is dominated by
  anti-aliasing and substitute fonts and is **not** a claim of pixel parity.

## Motion

Scroll-reveal choreography (masked H1 rise, handwriting wipe, card blur-rise, pop-in icons,
ring and check strokes), hero Ken Burns + scroll parallax, lantern flicker, sun glow, drifting
mist, falling leaves, 3D card tilt with glare, magnetic CTAs, shine sweeps, heart burst,
animated dialogs/drawer/popovers. Start states only apply under `html.motion-ready` (set before
paint, with a 4 s failsafe if JS never mounts); `prefers-reduced-motion: reduce` disables it all.


---

# Inner pages verification — 2026-09-19

Environment: Windows 11, Playwright Chromium headless, deviceScaleFactor 1, `next build && next start -p 3100`.

## Checks

| Check | Result |
|---|---|
| `npm run lint` | pass, 0 problems |
| `npm run typecheck` | pass |
| `npm run build` | pass (see route table in the final report) |
| `npm test` | 37 Playwright tests pass: 11 pure price calculations, homepage, 6 routes × structure/active menu/fonts/icons/no-errors, listing filters/URL/back-forward/loading/error/pagination, listing → detail → checkout selection hand-off, capacity, gallery keyboard, host dialog, 404, combos, destinations tabs/dialogs, contact validation + preview-only + no PII in URL/storage, checkout totals/coupon/plans/review/no "success", empty checkout, header search dialog, overflow at 1024/768/390, mobile filter drawer |
| Console / page errors | none on all routes (a hydration error on `/dat-phong` — `<dialog>` inside `<p>` — was found and fixed by portalling modals to `<body>`) |
| Horizontal overflow | 0 px on all 7 routes at 1448, 1024, 768 and 390 px |
| Homepage regression | 0.2 % of pixels differ from the previous homepage capture (animated lanterns/leaves/Ken Burns); layout unchanged |

## Screenshots — `artifacts/ui/<screen>/`

`desktop.png` (1448 × 1086), `desktop-full.png`, `w1024(-full).png`, `mobile(-full).png` (390 × 844),
`overlay.png` (50 % blend with the reference), `diff.png`.

Mean absolute luminance difference vs. reference (not a similarity claim; dominated by substitute
fonts, anti-aliasing and inpainted photos): 01 = 25.6, 02 = 23.8, 03 = 24.1, 04 = 28.8, 05 = 24.2,
06 = 28.5 (/255). 06 is captured with `?scenario=baseline`.

## Remaining differences (not mockup corrections)

- **Fonts:** substitutes (Playfair Display / Roboto Condensed / Dancing Script); line breaks differ
  by a few px in places. The mockups' handwriting is more calligraphic.
- **Images:** all are 1× crops with inpainted areas (see `asset-audit.md`); soft on retina and in
  enlarged mobile/dialog views.
- **01:** card text rows sit ±3 px from the mockup; the wooden-sign text is DOM over a blanked sign.
- **02:** the hero-less layout matches; the handwritten note on the gallery is DOM, positioned by eye.
- **03:** process band arrows are Lucide `MoveRight`, slightly lighter than the mockup's.
- **04:** map route dashes are approximations of the illustration.
- **05:** map pop-up and labels are DOM over an inpainted map.
- **06:** add-on cards grow when a quantity control is shown (tour participants), so the page is
  ~30 px taller than the mockup in the baseline scenario.

## Mockup inconsistencies corrected on purpose

Active menu by route; counts/pagination/gallery count from data; "Đinh Văn" → "Đinh Vân";
checkout uses Standard Garden 650.000đ with breakfast + tour ticked (the mockup charged an unticked
tour and showed a different room); weekday computed from the date; unverifiable claims replaced by
neutral copy (listed in `asset-audit.md`); payment plan separated from payment method.

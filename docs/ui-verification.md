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

# Asset audit — Đinh Vân Booking homepage

Reference: `docs/reference/dinh-van-booking-reference.png` (1448 × 1086, flattened mockup).
No source photos, logo files or brand assets were supplied with the brief.

## How the images were produced

Every photo on the page is cropped from the reference by `scripts/extract-assets.py`
(`npm run assets:extract`). Text and UI that were baked into the photos were removed with
OpenCV inpainting so the DOM can render real text on top. **None of these are clean source
layers** — they are reconstructions at the reference's 1× resolution.

| File | Source region (x0,y0,x1,y1) | Treatment | Remaining difference |
|---|---|---|---|
| `hero-cuc-phuong.webp` (1448×316) | 0,50,1448,366 | Inpainted hero copy + handwritten note; search-bar area rebuilt by reflecting the rows above (reads as water) | Soft/smudged zone under the H1 and search bar; 1× only, soft on retina and on screens wider than 1448 px. The wooden sign text is kept baked-in (texture on an object, not duplicated in DOM). |
| `stay-forest.webp` | 37,477,301,581 | Inpainted baked heart + "Bán chạy" badge (both now DOM) | Slight blur top-left and top-right |
| `stay-retreat.webp` | 318,477,582,581 | Inpainted baked heart | 264×104 only — upscaled in the mobile/tablet layouts |
| `stay-eco-lodge.webp` | 599,477,851,581 | Inpainted baked heart | same |
| `stay-moc-son.webp` | 869,477,1120,581 | Inpainted baked heart | same |
| `experience-promo.webp` | 1140,428,1415,699 | Inpainted heading, body, button, quote | Pale smudged area behind the text, hidden by a cream veil |
| `advisor-panel.webp` | 909,824,1415,987 | Inpainted heading, copy, buttons, signature line, handwritten note | Light block behind the copy, hidden by a veil. The advisor is an **illustration from the mockup**, not a photo of the real owner. |
| `destination-*.webp` (5) | row at y 863–943 | Plain crop | 160–176 × 80 px only; soft when enlarged on mobile |
| `testimonial-avatar.webp` | 953,739,1015,801 | Plain crop | Illustration, not a real customer |

## Drawn as SVG (no raster)

- `DinhVanMark` logo (`src/components/ui/BrandLogo.tsx`) — redrawn from the mockup; replace
  with the official logo file when available. Wordmark is live text.
- Trust-strip glyphs (filled leaf, heart, shield-check, group) — custom inline SVG.
- Decorative leaves and the footer forest silhouette (`src/components/ui/Decor.tsx`).
- Functional icons: `lucide-react` 1.47.
- Facebook / Instagram / YouTube / TikTok / Zalo marks: `simple-icons` (CC0 paths), inline SVG.

## Needed from the site owner before production

1. Original high-resolution photos (hero panorama, 4 stays, promo, advisor, 5 destinations).
2. Official logo (SVG) and permission to use the owner's portrait, if any.
3. Confirmed phone, Zalo URL, email, address, social URLs (`src/config/site.ts`, all `null`).
4. Real room data, prices, ratings and reviews (currently demo fixtures in
   `src/data/home-fixtures.ts`, flagged `demo: true`).
5. Confirmation of the commercial claims in the trust strip ("Giá tốt, không qua trung gian"…).

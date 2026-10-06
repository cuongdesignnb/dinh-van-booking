# v3 "Về mình" page (`/ve-minh`): final report

Spec: `/home/openclaw/projects/dinh-van-booking-TASK-v3-about.md`. Running log: `docs/ui-redesign/progress-v3-about.md`.

## Git
- START_SHA=d2e2315
- Commits: c6ef3ef (backend setting/bootstrap/sitemap/menu), f364987 (page, CSS, JSON-LD, Admin fields, demo data), bab3346 (polish, QA, SEO evidence), 28e9cab (hero alt, real-stack shot, DB applied). FINAL_SHA is the commit `docs: v3 about page final report` that contains this file.
- REMOTE_MAIN_AFTER=equal to FINAL_SHA (`git rev-parse HEAD origin/main` checked after the push)
- WORKTREE=clean
- Force-push: none. Production deploy: NOT done (not authorized).

## What was built
- **Route `/ve-minh`** (`src/app/ve-minh/page.tsx`, styles `src/styles/site/about.css`). It is a dedicated static segment, so it takes precedence over the root `[slug]` route. Verified: `/ve-minh` → 200; root `[slug]` still works (`/demo-chinh-sach-huy-phong` → 308 → `/chuyen-trang/…` 200); unknown slugs → 404. `ve-minh` was added to the reserved slugs (backend `content/slug.ts` + `src/lib/slug.ts`), so no content page can claim it. When `about.page` is disabled or has no title, the page returns 404.
- **Sections** (top → bottom):
  1. Breadcrumb (Trang chủ › Về mình) and a photo hero using the shared `PageHero`: gold eyebrow, H1, intro, and two CTAs. The first is "Gọi cho Đinh Vân" (`tel:`). The second is "Nhắn Zalo", or "Gửi yêu cầu tư vấn" → `/lien-he` when no Zalo URL is set, which is the case on the real stack.
  2. Story in two columns: an arched portrait card with a handwritten greeting (Dancing Script), the "ĐV" monogram illustration (no photo exists), and name + role. On the right: the story text, a pull quote, and a script signature ("Hẹn gặp bạn ở Cúc Phương! – Đinh Vân").
  3. Values: a grid of 4 icon cards.
  4. "Cách mình đồng hành": a numbered 4-step timeline. Horizontal with a dashed connector on desktop, 2×2 on tablet, a vertical rail on mobile.
  5. "Khu vực mình hỗ trợ": 3 cards linking to `/diem-den` and `/phong-nghi` (only internal paths are rendered). They show a watercolour-style SVG landscape until the owner adds a photo. No people photos are used: the existing inner-route banners contain people, and the destination thumbnails are only about 220 px wide.
  6. FAQ: native `<details>` accordion, 3 questions.
  7. Closing dark forest-green CTA band: phone, Zalo (if set), "Gửi yêu cầu tư vấn", and a "Xem chỗ nghỉ" → `/phong-nghi` link.
  - Every optional section hides itself when its content is empty.
- **Shared pieces:**
  - `AdvisorMonogram` moved into `HomeArt.tsx` (the homepage uses the same component).
  - `PageHero` now gives the hero image the media's own descriptive alt instead of the generic "Ảnh minh họa". This affects every inner-route hero.
- **Internal links:**
  - Header nav "Về mình" → `/ve-minh` (bootstrap menu data, demo data, and the local DB via the Admin API).
  - The footer nav renders the same menu, so the footer now links to `/ve-minh` too.
  - `/lien-he` advisor card: "Tìm hiểu thêm về mình →" (shown only when the about page is enabled).

## Settings keys added
- `about.page` (group `publicPages`, public), editable in Admin → Cài đặt → "Các trang nội dung" → "Trang Về mình". Fields (all have Vietnamese labels and help text):
  - hero: `enabled`, `heroEyebrow`, `title`, `intro` (rich), `heroImageMediaId`;
  - CTAs: `phoneCtaLabel`, `zaloCtaLabel`, `contactCtaLabel`;
  - story: `storyTitle`, `greeting`, `story` (rich), `portraitMediaId`, `signatureNote`, `quote`;
  - `valuesTitle`, `valuesIntro`, `values[]` {icon, title, text};
  - `stepsTitle`, `stepsIntro`, `steps[]`;
  - `areasTitle`, `areasIntro`, `areas[]` {icon, title, text, linkLabel, linkTarget, imageMediaId};
  - FAQ: `showFaq`, `faqTitle`, `faqs[]`;
  - closing band: `ctaTitle`, `ctaText`, `ctaStaysLabel`;
  - SEO: `areaServed`, `seoTitle`, `seoDescription`.
- These are **not duplicated**:
  - advisor name, role and photo come from `home.contactPanel` (fallback `contact.page`);
  - phone and Zalo come from `brand.contact`.
  - The portrait falls back as `about.page.portraitMediaId` → `home.contactPanel.imageMediaId` → `contact.page.advisorImageMediaId` → monogram.
- Bootstrap copy is in `backend/src/scripts/data/public-bootstrap.ts`. It is based only on the known facts: a small independent local service run by Đinh Vân, who checks stays and itineraries herself and supports guests by phone/Zalo. It contains no years, awards, guest counts, education, age, testimonials, statistics or photos of her. The spec test asserts there are no number+năm/khách/giải/lượt patterns, no "đánh giá"/testimonial, and that the phone number is not copied into the text.

## Local DB (real stack)
- Seed dry-run, `scripts/backend.sh seed:public-bootstrap -- --dry-run --only about. --actor-email admin@dinhvan.local`:
  - `SETTING_CREATE about.page` was the only change;
  - 25 other keys were SKIP with no DIFFERS;
  - `SETTING_REPLACE_CANDIDATE=0`, `MEDIA_IMPORT=0` (the hero reuses the existing balcony photo).
- Apply (`--apply --only about.`): `SETTING_CREATED=1`, `SETTING_REPLACED=0`, `MEDIA_IMPORTED=0`, `DVB_PUBLIC_BOOTSTRAP_APPLY=PASS`. The script wrote an audit log entry.
- Menu: `PUT /api/v1/navigation/primary` as the owner. Only "Về mình" changed (`/lien-he` → `/ve-minh`). The other 5 items and the disabled "Tra cứu phòng" are unchanged.

## Checks
- TYPECHECK=PASS (`npm run typecheck`)
- LINT=PASS (`npm run lint`)
- BUILD=PASS (`npm run build` with `NEXT_DIST_DIR=.next-pub`, on the final code; the Docker web image also ran `next build`)
- BACKEND_BUILD=PASS (`bash scripts/backend.sh build`)
- BACKEND_TESTS=PASS (79/79, `bash scripts/backend.sh test`; run after the last backend change)
- BROWSER_QA=PASS. `scripts/ui-demo/qa.mjs --only=public` (demo API, production build, final code) ran 12 public routes, now including `/ve-minh` and `/lien-he`, at 1440/1024/768/390:
  - 60/60 OK: status 200, console errors 0, page errors 0, hydration errors 0, overflow 0, keyboard focus visible, reduced-motion 0 running animations.
  - Admin settings (`/admin/cai-dat`) OK at 1440/390.
  - Log: `artifacts/ui-redesign-v2/qa-results-v3-about.txt`.
- DOCKER=REBUILT (`compose.sh up -d --build web api worker`, migrate clean; web rebuilt again after the hero-alt change).
  - http://localhost:18473/ve-minh → 200; http://localhost:18480/ve-minh → 200.
  - 1 h1 "Xin chào, mình là Đinh Vân", all 6 h2 sections, `tel:0974045828`, 0 console errors, 0 overflow.
  - `/`, `/lien-he` (with the new link), `/phong-nghi`, `/diem-den`, `/admin` and `/sitemap.xml` → 200 on both ports.

## SEO checklist
| Item | Result |
|---|---|
| `<title>` "Về mình – Đinh Vân \| Cúc Phương Travel" | PASS (demo and real stack). `seoTitle` override, else "Về mình – {advisor name}", then the site title template. |
| Meta description ~150–160 chars | PASS. 156 chars, from `seoDescription` (falls back to the intro text). |
| Canonical via existing policy helpers | PASS. `buildPageMetadata` → `https://<approved origin>/ve-minh` when approved. With no approved origin (local stack) there is no canonical, same as the other routes. `?utm_*` keeps the canonical; `?q=` → noindex. |
| Open Graph + Twitter card | PASS. og:title/description/url/locale/type=`website`/image (hero 1672×941 + alt); `summary_large_image`. The image URL is absolute only when an origin is approved. |
| Runtime SEO policy respected | PASS. Local stack/demo → `noindex, follow`, no JSON-LD, empty sitemap. Indexing is never forced. |
| JSON-LD AboutPage → mainEntity Person | PASS (approved-mode demo). Person has name, jobTitle, telephone, description, url, and `worksFor` TravelAgency "Cúc Phương Travel" with areaServed Cúc Phương / Ninh Bình. `image` is added only when a real portrait exists. Evidence: `artifacts/ui-redesign-v2/about-seo-check.json` (parsed with `JSON.parse`). |
| BreadcrumbList | PASS (Trang chủ › Về mình) |
| FAQPage only when FAQs exist | PASS. Built from enabled FAQs with `showFaq=true`; omitted otherwise. |
| Exactly one h1, logical h2/h3 | PASS. 1 h1; h2 per section; h3 for cards, steps and FAQ questions. |
| Descriptive alt, `next/image` | PASS. Hero uses the media alt; portrait/area images use their alt or a fallback "Chân dung {name}" / area title; the monogram and decorative SVGs are `aria-hidden`. |
| Hero preloaded, below-fold lazy | PASS. `priority` → `<link rel="preload" as="image">` on the real stack; portrait/area images are lazy by default. |
| Sitemap | PASS. Backend `seoUrls()` adds `/ve-minh` when `about.page.enabled` and it has a title; the page's `eligible` flag requires that entry. Approved-mode demo sitemap contains `https://…/ve-minh`. |
| Internal links | PASS. Header + footer nav, `/lien-he` → `/ve-minh`; about page → `/lien-he`, `/phong-nghi`, `/diem-den`. |

How the approved mode was checked: `DEMO_SEO_INDEX=1` (new, demo-only switch in `scripts/ui-demo/data.mjs`) plus `SEO_INDEXING_ALLOWED=true SEO_APPROVED_CANONICAL_ORIGIN=https://cucphuongtravel.example.com` on `next start`.

## Screenshots (`artifacts/ui-redesign-v2/`)
- `about-1440.png`, `about-390.png`: demo API, production build, final code.
- `about-real-1440.png`: real Docker stack (http://localhost:18473/ve-minh), taken with the new `scripts/ui-demo/real-shot.mjs`.
- 1024 and 768 were also reviewed by eye: 2-column story at 1024; at 768 a single column, steps 2×2, horizontal area cards.

## For the owner, in Admin → Cài đặt → Trang Về mình
- **Real portrait photo** (`Ảnh chân dung thật của bạn`, ~800×1000). Until then a "ĐV" monogram shows. Uploading a photo in Khối tư vấn trang chủ also feeds this page and adds `image` to the Person JSON-LD.
- **Personal story** (`Câu chuyện của bạn`). The current text only states verified facts. Add in your own words how you are connected to Cúc Phương, why you started, what you like to recommend. Only true details.
- **Zalo link** (Cài đặt → Liên hệ → Zalo). It is empty now, so the "Nhắn Zalo" buttons are hidden and "Gửi yêu cầu tư vấn" shows instead.
- Optional:
  - landscape photos for the 3 "Khu vực" cards;
  - edits to the values, steps and FAQ;
  - `seoTitle`/`seoDescription`.
- Indexing stays off until SEO is approved (see below).

## KNOWN_GAPS / findings
- **Pre-existing SEO policy bug (not changed, out of scope):** `src/lib/seo/policy.ts` `getSeoPolicy` requires `brand.identity.description` to be a non-empty *string*. The bootstrap and Admin store it as a rich-text document, so the frontend policy blocks indexing (and the sitemap and JSON-LD) on every route, even after the Owner turns indexing on. The backend `seoPolicy` already converts the document to text. Suggested fix: use `richDocumentToText(site.identity.description)` in `getSeoPolicy`. The demo SEO switch sets a plain-string description only to verify `/ve-minh`'s output.
- `og:type` is `website`: the shared metadata helper only supports `website`/`article`, and the spec allows `website`.
- The menu still points to `/ve-minh` if the owner later disables the page (the page then returns 404). Change the menu item in Admin → Menu if you do that.

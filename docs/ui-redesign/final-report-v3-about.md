# v3 "Về mình" page (`/ve-minh`): final report

Spec: `/home/openclaw/projects/dinh-van-booking-TASK-v3-about.md`, including the **ADDENDUM** (full SEO copy and editing through the Admin editor and Media Library). Running log: `docs/ui-redesign/progress-v3-about.md`.

## Git
- START_SHA=d2e2315
- First pass: c6ef3ef (backend setting/bootstrap/sitemap/menu), f364987 (page, CSS, JSON-LD, Admin fields, demo data), bab3346 (polish, QA, SEO evidence), 28e9cab (hero alt, real-stack shot, DB applied), 6bcac3c (first report).
- Addendum:
  - ef85383: SEO copy, OG fields, server-side `about.page` validation and tests;
  - d49b246: structured Admin form, OG metadata, 4-card grid, demo data snapshot;
  - the final commit `docs: v3 about addendum report` adds the form-nav scroll fix, the E2E script, QA logs, screenshots and this file. That commit is FINAL_SHA.
- REMOTE_MAIN_AFTER=equal to FINAL_SHA (`git rev-parse HEAD origin/main` checked after the push)
- WORKTREE=clean
- Force-push: none. Production deploy: NOT done (not authorized).

## Addendum 1: SEO content (bootstrap + local DB)
Source: `backend/src/scripts/data/public-bootstrap.ts` → `about.page`. Word counts are whitespace tokens with letters or digits, so the "–" dash is not counted.

| Block | Requirement | Actual |
|---|---|---|
| H1 | contains the main keyword | "Đặt phòng Cúc Phương cùng Đinh Vân" |
| Intro | 60–90 words | **81** |
| Story | 250–400 words, 2–4 paragraphs | **331** words in 4 paragraphs (84 / 85 / 98 / 64) |
| Values | 4 × 25–40 words | 4 values: **36 / 36 / 34 / 33** |
| "Cách mình đồng hành" | 4 steps | 4 steps (24 / 23 / 24 / 24 words) |
| "Hiểu Cúc Phương như người nhà" | 3–4 local cards | 4 cards (37 / 37 / 35 / 26 words). Links: `/diem-den` ×3, `/phong-nghi` ×1 |
| FAQ | 5–6 real-guest questions | **6**: best season; getting there from Hà Nội; what to bring; what happens after an inquiry; are price/availability confirmed before payment; itinerary help. Also emitted in the FAQPage JSON-LD. |
| Final CTA | present | "Sẵn sàng cho chuyến đi Cúc Phương?" (34-word text) |
| Meta title | ≤ 60 chars | `seoTitle` "Đặt phòng Cúc Phương cùng Đinh Vân" → rendered `<title>` "Đặt phòng Cúc Phương cùng Đinh Vân \| Cúc Phương Travel" = **54** chars |
| Meta description | 150–160 chars | **156** chars |
| OG description | short | **109** chars (`ogDescription`; og:description and twitter:description use it) |

- **Keywords** (each used naturally; the spec test asserts all five are present):
  - "đặt phòng Cúc Phương": H1, intro, story, values intro, seoTitle, description;
  - "homestay Cúc Phương": intro, story, values, CTA;
  - "lưu trú Cúc Phương Ninh Bình": story, cards intro, description;
  - "tư vấn du lịch Cúc Phương": story H2;
  - "người bản địa Cúc Phương": eyebrow, intro.
- **Area facts** (only well-established public facts, numbers approximate):
  - Vietnam's first national park, founded in 1962;
  - about 22,000 ha, across Ninh Bình, Hòa Bình and Thanh Hóa. The text adds "(theo địa giới cũ)" because Vietnam merged provinces in 2025;
  - primary forest and the cây chò ngàn năm;
  - Động Người Xưa holds traces of prehistoric people;
  - the Trung tâm Cứu hộ Linh trưởng Nguy cấp cares for rare langurs and gibbons;
  - butterfly season "khoảng tháng 4–5"; dry season roughly late autumn to spring; rainy mid-year with slippery trails and possible leeches.
  - There are no prices, timetables or distances. A test regex checks for none of đ/km/giờ/phút/hh:mm.
- **Đinh Vân / the business** (known facts only):
  - a local advisor running a small, independent service, not a big travel company;
  - she checks stays herself before recommending them;
  - she gives itinerary advice and supports guests by phone or Zalo;
  - a booking starts as an inquiry, and price, availability and conditions are confirmed before the guest pays.
  - The motivation copy ("vùng đất mình gắn bó", wanting guests to feel like they visited a local friend) is general first-person and makes no factual claim.
  - No years, counts, awards, education, testimonials or portrait. The existing test still rejects number+năm/khách/giải/lượt, "đánh giá" and the phone number in the copy.
- **Local DB:**
  - Dry-run `seed:public-bootstrap -- --dry-run --only about.`: `SETTING_SKIP about.page DIFFERS`, `REPLACE_REQUIRED=1`, 0 create, 0 media import.
  - Before replacing, the DB row was checked: version 1, and its only audit entry was `public-bootstrap.create`, so there were no owner edits.
  - `--apply --replace-existing --only about.`: `SETTING_REPLACED=1`, `MEDIA_IMPORTED=0`, `DVB_PUBLIC_BOOTSTRAP_APPLY=PASS`.
  - Demo data now reads `scripts/ui-demo/about-page.json`, a snapshot of the same bootstrap copy, so the demo and the real data can't drift.

## Addendum 2: Admin editing (TipTap + Media Library)
- **Form.** Admin → Cài đặt → "Các trang nội dung" → **Trang Về mình** now renders `src/components/admin/settings/AboutPageForm.tsx` instead of the generic key-order form.
  - It has 8 numbered sections: Đầu trang, Câu chuyện, Giá trị, Cách mình đồng hành, Hiểu Cúc Phương như người nhà, Câu hỏi thường gặp, Dải kêu gọi, SEO & chia sẻ.
  - A sticky section nav plus "Xem trang ↗" sits at the top.
- **Field types:**
  - Short fields are text inputs or textareas with limits.
  - The **existing TipTap `RichTextEditor`** (through the shared `ValueField` → `RichSettingField`) handles intro, story, CTA text and every FAQ answer. Values are stored as TipTap JSON and rendered on `/ve-minh` by the existing `RichContentRenderer`. Images inserted inside the editor also come from the Media Library.
  - The **Media Library picker** (`AdminMediaField`) handles the hero image, portrait, each local card's image and the new **OG image**.
- **Lists** (values, steps, cards, FAQ):
  - "+ Thêm …" adds an item with a fresh id (respecting the maximums 8/8/8/12);
  - "Xoá" removes an item after a confirmation;
  - ↑ / ↓ buttons with ARIA labels reorder items, and so does a drag handle. Only the handle is draggable, so text selection inside TipTap is not hijacked.
  - Hidden items get a "Đang ẩn" badge.
- **SEO helpers.** Live meters show:
  - intro 60–90 words and story 250–400 words;
  - each value 25–40 words;
  - the full title length including "| Cúc Phương Travel" (≤ 60);
  - description 150–160 chars and OG description ≤ 120 chars.
- **New setting fields:** `ogDescription`, `ogImageMediaId` (registry defaults null). `/ve-minh` uses them for og/twitter, falling back to the description and hero image.
- **Backend validation** (`backend/src/settings/about-page.validation.ts`, called from `SettingsService.update` for `about.page`):
  - rich fields go through `sanitizeDocument` with the `content.editor` allowed blocks, the same as articles. Legacy plain strings become paragraphs; a non-doc is rejected;
  - `*MediaId` fields must be UUIDs. Existence, public visibility, ready state and non-demo status are then checked by the existing `referencedMediaIds` gate, which also covers `mediaId` inside TipTap images;
  - card links must be internal paths (not `//…`, not `http…`);
  - icons come from fixed sets;
  - lists are bounded and every item needs a title/question;
  - item ids are regenerated when missing or duplicated;
  - texts are trimmed with per-field maximums;
  - unknown keys are dropped;
  - an enabled page needs an H1.
  - Errors are Vietnamese and name the field, e.g. "Trang Về mình – Thẻ địa phương 1 – đường dẫn: chỉ nhận đường dẫn nội bộ…".
  - 6 new tests (`about-page.validation.spec.ts` + the bootstrap SEO-structure test).
- **End-to-end on the real Docker stack.** `node scripts/ui-demo/about-admin-e2e.mjs http://localhost:18473` was run as the Owner. Result: `artifacts/ui-redesign-v2/about-admin-e2e.json`, all steps `ok: true`:
  1. Three bad PUTs (external card link, non-library portrait URL, non-doc story) → 400 with the messages above. Setting version unchanged.
  2. In the form:
     - typed a marker at the end of the **intro in TipTap**;
     - picked an image for local card 1 with the **Media Library picker**;
     - moved value 1 down with ↓.
     - Then "Lưu thay đổi" → version 6→7.
  3. `/ve-minh` → 200: the hero lead contains the marker, card 1 renders the picked image, and the first value card is the moved one.
  4. **Restore** through the same form: deleted the marker, "Gỡ ảnh", ↑. Saved → version 8. The stored value is **identical to the original** (stable-key JSON compare). `/ve-minh` is back to the original, with 0 page errors.
  - Screenshot: `artifacts/ui-redesign-v2/about-admin-1440.png` (form section 1 with the marker typed and the hero image in the Media Library field).
  - History:
    - The first E2E attempt saved its edit but failed to undo it, because the script mistook the brand e-mail input for the login form.
    - The row was restored with the bootstrap replace (version 4).
    - The script was fixed, and the run above is the clean one.
  - **Current DB `about.page` = the bootstrap copy (version 8).**

## Settings keys
- `about.page` (group `publicPages`, public):
  - hero: `enabled`, `heroEyebrow`, `title`, `intro` (rich), `heroImageMediaId`;
  - CTAs: `phoneCtaLabel`, `zaloCtaLabel`, `contactCtaLabel`;
  - story: `storyTitle`, `greeting`, `story` (rich), `portraitMediaId`, `signatureNote`, `quote`;
  - `valuesTitle`, `valuesIntro`, `values[]` {id, enabled, icon, title, text};
  - `stepsTitle`, `stepsIntro`, `steps[]`;
  - `areasTitle`, `areasIntro`, `areas[]` {id, enabled, icon, title, text, linkLabel, linkTarget, imageMediaId};
  - FAQ: `showFaq`, `faqTitle`, `faqs[]` {id, enabled, question, answer (rich)};
  - closing band: `ctaTitle`, `ctaText` (rich), `ctaStaysLabel`;
  - SEO: `areaServed`, `seoTitle`, `seoDescription`;
  - **new: `ogDescription`, `ogImageMediaId`**.
- These are not duplicated:
  - the advisor name, role and photo come from `home.contactPanel` (fallback `contact.page`);
  - phone and Zalo come from `brand.contact`.

## Page (from the first pass, unchanged unless noted)
- `/ve-minh` is a dedicated route, so it takes precedence over the root `[slug]` route. `ve-minh` is a reserved slug, and the page returns 404 when it is disabled or has no title.
- Sections: breadcrumb + photo hero with CTAs → story with the monogram portrait and Dancing Script signature → values → numbered steps → local cards → `<details>` FAQ → dark-green CTA band.
- New: with 4 cards, the grid is 4 columns at ≥ 1200 px and 2 × 2 from 1024 to 1199 px (never 3 + 1). Below that it stays as before: horizontal cards on tablet, stacked on mobile.
- Internal links:
  - header and footer nav "Về mình" → `/ve-minh`;
  - `/lien-he` → "Tìm hiểu thêm về mình";
  - the page links to `/lien-he`, `/phong-nghi` and `/diem-den`.

## Checks (final code)
- TYPECHECK=PASS (`npm run typecheck`)
- LINT=PASS (`npm run lint`)
- BUILD=PASS (`NEXT_DIST_DIR=.next-pub npm run build`; the Docker web image also ran `next build`)
- BACKEND_BUILD=PASS, BACKEND_TESTS=PASS **85/85** (`bash scripts/backend.sh test`, which builds first; was 79)
- BROWSER_QA=PASS. `scripts/ui-demo/qa.mjs --only=public` (demo API, production build) ran 12 public routes incl. `/ve-minh` and `/lien-he` at 1440/1024/768/390:
  - **60/60 OK**: status 200, console 0, page errors 0, hydration 0, overflow 0, focus visible, reduced-motion 0 running animations;
  - log: `artifacts/ui-redesign-v2/qa-results-v3-about.txt`.
- ADMIN_E2E=PASS (real Docker stack; see above)
- DOCKER=REBUILT:
  - `compose.sh up -d --build web api worker` (migrate clean);
  - web rebuilt twice more after the form-nav fix and a meter label change;
  - on both :18473 and :18480 these return 200: `/ve-minh`, `/`, `/lien-he`, `/phong-nghi`, `/diem-den`, `/admin`, `/sitemap.xml`;
  - `/ve-minh` shows the new content, has 1 h1, 0 console errors and 0 overflow at 1440 (:18473) and 390 (:18480).

## SEO checklist
| Item | Result |
|---|---|
| `<title>` ≤ 60 | PASS. "Đặt phòng Cúc Phương cùng Đinh Vân \| Cúc Phương Travel" (54). Real stack and demo. |
| Meta description 150–160 | PASS (156) |
| OG/Twitter | PASS. og:description and twitter:description = `ogDescription` (109). og:image = `ogImageMediaId` → hero fallback (absolute URL when an origin is approved). `summary_large_image`. og:type `website`. |
| Canonical via policy helpers | PASS. `https://<approved origin>/ve-minh` in approved mode; none on the unapproved local stack, same as other routes. |
| Runtime SEO policy | PASS. Local stack → `noindex, follow`, no JSON-LD. Indexing is never forced. |
| JSON-LD | PASS (approved-mode demo, parsed): AboutPage, Person, TravelAgency, Place, BreadcrumbList, **FAQPage with all 6 questions**, Organization, WebSite. Evidence: `artifacts/ui-redesign-v2/about-seo-check.json`. |
| One h1, h2/h3 order | PASS. 1 h1, 6 h2 sections, h3 for cards, steps and FAQ. |
| Sitemap | PASS. Approved-mode sitemap contains `https://…/ve-minh`. |
| Images | PASS. Hero `priority`/preload; the rest lazy; descriptive alt; decorative SVG `aria-hidden`. |

Approved mode = `DEMO_SEO_INDEX=1` (demo API) + `SEO_INDEXING_ALLOWED=true SEO_APPROVED_CANONICAL_ORIGIN=https://cucphuongtravel.example.com` on `next start`.

## Screenshots (`artifacts/ui-redesign-v2/`)
- `about-1440.png`, `about-390.png`: demo API, production build, final code.
- `about-real-1440.png`: real Docker stack (:18473), new copy.
- `about-admin-1440.png`: Admin form on the real stack during the E2E edit.

## For the owner (Admin → Cài đặt → Các trang nội dung → Trang Về mình)
- **Check the wording is true for you.** The copy uses "người bản địa Cúc Phương" (from the requested keywords) for "local advisor", and "vùng đất mình gắn bó" in the story. Also check that the payment flow wording matches how you actually work: "xác nhận giá, tình trạng phòng, điều kiện trước; bạn đồng ý rồi mới thanh toán". Edit any of it in the form.
- **Real portrait** (`Ảnh chân dung thật của bạn`, ~800×1000). Until then the "ĐV" monogram shows.
- **Personal story.** Add your own details in the TipTap story (how you're connected to Cúc Phương, what you love to recommend). Only true facts. The meter keeps it within 250–400 words.
- **Landscape photos** for the 4 local cards, and optionally an OG image (1200×630).
- **Zalo link** (Cài đặt → Liên hệ). It is empty, so the "Nhắn Zalo" buttons are hidden.
- Indexing stays off until SEO is approved (see the gap below).

## KNOWN_GAPS / findings
- **Pre-existing SEO policy bug (unchanged, out of scope).** Frontend `getSeoPolicy` requires `brand.identity.description` to be a plain string. The bootstrap stores a rich document, so the frontend blocks indexing, the sitemap and JSON-LD on every route even after Owner approval. Suggested fix: `richDocumentToText(site.identity.description)`.
- **Pre-existing Admin layout quirk.** In the Admin shell the outer document can be scrolled by `scrollIntoView` or `#hash` jumps, which shifts the whole layout. The new form nav avoids this by scrolling only the nearest scroll container. Other screens were not changed.
- Value, step and card descriptions are plain textareas (25–40-word texts). TipTap is used for the long fields: intro, story, CTA text and FAQ answers.
- `og:type` is `website`: the shared helper supports only website/article, and the spec allows `website`.
- If the owner disables the page, the menu still points to `/ve-minh` (404). Change it in Admin → Menu.

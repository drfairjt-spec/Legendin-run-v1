# Legendin — Phase 4: Frontend, UX & Performance (TODO for free/local AI agents)

> **Read `00_Integrity_Rules_and_Roadmap.md` first.** One task at a time, one commit per task: `P4-4.NN: <title>`. Task text is English; user-facing strings stay Farsi.
> 🟢 safe · 🟡 review before merge · 🔴 sensitive. **Database engine stays SQLite.** Branch `phase-4`. Precondition: tag `phase-3-done`. No migrations are expected in this phase (numbers `060`–`069` are reserved if one turns out to be needed).

**Goal:** a maintainable, fast, accessible, installable RTL app. Behaviour must not change: **task 4.01 builds the safety net first**, and every later task has to keep it green.

**Rules specific to this phase:**
- Refactors are *move-only* commits: no behaviour change, no restyling, in the same commit. If a bug is found, write it in `NOTES.md` and fix it in its own task.
- Every task that changes UI runs the Playwright suite (`npm run e2e`) and the manual smoke from the rules file.
- Persian strings are never reworded in a refactor.

---

## A — Safety net

### 🟡 4.01: Role-journey e2e suite
**Files:** `e2e/journeys/*.spec.ts`, `e2e/helpers/*.ts`, `playwright.config.ts`, `package.json`
**Do:** one spec per journey using seeded accounts and a fresh DB per run: (1) guest browses feed/salons/artists/slots; (2) client registers (fake SMS provider), sends a request, claims a slot, reviews a completed booking; (3) artist accepts/declines/completes, sees earnings, edits profile; (4) manager adds income/expense, manages staff, sends a hiring offer, approves leave; (5) admin approves a verification request; (6) logout/login/refresh. Each test asserts visible Persian text or `data-testid` attributes (add `data-testid` only; no other markup change). Add `npm run e2e:journeys`, included in `npm run gate`.
**Done when:** all journeys pass 3 times in a row (no flakiness); runtime < 5 minutes.

### 🟡 4.02: Visual baseline screenshots
**Depends on:** 4.01
**Files:** `e2e/visual/*.spec.ts`
**Do:** Playwright `toHaveScreenshot` for each main tab at 375×812 and 1280×800 (guest and manager). Mask dynamic content (dates, images). Baselines are committed. Allowed diff threshold 0.2 %.
**Done when:** the suite passes; a deliberate CSS change makes it fail (verify, then revert).

---

## B — Routing and structure

### 🔴 4.03: Add react-router mapping the existing tabs
**Depends on:** 4.01
**Files:** `package.json`, `src/main.tsx`, `src/App.tsx`, new `src/routes.ts`, `src/components/Layout/*` (nav components), `server.ts`/`src/server/app.ts` (SPA fallback), tests
**Do:** install `react-router-dom` (pinned). Map each existing tab to a path: `/` feed, `/salons`, `/salons/:salonId`, `/artists`, `/artists/:userId`, `/jobs`, `/discounts`, `/requests`, `/finance`, `/staff`, `/profile`, `/ai`, `/admin`, `/terms`, `/privacy`, `/login`. Replace `activeTab` state with the route; nav buttons become `<NavLink>`s; keep the old tab ids exported from `routes.ts` for a transition. Unknown path → a Persian 404 page. Server: serve `index.html` for any non-`/api`, non-`/uploads` GET (history fallback). Protected routes redirect guests to `/login?next=`.
**Done when:** every journey passes unchanged; browser back/forward works; deep link `/salons/<id>` loads directly after reload.

### 🔴 4.04: Introduce contexts, remove prop drilling from the shell
**Depends on:** 4.03
**Files:** new `src/context/AuthContext.tsx`, `DataContext.tsx` (wrapping the Phase 1 `useServerCollection` hooks), `src/App.tsx`, 2 leaf components as a pilot
**Do:** `AuthContext` exposes `currentUser`, `login`, `logout`, `refreshUser`; `DataContext` exposes the collections and their mutation helpers (same functions that App passed down). `App.tsx` only composes providers + routes. Migrate **only** `CommunityFeed` and `HiringMarketplace` to `useData()`/`useAuth()` in this task to prove the pattern; other components still receive props from a thin adapter in App.
**Done when:** journeys green; those two components have no data props.

### 🟡 4.05: Migrate the remaining components to contexts (batch 1: finance and staff)
**Depends on:** 4.04 · **Files:** `FinanceDashboard.tsx`, `StaffManagement.tsx`, `ArtistSkillRadar.tsx`
**Do:** same pattern; delete the corresponding props from the App adapter.
**Done when:** journeys green; `grep -n "onUpdate" ` for those components shows nothing.

### 🟡 4.06: Migrate the remaining components (batch 2: requests, profile, discovery)
**Depends on:** 4.05 · **Files:** `RequestsInbox.tsx`, `UserProfile.tsx`, `SalonDiscoveryView.tsx`, `SalonProfileHub.tsx`, `DiscountServices.tsx`, `AIAssistant.tsx`, `App.tsx`
**Do:** same pattern; remove the adapter from App entirely.
**Done when:** `App.tsx` < 150 lines; journeys + visual baselines green; `grep -rn "salonId=\"" src` empty.

### 🔴 4.07: Split `UserProfile.tsx` (move-only)
**Depends on:** 4.06 · **Files:** `src/components/profile/*`
**Do:** extract by section into files < 400 lines each: `ProfileHeader`, `ProfilePortfolio`, `ProfileServices`, `ProfileContracts`, `ProfileCertificates`, `ProfileSettings`, `ProfileBookings`, hooks into `profile/hooks.ts`. `UserProfile.tsx` becomes a composition file. No logic edits.
**Done when:** the largest file in `src/components/profile` < 400 lines; journeys + visual baselines pass with 0 diff.

### 🟡 4.08: Split `StaffManagement.tsx` and `RequestsInbox.tsx` (move-only)
**Depends on:** 4.06 · **Files:** `src/components/staff/*`, `src/components/requests/*`
**Do:** same procedure; target < 400 lines per file.
**Done when:** same as 4.07.

### 🟢 4.09: Split `CommunityFeed.tsx`, `SalonProfileHub.tsx`, `FinanceDashboard.tsx` (move-only)
**Depends on:** 4.06 · **Files:** `src/components/feed/*`, `salon/*`, `finance/*`
**Done when:** same as 4.07.

---

## C — Performance

### 🟡 4.10: Code splitting and bundle budget
**Depends on:** 4.03
**Files:** `src/routes.ts`, `vite.config.ts`, new `scripts/check-bundle-size.ts`, `package.json`
**Do:** `React.lazy` + `Suspense` (Persian skeleton fallback) for every route page; separate chunks for `recharts`/`d3`, `react-markdown`, and `motion` through `manualChunks`. Script reads `dist/assets` and fails if the entry chunk > 200 KB gzip or any route chunk > 150 KB gzip. Add to the gate. Record the *before/after* sizes in `docs/perf.md`.
**Done when:** the budget script passes; the entry chunk shrank by at least 40 % versus the number in `docs/perf.md`'s "before".

### 🟢 4.11: Memoization and list virtualization where measured
**Depends on:** 4.10 · **Files:** feed, discovery, finance table components; `package.json` (`@tanstack/react-virtual`)
**Do:** measure with the React Profiler on a seeded DB of 2,000 posts / 500 transactions (add `scripts/seed-load.ts`, dev only). Virtualize the finance table and the feed only if the measured interaction takes > 100 ms; memoize list items. Record numbers in `docs/perf.md`.
**Done when:** scrolling 500 rows stays < 16 ms/frame in the profiler notes; journeys green.

### 🟡 4.12: Server-side search and pagination in the UI
**Depends on:** Phase 2 salons API
**Files:** `src/server/routes/{salons,users,posts,discountedSlots}.ts`, repositories, `src/api/*`, discovery/feed/jobs components, tests
**Do:** add `?q=&city=&category=&limit=&cursor=` to the list endpoints (cursor = opaque base64 of `created_at,id`; stable order `created_at DESC, id DESC`); response stays an array with an `X-Next-Cursor` header (additive). Components load the first page and use "نمایش بیشتر" (or intersection observer). Filtering by `LOWER(col) LIKE LOWER(?)` only.
**Done when:** API tests for paging stability (no duplicates/gaps while inserting); the UI shows 20 items first.

---

## D — Assets, design system, UX behaviours

### 🟡 4.13: Self-host fonts
**Files:** `public/fonts/Vazirmatn-*.woff2` (download the official release files from the Vazirmatn GitHub release), `src/index.css`, `index.html`
**Do:** `@font-face` for weights used (400/500/700) with `font-display: swap`, subset to Arabic + Latin if a tool is available; `<link rel="preload" as="font" type="font/woff2" crossorigin>` for 400/700; remove the Google Fonts `<link>`/`@import`.
**Done when:** `grep -rn "fonts.googleapis\|fonts.gstatic" index.html src` is empty; the page renders with network blocked to Google (Playwright route abort).

### 🔴 4.14: Replace hotlinked Unsplash images with local assets
**Owner item still open — REMIND the owner before this task:** which images may be used (licenses / own photos) — the owner will write the rule later. Do not download or bundle any image until `docs/image-credits.md` has the owner's approved rule.
**Files:** new `src/shared/defaults.ts`, `public/img/*`, all components/seed files containing `images.unsplash.com`, `scripts/localize-images.ts`
**Do:** the script lists every Unsplash URL (≈121), and downloads each into `public/img/` as optimized `.webp` (max 1200 px, quality 80) — **only licensed images the owner approves; list them in `docs/image-credits.md`**. Replace URLs with `/img/<name>.webp`. Default avatar/cover/portfolio images come from `defaults.ts`. Add `loading="lazy"` and `width/height` to non-critical `<img>`.
**Done when:** `grep -rn "unsplash" src server.ts public index.html` is empty; Lighthouse CLS < 0.1 on the feed.

### 🟡 4.15: Toast and confirm components replace `alert`/`confirm`
**Files:** new `src/components/ui/{Toast,ConfirmDialog,Modal}.tsx`, `src/context/UiContext.tsx`, every file using `alert(`/`confirm(`/`prompt(`
**Do:** `useToast().success|error|info(msg)`, `useConfirm()` returns a Promise<boolean> with a Persian styled dialog (focus trap, ESC, `role="alertdialog"`). Replace all native dialogs; keep message texts verbatim.
**Done when:** `grep -rn "alert(\|confirm(\|prompt(" src` is empty (excluding tests); journeys updated to click the dialog buttons.

### 🟡 4.16: Content Security Policy (report-only → enforce)
**Depends on:** 4.13, 4.14
**Files:** `src/server/app.ts` (helmet config), `src/server/routes/csp.ts`, `.env.example`
**Do:** first ship `Content-Security-Policy-Report-Only` with `default-src 'self'; img-src 'self' data: blob:; font-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'` and a `report-uri /api/csp-report` that logs. Run all journeys with Playwright console capture and fix every violation. Then switch to enforcing mode via `CSP_MODE=enforce` (default `enforce`).
**Done when:** zero CSP violations in all journeys; a test confirms the header; inline `<script>` injection test is blocked.

### 🟡 4.17: Accessibility pass
**Files:** `eslint.config.*`, `package.json` (`eslint-plugin-jsx-a11y`, `@axe-core/playwright`), components
**Do:** enable the plugin as errors and fix findings: labels for inputs, `alt` text, button vs div clickable, focus-visible styles, dialogs from `Modal` (4.15), `lang="fa" dir="rtl"` on `<html>`, skip link `پرش به محتوا`, color contrast ≥ 4.5:1 (adjust tokens only, record changes in `docs/a11y.md`). Add an axe check to each journey page.
**Done when:** `npm run lint` and axe report 0 serious/critical violations on the main pages; keyboard-only run of the client journey passes.

### 🟡 4.18: RTL and Persian-input hygiene
**Files:** `tailwind` classes in components, `src/shared/schemas.ts`, `src/utils/digits.ts`
**Do:** replace physical classes (`ml-`, `mr-`, `pl-`, `pr-`, `left-`, `right-`, `text-left`, `text-right`) with logical ones (`ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`, `text-start`, `text-end`) where direction matters; phone/price/number inputs get `dir="ltr"` and `inputMode`; add `normalizeDigits()` (Persian/Arabic → Latin) applied to phone, price and date inputs **before** validation; display numbers with `toLocaleString('fa-IR')` through one helper `fmt.number()`/`fmt.toman()`; icons that imply direction are flipped (`rtl:rotate-180`).
**Done when:** Playwright: typing `۰۹۱۲۳۴۵۶۷۸۹` in the phone field works; visual baselines updated *intentionally* (review the diff); no horizontal scroll at 320 px.

### 🟡 4.19: Forms and states design pass
**Files:** `src/components/ui/{Field,Button,Skeleton,EmptyState,ErrorState}.tsx`, forms
**Do:** a consistent form field component showing inline Persian validation messages from server `fields`; loading skeletons instead of blank screens; empty states with a call to action; a global error boundary with a Persian "تلاش مجدد" page; disabled+spinner on submit buttons to prevent double submit.
**Done when:** every form shows server-side validation errors under the field (test with a mismatched field); no page renders blank while loading.

### 🔴 4.20: Brand unification (needs the owner's decision)
**Files:** `index.html`, `package.json` `name`, `README.md`, `src/components/**`, `src/shared/brand.ts`, `public/` icons, server strings, `.env.example`, `docs/`
**Owner decision (2026-10-16): the final brand is `Legendin`.** Remove `Fair` and `Aura` from everything user-visible. The Persian rendering and tagline are still to be confirmed by the owner (default `لجندین`; ask before using a tagline).
**Do:** Create `src/shared/brand.ts` (`BRAND_NAME_FA`, `BRAND_NAME_EN = 'Legendin'`, `TAGLINE`). Replace every hard-coded mention in UI, `<title>`, meta tags, emails/SMS templates (Phase 3 `templates.ts`), README, repo docs. Keep technical identifiers (db filename, repo name) unchanged.
**Done when:** `grep -rniE "legendin|fair|aura" src index.html` shows only `brand.ts`, allowed technical ids, and words that are unrelated to the brand (documented in `docs/brand-grep-allowlist.txt`); visual baselines updated intentionally.

---

## E — Installability, SEO, quality budget

### 🟡 4.21: PWA (manifest, icons, service worker)
**Depends on:** 4.13, 4.14, 4.20
**Files:** `public/manifest.webmanifest`, `public/icons/*`, `vite.config.ts` (`vite-plugin-pwa`), `src/pwa.ts`
**Do:** manifest in Persian (`dir: rtl`, `lang: fa`, standalone, theme color); icons 192/512 + maskable; service worker precaches the app shell and fonts only; **never caches `/api`** responses; offline page `آفلاین هستید`; update prompt toast when a new version is waiting.
**Done when:** Lighthouse PWA installable checks pass; offline load shows the offline page; API requests are always network-first (test).

### 🟡 4.22: SEO — meta injection, sitemap, structured data
**Files:** `src/server/seo.ts`, `src/server/app.ts`, `public/robots.txt`, tests
**Do:** for `/salons/:id` and `/artists/:id` the server injects `<title>`, `description`, OpenGraph and a JSON-LD `HairSalon`/`Person` block into the served `index.html` (HTML-escape every value) for crawlers and link previews; `GET /sitemap.xml` lists active, verified salons and public artist pages (max 5,000 URLs); `robots.txt` disallows `/api/`, `/admin`, `/profile`. Private data (phone, email) never appears.
**Done when:** `curl -s /salons/<id>` contains the salon name in `<title>` and valid JSON-LD (parse test); sitemap validates; a salon with `<script>` in its name is escaped (test).

### 🟢 4.23: Lighthouse budget in CI
**Files:** `lighthouserc.json`, `.github/workflows/ci.yml`
**Do:** Lighthouse CI against the built app with seed data: performance ≥ 85, accessibility ≥ 95, best-practices ≥ 95, SEO ≥ 90, LCP < 2.5 s, CLS < 0.1 (mobile preset). Fail the workflow on regression.
**Done when:** CI is green on `main`; thresholds recorded in `docs/perf.md`.

### 🟡 4.24: Remove dead UI code and leftover state hacks
**Files:** `src/**`
**Do:** use `ts-prune`/`knip` (dev only) to list unused exports/files; remove ones that are unused *and* not listed in `NOTES.md`; remove leftover `useEffect` + `localStorage` mirrors (should be none after Phase 1); delete unused dependencies from `package.json`.
**Done when:** `knip` reports zero unused files; `npm run gate` green; bundle smaller or equal.

### 🔴 4.25: Phase 4 gate
Fresh DB **and** a copy of the `phase-3-done` DB:
- [ ] `npm run gate` green including journeys, visual baselines, axe, bundle budget, Lighthouse CI.
- [ ] `grep -rn "alert(\|confirm(\|prompt(" src` empty; `grep -rn "unsplash\|fonts.googleapis" src index.html public` empty; `wc -l src/App.tsx` < 150; no component file > 600 lines (`find src/components -name '*.tsx' | xargs wc -l | sort -n | tail`).
- [ ] `grep -rnE "\b(ml|mr|pl|pr)-[0-9]" src` reviewed (remaining ones documented as direction-neutral).
- [ ] CSP enforced; zero violations in journeys.
- [ ] Manual: install the PWA on a phone, run the client journey on 360 px width, screen-reader pass on login + booking request.
- [ ] `db:snapshot` diff shows only intended changes (4.x should add none).
- [ ] Tag `phase-4-done`; ask the reviewer to check the repository before Phase 5.

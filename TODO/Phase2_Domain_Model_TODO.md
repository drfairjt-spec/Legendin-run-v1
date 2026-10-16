# Legendin — Phase 2: Domain Model & Business Rules (TODO for free/local AI agents)

> **Read `00_Integrity_Rules_and_Roadmap.md` first.** Same conventions as before: English task text, Farsi stays in user-facing strings, one task at a time, one commit per task named `P2-2.NN: <title>`.
> 🟢 safe/independent · 🟡 needs review before merging · 🔴 architecturally sensitive.
> **Database engine stays SQLite.** Branch: `phase-2`. Preconditions: Phase 1 gate passed and tagged `phase-1-done`. Migrations in this phase use numbers `020`–`039`.

**Goal:** the server owns the business rules. Today "salon" is just a manager's user row, a "booking" is just a request with a date string, and the cancellation fee / discounted slot / income logic runs in the browser. After this phase: real salons and memberships, bookings with conflict checks, request state machine and atomic operations on the server, immutable-style income postings, normalized likes and reviews tied to real bookings.

**Design decisions (fixed for this phase):**
- **Legacy salon id = the owner manager's user id.** A salon created from an existing manager gets `salons.id = users.id`. New salons get `salon-<uuid>`. This makes the data backfill trivial and keeps `transactions.salon_id` values valid.
- **Completion lives on the booking**, not on the request. `client_requests.status` stays `pending | accepted | declined | cancelled` (its CHECK constraint is not touched); `bookings.status` is `confirmed | completed | cancelled | no_show`. Requests expose an additive `bookingStatus` field.
- `bookings.salon_id` and `bookings.artist_id` are **nullable** (independent artists, salon-level requests not yet assigned to an artist). Overlap checks apply only when `artist_id` is set.
- Contract steps (stop writing legacy columns) happen at the end of the phase; physical column removal happens for free in the PostgreSQL baseline (Phase 7).
- Create `docs/portability-notes.md` in task 2.02 and append to it whenever a migration uses engine-specific DDL (partial indexes are fine in both engines; triggers, CHECK changes and table rebuilds must be listed). Phase 7 reads this file.

---

## A — Shared rules and time

### 🟡 2.01: Finish moving pure business rules to `src/shared/` and add time converters
**Depends on:** Phase 1
**Files:** `src/shared/shamsi.ts` (moved from `src/utils/shamsi.ts`, old path re-exports), `src/shared/rules/employeeBalance.ts` (moved from `src/utils/employeeBalance.ts`, old path re-exports), `src/shared/time.ts`, tests
**Do:**
- First write **characterization tests** that record the current outputs of `calculateEmployeeBalance`, `parseContractAmount`, `calculateDiscountedPrice`, `calculateArtistNetTake`, `calculateCancellationFee` (with fixed `now`) for a table of inputs; then move the code; the tests must pass unchanged.
- Add to `time.ts`: `shamsiToUtcIso(date: string, time = '00:00'): string` (accepts Latin or Persian digits, `YYYY/MM/DD`, fixed offset +03:30) and `utcIsoToShamsi(iso: string): { date: string; time: string }`.
**Done when:** unit tests pass for `1405/04/12 14:30` → `2026-07-03T11:00:00.000Z` (verify with the existing converter), the leap-day `1403/12/30`, Persian-digit input, and round-trip `utcIsoToShamsi(shamsiToUtcIso(x)) == x` for 200 random valid dates.

---

## B — Salons and memberships

### 🟡 2.02: Expand — salons, members, hours, holidays, amenities, announcements
**Depends on:** 2.01
**Files:** new `src/server/db/migrations/020_salons.ts`, new `docs/portability-notes.md`
**Do:** create (all ids `TEXT PRIMARY KEY NOT NULL`, timestamps ISO text):
```sql
CREATE TABLE salons (id, owner_id REFERENCES users(id) NOT NULL, name NOT NULL, province, city, address,
  lat REAL, lng REAL, description, status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','hidden','closed')),
  created_at NOT NULL, updated_at NOT NULL);
CREATE TABLE salon_members (id, salon_id REFERENCES salons(id) NOT NULL, user_id REFERENCES users(id) NOT NULL,
  member_role TEXT NOT NULL CHECK(member_role IN ('manager','artist','service-staff')),
  contract_type, contract_start, contract_end, contract_amount_text, contract_value INTEGER,
  contract_file_url, guarantee_type, guarantee_file_url,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','ended')), joined_at NOT NULL, ended_at);
CREATE UNIQUE INDEX ux_salon_members_active ON salon_members(salon_id, user_id) WHERE status = 'active';
CREATE TABLE salon_working_hours (salon_id REFERENCES salons(id) NOT NULL, day TEXT NOT NULL,
  is_open INTEGER NOT NULL, open_time, close_time, PRIMARY KEY (salon_id, day));
CREATE TABLE salon_holidays (id, salon_id, title, date, type CHECK(type IN ('official','salonSpecific')));
CREATE TABLE salon_amenities (id, salon_id, label, available INTEGER NOT NULL);
CREATE TABLE salon_announcements (id, salon_id, title, content, is_pinned INTEGER NOT NULL DEFAULT 0, created_at NOT NULL);
CREATE INDEX idx_salons_city ON salons(city);
CREATE INDEX idx_members_user ON salon_members(user_id);
CREATE INDEX idx_members_salon ON salon_members(salon_id, status);
```
Shapes follow `Salon`, `WorkingHours`, `Holiday`, `Amenity`, `Announcement` in `src/shared/types.ts` (+ `id`, `name`, `description`). Create `docs/portability-notes.md` with the section "Partial unique indexes: supported by both engines".
**Done when:** the migration applies on fresh and upgraded DBs; nothing else changes.

### 🔴 2.03: Backfill salons and members (idempotent) + verification script
**Depends on:** 2.02
**Files:** new `src/server/db/migrations/021_backfill_salons.ts`, new `scripts/verify-salon-backfill.ts`; `package.json`
**Do:** inside one migration: for every user with `role = 'manager'` insert a salon with `id = users.id`, `owner_id = users.id`, `name = COALESCE(salon_name, name)`, `city = users.city`, `address = salon_location`, `description = salon_description`; insert a `manager` member row for the owner; for every user with `manager_id` insert an `artist`/`service-staff` member row for that salon, copying `contract_*`/`guarantee_*` and `contract_value = parseContractAmount(contract_amount)` (shared rule); parse `working_hours_json` (`{day, hours}` items such as `09:00 - 21:00`) into `salon_working_hours` (unparsable → closed, and listed in the report). Script `verify-salon-backfill`: manager count = salon count; every user with `manager_id` has an active member row; every member row has an existing user and salon; prints the unparsable-hours report; exit 1 on any violation. Script `db:verify-salons`.
**Done when:** the verification script exits 0 on a seeded DB and on a copy of a real/previous DB; re-running the migration (runner prevents it) and the script is safe.

### 🟡 2.04: Salon API and frontend reads
**Depends on:** 2.03
**Files:** new `src/server/repositories/salons.ts`, `src/server/routes/salons.ts`, `src/shared/schemas.ts`; `src/server/routes/users.ts` (dual-write); new `src/api/salons.ts`, `src/hooks/useSalons.ts`; `src/components/SalonDiscoveryView.tsx`, `src/components/SalonProfileHub.tsx`; `tests`
**Do:**
- `GET /api/salons` (public; `?city=&q=&limit=&offset=`, default limit 30, only `status='active'`), `GET /api/salons/:id` (public: salon + hours/holidays/amenities/pinned announcements + public staff ids), `PUT /api/salons/:id` (owner), `PUT /api/salons/:id/hours`, `PUT /api/salons/:id/holidays`, `PUT /api/salons/:id/amenities` (owner; replace sets in `db.tx`), `POST /api/salons/:id/announcements`, `DELETE /api/salons/:id/announcements/:announcementId` (owner).
- Dual-write: when `PUT /api/users/:id` changes a manager's `salonName/salonLocation/salonDescription/city`, update the owner's `salons` row in the same `db.tx`.
- `SalonDiscoveryView` and `SalonProfileHub` read salons through `useSalons()` (read-only hook); staff lists still come from `allUsers`.
- Parity test: for every seeded manager, the salon API fields equal the manager's user fields.
**Done when:** Playwright: a guest sees salons; a manager edits the salon name, reloads, the discovery view shows the new name; a non-owner `PUT` → 403.

### 🔴 2.05: Membership authorization helper
**Depends on:** 2.03
**Files:** new `src/server/services/membership.ts`, `src/server/middleware/salonAccess.ts`; tests
**Do:** `getActiveMembership(userId, salonId)`, `listSalonIdsForUser(userId)`; middleware `requireSalonAccess({ roles })` resolving `req.salonId` from `:salonId` / `?salonId` / header `X-Salon-Id`, and verifying the caller is the owner or an active member with an allowed role (403 otherwise). When no salon is given: a manager gets the first salon they own, an artist/service-staff gets their active salon (single-salon compatibility). Never trust a salon id coming from the body.
**Done when:** unit/API tests cover owner, active member, ended member, outsider, and the default resolution.

### 🔴 2.06: Re-scope requests, leave requests and staff endpoints by salon
**Depends on:** 2.05
**Files:** `src/server/routes/clientRequests.ts`, `leaveRequests.ts`, `users.ts` (staff PATCH), repositories, `tests/authz-matrix.json`, tests
**Do:** replace the Phase 0/1 "manager sees everything" rules: a manager sees client requests whose target is their salon (`target_type='salon' AND target_id = salon.id`) or one of its active members, and leave requests of their active members only; an artist sees requests targeted at themselves and their own leave requests; `PATCH /api/users/:id/staff` authorizes through an active membership in a salon the caller owns (not through `users.manager_id`). Add isolation tests with **two salons** for every changed route.
**Done when:** manager of salon A cannot read or change anything of salon B (tests); authz matrix updated and green.

### 🔴 2.07: Re-scope finance by salon
**Depends on:** 2.05
**Files:** `src/server/routes/finance.ts`, `src/server/repositories/transactions.ts`, `src/hooks/useCurrentSalon.ts` (new), `src/App.tsx`, `src/components/FinanceDashboard.tsx`, `UserProfile.tsx`, `StaffManagement.tsx`, tests
**Do:** `GET /api/transactions?salonId=` and `GET /api/transactions/summary?salonId=` resolve the salon through `requireSalonAccess({ roles: ['manager'] })`; `POST` takes `salonId` from the resolved salon (never the body); `DELETE` checks the row's `salon_id` against the caller's salons. Artists keep seeing only rows where `related_staff_id = caller.id`. The frontend gets `salonId` from `useCurrentSalon()` (the manager's first owned salon) instead of the previous manager-id convention. `transactions.salon_id` still has the old FK to `users(id)` until 2.08; for legacy salons the ids are equal.
**Done when:** two managers with two salons never see each other's rows (tests); the finance UI works unchanged for a manager.

### 🔴 2.08: Rebuild `transactions` with `salon_id → salons(id)`
**Depends on:** 2.07
**Files:** new `src/server/db/migrations/022_transactions_salon_fk.ts` (`rebuild: true`)
**Do:** create `transactions_new` with the same columns but `salon_id TEXT NOT NULL REFERENCES salons(id)`; copy all rows; drop `transactions`; rename; recreate `idx_transactions_staff`, `idx_transactions_salon`, and add `idx_transactions_salon_date ON transactions(salon_id, date, id)`. Take a `db:backup` first. The runner (task 1.07) checks `foreign_key_check`.
**Done when:** row count and `db:snapshot` hash of the table (ignoring column order) are unchanged; inserting a transaction for a non-existent salon fails.

### 🟡 2.09: Rebuild `discounts` with `salon_id → salons(id)`
**Files:** new `src/server/db/migrations/023_discounts_salon_fk.ts` (`rebuild: true`)
**Do:** same procedure as 2.08 for `discounts` (keep all columns and the other foreign keys).
**Done when:** snapshot hash unchanged; FK enforced.

### 🟡 2.10: Rebuild `job_applications` with `salon_id → salons(id)`
**Files:** new `src/server/db/migrations/024_job_applications_salon_fk.ts` (`rebuild: true`)
**Do:** same procedure; keep the Phase 1 columns (`position_title`, `resume_*`).
**Done when:** snapshot hash unchanged; FK enforced; applications still load.

### 🟡 2.11: Services per salon and `artist_services` (expand → migrate → switch reads)
**Depends on:** 2.03
**Files:** new `src/server/db/migrations/025_services_per_salon.ts`, repositories `services.ts`/`users.ts`, `src/server/routes/services.ts`, `src/server/routes/users.ts`, tests
**Do:**
- Migration: `ALTER TABLE services ADD COLUMN salon_id TEXT REFERENCES salons(id)` (NULL = global default catalog), `ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1`; `CREATE TABLE artist_services (user_id REFERENCES users(id) NOT NULL, service_id REFERENCES services(id) NOT NULL, PRIMARY KEY (user_id, service_id))`; backfill from `users.assigned_service_ids_json` (ids that do not exist are skipped and listed in the migration log).
- `PATCH /api/users/:id/staff` writes **both** the JSON column and `artist_services` inside one `db.tx` (dual-write); the serializer reads `assignedServiceIds` from `artist_services`.
- Manager endpoints `POST/PATCH/DELETE /api/salons/:id/services` (delete = `is_active = 0`); `GET /api/services` returns global + active salon services (`?salonId=`).
**Done when:** the assigned services of every seeded artist are identical before and after (shape-parity test from 1.21 still passes); a manager cannot edit another salon's services.

---

## C — Bookings and request lifecycle

### 🟡 2.12: Expand — bookings (+ legacy backfill)
**Depends on:** 2.01, 2.11
**Files:** new `src/server/db/migrations/026_bookings.ts`, `src/server/db/migrations/027_backfill_bookings.ts`
**Do:**
```sql
CREATE TABLE bookings (id TEXT PRIMARY KEY NOT NULL, request_id TEXT NOT NULL UNIQUE REFERENCES client_requests(id),
  salon_id TEXT REFERENCES salons(id), artist_id TEXT REFERENCES users(id), client_id TEXT NOT NULL REFERENCES users(id),
  service_id TEXT REFERENCES services(id), start_at TEXT NOT NULL, end_at TEXT NOT NULL, price INTEGER,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK(status IN ('confirmed','completed','cancelled','no_show')),
  legacy INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE INDEX idx_bookings_artist_start ON bookings(artist_id, start_at);
CREATE INDEX idx_bookings_salon_start ON bookings(salon_id, start_at);
CREATE INDEX idx_bookings_client_start ON bookings(client_id, start_at);
```
Add `ALTER TABLE client_requests ADD COLUMN source_slot_id TEXT REFERENCES discounted_slots(id)`. Backfill (migration 027, `legacy = 1`): one booking per request with `status = 'accepted'`: `start_at = shamsiToUtcIso(preferred_date, preferred_time)`, `end_at = start + services.duration_minutes (default 60)`, `artist_id` = the artist target (NULL for salon targets), `salon_id` from the target salon or the artist's active membership. Rows that cannot be parsed are skipped and listed in a report printed by the migration.
**Done when:** migrations apply; the number of `legacy` bookings equals the number of accepted requests minus the reported skips.

### 🔴 2.13: Availability, conflict check and bookings list
**Depends on:** 2.12
**Files:** new `src/server/services/availability.ts`, `src/server/repositories/bookings.ts`, `src/server/routes/bookings.ts`, tests
**Do:**
- `hasConflict(db, artistId, startAt, endAt, excludeBookingId?)`: true if a **confirmed non-legacy** booking of that artist overlaps `[start, end)`.
- `getFreeSlots({ artistId, date, serviceId })`: from the salon's working hours for that weekday (Persian weekday names from `WorkingHours`), minus holidays (`salon_holidays`/official), minus confirmed bookings; step 30 minutes; times returned as Shamsi `HH:MM`.
- `GET /api/availability?artistId=&date=1405/04/12&serviceId=` (public, no PII) and `GET /api/bookings` (scoped: a client sees their bookings, an artist theirs, a manager their salon's).
**Done when:** unit tests with a fixed clock for working hours, a holiday, back-to-back bookings (no conflict at the boundary), and overlap; API test for the scoped list.

### 🔴 2.14: Accept and decline actions
**Depends on:** 2.13, 2.06
**Files:** `src/server/services/requestService.ts` (new), `src/server/routes/clientRequests.ts`, tests
**Do:** `POST /api/client-requests/:id/accept` (target artist, or the salon's manager; for a salon-targeted request the body must contain `artistId` of an active member) inside `db.tx`: `UPDATE client_requests SET status='accepted' WHERE id=? AND status='pending'` (zero changes → 409); compute `start_at/end_at`; `hasConflict` → **409** `{ error: 'این بازه زمانی قبلاً رزرو شده است.' }`; insert the booking; return `{ request, booking }`. `POST .../decline` (`pending → declined`). The Phase 1 `PATCH` status route stays untouched until 2.18.
**Done when:** API tests: accept creates exactly one booking; two simultaneous accepts of overlapping requests for one artist → one 200 and one 409; a non-target gets 403.

### 🔴 2.15: Cancellations table and the cancel action (fee, booking, discounted slot — server side)
**Depends on:** 2.14
**Files:** new `src/server/db/migrations/028_cancellations.ts`, `src/server/services/requestService.ts`, `src/server/routes/clientRequests.ts`, tests
**Do:**
- Migration: `CREATE TABLE cancellations (id TEXT PRIMARY KEY NOT NULL, request_id TEXT NOT NULL UNIQUE REFERENCES client_requests(id), reason_category TEXT NOT NULL, reason_note TEXT, fee_acknowledged INTEGER NOT NULL, fee_applied INTEGER NOT NULL, fee_amount INTEGER, cancelled_by TEXT NOT NULL REFERENCES users(id), cancelled_at TEXT NOT NULL)`; backfill from `cancellation_json` using the Phase 1 normalization.
- `POST /api/client-requests/:id/cancel` body `{ reasonCategory, reasonNote?, feeAcknowledged }` (the note is required when the category is `سایر`): in one `db.tx`: request `pending|accepted → cancelled` (conditional update); if the **client** cancels, compute `feeApplied/feeAmount` with the shared rule and the server clock; if the **target** cancels, no fee; insert the `cancellations` row (and keep writing `cancellation_json` for old readers); the booking becomes `cancelled`; **create the discounted slot** exactly under the conditions the UI uses today (read them in `docs/state-mutation-inventory.md`: the `onAddDiscountedSlot` call sites), with price/commission from the shared discount constants.
**Done when:** API tests: a cancellation within 24 h → fee = 30 % of the price; outside → no fee; a client-supplied fee is impossible; the slot appears only when the rules say so; a second cancel → 409.

### 🟡 2.16: Slot claim action and expiry
**Depends on:** 2.15
**Files:** `src/server/routes/discountedSlots.ts`, `src/server/services/slotService.ts` (new), tests
**Do:** `POST /api/discounted-slots/:id/claim` (client) in one `db.tx`: `UPDATE ... SET status='claimed', claimed_by_client_id=? WHERE id=? AND status='available'` (0 changes → 409), then insert the client request (note text `این نوبت از بخش خدمات تخفیف‌دار رزرو شده است.`, price = discounted price, target = the slot's artist, `source_slot_id = slot.id`, status `pending`) and return `{ slot, request }`. Expiry: `expireStaleSlots(now)` marks `available` slots whose date/time (`shamsiToUtcIso`) is in the past as `expired`; call it at the start of `GET /api/discounted-slots` for now (a scheduled job replaces it in Phase 5).
**Done when:** two concurrent claims → exactly one 200; an expired slot cannot be claimed (409); the created request references the slot.

### 🔴 2.17: Complete and no-show actions with idempotent income
**Depends on:** 2.16
**Files:** new `src/server/db/migrations/029_income_postings.ts`, `src/server/services/requestService.ts`, `src/server/routes/clientRequests.ts`, `src/shared/types.ts` (additive `bookingStatus`), tests
**Do:**
- Migration: `ALTER TABLE transactions ADD COLUMN commission_percent INTEGER; ADD COLUMN commission_amount INTEGER;` and `CREATE UNIQUE INDEX ux_income_per_request ON transactions(related_request_id, category) WHERE direction = 'income' AND related_request_id IS NOT NULL;`
- `POST /api/client-requests/:id/complete` (the booking's artist or the salon manager; only after `start_at`): in `db.tx`, booking `confirmed → completed` (conditional update); if the booking has a `salon_id`, insert an **income** transaction: category `درآمد نوبت تخفیف‌دار` when `source_slot_id` is set, otherwise `درآمد خدمات`; amount = request price; `related_staff_id = artist_id`, `related_request_id`; for slot-sourced income also store `commission_percent` and `commission_amount` (shared rule). A repeated call is a no-op returning the same data (the unique index guarantees a single posting). `POST .../no-show` sets `no_show` and posts nothing.
- Requests serialize an additive `bookingStatus`.
**Done when:** completing twice (even concurrently) leaves exactly one income row; no-show leaves none; the manager's finance summary reflects the income.

### 🔴 2.18: Switch the frontend to the action endpoints; remove `PATCH` status (contract)
**Depends on:** 2.14 – 2.17
**Files:** `src/api/clientRequests.ts`, `src/api/discountedSlots.ts`, `src/components/RequestsInbox.tsx`, `src/components/UserProfile.tsx`, `src/components/DiscountServices.tsx`, `src/App.tsx`, `src/server/routes/clientRequests.ts`, `tests/authz-matrix.json`, `e2e/`
**Do:** the requests adapter maps `pending → accepted` to `accept` (sending `artistId` for salon-targeted requests), `→ declined` to `decline`, `→ cancelled` to `cancel` with the cancellation details; remove every `onAddDiscountedSlot(...)` call (the server creates slots) and refetch slots/requests/transactions through `collectionEvents` after those actions; `DiscountServices.onClaim` calls the claim endpoint and refetches (no local request construction). Add minimal UI buttons for the artist/manager on accepted requests whose time has passed: `تکمیل شد` and `عدم حضور`. Finally delete the Phase 1 `PATCH /api/client-requests/:id` **status** handling (keep the non-status edits for pending requests) and update the authz matrix.
**Done when:** Playwright journey: client requests → artist accepts → client cancels within 24 h (fee shown) → slot appears → another client claims → artist accepts → artist completes → manager sees one income row; a repeat of the same journey on a fresh DB passes.

### 🔴 2.19: Hiring and application acceptance as one transaction (membership)
**Depends on:** 2.03, Phase 1 tasks 1.30/1.31
**Files:** `src/server/services/hiringService.ts` (new), `src/server/routes/hiringOffers.ts`, `jobApplications.ts`, `salons.ts`, tests
**Do:** accepting an offer or an application runs in one `db.tx`: insert/activate a `salon_members` row for the salon (`contract_amount_text` = the offer amount text; `contract_type` stays NULL until the manager sets it), set `users.manager_id` to the salon owner (kept as a **derived** field: the most recently joined active salon), and keep the existing legacy `users.contract_*` mirrored while dual-write is on. `POST /api/salons/:id/members/:userId/end` (owner) sets `status='ended'`, `ended_at`, and clears `users.manager_id` if it pointed at that salon. Idempotent: accepting twice is a 409/no-op.
**Done when:** after accepting, the artist appears in the salon's staff and `GET /api/users/:id` shows `managerId`; ending membership removes it; tests cover double accept and outsiders.

### 🟡 2.20: Leave request rules on the server
**Depends on:** 2.06
**Files:** `src/server/services/leaveService.ts` (new), `src/server/routes/leaveRequests.ts`, `src/api/leaveRequests.ts`, tests
**Do:** on create, `requiresApproval` is derived from the member's `contract_type` (`حقوق ثابت` → true, status `pending`; otherwise false, status `logged`) and the client value is ignored; reject overlapping non-declined leave of the same staff (409); validate `end >= start` using `shamsiToUtcIso`; `POST /api/leave-requests/:id/approve|decline` for the salon owner only (only from `pending`). Adapter: status changes map to those actions.
**Done when:** API tests for derived approval, overlap, and unauthorized approve; Playwright: an artist with a salary contract requests leave, the manager approves.

### 🟡 2.21: Reviews tied to completed bookings
**Depends on:** 2.17
**Files:** new `src/server/db/migrations/030_reviews_booking.ts`, repositories/routes, `src/components/UserProfile.tsx` (client's "my bookings" list), `src/api/bookings.ts`, tests
**Do:** `ALTER TABLE reviews ADD COLUMN reviewer_id TEXT REFERENCES users(id); ADD COLUMN booking_id TEXT REFERENCES bookings(id); ADD COLUMN is_legacy INTEGER NOT NULL DEFAULT 0;` then `UPDATE reviews SET is_legacy = 1` and `CREATE UNIQUE INDEX ux_reviews_booking_reviewer ON reviews(booking_id, reviewer_id) WHERE booking_id IS NOT NULL`. `POST /api/bookings/:id/review` `{ rating 1–5, comment ≤ 1000 }` — only the booking's client, only when `completed`, one per booking (409 otherwise). Reviewer name/avatar for new rows come from `users` at read time (legacy rows keep their stored strings). Add a "نوبت‌های من" list with a `ثبت نظر` button for completed bookings on the client's own profile (uses `GET /api/bookings`).
**Done when:** API tests: review before completion → 403/409, twice → 409, by another client → 403; Playwright: a client reviews a completed booking and the artist's rating changes.

### 🟡 2.22: Normalize likes (`post_likes`, `comment_likes`)
**Depends on:** Phase 1 task 1.36
**Files:** new `src/server/db/migrations/031_likes.ts`, `src/server/repositories/posts.ts`, `src/server/routes/posts.ts`, tests
**Do:** `CREATE TABLE post_likes (post_id REFERENCES posts(id) ON DELETE CASCADE, user_id REFERENCES users(id) ON DELETE CASCADE, created_at NOT NULL, PRIMARY KEY (post_id, user_id))` and the same for `comment_likes`; backfill from `liked_by_json` (unknown users skipped and logged). The idempotent like endpoints write the table **and** the JSON/count columns in one `db.tx` (dual-write); reads switch to the table (`likedBy` = rows, `likesCount` = count). Add an index on `post_likes(user_id)`.
**Done when:** like counts equal row counts for every post/comment (invariant used in 2.25); liking twice stays 1.

### 🟡 2.23: Staff balances endpoint
**Depends on:** 2.07, 2.01
**Files:** `src/server/routes/salons.ts`, `src/server/services/staffBalances.ts` (new), tests
**Do:** `GET /api/salons/:id/staff-balances` (owner only) returns `EmployeeBalanceSummary[]` computed with the shared `calculateEmployeeBalance` over the salon's active members and transactions. Parity test: the endpoint output equals calling the shared function on the same fixtures. The existing client-side calculation keeps working (shared code).
**Done when:** parity test passes; non-owner → 403.

---

## D — Contract and verification

### 🟡 2.24: Stop dual-writes and add the deprecated-column gate
**Depends on:** 2.04, 2.11, 2.15, 2.19, 2.22
**Files:** new `scripts/deprecated-columns.json`, new `scripts/check-deprecated.ts`, serializers/repositories/services, `package.json`
**Do:** stop writing and reading: `users.salon_name/salon_location/salon_description` (read from `salons`), `users.contract_*` / `guarantee_*` (read from the active `salon_members` row: for the user themselves their most recent active membership, for a manager the membership in the salon they own), `users.assigned_service_ids_json`, `client_requests.cancellation_json`, `posts.liked_by_json`, `comments.liked_by_json`. `users.manager_id` stays (derived by the membership service). List the deprecated names in `deprecated-columns.json`; `check:deprecated` greps `src/server` (excluding `src/server/db/**` and migrations) and fails if any name appears. Add it to `npm run gate`.
**Done when:** the gate passes; the shape-parity test (1.21) and all journeys still pass; `grep` of the deprecated names outside migrations is empty.

### 🔴 2.25: Domain invariants script and Phase 2 gate
**Depends on:** 2.24
**Files:** new `scripts/verify-domain-invariants.ts`; `scripts/check-integrity.ts`; `package.json`
**Do:** `verifyDomainInvariants(dbPath): string[]` (also exported for tests; `db:check` runs integrity + invariants). Checks: every `accepted` request has exactly one booking (except skipped legacy rows); no overlapping confirmed non-legacy bookings per artist; every transaction's `salon_id` exists in `salons`; every `salon_members` row has a valid salon and user and at most one active row per (salon, user); every `completed` booking with a `salon_id` has exactly one income transaction; `post_likes`/`comment_likes` counts equal the stored counts; every claimed slot has `claimed_by_client_id` and exactly one request with `source_slot_id`; every cancelled request has exactly one `cancellations` row; reviews with `booking_id` belong to a completed booking of their `reviewer_id`.

**Phase 2 gate** (fresh DB **and** a copy of the `phase-1-done` DB):
- [ ] `npm run gate` passes (it now includes `check:deprecated`) and `npm run db:check` runs the invariants with no findings.
- [ ] `npm run db:verify-salons` exits 0.
- [ ] `db:snapshot` before/after: only the new tables and intended changes.
- [ ] Authz matrix and the two-salon isolation tests cover every new route.
- [ ] Playwright journeys pass: request → accept → cancel (fee) → slot → claim → accept → complete → income → review; hiring offer → accept → staff list; leave request approval.
- [ ] `grep -rn "onAddDiscountedSlot" src` is empty; `grep -rn "calculateCancellationFee" src` shows only the shared rule, the server service and tests (and re-exports).
- [ ] `docs/portability-notes.md` lists every engine-specific DDL used (partial indexes, rebuilds).
- [ ] Tag `phase-2-done`; ask the reviewer to check the repository before starting Phase 3.

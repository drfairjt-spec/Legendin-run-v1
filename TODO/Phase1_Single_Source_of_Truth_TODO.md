# Legendin — Phase 1: Single Source of Truth (TODO for free/local AI agents)

> **Read `00_Integrity_Rules_and_Roadmap.md` first** (task gate, vertical slices, expand→migrate→contract, SQL portability, agent boundaries). Same conventions as Phase 0: English task text, Farsi stays in every user-facing string, one task at a time, one commit per task named `P1-1.NN: <title>`.
> 🟢 safe/independent · 🟡 needs review before merging · 🔴 architecturally sensitive.
> **Database engine stays SQLite.** Branch: `phase-1`. Preconditions: Phase 0 gate passed and tagged `phase-0-done`.

**Goal:** after this phase the server database is the **only** place business data lives. `localStorage` keeps only the auth token (removed in Phase 3). Components keep the same props, but their data now comes from and goes to the API. All SQL lives in repositories behind a `Db` interface, so later phases (and the final PostgreSQL swap) are mechanical.

**Problems confirmed in the repo that this phase fixes:**
1. `App.tsx` keeps 10 collections in `localStorage`; almost every write never reaches the server, so two browsers see two different worlds.
2. After the first load `setAllUsers(usersRes)` replaces the rich seed users with server users that lack many `User` fields (`managerId`, `assignedServiceIds`, `socialLinks`, `workingHoursSchedule`, `jobOpenings`, `uploadedCertificates`, `isVerified`, `email`, `yearsOfExperience`, `loyalToStaffIds`, `contactAllowed`, `jobDescription`). The server shape must be a superset of `src/types.ts`.
3. `ClientRequest.cancellation` is an object in `types.ts`, but the API returns `JSON.parse(cancellation_json || '[]')` (an array).
4. A few components call the API **and** then update local state (new transaction form, leave requests). Once state is auto-synced this would write twice.
5. "VIP" is granted by a client-side click (`handleUpdateCurrentUser({ ...currentUser, isVip: true })` in `App.tsx`). It must never become a free server-side upgrade.
6. SQL sits inside route handlers, uses `datetime('now')`, and `server.ts` is a 500-line file.

---

## A — Safety net (no behaviour change)

### 🟢 1.01: `db:backup` and `db:restore`
**Files:** new `scripts/db-backup.ts`, `scripts/db-restore.ts`; `package.json`; `.gitignore`
**Do:**
- `db-backup.ts`: open the DB at `DB_PATH` and run `VACUUM INTO 'backups/legendin-<UTC timestamp>.db'`. Print path and size. Refuse to overwrite an existing file.
- `db-restore.ts <file> --yes`: refuse without `--yes`; refuse when `NODE_ENV=production` unless `--force` is also given; copy the current DB to `<DB_PATH>.pre-restore`, delete `-wal`/`-shm` files, copy the backup into place.
- Scripts `db:backup`, `db:restore`. Add `backups/` to `.gitignore`.
**Done when:** a backup opens with `DB_PATH=<backup> npm run db:check` (exit 0) and a backup→restore round trip keeps row counts of every table identical.

### 🟢 1.02: `check:portability` script (baseline mode)
**Files:** new `scripts/check-portability.ts`, `scripts/portability-baseline.json`; `package.json`
**Do:**
- Scan `server.ts` and `src/server/**/*.ts`, **excluding** `src/server/db/**` (drivers and migrations) and `src/server/seed.ts`. Report `file:line` for each match of the banned patterns in section 8 of the rules file (`datetime(`, `strftime(`, `randomblob(`, `INSERT OR REPLACE`, `INSERT OR IGNORE`, `PRAGMA`, `AUTOINCREMENT`, `rowid`, `GLOB`, `ifnull(`, `GROUP_CONCAT`, `json_extract`, `.prepare(`, `LIMIT -1`). Also scan `src/server/routes/**` and `src/server/services/**` for the words `SELECT `, `INSERT `, `UPDATE `, `DELETE FROM` (SQL outside repositories).
- Mode `--baseline` writes `scripts/portability-baseline.json` (match counts per file). Normal mode exits 1 only if a file's count **increased** versus the baseline. Run `--baseline` once now. Task 1.42 makes it strict (baseline empty).
- Script `check:portability`.
**Done when:** `npm run check:portability` exits 0 now, and exits 1 after you add `datetime('now')` to a new server file.

### 🟢 1.03: `db:snapshot` and `--diff`
**Files:** new `scripts/db-snapshot.ts`; `package.json`; `.gitignore`
**Do:** open `DB_PATH` read-only; for every table (from `sqlite_master`, excluding `sqlite_%` and `schema_migrations`) select all rows ordered by `id` (all columns if there is no `id`), normalize each row (sorted keys, JSON stable-stringified), write `snapshots/<label>/<table>.json` and `snapshots/<label>/manifest.json` = `{ table: { rows, sha256 } }`. Args: `--label <name>` (default UTC timestamp), `--diff <labelA> <labelB>` printing per table: row-count change, hash change, first 5 ids that differ. Add `snapshots/` to `.gitignore`. Script `db:snapshot`.
**Done when:** two snapshots of an unchanged DB have identical manifests; after inserting one row, `--diff` names that table.

### 🟡 1.04: Test helpers, Playwright smoke, `npm run gate`
**Depends on:** P0-28, P0-06
**Files:** new `tests/helpers.ts`; `tests/api.test.ts`; `scripts/check-integrity.ts`; new `playwright.config.ts`, `e2e/smoke.spec.ts`; `package.json`; `.github/workflows/ci.yml`; `README.md` (one line on `npx playwright install chromium`)
**Do:**
- Move the "spawn server on a temp DB / register user / authed fetch" helpers out of `tests/api.test.ts` into `tests/helpers.ts` and use them from there. Export `checkIntegrity(dbPath): string[]` from `scripts/check-integrity.ts` (the CLI keeps working) and call it at the end of `tests/api.test.ts` against the temp DB; fail on any message. Make the CLI print `no database file, skipped` and exit 0 when the file does not exist (CI case).
- `npm i -D @playwright/test`. `playwright.config.ts`: `webServer` runs `PORT=3198 DB_PATH=<tmp> UPLOAD_ROOT=<tmp> JWT_SECRET=<32+ chars> NODE_ENV=development npx tsx server.ts`, fresh temp DB each run, `reuseExistingServer: false`, chromium only.
- `e2e/smoke.spec.ts`: (1) a guest opens `/` and sees at least one post; (2) register a new artist through the UI; (3) log out; (4) log in again with the same credentials. Add `data-testid` attributes to the login/register buttons, the tab buttons and the logout button where Persian text is not stable; list them in `NOTES.md`.
- Scripts: `"e2e": "playwright test"`, `"gate": "npm run build && npm test && npm run db:check && npm run check:portability && npm run e2e"`. CI: install chromium (`npx playwright install --with-deps chromium`) and run `npm run gate` instead of the separate build/test steps.
**Done when:** `npm run gate` passes locally and in CI.

### 🟢 1.05: Inventory of every state mutation (read-only task, no code changes)
**Files:** new `docs/state-mutation-inventory.md`
**Do:** produce tables listing, for each of `setPosts`, `setAllUsers` (via `handleUpdateUsersList` and `handleUpdateCurrentUser`), `setHiringOffers`, `setClientRequests`, `setTransactions`, `setLeaveRequests`, `setJobApplications`, `setDiscountedSlots`, `setColleagueMessages`: every call site in `src/**/*.tsx` with columns **file · line · handler/function · operation (create / update fields X / delete / replace-all) · UI action that triggers it · does it also call `fetch`?** Add a table of all `localStorage` keys (`legendin_*`) and who reads/writes them, and a list of every `alert(`/`confirm(` that reports an API failure. Start the file with the counts you found (`grep -c "onUpdate\|onAdd" src/components/*.tsx`).
**Done when:** every `legendin_*` key and every call site from the grep appears in the document. Later tasks use this file as their acceptance list.

---

## B — Foundations

### 🔴 1.06: `Db` interface and SQLite driver with serialized transactions
**Depends on:** P0-05
**Files:** new `src/server/db/index.ts`, `src/server/db/sqlite.ts`; `src/server/db.ts`; new `tests/db.test.ts`
**Do:**
- Define in `src/server/db/index.ts`:
  ```ts
  export type Row = Record<string, unknown>;
  export interface Db {
    readonly dialect: 'sqlite' | 'postgres';
    all<T = Row>(sql: string, params?: unknown[]): Promise<T[]>;
    get<T = Row>(sql: string, params?: unknown[]): Promise<T | undefined>;
    run(sql: string, params?: unknown[]): Promise<{ changes: number }>;
    tx<T>(fn: (tx: Db) => Promise<T>): Promise<T>;
  }
  ```
  Positional `?` parameters only. Export the default `db: Db` from this file.
- `sqlite.ts`: `createSqliteDb(path)` wraps `better-sqlite3` (same pragmas as today, plus `busy_timeout = 5000`). **A single SQLite connection is shared by concurrent requests, so transactions must be serialized:** keep a module-level async mutex. Root-level `all/get/run` take the mutex for the duration of one statement. `tx(fn)` takes the mutex, runs `BEGIN IMMEDIATE`, calls `fn(txDb)` (where `txDb` executes statements directly, without taking the mutex), then `COMMIT`; on throw/rejection `ROLLBACK` and rethrow; always release the mutex. A nested `tx` on `txDb` simply calls `fn(txDb)`.
- Keep `src/server/db.ts` exporting the raw better-sqlite3 handle as `db` (old code keeps working) **and** as `sqliteRaw`; all new code imports the `Db` from `./db/index`. The raw export disappears in task 1.19.
- Tests (`tests/db.test.ts`): (a) inside a `tx`, insert row A, `await` 50 ms, then throw → A must not exist, while a root-level insert of row B started 10 ms after the tx began must exist afterwards and must not have been rolled back; (b) two concurrent `tx` calls each incrementing a counter row 100 times end at 200.
**Done when:** the tests pass and the Task Gate is green.

### 🟡 1.07: Migrations folder, baseline, checksums, table-rebuild support
**Depends on:** 1.06
**Files:** new `src/server/db/migrations/index.ts`, `000_baseline.ts`, `001_users_password_hash.ts`, `002_users_vip_flags.ts`, `003_repair_null_ids.ts` (moved from `src/server/migrations.ts`), new `src/server/db/migrate.ts`; `src/server/db.ts`; delete `src/server/schema.sql` and `src/server/migrations.ts`; `server.ts`; `scripts/*` that import the db
**Do:**
- `type Migration = { name: string; up(db: Db): Promise<void>; rebuild?: boolean }`. `index.ts` exports the ordered array.
- `000_baseline.ts`: the **entire DDL currently in `schema.sql`** (including the NOT NULL ids from P0-05) as a string, executed statement by statement (`CREATE ... IF NOT EXISTS`, so it is a no-op on existing databases). Convert `001`–`003` to the `Db` API (`db.all('PRAGMA table_info(users)')` etc.; PRAGMA is allowed inside migrations).
- `runMigrations(db)`: ensure `schema_migrations(name TEXT PRIMARY KEY NOT NULL, checksum TEXT NOT NULL, applied_at TEXT NOT NULL)` (if the P0-05 table lacks `checksum`, add it and backfill the checksum of the already-applied names with the current one). Checksum = sha256 of `up.toString()`. For each migration: already applied → compare checksum, **mismatch → throw** `Migration <name> was modified after being applied`; not applied → run inside `db.tx`, then insert the row.
- `rebuild: true` migrations run **outside** the normal tx because `PRAGMA foreign_keys` is ignored inside a transaction: `PRAGMA foreign_keys=OFF` → `BEGIN` → `up` → `PRAGMA foreign_key_check` must return no rows (otherwise `ROLLBACK` and throw) → `COMMIT` → `PRAGMA foreign_keys=ON`. Document the SQLite rebuild recipe in a comment: create `x_new`, copy rows, drop old table, rename `x_new` to `x`, recreate indexes.
- Startup: `server.ts` calls `await runMigrations(db)` before `listen` (via an exported `initDb()`).
- **From now on: never edit `000`–`003` or any applied migration; every schema change is a new `NNN_name.ts` file** (Phase 1 uses 004–019).
**Done when:** a fresh DB applies every migration once and a restart applies none; editing the body of `003` makes startup fail with that message; a copy of a Phase-0 DB upgrades without data loss (`db:snapshot` row counts equal); `grep -rn "schema.sql" src server.ts` is empty (production no longer needs the `src/` folder at runtime).

### 🟡 1.08: Shared folder and single set of types
**Depends on:** 1.07
**Files:** `src/shared/types.ts` (moved), `src/types.ts`, `src/server/types.ts`, new `src/server/repositories/rows.ts`, `tsconfig.json`, `vite.config.ts`
**Do:** `git mv src/types.ts src/shared/types.ts` and create `src/types.ts` containing only `export * from './shared/types';` (so none of the ~40 imports change). Add the alias `@shared` → `src/shared` in `tsconfig.json` `paths` and `vite.config.ts` `resolve.alias`; server code imports with relative paths. Compare `src/server/types.ts` with the shared types: where an entity is defined twice, delete the server copy and import the shared one; DB-row-only shapes go to `src/server/repositories/rows.ts` as `*Row` types. Do not change any field.
**Done when:** `npm run build` passes, `npm run lint` reports no more errors than before, and `grep -rn "interface Transaction" src` finds exactly one definition.

### 🟡 1.09: Zod validation middleware
**Depends on:** 1.08
**Files:** `package.json`, new `src/shared/schemas.ts`, new `src/server/middleware/validate.ts`, `src/server/routes/auth.ts`, tests
**Do:** `npm i zod`. `validate(schema, source = 'body')` parses the request part; on failure responds 400 `{ error: 'داده‌های ارسالی نامعتبر است.', fields: { '<path>': '<Persian message>' } }`; on success replaces `req[source]` with the parsed (unknown keys stripped) value. In `schemas.ts` define `idSchema = z.string().min(1).max(64).regex(/^[A-Za-z0-9_-]+$/)` (seed ids like `m1`, `a2`, `guest` must stay valid), `registerSchema`, `loginSchema` reproducing the rules and Persian messages of `auth.ts` + P0-08 (phone normalized with the existing `normalizePhone` via `.transform`, password 8–128). Apply to `/register` and `/login`.
**Done when:** register without `name` → 400 with `fields.name`; all existing auth tests pass unchanged.

### 🟡 1.10: Clock, ids, and ISO timestamps
**Depends on:** 1.07
**Files:** new `src/server/util/clock.ts`, `src/server/util/ids.ts`, `src/server/db/migrations/004_normalize_timestamps.ts`, tests
**Do:**
- `nowIso()` returns `new Date().toISOString()`; add `setClock(fn)` for tests only. `newId(prefix)` returns `${prefix}-${randomUUID()}`; `isValidClientId(prefix, id)` checks `^<prefix>-<uuid v4>$`.
- Migration `004`: for `users, reviews, posts, comments, client_requests, hiring_offers, job_applications, discounted_slots, transactions, colleague_messages, message_replies` run `UPDATE <t> SET created_at = replace(created_at,' ','T') || 'Z' WHERE created_at GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9] [0-9][0-9]:[0-9][0-9]:[0-9][0-9]'` (GLOB is allowed inside migrations). Values in other formats (Shamsi strings from the seed) stay untouched.
- From now on every INSERT passes `created_at = nowIso()` explicitly (done inside each repository task; never rely on the column default).
**Done when:** unit tests for `nowIso` (with `setClock`) and `isValidClientId`; after the migration no row created by the old default contains a space in `created_at`.

### 🟢 1.11: Display-date helper
**Depends on:** 1.08
**Files:** new `src/shared/time.ts` (+ test), and the components that **render** `createdAt`/`date`/`cancelledAt` (find them with `grep -rn "createdAt\|cancelledAt" src/components src/App.tsx`; list them in `NOTES.md`)
**Do:** `toDisplayDate(value?: string): string` — an ISO value (contains `T`/`Z`) is converted to Shamsi `YYYY/MM/DD` using the fixed offset `+03:30` and the existing converters in `src/utils/shamsi.ts`; a value that already looks like `YYYY/MM/DD` (Latin or Persian digits) or any other text is returned unchanged; empty → `''`. Add `toDisplayDateTime`. Use it at every place that prints those fields. Never change stored values.
**Done when:** unit tests pass, including `2026-10-16T20:30:00Z` → `1405/07/25` (verify with the existing util), `1405/04/10` unchanged, `undefined` → `''`.

---

## C — Repositories and routers (behaviour-identical extraction)

> Template for tasks 1.12 – 1.19: move SQL into `src/server/repositories/<name>.ts` (async methods using `Db`, ISO `created_at` from `nowIso()`, ids from `newId`), move handlers into `src/server/routes/<name>.ts`, mount in `server.ts` under the **same paths**, keep every request/response shape and status code, and keep all existing tests passing **unchanged**. Add repository tests against a temp DB. Routes contain no SQL.

### 🟡 1.12: Users, portfolio, reviews
**Depends on:** 1.06, 1.09
**Files:** new `src/server/repositories/users.ts`, `src/server/serializers/user.ts`, `src/server/routes/users.ts`; edit `src/server/routes/auth.ts`, `server.ts`
**Do:** methods `listUsers()`, `getUserById(id)`, `getUserByPhone(phone)`, `createUser(row)`, `listPortfolioByUserIds(ids)`, `listReviewsByUserIds(ids)` (two queries, no N+1). `formatUserResponse` and `formatPublicUser` (P0-09) move to `serializers/user.ts`. `auth.ts` register/login/me use the repository. Mount `app.use('/api/users', usersRouter)`.
**Done when:** `grep -n "prepare(\|SELECT " src/server/routes/users.ts src/server/routes/auth.ts` is empty; all tests pass.

### 🟡 1.13: Posts and comments
**Depends on:** 1.06
**Files:** new `src/server/repositories/posts.ts`, `src/server/routes/posts.ts`; `server.ts`
**Do:** `listPosts({ limit, before })`, `getPostById`, `createPost`, `listCommentsByPostIds(ids)`. Keep the P0-13 pagination and validation. Like/comment endpoints come later (1.36).
**Done when:** no SQL in the router; tests pass.

### 🟡 1.14: Client requests
**Depends on:** 1.06
**Files:** new `src/server/repositories/clientRequests.ts`, `src/server/serializers/clientRequest.ts`, `src/server/routes/clientRequests.ts`; `server.ts`
**Do:** `listForUser(user)` (scoping from P0-10), `getById`, `create`. The serializer fixes problem 3: `cancellation` is `undefined` for `null`/`[]`, the **last element** if the stored JSON is an array, or the object itself. New writes store one JSON object (or NULL). Add a test with the three stored forms.
**Done when:** the three forms serialize correctly; tests pass.

### 🟡 1.15: Hiring offers and job applications
**Files:** new `src/server/repositories/hiring.ts`, `src/server/routes/hiringOffers.ts`, `src/server/routes/jobApplications.ts`; `server.ts`
**Do:** `listOffersForUser`, `createOffer`, `getOfferById`, `listApplicationsForUser`, `createApplication`; scoping rules exactly as in P0-11.
**Done when:** no SQL in routers; tests pass.

### 🟡 1.16: Discounted slots, discounts, services, reviews list
**Files:** new `src/server/repositories/slots.ts`, `discounts.ts`, `services.ts`, and a `reviews` list method in `users.ts`; routers `discountedSlots.ts`, `discounts.ts`, `services.ts`, `reviews.ts`; `server.ts`
**Do:** move the P0-12 behaviour (public available slots, scoped writes) as is; `GET /api/services` and `GET /api/reviews` unchanged.
**Done when:** tests pass; no SQL in routers.

### 🟡 1.17: Leave requests and colleague messages
**Files:** new `src/server/repositories/leave.ts`, `messages.ts`; routers `leaveRequests.ts`, `colleagueMessages.ts`; `server.ts`
**Do:** keep P0-14 ownership rules and P0-15 scoping (including replies grouped by message).
**Done when:** tests pass; no SQL in routers.

### 🟡 1.18: Transactions (finance)
**Files:** new `src/server/repositories/transactions.ts`; edit `src/server/routes/finance.ts`
**Do:** `listForUser(user)`, `getById`, `create(row)`, `delete(id)`, `sumByDirection({ salonId?, staffId? })`. Keep all P0-16 rules and the summary numbers.
**Done when:** tests pass (including the two-manager isolation test); no SQL in `finance.ts`.

### 🔴 1.19: `createApp()`, bootstrap-only `server.ts`, remove the raw db export
**Depends on:** 1.12 – 1.18
**Files:** new `src/server/app.ts`, `src/server/routes/chat.ts`, `src/server/routes/upload.ts`, `src/server/services/gemini.ts`; `server.ts`; `src/server/seed.ts`; `src/server/db.ts`; `scripts/*`
**Do:** `createApp()` builds and returns the Express app (helmet, limiters, body limit, routers, 404, error handler) **without listening**. `server.ts` only: load env, `initDb()`, `seedDatabase()` (dev only), serve static/Vite, `listen`, graceful shutdown (P0-23). Chat and upload move to their routers; the Gemini client to `services/gemini.ts`. Convert `seed.ts` and the scripts to the `Db` API (`await db.run(...)`). Remove the raw better-sqlite3 export from `src/server/db.ts`.
**Done when:** `wc -l server.ts` is under 80; `grep -rn "prepare(" src server.ts scripts | grep -v "src/server/db"` is empty; the whole gate passes.

---

## D — User model completeness (expand only)

### 🟡 1.20: Expand `users` with the missing profile fields
**Depends on:** 1.07
**Files:** new `src/server/db/migrations/005_users_profile_fields.ts`
**Do:** one migration:
```sql
ALTER TABLE users ADD COLUMN email TEXT;
ALTER TABLE users ADD COLUMN years_of_experience INTEGER;
ALTER TABLE users ADD COLUMN is_verified INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN contact_allowed INTEGER NOT NULL DEFAULT 1;
ALTER TABLE users ADD COLUMN manager_id TEXT REFERENCES users(id);
ALTER TABLE users ADD COLUMN job_description TEXT;
ALTER TABLE users ADD COLUMN social_links_json TEXT;
ALTER TABLE users ADD COLUMN working_hours_json TEXT;
ALTER TABLE users ADD COLUMN job_openings_json TEXT;
ALTER TABLE users ADD COLUMN uploaded_certificates_json TEXT;
ALTER TABLE users ADD COLUMN assigned_service_ids_json TEXT;
ALTER TABLE users ADD COLUMN loyal_to_staff_ids_json TEXT;
CREATE INDEX idx_users_manager ON users(manager_id);
CREATE INDEX idx_users_role_city ON users(role, city);
```
Note in `NOTES.md`: the existing columns `isVip` and `isLoyalClient` are camelCase (from the old `db.ts` migration); leave them, repositories map them; the PostgreSQL baseline in Phase 7 renames them to snake_case.
**Done when:** the migration applies on fresh and upgraded DBs; nothing else changes.

### 🟡 1.21: Seed persists every field + shape-parity test
**Depends on:** 1.20, 1.19
**Files:** `src/server/seed.ts`; new `tests/user-shape.test.ts`
**Do:** make the seed insert every field of every `seedUsers` entry in `src/data.ts` (the new columns, `managerId`, services assignment, social links, working hours, job openings, certificates, loyalty lists), insert users that have no `managerId` first so the foreign key holds, and persist `seedServices`, `seedPosts` (with comments and likes). Test: for each seed user fetch `GET /api/users/:id` with a manager token and compare to the seed object for every key of the `User` type; exclusions (password hash, computed `rating`, ids of generated rows) are listed in the test with a comment.
**Done when:** the shape test passes for all seed users.

### 🟡 1.22: Serializers return the full `User` shape
**Depends on:** 1.21
**Files:** `src/server/serializers/user.ts`; tests
**Do:** `formatUserResponse` returns all `User` fields (`email`, `yearsOfExperience`, `isVerified`, `contactAllowed`, `managerId`, `jobDescription`, `socialLinks`, `workingHoursSchedule`, `jobOpenings`, `uploadedCertificates`, `assignedServiceIds`, `loyalToStaffIds`, `isVip`, `isLoyalClient`, `rating` = average of reviews rounded to 1 decimal, `undefined` when there are none). `formatPublicUser` returns the same minus `phone`, `contract`, `resumeText`, `email`, `loyalToStaffIds`. Booleans are mapped in the serializer; JSON parse errors fall back to `[]`/`{}` instead of throwing.
**Done when:** the shape-parity test passes and the P0-09 "no phone in public list" test still passes.

### 🟡 1.23: `PUT /api/users/:id` (self-edit with a whitelist)
**Depends on:** 1.22, 1.09
**Files:** `src/shared/schemas.ts` (`updateProfileSchema`), `src/server/routes/users.ts`, `src/server/repositories/users.ts`; tests
**Do:** `authenticateToken`; only `req.user.id === :id` (else 403). Editable fields: `name, avatar, coverImage, title, city, bio, resumeText, email, yearsOfExperience, skills, certifications, portfolio, salonName, salonLocation, salonDescription, jobDescription, jobOpenings, workingHoursSchedule, socialLinks, openForHiring, acceptingRequests, contactAllowed, uploadedCertificates`. Size limits (e.g. bio ≤ 2000, skills ≤ 50 items, portfolio ≤ 60). Unknown keys are **stripped silently** (the client sends whole objects) and **never applied**: `role`, `phone`, `password`, `passwordHash`, `isVip`, `isLoyalClient`, `isVerified`, `managerId`, `contract`, `rating`, `reviews`, `loyalToStaffIds`, `assignedServiceIds`. `portfolio` is replaced inside one `db.tx` (client ids kept, missing ids generated). In `uploadedCertificates` new items get `status: 'pending'` and existing items keep the server-side status. Response: the full user.
**Done when:** a request body containing `role: "manager"`, `isVip: true`, `isVerified: true`, `phone: "..."` changes nothing in the DB (test); editing own bio works; editing another user → 403.

### 🟡 1.24: Staff contract/services PATCH and loyalty endpoints
**Depends on:** 1.23
**Files:** `src/server/routes/users.ts`, `src/server/repositories/users.ts`, `src/shared/schemas.ts`; tests
**Do:**
- `PATCH /api/users/:id/staff` — caller must be a `manager` and `target.manager_id === caller.id` (else 403). Body `{ contract?: StaffContract | null, assignedServiceIds?: string[] }`; service ids must exist in `services`; contract fields map to the existing `contract_*` / `guarantee_*` columns.
- `POST /api/users/:id/loyalty` and `DELETE /api/users/:id/loyalty` — caller must be an `artist` or `manager` who has at least one request with that client (`client_id = :id AND target_id = caller.id`). POST adds the caller id to `loyal_to_staff_ids_json` and sets `isLoyalClient = 1`; DELETE removes it, and sets `isLoyalClient = 0` when the list becomes empty.
**Done when:** tests cover success, a manager editing someone else's staff → 403, a loyalty mark without any request → 403.

---

## E — Client data layer

### 🟡 1.25: Typed API client
**Depends on:** P0-24
**Files:** new `src/api/client.ts` (+ unit test)
**Do:** `ApiError { status, message, fields? }`; `api.get/post/put/patch/delete<T>(path, body?)` built on `authFetch` (P0-24): parses JSON, handles 204, maps a network failure to `ApiError(0, 'ارتباط با سرور برقرار نشد.')`, maps `{ error }` bodies to `ApiError.message`. No component imports `fetch` directly after the entity tasks.
**Done when:** unit tests with a mocked `fetch` cover 200, 204, 400 with `fields`, 500, and network failure.

### 🔴 1.26: `useServerCollection` (core, not wired yet)
**Depends on:** 1.25
**Files:** new `src/hooks/collectionOps.ts` (pure functions), `src/hooks/useServerCollection.ts`, `src/hooks/collectionEvents.ts`, `tests/collectionOps.test.ts`
**Do:**
- Pure: `diffById(prev, next, isEqual)` → `{ created, updated, removed }`; `OpQueue` (runs async ops strictly in order; when one fails it drops the rest of that batch and calls `onFail`).
- Hook signature:
  ```ts
  useServerCollection<T extends { id: string }>(opts: {
    key: string;
    enabled: boolean;                       // false when logged out → state is []
    list: () => Promise<T[]>;
    reconcile: (prev: T[], next: T[]) => Op<T>[];   // maps an array change to API operations
    apply: (op: Op<T>) => Promise<T | void>;        // executes one operation
    refetchOnFocus?: boolean;
  }): readonly [T[], Dispatch<SetStateAction<T[]>>, { loading: boolean; error: ApiError | null; refetch(): Promise<void>; upsertLocal(item: T): void; removeLocal(id: string): void }]
  ```
  The returned setter has **exactly the same signature as `useState`'s setter** (value or updater function) so components do not change. It applies the change optimistically, queues the operations, and on failure shows a toast (task 1.40) and `refetch()`es to restore the server truth. A create answered with **409** is treated as "already exists" → `refetch()` (this protects against legacy double writes). `upsertLocal/removeLocal` change local state **without** creating operations (for components that already wrote through the API). `collectionEvents.ts` is a tiny emitter (`emit('users')`, `on('users', cb)`) so one collection can ask another to refetch.
**Done when:** unit tests cover diff (create/update/delete/no-op), queue order, failure drops the rest, and 409-as-success logic (with the apply function mocked).

### 🟡 1.27: Create endpoints accept a client-generated id (idempotent creates)
**Depends on:** 1.10
**Files:** `src/shared/schemas.ts`, `src/shared/ids.ts` (new, `newClientId(prefix)` using `uuid` v4), all create routers
**Do:** for `POST` of client requests (`req`), hiring offers (`offer`), job applications (`app`), discounted slots (`slot`), leave requests (`leave`), transactions (`tx`), posts (`post`), comments (`cmt`), messages (`msg`), replies (`rep`): an optional `id` in the body is validated with `isValidClientId(prefix, id)`; if given and it already exists → **409** `{ error: 'این مورد قبلاً ثبت شده است.' }`; if given and free → use it; if absent → `newId(prefix)`. Ownership checks still apply (a user cannot create a row for someone else just by choosing an id).
**Done when:** for each endpoint the same id posted twice returns 201 then 409; an invalid id format → 400.

### 🟡 1.28: Expand the remaining tables that lack `types.ts` fields
**Depends on:** 1.07
**Files:** new `src/server/db/migrations/006_missing_entity_fields.ts`
**Do:**
```sql
ALTER TABLE job_applications ADD COLUMN position_title TEXT;
ALTER TABLE job_applications ADD COLUMN resume_summary TEXT;
ALTER TABLE job_applications ADD COLUMN resume_file_url TEXT;
ALTER TABLE job_applications ADD COLUMN resume_file_name TEXT;
ALTER TABLE job_applications ADD COLUMN resume_file_size TEXT;
ALTER TABLE colleague_messages ADD COLUMN subject TEXT;
ALTER TABLE colleague_messages ADD COLUMN is_read INTEGER NOT NULL DEFAULT 0;
ALTER TABLE comments ADD COLUMN likes_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE comments ADD COLUMN liked_by_json TEXT;
CREATE INDEX idx_requests_status ON client_requests(status);
CREATE INDEX idx_messages_recipient ON colleague_messages(recipient_id);
CREATE INDEX idx_comments_post ON comments(post_id);
```
Update `seed.ts` so seeded messages/applications/comments carry these fields. Note in `NOTES.md`: `senderSalonName`/`receiverSalonName` of `ColleagueMessage` are derived at read time (the user's `salon_name`, falling back to their manager's `salon_name`).
**Done when:** the migration applies on fresh and upgraded DBs; the gate is green.

---

## F — Move each collection from `localStorage` to the server

> **Template for tasks 1.29 – 1.37** (do them one by one, in this order). For each entity:
> 1. Use `docs/state-mutation-inventory.md` (1.05) rows for this entity as the **acceptance list**: every row must keep working.
> 2. Add the missing endpoints to the repository/router with Phase-0 authorization and Zod validation (+ tests: success, 401, 403, 404, validation, ownership).
> 3. Add `src/api/<entity>.ts` (typed calls) and an adapter (`reconcile` + `apply`) next to it.
> 4. In `App.tsx` replace `useState(() => safeLoadArray(...))` for this entity with `useServerCollection(...)`. Delete that entity's `localStorage` `useEffect` and key. **Do not change the props passed to components.**
> 5. If a component already calls the API and then also updates state for this entity, remove one of the two writes (use `upsertLocal`/`refetch`). A collection is written either through the hook setter **or** through explicit API calls + `refetch`, never both.
> 6. Add one Playwright flow for the entity (two browser contexts when two roles are involved) and run the Task Gate.

### 🔴 1.29: Client requests
**Depends on:** 1.14, 1.26, 1.27
**Files:** `src/shared/rules/cancellation.ts` (new; `src/utils/cancellationPolicy.ts` re-exports it), `src/server/routes/clientRequests.ts`, `src/api/clientRequests.ts`, `src/App.tsx`, `tests`
**Do:**
- First move `calculateCancellationFee` into `src/shared/rules/cancellation.ts`, add a `now: Date = new Date()` parameter and compute the booking instant with the **fixed +03:30 offset** (`Date.UTC(gy, gm - 1, gd, h, m) - 3.5 h`) instead of `new Date(gy, gm - 1, gd, h, m)` (that uses the server timezone and would be wrong on a UTC server). Unit tests with fixed clocks: 23 h before → fee 30 %, 25 h before → no fee, past booking → fee.
- `PATCH /api/client-requests/:id`: the **target** (artist/manager) may set `status` `pending → accepted | declined`; the **client** may set `status = 'cancelled'` from `pending | accepted` together with a `cancellation` object, and may edit `note`, `preferredDate`, `preferredTime` only while `pending`. On cancellation the server **recomputes** `feeApplied` and `feeAmount` with the shared rule and ignores the client's values. Any other transition → 409.
- Adapter: a changed item → `PATCH` with only the changed fields. Creates → `POST` with the client id.
**Done when:** Playwright: a client creates a request, an artist (second context) sees it after a refetch, accepts it, the client sees `accepted`; reload keeps everything; a tampered `feeAmount: 0` in a cancellation PATCH is ignored (API test).

### 🔴 1.30: Hiring offers
**Depends on:** 1.15, 1.26, 1.27, 1.24
**Files:** `src/server/routes/hiringOffers.ts`, `src/api/hiringOffers.ts`, `src/App.tsx`, `tests`
**Do:** `PATCH /api/hiring-offers/:id` — the offer's **artist** may set `pending → accepted | declined`; `DELETE` — the offering manager may delete while `pending`. On `accepted`, inside `db.tx`: set the artist's `manager_id` to the offer's manager. **Look in the inventory at what the UI currently does to `allUsers` when an offer is accepted** (contract, `openForHiring`, `managerId` …) and move exactly that mutation into this transaction; remove it from the UI (the `users` collection is refetched through `collectionEvents` after the PATCH).
**Done when:** Playwright: manager sends an offer, the artist accepts, the artist's profile shows the manager link after reload; a different artist cannot accept (403).

### 🟡 1.31: Job applications
**Depends on:** 1.28, 1.26, 1.27
**Files:** `src/server/routes/jobApplications.ts`, `src/api/jobApplications.ts`, `src/App.tsx`, `tests`
**Do:** `POST` by an `artist` or `service-staff` (applicant = caller; `salon_id` must be a manager) with the new resume fields; `PATCH` status by the salon's manager (`pending → accepted | declined`); on `accepted` apply the same effect as 1.30 (replicating what the UI did, per the inventory). The applicant's name/phone in responses come from a join (phone only visible to the salon manager).
**Done when:** Playwright: an artist applies, the manager accepts, the link appears; tests include 403s.

### 🟡 1.32: Discounted slots
**Depends on:** 1.16, 1.26, 1.27
**Files:** `src/shared/rules/discount.ts` (new; `src/utils/discountPolicy.ts` re-exports), `src/server/routes/discountedSlots.ts`, `src/api/discountedSlots.ts`, `src/App.tsx`, `tests`
**Do:** `PATCH /api/discounted-slots/:id`: a `client` may claim → `UPDATE ... SET status='claimed', claimed_by_client_id=? WHERE id=? AND status='available'`, zero changes → **409** (atomic, no double claim); the owner artist/manager may set `expired`. On create, the server **recomputes** `discountedPrice` from `originalPrice` and `discountPercent` (shared rule) and takes `appCommissionPercent` from the constant (ignore client values); `discountPercent` must be within the range the UI offers (read it from the inventory/components). Creating the slot on a cancellation stays a client-triggered `POST` until Phase 2 moves it server-side.
**Done when:** two clients claiming the same slot concurrently: exactly one gets 200, the other 409 (API test); Playwright claim flow works.

### 🟡 1.33: Leave requests
**Depends on:** P0-14, 1.26, 1.27
**Files:** `src/components/RequestsInbox.tsx` (remove the direct `fetch` calls near the old lines 301 and 388), `src/api/leaveRequests.ts`, `src/App.tsx`, `tests`
**Do:** follow the template; the server rules from P0-14 stay. The component now only calls `onUpdateLeaveRequests`; the hook performs the create/update/delete.
**Done when:** no `fetch(` left in `RequestsInbox.tsx`; Playwright: an artist logs a leave, it survives reload; another artist cannot delete it.

### 🟡 1.34: Transactions
**Depends on:** 1.18, 1.26, 1.27
**Files:** `src/components/AddTransactionForm.tsx`, `src/components/StaffManagement.tsx`, `src/api/transactions.ts`, `src/App.tsx`, `tests`
**Do:** template. `AddTransactionForm` stops calling `fetch` itself: it builds the item with `newClientId('tx')` and calls `onSubmit`; the hook persists it and errors surface as toasts. If the form needs to wait for the server (to close only on success), expose `create(item)` from the hook and use it. Salary payments built in `StaffManagement.tsx` go through the same path. Transactions are **immutable**: the adapter turns an "update" into a console warning and a toast, never a request. Only managers delete (existing rule).
**Done when:** Playwright: a manager adds a cost and a salary payment, reload keeps both; no duplicate rows (count rows in the API test); a second manager does not see them.

### 🟡 1.35: Colleague messages
**Depends on:** 1.28, 1.17, 1.26, 1.27
**Files:** `src/server/routes/colleagueMessages.ts`, `src/api/colleagueMessages.ts`, `src/App.tsx`, `tests`
**Do:** `GET` returns `ColleagueMessage[]` exactly as typed (`receiverId`, names, `subject`, `body`, `isRead`, `replies[]` with `senderName`/`body`); `POST /api/colleague-messages` (sender = caller, not a `client`, receiver exists and is not the caller, max 30 per hour); `POST /api/colleague-messages/:id/replies` (sender or receiver only); `PATCH /api/colleague-messages/:id` `{ isRead: true }` (receiver only). Adapter: a new message → POST; a longer `replies` array → POST reply for each new reply; `isRead` false→true → PATCH.
**Done when:** Playwright: artist A messages manager B, B sees it unread after a refetch, replies, A sees the reply; user C sees nothing.

### 🔴 1.36: Posts, comments and likes
**Depends on:** 1.13, 1.28, 1.26, 1.27
**Files:** `src/server/routes/posts.ts`, `src/server/repositories/posts.ts`, `src/api/posts.ts`, `src/App.tsx`, `tests`
**Do:** endpoints: `POST /api/posts` (exists), `DELETE /api/posts/:id` (author only), `PUT /api/posts/:id/like` and `DELETE /api/posts/:id/like` (idempotent: add/remove the caller in `liked_by_json` and recompute `likes_count` in one `db.tx`), `POST /api/posts/:id/comments` (content ≤ 1000), `DELETE /api/posts/:id/comments/:commentId` (comment author only), `PUT/DELETE /api/posts/:postId/comments/:commentId/like` (same idempotent pattern). The adapter inspects nested changes of a post: new id in `likedBy` that equals the caller → PUT like; removed → DELETE like; new comment → POST; removed comment → DELETE; new post → POST; removed post → DELETE; every other field change is ignored. Load the first 100 posts for now (`?limit=100`); infinite scroll comes in Phase 4.
**Done when:** Playwright: user A posts, user B likes and comments, A sees both after a refetch; liking twice does not double count (API test).

### 🔴 1.37: Users collection and current-user identity
**Depends on:** 1.23, 1.24, 1.26, 1.30, 1.31
**Files:** `src/App.tsx`, `src/components/AuthPage.tsx`, `src/utils/auth.ts`, `src/api/users.ts`, `tests`
**Do:**
- Adapter for users: an updated user where `id === currentUser.id` → `PUT /api/users/:id` with a whitelisted DTO built by `pickProfileDto(user)` (the same field list as 1.23); an updated staff user changed by a manager → `PATCH /api/users/:id/staff` with `contract`/`assignedServiceIds` only; any other change is ignored with a console warning (never sent). Creates and deletes are ignored (registration goes through `/api/auth/*`).
- On start, `currentUser` comes from `getCurrentUserApi()` (`/api/auth/me`); delete the `legendin_logged_in_user_id` and `legendin_users` keys and `USER_ID_KEY` in `src/utils/auth.ts`. After `loginApi`/`registerApi` succeed: refetch users and set `currentUser` from the response. `AuthPage.tsx`'s `onRegisterSuccess(updatedUsersList, loggedInUser)` no longer builds a local list; adapt its call site in `App.tsx`.
- Guests still see the public users list (no phones); the list is refetched on login/logout.
**Done when:** Playwright: an artist edits bio, skills and portfolio, reloads, and sees the changes; a second browser sees the public part; tampering the `role` in the DevTools state does not change anything on the server (API test already covers the body case).

---

## G — Cleanup and guards

### 🟢 1.38: Remove demo fallbacks and leftover local storage
**Depends on:** 1.29 – 1.37
**Files:** `src/App.tsx`, `src/utils/auth.ts`, `server.ts` or `src/server/routes/dev.ts` (new)
**Do:** delete `safeLoadArray`, every demo fallback array (the `[...]` defaults passed to the old `useState(safeLoadArray(...))`, including those with `salonId: "salon-1"`), and all `legendin_*` keys except the auth token key. `handleResetData` (near line 376): if the UI has a reset button, replace it with `POST /api/dev/reset` that exists **only** when `NODE_ENV !== 'production'` and `DEMO_MODE=true` and calls `seedDatabase(true)`; otherwise delete the handler. Demo content now exists only in `seed.ts`.
**Done when:** `grep -rn "legendin_" src` shows only the token key; `grep -rn "salon-1" src server.ts` is empty; `grep -rn "safeLoadArray" src` is empty; the app works for all four roles from a fresh seed.

### 🟡 1.39: VIP and loyalty must not be free
**Depends on:** 1.23, 1.38
**Files:** `src/App.tsx` (the three paywall buttons that call `handleUpdateCurrentUser({ ...currentUser, isVip: true })`), `src/routes/dev.ts`, `.env.example`
**Do:** add `POST /api/dev/upgrade-vip` (sets the caller's `isVip = 1`) that exists only when `NODE_ENV !== 'production'` **and** `DEMO_MODE=true`. In the UI the three buttons call it only when `import.meta.env.VITE_DEMO_MODE === 'true'`; otherwise the button is disabled and shows `پرداخت آنلاین به‌زودی فعال می‌شود.` and no alert is shown. Add `DEMO_MODE` and `VITE_DEMO_MODE` to `.env.example` (default `false`). Real purchases arrive in Phase 6.
**Done when:** in a production-like run (`DEMO_MODE` unset) a logged-in client cannot become VIP by any request (API test: PUT with `isVip: true`, and the dev route returns 404).

### 🟡 1.40: Errors, loading and refresh UX
**Depends on:** 1.26
**Files:** new `src/components/ToastHost.tsx`, `src/hooks/useToast.ts`; `src/App.tsx`; components that currently `alert()` on API failures (list in the inventory)
**Do:** a minimal toast system (Persian text, auto-dismiss 5 s, `role="status"`/`aria-live="polite"`); `useServerCollection` failures show `ApiError.message`; first-load spinner/skeleton in the app shell while the core collections load; replace the `alert()` calls that report API failures with toasts (leave confirmation dialogs for now); refetch requests, messages and slots on window focus and `visibilitychange` (debounced 30 s); an offline banner when `navigator.onLine` is false.
**Done when:** with the server stopped, an action shows a Persian toast instead of failing silently; with it running, switching tabs back refreshes the inbox.

### 🔴 1.41: Authorization matrix test
**Depends on:** 1.19
**Files:** new `tests/authz-matrix.test.ts`, `tests/authz-matrix.json`
**Do:** the test builds the app with `createApp()`, enumerates every route (`METHOD path`, walking the Express router stack), and compares with `authz-matrix.json`: `{ "GET /api/users": { "guest": "allow", "client": "allow", "artist": "allow", "manager": "allow", "otherManager": "allow" }, ... }`. `allow` means the response status is **not** 401/403; `deny` means 401 or 403 (requests may use dummy ids and minimal bodies; 400/404 count as `allow`). The test fails if a route is missing from the matrix or any persona's result differs. Personas are created through the helpers.
**Done when:** every route from Phase 0 and Phase 1 is in the matrix and the test passes; adding a route without a matrix entry makes the test fail (try it once, then revert).

### 🟢 1.42: Portability to zero and documentation
**Depends on:** 1.19, 1.38
**Files:** `scripts/portability-baseline.json`, `scripts/check-portability.ts`, `README.md`
**Do:** fix every remaining violation reported by `check:portability`, then change the baseline to empty so the check is strict (any match fails). README: replace the architecture/structure sections with the real one (routes → services → repositories → `Db`, migrations, shared types, API client, `useServerCollection`), remove every statement about localStorage as storage, update "Known limitations" (single SQLite instance, uploads on local disk, no real-time).
**Done when:** `npm run check:portability` exits 0 with an empty baseline; README commands work on a fresh clone.

### 🔴 1.43: Phase 1 gate
Run on a fresh DB **and** on a copy of the `phase-0-done` database (upgrade path):
- [ ] `npm run gate` passes.
- [ ] `npm run db:snapshot -- --label before` on the old DB and `--label after` on the upgraded one; `--diff` shows only the new columns/rows from migrations 004–006 and normalized timestamps.
- [ ] `grep -rn "localStorage" src` shows only token handling.
- [ ] `grep -rn "prepare(" src server.ts | grep -v src/server/db` is empty.
- [ ] `grep -rn "datetime('now')" src server.ts | grep -v migrations` is empty.
- [ ] `wc -l server.ts` is under 80.
- [ ] The user shape-parity test and the authz matrix test pass; every route is in the matrix.
- [ ] Two-browser manual test: a request, a hiring offer, a post with a like and a comment, a transaction, a message and a profile edit made in browser A are visible to the right users in browser B and survive a reload.
- [ ] `isVip` cannot be changed through any API in a production-like run.
- [ ] `docs/state-mutation-inventory.md` has every row ticked off (or moved to `NOTES.md` with a reason).
- [ ] Tag `phase-1-done` and ask the reviewer to check the repository before starting Phase 2.

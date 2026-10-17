# Legendin — Phase 0: Security & Data Integrity (TODO for free/local AI agents)

> Same conventions as `TODO/Fair_Firebase_to_SQLite_Migration_TODO.md`: English task descriptions, Farsi stays in every in-app string/error message, nothing existing is removed unless a task says so, each task is atomic and can be handed to a free local coding agent (e.g. Continue.dev + a local model) one at a time.
> 🟢 = safe/independent · 🟡 = needs review before merging · 🔴 = architecturally sensitive, review carefully.

**Goal of Phase 0:** close the real holes found in the review (public phone numbers, unauthenticated writes, NULL ids, hardcoded secrets, cross-salon finance leak, open AI/upload endpoints) *without* adding new features and *without* changing the database engine. Phase 1 (real persistence, PostgreSQL, salons/bookings) starts only after the Phase 0 checklist at the bottom passes.

---

## Rules for the agent (read before every task)

1. Work on a branch named `phase-0`. Do **one task at a time**, in numeric order (dependencies are listed per task). Never start a task whose dependency is not done.
2. Touch only the files listed in the task. If you think another file needs a change, stop and write it in a `NOTES.md` line instead of editing it.
3. Keep all user-facing strings in Persian. Reuse the tone of existing messages in `src/server/routes/auth.ts`.
4. Do not rename or remove existing JSON response fields unless the task says so. The React app reads them.
5. After each task run `npm run build` and fix errors you introduced. Do not fix unrelated TypeScript errors.
6. Commit after each task with the message `P0-XX: <short title>`.
7. Parameterized SQL only (`?` placeholders). Never build SQL with template strings using request data.
8. The browser app will show empty data for logged-out users between P0-09 and P0-24. That is expected. **Do not merge `phase-0` into main until P0-24 is done.**

**Test server recipe used in acceptance checks** (run from the repo root, in a second terminal):

```bash
PORT=3100 DB_PATH=/tmp/p0.db UPLOAD_ROOT=/tmp/p0-uploads JWT_SECRET=test-secret-test-secret-test-secret-123 npx tsx server.ts
```
(`PORT` becomes configurable in P0-01. Until then the port is 3000.) Delete `/tmp/p0.db*` to start from a fresh database.

---

## A — Foundations

### 🟢 P0-01: Load `.env` before any other module, make `PORT` configurable
**Problem:** In `server.ts`, `dotenv.config()` runs *after* all `import` lines. ES imports are evaluated first, so `src/server/middleware/auth.ts` (`JWT_SECRET`) and `src/server/db.ts` (`DB_PATH`) read `process.env` before `.env` is loaded. A `JWT_SECRET` in `.env` is silently ignored and the hardcoded fallback is used.
**Files:** `server.ts`, `src/server/db.ts`, `src/server/middleware/auth.ts`, `src/server/seed.ts`
**Do:**
- Make `import 'dotenv/config';` the **first** import line in `server.ts`, `src/server/db.ts`, `src/server/middleware/auth.ts` and `src/server/seed.ts` (it is idempotent). Remove the later `dotenv.config()` call and the unused `dotenv` default import in `server.ts`.
- Replace `const PORT = 3000;` with `const PORT = Number(process.env.PORT) || 3000;`.
**Done when:** starting with `JWT_SECRET=abc` in a `.env` file makes `process.env.JWT_SECRET` available inside `auth.ts` at import time (add a temporary `console.log(!!process.env.JWT_SECRET)` at the top of `auth.ts` to prove it, then remove it), and `PORT=3100 npx tsx server.ts` listens on 3100.

### 🟡 P0-02: Mandatory `JWT_SECRET`, pin the algorithm
**Depends on:** P0-01
**Files:** `src/server/middleware/auth.ts`
**Do:**
- Delete the hardcoded fallback `'legendin_jwt_secret_dev_key_2025_sec'`.
- If `process.env.JWT_SECRET` is missing: when `NODE_ENV === 'production'` **throw an Error at startup** (message: `JWT_SECRET is required in production`); otherwise generate `crypto.randomBytes(32).toString('hex')` once at startup and `console.warn` that tokens will be invalidated on restart.
- In production also throw if the secret is shorter than 32 characters.
- `jwt.sign(..., { expiresIn: JWT_EXPIRES_IN, algorithm: 'HS256' })` and `jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }, cb)` in both `authenticateToken` and `optionalAuth`.
**Done when:** `NODE_ENV=production npx tsx server.ts` without `JWT_SECRET` exits with that error; with a 32+ char secret it starts; login still returns a working token in dev.

### 🟢 P0-03: Update `.env.example`
**Files:** `.env.example`
**Do:** Replace the AI-Studio-only content with these keys, each with a one-line English comment: `NODE_ENV`, `PORT`, `JWT_SECRET` (comment: generate with `openssl rand -hex 32`), `DB_PATH`, `UPLOAD_ROOT`, `GEMINI_API_KEY`, `SEED_PASSWORD` (used only by the dev seed, see P0-07). No real values.
**Done when:** every `process.env.X` used in `server.ts` and `src/server/**` appears in the file (check with `grep -rhoE "process\.env\.[A-Z_]+" server.ts src/server | sort -u`).

---

## B — Data integrity (NULL ids)

### 🟡 P0-04: Generate ids on every INSERT
**Problem:** `INSERT INTO client_requests`, `hiring_offers`, `discounted_slots` and `posts` in `server.ts` do not set `id`. The column is `TEXT PRIMARY KEY` with no default, and SQLite allows NULL there, so rows get `id = NULL` and can never be updated, deleted or referenced. Also `src/server/routes/auth.ts` builds user ids with `'user-' + Date.now()` (collisions possible).
**Files:** `server.ts`, `src/server/routes/auth.ts`
**Do:**
- In the four POST handlers add `id` as the first column and value: `'req-' + randomUUID()`, `'offer-' + randomUUID()`, `'slot-' + randomUUID()`, `'post-' + randomUUID()`.
- Change each handler's response to `res.status(201).json({ id })` (the old body was the raw better-sqlite3 run result, which the frontend never uses).
- In `auth.ts` register: `const userId = 'user-' + randomUUID();`
**Done when:** after `POST /api/auth/register` + the four POSTs (auth is added in later tasks, so for now call them without a token) `SELECT count(*) FROM <table> WHERE id IS NULL` is 0 for all four tables, and ids look like `req-xxxxxxxx-...`.

### 🟡 P0-05: Repair existing NULL ids + NOT NULL for new databases
**Depends on:** P0-04
**Files:** `src/server/schema.sql`, `src/server/db.ts`, new `src/server/migrations.ts`
**Do:**
- In `schema.sql` change `id TEXT PRIMARY KEY` to `id TEXT PRIMARY KEY NOT NULL` for **every** table (new databases only; `CREATE TABLE IF NOT EXISTS` does not alter existing ones).
- Create `src/server/migrations.ts` exporting `runMigrations(db)`. It creates `schema_migrations(name TEXT PRIMARY KEY NOT NULL, applied_at TEXT DEFAULT (datetime('now')))` and runs each named migration once, inside a transaction.
- Move the two existing `ALTER TABLE` blocks from `db.ts` (`password_hash`, `isVip`/`isLoyalClient`) into migrations named `001_users_password_hash` and `002_users_vip_flags`, each still guarded by the `PRAGMA table_info` check.
- Add migration `003_repair_null_ids`: for each of `client_requests` (prefix `req`), `hiring_offers` (`offer`), `discounted_slots` (`slot`), `posts` (`post`) run
  `UPDATE <table> SET id = '<prefix>-' || lower(hex(randomblob(16))) WHERE id IS NULL;`
  (the expression is evaluated per row, so every row gets a different id).
- Call `runMigrations(db)` in `db.ts` right after the schema `exec`, and remove the old inline migration blocks.
**Done when:** take a DB that has NULL-id rows (create one with `sqlite3 /tmp/p0.db "INSERT INTO posts(author_id,content) VALUES('guest','x');"` on a pre-P0-04 build, or insert manually after temporarily dropping NOT NULL), start the server, and the rows now have ids; restarting does not run the migration again (`SELECT * FROM schema_migrations`).

### 🟢 P0-06: Integrity check script
**Depends on:** P0-05
**Files:** new `scripts/check-integrity.ts`, `package.json`
**Do:** Script opens the DB at `DB_PATH` (read-only) and, for every table, prints and fails (exit code 1) if any `id IS NULL`, if `PRAGMA foreign_key_check` returns rows, or if `PRAGMA integrity_check` is not `ok`. Add `"db:check": "tsx scripts/check-integrity.ts"` to `package.json`.
**Done when:** `npm run db:check` exits 0 on a healthy DB and exits 1 on a DB where you manually inserted a NULL id.

---

## C — Passwords & seed data

### 🟡 P0-07: Remove the shared default password `123456`
**Depends on:** P0-01
**Files:** `src/server/seed.ts`, `src/server/routes/auth.ts`, `server.ts`
**Do:**
- In `seed.ts` remove both `bcrypt.hashSync('123456', 10)` uses. Seed hash comes from `process.env.SEED_PASSWORD`; if it is missing, generate a random 16-char password, hash it, and `console.log` the plain value **once** with a `[DEV SEED]` prefix.
- Delete the block in `seedDatabase` that sets `password_hash` for rows where it is NULL.
- In `auth.ts` login: delete the "legacy user without hash" branch that accepts `123456`. A user without `password_hash` simply gets the same generic failure as a wrong password.
- In `server.ts` `startServer()`: call `seedDatabase()` only when `process.env.NODE_ENV !== 'production'`.
**Done when:** login with `123456` fails for every seeded phone; login with the `SEED_PASSWORD` value (or the printed one) works; `grep -rn "123456" src server.ts` returns nothing in non-comment code.

### 🟢 P0-08: Password policy, bcrypt cost 12, generic login error
**Files:** `src/server/middleware/auth.ts`, `src/server/routes/auth.ts`
**Do:**
- `bcrypt.hashSync(password, 12)` (existing hashes stay valid).
- Register: require password length ≥ 8 (Persian message, same style as now). Keep the max at 128 to avoid bcrypt abuse.
- Login: return the **same** 401 message (`شماره موبایل یا رمز عبور نادرست است.`) for "user not found" and "wrong password".
**Done when:** register with a 6-char password → 400; login with an unknown phone and login with a wrong password return identical bodies.

---

## D — Authorization on the API

> Pattern for tasks P0-09 … P0-16: identity always comes from `req.user` (the verified JWT), **never** from the request body. Import `authenticateToken`, `optionalAuth`, `requireRole`, `AuthenticatedRequest` from `src/server/middleware/auth.ts`. Keep the existing camelCase response shape.

### 🔴 P0-09: Public vs private user data (stop leaking phone numbers)
**Depends on:** P0-02
**Files:** `src/server/routes/auth.ts` (`formatUserResponse`), `server.ts` (`GET /api/users`, `GET /api/users/:id`)
**Do:**
- Create two serializers in `auth.ts`: `formatUserResponse(u)` (existing, full, used for the user's **own** data in login/register/me) and new exported `formatPublicUser(u)` which returns the same shape **without** `phone`, `contract` and `resumeText`.
- Replace the duplicated mapping code inside `GET /api/users` and `GET /api/users/:id` with these serializers, using `optionalAuth`: full data only if `req.user.id === u.id`, or if `req.user.role === 'manager'` (managers need staff phone/contract in StaffManagement until Phase 1 adds salon membership). Everyone else (including logged-out) gets `formatPublicUser`.
- Remove the N+1: in `GET /api/users` load all `portfolio_items` and `reviews` with two queries (`SELECT ... FROM portfolio_items`, `... FROM reviews`) and group them in memory with a `Map` by `user_id`.
- Before changing, run `grep -rn "\.phone" src/components src/App.tsx` and list in `NOTES.md` every place the frontend reads another user's phone, so P0-24 can handle them.
**Done when:** `curl -s localhost:3100/api/users | grep -c phone` prints 0; the same call with a manager token contains `phone`; `GET /api/users/<own id>` with the owner's token contains `phone`.

### 🟡 P0-10: Protect client requests
**Depends on:** P0-04, P0-09
**Files:** `server.ts` (`/api/client-requests` GET and POST)
**Do:**
- Both routes get `authenticateToken`.
- POST: ignore `client_id` from the body, use `req.user.id`. Only role `client` may create (403 otherwise, Persian message). Validate: `target_id` exists in `users`; `target_type` ∈ allowed list (grep the frontend for the values it sends); `service_type` string ≤ 100 chars; `note` ≤ 1000 chars; `price` integer ≥ 0; `status` is forced to `'pending'` (ignore the body value); `cancellation_json` is forced to `'[]'`.
- GET scoping: `client` → rows where `client_id = user.id`; `artist` and `manager` → rows where `target_id = user.id`; any other role → 403. (Managers seeing requests of their staff comes in Phase 1.)
- In GET, return `clientPhone` only to the target user of that request; for the client themself keep their own phone.
**Done when:** logged-out GET/POST → 401; client A cannot see client B's requests; a request body containing `"client_id":"someone-else"` still creates the row under the caller's id.

### 🟡 P0-11: Protect hiring offers and job applications
**Depends on:** P0-04, P0-09
**Files:** `server.ts` (`/api/hiring-offers` GET/POST, `/api/job-applications` GET)
**Do:**
- All routes `authenticateToken`.
- POST hiring offer: `requireRole(['manager'])`, `manager_id = req.user.id`, `artist_id` must exist and have role `artist`, `status` forced to `'pending'`, `offer_amount` string ≤ 50 chars, `message` ≤ 1000 chars.
- GET hiring offers: rows where `manager_id = user.id` OR `artist_id = user.id` (manager and artist only; others 403).
- GET job applications: rows where `applicant_id = user.id` OR `salon_id = user.id`.
**Done when:** an artist token cannot create an offer (403); an artist only sees offers addressed to them.

### 🟡 P0-12: Discounted slots and discounts
**Depends on:** P0-04
**Files:** `server.ts` (`/api/discounted-slots` GET/POST, `/api/discounts` GET)
**Do:**
- GET discounted slots stays public (guests browse deals) but returns **only** `status = 'available'` rows to logged-out callers; logged-in artist/manager also see their own non-available rows (`artist_id = user.id`). Use `optionalAuth`.
- POST: `authenticateToken` + `requireRole(['artist','manager'])`; `artist_id` = `req.user.id` for artists (for managers, the body value must be an existing user with role `artist`); `status` forced to `'available'`; `claimed_by_client_id` forced to `null`; numeric fields must be integers ≥ 0 and `discounted_price <= original_price`; `discount_percent` 0–100; `app_commission_percent` 0–100.
- GET discounts: `authenticateToken`; return rows where `salon_id = user.id` OR `scope` indicates public (grep `seed.ts`/`types.ts` for the values used) OR `target_client_id = user.id`.
**Done when:** logged-out GET returns only available slots; POST with `status:"claimed"` still stores `available`.

### 🟡 P0-13: Posts (feed)
**Depends on:** P0-04
**Files:** `server.ts` (`/api/posts` GET/POST)
**Do:**
- GET stays public (community feed is browsable), but fix the N+1 (one query for comments, one for the authors involved, grouped in memory) and add `?limit=` (default 30, max 100) and `?before=<created_at>` pagination ordered by `created_at DESC`.
- POST: `authenticateToken`; `author_id = req.user.id`; `content` required, trimmed, ≤ 2000 chars; `image` must be `null` or start with `/uploads/`; `tag` ≤ 30 chars.
**Done when:** logged-out POST → 401; the response of `GET /api/posts?limit=2` has at most 2 posts; `author_id` in the body is ignored.

### 🟡 P0-14: Leave requests (ownership)
**Depends on:** P0-04
**Files:** `server.ts` (`/api/leave-requests` GET/POST/DELETE)
**Problem:** POST uses `INSERT OR REPLACE` with a client-supplied `id`, so anyone can overwrite another person's leave request; DELETE has no owner check.
**Do:**
- All routes `authenticateToken`.
- GET: `manager` sees all (Phase 1 will scope by salon); others only rows where `staff_id = user.id`.
- POST: `staff_id = req.user.id` unless caller is `manager` (then body `staff_id` must exist). Replace `INSERT OR REPLACE` with a plain `INSERT` using a server-generated `'leave-' + randomUUID()`. If the body has an `id`, treat it as an update: first `SELECT staff_id` and allow the update only if the row belongs to the caller or caller is manager, using `UPDATE ... WHERE id = ?`. Validate dates look like `YYYY/MM/DD` or `YYYY-MM-DD` and `end_date >= start_date`; `status` ∈ `pending|accepted|declined|logged` and only managers may set `accepted`/`declined`.
- DELETE: allowed only for the owner or a manager; 404 if the row is missing.
**Done when:** user A cannot delete or overwrite user B's leave request (403), a manager can; the existing calendar in `RequestsInbox.tsx` still works after P0-24.

### 🟡 P0-15: Colleague messages
**Depends on:** P0-04
**Files:** `server.ts` (`/api/colleague-messages` GET)
**Do:** `authenticateToken`; return only rows where `sender_id = user.id` OR `recipient_id = user.id`. Also attach each message's replies from `message_replies` (one extra query, grouped in memory) as `replies: [{ id, senderId, content, createdAt }]`.
**Done when:** user C cannot see messages between A and B.

### 🔴 P0-16: Finance — scope every query to the caller's salon
**Depends on:** P0-02, P0-04
**Files:** `src/server/routes/finance.ts`, `src/server/seed.ts` (read only to check ids)
**Problem:** a manager sees **all** transactions of all salons; `salon_id` comes from the body and falls back to `'salon-1'`; `DELETE` has no salon check; the summary route ignores salon. In this schema a salon *is* its manager's user row (`transactions.salon_id REFERENCES users(id)`).
**Do:**
- First open `seed.ts` and note which `salon_id` values the seeded transactions use; if they are not manager user ids, fix the seed so they are (`INSERT` the right id), otherwise managers would see an empty ledger.
- GET `/`: for `manager` add `WHERE salon_id = ?` bound to `user.id`.
- POST `/`: ignore `salon_id` from the body, always `user.id`. Remove the `'salon-1'` fallback. Verify `related_staff_id` exists **and** has role `artist` or `service-staff`.
- DELETE `/:id`: `SELECT salon_id` first; 404 if missing, 403 if `salon_id !== user.id`.
- GET `/summary`: for manager add `AND salon_id = ?`; replace the double-quoted SQL string literals (`"income"`, `"cost"`) with bound parameters or single quotes; keep the artist branch (`related_staff_id = ?`).
- Reject `date` values that do not match `^\d{4}[/-]\d{2}[/-]\d{2}$` (400, Persian message) instead of storing arbitrary text.
**Done when:** register two managers M1, M2; M1 creates a cost; M2's `GET /api/transactions` does not contain it, M2's `DELETE` on it returns 403, and M2's summary does not include it.

---

## E — AI endpoint & uploads

### 🟡 P0-17: Harden `/api/chat`
**Depends on:** P0-02
**Files:** `server.ts`, `src/components/AIAssistant.tsx`
**Problem:** the endpoint is public (anyone can burn the Gemini quota), trusts `allUsers`, `clientRequests`, `transactions` sent by the browser, and returns `error.message` (may reveal internals).
**Do (server):**
- Add `authenticateToken`.
- Ignore `allUsers`, `clientRequests`, `transactions`, `role`, `userName` from the body. Take `role` and `name` from `req.user`. Compute platform stats on the server with `SELECT count(*)` queries (artists, managers, total client requests). Drop the financial ledger count from the prompt unless the caller is a manager (then count only that salon's rows).
- Validate `messages`: array, max 20 items, each `{ role: 'user'|'assistant', content: string ≤ 2000 chars }`; otherwise 400.
- On errors return `{ error: 'سرویس دستیار هوشمند موقتاً در دسترس نیست.' }` with status 500 and only `console.error` the real error.
**Do (client):** in `AIAssistant.tsx` stop sending `allUsers`, `clientRequests`, `transactions`, `role`, `userName` in the request body (keep sending `messages`). Use `authFetch` (finished in P0-24).
**Done when:** logged-out call → 401; a body with a fake `role:"manager"` does not change the system prompt; 21 messages → 400; with `GEMINI_API_KEY` unset the response body contains no mention of `GEMINI_API_KEY`.

### 🟡 P0-18: Harden file upload
**Depends on:** P0-02
**Files:** `server.ts`, `src/utils/uploadFile.ts`
**Problems:** public endpoint; unknown category is stored in `misc/` but the returned URL still contains the unknown category; file extension taken from the user-supplied name; type check trusts the declared `mimetype`; PDFs allowed for avatars.
**Do:**
- `authenticateToken` on `POST /api/upload/:category`.
- Reject (400, Persian message) any category not in `['avatars','covers','portfolio','posts','receipts','contracts']`. Remove the `misc` fallback and make `destination` and the returned URL use the same validated category.
- Allowed types per category: `avatars`, `covers`, `portfolio`, `posts` → `image/jpeg|png|webp`; `receipts`, `contracts` → images + `application/pdf`. Only `manager` may upload to `receipts` and `contracts`.
- File extension comes from a fixed map (`image/jpeg → .jpg`, `image/png → .png`, `image/webp → .webp`, `application/pdf → .pdf`), never from `originalname`.
- After multer saves the file, read its first 12 bytes and check magic numbers (JPEG `FF D8 FF`, PNG `89 50 4E 47`, WEBP `RIFF....WEBP`, PDF `%PDF`). If they do not match, delete the file and return 400.
- Add a multer error handler so oversize files return `413` with a Persian message instead of a 500.
- Serve `/uploads` with `express.static(UPLOAD_ROOT, { setHeaders: res => res.setHeader('X-Content-Type-Options','nosniff') })`.
**Done when:** a text file renamed to `x.png` is rejected; an avatar upload of a PDF is rejected; an unauthenticated upload → 401; a valid PNG returns `/uploads/avatars/<uuid>.png` and the URL loads.

### 🔴 P0-19: Private files for receipts and contracts
**Depends on:** P0-18
**Files:** `server.ts`
**Problem:** everything under `/uploads` is public, including payment receipts and staff contracts. UUID names are hard to guess but links get shared and logged.
**Do:**
- Stop serving `receipts/` and `contracts/` through the public static handler (mount static only for `avatars`, `covers`, `portfolio`, `posts`: `app.use('/uploads/avatars', express.static(...))` etc.).
- Add `GET /uploads/:category(receipts|contracts)/:file` with `authenticateToken`. Allow `manager` only (Phase 1 will add artist access to their own contract). Validate `:file` against `^[a-f0-9-]{36}\.(jpg|png|webp|pdf)$` to prevent path traversal, then `res.sendFile(path.join(UPLOAD_ROOT, category, file))` with `Content-Disposition: inline` and `X-Content-Type-Options: nosniff`.
- Note in `NOTES.md` that `<img src>`/links to these files need the token, so the frontend must fetch them with `authFetch` and use a blob URL (handled in P0-24).
**Done when:** `curl localhost:3100/uploads/receipts/<file>` without a token → 401, with a manager token → 200, and `..%2f` traversal attempts → 400.

---

## F — HTTP hardening

### 🟢 P0-20: Security headers and body limit
**Files:** `package.json`, `server.ts`
**Do:**
- `npm install helmet`.
- `app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'same-site' } }));` with a `// TODO(Phase 1): enable CSP after self-hosting fonts and images` comment.
- `app.use(express.json({ limit: '100kb' }));`
- `app.set('trust proxy', 1);` (the app will sit behind Nginx or a platform proxy; rate limiting needs the real client IP).
- `app.disable('x-powered-by');`
**Done when:** `curl -sI localhost:3100/api/services` shows `x-content-type-options: nosniff` and no `x-powered-by`; a 200 KB JSON POST is rejected with 413.

### 🟢 P0-21: Rate limiting
**Depends on:** P0-20
**Files:** `package.json`, `server.ts`
**Do:** `npm install express-rate-limit`, then:
- global limiter on `/api/`: 300 requests / 1 minute / IP;
- `/api/auth/login` and `/api/auth/register`: 10 requests / 15 minutes / IP (count only failures for login using `skipSuccessfulRequests: true`);
- `/api/chat`: 20 requests / 1 minute keyed by `req.user.id` (put the limiter after `authenticateToken`);
- `/api/upload`: 30 requests / 10 minutes keyed by `req.user.id`.
All limiters return JSON `{ error: 'تعداد درخواست‌ها بیش از حد مجاز است. کمی بعد دوباره تلاش کنید.' }` with status 429.
**Done when:** 11 wrong-password logins from the same IP return 429 on the 11th; the 12th login with the right password during the window is also 429.

### 🟡 P0-22: Central error handling
**Files:** `server.ts`
**Do:**
- After all routes: `app.use('/api', (req, res) => res.status(404).json({ error: 'مسیر یافت نشد.' }))` (so unknown API paths do not return the SPA `index.html`).
- Add a final Express error middleware `(err, req, res, next)` that logs `err` with `console.error` and returns `{ error: 'خطای داخلی سرور.' }` (status `err.status` if it is 4xx, else 500). It must never send `err.message` or `err.stack` when `NODE_ENV === 'production'`.
- Add `process.on('unhandledRejection', ...)` and `process.on('uncaughtException', ...)` that log and then `process.exit(1)` (a process manager restarts it).
**Done when:** `curl localhost:3100/api/nope` → 404 JSON; a request with malformed JSON returns 400 JSON, not an HTML stack trace.

### 🟢 P0-23: Health check, graceful shutdown, fix `start-server.js`
**Depends on:** P0-01
**Files:** `server.ts`, `start-server.js`, `package.json`
**Do:**
- Add `GET /api/health` → `{ status: 'ok', db: <true if SELECT 1 works> , uptime: process.uptime() }` (no auth, no secrets, no counts).
- Keep the `app.listen` return value (`const server = app.listen(...)`). On `SIGTERM`/`SIGINT`: `server.close()`, `db.close()`, then `process.exit(0)`, with a 10-second force-exit timer.
- `start-server.js` forces `NODE_ENV=development` and uses `require` in an ESM package, so it is broken and unsafe. Delete the file and make sure `"start": "NODE_ENV=production node dist/server.cjs"` in `package.json` is the one way to run production (cross-platform note: if Windows support matters add `cross-env`).
**Done when:** `curl localhost:3100/api/health` → `{"status":"ok",...}`; Ctrl+C prints a shutdown line and exits with code 0; `start-server.js` is gone.

---

## G — Frontend alignment (do after D–F)

### 🔴 P0-24: Send the token on every API call and reload data after login/logout
**Depends on:** P0-09 … P0-19
**Files:** `src/App.tsx`, `src/utils/uploadFile.ts`, `src/components/FinanceDashboard.tsx`, `src/components/AddTransactionForm.tsx`, `src/components/RequestsInbox.tsx`, `src/components/AIAssistant.tsx`, `src/components/UserProfile.tsx`, `src/components/StaffManagement.tsx`, `src/utils/auth.ts`
**Problem:** `authFetch` exists in `src/utils/auth.ts` but is used nowhere, so after the server is locked down every private call from the browser would return 401. Also `App.tsx` loads server data once on mount, before login.
**Do:**
- Replace every `fetch("/api/...")` (except `/api/auth/login` and `/api/auth/register`) with `authFetch(...)` in the files above and in `uploadFile.ts` (it must not set `Content-Type` for `FormData`; `authFetch` already handles that).
- In `authFetch`: if the response status is `401`, call `clearAuthToken()` and dispatch `window.dispatchEvent(new Event('legendin:unauthorized'))`. In `App.tsx` listen for that event once (`useEffect`), set `currentUser` to `null` and open the login modal with a Persian message (`نشست شما منقضی شده است. دوباره وارد شوید.`).
- In `App.tsx` change the data-loading `useEffect` to depend on `currentUser?.id` so it re-runs after login and logout. For each request that can fail with 401/403 (transactions, client-requests, hiring-offers, leave-requests) do not call `.json()` blindly: check `res.ok`, otherwise set that slice to `[]`.
- Stop trusting `localStorage.legendin_logged_in_user_id` for identity: on startup call `getCurrentUserApi()` and set `currentUser` from the server response; if it returns `null`, clear the stored id.
- For the places listed in `NOTES.md` by P0-09 that read another user's `phone`, hide the phone when it is `undefined` (no crash).
- Replace the hardcoded `salonId="salon-1"` with the logged-in manager's id (`currentUser.id`) in `App.tsx` (the `FinanceDashboard` prop), `UserProfile.tsx` (the `FinanceDashboard`/`AddTransactionForm` usage near line 757) and `StaffManagement.tsx` (the locally built transaction near line 421). After P0-16 the server always stores `salon_id = manager's user id` and ignores the body value, so the UI must use the same id. Do **not** touch the demo fallback arrays in `App.tsx` (they are removed in Phase 1).
- `AddTransactionForm.tsx` reads the token directly from `localStorage`; switch it to `authFetch` like the others.
- Receipts/contracts links (from P0-19): add a small helper `openPrivateFile(url)` in `uploadFile.ts` that fetches the URL with `authFetch`, creates a blob URL and opens it in a new tab; use it wherever `receiptUrl`/`contractFileUrl` is opened or shown.
**Done when:** in the browser: log in as a manager → ledger loads; log out → ledger data disappears and no 401 errors flood the console; manually deleting the token in DevTools and clicking anything private shows the Persian "session expired" message and the login modal; a guest still sees the public feed, public artist cards and available discounted slots.

---

## H — Cleanup, tests, CI

### 🟢 P0-25: Remove Firebase (dead code)
**Depends on:** P0-24 (so nothing else is moving)
**Files:** delete `firebase-applet-config.json`, `firestore.rules`, `firebase-blueprint.json`, `src/lib/firebase.ts`; edit `package.json`
**Do:**
- First run `grep -rn "lib/firebase\|firebase-applet-config\|from \"firebase" src server.ts` and confirm nothing imports them. If something does, stop and write it in `NOTES.md`.
- Delete the four files, remove `"firebase"` from `dependencies`, run `npm install` to refresh `package-lock.json`.
**Done when:** `npm run build` passes and `grep -rn firebase src server.ts package.json` returns nothing.
**Human-only steps (not for the agent):** (1) in Google Cloud Console delete or restrict the API key `AIzaSy...` that was committed in `firebase-applet-config.json`, and make sure the Firestore database `ai-studio-aurasalon-...` is not left open (the committed rules were `allow read, write: if true`); (2) the key remains in git history — either accept that after restricting it, or rewrite history with `git filter-repo`.

### 🟢 P0-26: Delete dead and broken files
**Files:** `check_db.js`, `app/applet/test-download.js`, `metadata.json` (only if identical to `index.html` metadata — check first and otherwise leave)
**Do:** `check_db.js` uses `require` inside an ES-module package (it crashes) and prints password hashes; replace its purpose with `npm run db:check` from P0-06 and delete it. Delete `app/applet/test-download.js` after confirming nothing references it (`grep -rn "test-download" .`).
**Done when:** both files are gone and `npm run build` still passes.

### 🟢 P0-27: Make the README truthful
**Depends on:** all previous tasks
**Files:** `README.md`
**Do:** Rewrite so it only states what exists. Required sections: Overview (2–3 sentences), Tech stack (real one: Express, better-sqlite3, React 19, Vite, Tailwind 4, Gemini), Run locally (`npm install`, `.env` from `.env.example`, `npm run dev`), Environment variables (table from `.env.example`), Scripts (`dev`, `build`, `start`, `lint`, `db:seed`, `db:check`), Project structure, **Known limitations** (SQLite single instance, localStorage still used for some state until Phase 1, no real-time messaging, no tests beyond Phase 0 API tests, uploads on local disk), Security notes (what is implemented after Phase 0).
- **Delete** the whole "Security Report" section at the end (its SQL-injection finding is outdated; `finance.ts` is parameterized) and all claims that are not implemented: Docker-ready, connection pooling, load balancing, CI/CD, real-time, mobile app, code splitting, CORS, "all checked" phases.
**Done when:** every command in the README runs as written on a fresh clone, and `grep -in "docker\|load balanc\|real-time\|CORS" README.md` finds only lines inside "Known limitations".

### 🟡 P0-28: Automated API tests for Phase 0
**Depends on:** P0-01 … P0-23
**Files:** new `tests/api.test.ts`, `package.json`
**Do:** Use Node's built-in runner, no new framework: `"test": "node --import tsx --test tests/*.test.ts"`. The test file spawns `npx tsx server.ts` as a child process with `PORT=3199`, a temp `DB_PATH`, a temp `UPLOAD_ROOT`, `JWT_SECRET` (32+ chars), `NODE_ENV=development`, waits for `/api/health`, runs the cases below with `fetch`, then kills the child and deletes the temp files. Users are created through `POST /api/auth/register` (so tests do not depend on seed passwords).
Cases:
1. `GET /api/users` → no `phone` key anywhere in the JSON.
2. `POST /api/posts` without token → 401; with token → 201 and `GET /api/posts` shows it with a non-null `id`.
3. `POST /api/client-requests` as client with a spoofed `client_id` → stored under the caller's id; as an artist → 403.
4. Two managers: M1 creates a transaction, M2 cannot list/delete it (403), summary of M2 excludes it.
5. Leave request: user A cannot DELETE user B's request.
6. Upload: no token → 401; fake PNG (text bytes) → 400; real 1×1 PNG → 200.
7. `POST /api/chat` without token → 401; 21 messages → 400.
8. 11 failed logins → 429.
9. Starting the server with `NODE_ENV=production` and no `JWT_SECRET` exits with a non-zero code.
**Done when:** `npm test` passes locally; temporarily reverting P0-16 makes case 4 fail (sanity check that the test is real; revert the revert).

### 🟢 P0-29: Minimal CI
**Depends on:** P0-28
**Files:** new `.github/workflows/ci.yml`
**Do:** Trigger on `push` and `pull_request`. One job on `ubuntu-latest`, Node 20: `npm ci` → `npm run build` → `npm test`. Run `npm run lint` as a separate step with `continue-on-error: true` (there are known type errors that Phase 1 will clean up). Add `npm audit --omit=dev --audit-level=high` as a non-blocking step too.
**Done when:** the workflow file passes `actionlint` if available, and the first push shows a green build+test job.

---

## Phase 0 final checklist (human + agent, run before asking for the Phase 1 review)

Run each line on a fresh database (`rm /tmp/p0.db*`), with the test server recipe at the top.

- [ ] `npm run build` and `npm test` pass; CI is green.
- [ ] `npm run db:check` exits 0.
- [ ] `curl -s localhost:3100/api/users | grep -c phone` → `0`.
- [ ] `curl -i -X POST localhost:3100/api/posts -H 'Content-Type: application/json' -d '{"content":"x"}'` → `401`.
- [ ] `curl -i -X POST localhost:3100/api/chat -H 'Content-Type: application/json' -d '{"messages":[]}'` → `401`.
- [ ] Login with `123456` fails for every seeded phone.
- [ ] `NODE_ENV=production npx tsx server.ts` without `JWT_SECRET` refuses to start.
- [ ] Two different managers cannot see each other's transactions.
- [ ] `grep -rn "salon-1\|123456\|legendin_jwt_secret" server.ts src/server` returns nothing (frontend demo arrays in `App.tsx` still contain `salon-1`; they are removed in Phase 1 task 1.38).
- [ ] `grep -rn "firebase" src server.ts package.json` returns nothing.
- [ ] In the browser: guest browsing works, login/logout reloads data, expired token shows the Persian message, AI assistant works for a logged-in user.
- [ ] README has no false claims.
- [ ] Human steps done: Gemini and Firebase keys reviewed/rotated, real `JWT_SECRET` set on the server, `.env` is not in git.

## Deliberately NOT in Phase 0 (carried to Phase 1 — owner decisions needed)

1. **Manager verification.** Today anyone can self-register with `role: "manager"` and gets finance and hiring rights. Decide: admin approval, invite code, or document upload. Needs a `verified` flag and an admin screen.
2. **Phone verification (OTP via SMS)** and which Iranian SMS provider to use.
3. **Real salon model** (`salons`, `salon_members`, multi-branch) to replace "salon = manager's user row", then re-scope staff, contracts and finance by salon membership.
4. **Moving all writes from localStorage to the API** (posts, requests, offers, profile edits) with TanStack Query, plus the missing `PUT /api/users/:id`, likes, comments and request status-change endpoints.
5. **Docker/Compose, object storage + CDN, self-hosted fonts and images, CSP** (Phase 4 and 5). **PostgreSQL is the very last phase (Phase 7)**, after everything else is stable.
6. **Access/refresh token pair in httpOnly cookies** instead of a 7-day token in localStorage.
7. `schema.sql` is read from `process.cwd()/src/server/schema.sql` at runtime, so production needs the `src/` folder next to `dist/`; embed or copy the SQL into the build when Docker arrives.

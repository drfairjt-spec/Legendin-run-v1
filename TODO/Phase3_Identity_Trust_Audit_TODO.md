# Legendin — Phase 3: Identity, Trust & Audit (TODO for free/local AI agents)

> **Read `00_Integrity_Rules_and_Roadmap.md` first.** Same conventions: English task text, Farsi in user-facing strings, one task at a time, one commit per task named `P3-3.NN: <title>`.
> 🟢 safe/independent · 🟡 needs review before merging · 🔴 architecturally sensitive.
> **Database engine stays SQLite.** Branch: `phase-3`. Preconditions: Phase 2 gate passed and tagged `phase-2-done`. Migrations in this phase use numbers `050`–`059`.

**Goal:** real identity and trust. Phone verification by OTP, admin verification of managers/artists/certificates, short-lived access tokens with rotating refresh sessions (no token in `localStorage`), login throttling, an append-only audit log, privacy (terms, export, deletion), moderation, and a security regression suite that keeps every later change honest.

**Owner decisions needed before starting:** (1) verification method for managers/artists (default used below: admin approval with uploaded documents); (2) SMS provider for OTP (task 3.05 builds a provider interface; the real adapter needs the provider's API docs and a test account); (3) the legal texts for terms and privacy (task 3.14 ships placeholders).

**Release note to write in README (task 3.09):** the move to refresh sessions invalidates all old 7-day tokens once; every user has to log in again after the deploy.

---

## A — Foundations

### 🟡 3.01: Non-blocking password hashing with configurable cost
**Files:** `src/server/middleware/auth.ts`, `src/server/routes/auth.ts`, `src/server/seed.ts`, `.env.example`, tests
**Do:** replace `hashSync/compareSync` with the async `bcrypt.hash/compare` of `bcryptjs`; cost from env `BCRYPT_ROUNDS` (allowed 10–14, default 12). On a successful login, if the stored hash uses fewer rounds than the current setting (`bcrypt.getRounds`), re-hash and store the new hash. Seed uses the async API.
**Done when:** tests for hash/compare, rehash-on-login, and invalid `BCRYPT_ROUNDS` (startup error); no `Sync(` calls remain: `grep -rn "hashSync\|compareSync" src` is empty.

### 🔴 3.02: Admin flag and verification workflow (server)
**Depends on:** 3.01
**Files:** new `src/server/db/migrations/050_admin_verification.ts`, new `scripts/admin-create.ts`, `src/server/middleware/auth.ts` (`requireAdmin`), repositories `verification.ts`, routes `verificationRequests.ts`, `admin.ts`; tests
**Do:**
- Do **not** add an `admin` role (it would require rebuilding the `users` table to change the CHECK). Use a flag: `ALTER TABLE users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0;`. `requireAdmin` reads the flag from the database on every request (never from the token).
- `CREATE TABLE verification_requests (id TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL REFERENCES users(id), kind TEXT NOT NULL CHECK(kind IN ('manager','artist','certificate')), subject_id TEXT, documents_json TEXT NOT NULL, note TEXT, status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')), reviewer_id TEXT REFERENCES users(id), review_note TEXT, created_at TEXT NOT NULL, reviewed_at TEXT);` plus `CREATE INDEX idx_verification_status ON verification_requests(status, created_at);` (`subject_id` = certificate id for `kind='certificate'`).
- `npm run admin:create -- --phone <n>`: promotes an existing user, or creates one with a random password printed **once**; refuses in production without `--yes`.
- Endpoints: `POST /api/verification-requests` (caller, `kind` must match their role; documents are private uploads with the new upload category `verification`, readable only by the owner and admins — extend the private-file route from P0-19), `GET /api/verification-requests/mine`, `GET /api/admin/verification-requests?status=` and `POST /api/admin/verification-requests/:id/approve|reject` `{ note }` (admin only; approve sets `users.is_verified = 1`; each decision is a `db.tx` and will be audited in 3.13).
- The serializer returns `isAdmin` only on the user's own record.
**Done when:** tests: a normal user cannot call `/api/admin/*` (403), cannot read someone else's documents, cannot approve their own request; an admin can; double approval → 409.

### 🟡 3.03: Admin screen (verification queue)
**Depends on:** 3.02
**Files:** new `src/components/AdminPanel.tsx`, `src/api/admin.ts`, `src/App.tsx`, `e2e/`
**Do:** an `مدیریت` tab visible only when `currentUser.isAdmin`: list pending requests with applicant, kind, documents (opened with `openPrivateFile`), a note field, and approve/reject buttons (Persian labels); a user-side form in the profile for submitting a verification request with document upload; status badge `در انتظار تأیید / تأیید شده / رد شده`.
**Done when:** Playwright: a manager submits a request, an admin approves it, the manager sees `تأیید شده`.

### 🟡 3.04: Gate manager features on verification, badge, certificate moderation
**Depends on:** 3.03
**Files:** new `src/server/db/migrations/051_grandfather_verified.ts`, `src/server/middleware/verified.ts`, routers, `src/components/*` (badge), `.env.example`, tests
**Do:**
- Migration: `UPDATE users SET is_verified = 1 WHERE role IN ('manager','artist')` — everyone who exists before this release is grandfathered (the admin can revoke later); document it in the release note.
- `requireVerified` middleware (a `403` with `{ error: 'حساب شما هنوز تأیید نشده است.', code: 'NOT_VERIFIED' }`) on: creating hiring offers, finance writes, salon/staff management writes, creating salon announcements. Unverified salons are hidden from the public `GET /api/salons` list (visible to the owner). Env flag `VERIFICATION_ENFORCE` (default `true`).
- Certificates: submitting an `uploadedCertificates` item (task 1.23) also creates a `verification_requests` row with `kind='certificate'`; approve/reject updates that item's `status` inside the user's JSON in the same `db.tx`.
- UI: a `تأییدشده` badge on verified profiles/salons; unverified managers see a banner explaining why features are locked.
**Done when:** a freshly registered manager gets 403/`NOT_VERIFIED` on finance writes, and works after admin approval; grandfathered seed managers keep working; authz matrix updated.

---

## B — Phone verification and OTP

### 🟡 3.05: SMS provider interface
**Files:** new `src/server/services/sms/index.ts`, `consoleProvider.ts`, `fakeProvider.ts`, `httpProvider.ts` (skeleton), `templates.ts`; `.env.example`; tests
**Do:** `interface SmsProvider { send(to: string, text: string): Promise<{ providerMessageId: string }> }`; factory by `SMS_PROVIDER=console|fake|<provider name>`; `consoleProvider` (dev) prints the message with the phone masked (`0912***4567`); `fakeProvider` stores messages in memory for tests; `httpProvider` is a skeleton with a 5 s timeout, retry once on network error, and a clear error mapping — fill in the real request format once the owner picks the provider (env `SMS_API_KEY`, `SMS_SENDER`). `templates.ts`: `otp(code)` → `کد تأیید لجندین: {code}`. Production refuses to start with `SMS_PROVIDER=console|fake`.
**Done when:** tests with the fake provider; startup error in production with the console provider.

### 🔴 3.06: OTP service and endpoints
**Depends on:** 3.05
**Files:** new `src/server/db/migrations/052_otp.ts`, `src/server/services/otp.ts`, `src/server/routes/otp.ts`, `src/shared/schemas.ts`, `.env.example` (`OTP_SECRET`), tests
**Do:**
- `CREATE TABLE otp_codes (id TEXT PRIMARY KEY NOT NULL, phone TEXT NOT NULL, purpose TEXT NOT NULL CHECK(purpose IN ('register','login','reset','verify-phone')), code_hash TEXT NOT NULL, expires_at TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, consumed_at TEXT, ip TEXT, created_at TEXT NOT NULL); CREATE INDEX idx_otp_phone ON otp_codes(phone, created_at);`
- Code: 6 digits from `crypto.randomInt`, stored as HMAC-SHA256 with `OTP_SECRET`, TTL 120 s, max 5 attempts, resend cooldown 60 s per phone, max 5 sends per hour per phone and 20 per hour per IP, constant-time comparison, a new code invalidates the previous ones.
- `POST /api/auth/otp/request { phone, purpose }` returns the **same generic response** whether or not the phone is registered (no enumeration); `POST /api/auth/otp/verify { phone, purpose, code }` returns `{ otpToken }` (a JWT valid 10 minutes, scoped to the phone and purpose) — for `login` it creates the session instead (after 3.08).
**Done when:** tests with a fixed clock and the fake provider: expiry, attempts exhausted, cooldown, hourly limits, wrong purpose, replay of a consumed code, identical responses for known/unknown phones.

### 🟡 3.07: OTP registration and phone verification
**Depends on:** 3.06
**Files:** new `src/server/db/migrations/053_phone_verified.ts`, `src/server/routes/auth.ts`, `src/server/middleware/phoneVerified.ts`, `src/components/AuthPage.tsx`, `.env.example`, tests, `e2e/`
**Do:** `ALTER TABLE users ADD COLUMN phone_verified_at TEXT;`. `POST /api/auth/register` requires `otpToken` (purpose `register`, same phone) when `OTP_REQUIRED=true`; the new user gets `phone_verified_at = now`. Existing users stay `NULL` ("soft gate"): after the date in env `PHONE_VERIFY_ENFORCE_AFTER` (ISO date, empty = never), write routes behind `requirePhoneVerified` answer `403 { code: 'PHONE_NOT_VERIFIED' }`. `POST /api/auth/phone/verify { otpToken }` (purpose `verify-phone`) sets the timestamp. AuthPage becomes a 3-step flow (phone → code → details) and a modal asks existing users to verify their phone when the API answers `PHONE_NOT_VERIFIED`.
**Done when:** Playwright with the console/fake provider: register with OTP; an old user gets the modal after the enforce date; API tests for wrong/expired token and for a phone that differs from the token's.

---

## C — Sessions

### 🔴 3.08: Access tokens + rotating refresh sessions (server)
**Depends on:** 3.01, 3.06
**Files:** new `src/server/db/migrations/054_sessions.ts`, `src/server/services/sessions.ts`, `src/server/middleware/auth.ts`, `src/server/routes/auth.ts`, tests
**Do:**
- `CREATE TABLE sessions (id TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL REFERENCES users(id), refresh_hash TEXT NOT NULL UNIQUE, family_id TEXT NOT NULL, user_agent TEXT, ip TEXT, created_at TEXT NOT NULL, last_used_at TEXT NOT NULL, expires_at TEXT NOT NULL, revoked_at TEXT, replaced_by TEXT); CREATE INDEX idx_sessions_user ON sessions(user_id);`
- Access JWT: HS256, 15 minutes, claims `sub`, `role`, `sid`. `authenticateToken` verifies it **and** checks the session exists and is not revoked (one primary-key lookup). Refresh token: 32 random bytes (base64url), stored as SHA-256, sent as cookie `legendin_rt` (`HttpOnly; Secure` in production; `SameSite=Lax; Path=/api/auth; Max-Age` 30 days).
- Login, register and OTP-login return `{ accessToken, user }` in JSON and set the cookie. `POST /api/auth/refresh` rotates: the old session row is revoked with `replaced_by`, a new one is created in the same family; **presenting an already-revoked refresh token revokes the whole family** and returns 401. `POST /api/auth/logout` (current), `POST /api/auth/logout-all`, `GET /api/auth/sessions` (own sessions, current one flagged).
- Old 7-day tokens (no `sid`) are rejected.
**Done when:** tests: rotation works, reuse of an old refresh token kills the family, logout revokes the access token immediately, expired refresh → 401, tokens of another user's session cannot be used.

### 🔴 3.09: Frontend session handling (no token in `localStorage`)
**Depends on:** 3.08
**Files:** `src/utils/auth.ts`, `src/App.tsx`, `src/components/AuthPage.tsx`, `src/api/client.ts`, `README.md`, `e2e/`
**Do:** keep the access token in module memory only; on app start call `POST /api/auth/refresh` (cookie) to obtain it and the user (`bootstrapSession()`) before loading data; `authFetch` retries once after a 401 using a **single-flight** refresh promise, then falls back to the logged-out state; delete the leftover `legendin_jwt_token` key at startup; a `BroadcastChannel('legendin-auth')` logs out other tabs. Write the release note (everyone has to log in once) in the README.
**Done when:** `grep -rn "localStorage" src` shows no auth token handling; Playwright: reload keeps the session through the cookie, logout in tab A logs out tab B, and expiring the access token mid-session refreshes silently.

### 🟡 3.10: Password reset and change
**Depends on:** 3.08
**Files:** `src/server/routes/auth.ts`, `src/shared/schemas.ts`, `src/components/AuthPage.tsx`, `src/components/UserProfile.tsx`, tests, `e2e/`
**Do:** `POST /api/auth/password/reset { otpToken, newPassword }` (purpose `reset`) and `POST /api/auth/password/change { currentPassword, newPassword }`; both revoke **all other sessions** (all sessions for reset). UI: `فراموشی رمز عبور` flow in AuthPage; a change-password form in the profile. Password rules: 8–128 chars, not equal to the phone number.
**Done when:** tests: after a reset the old password and old sessions are dead; a wrong current password → 401; Playwright covers the reset flow with the fake provider.

### 🟡 3.11: Origin checks for cookie endpoints
**Depends on:** 3.08
**Files:** new `src/server/middleware/originCheck.ts`, `src/server/routes/auth.ts`, `.env.example` (`APP_ORIGIN`), tests
**Do:** for `refresh`, `logout`, `logout-all` (the only endpoints that rely on the cookie) require `Origin`/`Sec-Fetch-Site` to be same-origin or equal to `APP_ORIGIN`, and the header `X-Requested-With: legendin`; `authFetch` sends that header. Everything else uses the `Authorization` header and is not CSRF-prone.
**Done when:** a cross-origin `POST /api/auth/refresh` is rejected (test); the app still refreshes normally.

### 🟡 3.12: Persistent login throttling
**Depends on:** 3.08
**Files:** new `src/server/db/migrations/055_login_attempts.ts`, `src/server/services/loginThrottle.ts`, `src/server/routes/auth.ts`, tests
**Do:** `CREATE TABLE login_attempts (key TEXT PRIMARY KEY NOT NULL, count INTEGER NOT NULL, first_at TEXT NOT NULL, locked_until TEXT, lock_level INTEGER NOT NULL DEFAULT 0);` keys `phone:<normalized>` and `ip:<ip>`. 5 failures in 15 minutes → lock 15 min; repeated locks double (15, 30, 60, max 240 min). The message stays generic (`تلاش‌های ناموفق زیاد بود. چند دقیقه بعد دوباره امتحان کنید.`) and never reveals whether the phone exists. A success clears the phone key. Admin endpoint `POST /api/admin/login-attempts/:key/unlock`. This sits **in addition to** the in-memory rate limiter from Phase 0 (it survives restarts).
**Done when:** tests with a fixed clock: lock, escalation, unlock after expiry, success clears, identical response for unknown phones.

---

## D — Audit, privacy, moderation

### 🔴 3.13: Append-only audit log
**Depends on:** 3.02
**Files:** new `src/server/db/migrations/056_audit_log.ts`, `src/server/services/audit.ts`, routes `admin.ts`, `src/components/AdminPanel.tsx`, `docs/portability-notes.md`, tests
**Do:**
- `CREATE TABLE audit_log (id TEXT PRIMARY KEY NOT NULL, actor_id TEXT, actor_role TEXT, action TEXT NOT NULL, entity_type TEXT, entity_id TEXT, before_json TEXT, after_json TEXT, ip TEXT, request_id TEXT, created_at TEXT NOT NULL); CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id); CREATE INDEX idx_audit_actor ON audit_log(actor_id, created_at);` and two SQLite triggers `audit_no_update` / `audit_no_delete` (`BEFORE UPDATE|DELETE ... SELECT RAISE(ABORT, 'audit_log is append-only')`). Record the triggers in `docs/portability-notes.md` (they must be recreated as a PG function + trigger in Phase 7).
- `audit.log(tx, { action, entityType, entityId, before?, after? })` is called **inside the same `db.tx`** as the change. Redaction: never store passwords, hashes, tokens, OTP codes; phones are masked.
- Events: login success/failure/lock, logout, password change/reset, OTP verification, verification decisions, transaction create/delete, contract changes, membership changes (accept/end), `is_admin`/`is_verified` changes, admin actions, account export/deletion, report handling.
- `GET /api/admin/audit?entity=&actor=&from=&to=&limit=` (admin only) and a table in the admin tab.
**Done when:** `UPDATE`/`DELETE` on `audit_log` fail (test); each listed event writes exactly one row; a rolled-back change leaves no audit row (test).

### 🟡 3.14: Privacy — terms, data export, account deletion
**Depends on:** 3.08, 3.13
**Files:** new `src/server/db/migrations/057_privacy.ts`, routes `me.ts`, `src/components/AuthPage.tsx`, new static pages `/terms` and `/privacy`, tests
**Do:**
- `ALTER TABLE users ADD COLUMN terms_accepted_at TEXT; ADD COLUMN terms_version TEXT; ADD COLUMN deleted_at TEXT;` Registration requires accepting the terms (checkbox, stored with version `2026-10`). `/terms` and `/privacy` are placeholder pages in Persian; the **owner/legal must supply the real text**.
- `GET /api/users/me/export` (rate limit 3/day): JSON with the profile, own requests/bookings, posts/comments, messages sent and received, transactions the user is related to, reviews.
- `DELETE /api/users/me` (requires the password or a fresh OTP): anonymize — name `کاربر حذف‌شده`, `phone = 'deleted-<id>'` (the column is `NOT NULL UNIQUE`), clear bio/avatar/cover/resume/email/social links, delete the user's uploaded files through the storage layer, revoke all sessions, set `deleted_at`; posts/comments/reviews are soft-deleted (3.15); bookings and ledger rows stay (they reference the anonymized user). A manager with active salon members gets 409 until the salon is closed or transferred. Both operations are audited.
**Done when:** tests: after deletion the user cannot log in, the old phone can register again, no personal field remains in `users`, ledger rows are intact; export contains only the caller's data.

### 🟡 3.15: Reports, soft delete and moderation
**Depends on:** 3.13
**Files:** new `src/server/db/migrations/058_moderation.ts`, repositories/routes `reports.ts`, `admin.ts`, components (post/comment menus), `AdminPanel.tsx`, tests
**Do:** `ALTER TABLE posts ADD COLUMN deleted_at TEXT; ALTER TABLE comments ADD COLUMN deleted_at TEXT; ALTER TABLE reviews ADD COLUMN deleted_at TEXT;` and `CREATE TABLE reports (id TEXT PRIMARY KEY NOT NULL, reporter_id TEXT NOT NULL REFERENCES users(id), entity_type TEXT NOT NULL CHECK(entity_type IN ('post','comment','user','review')), entity_id TEXT NOT NULL, reason TEXT NOT NULL, details TEXT, status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','dismissed','actioned')), handled_by TEXT REFERENCES users(id), handled_at TEXT, created_at TEXT NOT NULL);`. Every repository query for posts/comments/reviews filters `deleted_at IS NULL`. `POST /api/reports` (10/day per user, one open report per user+entity), admin list and actions `dismiss | hide` (hide = soft delete, audited). UI: a `گزارش` item in the post/comment menu and a reports queue in the admin tab.
**Done when:** a hidden post disappears from every list and from counts; reporting twice → 409; non-admin cannot list reports.

### 🟡 3.16: Text sanitation and markdown safety
**Depends on:** Phase 1 task 1.09
**Files:** `src/shared/schemas.ts` (`safeText(max)`), all schema users, `src/components/AIAssistant.tsx`, tests
**Do:** `safeText(max)`: trim, normalize to NFC, strip control characters and bidi-override/zero-width characters (U+200B–U+200F, U+202A–U+202E, U+2066–U+2069), collapse more than 3 consecutive newlines, enforce `max`. Audit `schemas.ts`: every free-text `z.string()` goes through `safeText` or has a comment explaining why not. Verify that `react-markdown` is used **without** `rehype-raw`, with a `urlTransform` allowing only `http`, `https`, `mailto`; external links get `rel="noopener noreferrer nofollow ugc"`.
**Done when:** tests: `[x](javascript:alert(1))` renders no `href`; `<script>` is displayed as text; a name containing U+202E is stripped; a 5000-char bio is rejected.

### 🔴 3.17: IDOR generator and security regression suite
**Depends on:** Phase 1 task 1.41
**Files:** new `tests/factories.ts`, `tests/idor.test.ts`, `tests/security.test.ts`, `tests/authz-matrix.json`
**Do:**
- `tests/factories.ts` maps each route that has an id parameter to a factory that creates the resource as persona A. `idor.test.ts` walks all routes (as in the authz matrix test) and, for each route with an id parameter, calls it with persona B (same role, different owner) expecting 403/404; **a route without a factory fails the test** (forces coverage when new routes are added).
- `security.test.ts`: mass assignment (extra fields such as `role`, `isAdmin`, `isVerified`, `isVip`, `salonId`, `status` are ignored on every create/update), enumeration (login/OTP/register give the same response for known/unknown phones where intended), no `access-control-allow-origin` header, security headers present, error responses leak nothing in production mode, JWT attacks (`alg: none`, tampered signature, expired, revoked `sid`), refresh reuse, upload attacks, rate limits.
**Done when:** both suites pass and are part of `npm test`; adding a route without a factory/matrix entry fails the gate.

### 🟢 3.18: Dependency and secret scanning in CI
**Files:** `.github/workflows/ci.yml`, new `.github/dependabot.yml`, `package.json`
**Do:** make `npm audit --omit=dev --audit-level=high` **blocking** (the Phase 0 step was non-blocking), add a `gitleaks` job (official action) scanning the repo, and configure Dependabot weekly updates for `npm` and `github-actions`. Document in the README how to handle an audit failure (update, or an explicit time-boxed exception in `docs/audit-exceptions.md`).
**Done when:** CI runs all three; a deliberately committed fake secret in a throwaway branch makes gitleaks fail (then remove it).

### 🔴 3.19: Phase 3 gate
Run on a fresh DB **and** on a copy of the `phase-2-done` DB:
- [ ] `npm run gate` passes, including `tests/idor.test.ts`, `tests/security.test.ts`, and the authz matrix.
- [ ] `db:snapshot` before/after: only new tables/columns; all pre-existing managers/artists are `is_verified = 1`.
- [ ] `grep -rn "localStorage" src` shows nothing auth-related; `grep -rn "hashSync\|compareSync" src` is empty.
- [ ] `grep -rn "SELECT\|INSERT\|UPDATE " src/server/routes src/server/services` is empty (no SQL outside repositories) and `grep -rnE "\`[^\`]*(SELECT|INSERT|UPDATE|DELETE)[^\`]*\\$\\{" src/server` is empty (no template-string SQL).
- [ ] Manual checklist (tick each): broken access control (matrix + IDOR green); crypto (HS256 pinned, secrets from env, no defaults); injection (parameterized only); insecure design (OTP limits, lockout, verification); misconfiguration (headers, error handler, no console/fake providers in production); vulnerable components (audit blocking); auth failures (sessions, refresh rotation, logout-all); integrity (migration checksums, audit log append-only); logging (audit events present); SSRF (the only outbound call is the AI provider).
- [ ] Release note about the forced one-time re-login is in the README; legal texts replaced by the owner (or the placeholders are clearly marked).
- [ ] Tag `phase-3-done`; ask the reviewer to check the repository before starting Phase 4.

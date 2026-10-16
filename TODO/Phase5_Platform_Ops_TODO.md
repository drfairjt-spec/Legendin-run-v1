# Legendin — Phase 5: Platform & Operations (TODO for free/local AI agents)

> **Read `00_Integrity_Rules_and_Roadmap.md` first.** One task at a time, one commit per task: `P5-5.NN: <title>`. Task text is English; user-facing strings stay Farsi.
> 🟢 safe · 🟡 review before merge · 🔴 sensitive. **Database engine stays SQLite.** Branch `phase-5`. Precondition: tag `phase-4-done`. Migrations in this phase use `070`–`089`.

**Goal:** make the app operable: validated config, structured logs, error tracking, health/metrics, pluggable file storage, a durable job queue, notifications, realtime updates, caching, containers, CI/CD with staging, **tested backups and a restore drill**, a load-test baseline, SQLite tuning and runbooks.

**Owner decisions needed before starting:** hosting provider and region (Iran-hosted vs abroad affects SMS, payments and latency), object-storage provider (S3-compatible), error-tracking provider (Sentry cloud or self-hosted), domain name and TLS approach. Task 5.05 and 5.21 are blocked until decided; use the local/dev adapters until then.

---

## A — Observability and config

### 🟢 5.01: Typed configuration
**Files:** new `src/server/config.ts`, every `process.env` reader, `.env.example`, tests
**Do:** one zod schema for the environment (`NODE_ENV`, `PORT`, `DB_PATH`, `DB_DRIVER` (only `sqlite` allowed for now), `JWT_SECRET`, `OTP_SECRET`, `APP_ORIGIN`, `SMS_*`, `BCRYPT_ROUNDS`, `STORAGE_DRIVER`, `LOG_LEVEL`, `SENTRY_DSN`, …). `loadConfig()` runs once at startup, prints a clear Persian-free English list of *all* problems, then exits 1. Production-only requirements (secrets length ≥ 32, no console/fake providers). Export a frozen `config`.
**Done when:** `grep -rn "process.env" src/server | grep -v config.ts` is empty; tests: missing secret in production → fails; dev defaults work.

### 🟡 5.02: Structured logging with request ids
**Files:** `package.json` (`pino`, `pino-http`), new `src/server/logger.ts`, `src/server/middleware/requestId.ts`, all `console.*` in `src/server`
**Do:** JSON logs in production, pretty in dev; `X-Request-Id` accepted (validated) or generated, echoed in the response, included in every log line and in error responses' logs (not bodies). Redact `authorization`, `cookie`, `password`, `otp`, `token`, phone numbers (mask). Log slow requests (> 1 s) as `warn`.
**Done when:** `grep -rn "console\.\(log\|error\|warn\)" src/server` is empty; a test checks redaction.

### 🟡 5.03: Error tracking
**Depends on:** 5.02
**Files:** `package.json` (`@sentry/node`, `@sentry/react`), `src/server/observability.ts`, `src/main.tsx`, `.env.example`
**Do:** initialise only when `SENTRY_DSN` is set; attach request id and user id (never phone/name); `beforeSend` scrubs bodies and headers; capture unhandled rejections and the Express error handler; frontend error boundary (4.19) reports with a release tag from the build (`git sha`). Upload source maps in CI only.
**Done when:** with a fake DSN pointing to a local mock server, a thrown error reaches the mock exactly once with scrubbed fields (test).

### 🟡 5.04: Health, readiness and metrics
**Depends on:** 5.02
**Files:** `src/server/routes/ops.ts`, `package.json` (`prom-client`), tests
**Do:** `GET /healthz` (process alive), `GET /readyz` (DB `SELECT 1`, migrations up to date, storage writable, queue worker heartbeat < 60 s), `GET /metrics` (Prometheus text: request count/latency histogram by route pattern and status class, DB query duration, job queue depth/failed, active sessions) — `/metrics` requires `Authorization: Bearer ${METRICS_TOKEN}` or an internal network allowlist. Route labels use the pattern (`/api/users/:id`), never the raw URL.
**Done when:** tests for each endpoint incl. 401 on `/metrics` without the token; readiness fails when the DB file is unreadable (simulate).

---

## B — Files, jobs, notifications

### 🔴 5.05: Storage driver abstraction (local + S3-compatible)
**Files:** new `src/server/storage/{index,local,s3}.ts`, `src/server/routes/uploads.ts`, `src/server/routes/files.ts`, `package.json` (`@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`), `.env.example`, tests
**Do:** `interface Storage { put(key, buffer, {contentType, private}): Promise<{key}>; get(key): Promise<Stream>; delete(key): Promise<void>; getUrl(key, {expiresIn?}): Promise<string> }`. `local` keeps today's directory layout (public under `/uploads`, private streamed through the authenticated route from P0-19). `s3` supports any S3-compatible endpoint (`S3_ENDPOINT`, `S3_BUCKET`, `S3_REGION`, keys from env); private objects are served by short-lived (5 min) presigned URLs after the same authorization check. Keys are generated server-side: `<category>/<yyyy>/<mm>/<uuid>.<ext>`; user-supplied names are never part of the key.
**Done when:** the same upload test suite passes against `local` and against a MinIO container (CI service); switching `STORAGE_DRIVER` needs no code change; existing URLs keep working (public `/uploads/...` mapping preserved).

### 🔴 5.06: Image pipeline and `files` table
**Depends on:** 5.05
**Files:** new `src/server/db/migrations/070_files.ts`, `src/server/services/images.ts`, uploads route, `package.json` (`sharp`), tests
**Do:** `CREATE TABLE files (id TEXT PRIMARY KEY NOT NULL, owner_id TEXT REFERENCES users(id), category TEXT NOT NULL, storage_key TEXT NOT NULL UNIQUE, content_type TEXT NOT NULL, size_bytes INTEGER NOT NULL, width INTEGER, height INTEGER, sha256 TEXT NOT NULL, is_private INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, deleted_at TEXT); CREATE INDEX idx_files_owner ON files(owner_id, created_at);`. For images: verify the real type with magic bytes (not the extension), strip EXIF/GPS, auto-rotate, resize to max 1600 px, convert to WebP (keep a 400 px thumbnail), reject images > 25 MP (decompression-bomb guard), per-user quota 200 MB. Upload responses add `{ id, url, thumbUrl }` (additive). Backfill: `scripts/index-existing-uploads.ts` registers existing files in `files` (no re-encoding).
**Done when:** tests: EXIF GPS is gone; a PHP file renamed `.jpg` is rejected; quota exceeded → 413; existing uploads are indexed.

### 🔴 5.07: DB-backed job queue and worker
**Files:** new `src/server/db/migrations/071_jobs.ts`, `src/server/jobs/{queue,worker,registry}.ts`, `scripts/worker.ts`, `package.json`, tests
**Do:** `CREATE TABLE jobs (id TEXT PRIMARY KEY NOT NULL, type TEXT NOT NULL, payload_json TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','running','done','failed','dead')), attempts INTEGER NOT NULL DEFAULT 0, max_attempts INTEGER NOT NULL DEFAULT 5, run_at TEXT NOT NULL, locked_by TEXT, locked_until TEXT, last_error TEXT, dedupe_key TEXT, created_at TEXT NOT NULL, finished_at TEXT); CREATE INDEX idx_jobs_ready ON jobs(status, run_at); CREATE UNIQUE INDEX ux_jobs_dedupe ON jobs(dedupe_key) WHERE dedupe_key IS NOT NULL AND status IN ('queued','running');`. Claiming: conditional `UPDATE ... WHERE id = ? AND status = 'queued'` with `changes === 1`, lock lease 60 s, exponential backoff (30 s, 2 min, 10 min, 1 h), then `dead`. Handlers are idempotent. The worker runs in-process by default (`WORKER_MODE=inline`) or as a separate process (`WORKER_MODE=external`, `npm run worker`). Admin: `GET /api/admin/jobs?status=` and `POST /api/admin/jobs/:id/retry`.
**Done when:** tests: a failing handler retries with backoff and ends `dead`; two workers never run the same job; a crash mid-job is recovered after the lease expires.

### 🟡 5.08: Notifications (in-app + SMS)
**Depends on:** 5.07, Phase 3 SMS provider
**Files:** new `src/server/db/migrations/072_notifications.ts`, `src/server/services/notifications.ts`, routes `notifications.ts`, `src/components/NotificationBell.tsx`, `src/context/NotificationsContext.tsx`, tests
**Do:** `CREATE TABLE notifications (id TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL REFERENCES users(id), type TEXT NOT NULL, title TEXT NOT NULL, body TEXT, link TEXT, read_at TEXT, created_at TEXT NOT NULL); CREATE INDEX idx_notifications_user ON notifications(user_id, read_at, created_at);` and `CREATE TABLE notification_prefs (user_id TEXT NOT NULL REFERENCES users(id), type TEXT NOT NULL, in_app INTEGER NOT NULL DEFAULT 1, sms INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (user_id, type));`. `notify(tx, userId, type, data)` inserts the in-app row inside the business transaction and enqueues an SMS job (if enabled by prefs) **after commit** via the queue. Events: new request, request accepted/declined/cancelled, booking reminder (24 h and 2 h before, via 5.09), leave decision, hiring offer, verification decision, new message, slot claimed. Persian templates in `templates.ts`. UI: bell with unread count, list, mark read, preferences page. SMS has a daily cap per user (5) and respects quiet hours 22:00–08:00 (+03:30) except OTP.
**Done when:** tests: accept a request → the client has one notification and one SMS job; rollback → none; prefs respected; quiet hours delay the SMS job.

### 🟡 5.09: Scheduled jobs with a leader lock
**Depends on:** 5.07
**Files:** new `src/server/db/migrations/073_scheduler_lock.ts`, `src/server/jobs/scheduler.ts`, tests
**Do:** `CREATE TABLE scheduler_locks (name TEXT PRIMARY KEY NOT NULL, locked_by TEXT, locked_until TEXT);` Only the holder of lock `scheduler` (lease 30 s, renewed) enqueues recurring jobs: `expire-slots` (every minute, replaces the on-read expiry from 2.16 but keep it as a fallback), `booking-reminders` (every 10 min), `cleanup-otp-and-sessions` (hourly), `cleanup-orphan-files` (daily; files unreferenced for 7 days), `purge-soft-deleted` (daily; 30-day retention), `backup` (daily trigger, see 5.17). Use `dedupe_key` per time bucket so a double fire is harmless.
**Done when:** with two scheduler instances only one enqueues (test); jobs fire with a fake clock.

### 🟡 5.10: Realtime updates over SSE
**Depends on:** 5.08
**Files:** `src/server/realtime/hub.ts`, `src/server/routes/events.ts`, `src/api/realtime.ts`, `src/hooks/useRealtime.ts`, tests
**Do:** `GET /api/events` (Server-Sent Events, authenticated via a one-time ticket from `POST /api/events/ticket` so the long-lived access token is not placed in a URL) emits small events (`request.updated`, `notification.created`, `message.created`, `slot.updated`) that carry **ids only**; the client reacts by refetching through `collectionEvents` (Phase 1). Heartbeat every 25 s, reconnect with backoff, one connection per tab, cap 3 connections per user. Single-process hub (document that multi-instance needs a broker — a Phase 7+ concern; add the note to `docs/scaling.md`).
**Done when:** Playwright with two browsers: the artist accepts, the client's inbox updates without reload within 2 s; connection closes on logout.

### 🟡 5.11: HTTP caching, compression, security of static files
**Files:** `src/server/app.ts`, `vite.config.ts`, tests
**Do:** gzip/brotli compression (`compression` or the reverse proxy; choose one and document), hashed assets `Cache-Control: public, max-age=31536000, immutable`, `index.html` `no-cache`, public API lists (`/api/salons`, `/api/discounted-slots`, services) with `ETag` + `Cache-Control: public, max-age=30, stale-while-revalidate=60`, anything authenticated `Cache-Control: no-store`, uploads `public, max-age=86400`.
**Done when:** header tests per category; a conditional request returns 304.

---

## C — Packaging and delivery

### 🟡 5.12: Dockerfile and docker-compose
**Files:** `Dockerfile`, `.dockerignore`, `docker-compose.yml`, `docker-compose.dev.yml`, `README.md`
**Do:** multi-stage build (deps → build → runtime on `node:22-slim`), non-root user, `HEALTHCHECK` on `/healthz`, `tini` as init, only production deps, volume for `/data` (SQLite) and `/uploads`. Compose services: `app`, optional `worker` (external mode), `minio` (dev), `mailhog`-style SMS console is not needed (console provider). Build args for the git sha.
**Done when:** `docker compose up` serves the app, seed works, data survives `docker compose restart`; image size < 400 MB; `docker run --read-only` works with the volumes.

### 🟡 5.13: Reverse proxy and TLS
**Files:** `deploy/Caddyfile` (or `deploy/nginx.conf`), `docs/deploy.md`
**Do:** Caddy (automatic TLS) in front of the app: HSTS, gzip/zstd, `X-Forwarded-*` handled (set Express `trust proxy` through config, **not** blindly), request body limit, timeouts, `/metrics` blocked from the public. Document the exact steps for a single VPS.
**Done when:** a staging deployment (or a local compose with a self-signed cert) passes an SSL check and the rate limiter sees real client IPs (test through the `X-Forwarded-For` of the proxy only).

### 🟡 5.14: CI pipeline (full)
**Files:** `.github/workflows/ci.yml`
**Do:** jobs: `lint+typecheck`, `unit+api tests`, `portability+deprecated checks`, `build`, `e2e (Playwright with traces on failure)`, `db: fresh + upgrade path` (migrate a committed `fixtures/db-phaseN.sqlite` to head), `docker build`, `audit+gitleaks` (3.18), `lighthouse` (4.23). Cache `node_modules` and Playwright browsers. Required checks on `main`.
**Done when:** the pipeline is green; a failing test blocks merge (verify once on a throwaway branch).

### 🔴 5.15: CD — staging then production
**Depends on:** 5.12, 5.13, 5.14
**Files:** `.github/workflows/deploy.yml`, `deploy/deploy.sh`, `docs/deploy.md`
**Do:** on tag `v*`: build and push the image to the registry, deploy to **staging**, run smoke tests (`/readyz` + a Playwright smoke), wait for manual approval, then deploy to **production** with: backup first (`db:backup`), migrations run by a one-shot command before the new container takes traffic, health-gated switch, automatic rollback to the previous image if `/readyz` fails for 2 minutes. Secrets only from the CI secret store.
**Done when:** a full dry run on staging succeeds, and a deliberately broken migration on staging triggers the rollback path (record in `docs/deploy.md`).

---

## D — Data safety and capacity

### 🔴 5.16: Backup automation
**Depends on:** 5.05, 5.09
**Files:** `scripts/backup.ts` (extends Phase 1 `db:backup`), `src/server/jobs/handlers/backup.ts`, `.env.example`, `docs/backup.md`
**Do:** daily consistent snapshot using SQLite `VACUUM INTO`/the online backup API (never copy the live WAL file), compress, encrypt with `age`/AES-256-GCM using `BACKUP_KEY` (kept outside the server), upload to a **different** storage location/provider than the primary, retention: 7 daily + 4 weekly + 6 monthly, write a manifest (size, sha256, schema version) and verify the upload by re-downloading and checking the hash. Uploaded files are synced to the backup bucket as well (S3 versioning or periodic sync).
**Done when:** the job creates, uploads and verifies a backup in staging; a corrupted backup is detected by the verification step (test).

### 🔴 5.17: Restore drill
**Depends on:** 5.16
**Files:** `scripts/restore.ts`, `docs/runbooks/restore.md`
**Do:** `npm run db:restore -- --from <backup> --to <path> --yes` (decrypt, verify checksum, integrity-check, run `db:check`); perform a real drill on a clean machine/container: restore the latest backup, start the app on it, run the smoke journeys. Record the measured **RPO** (max data loss ≈ backup interval) and **RTO** (time to restore) in the runbook with the date.
**Done when:** the drill is done and the numbers are written; a calendar reminder for a quarterly drill is noted in the runbook.

### 🟡 5.18: SQLite tuning and indexes
**Files:** new `src/server/db/migrations/074_indexes.ts`, `src/server/db/sqlite.ts`, `docs/db-tuning.md`
**Do:** set pragmas at connection time (WAL, `synchronous=NORMAL`, `busy_timeout=5000`, `foreign_keys=ON`, `cache_size`, `temp_store=MEMORY`); log queries slower than 100 ms in dev; use `EXPLAIN QUERY PLAN` on the 15 hottest queries (feed, requests by user, slots list, transactions by salon/date, bookings by artist/date, notifications) and add any missing composite indexes; verify there is no full scan on large tables. Add a periodic `PRAGMA wal_checkpoint(TRUNCATE)` and `PRAGMA optimize` job.
**Done when:** a test asserts `EXPLAIN QUERY PLAN` uses an index for each listed query (on the load-test dataset); `docs/db-tuning.md` lists the plans.

### 🟡 5.19: Load-test baseline (k6)
**Depends on:** 5.18, 5.11
**Files:** `loadtest/*.js`, `scripts/seed-load.ts`, `docs/perf-baseline.md`
**Do:** scenarios: anonymous browsing (feed/salons/slots), authenticated client (login, request, claim), manager finance writes, mixed 80/15/5. Dataset: 5k users, 50k posts, 200k transactions. Targets: p95 < 300 ms for reads, < 600 ms for writes at 50 virtual users, error rate < 0.5 %. Save the raw results and the machine description. **This baseline is what Phase 7 compares against.**
**Done when:** `docs/perf-baseline.md` is committed with numbers; the scenarios run from one command (`npm run load`).

### 🟡 5.20: Rate-limit and abuse tuning on measured traffic
**Files:** `src/server/middleware/rateLimit.ts`, `docs/limits.md`
**Do:** per-route limits table (auth, OTP, upload, AI, create-post, search), keyed by user id when authenticated else IP; the AI endpoint gets a daily per-user budget stored in the DB (`ai_usage` table in migration `075`) so costs are bounded; return `429` with `Retry-After` and a Persian message.
**Done when:** tests for each limit class; the AI daily cap works across restarts.

### 🟡 5.21: Runbooks and operational docs
**Files:** `docs/runbooks/{deploy,rollback,restore,incident,secrets-rotation,on-call}.md`, `docs/architecture.md`, `docs/scaling.md`
**Do:** short, step-by-step, copy-pasteable. Include: rotating `JWT_SECRET`/`OTP_SECRET`/`BACKUP_KEY` (what logs everyone out), what to do when SMS fails, when a migration fails, when the disk is full, how to read logs by request id, and an architecture diagram (Mermaid) with all components. `docs/scaling.md` lists the known single-node limits (SSE hub, in-process worker, SQLite single writer) and the trigger metrics for moving on.
**Done when:** a person who did not write the code follows `deploy.md` and `rollback.md` on staging successfully (record who/when).

### 🔴 5.22: Phase 5 gate
Fresh DB **and** a copy of the `phase-4-done` DB:
- [ ] `npm run gate` and the full CI pipeline are green; staging deployed from a tag; production-mode startup fails on bad config (test).
- [ ] `grep -rn "process.env" src/server | grep -v config.ts` empty; `grep -rn "console\." src/server` empty; no SQL outside repositories/migrations (`check:portability`).
- [ ] Backup → restore drill performed, RPO/RTO documented.
- [ ] `docs/perf-baseline.md` committed (needed by Phase 7).
- [ ] `/readyz` fails when the worker heartbeat stops (manual test); `/metrics` protected.
- [ ] `db:snapshot` diff: only the new tables (`files`, `jobs`, `notifications`, `notification_prefs`, `scheduler_locks`, `ai_usage`) and indexes.
- [ ] Tag `phase-5-done`; ask the reviewer to check the repository before Phase 6.

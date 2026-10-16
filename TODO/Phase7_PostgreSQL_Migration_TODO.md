# Legendin — Phase 7: SQLite → PostgreSQL Migration (LAST PHASE)

> **Read `00_Integrity_Rules_and_Roadmap.md` first.** One task at a time, one commit per task: `P7-7.NN: <title>`. Task text is English; user-facing strings stay Farsi.
> 🟢 safe · 🟡 review before merge · 🔴 sensitive. Branch `phase-7`. Precondition: tag `phase-6-done` **and** every earlier phase gate passed. Migrations for PostgreSQL live in `src/server/db/pg/` (a fresh baseline), SQLite migrations are frozen.

**Goal:** change the database engine with **zero behaviour change**, proven by evidence: the whole test suite runs on both drivers, data is migrated with verified counts/checksums/invariants, read and write parity harnesses pass, performance is not worse than the Phase 5 baseline, two full rehearsals succeed, and a tested rollback exists.

**Why this is last:** by now all SQL sits in repositories behind the async `Db` interface, SQL is portable (banned-pattern gate), ids and timestamps are app-generated, money is integer, deprecated columns are already unused. The swap is therefore mechanical and verifiable.

**Phase rules:**
- **No feature work, no schema redesign** in this phase. The only schema differences from SQLite are the ones listed in 7.05.
- The SQLite driver stays fully working until task 7.27; `DB_DRIVER=sqlite|postgres` selects the engine and the default stays `sqlite` until the production cutover (7.25).
- Never run a rehearsal or test against the production PostgreSQL database. Never run the import against a non-empty target without `--yes --wipe`.
- Take a verified SQLite backup (`db:backup`, checksummed) before every rehearsal and before the cutover.

---

## A — Decisions and environment

### 🔴 7.01: Pre-flight audit of the code base
**Files:** `docs/pg-preflight.md` (report only)
**Do:** produce a report (no code change): (1) `npm run check:portability` result (must be 0 findings); (2) list every file under `src/server` that imports `better-sqlite3` (must be only `src/server/db/sqlite.ts` and scripts); (3) list every SQL statement containing `LIKE`, `ORDER BY` without a tie-breaker, `GROUP BY`, `CASE`, `COALESCE`, `||`, `CAST`, date arithmetic or JSON handling (to be reviewed in 7.10); (4) list columns holding booleans (0/1), JSON text, ISO timestamps; (5) table list with row counts and sizes from `db:snapshot`; (6) triggers and partial indexes from `docs/portability-notes.md`.
**Done when:** the report exists; any portability finding becomes a fix task *before* continuing (fix in its own commit on the SQLite driver; gate must stay green).

### 🔴 7.02: Owner decisions — hosting and operations
**Files:** `docs/pg-decisions.md`
**Already decided by the owner (2026-10-16): the final database is PostgreSQL.** Because hosting is Iran-side (see Phase 5 header), the default recommendation is a PostgreSQL on the same Iranian provider (managed if available, otherwise self-hosted on a dedicated VPS with `pgBackRest`/`wal-g` WAL archiving to the second storage location); the owner confirms below.
**Do:** the owner fills in (task blocked until complete): managed PostgreSQL provider vs self-hosted, region (latency to the app server, data-residency rules), PostgreSQL version (use a currently supported major, e.g. 16 or newer), instance size, storage size, **backup/PITR policy and retention**, high-availability need (replica or single node), connection pooling (PgBouncer/provider pooler), maintenance window for the cutover, acceptable downtime (target: < 15 minutes), who approves go/no-go, who is on call during the cutover.
**Done when:** the file is signed off by the owner with date.

### 🟡 7.03: Local PostgreSQL for development and CI
**Files:** `docker-compose.dev.yml`, `.github/workflows/ci.yml`, `package.json`, `.env.example`, `README.md`
**Do:** add a `postgres` service (same major version as production), `DATABASE_URL`, `PG_POOL_MAX`, `PG_SSL` to config (5.01 schema, only required when `DB_DRIVER=postgres`); `npm run pg:up` / `pg:down` / `pg:reset` (dev only, guarded by `NODE_ENV !== 'production'` and `--yes`); CI gets a Postgres service container.
**Done when:** `npm run pg:up` gives an empty database reachable by `psql`; CI job has it available.

---

## B — Driver and schema

### 🔴 7.04: PostgreSQL driver implementing `Db`
**Depends on:** 7.03
**Files:** new `src/server/db/postgres.ts`, `src/server/db/index.ts`, `package.json` (`pg`), tests
**Do:** implement `Db` with `pg.Pool`: convert `?` placeholders to `$1…$n` (a small tokenizer that ignores `?` inside string literals), `all/get/run` (`run().changes` = `rowCount`), `tx()` uses a dedicated client with `BEGIN … COMMIT/ROLLBACK`, nested `tx` → savepoints. Type parsers: `int8` → JS number (throw if outside the safe integer range), `numeric` → number only for known money-free columns (money columns are `bigint`), `timestamptz` → **ISO string** (to keep API shapes identical), booleans mapped in repositories. Statement timeout (`statement_timeout=15s`), `application_name`, pool error handling with logging, graceful `pool.end()` on shutdown, readiness check uses `SELECT 1`. `dialect: 'postgres'`.
**Done when:** a driver conformance test (the same file runs on both drivers): placeholders, bigint round-trip, ISO timestamps, rollback on error, nested savepoints, `changes` semantics.

### 🔴 7.05: PostgreSQL baseline schema
**Depends on:** 7.04
**Files:** new `src/server/db/pg/migrations/0001_baseline.sql` (or TS), `src/server/db/pg/runner.ts`, `docs/pg-schema-differences.md`
**Do:** write the schema **fresh** (not by replaying SQLite migrations) representing the *final* SQLite state **without deprecated columns** (`deprecated-columns.json`) and with these allowed differences (all documented in `pg-schema-differences.md`): `snake_case` identifiers everywhere (e.g. `isVip`-style legacy names become `is_vip`) with the repository mappers already producing camelCase; `INTEGER 0/1 booleans` → `boolean`; money and counters → `bigint`; ISO text timestamps → `timestamptz` (stored UTC) — **or** keep `text` for ISO if the owner prefers zero-conversion (decide in the doc and apply to all columns uniformly); JSON text → `jsonb`; id columns `text`; all foreign keys, `CHECK` constraints, unique and partial indexes recreated; `ux_*` partial indexes use `WHERE`; SQLite triggers (`audit_log` append-only, `payment_events` append-only, `transactions` immutability) recreated as PL/pgSQL functions + triggers; `bookings` gets `EXCLUDE USING gist` (needs `btree_gist`) preventing overlapping confirmed bookings per artist (in addition to the application check); `citext`/`pg_trgm` extensions only if the owner approves (default: no, use `LOWER()`).
Runner: forward-only numbered migrations with checksums in `schema_migrations` (same rules as 1.07).
**Done when:** the baseline applies to an empty database; `pg_dump --schema-only` is committed as `docs/pg-schema.sql`; a script `scripts/schema-diff.ts` compares table/column lists between SQLite and PG (mapped names) and prints only the **documented** differences.

### 🔴 7.06: Repository dialect audit and fixes
**Depends on:** 7.05
**Files:** `src/server/repositories/*.ts`, `src/server/db/dialect.ts`, tests
**Do:** go through the list from 7.01(3): fix anything that behaves differently without changing SQLite behaviour — case-insensitive search (`LOWER(col) LIKE LOWER(?)`), `ORDER BY` determinism, `GROUP BY` strictness (every selected column aggregated/grouped), integer division, `COALESCE` types, boolean reads/writes via mapper helpers `toDbBool()/fromDbBool()` (driver aware through `db.dialect`), JSON via `toDbJson()/fromDbJson()` (text on SQLite, jsonb on PG), `NULL` ordering (`NULLS LAST` explicit where it matters), `LIMIT/OFFSET` bounds, reserved words quoted (`user`, `order`, `group`, `end`, `end_at`…), and date comparisons on ISO strings vs `timestamptz` (compare `timestamptz` to parameter casted `::timestamptz` in the PG branch of `dialect.ts`). Engine-specific snippets live **only** in `dialect.ts` helper functions; repositories call helpers.
**Done when:** `check:portability` is still zero; the SQLite suite is green; a new grep gate `check:dialect` forbids `db.dialect ===` outside `src/server/db/**`.

### 🟡 7.07: Collation, ordering and text-fidelity tests
**Depends on:** 7.06
**Files:** `tests/db-fidelity.test.ts`
**Do:** the same test on both drivers: Persian text round-trip (ZWNJ U+200C, Arabic vs Persian `ي/ی` and `ك/ک` are stored **as given**, no normalization surprises), emoji, very long text, `LOWER()` on Latin, ordering of Persian names with the explicit rule chosen in `docs/pg-schema-differences.md` (default: order by `created_at, id`; for names, order in the application when a locale-specific order is required), numeric precision of bigint money, ISO timestamp round-trip identical to the millisecond.
**Done when:** passes on both drivers; any difference is either fixed or written in the differences doc with the owner's approval.

---

## C — Two drivers, one test suite

### 🔴 7.08: Run the entire test suite on both drivers
**Depends on:** 7.06
**Files:** `tests/helpers/db.ts`, `package.json`, CI
**Do:** the test helper creates an isolated database per test file: SQLite temp file, or a PG database `test_<random>` (created from a template database prepared once with the baseline) and drops it after. `npm test` runs with `DB_DRIVER=sqlite`; `npm run test:pg` runs the **same files** with `DB_DRIVER=postgres`. No test may be skipped for one driver without a written reason in `docs/pg-skipped-tests.md` approved by the reviewer. Fix failures at the repository/dialect level, never by editing assertions.
**Done when:** both commands pass; the skip list is empty or justified.

### 🔴 7.09: Concurrency tests on both drivers
**Depends on:** 7.08
**Files:** `tests/concurrency/*.test.ts`
**Do:** 20 parallel attempts each for: accept overlapping bookings for one artist (one wins), claim one slot, complete one booking (one income), payment callback replay, refund over-limit, like/unlike, accept hiring offer, OTP verify. Plus a deadlock/serialization check: PG transactions retried on `40001/40P01` (wrapper `db.tx` retries up to 3 times with jitter **only** for those codes and only when the callback is marked idempotent).
**Done when:** passes on both drivers 10 times in a row; the PG exclusion constraint is exercised directly (insert overlapping rows via SQL → error).

### 🟡 7.10: Authz matrix, IDOR, security and e2e on PostgreSQL
**Depends on:** 7.08
**Files:** CI workflow, `playwright.config.ts`
**Do:** run the authz matrix, `idor`, `security` suites and the **Playwright journeys** against the app started with `DB_DRIVER=postgres` (seeded). Add a CI matrix `db: [sqlite, postgres]` for the full `npm run gate`.
**Done when:** both matrix legs are green on the same commit.

---

## D — Data migration tooling

### 🔴 7.11: Export from SQLite (NDJSON + manifest)
**Files:** new `scripts/migrate/export-sqlite.ts`, `docs/migration/format.md`
**Do:** read-only connection; in dependency order (parents before children, from a table list generated from the schema), stream each table to `export/<table>.ndjson` (one JSON object per line with **raw SQLite values**, bigints as strings, no lossy conversions) and write `manifest.json`: table → rowCount, sha256 of the file, column list, SQLite schema version, export timestamp, `max(rowid)`-free (no rowid dependence). The export runs against a **snapshot copy** (`VACUUM INTO`) so the live DB is not locked for long. Refuses to overwrite an existing export directory without `--yes`.
**Done when:** export of the seeded DB and of the production-size load dataset (5.19) completes; re-export of the same snapshot gives identical hashes.

### 🔴 7.12: Import into PostgreSQL with type conversion
**Depends on:** 7.05, 7.11
**Files:** new `scripts/migrate/import-pg.ts`, `scripts/migrate/transform.ts`, tests
**Do:** requires an **empty** schema (checks every table has 0 rows; `--wipe --yes` truncates); one transaction per table batch (1,000–5,000 rows via multi-row `INSERT` or `COPY FROM STDIN` for large tables), constraints deferred (`SET CONSTRAINTS ALL DEFERRED` where FKs are `DEFERRABLE`, otherwise import in dependency order); `transform.ts` maps per column: `0/1 → boolean`, JSON text → `jsonb` (invalid JSON is reported with table/id, not silently dropped), ISO → `timestamptz`, strings with NUL bytes (not allowed in PG) reported, snake_case column names mapped from the SQLite names, deprecated columns skipped; resumable by table; a progress log; at the end `ANALYZE` all tables and reset any sequences (none expected as ids are text). Disable audit/immutability triggers **only for the import session** via `SET session_replication_role = replica` (needs privileges; document), then re-enable and verify the triggers exist (`pg_trigger` query).
**Done when:** import of the seeded DB passes; unit tests for every transform (boolean, JSON, timestamps, NUL, invalid JSON).

### 🔴 7.13: Verification — counts, checksums, orphans, invariants
**Depends on:** 7.12
**Files:** new `scripts/migrate/verify.ts`, `docs/migration/verify.md`
**Do:** checks, each producing a pass/fail line and a nonzero exit on failure: (1) row counts per table equal the export manifest; (2) **content checksums** per table: for each table compute `sha256` over rows ordered by primary key using a canonical serialization (same column order, booleans as `0/1`, JSON re-serialized with sorted keys, timestamps as ISO UTC with milliseconds) on both sides and compare; (3) FK orphan queries for every FK return 0; (4) sums of money columns per table equal (`SUM(amount)` etc.); (5) `verifyDomainInvariants` (2.25) and the payments reconciliation (6.17) run on PG with zero findings; (6) every unique index/constraint exists (`pg_indexes` vs `docs/pg-schema.sql`); (7) triggers present; (8) text samples: 1,000 random rows per text-heavy table compare byte-equal.
**Done when:** verify passes on the seeded DB and on the load dataset; deliberately corrupting one value in PG makes (2) fail (test).

### 🟡 7.14: Read-parity harness
**Depends on:** 7.13
**Files:** new `scripts/migrate/parity-read.ts`
**Do:** start two app instances on the same logical data (SQLite original, PG imported) and replay a fixed list of read requests (all GET endpoints for every persona, with paging variations; list from the authz matrix) comparing status codes and JSON bodies after normalizing known-volatile fields (`createdAt` generated at request time, ordering ties documented). Output a diff report.
**Done when:** zero unexplained differences on the seeded DB and on a copy of the staging DB.

### 🔴 7.15: Write-parity harness
**Depends on:** 7.14
**Files:** new `scripts/migrate/parity-write.ts`
**Do:** replay a scripted sequence of write flows (register → request → accept → cancel → slot claim → complete → review → post/like → leave → hiring → payment with Fake provider → refund → payout) against both instances with identical injected ids/clock (`APP_CLOCK` and id seed test hooks, available only in `NODE_ENV=test`), then compare: all API responses, and a **full-database canonical dump** of both (same canonicalization as 7.13).
**Done when:** the final dumps are identical; any difference is root-caused and fixed (in repositories/dialect), not ignored.

### 🟡 7.16: Performance comparison with the Phase 5 baseline
**Depends on:** 7.15
**Files:** `loadtest/*`, `docs/pg-perf.md`
**Do:** run the k6 scenarios from 5.19 against the PG-backed app with the same dataset and comparable hardware; capture p50/p95/p99 and error rate; run `EXPLAIN (ANALYZE, BUFFERS)` for the 15 hot queries from 5.18 and add missing indexes in a PG migration `0002`. Tune the pool (`PG_POOL_MAX`) and verify no connection exhaustion at 50 VUs. Acceptance: p95 not worse than the SQLite baseline by more than 10 % for reads and not worse for writes at 50 VUs; no query with a sequential scan on large tables where an index exists.
**Done when:** `docs/pg-perf.md` has the comparison table and the owner accepts it.

---

## E — Operations on PostgreSQL

### 🟡 7.17: Backup, PITR and restore drill for PostgreSQL
**Depends on:** 7.02
**Files:** `scripts/pg-backup.ts` (`pg_dump -Fc` + encryption + off-site upload, reusing 5.16), `docs/runbooks/pg-restore.md`
**Do:** daily logical dump (compressed, encrypted, uploaded to the separate store) **plus** the provider's PITR/WAL archiving as configured in 7.02; retention as before; restore script `pg:restore -- --from <dump> --to <db> --yes`; perform a real restore drill into a scratch database, run `verify.ts` checks 3,5,6,7 and the smoke journeys on it; record RPO/RTO.
**Done when:** the drill is done and documented; a PITR recovery to a chosen timestamp is performed once on staging.

### 🟡 7.18: Database roles, SSL and least privilege
**Files:** `docs/pg-security.md`, `deploy/pg-roles.sql`
**Do:** roles: `legendin_owner` (migrations only), `legendin_app` (DML on app tables, no DDL, no superuser, no `session_replication_role`), `legendin_readonly` (reports), `legendin_backup`. Enforce TLS (`sslmode=verify-full`), restrict network access to the app hosts, rotate passwords through the secret store, set `statement_timeout`, `idle_in_transaction_session_timeout`, and `log_min_duration_statement`. The app runs migrations with the owner role in a one-shot step and serves with the app role.
**Done when:** the app works with the least-privileged role in staging; an attempt to `DROP TABLE` as `legendin_app` fails.

### 🟡 7.19: Observability for PostgreSQL
**Depends on:** 7.04
**Files:** `src/server/routes/ops.ts`, metrics, `docs/runbooks/pg-incident.md`
**Do:** `/readyz` checks pool + a `SELECT 1` with timeout; metrics: pool total/idle/waiting, query duration histogram per repository method, transaction retries (40001/40P01), slow queries logged with the request id; enable `pg_stat_statements` on the server and document the top-queries review; alerts: connections > 80 %, replication lag (if a replica), disk > 80 %, long-running transactions > 60 s.
**Done when:** metrics visible in the staging dashboard; the runbook covers pool exhaustion, lock contention, disk full, failover.

---

## F — Rehearsals, cutover, rollback

### 🔴 7.20: Rollback path — reverse export (PostgreSQL → SQLite)
**Depends on:** 7.13
**Files:** new `scripts/migrate/export-pg.ts`, `scripts/migrate/import-sqlite.ts`, `docs/migration/rollback.md`
**Do:** the reverse of 7.11/7.12: export PG to NDJSON (booleans → 0/1, jsonb → text, timestamps → ISO) and import into a **new** SQLite file using the frozen SQLite migrations to create the schema (including the deprecated columns left empty/NULL; the app no longer reads them). Verify with the same canonical checksum approach (on shared columns). Test the loop: SQLite → PG → SQLite gives a DB whose canonical dump equals the original (on shared columns).
**Done when:** the round-trip test passes on the seeded DB and the load dataset; rollback timing is measured and written in the runbook.

### 🔴 7.21: Maintenance mode and write-freeze
**Files:** `src/server/middleware/maintenance.ts`, `.env.example`, UI banner `src/components/MaintenanceBanner.tsx`, tests
**Do:** `MAINTENANCE_MODE=read-only|off|full`: in `read-only` all non-GET `/api` requests (except health) get `503` + `Retry-After` and a Persian message `سیستم در حال به‌روزرسانی است؛ لطفاً چند دقیقه بعد تلاش کنید`; background workers and the scheduler stop enqueuing/running money-moving or write jobs; SSE stays open; payment callbacks are accepted and **queued** for processing after the cutover (stored in a small file/queue table in the SQLite DB and replayed to PG). `full` serves a static maintenance page. The mode can be toggled without redeploy (signal or admin endpoint with the metrics token).
**Done when:** tests: writes blocked, reads work, callback during maintenance is stored and replayed once; the UI shows the banner.

### 🔴 7.22: Rehearsal #1 (staging)
**Depends on:** 7.13–7.21
**Files:** `docs/migration/rehearsal-1.md`
**Do:** on staging with a **recent copy of production data**: put the app into read-only mode → backup → export → import → verify → switch `DB_DRIVER=postgres` → run smoke journeys → run read/write parity (on a copy) → measure each step's duration → rollback drill (switch back to SQLite from the reverse export) → record everything with timestamps, problems and fixes in the report.
**Done when:** every verify check passed, total write-freeze time is known, rollback proven; all problems found are fixed by commits and listed.

### 🔴 7.23: Cutover runbook
**Files:** `docs/migration/cutover-runbook.md`
**Do:** a numbered, copy-pasteable checklist with owners and expected durations: T-7 days (freeze schema changes, announce maintenance, final dependency freeze), T-1 day (backup drill, verify PG backup/PITR, confirm on-call), T-0: (1) announce, (2) `MAINTENANCE_MODE=read-only`, (3) wait for in-flight jobs to drain (`jobs` queue empty), (4) verified backup, (5) export, (6) import, (7) `verify.ts` — **go/no-go gate: any failure = abort and re-enable writes on SQLite**, (8) deploy with `DB_DRIVER=postgres`, (9) smoke journeys + reconciliation, (10) lift maintenance, (11) watch dashboards for 2 h; plus the **abort criteria** and the **rollback procedure** (7.20) with the point after which rollback means data loss (writes accepted on PG) and how to export those writes back.
**Done when:** a person who did not write it performed the dry run in rehearsal #2 using only this document.

### 🔴 7.24: Rehearsal #2 (staging, using only the runbook)
**Depends on:** 7.23
**Files:** `docs/migration/rehearsal-2.md`
**Do:** repeat 7.22 following **only** the runbook by someone else (or the owner), with fresh production-copy data, including a simulated failure at verify (inject a corrupt row) to practice the abort path. Compare timings with rehearsal #1.
**Done when:** completed without deviations from the runbook (or the runbook is corrected and the rehearsal repeated); the owner signs go/no-go for production.

### 🔴 7.25: Production cutover
**Depends on:** 7.24 and the owner's written go
**Files:** `docs/migration/cutover-log.md`
**Do:** execute the runbook. Keep the SQLite file, the export directory, and the reverse-export tooling untouched for rollback. Write the actual timeline in the log (timestamps, who, outcomes, verify output attached). After lifting maintenance: run reconciliation (6.17), `verify.ts` read-only checks, and compare key business counters with the pre-cutover numbers (users, bookings, transactions sum, active subscriptions).
**Done when:** all post-cutover checks are green and no Sev1/2 incident for 2 hours; log committed.

### 🟡 7.26: Post-cutover hardening
**Depends on:** 7.25
**Files:** config, `docs/runbooks/*`
**Do:** switch the default `DB_DRIVER` to `postgres` in `.env.example`/config; enable `pg_stat_statements` review weekly for a month; verify backups and PITR ran on schedule; verify the app role has no excess privileges; add the PG `EXPLAIN` regression test for the hot queries; update `docs/architecture.md`, `docs/scaling.md` (read replica option, pooler, SSE broker need now that Postgres exists: `LISTEN/NOTIFY` or Redis), README and all runbooks to say PostgreSQL.
**Done when:** docs updated; first week of metrics reviewed and recorded.

### 🟡 7.27: Decommission SQLite (after a 30-day soak)
**Depends on:** 7.26 and 30 calendar days without rollback need
**Files:** `src/server/db/sqlite.ts` (removed), `package.json` (remove `better-sqlite3` from production dependencies; keep it as a **dev** dependency for the migration tooling), CI matrix, `scripts/`, docs
**Do:** remove the SQLite driver from the runtime path, the `DB_DRIVER` switch, SQLite-only tests and the CI SQLite leg; keep `scripts/migrate/*` and the frozen SQLite migrations in `legacy/sqlite/` (documented, read-only); archive the final SQLite file and the last export encrypted in cold storage with the checksum recorded; update `check:portability` (now PG-only rules may be relaxed — but keep the gate for repository-only SQL) and remove the portability notes that no longer apply; optional Phase 7+: PostgreSQL-only features (below).
**Done when:** the build and all tests pass with PG only; `grep -rn "better-sqlite3" src` is empty; archive stored and verified.

### 🟢 7.28 (optional, after 7.27): PostgreSQL-native improvements — each as its own task with its own tests
- Row-level security as a second tenant-isolation layer: policies on salon-scoped tables using `current_setting('app.salon_ids')` set per transaction; keep application checks.
- Full-text search (`tsvector` with a Persian-aware configuration or `pg_trgm` for fuzzy salon/artist search).
- Partitioning for `audit_log` and `notifications` by month.
- `LISTEN/NOTIFY` as the broker for SSE across multiple app instances.
- Read replica for reporting endpoints.

### 🔴 7.29: Phase 7 gate (final)
- [ ] `npm run gate` green on the PG-only code path (after 7.27) and on both legs before that; CI matrix green.
- [ ] Verification evidence attached: export manifest, import log, `verify.ts` output (counts, checksums, orphans, invariants), read-parity and write-parity reports, perf comparison, both rehearsal reports, signed go/no-go, cutover log.
- [ ] Rollback tooling tested (7.20) and the archive of the final SQLite file stored.
- [ ] `grep -rn "better-sqlite3" src` empty; `grep -rniE "sqlite" src/server | grep -v "legacy/"` shows no runtime reference; `grep -rn "db.dialect ===" src | grep -v "src/server/db"` empty.
- [ ] Backups, PITR, restore drill, alerts, least-privilege roles verified.
- [ ] README/architecture/runbooks describe PostgreSQL only.
- [ ] Tag `phase-7-done` — the platform is now on its final database engine.

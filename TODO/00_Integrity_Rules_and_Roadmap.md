# Legendin — Integrity Rules & Roadmap (read before ANY phase file)

> This file applies to **Phases 1–7**. Every phase file says "read `00_Integrity_Rules_and_Roadmap.md` first". The point of this file: **the app must keep working after every single task**, and the database engine change (SQLite → PostgreSQL) happens **last**, when everything else is stable and the code is already portable.
> 🟢 = safe/independent · 🟡 = needs review before merging · 🔴 = architecturally sensitive, review carefully.

## 1. Roadmap

| Phase | File | Goal | DB engine |
|---|---|---|---|
| 0 | `Phase0_Security_and_Integrity_TODO.md` | Close security holes, fix NULL ids, lock the API | SQLite |
| 1 | `Phase1_Single_Source_of_Truth_TODO.md` | Server becomes the only source of truth (no more localStorage data), repositories, shared types, client data layer | SQLite |
| 2 | `Phase2_Domain_Model_TODO.md` | Real salons, memberships, bookings, state machines, atomic business rules | SQLite |
| 3 | `Phase3_Identity_Trust_Audit_TODO.md` | OTP, verification/admin, sessions, audit log, privacy | SQLite |
| 4 | `Phase4_Frontend_UX_TODO.md` | Router, component split, a11y, performance, PWA, SEO, CSP | SQLite |
| 5 | `Phase5_Platform_Ops_TODO.md` | Config, logging, storage abstraction, queue, notifications, Docker, CI/CD, backups | SQLite |
| 6 | `Phase6_Payments_Ledger_TODO.md` | Payment-provider abstraction, VIP subscriptions, immutable ledger | SQLite |
| 7 | `Phase7_PostgreSQL_Migration_TODO.md` | **Last:** SQLite → PostgreSQL with verified parity, rehearsals, rollback | **PostgreSQL** |

Rules of the roadmap:
- A phase starts only after the previous phase's **Phase Gate** (section 3) passed and the owner (or the reviewer) said so. Tag the repo `phase-N-done` at that point.
- Database **schema** changes (new tables/columns) still happen in Phases 1–6 because features need them, but always through numbered migrations on SQLite (expand → migrate → contract). Only the **engine swap** is deferred to Phase 7.
- Phases 1–6 write all SQL in a portable way (section 8) so that Phase 7 is mechanical.

## 2. Task Gate (run after EVERY task, before the commit)

```bash
npm run build          # must pass
npm test               # API/unit tests, must pass (never delete or weaken a failing test to make it pass)
npm run db:check       # integrity script from Phase 0 (P0-06), must exit 0
npm run check:portability   # exists from Phase 1 task 1.02
npm run e2e            # Playwright smoke, exists from Phase 1 task 1.04
```
From Phase 1 task 1.04 on, `npm run gate` runs all of the above in order. If a command does not exist yet in the phase you are in, skip only that one.

Manual smoke (5 minutes, whenever a task touches UI or API behaviour), with the dev seed accounts:
1. Guest: feed loads, salons/artists visible, discounted slots visible, no phone numbers shown anywhere.
2. Client: login, send a request to an artist, see discounted slots.
3. Artist: accept/decline a request, see earnings, edit own profile.
4. Manager: add a transaction, open staff management, send a hiring offer.
5. Reload the page: data is still there (it comes from the server). Open the app in a second browser as another user: the data created by the first user is visible to the right people only.

## 3. Phase Gate (before tagging `phase-N-done`)

- [ ] Task Gate passes on a **fresh** database (`rm` the DB, start server, seed) **and** on a copy of the previous phase's database (upgrade path).
- [ ] `npm run db:snapshot` before and after the phase; the diff contains only intended changes (new tables/columns/rows). Save both snapshots outside git.
- [ ] Every new route is listed in the authz matrix test (`tests/authz-matrix.*`, created in Phase 1) with expected status per role.
- [ ] README "Known limitations" and `.env.example` updated for what changed.
- [ ] `NOTES.md` has no unresolved item (each is either done or moved to the next phase's list with a reason).
- [ ] The owner/reviewer ran the manual smoke and the phase's own checklist (end of each phase file).

## 4. Vertical-slice rule

Each task leaves the app **working end-to-end**: if you add an endpoint the frontend needs, the frontend change that uses it is in the **same task** (or the task says explicitly that the endpoint is unused until task N, and N is the next task). Never leave the frontend calling an endpoint that does not exist, or the server returning a shape the frontend cannot read.

## 5. Expand → Migrate → Contract (schema changes)

Never rename, drop or change the meaning of a column in one step.
1. **Expand** (task A): add the new table/column (nullable or with a default). Old code keeps working. Nothing reads it yet.
2. **Migrate** (task B): backfill old data into the new structure with an idempotent migration + a verification script; write to **both** old and new inside the same DB transaction; switch reads to the new structure behind the repository.
3. **Contract** (task C, later, after the Phase Gate or after a soak period): stop writing the old structure; add it to the deprecated list checked by `npm run check:deprecated` (a grep gate that fails if code still references it). Physical removal of deprecated SQLite columns happens for free in Phase 7, because the PostgreSQL baseline schema is written without them. If a column must be physically dropped earlier, use the SQLite table-rebuild procedure (see Phase 1 task 1.07).

Migrations are **forward-only** and **never edited after they were applied anywhere** (the runner stores a checksum and refuses to start if an applied migration changed). Before running a new migration on real data: `npm run db:backup`.

## 6. API compatibility rules

- Response changes are **additive** until the only consumer (the React app) has moved; removing or renaming a response field is its own task with a grep proving no consumer remains.
- The JSON shape follows `src/shared/types.ts` (camelCase). Changing a shared type means updating server, client and tests in the same task.
- Error responses stay `{ error: "<Persian message>" }` (validation errors may add `fields`). Never return stack traces or raw exception messages.
- Every create endpoint accepts an optional client-generated `id` (Phase 1 task 1.27) so retries are idempotent; a duplicate id returns 409.

## 7. Money, time, ids

- **Money:** integers in Toman only. Never `float`, never `parseFloat` on amounts. Rounding is `Math.round` (half up) and lives in `src/shared/rules/`. Anything that moves money is computed **on the server**; the client only displays.
- **Time:** the database stores **UTC ISO-8601** strings generated by the app (`nowIso()`), never `datetime('now')`. The UI converts to Shamsi for display only. Business rules that depend on "local time" (e.g. the 24-hour cancellation window) use the fixed offset `+03:30` (Iran has no DST since 2022), never the server's timezone.
- **Ids:** `<prefix>-<uuid v4>` generated by the app (`newId('req')`), never by the database.

## 8. SQL portability rules (so Phase 7 is mechanical)

All SQL lives in `src/server/repositories/*.ts` (and migrations / scripts). Routes and services never contain SQL. All repository methods are `async` and use the `Db` interface (Phase 1 task 1.06), positional `?` parameters only.
Banned outside `src/server/db/**`, migrations, `scripts/**`, `tests/**` (enforced by `npm run check:portability`): `datetime(`, `strftime(`, `randomblob(`, `INSERT OR REPLACE`, `INSERT OR IGNORE`, `PRAGMA`, `AUTOINCREMENT`, `rowid`, `GLOB`, `ifnull(`, `GROUP_CONCAT`, `json_extract`, `.prepare(`, `LIMIT -1`.
Also: booleans are mapped in repositories (0/1 in SQLite, boolean in PG); JSON columns are read/written only through repository mappers; every `ORDER BY` ends with a unique tie-breaker (`, id`); `LIKE` comparisons use `LOWER(col) LIKE LOWER(?)`; use `INSERT ... ON CONFLICT ... DO UPDATE/NOTHING` and `RETURNING` (both engines support them); no engine-specific functions in new code.

## 9. Transactions and concurrency

- Any operation that writes more than one row or must check-then-write (accept a request, claim a slot, accept an offer, post ledger entries) runs inside `db.tx(...)` (Phase 1 task 1.06).
- Check-then-write is expressed as a conditional `UPDATE ... WHERE status = 'expected'` and the code checks `changes === 1`; zero changes → 409.
- Operations that can be retried (payment callbacks, jobs, client retries) must be **idempotent** (unique keys, "already done" returns success).

## 10. Testing rules

- A bug fix starts with a failing test. A new endpoint comes with tests for: success, 401 (no token), 403 (wrong role), 404, validation error, and an ownership/tenant-isolation case.
- Money/time rules have unit tests with fixed clocks (inject `now`).
- Never skip, `.only`, or delete a test to make the gate pass. If a test is wrong, fix it in a separate commit with the reason in the message.
- Keep one test database per test file (temp path), never the dev database.

## 11. Rollback and safety

- One task = one commit = revertable. Do not combine tasks in one commit.
- Destructive scripts (reset, delete, rebuild) require `NODE_ENV !== 'production'` **and** an explicit flag (`--yes`).
- Feature switches that change behaviour for real users are environment flags with a safe default (`DEMO_MODE=false`, `MAINTENANCE_MODE=false`, `DB_DRIVER=sqlite`).

## 12. Agent boundaries (same as Phase 0)

1. Work on a branch `phase-N`; one task at a time, in numeric order; never start a task whose dependency is not done.
2. Touch only the files listed in the task. Anything else → write a line in `NOTES.md` instead.
3. Farsi stays in every user-facing string; task descriptions and code comments are English.
4. If a task is ambiguous or the code differs from what the task describes, **stop and write the question in `NOTES.md`** rather than guessing.
5. Commit message format: `P<phase>-<task>: <short title>` (example: `P1-1.14: extract client requests repository`).

## 13. How the reviewer checks a finished phase

When the owner says "check the repo", the reviewer will: (a) read the commit list for the phase and confirm one commit per task; (b) run the Task Gate and the phase checklist; (c) run the grep assertions listed at the end of the phase file; (d) diff the DB snapshots; (e) list anything that deviates from the task text and decide with the owner whether to accept it or open a fix task. Only then Phase N+1 starts.

## 14. Owner decisions needed along the way (decide early, they block tasks)

### Decided (2026-10-16)
| Decision | Result | Used in |
|---|---|---|
| Manager/artist verification | Approval by a server admin (`is_admin`) | 3.02 |
| SMS | Mandatory OTP for registration **and** login; separate backend module `modules/sms`; provider **Kavenegar** | 3.05–3.07 |
| Brand | **Legendin** only | 4.20 |
| Hosting / object storage | Iran-side: Iranian VPS + ArvanCloud Object Storage (S3-compatible), backups to a second independent location | 5.05, 5.16 |
| Who collects money | All payments go to the founder's single merchant account (platform collects, later payouts to salons) | 6.01, 6.11, 6.13, 6.16 |
| Final database | PostgreSQL (last phase) | 7.x |

### Still open — REMIND the owner before the task shown
| Open item | Remind before |
|---|---|
| Legal texts: terms of use and privacy policy (owner will write the rules) | Phase 3 task 3.14 |
| Image rules: which images/licenses may be used instead of Unsplash hotlinks | Phase 4 task 4.14 |
| Accountant/lawyer questions: VAT, e-invoicing, collecting money on behalf of salons | Phase 6 tasks 6.01 and 6.21 |
| Gateway choice, VIP plan prices, commission %, refund split, payout schedule | Phase 6 task 6.01 |
| Kavenegar account: API key, approved OTP template, sender line | Phase 3 task 3.05 |
| PostgreSQL hosting details (managed vs self-hosted, PITR, maintenance window, go/no-go person) | Phase 7 task 7.02 |
| Brand Persian spelling/tagline, domain name, error-tracking choice | Phase 4 task 4.20 / Phase 5 |

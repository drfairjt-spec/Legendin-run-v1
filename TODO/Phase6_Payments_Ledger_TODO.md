# Legendin — Phase 6: Payments & Ledger (TODO for free/local AI agents)

> **Read `00_Integrity_Rules_and_Roadmap.md` first.** One task at a time, one commit per task: `P6-6.NN: <title>`. Task text is English; user-facing strings stay Farsi.
> 🟢 safe · 🟡 review before merge · 🔴 sensitive. **Database engine stays SQLite.** Branch `phase-6`. Precondition: tag `phase-5-done`. Migrations in this phase use `090`–`109`.

**Goal:** real money handling without trusting the client: a payment-provider abstraction, server-determined amounts, idempotent callbacks, VIP subscriptions derived from payments, an immutable ledger, reconciliation and settlement records. Everything is built and tested against a **Fake provider** first; the real gateway adapter is a thin layer on top.

**Hard rules for this phase:**
- Money is integer Toman. The client never sends an amount that is trusted; it sends *what* it wants to buy (plan id, booking id) and the server decides the amount.
- Nothing is ever deleted or edited in the ledger; corrections are reversal entries.
- Never log full card data (the app never receives it) or provider secrets. Payment callbacks are verified server-to-server with the provider before any state change.
- Legal/tax questions (e-invoicing, VAT, marketplace licensing/enamad) are **not decided by agents**; they go to the owner's accountant (task 6.21).

---

## A — Decisions and primitives

### 🔴 6.01: Owner decisions + money primitives
**Files:** new `docs/payments-decisions.md`, `src/shared/money.ts`, `src/shared/rules/pricing.ts`, tests
**Do:** the owner fills `docs/payments-decisions.md` (the task is blocked until it is complete): (1) provider(s) (e.g. Zarinpal / IDPay / Zibal / NextPay — one primary); (2) **who collects the money** for bookings: *platform collects* (payout to salons later) vs *pay at the salon* (platform only collects subscription/commission); (3) VIP plans: names, durations, prices in Toman; (4) commission percent and when it is charged (discounted-slot commission already exists: keep the same constant source); (5) refund policy and fee split on cancellation; (6) settlement schedule and minimum payout; (7) is VAT included in displayed prices. Then implement `money.ts`: branded `Toman` integer type, `toToman(n)` (throws on non-integer/negative/unsafe), `add/sub/mulPercent(amount, percentBasisPoints)` with `Math.round`, `splitAmount(total, parts[])` that distributes the remainder so the parts always sum to the total, `formatToman()`. `pricing.ts` computes commission, platform fee and net payout from the decisions (constants in `src/shared/constants.ts`).
**Done when:** property-style unit tests (1,000 random cases): splits always sum to the total, no float results, rounding is half-up; decisions file is signed off (owner name/date).

### 🔴 6.02: Ledger immutability and entry kinds
**Depends on:** 6.01
**Files:** new `src/server/db/migrations/090_ledger.ts`, repositories `transactions.ts`, `src/server/routes/finance.ts`, `docs/portability-notes.md`, tests
**Do:** `ALTER TABLE transactions ADD COLUMN status TEXT NOT NULL DEFAULT 'posted' CHECK(status IN ('posted','reversed')); ADD COLUMN reverses_id TEXT REFERENCES transactions(id); ADD COLUMN source TEXT NOT NULL DEFAULT 'manual'; ADD COLUMN source_ref TEXT; ADD COLUMN currency TEXT NOT NULL DEFAULT 'IRT';` plus `CREATE UNIQUE INDEX ux_tx_reverses ON transactions(reverses_id) WHERE reverses_id IS NOT NULL;`. Triggers `tx_no_update_core` (aborts UPDATE of `amount`, `direction`, `salon_id`, `date`, `category`) and `tx_no_delete` (aborts DELETE). `DELETE /api/transactions/:id` now **creates a reversal row** (opposite direction, same amount, `reverses_id`, `status='posted'`) and marks the original `reversed` in the same `db.tx`; the UI shows reversed pairs struck-through and excludes them from totals (summary query handles both). Record the triggers in `docs/portability-notes.md` for Phase 7. Add an invariant to `verify-domain-invariants`: sum(income) − sum(expense) over posted rows equals the summary endpoint.
**Done when:** direct SQL `UPDATE`/`DELETE` on the guarded columns fails (test); deleting from the UI produces a reversal and totals stay correct; reversing twice → 409.

### 🟡 6.03: Manual-entry guardrails
**Depends on:** 6.02
**Files:** `src/server/routes/finance.ts`, `src/shared/schemas.ts`, tests
**Do:** manual transactions: `amount` integer 1…1,000,000,000, date not in the future beyond today, categories from a fixed list (`src/shared/constants.ts`), `source='manual'`. System-generated rows (`source` in `booking`, `subscription`, `commission`, `payout`, `refund`) can **never** be created or reversed through the manual endpoints (403). Audit log entry for each manual write/reversal (Phase 3 audit).
**Done when:** tests for each rejection; the audit log has the entry.

---

## B — Payment infrastructure

### 🔴 6.04: PaymentProvider interface, Fake adapter, Zarinpal skeleton
**Depends on:** 6.01
**Files:** new `src/server/payments/{provider,fakeProvider,zarinpalProvider,index}.ts`, `.env.example`, tests
**Do:** 
```ts
interface PaymentProvider {
  name: string;
  createPayment(i: { amount: Toman; orderId: string; description: string; callbackUrl: string; payerPhone?: string }): Promise<{ authority: string; redirectUrl: string }>;
  verifyPayment(i: { authority: string; amount: Toman }): Promise<{ status: 'paid'|'failed'|'pending'; refId?: string; cardPanMasked?: string; feeAmount?: Toman; raw: unknown }>;
  refund?(i: { refId: string; amount: Toman }): Promise<{ ok: boolean; raw: unknown }>;
}
```
`FakeProvider` simulates success/failure/pending/slow/duplicate-callback deterministically (controlled by the amount's last digits or test hooks) and exposes a dev-only page `/dev/fake-gateway?authority=` with "پرداخت موفق/ناموفق" buttons (404 in production). `ZarinpalProvider` is a typed skeleton (endpoints/sandbox flag from env; timeout 10 s; no retries on `createPayment`, retry-safe on `verifyPayment`) to be completed against the provider's current docs. Production refuses `PAYMENT_PROVIDER=fake`.
**Done when:** the same provider contract test suite (6.20) runs against Fake; startup fails in production with `fake`.

### 🔴 6.05: Payments tables
**Depends on:** 6.02
**Files:** new `src/server/db/migrations/091_payments.ts`, repositories `payments.ts`
**Do:** 
```sql
CREATE TABLE payments (id TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL REFERENCES users(id), salon_id TEXT REFERENCES salons(id),
  purpose TEXT NOT NULL CHECK(purpose IN ('subscription','booking','deposit')), purpose_ref TEXT NOT NULL,
  amount INTEGER NOT NULL CHECK(amount > 0), currency TEXT NOT NULL DEFAULT 'IRT', provider TEXT NOT NULL,
  authority TEXT UNIQUE, status TEXT NOT NULL DEFAULT 'created' CHECK(status IN ('created','redirected','paid','failed','expired','refunded','partially_refunded')),
  provider_ref_id TEXT, card_pan_masked TEXT, idempotency_key TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, paid_at TEXT, expires_at TEXT NOT NULL);
CREATE UNIQUE INDEX ux_payments_idem ON payments(user_id, idempotency_key);
CREATE UNIQUE INDEX ux_payments_open_purpose ON payments(purpose, purpose_ref) WHERE status IN ('created','redirected','paid');
CREATE INDEX idx_payments_user ON payments(user_id, created_at);
CREATE TABLE payment_events (id TEXT PRIMARY KEY NOT NULL, payment_id TEXT NOT NULL REFERENCES payments(id), type TEXT NOT NULL, payload_json TEXT, created_at TEXT NOT NULL);
CREATE TABLE refunds (id TEXT PRIMARY KEY NOT NULL, payment_id TEXT NOT NULL REFERENCES payments(id), amount INTEGER NOT NULL CHECK(amount > 0), reason TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('requested','done','failed')), provider_ref TEXT, created_at TEXT NOT NULL);
```
`payment_events` is append-only (same trigger approach as the audit log). Payload JSON is scrubbed (no secrets).
**Done when:** migration applies on fresh and upgraded DBs; the duplicate open payment for the same purpose is rejected by the index (test).

### 🔴 6.06: Create-payment and callback endpoints (server-determined amount)
**Depends on:** 6.04, 6.05
**Files:** `src/server/services/paymentService.ts`, `src/server/routes/payments.ts`, `src/shared/schemas.ts`, tests
**Do:** 
- `POST /api/payments { purpose, purposeRef, idempotencyKey }` (authenticated, verified phone): the server loads the target (a plan, a booking), authorizes (the booking's client / the user buying their own subscription), **computes the amount itself**, creates the `payments` row + provider payment (`createPayment`), returns `{ paymentId, redirectUrl }`. Same idempotency key → the same response, no second provider call. Amount fields in the body are rejected by the schema (`strict()`).
- `GET /api/payments/callback?authority=&status=` (public, from the gateway): look up by `authority`; if already `paid` → redirect to the success page (idempotent); else call `verifyPayment` **server-to-server** with the **stored** amount; in one `db.tx` set status, store `provider_ref_id`/masked card, insert `payment_events`, and run the purpose handler (6.08/6.13) — a conditional `UPDATE payments SET status='paid' WHERE id=? AND status IN ('created','redirected')` guards double processing. A failed verification never grants anything. Redirect to `/payments/result?id=`.
- `GET /api/payments/:id` (owner or the salon owner) returns the status.
**Done when:** API tests with the Fake provider: wrong user → 403; client-supplied amount ignored; callback called twice → one effect; callback for an unknown authority → 404; verification mismatch (amount) → failed and no grant; concurrent callbacks → one effect.

### 🟡 6.07: Payment expiry and stuck-payment recovery job
**Depends on:** 6.06, Phase 5 queue
**Files:** `src/server/jobs/handlers/paymentRecovery.ts`, scheduler entry, tests
**Do:** every 5 minutes: payments `created|redirected` older than `expires_at` (30 min) → call `verifyPayment` once (the user may have paid but never returned) and finalize accordingly; otherwise mark `expired`. Idempotent; the handler uses the same `finalizePayment()` as the callback.
**Done when:** with the Fake provider, a payment paid at the gateway but with no callback is finalized by the job (test, fake clock).

---

## C — Subscriptions (VIP)

### 🟡 6.08: Plans and subscriptions
**Depends on:** 6.06
**Files:** new `src/server/db/migrations/092_subscriptions.ts`, repositories `subscriptions.ts`, `src/server/services/subscriptionService.ts`, routes `plans.ts`, `subscriptions.ts`, tests
**Do:** `CREATE TABLE plans (id TEXT PRIMARY KEY NOT NULL, code TEXT NOT NULL UNIQUE, title TEXT NOT NULL, audience TEXT NOT NULL CHECK(audience IN ('client','artist','manager')), price INTEGER NOT NULL CHECK(price >= 0), duration_days INTEGER NOT NULL, features_json TEXT NOT NULL, is_active INTEGER NOT NULL DEFAULT 1);` and `CREATE TABLE subscriptions (id TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL REFERENCES users(id), plan_id TEXT NOT NULL REFERENCES plans(id), payment_id TEXT REFERENCES payments(id), starts_at TEXT NOT NULL, ends_at TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('active','expired','cancelled')), created_at TEXT NOT NULL); CREATE INDEX idx_subs_user ON subscriptions(user_id, ends_at);`. Seed plans from `docs/payments-decisions.md`. The purpose handler for `subscription` creates/extends a subscription (renewal while active **appends** from the current `ends_at`) and posts a ledger row (`source='subscription'`, category `اشتراک`, direction income for the platform account — see 6.14) inside the same `db.tx`. `GET /api/plans`, `GET /api/subscriptions/mine`.
**Done when:** tests: paying twice for overlapping periods extends correctly; callback replay doesn't create a second subscription; plan prices come from the DB only.

### 🔴 6.09: Derive `isVip` from subscriptions (replace the DEMO_MODE upgrade)
**Depends on:** 6.08
**Files:** serializers, `src/server/routes/users.ts`, `src/server/jobs/handlers/expireSubscriptions.ts`, `src/components/*` (VIP upgrade UI), `.env.example`, deprecated list, tests, `e2e/`
**Do:** `isVip` and `vipExpiresAt` in the user serializer are computed from the active subscription (`ends_at > now`); `users.is_vip` is no longer written (add to `deprecated-columns.json`); remove the Phase 1 `DEMO_MODE` VIP upgrade endpoint; the UI button starts the payment flow (6.15). A daily job marks expired subscriptions and sends the renewal notification 3 days before expiry. Loyalty points/discounts that depend on VIP read the derived value only.
**Done when:** `grep -rn "is_vip" src/server` shows only migrations/repository mappers for reads of legacy data; tests: after expiry, `isVip` is false without any user update; existing VIP users are grandfathered with a subscription row generated by migration `093` (ends_at = 30 days after deploy, noted in the release notes).

---

## D — Booking money flows

### 🟡 6.10: Platform fee, salon share and the booking settlement model
**Depends on:** 6.01, Phase 2
**Files:** `src/shared/rules/pricing.ts`, `src/server/services/settlementCalc.ts`, tests
**Do:** pure functions per the decisions file: `calculateBookingBreakdown(price, context)` → `{ total, platformFee, salonShare, artistShare? }`, with cancellation and refund variants (`calculateRefund(price, paidAt, startAt, cancelledBy, now)`), all integer, parts sum to total (use `splitAmount`). Document every formula in `docs/payments-decisions.md` with worked examples; the tests contain those examples.
**Done when:** unit tests cover each example and 1,000 random cases for the sum invariant.

### 🟡 6.11: Optional booking deposits / prepayment
**Depends on:** 6.06, 6.10
**Files:** new `src/server/db/migrations/094_deposits.ts`, booking service, routes, `src/components/requests/*`, tests
**Do:** only if the owner chose prepayment. `ALTER TABLE bookings ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'none' CHECK(payment_status IN ('none','pending','paid','refunded','partially_refunded')); ADD COLUMN deposit_amount INTEGER;`. A request accepted by the artist moves to `awaiting_payment` semantic via `payment_status='pending'` (the booking stays `confirmed`; the slot remains blocked for 30 minutes — after that the booking auto-cancels through a job). Payment success sets `paid`. Cancellation rules call `calculateRefund` and create a refund (6.12). When prepayment is *not* enabled, this task only adds the columns and the UI stays unchanged.
**Done when:** flag-off path is byte-identical in behaviour (journeys pass); flag-on tests: unpaid booking auto-cancels and frees the slot; paid booking cancels with the correct refund.

### 🔴 6.12: Refunds
**Depends on:** 6.11
**Files:** `src/server/services/refundService.ts`, routes, ledger posting, tests
**Do:** `requestRefund(paymentId, amount, reason)` inside `db.tx`: checks `amount ≤ paid − already refunded`, inserts `refunds` (`requested`), enqueues a job that calls the provider `refund` (or marks it manual when the provider has no API), on `done` posts the ledger entry (`source='refund'`, expense) and updates the payment status. Failed refunds are retried (queue) and surfaced in the admin finance view (6.18). Partial and multiple refunds are supported; over-refund is impossible (test with concurrency).
**Done when:** tests: double refund request → 409/clamped, concurrent refunds never exceed the paid amount, ledger rows match.

### 🔴 6.13: Booking payment ledger postings
**Depends on:** 6.11
**Files:** `src/server/services/requestService.ts` (complete action), `paymentService.ts`, tests
**Do:** when platform-collects is enabled: payment success posts a *liability* entry (platform holds the salon's money) and completing the booking moves it to the salon's receivable (`source='booking'`, `source_ref=booking id`, unique per booking+kind to stay idempotent); the platform fee posts as platform income. When pay-at-salon: the existing income posting from 2.17 stays and only the commission is charged (6.14). Never both for one booking (unique index on `(source, source_ref, category)`).
**Done when:** tests: one booking never produces duplicate postings in either mode; refund after completion posts the reversal.

---

## E — Commission, settlement, reconciliation

### 🟡 6.14: Platform account and commission accounting
**Depends on:** 6.02
**Files:** new `src/server/db/migrations/095_platform_account.ts`, `src/server/services/commission.ts`, tests
**Do:** introduce a reserved salon row `salon-platform` (`status='hidden'`, owner = a system user created by the migration with a random unusable password hash and `is_admin=0`) used as the platform's own ledger account; commission and subscription income post there. The commission for discounted slots (existing rule) is posted as `source='commission'` on completion in the same `db.tx` as 2.17. Never exposed in public lists (filters on `status='active'`).
**Done when:** tests: the platform account never appears in `GET /api/salons`; commission rows equal the `commission_amount` stored in transactions.

### 🟡 6.15: Payment UI flow
**Depends on:** 6.06, 6.09
**Files:** `src/components/payments/{PlanPicker,PaymentResult,PayButton}.tsx`, `src/api/payments.ts`, routes `/pay/:purpose/:ref`, `/payments/result`, `e2e/`
**Do:** plan picker in the profile (VIP) → `POST /api/payments` with a client-generated idempotency key → redirect to `redirectUrl` → result page polls `GET /api/payments/:id` (up to 20 s) showing `در حال بررسی…`, `پرداخت موفق`, `پرداخت ناموفق` with retry. Double-click safe (disabled button + idempotency key). Prices formatted with `fmt.toman()`. Receipt view (amount, date, masked card, reference).
**Done when:** Playwright with the Fake gateway: buy VIP → the badge appears; failed payment → no VIP; reload on the result page keeps the state.

### 🟡 6.16: Payout (settlement) records — manual first
**Depends on:** 6.13, 6.14
**Files:** new `src/server/db/migrations/096_payouts.ts`, `src/server/services/payoutService.ts`, admin routes, `AdminPanel` section, tests
**Do:** `CREATE TABLE payouts (id TEXT PRIMARY KEY NOT NULL, salon_id TEXT NOT NULL REFERENCES salons(id), amount INTEGER NOT NULL CHECK(amount > 0), period_from TEXT NOT NULL, period_to TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('draft','approved','paid','cancelled')), bank_ref TEXT, created_by TEXT NOT NULL REFERENCES users(id), created_at TEXT NOT NULL, paid_at TEXT);` and `CREATE TABLE payout_items (payout_id TEXT NOT NULL REFERENCES payouts(id), transaction_id TEXT NOT NULL REFERENCES transactions(id), PRIMARY KEY (payout_id, transaction_id));` plus a unique index on `payout_items(transaction_id)` so a transaction is paid out once. Admin flow: generate a draft for a salon and period from unsettled booking-income rows → approve → mark paid with the bank reference (posts the ledger entry `source='payout'`). Salons can see their payouts read-only. Bank transfer itself stays manual (no banking API).
**Done when:** tests: a transaction can't be in two payouts; the draft amount equals the sum of items; marking paid twice is a no-op; non-admin → 403.

### 🔴 6.17: Reconciliation job
**Depends on:** 6.07, 6.13
**Files:** `src/server/jobs/handlers/reconcile.ts`, `scripts/reconcile.ts`, admin report endpoint, tests
**Do:** daily: (1) every `paid` payment has exactly one matching ledger posting for its purpose; (2) sum of paid payments minus refunds equals the corresponding ledger totals per day; (3) every `completed` prepaid booking has a settlement posting; (4) no payment is `redirected` for longer than 24 h; (5) provider-side list vs local (when the provider offers a settlement report, import it as CSV in `scripts/reconcile.ts --provider-csv`). Findings go to `reconciliation_issues` (migration `097`) and raise an admin notification + Sentry event. Never auto-fixes money; only reports.
**Done when:** injected inconsistencies in tests (missing posting, duplicate posting, amount mismatch) are each detected exactly once; a clean DB yields none.

### 🟡 6.18: Admin finance views
**Depends on:** 6.16, 6.17
**Files:** `src/components/admin/FinanceAdmin.tsx`, routes, tests
**Do:** admin-only screens: payments list (filter by status/date/user), payment detail with events, refunds queue and retry, reconciliation issues with resolve notes (audited), platform revenue summary (subscriptions + commission + fees), payouts. CSV export for accountants (streams, no PII beyond what is necessary: masked card, user id).
**Done when:** authz matrix updated; non-admin 403; CSV totals equal the summary (test).

### 🟡 6.19: Webhook / callback hardening
**Depends on:** 6.06
**Files:** `src/server/routes/payments.ts`, `src/server/middleware/rateLimit.ts`, tests
**Do:** callback route: strict query validation, rate limit by IP, constant response shape, no information leakage about other users' payments, `authority` format check, replay protection (already idempotent), optional IP allowlist of the provider (`PAYMENT_CALLBACK_IPS`), signed `return` parameter for any redirect target (no open redirects: the redirect target is built server-side only). If the provider supports HMAC-signed webhooks, verify the signature with a timing-safe comparison before parsing.
**Done when:** tests: unknown authority, malformed values, replay, redirect-target tampering.

### 🟡 6.20: Provider contract tests
**Depends on:** 6.04
**Files:** `tests/payments/contract.test.ts`, `tests/payments/zarinpal.sandbox.test.ts` (skipped unless `ZARINPAL_SANDBOX=1`)
**Do:** one shared suite that every provider adapter must pass: create → redirect url present; verify paid; verify failed; verify with a wrong amount fails; timeout handling; idempotent verify; refund where supported. Run on Fake in CI; on the sandbox manually before release.
**Done when:** the Fake passes everything; the sandbox suite is documented in `docs/payments-decisions.md`.

### 🟡 6.21: Legal, tax and compliance notes (owner/accountant)
**Files:** `docs/payments-compliance.md`
**Do:** write the open questions for the owner's accountant/lawyer, **without deciding them**: e-invoicing obligations (Moodian) and VAT on subscriptions and commissions, whether the business needs a payment-facilitator arrangement when it collects money for salons, the electronic trust symbol requirements for the chosen gateway, invoice/receipt wording, data-retention for payment records, terms of use for refunds (to be reflected in the terms page from Phase 3). Add a section "what the software already supports" (receipts, ledger export, immutable ledger) so the accountant can respond quickly.
**Done when:** the document exists with answers filled in by the owner, or each unanswered item is marked `OPEN` with an owner name.

### 🔴 6.22: Phase 6 gate
Fresh DB **and** a copy of the `phase-5-done` DB:
- [ ] `npm run gate` green; contract tests pass; reconciliation on the seeded + journey data reports zero issues.
- [ ] Money audit greps: `grep -rniE "parseFloat|toFixed|Math\.floor\(.*(price|amount)" src/server src/shared` empty (rounding only via `money.ts`); no route reads an `amount` from a request body for payments (`grep -n "amount" src/server/routes/payments.ts` reviewed).
- [ ] `grep -rn "is_vip" src/server` only in migrations and legacy mappers; `grep -rn "DEMO_MODE" src` shows no VIP upgrade path.
- [ ] Ledger triggers verified (UPDATE/DELETE blocked); reversal flow works from the UI.
- [ ] Journeys: buy VIP (fake gateway) → badge; booking (prepaid mode on, then off) → complete → postings → payout → reconciliation clean.
- [ ] Concurrency tests: callback ×5 in parallel, refund ×3 in parallel, completion ×3 in parallel → exactly one effect each.
- [ ] `docs/portability-notes.md` lists all triggers/partial indexes added in this phase.
- [ ] `PAYMENT_PROVIDER` in production config is a real provider; sandbox run recorded.
- [ ] Tag `phase-6-done`; ask the reviewer to check the repository before Phase 7 (the PostgreSQL migration).

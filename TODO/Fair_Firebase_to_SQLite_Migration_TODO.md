# Fair (Legendin) — Firebase → SQLite migration, for a free/local AI agent

> Same conventions as the rest of this project's task lists: English task descriptions, Farsi stays in all in-app strings/labels/data, nothing existing is removed unless explicitly stated, each task is atomic and self-contained enough to hand to a free local coding agent (e.g. Continue.dev + a local model) one at a time. 🟢 = safe/independent, 🟡 = needs review before merging, 🔴 = architecturally sensitive, review carefully.

**Starting facts, confirmed from the current repo, not assumed:**
- Firebase is 100% unused code today — `firebase-applet-config.json`, `firestore.rules`, and the `firebase` npm dependency exist, but zero `db.*` calls happen anywhere in `src/`. Nothing is "migrated" in the data sense — this is building the first real backend.
- All state currently lives in 10 `localStorage` keys in `App.tsx` (`legendin_users`, `legendin_transactions`, `legendin_posts`, etc.), entirely client-side, per-browser.
- Image/file-bearing fields, confirmed from `types.ts`: `User.avatar`, `User.coverImage`, `PortfolioItem.imageUrl`, `Post.image`, `Review.reviewerAvatar`, `StaffContract.contractFileUrl`, `Transaction.receiptUrl`. All of these stay as plain strings (a URL) in the new schema — only *where the bytes live* changes.

---

## Phase 0 — dependencies and DB bootstrap

### 🟢 DB-TASK-01: Install SQLite + file-upload dependencies
**Goal:** Add to `package.json`:
```bash
npm install better-sqlite3 multer uuid
npm install -D @types/better-sqlite3 @types/multer @types/uuid
```
`better-sqlite3` is chosen over an async driver deliberately — it's synchronous, has no callback/promise footguns, and is much easier for a small local model to use correctly without introducing race conditions. `multer` handles the image/file upload endpoints in Phase 1. Do not remove the `firebase` dependency yet — that's DB-TASK-14, after everything else is verified working.

---

### 🔴 DB-TASK-02: Write the SQLite schema
**Goal:** New file `src/server/schema.sql`, translating every entity in `types.ts` into a table. Foreign keys ON, since referential integrity is the whole point of leaving Firestore's document model behind.

```sql
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('client','artist','manager','service-staff')),
  phone TEXT NOT NULL UNIQUE,
  avatar TEXT,
  cover_image TEXT,
  title TEXT,
  city TEXT,
  bio TEXT,
  resume_text TEXT,
  skills_json TEXT,
  certifications_json TEXT,
  open_for_hiring INTEGER DEFAULT 0,
  accepting_requests INTEGER DEFAULT 1,
  salon_name TEXT,
  salon_location TEXT,
  salon_description TEXT,
  contract_type TEXT,
  contract_start_date TEXT,
  contract_end_date TEXT,
  contract_amount TEXT,
  contract_file_url TEXT,
  guarantee_type TEXT,
  guarantee_file_url TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS portfolio_items (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  title TEXT,
  description TEXT
);

CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reviewer_name TEXT NOT NULL,
  reviewer_avatar TEXT,
  rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  image TEXT,
  tag TEXT,
  likes_count INTEGER DEFAULT 0,
  liked_by_json TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id TEXT NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY,
  parent_service_id TEXT REFERENCES services(id),
  name TEXT NOT NULL,
  duration_minutes INTEGER,
  price INTEGER
);

CREATE TABLE IF NOT EXISTS client_requests (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES users(id),
  target_id TEXT NOT NULL REFERENCES users(id),
  target_type TEXT,
  service_type TEXT,
  service_id TEXT REFERENCES services(id),
  preferred_date TEXT,
  preferred_time TEXT,
  note TEXT,
  status TEXT NOT NULL CHECK(status IN ('pending','accepted','declined','cancelled')),
  price INTEGER,
  cancellation_json TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS hiring_offers (
  id TEXT PRIMARY KEY,
  manager_id TEXT NOT NULL REFERENCES users(id),
  artist_id TEXT NOT NULL REFERENCES users(id),
  salon_name TEXT,
  message TEXT,
  offer_amount TEXT,
  status TEXT NOT NULL CHECK(status IN ('pending','accepted','declined')),
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS job_applications (
  id TEXT PRIMARY KEY,
  applicant_id TEXT NOT NULL REFERENCES users(id),
  salon_id TEXT NOT NULL REFERENCES users(id),
  message TEXT,
  status TEXT NOT NULL CHECK(status IN ('pending','accepted','declined')),
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS discounted_slots (
  id TEXT PRIMARY KEY,
  original_request_id TEXT REFERENCES client_requests(id),
  artist_id TEXT NOT NULL REFERENCES users(id),
  artist_name TEXT,
  salon_name TEXT,
  service_type TEXT,
  date TEXT,
  time TEXT,
  original_price INTEGER,
  discounted_price INTEGER,
  discount_percent INTEGER,
  app_commission_percent INTEGER,
  status TEXT NOT NULL CHECK(status IN ('available','claimed','expired')),
  claimed_by_client_id TEXT REFERENCES users(id),
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS discounts (
  id TEXT PRIMARY KEY,
  salon_id TEXT NOT NULL REFERENCES users(id),
  code TEXT,
  scope TEXT,
  target_client_id TEXT REFERENCES users(id),
  service_id TEXT REFERENCES services(id),
  percent_off INTEGER,
  amount_off INTEGER,
  valid_from TEXT,
  valid_to TEXT,
  created_by_staff_id TEXT REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  salon_id TEXT NOT NULL REFERENCES users(id),
  direction TEXT NOT NULL CHECK(direction IN ('income','cost')),
  category TEXT NOT NULL,
  amount INTEGER NOT NULL,
  date TEXT,
  description TEXT,
  receipt_url TEXT,
  related_staff_id TEXT REFERENCES users(id),
  related_request_id TEXT REFERENCES client_requests(id),
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS leave_requests (
  id TEXT PRIMARY KEY,
  staff_id TEXT NOT NULL REFERENCES users(id),
  start_date TEXT,
  end_date TEXT,
  requires_approval INTEGER,
  status TEXT NOT NULL CHECK(status IN ('pending','accepted','declined','logged')),
  note TEXT
);

CREATE TABLE IF NOT EXISTS colleague_messages (
  id TEXT PRIMARY KEY,
  sender_id TEXT NOT NULL REFERENCES users(id),
  recipient_id TEXT NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS message_replies (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL REFERENCES colleague_messages(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_transactions_staff ON transactions(related_staff_id);
CREATE INDEX IF NOT EXISTS idx_transactions_salon ON transactions(salon_id);
CREATE INDEX IF NOT EXISTS idx_requests_client ON client_requests(client_id);
CREATE INDEX IF NOT EXISTS idx_requests_target ON client_requests(target_id);
CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(author_id);
```

**Note on `skills_json`/`certifications_json`/`liked_by_json`:** these stay as JSON text columns rather than separate tables — they're small arrays with no independent lifecycle (nobody queries "all skills across all users" today), so normalizing them would add join complexity for no real benefit. Everything with its own lifecycle (posts, comments, transactions, requests) gets a real table.

---

### 🟡 DB-TASK-03: DB connection module
**Goal:** New file `src/server/db.ts`:
```ts
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'data', 'legendin.db');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
db.exec(schema);
```
Import and call this once at the top of `server.ts` (`import './db'` is enough — the side effect of opening/migrating the DB happens on import). `DB_PATH` being env-configurable matters for the VPS steps later (mounting a persistent volume/directory outside the app's deploy path).

---

## Phase 1 — image/file storage (the part specific to your "stores pictures" note)

### 🔴 DB-TASK-04: Upload endpoint with multer, disk storage
**Goal:** In `server.ts`, add:
```ts
import multer from 'multer';
import { randomUUID } from 'crypto';
import path from 'path';

const UPLOAD_ROOT = process.env.UPLOAD_ROOT || path.join(process.cwd(), 'uploads');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const category = ['avatars','covers','portfolio','posts','receipts','contracts']
      .includes(req.params.category) ? req.params.category : 'misc';
    const dir = path.join(UPLOAD_ROOT, category);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    cb(null, allowed.includes(file.mimetype));
  },
});

app.post('/api/upload/:category', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'فایلی ارسال نشده است' });
  const relativeUrl = `/uploads/${req.params.category}/${req.file.filename}`;
  res.json({ url: relativeUrl });
});
```
`:category` matches the six image/file-bearing fields identified above (`avatars` → `User.avatar`, `covers` → `User.coverImage`, `portfolio` → `PortfolioItem.imageUrl`, `posts` → `Post.image`, `receipts` → `Transaction.receiptUrl`, `contracts` → `StaffContract.contractFileUrl`). PDF is allowed only for contracts/receipts, not avatars — this fileFilter is intentionally permissive per-category; tighten it further per category if needed once this is working.

---

### 🟢 DB-TASK-05: Serve the uploads directory as static files
**Goal:** In `server.ts`, alongside the existing static file serving for the built frontend:
```ts
app.use('/uploads', express.static(UPLOAD_ROOT));
```
This makes every URL returned by DB-TASK-04's upload endpoint directly loadable by `<img src="...">` on the frontend with zero further backend code.

---

### 🟡 DB-TASK-06: Frontend upload helper + wire into existing image inputs
**Goal:** New `src/utils/uploadFile.ts`:
```ts
export async function uploadFile(file: File, category: 'avatars'|'covers'|'portfolio'|'posts'|'receipts'|'contracts'): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`/api/upload/${category}`, { method: 'POST', body: formData });
  if (!res.ok) throw new Error('آپلود فایل با خطا مواجه شد');
  const { url } = await res.json();
  return url;
}
```
Find every current `<input type="file">` in `UserProfile.tsx` (avatar, cover, portfolio), `CommunityFeed.tsx` (post image), `FinanceDashboard.tsx`/`AddTransactionForm.tsx` (receipt), and the contract file input in `UserProfile.tsx`'s manager contract panel — replace whatever they currently do (likely a base64 `FileReader` data-URL, given there's no upload endpoint yet) with: call `uploadFile()`, then set the returned relative URL into the existing state field. No change needed to how those fields are *displayed* — they're already plain string URLs in `types.ts`, an `<img src={user.avatar}>` doesn't care whether that string points to a data-URL or a real server path.

---

## Phase 2 — REST API replacing localStorage, one entity group at a time

### 🔴 DB-TASK-07: Users API
**Goal:** `GET /api/users`, `GET /api/users/:id`, `POST /api/users`, `PUT /api/users/:id` in `server.ts`, backed by prepared statements against the `users` table from DB-TASK-02. Map `skills_json`/`certifications_json` to/from real arrays at the API boundary (`JSON.parse`/`JSON.stringify`), so the frontend `User` shape in `types.ts` never has to change.

### 🟡 DB-TASK-08: Posts + comments API (the forum)
**Goal:** `GET /api/posts`, `POST /api/posts`, `POST /api/posts/:id/like`, `POST /api/posts/:id/comments` — mirrors whatever `CommunityFeed.tsx` currently does against the in-memory `posts` array, just persisted. `liked_by_json` parsed/stringified the same way as skills above.

### 🟡 DB-TASK-09: Transactions + client requests + hiring offers + discounted slots API
**Goal:** Standard CRUD per table from the schema. For transactions specifically, add one aggregate endpoint: `GET /api/transactions/balance/:staffId` that runs the equivalent of `calculateEmployeeBalance` as a SQL query (`SUM(amount) WHERE direction='income' AND related_staff_id=?` etc.) — but only as an *additional* fast-path endpoint; keep the existing `employeeBalance.ts` pure function working client-side too, unchanged, for any component still computing it from an already-fetched transaction list.

### 🟢 DB-TASK-10: Remaining entities (staff contract fields already live on `users`, leave requests, discounts, job applications, colleague messages/replies)
**Goal:** Same CRUD pattern as above, one table each, following DB-TASK-07 through DB-TASK-09 as the template. Low architectural risk since the pattern is already established by then.

---

## Phase 3 — swap `App.tsx` over

### 🔴 DB-TASK-11: Replace localStorage reads/writes with API calls
**Goal:** This is the highest-risk task — do it last, after every endpoint above is manually verified working. In `App.tsx`, each of the 10 `localStorage.getItem`/`setItem` pairs becomes a `fetch()` call to the matching endpoint, wrapped in the existing `useEffect`/state-update pattern already in the file. Keep the exact same React state shape (`allUsers`, `posts`, `transactions`, etc.) so that **no other component needs to change at all** — only `App.tsx`'s data-loading/saving logic changes. Add a loading state around initial fetch so the UI doesn't render with empty arrays before the first load completes.

---

## Phase 4 — cleanup

### 🟢 DB-TASK-12: Remove the now-fully-replaced Firebase artifacts
**Goal:** Delete `firebase-applet-config.json`, `firestore.rules`, `firebase-blueprint.json`, `src/lib/firebase.ts`, and the `firebase` line in `package.json`'s dependencies. Safe only after DB-TASK-11 is confirmed working — this was unused dead weight the whole time, but confirm the new SQLite path is live before deleting the old (unused) config, not before.

### 🟡 DB-TASK-13: Seed script for the existing demo data
**Goal:** `src/server/seed.ts` — a one-time script that reads the existing `src/data.ts` (`seedUsers`, `seedPosts`, `seedServices`) and inserts them into the new SQLite tables, so `npm run db:seed` gives you the same demo data you have today instead of an empty database. Add `"db:seed": "tsx src/server/seed.ts"` to `package.json` scripts.

### 🟢 DB-TASK-14: `.gitignore` the runtime data
**Goal:** Add to `.gitignore`: `data/*.db`, `data/*.db-wal`, `data/*.db-shm`, `uploads/`. The database file and uploaded images are runtime data, not source — they shouldn't be committed, and this also means you'll need the VPS backup step below, since `git pull` will never bring this data with it.

---

## VPS addendum — what changes from the guide I gave you before

Everything in the earlier step-by-step VPS guide (Node install, PM2, Nginx, certbot, firewall) stays exactly the same. Two additions specific to now having real server-side data:

**1. Point `DB_PATH` and `UPLOAD_ROOT` outside the git-managed directory**, so a future `git pull` + redeploy can never accidentally wipe your data:
```bash
mkdir -p /home/deploy/legendin-data/uploads
```
In your `.env` on the VPS:
```
DB_PATH=/home/deploy/legendin-data/legendin.db
UPLOAD_ROOT=/home/deploy/legendin-data/uploads
```

**2. Back up the database file and uploads directory** — this is now real user data living only on this one VPS disk, with no cloud redundancy (that's the tradeoff of not using Firebase/a managed cloud DB). A simple daily cron is enough to start:
```bash
crontab -e
```
```
0 3 * * * tar -czf /home/deploy/backups/legendin-$(date +\%F).tar.gz /home/deploy/legendin-data && find /home/deploy/backups -mtime +14 -delete
```
Keeps 14 days of nightly backups. Copy these off-box periodically (e.g. `rsync` to another machine or upload to any object storage) — a backup that only exists on the same VPS it's backing up doesn't protect against disk failure.

**3. Redeploy command is unchanged**, but now also re-run the seed only if the database file doesn't exist yet (first deploy only — never re-run seed against a live database with real data in it):
```bash
cd ~/Google1 && git pull && npm install && npm run build
[ -f /home/deploy/legendin-data/legendin.db ] || npm run db:seed
pm2 restart legendin
```

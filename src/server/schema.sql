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
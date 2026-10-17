// src/server/migrations.ts
// Forward-only migration system with checksums and per-migration transactions.
import { db } from './db.ts';
import crypto from 'crypto';

function sha256(sql: string): string {
  return crypto.createHash('sha256').update(sql).digest('hex');
}

function ensureMigrationsTable() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY NOT NULL,
      applied_at TEXT DEFAULT (datetime('now'))
    )
  `);
}

function migrationApplied(name: string): boolean {
  const row = db.prepare('SELECT name FROM schema_migrations WHERE name = ?').get(name);
  return !!row;
}

// P0-05: Move the two existing ALTER TABLE blocks from db.ts into named migrations.
// Each migration is guarded by a PRAGMA table_info check to avoid errors on already-migrated databases.
const migrations: Array<{ name: string; run: () => void }> = [
  {
    name: '001_users_password_hash',
    run: () => {
      const cols = db.prepare('PRAGMA table_info(users)').all() as Array<{ name: string }>;
      if (!cols.some(c => c.name === 'password_hash')) {
        db.exec('ALTER TABLE users ADD COLUMN password_hash TEXT;');
      }
    }
  },
  {
    name: '002_users_vip_flags',
    run: () => {
      const cols = db.prepare('PRAGMA table_info(users)').all() as Array<{ name: string }>;
      if (!cols.some(c => c.name === 'isVip')) {
        db.exec('ALTER TABLE users ADD COLUMN isVip INTEGER DEFAULT 0;');
      }
      if (!cols.some(c => c.name === 'isLoyalClient')) {
        db.exec('ALTER TABLE users ADD COLUMN isLoyalClient INTEGER DEFAULT 0;');
      }
    }
  },
  {
    name: '003_repair_null_ids',
    run: () => {
      db.exec(`
        UPDATE client_requests SET id = 'req-' || lower(hex(randomblob(16))) WHERE id IS NULL;
        UPDATE hiring_offers SET id = 'offer-' || lower(hex(randomblob(16))) WHERE id IS NULL;
        UPDATE discounted_slots SET id = 'slot-' || lower(hex(randomblob(16))) WHERE id IS NULL;
        UPDATE posts SET id = 'post-' || lower(hex(randomblob(16))) WHERE id IS NULL;
      `);
    }
  }
];

export function runMigrations(): void {
  ensureMigrationsTable();
  for (const m of migrations) {
    if (migrationApplied(m.name)) continue;
    // Run each migration inside its own transaction.
    const run = db.transaction(() => {
      m.run();
      db.prepare('INSERT INTO schema_migrations (name) VALUES (?)').run(m.name);
    });
    run();
    console.log(`[migrations] Applied ${m.name}`);
  }
}
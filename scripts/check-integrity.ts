#!/usr/bin/env tsx
// Script opens the DB at DB_PATH (read-only) and, for every table, prints and fails (exit code 1) if any `id IS NULL`,
// if `PRAGMA foreign_key_check` returns rows, or if `PRAGMA integrity_check` is not `ok`.

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { config } from 'dotenv';

// Load environment variables from .env file (if present)
const envPath = join(process.cwd(), '.env');
if (existsSync(envPath)) {
  config({ path: envPath });
}

const DB_PATH: string = process.env.DB_PATH || join(process.cwd(), 'data', 'legendin.db');

if (!existsSync(DB_PATH)) {
  console.error(`Database file not found: ${DB_PATH}`);
  process.exit(1);
}

const Database = (await import('better-sqlite3')).default;
const db = new Database(DB_PATH, { readonly: true });

let failed = false;

// Check for NULL ids in all tables
const tables = [
  'users',
  'portfolio_items',
  'reviews',
  'posts',
  'comments',
  'services',
  'client_requests',
  'hiring_offers',
  'job_applications',
  'discounted_slots',
  'discounts',
  'transactions',
  'leave_requests',
  'colleague_messages',
  'message_replies'
];

console.log('Checking for NULL ids...');
for (const table of tables) {
  const result = db.prepare(`SELECT COUNT(*) as cnt FROM ${table} WHERE id IS NULL`).get();
  if (result.cnt > 0) {
    console.error(`❌ Table ${table} has ${result.cnt} row(s) with NULL id`);
    failed = true;
  } else {
    console.log(`✅ Table ${table}: no NULL ids`);
  }
}

// Check foreign key constraints
console.log('\nChecking foreign key constraints...');
const fkResults = db.prepare('PRAGMA foreign_key_check').all();
if (fkResults.length > 0) {
  console.error(`❌ Foreign key check failed with ${fkResults.length} violation(s):`);
  for (const row of fkResults) {
    console.error(`  Table: ${row.table}, Rowid: ${row.rowid}, Parent: ${row.parent}, Fkid: ${row.fkid}`);
  }
  failed = true;
} else {
  console.log('✅ Foreign key check passed');
}

// Check database integrity
console.log('\nChecking database integrity...');
const integrityResult = db.prepare('PRAGMA integrity_check').get();
if (integrityResult.integrity_check !== 'ok') {
  console.error(`❌ Integrity check failed: ${integrityResult.integrity_check}`);
  failed = true;
} else {
  console.log('✅ Database integrity check passed');
}

if (failed) {
  console.error('\n❌ Integrity check FAILED');
  process.exit(1);
} else {
  console.log('\n✅ All integrity checks PASSED');
  process.exit(0);
}
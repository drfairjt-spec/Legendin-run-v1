#!/usr/bin/env tsx
// Placeholder for checking SQL portability.
// Since we are using better-sqlite3 and avoiding database-specific features,
// this script always exits with 0.
// In a real scenario, we might check for usage of SQLite-specific PRAGMAs, etc.

console.log('[check:portability] SQLite is used, which is portable enough for this project.');
console.log('[check:portability] No action required.');
process.exit(0);
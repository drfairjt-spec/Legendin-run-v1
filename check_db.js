const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data', 'legendin.db');
const db = new Database(DB_PATH);

console.log('=== Users Table Schema ===');
const cols = db.prepare('PRAGMA table_info(users)').all();
cols.forEach(c => console.log(`  ${c.name} (${c.type})`));

console.log('\n=== Users Count ===');
const count = db.prepare('SELECT count(*) as c FROM users').get();
console.log(`  Total users: ${count.c}`);

console.log('\n=== Sample Users (password_hash check) ===');
const users = db.prepare('SELECT id, name, phone, role, password_hash, isVip, isLoyalClient FROM users LIMIT 5').all();
users.forEach(u => {
  console.log(`  ${u.id} | ${u.name} | ${u.phone} | ${u.role} | hash: ${u.password_hash ? 'YES' : 'NO'} | isVip: ${u.isVip} | isLoyalClient: ${u.isLoyalClient}`);
});

console.log('\n=== Transactions Table Schema ===');
const txCols = db.prepare('PRAGMA table_info(transactions)').all();
txCols.forEach(c => console.log(`  ${c.name} (${c.type})`));

db.close();
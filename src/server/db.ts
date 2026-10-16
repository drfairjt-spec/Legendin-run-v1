import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

// Define DB_PATH
const DB_PATH: string = process.env.DB_PATH || path.join(process.cwd(), 'data', 'legendin.db');

// Ensure the database directory exists
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

// Initialize database
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Read and execute schema
const schemaPath = path.join(process.cwd(), 'src', 'server', 'schema.sql');
if (fs.existsSync(schemaPath)) {
  const schema = fs.readFileSync(schemaPath, 'utf-8');
  db.exec(schema);
}

// Auto-migrate schema changes if needed
try {
  const userCols = db.prepare("PRAGMA table_info(users)").all() as Array<{ name: string }>;
  if (userCols && !userCols.some(c => c.name === 'password_hash')) {
    db.exec("ALTER TABLE users ADD COLUMN password_hash TEXT;");
  }
} catch (e) {
  console.warn("Migration warning for users table:", e);
}

// Add isVip and isLoyalClient columns if missing
try {
  const userCols = db.prepare("PRAGMA table_info(users)").all() as Array<{ name: string }>;
  if (userCols && !userCols.some(c => c.name === 'isVip')) {
    db.exec("ALTER TABLE users ADD COLUMN isVip INTEGER DEFAULT 0;");
  }
  if (userCols && !userCols.some(c => c.name === 'isLoyalClient')) {
    db.exec("ALTER TABLE users ADD COLUMN isLoyalClient INTEGER DEFAULT 0;");
  }
} catch (e) {
  console.warn("Migration warning for isVip/isLoyalClient columns:", e);
}

// Export database instance
export { db };

// Export entity queries
function getAllUsers(): any[] {
  return db.prepare('SELECT * FROM users').all().map((user: any) => ({
    ...user,
    skills: JSON.parse(user.skills_json || '[]'),
    certifications: JSON.parse(user.certifications_json || '[]')
  }));
}

function getUserById(id: string): any | null {
  const user: any = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  return user ? {
    ...user,
    skills: JSON.parse(user.skills_json || '[]'),
    certifications: JSON.parse(user.certifications_json || '[]')
  } : null;
}

function getAllPosts(): any[] {
  return db.prepare('SELECT * FROM posts').all().map((post: any) => ({
    ...post,
    liked_by: JSON.parse(post.liked_by_json || '[]')
  }));
}

function getPostById(id: string): any | null {
  const post: any = db.prepare('SELECT * FROM posts WHERE id = ?').get(id);
  return post ? {
    ...post,
    liked_by: JSON.parse(post.liked_by_json || '[]')
  } : null;
}

export { getAllUsers, getUserById, getAllPosts, getPostById };
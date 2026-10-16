import 'dotenv/config';
import { db } from './db';
import { seedUsers, seedPosts, seedServices } from '../data';
import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';

export function seedDatabase(force = false) {
  const userCount = (db.prepare('SELECT count(*) as c FROM users').get() as { c: number }).c;
  if (userCount > 0 && !force) {
    // If existing users have null password_hash, populate with default hash
    try {
      const defaultHash = bcrypt.hashSync('123456', 10);
      db.prepare("UPDATE users SET password_hash = ? WHERE password_hash IS NULL").run(defaultHash);
    } catch (e) {
      console.warn("Could not backfill password_hash:", e);
    }
    console.log('Database already has data. Skipping seed.');
    return;
  }

  console.log('Seeding SQLite database...');

  if (force || userCount > 0) {
    db.exec(`
      DELETE FROM comments;
      DELETE FROM posts;
      DELETE FROM reviews;
      DELETE FROM portfolio_items;
      DELETE FROM discounted_slots;
      DELETE FROM hiring_offers;
      DELETE FROM client_requests;
      DELETE FROM transactions;
      DELETE FROM services;
      DELETE FROM users;
    `);
  }

  const defaultPasswordHash = bcrypt.hashSync('123456', 10);

  const insertUser = db.prepare(`
    INSERT OR REPLACE INTO users (
      id, name, role, phone, password_hash, avatar, cover_image, title, city, bio, resume_text,
      skills_json, certifications_json, open_for_hiring, accepting_requests,
      salon_name, salon_location, salon_description, contract_type,
      contract_start_date, contract_end_date, contract_amount, contract_file_url,
      guarantee_type, guarantee_file_url
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
  `);

  const insertPortfolio = db.prepare(`
    INSERT OR REPLACE INTO portfolio_items (id, user_id, image_url, title, description)
    VALUES (?, ?, ?, ?, ?)
  `);

  const insertReview = db.prepare(`
    INSERT OR REPLACE INTO reviews (id, user_id, reviewer_name, reviewer_avatar, rating, comment, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  // Insert guest user
  insertUser.run(
    'guest',
    'کاربر مهمان',
    'client',
    '09000000001',
    defaultPasswordHash,
    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?q=80&w=800&auto=format&fit=crop',
    'مهمان لجندین',
    'تهران',
    'در حال بررسی بازار کار زیبایی لجندین...',
    null,
    '[]',
    '[]',
    0,
    0,
    null, null, null, null, null, null, null, null, null, null
  );

  for (const u of seedUsers) {
    insertUser.run(
      u.id,
      u.name,
      u.role || 'client',
      u.phone || '09120000000',
      defaultPasswordHash,
      u.avatar || null,
      u.coverImage || null,
      u.title || null,
      u.city || null,
      u.bio || null,
      u.resumeText || null,
      JSON.stringify(u.skills || []),
      JSON.stringify(u.certifications || []),
      u.openForHiring ? 1 : 0,
      u.acceptingRequests !== false ? 1 : 0,
      u.salonName || null,
      u.salonLocation || null,
      u.salonDescription || null,
      u.contract?.contractType || null,
      u.contract?.startDate || null,
      u.contract?.endDate || null,
      u.contract?.amount || null,
      u.contract?.contractFileUrl || null,
      u.contract?.guaranteeType || null,
      u.contract?.guaranteeFileUrl || null
    );

    if (u.portfolio && Array.isArray(u.portfolio)) {
      for (const p of u.portfolio) {
        insertPortfolio.run(
          p.id || randomUUID(),
          u.id,
          p.imageUrl || (p as any).url || '',
          p.title || null,
          p.description || null
        );
      }
    }

    if (u.reviews && Array.isArray(u.reviews)) {
      for (const r of u.reviews) {
        insertReview.run(
          r.id || randomUUID(),
          u.id,
          r.reviewerName || 'کاربر لجندین',
          r.reviewerAvatar || null,
          r.rating || 5,
          r.comment || null,
          r.date || new Date().toISOString()
        );
      }
    }
  }

  const insertService = db.prepare(`
    INSERT OR REPLACE INTO services (id, parent_service_id, name, duration_minutes, price)
    VALUES (?, ?, ?, ?, ?)
  `);

  for (const s of seedServices) {
    insertService.run(
      s.id,
      s.parentServiceId || null,
      s.name,
      s.durationMinutes || 0,
      s.price || 0
    );
  }

  const insertPost = db.prepare(`
    INSERT OR REPLACE INTO posts (id, author_id, content, image, tag, likes_count, liked_by_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertComment = db.prepare(`
    INSERT OR REPLACE INTO comments (id, post_id, author_id, content, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);

  for (const p of seedPosts) {
    insertPost.run(
      p.id,
      p.authorId,
      p.content,
      p.image || null,
      p.tag || null,
      p.likesCount || 0,
      JSON.stringify(p.likedBy || []),
      p.createdAt || new Date().toISOString()
    );

    if (p.comments && Array.isArray(p.comments)) {
      for (const c of p.comments) {
        insertComment.run(
          c.id || randomUUID(),
          p.id,
          c.authorId || 'admin',
          c.content,
          c.createdAt || new Date().toISOString()
        );
      }
    }
  }

  // Seed default hiring offer
  const insertOffer = db.prepare(`
    INSERT OR REPLACE INTO hiring_offers (id, manager_id, artist_id, salon_name, message, offer_amount, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  insertOffer.run(
    'offer-default-1',
    'm1',
    'a1',
    'خانه زیبایی لجند (شعب جردن و زعفرانیه)',
    'سلام نگار عزیز، رزومه و نمونه کارهای بالیاژ شما فوق‌العاده بود. ما در شعبه جردن به یک آرتیست ارشد رنگ مو نیاز داریم.',
    '۳۵,۰۰۰,۰۰۰ تومان حقوق ثابت + ۴۰٪ پورسانت',
    'pending'
  );

  // Seed default client request
  const insertReq = db.prepare(`
    INSERT OR REPLACE INTO client_requests (id, client_id, target_id, target_type, service_type, preferred_date, preferred_time, note, status, price, cancellation_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertReq.run(
    'req-1',
    'guest',
    'a1',
    'artist',
    'بالیاژ روسی طلایی',
    '1405/04/14',
    '11:30',
    'لطفاً برای موهای دکلره شده قبلی دقت فرمایید.',
    'pending',
    2500000,
    '[]'
  );

  console.log('Successfully seeded database!');
}

// Use path module to determine if script is being executed directly
const path = require('path');
const isMain = (process.argv[1] && path.resolve(process.argv[1])) === path.resolve(__filename);

if (isMain) {
  const force = process.argv.includes('--force');
  seedDatabase(force);
}

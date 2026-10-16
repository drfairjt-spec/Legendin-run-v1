import { Router, Response } from 'express';
import { db } from '../db';
import {
  generateToken,
  hashPassword,
  comparePassword,
  authenticateToken,
  AuthenticatedRequest
} from '../middleware/auth';
import { randomUUID } from 'crypto';

const router = Router();

// Helper to format user for frontend, omitting sensitive fields
export function formatUserResponse(u: any): any {
  if (!u) return null;

  const portfolio = db.prepare('SELECT * FROM portfolio_items WHERE user_id = ?').all(u.id).map((p: any) => ({
    id: p.id,
    imageUrl: p.image_url,
    url: p.image_url,
    title: p.title,
    description: p.description
  }));

  const reviews = db.prepare('SELECT * FROM reviews WHERE user_id = ?').all(u.id).map((r: any) => ({
    id: r.id,
    reviewerName: r.reviewer_name,
    reviewerAvatar: r.reviewer_avatar,
    rating: r.rating,
    comment: r.comment,
    date: r.created_at
  }));

  let skills = [];
  try {
    skills = JSON.parse(u.skills_json || '[]');
  } catch {
    skills = [];
  }

  let certifications = [];
  try {
    certifications = JSON.parse(u.certifications_json || '[]');
  } catch {
    certifications = [];
  }

  return {
    id: u.id,
    name: u.name,
    role: u.role,
    phone: u.phone,
    avatar: u.avatar,
    coverImage: u.cover_image,
    title: u.title,
    city: u.city,
    bio: u.bio,
    resumeText: u.resume_text,
    skills,
    certifications,
    portfolio,
    reviews,
    openForHiring: Boolean(u.open_for_hiring),
    acceptingRequests: Boolean(u.accepting_requests),
    salonName: u.salon_name,
    salonLocation: u.salon_location,
    salonDescription: u.salon_description,
    contract: u.contract_type ? {
      contractType: u.contract_type,
      type: u.contract_type,
      startDate: u.contract_start_date,
      endDate: u.contract_end_date,
      amount: u.contract_amount,
      contractFileUrl: u.contract_file_url,
      guaranteeType: u.guarantee_type,
      guaranteeFileUrl: u.guarantee_file_url
    } : undefined
  };
}

// Normalize Iranian phone numbers (e.g., "09121234567" or "9121234567" -> "09121234567")
function normalizePhone(phone: string): string {
  const cleaned = phone.trim().replace(/[^\d]/g, '');
  if (cleaned.startsWith('98')) {
    return '0' + cleaned.slice(2);
  }
  if (!cleaned.startsWith('0') && cleaned.length === 10) {
    return '0' + cleaned;
  }
  return cleaned;
}

// POST /api/auth/register
router.post('/register', (req, res: Response) => {
  try {
    const {
      name,
      phone,
      password,
      role = 'artist',
      city = 'تهران',
      title,
      bio,
      salonName,
      salonLocation,
      salonDescription,
      skills = [],
      certifications = [],
      avatar,
      coverImage
    } = req.body;

    if (!name || !phone || !password) {
      return res.status(400).json({ error: 'لطفاً نام، شماره موبایل و رمز عبور را وارد کنید.' });
    }

    if (password.length < 4) {
      return res.status(400).json({ error: 'رمز عبور باید حداقل ۴ کاراکتر باشد.' });
    }

    const validRoles = ['client', 'artist', 'manager', 'service-staff'];
    const assignedRole = validRoles.includes(role) ? role : 'client';

    const normalizedPhone = normalizePhone(phone);
    if (normalizedPhone.length < 10) {
      return res.status(400).json({ error: 'شماره موبایل وارد شده معتبر نمی‌باشد.' });
    }

    // Check if user already exists
    const existing = db.prepare('SELECT id FROM users WHERE phone = ? OR phone = ?').get(
      normalizedPhone,
      normalizedPhone.replace(/^0/, '')
    );

    if (existing) {
      return res.status(409).json({ error: 'این شماره موبایل قبلاً در سیستم ثبت شده است. لطفاً وارد شوید.' });
    }

    const userId = 'user-' + Date.now();
    const passwordHash = hashPassword(password);

    const defaultAvatar = avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150&auto=format&fit=crop';
    const defaultCover = coverImage || 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?q=80&w=800&auto=format&fit=crop';

    const insertStmt = db.prepare(`
      INSERT INTO users (
        id, name, role, phone, password_hash, avatar, cover_image, title, city, bio,
        skills_json, certifications_json, open_for_hiring, accepting_requests,
        salon_name, salon_location, salon_description
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertStmt.run(
      userId,
      name.trim(),
      assignedRole,
      normalizedPhone,
      passwordHash,
      defaultAvatar,
      defaultCover,
      title || (assignedRole === 'manager' ? `مدیریت سالن ${salonName || ''}` : 'متخصص زیبایی لجندین'),
      city || 'تهران',
      bio || 'عضو جدید خانواده تخصصی لجندین',
      JSON.stringify(skills),
      JSON.stringify(certifications),
      assignedRole !== 'client' ? 1 : 0,
      1,
      salonName || null,
      salonLocation || null,
      salonDescription || null
    );

    const createdUserRow = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    const sanitizedUser = formatUserResponse(createdUserRow);

    const token = generateToken({
      id: sanitizedUser.id,
      role: sanitizedUser.role,
      phone: sanitizedUser.phone,
      name: sanitizedUser.name
    });

    return res.status(201).json({
      message: 'ثبت‌نام با موفقیت انجام شد.',
      token,
      user: sanitizedUser
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'خطایی در ثبت‌نام رخ داد. لطفاً مجدداً تلاش نمایید.' });
  }
});

// POST /api/auth/login
router.post('/login', (req, res: Response) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({ error: 'لطفاً شماره موبایل و رمز عبور را وارد کنید.' });
    }

    const normalized = normalizePhone(phone);
    const withoutZero = normalized.replace(/^0/, '');

    const user: any = db.prepare('SELECT * FROM users WHERE phone = ? OR phone = ?').get(normalized, withoutZero);

    if (!user) {
      return res.status(401).json({ error: 'کاربری با این شماره موبایل در سیستم یافت نشد.' });
    }

    // Check password
    let isPasswordValid = false;

    if (user.password_hash) {
      isPasswordValid = comparePassword(password, user.password_hash);
    } else {
      // Legacy user without hash: allow "123456" for demo/seed users and migrate their hash
      if (password === '123456') {
        isPasswordValid = true;
        const newHash = hashPassword('123456');
        db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, user.id);
      }
    }

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'رمز عبور وارد شده نادرست است.' });
    }

    const sanitizedUser = formatUserResponse(user);
    const token = generateToken({
      id: sanitizedUser.id,
      role: sanitizedUser.role,
      phone: sanitizedUser.phone,
      name: sanitizedUser.name
    });

    return res.json({
      message: 'ورود با موفقیت انجام شد.',
      token,
      user: sanitizedUser
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'خطایی در ورود به سیستم رخ داد.' });
  }
});

// GET /api/auth/me - Get current authenticated user session
router.get('/me', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'کاربر احراز هویت نشده است.' });
    }

    const userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    if (!userRow) {
      return res.status(404).json({ error: 'حساب کاربری یافت نشد.' });
    }

    const sanitized = formatUserResponse(userRow);
    return res.json({ user: sanitized });
  } catch (error: any) {
    console.error('Auth /me error:', error);
    return res.status(500).json({ error: 'خطا در بازیابی اطلاعات کاربر.' });
  }
});

export default router;

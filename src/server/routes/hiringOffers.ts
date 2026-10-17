// src/server/routes/hiringOffers.ts
import { Router, Response } from 'express';
import { db } from '../db.ts';
import { authenticateToken, requireRole, AuthenticatedRequest } from '../middleware/auth.ts';
import { randomUUID } from 'crypto';

const router = Router();

// GET /api/hiring-offers
router.get('/', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const userId = user.id;

    if (user.role !== 'manager' && user.role !== 'artist') {
      return res.status(403).json({ error: 'دسترسی مجاز نمی‌باشد.' });
    }

    const rows = db.prepare(`
      SELECT * FROM hiring_offers WHERE manager_id = ? OR artist_id = ?
      ORDER BY created_at DESC
    `).all(userId, userId);

    const getUserStmt = db.prepare('SELECT name FROM users WHERE id = ?');
    const offers = rows.map((o: any) => {
      const manager: any = getUserStmt.get(o.manager_id) || { name: 'مدیر سالن لجند' };
      const artist: any = getUserStmt.get(o.artist_id) || { name: 'آرتیست لجندین' };
      return {
        id: o.id,
        managerId: o.manager_id,
        managerName: manager.name,
        artistId: o.artist_id,
        artistName: artist.name,
        salonName: o.salon_name,
        message: o.message,
        offerAmount: o.offer_amount,
        status: o.status,
        createdAt: o.created_at
      };
    });

    res.json(offers);
  } catch (error: any) {
    console.error('Error fetching hiring offers:', error);
    res.status(500).json({ error: 'خطا در بارگذاری پیشنهادهای استخدامی.' });
  }
});

// POST /api/hiring-offers
router.post('/', authenticateToken, requireRole(['manager']), (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const { artist_id, salon_name, message, offer_amount } = req.body;

    if (!artist_id) {
      return res.status(400).json({ error: 'لطفاً آرتیست هدف را وارد کنید.' });
    }

    // Verify artist exists and has role artist
    const artist = db.prepare('SELECT id, role FROM users WHERE id = ?').get(artist_id);
    if (!artist || artist.role !== 'artist') {
      return res.status(400).json({ error: 'کاربر هدف یک آرتیست معتبر نمی‌باشد.' });
    }

    // Validate message length
    if (message && (typeof message !== 'string' || message.length > 1000)) {
      return res.status(400).json({ error: 'پیام نباید بیش از ۱۰۰۰ کاراکتر باشد.' });
    }

    // Validate offer_amount length
    if (offer_amount && (typeof offer_amount !== 'string' || offer_amount.length > 50)) {
      return res.status(400).json({ error: 'مبلغ پیشنهادی نامعتبر است.' });
    }

    const offerId = 'offer-' + randomUUID();

    const stmt = db.prepare(`
      INSERT INTO hiring_offers
      (id, manager_id, artist_id, salon_name, message, offer_amount, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      offerId,
      user.id,
      artist_id,
      salon_name || null,
      message || null,
      offer_amount || '0',
      'pending'
    );

    res.status(201).json({ id: offerId });
  } catch (error: any) {
    console.error('Error creating hiring offer:', error);
    res.status(500).json({ error: 'خطا در ثبت پیشنهاد استخدامی.' });
  }
});

export default router;
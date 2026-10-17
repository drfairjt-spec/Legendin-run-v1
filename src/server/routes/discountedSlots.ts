// src/server/routes/discountedSlots.ts
import { Router, Response } from 'express';
import { db } from '../db.ts';
import { authenticateToken, optionalAuth, requireRole, AuthenticatedRequest } from '../middleware/auth.ts';
import { randomUUID } from 'crypto';

const router = Router();

// GET /api/discounted-slots
router.get('/', optionalAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;

    let whereClause = '';
    const params: any[] = [];

    if (user) {
      // Logged-in user
      if (user.role === 'artist' || user.role === 'manager') {
        // Artists and managers see their own slots plus available ones
        whereClause = 'WHERE status = ? OR artist_id = ?';
        params.push('available', user.id);
      } else {
        // Other logged-in users (client, service-staff) see only available
        whereClause = 'WHERE status = ?';
        params.push('available');
      }
    } else {
      // Logged-out users see only available slots
      whereClause = 'WHERE status = ?';
      params.push('available');
    }

    const query = `
      SELECT * FROM discounted_slots
      ${whereClause}
      ORDER BY created_at DESC
    `;

    const rawSlots = db.prepare(query).all(...params);
    const slots = rawSlots.map((s: any) => ({
      id: s.id,
      originalRequestId: s.original_request_id,
      artistId: s.artist_id,
      artistName: s.artist_name,
      salonName: s.salon_name,
      serviceType: s.service_type,
      date: s.date,
      time: s.time,
      originalPrice: s.original_price,
      discountedPrice: s.discounted_price,
      discountPercent: s.discount_percent,
      appCommissionPercent: s.app_commission_percent,
      status: s.status,
      claimedByClientId: s.claimed_by_client_id,
      createdAt: s.created_at
    }));

    res.json(slots);
  } catch (error: any) {
    console.error('Error fetching discounted slots:', error);
    res.status(500).json({ error: 'خطا در بارگذاری نوبت‌های تخفیف‌دار.' });
  }
});

// POST /api/discounted-slots
router.post('/', authenticateToken, requireRole(['artist', 'manager']), (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const {
      original_request_id,
      artist_id,
      artist_name,
      salon_name,
      service_type,
      date,
      time,
      original_price,
      discounted_price,
      discount_percent,
      app_commission_percent,
      status,
      claimed_by_client_id
    } = req.body;

    if (!original_request_id || !artist_id) {
      return res.status(400).json({ error: 'لطفاً فیلدهای ضروری را وارد کنید.' });
    }

    // For artists, artist_id must match their own ID
    if (user.role === 'artist' && artist_id !== user.id) {
      return res.status(403).json({ error: 'شما فقط می‌توانید نوبت برای خودتان ایجاد کنید.' });
    }

    // Verify original request exists
    const originalRequest = db.prepare('SELECT id FROM client_requests WHERE id = ?').get(original_request_id);
    if (!originalRequest) {
      return res.status(400).json({ error: 'درخواست اصلی معتبر نمی‌باشد.' });
    }

    // Validate service_type
    if (service_type && (typeof service_type !== 'string' || service_type.length > 100)) {
      return res.status(400).json({ error: 'نوع سرویس نامعتبر است.' });
    }

    // Validate date format (YYYY/MM/DD or YYYY-MM-DD)
    if (date && !/^\d{4}[/-]\d{2}[/-]\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'فرمت تاریخ نامعتبر است.' });
    }

    // Validate time format (HH:MM)
    if (time && !/^\d{2}:\d{2}$/.test(time)) {
      return res.status(400).json({ error: 'فرمت زمان نامعتبر است.' });
    }

    // Validate prices
    const parsedOriginalPrice = parseInt(String(original_price), 10);
    const parsedDiscountedPrice = parseInt(String(discounted_price), 10);

    if (isNaN(parsedOriginalPrice) || parsedOriginalPrice < 0) {
      return res.status(400).json({ error: 'مبلغ اصلی نامعتبر است.' });
    }

    if (isNaN(parsedDiscountedPrice) || parsedDiscountedPrice < 0) {
      return res.status(400).json({ error: 'مبلغ تخفیف‌دار نامعتبر است.' });
    }

    if (parsedDiscountedPrice > parsedOriginalPrice) {
      return res.status(400).json({ error: 'مبلغ تخفیف‌دار نمی‌تواند بیش از مبلغ اصلی باشد.' });
    }

    // Validate percentages
    const parsedDiscountPercent = parseInt(String(discount_percent), 10);
    const parsedAppCommissionPercent = parseInt(String(app_commission_percent), 10);

    if (isNaN(parsedDiscountPercent) || parsedDiscountPercent < 0 || parsedDiscountPercent > 100) {
      return res.status(400).json({ error: 'درصد تخفیف باید بین 0 و 100 باشد.' });
    }

    if (isNaN(parsedAppCommissionPercent) || parsedAppCommissionPercent < 0 || parsedAppCommissionPercent > 100) {
      return res.status(400).json({ error: 'درصد کمیسیون اپلیکیشن باید بین 0 و 100 باشد.' });
    }

    const slotId = 'slot-' + randomUUID();

    const stmt = db.prepare(`
      INSERT INTO discounted_slots
      (id, original_request_id, artist_id, artist_name, salon_name, service_type, date, time, original_price, discounted_price, discount_percent, app_commission_percent, status, claimed_by_client_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      slotId,
      original_request_id,
      artist_id,
      artist_name || null,
      salon_name || null,
      service_type || null,
      date || null,
      time || null,
      parsedOriginalPrice,
      parsedDiscountedPrice,
      parsedDiscountPercent,
      parsedAppCommissionPercent,
      status || 'available',
      claimed_by_client_id || null
    );

    res.status(201).json({ id: slotId });
  } catch (error: any) {
    console.error('Error creating discounted slot:', error);
    res.status(500).json({ error: 'خطا در ثبت نوبت تخفیف‌دار.' });
  }
});

// Update discounted slot status
router.patch('/:id/status', authenticateToken, requireRole(['artist', 'manager']), (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const { id } = req.params;
    const { status, claimed_by_client_id } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'لطفاً وضعیت را وارد کنید.' });
    }

    // Validate status
    const allowedStatuses = ['available', 'claimed', 'expired'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ error: 'وضعیت نامعتبر است.' });
    }

    // Get the slot to check ownership
    const slot = db.prepare('SELECT * FROM discounted_slots WHERE id = ?').get(id);
    if (!slot) {
      return res.status(404).json({ error: 'نوبت یافت نشد.' });
    }

    // For artists, they can only update their own slots
    if (user.role === 'artist' && slot.artist_id !== user.id) {
      return res.status(403).json({ error: 'شما فقط می‌توانید نوبت‌های خودتان را به‌روزرسانی کنید.' });
    }

    // For managers, they can update any slot (but we'll keep this restrictive for now)
    // In Phase 1, managers will be able to update slots for their salon

    let updateQuery = 'UPDATE discounted_slots SET status = ?';
    const params: any[] = [status];

    if (claimed_by_client_id !== undefined) {
      updateQuery += ', claimed_by_client_id = ?';
      params.push(claimed_by_client_id);
    }

    updateQuery += ' WHERE id = ?';
    params.push(id);

    db.prepare(updateQuery).run(...params);

    res.json({ id, status });
  } catch (error: any) {
    console.error('Error updating discounted slot status:', error);
    res.status(500).json({ error: 'خطا در به‌روزرسانی وضعیت نوبت تخفیف‌دار.' });
  }
});

export default router;
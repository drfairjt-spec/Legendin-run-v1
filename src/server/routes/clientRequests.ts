// src/server/routes/clientRequests.ts
import { Router, Response } from 'express';
import { db } from '../db.ts';
import { authenticateToken, requireRole, AuthenticatedRequest } from '../middleware/auth.ts';
import { randomUUID } from 'crypto';

const router = Router();

// GET /api/client-requests
router.get('/', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const userId = user.id;

    let rows: any[];
    if (user.role === 'client') {
      rows = db.prepare('SELECT * FROM client_requests WHERE client_id = ? ORDER BY created_at DESC').all(userId);
    } else if (user.role === 'artist' || user.role === 'service-staff') {
      rows = db.prepare('SELECT * FROM client_requests WHERE target_id = ? ORDER BY created_at DESC').all(userId);
    } else if (user.role === 'manager') {
      // Managers see requests of their staff (target_id = their user id)
      rows = db.prepare('SELECT * FROM client_requests WHERE target_id = ? ORDER BY created_at DESC').all(userId);
    } else {
      return res.status(403).json({ error: 'دسترسی مجاز نمی‌باشد.' });
    }

    const getUserStmt = db.prepare('SELECT name, phone FROM users WHERE id = ?');
    const requests = rows.map((r: any) => {
      const client: any = getUserStmt.get(r.client_id) || { name: 'کاربر لجندین', phone: '09120000000' };
      const target: any = getUserStmt.get(r.target_id) || { name: 'متخصص زیبایی' };

      // clientPhone only visible to the target user of that request or the client themself
      const clientPhone = (user.role === 'client' && r.client_id === userId) || (r.target_id === userId)
        ? client.phone
        : undefined;

      return {
        id: r.id,
        clientId: r.client_id,
        clientName: client.name,
        clientPhone,
        targetId: r.target_id,
        targetName: target.name,
        targetType: r.target_type,
        serviceType: r.service_type,
        serviceId: r.service_id,
        preferredDate: r.preferred_date,
        preferredTime: r.preferred_time,
        note: r.note,
        status: r.status,
        price: r.price,
        cancellation: JSON.parse(r.cancellation_json || '[]'),
        createdAt: r.created_at
      };
    });

    res.json(requests);
  } catch (error: any) {
    console.error('Error fetching client requests:', error);
    res.status(500).json({ error: 'خطا در بارگذاری درخواست‌های مشتریان.' });
  }
});

// POST /api/client-requests
router.post('/', authenticateToken, requireRole(['client']), (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const { target_id, target_type, service_type, service_id, preferred_date, preferred_time, note, price } = req.body;

    // Validate required fields
    if (!target_id || !target_type || !service_type) {
      return res.status(400).json({ error: 'لطفاً فیلدهای ضروری را وارد کنید.' });
    }

    // Validate target exists
    const targetUser = db.prepare('SELECT id FROM users WHERE id = ?').get(target_id);
    if (!targetUser) {
      return res.status(400).json({ error: 'هدف معتبر نمی‌باشد.' });
    }

    // Validate target_type
    const allowedTargetTypes = ['artist', 'service-staff', 'manager'];
    if (!allowedTargetTypes.includes(target_type)) {
      return res.status(400).json({ error: 'نوع هدف نامعتبر است.' });
    }

    // Validate service_type length
    if (typeof service_type !== 'string' || service_type.length > 100) {
      return res.status(400).json({ error: 'نوع سرویس نامعتبر است.' });
    }

    // Validate note length
    if (note && (typeof note !== 'string' || note.length > 1000)) {
      return res.status(400).json({ error: 'یادداشت نباید بیش از ۱۰۰۰ کاراکتر باشد.' });
    }

    // Validate price
    const parsedPrice = parseInt(String(price), 10);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      return res.status(400).json({ error: 'قیمت نامعتبر است.' });
    }

    const requestId = 'req-' + randomUUID();

    const stmt = db.prepare(`
      INSERT INTO client_requests
      (id, client_id, target_id, target_type, service_type, service_id, preferred_date, preferred_time, note, status, price, cancellation_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      requestId,
      user.id,
      target_id,
      target_type,
      service_type,
      service_id || null,
      preferred_date || null,
      preferred_time || null,
      note || null,
      'pending',
      parsedPrice,
      '[]'
    );

    res.status(201).json({ id: requestId });
  } catch (error: any) {
    console.error('Error creating client request:', error);
    res.status(500).json({ error: 'خطا در ثبت درخواست مشتری.' });
  }
});

export default router;
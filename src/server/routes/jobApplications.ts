// src/server/routes/jobApplications.ts
import { Router, Response } from 'express';
import { db } from '../db.ts';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.ts';
import { randomUUID } from 'crypto';

const router = Router();

// GET /api/job-applications
router.get('/', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const userId = user.id;

    if (user.role !== 'client' && user.role !== 'manager') {
      return res.status(403).json({ error: 'دسترسی مجاز نمی‌باشد.' });
    }

    const rows = db.prepare(`
      SELECT * FROM job_applications WHERE applicant_id = ? OR salon_id = ?
      ORDER BY created_at DESC
    `).all(userId, userId);

    res.json(rows.map((app: any) => ({
      id: app.id,
      applicantId: app.applicant_id,
      salonId: app.salon_id,
      message: app.message,
      status: app.status,
      createdAt: app.created_at
    })));
  } catch (error: any) {
    console.error('Error fetching job applications:', error);
    res.status(500).json({ error: 'خطا در بارگذاری درخواست‌های شغلی.' });
  }
});

// POST /api/job-applications
router.post('/', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const { applicant_id, salon_id, message } = req.body;

    if (!applicant_id || !salon_id) {
      return res.status(400).json({ error: 'لطفاً متقاضی و سالن را وارد کنید.' });
    }

    // Verify applicant exists
    const applicant = db.prepare('SELECT id FROM users WHERE id = ?').get(applicant_id);
    if (!applicant) {
      return res.status(400).json({ error: 'متقاضی معتبر نمی‌باشد.' });
    }

    // Verify salon exists (must be a manager)
    const salon = db.prepare('SELECT id, role FROM users WHERE id = ?').get(salon_id);
    if (!salon || salon.role !== 'manager') {
      return res.status(400).json({ error: 'سالن معتبر نمی‌باشد.' });
    }

    // Validate message length
    if (message && (typeof message !== 'string' || message.length > 1000)) {
      return res.status(400).json({ error: 'پیام نباید بیش از ۱۰۰۰ کاراکتر باشد.' });
    }

    const applicationId = 'app-' + randomUUID();

    const stmt = db.prepare(`
      INSERT INTO job_applications
      (id, applicant_id, salon_id, message, status, created_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
    `);

    stmt.run(
      applicationId,
      applicant_id,
      salon_id,
      message || null,
      'pending'
    );

    res.status(201).json({ id: applicationId });
  } catch (error: any) {
    console.error('Error creating job application:', error);
    res.status(500).json({ error: 'خطا در ثبت درخواست شغلی.' });
  }
});

export default router;
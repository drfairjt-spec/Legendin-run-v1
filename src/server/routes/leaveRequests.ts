// src/server/routes/leaveRequests.ts
import { Router, Response } from 'express';
import { db } from '../db.ts';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.ts';
import { randomUUID } from 'crypto';

const router = Router();

// GET /api/leave-requests
router.get('/', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;

    let rows: any[];
    if (user.role === 'manager') {
      rows = db.prepare('SELECT * FROM leave_requests ORDER BY start_date DESC').all();
    } else {
      rows = db.prepare('SELECT * FROM leave_requests WHERE staff_id = ? ORDER BY start_date DESC').all(user.id);
    }

    const leaves = rows.map((l: any) => ({
      id: l.id,
      staffId: l.staff_id,
      startDate: l.start_date,
      endDate: l.end_date,
      requiresApproval: Boolean(l.requires_approval),
      status: l.status,
      note: l.note
    }));

    res.json(leaves);
  } catch (error: any) {
    console.error('Error fetching leave requests:', error);
    res.status(500).json({ error: 'خطا در بارگذاری درخواست‌های مرخصی.' });
  }
});

// POST /api/leave-requests
router.post('/', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const { id, staff_id, start_date, end_date, requires_approval, status, note } = req.body;

    if (!staff_id || !start_date) {
      return res.status(400).json({ error: 'لطفاً فیلدهای ضروری را وارد کنید.' });
    }

    // Validate dates
    const dateRegex = /^\d{4}[/-]\d{2}[/-]\d{2}$/;
    if (!dateRegex.test(start_date)) {
      return res.status(400).json({ error: 'فرمت تاریخ شروع نامعتبر است.' });
    }

    if (end_date && !dateRegex.test(end_date)) {
      return res.status(400).json({ error: 'فرمت تاریخ پایان نامعتبر است.' });
    }

    if (end_date && end_date < start_date) {
      return res.status(400).json({ error: 'تاریخ پایان نمی‌تواند قبل از تاریخ شروع باشد.' });
    }

    // Validate status
    const allowedStatuses = ['pending', 'accepted', 'declined', 'logged'];
    if (status && !allowedStatuses.includes(status)) {
      return res.status(400).json({ error: 'وضعیت نامعتبر است.' });
    }

    // Only managers may set accepted/declined
    if (status && (status === 'accepted' || status === 'declined') && user.role !== 'manager') {
      return res.status(403).json({ error: 'شما مجاز به تغییر این وضعیت نیستید.' });
    }

    // If id is provided, treat as an update (P0-14)
    if (id) {
      const existing = db.prepare('SELECT * FROM leave_requests WHERE id = ?').get(id);
      if (!existing) {
        return res.status(404).json({ error: 'درخواست مرخصی یافت نشد.' });
      }

      // Only allow update if the row belongs to the caller or caller is manager
      if (existing.staff_id !== user.id && user.role !== 'manager') {
        return res.status(403).json({ error: 'شما فقط می‌توانید درخواست مرخصی خودتان را ویرایش کنید.' });
      }

      db.prepare(`
        UPDATE leave_requests
        SET staff_id = ?, start_date = ?, end_date = ?, requires_approval = ?, status = ?, note = ?
        WHERE id = ?
      `).run(
        staff_id,
        start_date,
        end_date || start_date,
        requires_approval ? 1 : 0,
        status || 'logged',
        note || null,
        id
      );

      const updated = db.prepare('SELECT * FROM leave_requests WHERE id = ?').get(id);
      return res.status(200).json({
        id: updated.id,
        staffId: updated.staff_id,
        startDate: updated.start_date,
        endDate: updated.end_date,
        requiresApproval: Boolean(updated.requires_approval),
        status: updated.status,
        note: updated.note
      });
    }

    // Create new leave request
    const leaveId = 'leave-' + randomUUID();

    db.prepare(`
      INSERT INTO leave_requests
      (id, staff_id, start_date, end_date, requires_approval, status, note)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      leaveId,
      staff_id,
      start_date,
      end_date || start_date,
      requires_approval ? 1 : 0,
      status || 'logged',
      note || null
    );

    res.status(201).json({ id: leaveId });
  } catch (error: any) {
    console.error('Error creating/updating leave request:', error);
    res.status(500).json({ error: 'خطا در ثبت درخواست مرخصی.' });
  }
});

// DELETE /api/leave-requests/:id
router.delete('/:id', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const leaveId = req.params.id;

    const existing = db.prepare('SELECT * FROM leave_requests WHERE id = ?').get(leaveId);
    if (!existing) {
      return res.status(404).json({ error: 'درخواست مرخصی یافت نشد.' });
    }

    // Only allow deletion by the owner or a manager
    if (existing.staff_id !== user.id && user.role !== 'manager') {
      return res.status(403).json({ error: 'شما فقط می‌توانید درخواست مرخصی خودتان را حذف کنید.' });
    }

    db.prepare('DELETE FROM leave_requests WHERE id = ?').run(leaveId);
    res.json({ message: 'درخواست مرخصی با موفقیت حذف شد.' });
  } catch (error: any) {
    console.error('Error deleting leave request:', error);
    res.status(500).json({ error: 'خطا در حذف درخواست مرخصی.' });
  }
});

export default router;
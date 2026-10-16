import { Router, Response } from 'express';
import { db } from '../db';
import {
  authenticateToken,
  requireRole,
  AuthenticatedRequest
} from '../middleware/auth';
import { randomUUID } from 'crypto';

const router = Router();

const ALLOWED_COST_CATEGORIES = [
  'اجاره سالن',
  'خرید و مایحتاج',
  'قبوض',
  'حقوق پرسنل',
  'سایر هزینه'
];

const ALLOWED_INCOME_CATEGORIES = [
  'درآمد خدمات',
  'درآمد نوبت تخفیف‌دار',
  'سایر درآمد'
];

// Helper to format a transaction row for API response
function formatTransaction(t: any) {
  return {
    id: t.id,
    salonId: t.salon_id,
    direction: t.direction,
    category: t.category,
    amount: t.amount,
    date: t.date,
    description: t.description || undefined,
    receiptUrl: t.receipt_url || undefined,
    relatedStaffId: t.related_staff_id || undefined,
    relatedRequestId: t.related_request_id || undefined,
    createdAt: t.created_at
  };
}

// GET /api/transactions - Secure, role-scoped financial ledger
router.get('/', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;

    // Clients and regular users have no access to accounting ledgers
    if (user.role === 'client') {
      return res.status(403).json({ error: 'دسترسی به اسناد مالی سالن مجاز نمی‌باشد.' });
    }

    let rows: any[] = [];

    if (user.role === 'manager') {
      // Salon Managers can see all ledger records for their salon
      const stmt = db.prepare(`
        SELECT * FROM transactions
        ORDER BY date DESC, created_at DESC
      `);
      rows = stmt.all();
    } else if (user.role === 'artist') {
      // Artists can ONLY see transactions where they are the assigned staff member
      // They cannot inspect salon rent, utility bills, or other artists' earnings
      const stmt = db.prepare(`
        SELECT * FROM transactions
        WHERE related_staff_id = ?
        ORDER BY date DESC, created_at DESC
      `);
      rows = stmt.all(user.id);
    } else {
      return res.status(403).json({ error: 'سطح دسترسی شما برای مشاهده اسناد مالی کافی نیست.' });
    }

    const transactions = rows.map(formatTransaction);
    return res.json(transactions);
  } catch (error: any) {
    console.error('Error fetching transactions:', error);
    return res.status(500).json({ error: 'خطا در بارگذاری اطلاعات مالی سالن.' });
  }
});

// POST /api/transactions - Create new transaction with strict authorization and validation
router.post('/', authenticateToken, requireRole(['manager']), (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      salon_id,
      direction,
      category,
      amount,
      date,
      description,
      receipt_url,
      related_staff_id,
      related_request_id
    } = req.body;

    // 1. Validate direction
    if (direction !== 'income' && direction !== 'cost') {
      return res.status(400).json({ error: 'نوع تراکنش باید "درآمد" (income) یا "هزینه" (cost) باشد.' });
    }

    // 2. Validate category against whitelist
    const validCategories = direction === 'income' ? ALLOWED_INCOME_CATEGORIES : ALLOWED_COST_CATEGORIES;
    if (!category || !validCategories.includes(category)) {
      return res.status(400).json({
        error: `دسته‌بندی نامعتبر است. دسته‌بندی‌های مجاز برای ${direction === 'income' ? 'درآمد' : 'هزینه'}: ${validCategories.join(', ')}`
      });
    }

    // 3. Validate numeric amount
    const parsedAmount = parseInt(String(amount), 10);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: 'مبلغ تراکنش باید یک عدد مثبت معتبر باشد.' });
    }
    if (parsedAmount > 10_000_000_000) {
      return res.status(400).json({ error: 'مبلغ تراکنش خارج از محدوده مجاز سیستم است.' });
    }

    // 4. Validate or format date
    const txDate = (typeof date === 'string' && date.trim()) ? date.trim() : new Date().toISOString().split('T')[0];

    // 5. Sanitize text fields
    const sanitizedDesc = description ? String(description).slice(0, 500).trim() : null;
    const sanitizedReceiptUrl = receipt_url ? String(receipt_url).slice(0, 500).trim() : null;

    // 6. Verify related staff if provided
    let staffId: string | null = null;
    if (related_staff_id) {
      const staffUser = db.prepare('SELECT id FROM users WHERE id = ?').get(related_staff_id);
      if (staffUser) {
        staffId = related_staff_id;
      }
    }

    // 7. Verify related client request if provided
    let requestId: string | null = null;
    if (related_request_id) {
      const reqRow = db.prepare('SELECT id FROM client_requests WHERE id = ?').get(related_request_id);
      if (reqRow) {
        requestId = related_request_id;
      }
    }

    const txId = 'tx-' + randomUUID();
    const assignedSalonId = salon_id || 'salon-1';

    const insertStmt = db.prepare(`
      INSERT INTO transactions (
        id, salon_id, direction, category, amount, date, description,
        receipt_url, related_staff_id, related_request_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);

    insertStmt.run(
      txId,
      assignedSalonId,
      direction,
      category,
      parsedAmount,
      txDate,
      sanitizedDesc,
      sanitizedReceiptUrl,
      staffId,
      requestId
    );

    const createdRow = db.prepare('SELECT * FROM transactions WHERE id = ?').get(txId);
    return res.status(201).json(formatTransaction(createdRow));
  } catch (error: any) {
    console.error('Error creating transaction:', error);
    return res.status(500).json({ error: 'خطا در ثبت تراکنش مالی.' });
  }
});

// DELETE /api/transactions/:id - Delete transaction (Manager only)
router.delete('/:id', authenticateToken, requireRole(['manager']), (req: AuthenticatedRequest, res: Response) => {
  try {
    const txId = req.params.id;
    const existing = db.prepare('SELECT id FROM transactions WHERE id = ?').get(txId);

    if (!existing) {
      return res.status(404).json({ error: 'تراکنش مالی مورد نظر یافت نشد.' });
    }

    db.prepare('DELETE FROM transactions WHERE id = ?').run(txId);
    return res.json({ message: 'تراکنش با موفقیت حذف گردید.', id: txId });
  } catch (error: any) {
    console.error('Error deleting transaction:', error);
    return res.status(500).json({ error: 'خطا در حذف تراکنش مالی.' });
  }
});

// GET /api/transactions/summary - Database-level financial analytics
router.get('/summary', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    if (user.role === 'client') {
      return res.status(403).json({ error: 'دسترسی مجاز نمی‌باشد.' });
    }

    let incomeQuery = 'SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE direction = "income"';
    let costQuery = 'SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE direction = "cost"';
    const params: any[] = [];

    if (user.role === 'artist') {
      incomeQuery += ' AND related_staff_id = ?';
      costQuery += ' AND related_staff_id = ?';
      params.push(user.id);
    }

    const totalIncome = (db.prepare(incomeQuery).get(...params) as any).total;
    const totalCost = (db.prepare(costQuery).get(...params) as any).total;
    const netProfit = totalIncome - totalCost;

    return res.json({
      totalIncome,
      totalCost,
      netProfit,
      role: user.role
    });
  } catch (error: any) {
    console.error('Error calculating financial summary:', error);
    return res.status(500).json({ error: 'خطا در محاسبه آمار مالی.' });
  }
});

export default router;

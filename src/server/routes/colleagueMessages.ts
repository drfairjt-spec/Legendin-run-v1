// src/server/routes/colleagueMessages.ts
import { Router, Response } from 'express';
import { db } from '../db.ts';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.ts';
import { randomUUID } from 'crypto';

const router = Router();

// GET /api/colleague-messages (P0-15)
router.get('/', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const userId = user.id;

    // Return only rows where sender_id = user.id OR recipient_id = user.id
    const messages = db.prepare(`
      SELECT * FROM colleague_messages
      WHERE sender_id = ? OR recipient_id = ?
      ORDER BY created_at DESC
    `).all(userId, userId);

    // Attach message replies (P0-15)
    const messageIds = messages.map((m: any) => m.id);
    const repliesMap = new Map();

    if (messageIds.length > 0) {
      const placeholders = messageIds.map(() => '?').join(', ');
      const replies = db.prepare(`
        SELECT * FROM message_replies
        WHERE message_id IN (${placeholders})
        ORDER BY created_at ASC
      `).all(...messageIds);

      replies.forEach((reply: any) => {
        if (!repliesMap.has(reply.message_id)) {
          repliesMap.set(reply.message_id, []);
        }
        repliesMap.get(reply.message_id).push({
          id: reply.id,
          senderId: reply.sender_id,
          content: reply.content,
          createdAt: reply.created_at
        });
      });
    }

    const formattedMessages = messages.map((m: any) => ({
      id: m.id,
      senderId: m.sender_id,
      recipientId: m.recipient_id,
      content: m.content,
      createdAt: m.created_at,
      replies: repliesMap.get(m.id) || []
    }));

    res.json(formattedMessages);
  } catch (error: any) {
    console.error('Error fetching colleague messages:', error);
    res.status(500).json({ error: 'خطا در بارگذاری پیام‌های همکاران.' });
  }
});

// POST /api/colleague-messages
router.post('/', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const { recipient_id, content } = req.body;

    if (!recipient_id || !content) {
      return res.status(400).json({ error: 'لطفاً گیرنده و متن پیام را وارد کنید.' });
    }

    // Verify recipient exists
    const recipient = db.prepare('SELECT id FROM users WHERE id = ?').get(recipient_id);
    if (!recipient) {
      return res.status(400).json({ error: 'کاربر گیرنده یافت نشد.' });
    }

    if (typeof content !== 'string' || content.length > 2000) {
      return res.status(400).json({ error: 'متن پیام نباید بیش از ۲۰۰۰ کاراکتر باشد.' });
    }

    const messageId = 'msg-' + randomUUID();

    db.prepare(`
      INSERT INTO colleague_messages (id, sender_id, recipient_id, content, created_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `).run(
      messageId,
      user.id,
      recipient_id,
      content
    );

    res.status(201).json({ id: messageId });
  } catch (error: any) {
    console.error('Error creating colleague message:', error);
    res.status(500).json({ error: 'خطا در ارسال پیام به همکار.' });
  }
});

export default router;
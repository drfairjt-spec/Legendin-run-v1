import 'dotenv/config';
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import multer from 'multer';
import { randomUUID } from 'crypto';
import fs from 'fs';
import { db } from './src/server/db.ts'; // Import database connection from src/server/
import { seedDatabase } from './src/server/seed.ts'; // Auto-seed if empty
import { Transaction, ClientRequest, HiringOffer, DiscountedSlot } from './src/server/types'; // Import entity types
import authRoutes from './src/server/routes/auth'; // Auth routes
import financeRoutes from './src/server/routes/finance'; // Secure financial ledger routes
import { authenticateToken, optionalAuth } from './src/server/middleware/auth';
import { formatUserResponse, formatPublicUser } from './src/server/routes/auth';
import clientRequestsRoutes from './src/server/routes/clientRequests';
import hiringOffersRoutes from './src/server/routes/hiringOffers';
import jobApplicationsRoutes from './src/server/routes/jobApplications';
import discountedSlotsRoutes from './src/server/routes/discountedSlots';
import postsRoutes from './src/server/routes/posts';
import leaveRequestsRoutes from './src/server/routes/leaveRequests';
import colleagueMessagesRoutes from './src/server/routes/colleagueMessages';

let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined in the environment. Please configure it in Settings > Secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// P0-20: Security headers and body limits
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'same-site' } })); // TODO(Phase 1): enable CSP after self-hosting fonts and images
app.use(express.json({ limit: '100kb' }));
app.set('trust proxy', 1);
app.disable('x-powered-by');

// P0-21: Rate limiters
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'تعداد درخواست‌ها بیش از حد مجاز است. کمی بعد دوباره تلاش کنید.' }
});
app.use('/api/', globalLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'تعداد درخواست‌ها بیش از حد مجاز است. کمی بعد دوباره تلاش کنید.' }
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  keyGenerator: (req: any) => req.user?.id || req.ip,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'تعداد درخواست‌ها بیش از حد مجاز است. کمی بعد دوباره تلاش کنید.' }
});

const uploadLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  keyGenerator: (req: any) => req.user?.id || req.ip,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'تعداد درخواست‌ها بیش از حد مجاز است. کمی بعد دوباره تلاش کنید.' }
});

// P0-18, P0-19: Secure upload configuration
const UPLOAD_ROOT = process.env.UPLOAD_ROOT || path.join(process.cwd(), 'uploads');

const imageMimeToExt: { [key: string]: string } = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

const extToMagic: { [key: string]: Buffer } = {
  '.jpg': Buffer.from([0xff, 0xd8, 0xff]),
  '.png': Buffer.from([0x89, 0x50, 0x4e, 0x47]),
  '.webp': Buffer.from([0x52, 0x49, 0x46]), // RIFF
  '.pdf': Buffer.from([0x25, 0x50, 0x44, 0x46]), // %PDF
};

const allowedCategories = ['avatars', 'covers', 'portfolio', 'posts', 'receipts', 'contracts'];

const storage = multer.diskStorage({
  destination: (req: any, file: any, cb: any) => {
    const category = req.params.category;
    const dir = path.join(UPLOAD_ROOT, category);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req: any, file: any, cb: any) => {
    const mime = file.mimetype;
    const ext = imageMimeToExt[mime] || '.bin';
    cb(null, `${randomUUID()}${ext}`);
  },
});

// P0-18: File extension comes from a fixed map, never from originalname
function getExtensionFromMime(mime: string): string {
  return imageMimeToExt[mime] || '.bin';
}

// P0-18: Magic number verification
function checkMagicNumber(filePath: string, ext: string): boolean {
  const magic = extToMagic[ext];
  if (!magic) return false;

  const fileHandle = fs.openSync(filePath, 'r');
  const buffer = Buffer.alloc(12);
  fs.readSync(fileHandle, buffer, 0, 12, 0);
  fs.closeSync(fileHandle);

  // For webp, check RIFF header + WEBP signature
  if (ext === '.webp') {
    const riffMagic = magic;
    if (buffer.slice(0, 4).toString() !== riffMagic.toString()) return false;
    const webpSig = buffer.slice(8, 12).toString();
    return webpSig === 'WEBP';
  }

  // For others, check the first bytes
  return buffer.slice(0, magic.length).equals(magic);
}

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req: any, file: any, cb: any) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    cb(null, allowed.includes(file.mimetype));
  },
});

// P0-18: Upload endpoint with authentication and validation
app.post('/api/upload/:category', authenticateToken, uploadLimiter, upload.single('file'), (req: any, res: express.Response) => {
  if (!req.file) return res.status(400).json({ error: 'فایلی ارسال نشده است.' });

  // Validate category
  const category = (req as any).params.category;
  if (!allowedCategories.includes(category)) {
    return res.status(400).json({ error: 'دسته‌بندی آپلود نامعتبر است.' });
  }

  // P0-18: Check magic numbers
  const ext = getExtensionFromMime(req.file.mimetype);
  const filePath = path.join(UPLOAD_ROOT, category, req.file.filename);
  if (!checkMagicNumber(filePath, ext)) {
    // Delete the file if magic number doesn't match
    fs.unlinkSync(filePath);
    return res.status(400).json({ error: 'فایل آپلود شده معتبر نیست.' });
  }

  const relativeUrl = `/uploads/${category}/${req.file.filename}`;
  res.json({ url: relativeUrl });
});

// P0-19: Serve public uploads only (avatars, covers, portfolio, posts) with nosniff header
const staticOpts = { setHeaders: (res: any) => res.setHeader('X-Content-Type-Options', 'nosniff') };
app.use('/uploads/avatars', express.static(path.join(UPLOAD_ROOT, 'avatars'), staticOpts));
app.use('/uploads/covers', express.static(path.join(UPLOAD_ROOT, 'covers'), staticOpts));
app.use('/uploads/portfolio', express.static(path.join(UPLOAD_ROOT, 'portfolio'), staticOpts));
app.use('/uploads/posts', express.static(path.join(UPLOAD_ROOT, 'posts'), staticOpts));

// P0-19: Private route for receipts and contracts (Manager only)
app.get('/uploads/:category(receipts|contracts)/:file', authenticateToken, (req: any, res: express.Response) => {
  if (req.user.role !== 'manager') {
    return res.status(403).json({ error: 'شما دسترسی به این فایل را ندارید.' });
  }

  const { category, file } = req.params;
  if (!/^[a-f0-9-]{36}\.(jpg|png|webp|pdf)$/.test(file)) {
    return res.status(400).json({ error: 'نام فایل نامعتبر است.' });
  }

  const filePath = path.join(UPLOAD_ROOT, category, file);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'فایل یافت نشد.' });
  }

  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Disposition', 'inline');
  res.sendFile(filePath);
});

// AI Chat API endpoint for AIAssistant.tsx
app.post('/api/chat', authenticateToken, chatLimiter, async (req: any, res: express.Response) => {
  try {
    const user = req.user;
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid messages payload' });
    }

    // P0-17: Validate messages
    if (messages.length > 20) {
      return res.status(400).json({ error: 'تعداد پیام‌ها بیش از حد مجاز است.' });
    }

    const validMessages = messages.every((m: any) =>
      m && typeof m === 'object' &&
      (m.role === 'user' || m.role === 'assistant') &&
      typeof m.content === 'string' &&
      m.content.length <= 2000
    );

    if (!validMessages) {
      return res.status(400).json({ error: 'فرمت پیام نامعتبر است.' });
    }

    const ai = getGeminiClient();

    // P0-17: Compute platform stats on the server (ignore body values)
    const artistsCount = (db.prepare('SELECT COUNT(*) as c FROM users WHERE role = ?').get('artist') as any).c;
    const managersCount = (db.prepare('SELECT COUNT(*) as c FROM users WHERE role = ?').get('manager') as any).c;
    const totalRequests = (db.prepare('SELECT COUNT(*) as c FROM client_requests').get() as any).c;

    // P0-17: Only show financial ledger count to managers, and only for their salon
    let totalTransactions = 0;
    if (user.role === 'manager') {
      totalTransactions = (db.prepare('SELECT COUNT(*) as c FROM transactions WHERE salon_id = ?').get(user.id) as any).c;
    }

    const systemInstruction = `You are Legendin AI, an expert assistant for Legendin (لجندین) — the premier beauty industry marketplace and career network in Iran.
Current User Context:
- Role: ${user.role}
- Name: ${user.name}
- Platform Statistics: ${artistsCount} registered artists, ${managersCount} salon managers, ${totalRequests} active client requests, ${totalTransactions} financial ledger entries.

Guidelines:
- Respond in polite, natural, professional Persian (Farsi).
- Provide concise, helpful advice tailored to beauty services, salon operations, Toman pricing, and artist hiring.`;

    const contents = messages.map((m: any) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents,
      config: {
        systemInstruction,
        temperature: 0.7,
      }
    });

    res.json({ content: response.text || 'پاسخی دریافت نشد.' });
  } catch (error: any) {
    console.error("AI Chat API Error:", error);
    // P0-17: Generic error message, no internal details
    res.status(500).json({ error: 'سرویس دستیار هوشمند موقتاً در دسترس نیست.' });
  }
});

// Secure Financial Ledger API routes (Role-based, authenticated)
app.use('/api/transactions', financeRoutes);

// Client Requests API
app.use('/api/client-requests', clientRequestsRoutes);

// Hiring Offers API
app.use('/api/hiring-offers', hiringOffersRoutes);

// Job Applications API
app.use('/api/job-applications', jobApplicationsRoutes);

// Discounted Slots API
app.use('/api/discounted-slots', discountedSlotsRoutes);

// Users API routes
app.get('/api/users', optionalAuth, (req: any, res: express.Response) => {
  const rawUsers = db.prepare('SELECT * FROM users').all();

  // Load all portfolio items and reviews in memory (P0-09: fix N+1)
  const portfolioMap = new Map<string, any[]>();
  db.prepare('SELECT * FROM portfolio_items').all().forEach((item: any) => {
    if (!portfolioMap.has(item.user_id)) {
      portfolioMap.set(item.user_id, []);
    }
    portfolioMap.get(item.user_id).push({
      id: item.id,
      imageUrl: item.image_url,
      url: item.image_url,
      title: item.title,
      description: item.description
    });
  });

  const reviewsMap = new Map<string, any[]>();
  db.prepare('SELECT * FROM reviews').all().forEach((review: any) => {
    if (!reviewsMap.has(review.user_id)) {
      reviewsMap.set(review.user_id, []);
    }
    reviewsMap.get(review.user_id).push({
      id: review.id,
      reviewerName: review.reviewer_name,
      reviewerAvatar: review.reviewer_avatar,
      rating: review.rating,
      comment: review.comment,
      date: review.created_at
    });
  });

  const users = rawUsers.map((u: any) => {
    const user = {
      ...u,
      skills_json: u.skills_json || '[]',
      certifications_json: u.certifications_json || '[]'
    };

    // P0-09: full data only if req.user.id === u.id, or if req.user.role === 'manager'
    if (req.user && (req.user.id === u.id || req.user.role === 'manager')) {
      return formatUserResponse(user);
    }
    return formatPublicUser(user);
  });

  res.json(users);
});

app.get('/api/users/:id', optionalAuth, (req: any, res: express.Response) => {
  const u: any = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!u) return res.status(404).json({ error: 'User not found' });

  // P0-09: full data only if req.user.id === u.id, or if req.user.role === 'manager'
  if (req.user && (req.user.id === u.id || req.user.role === 'manager')) {
    return res.json(formatUserResponse(u));
  }
  return res.json(formatPublicUser(u));
});

// Posts API
app.use('/api/posts', postsRoutes);

// Services API
app.get('/api/services', (req: express.Request, res: express.Response) => {
  const rawServices = db.prepare('SELECT * FROM services').all();
  const services = rawServices.map((s: any) => ({
    id: s.id,
    parentServiceId: s.parent_service_id,
    name: s.name,
    durationMinutes: s.duration_minutes,
    price: s.price
  }));
  res.json(services);
});

// Reviews API
app.get('/api/reviews', (req: express.Request, res: express.Response) => {
  const rawReviews = db.prepare('SELECT * FROM reviews').all();
  const reviews = rawReviews.map((r: any) => ({
    id: r.id,
    userId: r.user_id,
    reviewerName: r.reviewer_name,
    reviewerAvatar: r.reviewer_avatar,
    rating: r.rating,
    comment: r.comment,
    createdAt: r.created_at
  }));
  res.json(reviews);
});

// Leave Requests API
app.use('/api/leave-requests', leaveRequestsRoutes);

// Colleague Messages API
app.use('/api/colleague-messages', colleagueMessagesRoutes);

// Job Applications API
app.get('/api/job-applications', (req: express.Request, res: express.Response) => {
  const applications = db.prepare('SELECT * FROM job_applications').all();
  res.json(applications);
});

// Discounts API
app.get('/api/discounts', (req: express.Request, res: express.Response) => {
  const discounts = db.prepare('SELECT * FROM discounts').all();
  res.json(discounts);
});

// Auth API routes
app.use('/api/auth', authRoutes);

// P0-23: Health check endpoint
app.get('/api/health', (req: any, res: any) => {
  try {
    const dbOk = db.prepare('SELECT 1 as ok').get() as any;
    res.json({
      status: 'ok',
      db: Boolean(dbOk && dbOk.ok),
      uptime: process.uptime()
    });
  } catch {
    res.status(500).json({ status: 'error', db: false, uptime: process.uptime() });
  }
});

// P0-22: Unknown API route 404 handler
app.use('/api', (req: any, res: any) => {
  res.status(404).json({ error: 'مسیر یافت نشد.' });
});

// P0-22: Central error handling middleware
app.use((err: any, req: any, res: any, next: any) => {
  console.error('Unhandled express error:', err);
  const status = err.status && err.status >= 400 && err.status < 500 ? err.status : 500;
  const message = process.env.NODE_ENV === 'production' ? 'خطای داخلی سرور.' : (err.message || 'خطای داخلی سرور.');
  res.status(status).json({ error: message });
});

// P0-22: Unhandled exception & rejection hooks
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Start the server with Vite middleware for SPA
async function startServer() {
  // P0-07: Ensure database is seeded on startup only if not production
  if (process.env.NODE_ENV !== 'production') {
    try {
      seedDatabase();
    } catch (err) {
      console.error("Database seed error on startup:", err);
    }
  }

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: express.Request, res: express.Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
    console.log(`Upload root: ${UPLOAD_ROOT}`);
    console.log(`Database: ${process.env.DB_PATH || path.join(process.cwd(), 'data', 'legendin.db')}`);
  });

  // P0-23: Graceful shutdown
  const shutdown = () => {
    console.log('Shutting down server gracefully...');
    server.close(() => {
      try {
        db.close();
      } catch {}
      process.exit(0);
    });
    setTimeout(() => {
      console.error('Forced shutdown due to timeout');
      process.exit(1);
    }, 10000).unref();
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

startServer();
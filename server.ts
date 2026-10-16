import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import multer from 'multer';
import { randomUUID } from 'crypto';
import fs from 'fs';
import { db } from './src/server/db'; // Import database connection from src/server/
import { seedDatabase } from './src/server/seed'; // Auto-seed if empty
import { Transaction, ClientRequest, HiringOffer, DiscountedSlot } from './src/server/types'; // Import entity types

dotenv.config();

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

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());

// Multer upload configuration
const UPLOAD_ROOT = process.env.UPLOAD_ROOT || path.join(process.cwd(), 'uploads');

const storage = multer.diskStorage({
  destination: (req: any, file: any, cb: any) => {
    const category = ['avatars','covers','portfolio','posts','receipts','contracts']
      .includes(req.params.category) ? req.params.category : 'misc';
    const dir = path.join(UPLOAD_ROOT, category);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req: any, file: any, cb: any) => {
    const ext = path.extname(file.originalname);
    cb(null, `${randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req: any, file: any, cb: any) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    cb(null, allowed.includes(file.mimetype));
  },
});

// Upload endpoint
app.post('/api/upload/:category', upload.single('file'), (req: express.Request, res: express.Response) => {
  if (!req.file) return res.status(400).json({ error: 'فایلی ارسال نشده است' });
  const relativeUrl = `/uploads/${req.params.category}/${req.file.filename}`;
  res.json({ url: relativeUrl });
});

// Serve uploads as static files
app.use('/uploads', express.static(UPLOAD_ROOT));

// Transactions API
app.get('/api/transactions', (req: express.Request, res: express.Response) => {
  const rawTx = db.prepare('SELECT * FROM transactions').all();
  const transactions = rawTx.map((t: any) => ({
    id: t.id,
    salonId: t.salon_id,
    direction: t.direction,
    category: t.category,
    amount: t.amount,
    date: t.date,
    description: t.description,
    receiptUrl: t.receipt_url,
    relatedStaffId: t.related_staff_id,
    relatedRequestId: t.related_request_id,
    createdAt: t.created_at
  }));
  res.json(transactions);
});

app.post('/api/transactions', (req: express.Request, res: express.Response) => {
  const { salon_id, direction, category, amount, date, description, receipt_url, related_staff_id, related_request_id } = req.body;
  
  if (!salon_id || !direction || !category || !amount) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  const stmt = db.prepare(`
    INSERT INTO transactions 
    (salon_id, direction, category, amount, date, description, receipt_url, related_staff_id, related_request_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    salon_id, direction, category, amount, date, description || null, receipt_url || null,
    related_staff_id || null, related_request_id || null
  );
  
  res.status(201).json(result);
});

// Client Requests API
app.get('/api/client-requests', (req: express.Request, res: express.Response) => {
  const rawRequests = db.prepare('SELECT * FROM client_requests').all();
  const getUserStmt = db.prepare('SELECT name, phone FROM users WHERE id = ?');
  const requests = rawRequests.map((r: any) => {
    const client: any = getUserStmt.get(r.client_id) || { name: 'کاربر لجندین', phone: '09120000000' };
    const target: any = getUserStmt.get(r.target_id) || { name: 'متخصص زیبایی' };
    return {
      id: r.id,
      clientId: r.client_id,
      clientName: client.name,
      clientPhone: client.phone,
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
});

app.post('/api/client-requests', (req: express.Request, res: express.Response) => {
  const { client_id, target_id, target_type, service_type, service_id, preferred_date, preferred_time, note, status, price, cancellation_json } = req.body;
  
  if (!client_id || !target_id || !target_type || !service_type) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  const stmt = db.prepare(`
    INSERT INTO client_requests 
    (client_id, target_id, target_type, service_type, service_id, preferred_date, preferred_time, note, status, price, cancellation_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    client_id, target_id, target_type, service_type, service_id || null, preferred_date || null, preferred_time || null,
    note || null, status || 'pending', price || 0, cancellation_json || '[]'
  );
  
  res.status(201).json(result);
});

// Hiring Offers API
app.get('/api/hiring-offers', (req: express.Request, res: express.Response) => {
  const rawOffers = db.prepare('SELECT * FROM hiring_offers').all();
  const getUserStmt = db.prepare('SELECT name FROM users WHERE id = ?');
  const offers = rawOffers.map((o: any) => {
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
});

app.post('/api/hiring-offers', (req: express.Request, res: express.Response) => {
  const { manager_id, artist_id, salon_name, message, offer_amount, status } = req.body;
  
  if (!manager_id || !artist_id || !status) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  const stmt = db.prepare(`
    INSERT INTO hiring_offers 
    (manager_id, artist_id, salon_name, message, offer_amount, status)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    manager_id, artist_id, salon_name || null, message || null, offer_amount || '0', status || 'pending'
  );
  
  res.status(201).json(result);
});

// Discounted Slots API
app.get('/api/discounted-slots', (req: express.Request, res: express.Response) => {
  const rawSlots = db.prepare('SELECT * FROM discounted_slots').all();
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
});

app.post('/api/discounted-slots', (req: express.Request, res: express.Response) => {
  const { original_request_id, artist_id, artist_name, salon_name, service_type, date, time, original_price, discounted_price, discount_percent, app_commission_percent, status, claimed_by_client_id } = req.body;
  
  if (!original_request_id || !artist_id || !status) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  const stmt = db.prepare(`
    INSERT INTO discounted_slots 
    (original_request_id, artist_id, artist_name, salon_name, service_type, date, time, original_price, discounted_price, discount_percent, app_commission_percent, status, claimed_by_client_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    original_request_id, artist_id, artist_name || null, salon_name || null, service_type || null, date || null, time || null,
    original_price || 0, discounted_price || 0, discount_percent || 0, app_commission_percent || 0, status || 'available', claimed_by_client_id || null
  );
  
  res.status(201).json(result);
});

// Users API routes
app.get('/api/users', (req: express.Request, res: express.Response) => {
  const rawUsers = db.prepare('SELECT * FROM users').all();
  const users = rawUsers.map((u: any) => {
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
      skills: JSON.parse(u.skills_json || '[]'),
      certifications: JSON.parse(u.certifications_json || '[]'),
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
  });
  res.json(users);
});

app.get('/api/users/:id', (req: express.Request, res: express.Response) => {
  const u: any = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!u) return res.status(404).json({ error: 'User not found' });
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
  res.json({
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
    skills: JSON.parse(u.skills_json || '[]'),
    certifications: JSON.parse(u.certifications_json || '[]'),
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
  });
});

// Posts API
app.get('/api/posts', (req: express.Request, res: express.Response) => {
  const rawPosts = db.prepare('SELECT * FROM posts').all();
  const getUserStmt = db.prepare('SELECT name, avatar, role FROM users WHERE id = ?');
  const posts = rawPosts.map((p: any) => {
    const author: any = getUserStmt.get(p.author_id) || { name: 'کاربر لجندین', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150&auto=format&fit=crop', role: 'client' };
    const comments = db.prepare('SELECT * FROM comments WHERE post_id = ?').all(p.id).map((c: any) => {
      const cAuthor: any = getUserStmt.get(c.author_id) || { name: 'کاربر لجندین', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150&auto=format&fit=crop', role: 'client' };
      return {
        id: c.id,
        authorId: c.author_id,
        authorName: cAuthor.name,
        authorAvatar: cAuthor.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150&auto=format&fit=crop',
        authorRole: cAuthor.role || 'client',
        content: c.content,
        createdAt: c.created_at,
        likesCount: 0,
        likedBy: []
      };
    });
    return {
      id: p.id,
      authorId: p.author_id,
      authorName: author.name,
      authorAvatar: author.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150&auto=format&fit=crop',
      authorRole: author.role || 'client',
      content: p.content,
      image: p.image,
      tag: p.tag,
      likesCount: p.likes_count,
      likedBy: JSON.parse(p.liked_by_json || '[]'),
      createdAt: p.created_at,
      comments
    };
  });
  res.json(posts);
});

app.post('/api/posts', (req: express.Request, res: express.Response) => {
  const { author_id, content, image, tag } = req.body;
  if (!author_id || !content) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const stmt = db.prepare(`
    INSERT INTO posts (author_id, content, image, tag, created_at, likes_count, liked_by_json)
    VALUES (?, ?, ?, ?, datetime('now'), 0, '[]')
  `);
  const result = stmt.run(author_id, content, image || null, tag || null);
  res.status(201).json(result);
});

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
app.get('/api/leave-requests', (req: express.Request, res: express.Response) => {
  const rawLeaves = db.prepare('SELECT * FROM leave_requests').all();
  const leaves = rawLeaves.map((l: any) => ({
    id: l.id,
    staffId: l.staff_id,
    startDate: l.start_date,
    endDate: l.end_date,
    requiresApproval: Boolean(l.requires_approval),
    status: l.status,
    note: l.note
  }));
  res.json(leaves);
});

app.post('/api/leave-requests', (req: express.Request, res: express.Response) => {
  const { id, staff_id, start_date, end_date, requires_approval, status, note } = req.body;
  if (!staff_id || !start_date) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO leave_requests 
    (id, staff_id, start_date, end_date, requires_approval, status, note)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    id || randomUUID(), staff_id, start_date, end_date || start_date,
    requires_approval ? 1 : 0, status || 'logged', note || null
  );
  res.status(201).json(result);
});

app.delete('/api/leave-requests/:id', (req: express.Request, res: express.Response) => {
  const stmt = db.prepare('DELETE FROM leave_requests WHERE id = ?');
  const result = stmt.run(req.params.id);
  res.json(result);
});

// Colleague Messages API
app.get('/api/colleague-messages', (req: express.Request, res: express.Response) => {
  const messages = db.prepare('SELECT * FROM colleague_messages').all();
  res.json(messages);
});

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

// Start the server with Vite middleware for SPA
async function startServer() {
  // Ensure database is seeded on startup if empty
  try {
    seedDatabase();
  } catch (err) {
    console.error("Database seed error on startup:", err);
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
    console.log(`Upload root: ${UPLOAD_ROOT}`);
    console.log(`Database: ${process.env.DB_PATH || path.join(process.cwd(), 'data', 'legendin.db')}`);
  });
}

startServer();
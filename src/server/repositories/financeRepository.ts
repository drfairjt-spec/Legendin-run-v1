// src/server/repositories/financeRepository.ts
import { db } from '../db.ts';

export class FinanceRepository {
  // Get all transactions
  static async findAllTransactions(): Promise<any[]> {
    return db.prepare('SELECT * FROM transactions').all() as any[];
  }

  // Get transactions by salon ID
  static async findTransactionsBySalon(salonId: string): Promise<any[]> {
    return db.prepare('SELECT * FROM transactions WHERE salon_id = ?').all(salonId) as any[];
  }

  // Get transactions by staff ID
  static async findTransactionsByStaff(staffId: string): Promise<any[]> {
    return db.prepare('SELECT * FROM transactions WHERE related_staff_id = ?').all(staffId) as any[];
  }

  // Get transaction by ID
  static async findTransactionById(id: string): Promise<any | null> {
    return db.prepare('SELECT * FROM transactions WHERE id = ?').get(id) as any;
  }

  // Create transaction
  static async createTransaction(transactionData: {
    id: string;
    salon_id: string;
    direction: string;
    category: string;
    amount: number;
    date: string;
    description?: string;
    receipt_url?: string;
    related_staff_id?: string;
    related_request_id?: string;
    created_at?: string;
  }): Promise<any> {
    const stmt = db.prepare(`
      INSERT INTO transactions
      (id, salon_id, direction, category, amount, date, description, receipt_url, related_staff_id, related_request_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);

    stmt.run(
      transactionData.id,
      transactionData.salon_id,
      transactionData.direction,
      transactionData.category,
      transactionData.amount,
      transactionData.date,
      transactionData.description || null,
      transactionData.receipt_url || null,
      transactionData.related_staff_id || null,
      transactionData.related_request_id || null
    );

    return this.findTransactionById(transactionData.id);
  }

  // Update transaction
  static async updateTransaction(id: string, updates: Partial<any>): Promise<any> {
    const allowedFields = ['salon_id', 'direction', 'category', 'amount', 'date', 'description', 'receipt_url', 'related_staff_id', 'related_request_id'];
    const setClause = Object.entries(updates)
      .filter(([key]) => allowedFields.includes(key))
      .map(([key]) => `${key} = ?`)
      .join(', ');

    if (!setClause) {
      throw new Error('No valid fields to update');
    }

    const params = Object.entries(updates)
      .filter(([key]) => allowedFields.includes(key))
      .map(([_, value]) => value);
    params.push(id);

    const stmt = db.prepare(`UPDATE transactions SET ${setClause} WHERE id = ?`);
    stmt.run(...params);

    return this.findTransactionById(id);
  }

  // Delete transaction
  static async deleteTransaction(id: string): Promise<void> {
    db.prepare('DELETE FROM transactions WHERE id = ?').run(id);
  }

  // Get financial summary
  static async getFinancialSummary(role: string, userId?: string): Promise<any> {
    let incomeQuery = 'SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE direction = "income"';
    let costQuery = 'SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE direction = "cost"';

    if (role === 'manager' && userId) {
      incomeQuery += ' AND salon_id = ?';
      costQuery += ' AND salon_id = ?';
    } else if (role === 'artist' && userId) {
      incomeQuery += ' AND related_staff_id = ?';
      costQuery += ' AND related_staff_id = ?';
    }

    const incomeParams = role === 'manager' || role === 'artist' ? [userId || ''] : [];
    const costParams = role === 'manager' || role === 'artist' ? [userId || ''] : [];

    const incomeResult = db.prepare(incomeQuery).get(...incomeParams) as any;
    const costResult = db.prepare(costQuery).get(...costParams) as any;

    return {
      totalIncome: incomeResult.total,
      totalCost: costResult.total,
      netProfit: incomeResult.total - costResult.total,
      role
    };
  }

  // Get all hiring offers
  static async findAllHiringOffers(): Promise<any[]> {
    const offers = db.prepare('SELECT * FROM hiring_offers').all() as any[];

    // Get manager and artist info
    const userIds = [...new Set([
      ...offers.map((o: any) => o.manager_id),
      ...offers.map((o: any) => o.artist_id)
    ])];

    const usersMap = new Map();
    if (userIds.length > 0) {
      const placeholders = userIds.map(() => '?').join(', ');
      const users = db.prepare(`SELECT id, name FROM users WHERE id IN (${placeholders})`).all(...userIds);
      users.forEach((user: any) => {
        usersMap.set(user.id, user.name);
      });
    }

    return offers.map((offer: any) => ({
      id: offer.id,
      managerId: offer.manager_id,
      managerName: usersMap.get(offer.manager_id) || 'مدیر سالن لجند',
      artistId: offer.artist_id,
      artistName: usersMap.get(offer.artist_id) || 'آرتیست لجندین',
      salonName: offer.salon_name,
      message: offer.message,
      offerAmount: offer.offer_amount,
      status: offer.status,
      createdAt: offer.created_at
    }));
  }

  // Create hiring offer
  static async createHiringOffer(offerData: {
    id: string;
    manager_id: string;
    artist_id: string;
    salon_name?: string;
    message?: string;
    offer_amount?: string;
    status?: string;
  }): Promise<any> {
    const {
      id,
      manager_id,
      artist_id,
      salon_name,
      message,
      offer_amount,
      status
    } = offerData;

    const stmt = db.prepare(`
      INSERT INTO hiring_offers
      (id, manager_id, artist_id, salon_name, message, offer_amount, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(id, manager_id, artist_id, salon_name || null, message || null, offer_amount || '0', status || 'pending');

    return this.findHiringOfferById(id);
  }

  // Get hiring offer by ID
  static async findHiringOfferById(id: string): Promise<any | null> {
    return db.prepare('SELECT * FROM hiring_offers WHERE id = ?').get(id) as any;
  }

  // Update hiring offer status
  static async updateHiringOfferStatus(id: string, status: string): Promise<any> {
    const offer = db.prepare('SELECT * FROM hiring_offers WHERE id = ?').get(id);
    if (!offer) {
      throw new Error('Hiring offer not found');
    }

    db.prepare('UPDATE hiring_offers SET status = ? WHERE id = ?').run(status, id);

    return this.findHiringOfferById(id);
  }

  // Get discounted slots
  static async findAllDiscountedSlots(): Promise<any[]> {
    return db.prepare('SELECT * FROM discounted_slots').all() as any[];
  }

  // Create discounted slot
  static async createDiscountedSlot(slotData: {
    id: string;
    original_request_id: string;
    artist_id: string;
    artist_name?: string;
    salon_name?: string;
    service_type?: string;
    date?: string;
    time?: string;
    original_price: number;
    discounted_price: number;
    discount_percent: number;
    app_commission_percent: number;
    status?: string;
    claimed_by_client_id?: string;
  }): Promise<any> {
    const stmt = db.prepare(`
      INSERT INTO discounted_slots
      (id, original_request_id, artist_id, artist_name, salon_name, service_type, date, time, original_price, discounted_price, discount_percent, app_commission_percent, status, claimed_by_client_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      slotData.id,
      slotData.original_request_id,
      slotData.artist_id,
      slotData.artist_name || null,
      slotData.salon_name || null,
      slotData.service_type || null,
      slotData.date || null,
      slotData.time || null,
      slotData.original_price,
      slotData.discounted_price,
      slotData.discount_percent,
      slotData.app_commission_percent,
      slotData.status || 'available',
      slotData.claimed_by_client_id || null
    );

    return this.findDiscountedSlotById(slotData.id);
  }

  // Get discounted slot by ID
  static async findDiscountedSlotById(id: string): Promise<any | null> {
    return db.prepare('SELECT * FROM discounted_slots WHERE id = ?').get(id) as any;
  }

  // Update discounted slot status
  static async updateDiscountedSlotStatus(id: string, status: string, claimedByClientId?: string): Promise<any> {
    let updateQuery = 'UPDATE discounted_slots SET status = ?';
    const params = [status];

    if (claimedByClientId !== undefined) {
      updateQuery += ', claimed_by_client_id = ?';
      params.push(claimedByClientId);
    }

    updateQuery += ' WHERE id = ?';
    params.push(id);

    db.prepare(updateQuery).run(...params);

    return this.findDiscountedSlotById(id);
  }

  // Get all discounts
  static async findAllDiscounts(): Promise<any[]> {
    return db.prepare('SELECT * FROM discounts').all() as any[];
  }

  // Create discount
  static async createDiscount(discountData: {
    id: string;
    salon_id: string;
    code?: string;
    scope?: string;
    target_client_id?: string;
    service_id?: string;
    percent_off?: number;
    amount_off?: number;
    valid_from?: string;
    valid_to?: string;
    created_by_staff_id?: string;
  }): Promise<any> {
    const stmt = db.prepare(`
      INSERT INTO discounts
      (id, salon_id, code, scope, target_client_id, service_id, percent_off, amount_off, valid_from, valid_to, created_by_staff_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      discountData.id,
      discountData.salon_id,
      discountData.code || null,
      discountData.scope || null,
      discountData.target_client_id || null,
      discountData.service_id || null,
      discountData.percent_off || 0,
      discountData.amount_off || 0,
      discountData.valid_from || null,
      discountData.valid_to || null,
      discountData.created_by_staff_id || null
    );

    return this.findDiscountById(discountData.id);
  }

  // Get discount by ID
  static async findDiscountById(id: string): Promise<any | null> {
    return db.prepare('SELECT * FROM discounts WHERE id = ?').get(id) as any;
  }

  // Get all leave requests
  static async findAllLeaveRequests(): Promise<any[]> {
    return db.prepare('SELECT * FROM leave_requests').all() as any[];
  }

  // Create leave request
  static async createLeaveRequest(requestData: {
    id: string;
    staff_id: string;
    start_date: string;
    end_date?: string;
    requires_approval?: boolean;
    status?: string;
    note?: string;
  }): Promise<any> {
    const {
      id,
      staff_id,
      start_date,
      end_date,
      requires_approval,
      status,
      note
    } = requestData;

    const stmt = db.prepare(`
      INSERT OR REPLACE INTO leave_requests
      (id, staff_id, start_date, end_date, requires_approval, status, note)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      staff_id,
      start_date,
      end_date || start_date,
      requires_approval ? 1 : 0,
      status || 'logged',
      note || null
    );

    return this.findLeaveRequestById(id);
  }

  // Get leave request by ID
  static async findLeaveRequestById(id: string): Promise<any | null> {
    return db.prepare('SELECT * FROM leave_requests WHERE id = ?').get(id) as any;
  }

  // Delete leave request
  static async deleteLeaveRequest(id: string): Promise<void> {
    db.prepare('DELETE FROM leave_requests WHERE id = ?').run(id);
  }

  // Get all colleague messages
  static async findAllColleagueMessages(): Promise<any[]> {
    return db.prepare('SELECT * FROM colleague_messages').all() as any[];
  }

  // Create colleague message
  static async createColleagueMessage(messageData: {
    id: string;
    sender_id: string;
    recipient_id: string;
    content: string;
    created_at?: string;
  }): Promise<any> {
    const stmt = db.prepare(`
      INSERT INTO colleague_messages (id, sender_id, recipient_id, content, created_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `);

    stmt.run(
      messageData.id,
      messageData.sender_id,
      messageData.recipient_id,
      messageData.content
    );

    return this.findColleagueMessageById(messageData.id);
  }

  // Get colleague message by ID
  static async findColleagueMessageById(id: string): Promise<any | null> {
    return db.prepare('SELECT * FROM colleague_messages WHERE id = ?').get(id) as any;
  }

  // Get all job applications
  static async findAllJobApplications(): Promise<any[]> {
    return db.prepare('SELECT * FROM job_applications').all() as any[];
  }

  // Create job application
  static async createJobApplication(appData: {
    id: string;
    applicant_id: string;
    salon_id: string;
    message?: string;
    status?: string;
    created_at?: string;
  }): Promise<any> {
    const stmt = db.prepare(`
      INSERT INTO job_applications (id, applicant_id, salon_id, message, status, created_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
    `);

    stmt.run(
      appData.id,
      appData.applicant_id,
      appData.salon_id,
      appData.message || null,
      appData.status || 'pending'
    );

    return this.findJobApplicationById(appData.id);
  }

  // Get job application by ID
  static async findJobApplicationById(id: string): Promise<any | null> {
    return db.prepare('SELECT * FROM job_applications WHERE id = ?').get(id) as any;
  }

  // Get all services
  static async findAllServices(): Promise<any[]> {
    return db.prepare('SELECT * FROM services').all() as any[];
  }

  // Get all reviews
  static async findAllReviews(): Promise<any[]> {
    return db.prepare('SELECT * FROM reviews').all() as any[];
  }

  // Get all posts
  static async findAllPosts(): Promise<any[]> {
    // This will call the posts repository
    const { PostsRepository } = require('./postsRepository');
    return PostsRepository.findAll();
  }
}
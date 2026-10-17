// src/server/repositories/clientRequestsRepository.ts
import { db } from '../db.ts';

export class ClientRequestsRepository {
  // Get all client requests with user info
  static async findAll(): Promise<any[]> {
    const requests = db.prepare('SELECT * FROM client_requests').all() as any[];

    // Load user info for all clients and targets
    const userIds = [...new Set([
      ...requests.map((r: any) => r.client_id),
      ...requests.map((r: any) => r.target_id)
    ].filter(Boolean))];

    const usersMap = new Map();
    if (userIds.length > 0) {
      const placeholders = userIds.map(() => '?').join(', ');
      const users = db.prepare(`SELECT id, name, phone FROM users WHERE id IN (${placeholders})`).all(...userIds);
      users.forEach((user: any) => {
        usersMap.set(user.id, {
          name: user.name,
          phone: user.phone
        });
      });
    }

    // Format requests with user info
    return requests.map((request: any) => {
      const client = usersMap.get(request.client_id) || {
        name: 'کاربر لجندین',
        phone: '09120000000'
      };
      const target = usersMap.get(request.target_id) || {
        name: 'متخصص زیبایی'
      };

      return {
        id: request.id,
        clientId: request.client_id,
        clientName: client.name,
        clientPhone: client.phone,
        targetId: request.target_id,
        targetName: target.name,
        targetType: request.target_type,
        serviceType: request.service_type,
        serviceId: request.service_id,
        preferredDate: request.preferred_date,
        preferredTime: request.preferred_time,
        note: request.note,
        status: request.status,
        price: request.price,
        cancellation: JSON.parse(request.cancellation_json || '[]'),
        createdAt: request.created_at
      };
    });
  }

  // Get client requests by client ID
  static async findByClientId(clientId: string): Promise<any[]> {
    const requests = db.prepare('SELECT * FROM client_requests WHERE client_id = ?').all(clientId) as any[];
    return this.formatRequests(requests);
  }

  // Get client requests by target ID
  static async findByTargetId(targetId: string): Promise<any[]> {
    const requests = db.prepare('SELECT * FROM client_requests WHERE target_id = ?').all(targetId) as any[];
    return this.formatRequests(requests);
  }

  // Create new client request
  static async create(requestData: {
    id: string;
    client_id: string;
    target_id: string;
    target_type: string;
    service_type: string;
    service_id?: string;
    preferred_date?: string;
    preferred_time?: string;
    note?: string;
    status: string;
    price: number;
    cancellation_json: string;
  }): Promise<any> {
    const {
      id,
      client_id,
      target_id,
      target_type,
      service_type,
      service_id,
      preferred_date,
      preferred_time,
      note,
      status,
      price,
      cancellation_json
    } = requestData;

    const stmt = db.prepare(`
      INSERT INTO client_requests
      (id, client_id, target_id, target_type, service_type, service_id, preferred_date, preferred_time, note, status, price, cancellation_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id, client_id, target_id, target_type, service_type,
      service_id || null, preferred_date || null, preferred_time || null,
      note || null, status, price, cancellation_json
    );

    return this.formatRequests([{ ...requestData, id }])[0];
  }

  // Update request status
  static async updateStatus(id: string, status: string): Promise<any> {
    const request = db.prepare('SELECT * FROM client_requests WHERE id = ?').get(id);
    if (!request) {
      throw new Error('Request not found');
    }

    db.prepare('UPDATE client_requests SET status = ? WHERE id = ?').run(status, id);

    return this.formatRequests([{ ...request, status }])[0];
  }

  // Delete request
  static async delete(id: string): Promise<void> {
    db.prepare('DELETE FROM client_requests WHERE id = ?').run(id);
  }

  // Format requests helper
  private static formatRequests(requests: any[]): any[] {
    const userIds = [...new Set([
      ...requests.map((r: any) => r.client_id),
      ...requests.map((r: any) => r.target_id)
    ].filter(Boolean))];

    const usersMap = new Map();
    if (userIds.length > 0) {
      const placeholders = userIds.map(() => '?').join(', ');
      const users = db.prepare(`SELECT id, name, phone FROM users WHERE id IN (${placeholders})`).all(...userIds);
      users.forEach((user: any) => {
        usersMap.set(user.id, {
          name: user.name,
          phone: user.phone
        });
      });
    }

    return requests.map((request: any) => {
      const client = usersMap.get(request.client_id) || {
        name: 'کاربر لجندین',
        phone: '09120000000'
      };
      const target = usersMap.get(request.target_id) || {
        name: 'متخصص زیبایی'
      };

      return {
        id: request.id,
        clientId: request.client_id,
        clientName: client.name,
        clientPhone: client.phone,
        targetId: request.target_id,
        targetName: target.name,
        targetType: request.target_type,
        serviceType: request.service_type,
        serviceId: request.service_id,
        preferredDate: request.preferred_date,
        preferredTime: request.preferred_time,
        note: request.note,
        status: request.status,
        price: request.price,
        cancellation: JSON.parse(request.cancellation_json || '[]'),
        createdAt: request.created_at
      };
    });
  }
}
import 'dotenv/config';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'legendin_jwt_secret_dev_key_2025_sec';
const JWT_EXPIRES_IN = '7d';

export interface AuthPayload {
  id: string;
  role: string;
  phone: string;
  name: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthPayload;
}

// Generate JWT token
export function generateToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// Hash password with bcrypt
export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

// Compare plain password with hash
export function comparePassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

// Mandatory Authentication Middleware
export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return res.status(401).json({ error: 'احراز هویت انجام نشده است. توکن یافت نشد.' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'توکن نامعتبر یا منقضی شده است.' });
    }
    req.user = decoded as AuthPayload;
    next();
  });
}

// Optional Authentication Middleware (sets req.user if token valid, but allows unauthenticated requests)
export function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (token) {
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (!err && decoded) {
        req.user = decoded as AuthPayload;
      }
      next();
    });
  } else {
    next();
  }
}

// Role-based Access Control Middleware
export function requireRole(allowedRoles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'ابتدا باید وارد حساب خود شوید.' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'شما دسترسی لازم برای این عملیات را ندارید.' });
    }
    next();
  };
}

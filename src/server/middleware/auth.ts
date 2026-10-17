import 'dotenv/config';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// P0-02: Mandatory JWT_SECRET with no hardcoded fallback.
// In production, missing or short secrets abort startup. In dev we generate
// a random one and warn that tokens will be invalidated on restart.
const DEV_FALLBACK_SECRET = crypto.randomBytes(32).toString('hex');
let JWT_SECRET: string;

if (process.env.JWT_SECRET) {
  JWT_SECRET = process.env.JWT_SECRET;
} else if (process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET is required in production');
} else {
  console.warn(
    '[P0-02] JWT_SECRET is not set. A random dev secret has been generated; ' +
    'all tokens will be invalidated on server restart.'
  );
  JWT_SECRET = DEV_FALLBACK_SECRET;
}

if (JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters long');
}

const JWT_EXPIRES_IN = '7d';
const JWT_ALGORITHM = 'HS256'; // P0-02: Pin algorithm

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
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN, algorithm: JWT_ALGORITHM });
}

// Hash password with bcrypt - P0-08: bcrypt cost 12
export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 12);
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

  jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }, (err, decoded) => {
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
    jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }, (err, decoded) => {
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

import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { db } from './db.js';

export type Role = 'admin' | 'hospital' | 'manufacturer';
export type UserDto = {
  id: number;
  email: string;
  name: string;
  role: Role;
  scope_id: number | null;
  scope_name: string | null;
  scope_extra?: Record<string, unknown>;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request { user?: UserDto | null }
  }
}

// In-memory session store. Wiped on server restart; acceptable for POC.
const tokens = new Map<string, number>();

function row(user: any): UserDto {
  let scope_name: string | null = null;
  let scope_extra: Record<string, unknown> | undefined;
  if (user.role === 'hospital' && user.scope_id) {
    const site = db.prepare(`
      SELECT s.name, s.city, t.name AS trust_name, i.name AS icb_name, r.name AS region_name
      FROM sites s
      JOIN trusts t ON t.id = s.trust_id
      JOIN icbs i ON i.id = t.icb_id
      JOIN regions r ON r.id = s.region_id
      WHERE s.id = ?
    `).get(user.scope_id) as any;
    if (site) {
      scope_name = site.name;
      scope_extra = { trust_name: site.trust_name, icb_name: site.icb_name, region_name: site.region_name, city: site.city };
    }
  } else if (user.role === 'manufacturer' && user.scope_id) {
    const mfr = db.prepare('SELECT name FROM manufacturers WHERE id = ?').get(user.scope_id) as any;
    if (mfr) scope_name = mfr.name;
  }
  return {
    id: user.id, email: user.email, name: user.name, role: user.role,
    scope_id: user.scope_id ?? null, scope_name, scope_extra,
  };
}

export function login(email: string, password: string): { token: string; user: UserDto } | null {
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
  if (!user || user.password !== password) return null;
  return mintSession(user);
}

/**
 * Issue a session for a target user without password check.
 * Caller is responsible for authorisation (admin-only).
 */
export function loginAsUserId(userId: number): { token: string; user: UserDto } | null {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
  if (!user) return null;
  return mintSession(user);
}

function mintSession(user: any): { token: string; user: UserDto } {
  const token = crypto.randomBytes(32).toString('hex');
  tokens.set(token, user.id);
  return { token, user: row(user) };
}

/** List all users (admin-only — for the impersonation picker). */
export function listUsers(): UserDto[] {
  const rows = db.prepare('SELECT * FROM users ORDER BY role, id').all() as any[];
  return rows.map(row);
}

export function logout(token: string): void {
  tokens.delete(token);
}

export function authMiddleware(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization || '';
  const token = header.replace(/^Bearer /i, '').trim();
  if (!token) { req.user = null; return next(); }
  const userId = tokens.get(token);
  if (!userId) { req.user = null; return next(); }
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
  req.user = user ? row(user) : null;
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) { res.status(401).json({ error: 'unauthorized' }); return; }
  next();
}

export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ error: 'forbidden' });
      return;
    }
    next();
  };
}

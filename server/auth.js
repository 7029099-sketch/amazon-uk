import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from './db.js';

export const ROLES = ['owner', 'operator', 'buyer', 'logistics', 'finance', 'content'];

function jwtSecret() {
  const value = process.env.JWT_SECRET;
  if (value) return value;
  if (process.env.NODE_ENV === 'production') throw new Error('JWT_SECRET is required in production');
  return 'dev-only-change-me';
}

export async function bootstrapOwner() {
  const email = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = String(process.env.ADMIN_PASSWORD || '');
  if (!email || !password) return false;

  const existing = await query('SELECT id FROM admin_users WHERE email=$1 LIMIT 1', [email]);
  if (existing.rowCount) return false;

  const hash = await bcrypt.hash(password, 12);
  await query(
    `INSERT INTO admin_users (name,email,password_hash,role,active)
     VALUES ($1,$2,$3,'owner',true)`,
    [process.env.ADMIN_NAME || 'Owner', email, hash]
  );
  return true;
}

export async function login(email, password) {
  const normalized = String(email || '').trim().toLowerCase();
  const result = await query(
    'SELECT id,name,email,password_hash,role,active FROM admin_users WHERE email=$1 LIMIT 1',
    [normalized]
  );
  const user = result.rows[0];
  if (!user || !user.active) return null;
  const ok = await bcrypt.compare(String(password || ''), user.password_hash);
  if (!ok) return null;

  const token = jwt.sign(
    { sub: user.id, email: user.email, role: user.role, name: user.name },
    jwtSecret(),
    { expiresIn: '12h', issuer: 'us-deals-ua' }
  );
  return { token, user: { id: user.id, name: user.name, email: user.email, role: user.role } };
}

export function requireAuth(req, res, next) {
  const header = String(req.headers.authorization || '');
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return res.status(401).json({ error: 'auth_required' });
  try {
    req.user = jwt.verify(token, jwtSecret(), { issuer: 'us-deals-ua' });
    next();
  } catch {
    res.status(401).json({ error: 'invalid_token' });
  }
}

export function requireAnyRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) return res.status(403).json({ error: 'forbidden' });
    next();
  };
}

export async function createAdminUser({ name, email, password, role }) {
  if (!ROLES.includes(role)) throw new Error('invalid_role');
  if (String(password || '').length < 10) throw new Error('password_too_short');
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized) throw new Error('email_required');
  const hash = await bcrypt.hash(String(password), 12);
  const result = await query(
    `INSERT INTO admin_users (name,email,password_hash,role,active)
     VALUES ($1,$2,$3,$4,true)
     RETURNING id,name,email,role,active,created_at`,
    [String(name || '').trim() || normalized, normalized, hash, role]
  );
  return result.rows[0];
}

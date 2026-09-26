import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

export function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export function verifyPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash);
}

export function signJwt(payload: Record<string, unknown>) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyJwt(token: string) {
  return jwt.verify(token, JWT_SECRET) as { userId: string; email: string };
}

export function getAuthCookie() {
  return cookies().get('habit_token')?.value;
}

export function getSessionUserId() {
  const token = getAuthCookie();
  if (!token) return null;

  try {
    return verifyJwt(token).userId;
  } catch {
    return null;
  }
}

export function getUserFromRequest(req: Request) {
  const headerToken = req.headers.get('authorization');
  const token = headerToken?.startsWith('Bearer ') ? headerToken.slice(7).trim() : getAuthCookie();

  if (!token) return null;

  try {
    return verifyJwt(token);
  } catch {
    return null;
  }
}

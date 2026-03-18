import { SignJWT, jwtVerify } from 'jose';
import { randomBytes } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'change-me') {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SECURITY: JWT_SECRET must be set to a strong random value in production');
  }
  console.warn('WARNING: JWT_SECRET is not set — set a strong secret in .env.local');
}

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'change-me-in-env-local'
);

export interface SessionPayload {
  operatorId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
  [key: string]: unknown;
}

export async function hashPassword(password: string): Promise<string> {
  const { scrypt, randomBytes } = await import('crypto');
  const { promisify } = await import('util');
  const scryptAsync = promisify(scrypt);
  const salt = randomBytes(16).toString('hex');
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString('hex')}.${salt}`;
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const { scrypt } = await import('crypto');
  const { promisify } = await import('util');
  const scryptAsync = promisify(scrypt);
  const [hashedPassword, salt] = hash.split('.');
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return buf.toString('hex') === hashedPassword;
}

export async function generateAccessToken(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(process.env.JWT_EXPIRATION || '8h')
    .sign(JWT_SECRET);
}

export async function generateRefreshToken(): Promise<string> {
  return randomBytes(32).toString('hex');
}

export async function verifyToken(token: string): Promise<SessionPayload> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as SessionPayload;
  } catch {
    throw new Error('Invalid or expired token');
  }
}

export function extractToken(authHeader: string | null): string | null {
  if (!authHeader?.startsWith('Bearer ')) return null;
  return authHeader.substring(7);
}

export function getTokenExpiration(): Date {
  const exp = new Date();
  exp.setHours(exp.getHours() + 8);
  return exp;
}

export async function requireOperatorAuth(
  request: NextRequest
): Promise<SessionPayload | NextResponse> {
  const authHeader = request.headers.get('authorization');
  const cookieToken = request.cookies.get('driveiq-token')?.value;
  const token = extractToken(authHeader) ?? cookieToken ?? null;

  if (!token) {
    return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
  }

  try {
    return await verifyToken(token);
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid or expired token' }, { status: 401 });
  }
}

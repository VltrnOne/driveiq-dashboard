import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyPassword, generateAccessToken, generateRefreshToken, getTokenExpiration } from '@/lib/auth';
import { LoginSchema } from '@/lib/validations';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = LoginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
    }

    const operator = await prisma.operator.findUnique({ where: { email: parsed.data.email } });
    if (!operator || !operator.active) {
      return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 });
    }

    const valid = await verifyPassword(parsed.data.password, operator.passwordHash);
    if (!valid) {
      return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 });
    }

    const token = await generateAccessToken({ operatorId: operator.id, email: operator.email, role: operator.role });
    const refreshToken = await generateRefreshToken();

    await prisma.operatorSession.create({
      data: { operatorId: operator.id, token, refreshToken, expiresAt: getTokenExpiration() },
    });

    const response = NextResponse.json({
      success: true,
      data: { token, operator: { id: operator.id, email: operator.email, name: operator.name, role: operator.role } },
    });

    response.cookies.set('driveiq-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 8,
      path: '/',
    });

    return response;
  } catch (err) {
    console.error('[auth/login]', err);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}

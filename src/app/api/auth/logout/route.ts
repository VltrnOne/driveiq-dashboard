import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { extractToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const token = extractToken(request.headers.get('authorization')) ?? request.cookies.get('driveiq-token')?.value;
  if (token) {
    await prisma.operatorSession.deleteMany({ where: { token } }).catch(() => {});
  }
  const res = NextResponse.json({ success: true });
  res.cookies.delete('driveiq-token');
  return res;
}

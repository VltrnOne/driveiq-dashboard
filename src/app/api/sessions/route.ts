import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireOperatorAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const auth = await requireOperatorAuth(request);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const resolved = searchParams.get('resolved');
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20'), 100);
  const offset = parseInt(searchParams.get('offset') ?? '0');

  const where: Record<string, unknown> = {};
  if (resolved !== null) where.resolved = resolved === 'true';

  const [sessions, total] = await Promise.all([
    prisma.driveThruSession.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true, photoUrl: true, tier: true, rewardPoints: true } },
        vehicle: { select: { id: true, licensePlate: true, make: true, model: true, color: true } },
      },
      orderBy: { detectedAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.driveThruSession.count({ where }),
  ]);

  return NextResponse.json({ success: true, data: sessions, pagination: { total, limit, offset } });
}

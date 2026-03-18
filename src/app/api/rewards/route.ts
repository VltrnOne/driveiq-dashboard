import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireOperatorAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const auth = await requireOperatorAuth(request);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const customerId = searchParams.get('customerId');
  const type = searchParams.get('type');
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 200);

  const where: Record<string, unknown> = {};
  if (customerId) where.customerId = customerId;
  if (type) where.type = type;

  const txns = await prisma.rewardTransaction.findMany({
    where,
    include: { customer: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
  return NextResponse.json({ success: true, data: txns });
}

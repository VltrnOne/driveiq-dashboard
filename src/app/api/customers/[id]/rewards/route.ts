import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireOperatorAuth } from '@/lib/auth';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireOperatorAuth(request);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  const txns = await prisma.rewardTransaction.findMany({
    where: { customerId: id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  const customer = await prisma.customer.findUnique({
    where: { id: id },
    select: { rewardPoints: true, tier: true },
  });
  return NextResponse.json({ success: true, data: { ...customer, transactions: txns } });
}

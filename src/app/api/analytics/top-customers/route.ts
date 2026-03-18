import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireOperatorAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const auth = await requireOperatorAuth(request);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '10'), 50);
  const from = searchParams.get('from') ? new Date(searchParams.get('from')!) : new Date(Date.now() - 30 * 86400000);

  const customers = await prisma.customer.findMany({
    where: { orders: { some: { status: 'COMPLETE', createdAt: { gte: from } } } },
    include: {
      orders: {
        where: { status: 'COMPLETE', createdAt: { gte: from } },
        select: { total: true },
      },
    },
    orderBy: { visitCount: 'desc' },
    take: limit,
  });

  const data = customers.map(c => ({
    id: c.id,
    name: c.name,
    photoUrl: c.photoUrl,
    tier: c.tier,
    rewardPoints: c.rewardPoints,
    visitCount: c.visitCount,
    revenue: parseFloat(c.orders.reduce((s, o) => s + o.total, 0).toFixed(2)),
    orderCount: c.orders.length,
  }));

  data.sort((a, b) => b.revenue - a.revenue);
  return NextResponse.json({ success: true, data });
}

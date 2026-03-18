import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireOperatorAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const auth = await requireOperatorAuth(request);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from') ? new Date(searchParams.get('from')!) : new Date(Date.now() - 30 * 86400000);
  const to = searchParams.get('to') ? new Date(searchParams.get('to')!) : new Date();

  const orders = await prisma.order.findMany({
    where: { status: 'COMPLETE', createdAt: { gte: from, lte: to } },
    select: { total: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });

  // Group by day
  const byDay: Record<string, { date: string; revenue: number; count: number }> = {};
  for (const o of orders) {
    const day = o.createdAt.toISOString().split('T')[0];
    if (!byDay[day]) byDay[day] = { date: day, revenue: 0, count: 0 };
    byDay[day].revenue += o.total;
    byDay[day].count += 1;
  }

  const totalRevenue = orders.reduce((s, o) => s + o.total, 0);
  const totalOrders = orders.length;

  return NextResponse.json({
    success: true,
    data: {
      chart: Object.values(byDay),
      totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      totalOrders,
      avgOrderValue: totalOrders ? parseFloat((totalRevenue / totalOrders).toFixed(2)) : 0,
    },
  });
}

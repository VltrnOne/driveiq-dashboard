import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireOperatorAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const auth = await requireOperatorAuth(request);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '10'), 50);
  const from = searchParams.get('from') ? new Date(searchParams.get('from')!) : new Date(Date.now() - 30 * 86400000);

  const items = await prisma.orderItem.groupBy({
    by: ['menuItemId'],
    where: { order: { status: 'COMPLETE', createdAt: { gte: from } } },
    _sum: { quantity: true },
    _count: { id: true },
    orderBy: { _sum: { quantity: 'desc' } },
    take: limit,
  });

  const menuItems = await prisma.menuItem.findMany({
    where: { id: { in: items.map(i => i.menuItemId) } },
  });

  const menuMap = new Map(menuItems.map(m => [m.id, m]));
  const data = items.map(i => ({
    menuItemId: i.menuItemId,
    name: menuMap.get(i.menuItemId)?.name ?? 'Unknown',
    category: menuMap.get(i.menuItemId)?.category ?? 'UNKNOWN',
    totalQuantity: i._sum.quantity ?? 0,
    orderCount: i._count.id,
  }));

  return NextResponse.json({ success: true, data });
}

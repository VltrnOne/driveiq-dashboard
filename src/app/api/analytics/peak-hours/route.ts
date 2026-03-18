import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireOperatorAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const auth = await requireOperatorAuth(request);
  if (auth instanceof NextResponse) return auth;

  const from = new Date(Date.now() - 30 * 86400000);

  const orders = await prisma.order.findMany({
    where: { status: 'COMPLETE', createdAt: { gte: from } },
    select: { createdAt: true },
  });

  // 7x24 heatmap: dayOfWeek (0=Sun) x hour
  const heatmap: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
  for (const o of orders) {
    const d = o.createdAt.getDay();
    const h = o.createdAt.getHours();
    heatmap[d][h]++;
  }

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const data = days.map((day, i) => ({
    day,
    hours: heatmap[i].map((count, hour) => ({ hour, count })),
  }));

  return NextResponse.json({ success: true, data });
}

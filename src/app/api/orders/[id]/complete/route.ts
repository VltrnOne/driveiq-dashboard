import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireOperatorAuth } from '@/lib/auth';
import { broadcast } from '@/lib/wsManager';

const TIER_THRESHOLDS = {
  SILVER: parseInt(process.env.TIER_SILVER_THRESHOLD ?? '500'),
  GOLD: parseInt(process.env.TIER_GOLD_THRESHOLD ?? '1500'),
  PLATINUM: parseInt(process.env.TIER_PLATINUM_THRESHOLD ?? '5000'),
};

function calculateTier(points: number): string {
  if (points >= TIER_THRESHOLDS.PLATINUM) return 'PLATINUM';
  if (points >= TIER_THRESHOLDS.GOLD) return 'GOLD';
  if (points >= TIER_THRESHOLDS.SILVER) return 'SILVER';
  return 'BRONZE';
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireOperatorAuth(request);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id: id },
    include: { customer: true },
  });
  if (!order) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  if (order.status === 'COMPLETE') return NextResponse.json({ success: false, error: 'Already complete' }, { status: 400 });

  const pointsPerDollar = parseInt(process.env.POINTS_PER_DOLLAR ?? '10');
  const pointsEarned = order.customerId ? Math.floor(order.total * pointsPerDollar) : 0;

  // Update order status
  const updatedOrder = await prisma.order.update({
    where: { id: id },
    data: { status: 'COMPLETE' },
  });

  let updatedCustomer = null;
  if (order.customerId && pointsEarned > 0) {
    // Award points and update tier
    await prisma.rewardTransaction.create({
      data: {
        customerId: order.customerId,
        points: pointsEarned,
        type: 'EARNED',
        orderId: order.id,
        note: `Earned from order $${order.total.toFixed(2)}`,
      },
    });

    const customer = await prisma.customer.findUnique({ where: { id: order.customerId } });
    const newPoints = (customer?.rewardPoints ?? 0) + pointsEarned;
    const newTier = calculateTier(newPoints);

    updatedCustomer = await prisma.customer.update({
      where: { id: order.customerId },
      data: {
        rewardPoints: newPoints,
        tier: newTier,
        visitCount: { increment: 1 },
        lastVisitAt: new Date(),
      },
    });
  }

  // Mark session resolved if linked
  if (order.sessionId) {
    await prisma.driveThruSession.update({
      where: { id: order.sessionId },
      data: { resolved: true, resolvedAt: new Date() },
    }).catch(() => {});
  }

  broadcast({ type: 'order_update', orderId: order.id, status: 'COMPLETE' });

  return NextResponse.json({
    success: true,
    data: { order: updatedOrder, pointsEarned, customer: updatedCustomer },
  });
}

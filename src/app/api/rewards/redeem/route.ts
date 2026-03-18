import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireOperatorAuth } from '@/lib/auth';
import { RedeemSchema } from '@/lib/validations';

export async function POST(request: NextRequest) {
  const auth = await requireOperatorAuth(request);
  if (auth instanceof NextResponse) return auth;

  const body = await request.json();
  const parsed = RedeemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }

  const customer = await prisma.customer.findUnique({ where: { id: parsed.data.customerId } });
  if (!customer) return NextResponse.json({ success: false, error: 'Customer not found' }, { status: 404 });
  if (customer.rewardPoints < parsed.data.points) {
    return NextResponse.json({ success: false, error: 'Insufficient points' }, { status: 400 });
  }

  const [txn, updated] = await prisma.$transaction([
    prisma.rewardTransaction.create({
      data: {
        customerId: parsed.data.customerId,
        points: -parsed.data.points,
        type: 'REDEEMED',
        orderId: parsed.data.orderId ?? null,
        note: parsed.data.note ?? 'Points redeemed at counter',
      },
    }),
    prisma.customer.update({
      where: { id: parsed.data.customerId },
      data: { rewardPoints: { decrement: parsed.data.points } },
    }),
  ]);

  return NextResponse.json({ success: true, data: { transaction: txn, newBalance: updated.rewardPoints } });
}

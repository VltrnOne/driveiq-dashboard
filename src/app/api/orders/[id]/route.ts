import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireOperatorAuth } from '@/lib/auth';
import { OrderStatusSchema } from '@/lib/validations';
import { broadcast } from '@/lib/wsManager';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireOperatorAuth(request);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id: id },
    include: {
      customer: true,
      items: { include: { menuItem: true } },
      session: true,
    },
  });
  if (!order) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  return NextResponse.json({ success: true, data: order });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireOperatorAuth(request);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  const body = await request.json();
  const parsed = OrderStatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }

  const order = await prisma.order.update({
    where: { id: id },
    data: parsed.data,
  });

  broadcast({ type: 'order_update', orderId: order.id, status: order.status });
  return NextResponse.json({ success: true, data: order });
}

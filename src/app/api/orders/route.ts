import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireOperatorAuth } from '@/lib/auth';
import { OrderSchema } from '@/lib/validations';

export async function GET(request: NextRequest) {
  const auth = await requireOperatorAuth(request);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const customerId = searchParams.get('customerId');
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20'), 100);
  const offset = parseInt(searchParams.get('offset') ?? '0');

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (customerId) where.customerId = customerId;

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true, photoUrl: true, tier: true } },
        items: { include: { menuItem: { select: { name: true, category: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.order.count({ where }),
  ]);
  return NextResponse.json({ success: true, data: orders, pagination: { total, limit, offset } });
}

export async function POST(request: NextRequest) {
  const auth = await requireOperatorAuth(request);
  if (auth instanceof NextResponse) return auth;

  const body = await request.json();
  const parsed = OrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }

  const { items, customerId, sessionId, method, notes } = parsed.data;

  // Fetch menu items to calculate prices
  const menuItems = await prisma.menuItem.findMany({
    where: { id: { in: items.map(i => i.menuItemId) }, available: true },
  });

  const menuMap = new Map(menuItems.map(m => [m.id, m]));
  const orderItems = items.map(i => {
    const mi = menuMap.get(i.menuItemId);
    if (!mi) throw new Error(`Menu item ${i.menuItemId} not found`);
    return { menuItemId: i.menuItemId, quantity: i.quantity, unitPrice: mi.price, notes: i.notes };
  });

  const subtotal = orderItems.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  const taxRate = parseFloat(process.env.TAX_RATE ?? '0.0875');
  const tax = parseFloat((subtotal * taxRate).toFixed(2));
  const total = parseFloat((subtotal + tax).toFixed(2));

  const order = await prisma.order.create({
    data: {
      customerId: customerId ?? null,
      sessionId: sessionId ?? null,
      subtotal,
      tax,
      total,
      method,
      notes: notes ?? null,
      items: { create: orderItems },
    },
    include: { items: { include: { menuItem: true } } },
  });

  return NextResponse.json({ success: true, data: order }, { status: 201 });
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireOperatorAuth } from '@/lib/auth';
import { getOrderSuggestions } from '@/lib/suggestions';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireOperatorAuth(request);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  const customer = await prisma.customer.findUnique({
    where: { id: id },
    include: {
      orders: {
        where: { status: 'COMPLETE' },
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: { items: { include: { menuItem: { select: { name: true } } } } },
      },
    },
  });
  if (!customer) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

  const menuItems = await prisma.menuItem.findMany({
    where: { available: true },
    select: { id: true, name: true, category: true },
    orderBy: { sortOrder: 'asc' },
  });

  const orderHistory = customer.orders.map(o => ({
    items: o.items.map(i => i.menuItem.name),
    total: o.total,
    createdAt: o.createdAt.toISOString(),
  }));

  const availableItems = menuItems.map(m => m.name);

  const result = await getOrderSuggestions(customer.name, orderHistory, availableItems, customer.visitCount);

  // Attach menuItemId to suggestions
  const suggestionsWithIds = result.suggestions.map(s => ({
    ...s,
    menuItemId: menuItems.find(m => m.name.toLowerCase() === s.name.toLowerCase())?.id,
  }));

  return NextResponse.json({ success: true, data: { ...result, suggestions: suggestionsWithIds } });
}

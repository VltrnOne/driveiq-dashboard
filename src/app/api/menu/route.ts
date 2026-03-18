import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireOperatorAuth } from '@/lib/auth';
import { MenuItemSchema } from '@/lib/validations';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const available = searchParams.get('available');

  const where: Record<string, unknown> = {};
  if (category) where.category = category;
  if (available !== null) where.available = available === 'true';

  const items = await prisma.menuItem.findMany({
    where,
    orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
  });
  return NextResponse.json({ success: true, data: items });
}

export async function POST(request: NextRequest) {
  const auth = await requireOperatorAuth(request);
  if (auth instanceof NextResponse) return auth;

  const body = await request.json();
  const parsed = MenuItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }
  const { tags, ...rest } = parsed.data;
  const item = await prisma.menuItem.create({
    data: { ...rest, tags: tags ? JSON.stringify(tags) : null },
  });
  return NextResponse.json({ success: true, data: item }, { status: 201 });
}

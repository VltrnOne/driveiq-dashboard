import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireOperatorAuth } from '@/lib/auth';
import { MenuItemUpdateSchema } from '@/lib/validations';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireOperatorAuth(request);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  const body = await request.json();
  const parsed = MenuItemUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }
  const { tags, ...rest } = parsed.data;
  const item = await prisma.menuItem.update({
    where: { id: id },
    data: { ...rest, ...(tags !== undefined && { tags: JSON.stringify(tags) }) },
  });
  return NextResponse.json({ success: true, data: item });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireOperatorAuth(request);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  await prisma.menuItem.delete({ where: { id: id } });
  return NextResponse.json({ success: true });
}

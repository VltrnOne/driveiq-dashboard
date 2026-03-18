import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireOperatorAuth } from '@/lib/auth';
import { CustomerUpdateSchema } from '@/lib/validations';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireOperatorAuth(request);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  const customer = await prisma.customer.findUnique({
    where: { id: id },
    include: {
      vehicles: true,
      orders: { orderBy: { createdAt: 'desc' }, take: 5, include: { items: { include: { menuItem: true } } } },
      rewardTxns: { orderBy: { createdAt: 'desc' }, take: 10 },
    },
  });
  if (!customer) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

  return NextResponse.json({
    success: true,
    data: {
      ...customer,
      preferences: customer.preferences ? JSON.parse(customer.preferences) : [],
      allergies: customer.allergies ? JSON.parse(customer.allergies) : [],
      faceEmbedding: undefined, // never expose embeddings
    },
  });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireOperatorAuth(request);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  const body = await request.json();
  const parsed = CustomerUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }

  const { preferences, allergies, ...rest } = parsed.data;
  const customer = await prisma.customer.update({
    where: { id: id },
    data: {
      ...rest,
      ...(preferences !== undefined && { preferences: JSON.stringify(preferences) }),
      ...(allergies !== undefined && { allergies: JSON.stringify(allergies) }),
    },
  });
  return NextResponse.json({ success: true, data: customer });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireOperatorAuth(request);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  await prisma.customer.delete({ where: { id: id } });
  return NextResponse.json({ success: true });
}

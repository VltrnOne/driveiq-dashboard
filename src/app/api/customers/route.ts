import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireOperatorAuth } from '@/lib/auth';
import { CustomerSchema } from '@/lib/validations';

export async function GET(request: NextRequest) {
  const auth = await requireOperatorAuth(request);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') ?? '';
  const tier = searchParams.get('tier');
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20'), 100);
  const offset = parseInt(searchParams.get('offset') ?? '0');

  const where: Record<string, unknown> = {};
  if (tier) where.tier = tier;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search } },
      { vehicles: { some: { licensePlate: { contains: search.toUpperCase() } } } },
    ];
  }

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      include: { vehicles: { where: { isPrimary: true } } },
      orderBy: { lastVisitAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.customer.count({ where }),
  ]);

  return NextResponse.json({ success: true, data: customers, pagination: { total, limit, offset } });
}

export async function POST(request: NextRequest) {
  const auth = await requireOperatorAuth(request);
  if (auth instanceof NextResponse) return auth;

  const body = await request.json();
  const parsed = CustomerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }

  const { preferences, allergies, ...rest } = parsed.data;
  const customer = await prisma.customer.create({
    data: {
      ...rest,
      preferences: preferences ? JSON.stringify(preferences) : null,
      allergies: allergies ? JSON.stringify(allergies) : null,
    },
  });
  return NextResponse.json({ success: true, data: customer }, { status: 201 });
}

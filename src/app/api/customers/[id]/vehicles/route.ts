import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireOperatorAuth } from '@/lib/auth';
import { VehicleSchema } from '@/lib/validations';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireOperatorAuth(request);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const vehicles = await prisma.vehicle.findMany({ where: { customerId: id } });
  return NextResponse.json({ success: true, data: vehicles });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireOperatorAuth(request);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  const body = await request.json();
  const parsed = VehicleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }

  // If isPrimary, clear existing primary
  if (parsed.data.isPrimary) {
    await prisma.vehicle.updateMany({ where: { customerId: id }, data: { isPrimary: false } });
  }

  const vehicle = await prisma.vehicle.create({ data: { ...parsed.data, customerId: id } });
  return NextResponse.json({ success: true, data: vehicle }, { status: 201 });
}

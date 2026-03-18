import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireOperatorAuth } from '@/lib/auth';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireOperatorAuth(request);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  const session = await prisma.driveThruSession.update({
    where: { id: id },
    data: { resolved: true, resolvedAt: new Date() },
  });
  return NextResponse.json({ success: true, data: session });
}

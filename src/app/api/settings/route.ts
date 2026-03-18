import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireOperatorAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const auth = await requireOperatorAuth(request);
  if (auth instanceof NextResponse) return auth;

  const settings = await prisma.systemSetting.findMany();
  const map = Object.fromEntries(settings.map(s => [s.key, s.value]));
  return NextResponse.json({ success: true, data: map });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireOperatorAuth(request);
  if (auth instanceof NextResponse) return auth;

  const body = await request.json() as Record<string, string>;
  await Promise.all(
    Object.entries(body).map(([key, value]) =>
      prisma.systemSetting.upsert({ where: { key }, update: { value }, create: { key, value } })
    )
  );
  return NextResponse.json({ success: true });
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireOperatorAuth } from '@/lib/auth';
import { generateQRCodePNG } from '@/lib/qrcode';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireOperatorAuth(request);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  const customer = await prisma.customer.findUnique({ where: { id: id }, select: { qrToken: true } });
  if (!customer) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

  const png = await generateQRCodePNG(customer.qrToken);
  return new NextResponse(new Uint8Array(png), {
    headers: { 'Content-Type': 'image/png', 'Cache-Control': 'no-cache' },
  });
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireOperatorAuth } from '@/lib/auth';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireOperatorAuth(request);
  if (auth instanceof NextResponse) return auth;

  const visionUrl = process.env.VISION_SERVICE_URL;
  if (!visionUrl) {
    return NextResponse.json({ success: false, error: 'Vision service not configured' }, { status: 503 });
  }

  const formData = await request.formData();
  const photo = formData.get('photo') as File | null;
  if (!photo) {
    return NextResponse.json({ success: false, error: 'Missing photo field' }, { status: 400 });
  }

  const bytes = await photo.arrayBuffer();
  const b64 = Buffer.from(bytes).toString('base64');

  // Call vision service to extract face embedding
  const res = await fetch(`${visionUrl}/api/detect/face`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.VISION_API_KEY ?? '' },
    body: JSON.stringify({ image_b64: b64 }),
  });

  if (!res.ok) {
    return NextResponse.json({ success: false, error: 'Vision service error' }, { status: 502 });
  }

  const { face_found, embedding } = await res.json();
  if (!face_found || !embedding) {
    return NextResponse.json({ success: false, error: 'No face detected in photo' }, { status: 422 });
  }

  const { id } = await params;
  await prisma.customer.update({
    where: { id },
    data: { faceEnrolled: true, faceEmbedding: JSON.stringify(embedding) },
  });

  return NextResponse.json({ success: true, data: { enrolled: true } });
}

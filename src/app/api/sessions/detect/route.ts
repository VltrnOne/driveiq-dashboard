import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { broadcast } from '@/lib/wsManager';
import { DetectSessionSchema } from '@/lib/validations';

function verifyWebhook(request: NextRequest): boolean {
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) return true; // dev mode: allow all
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return false;
  return auth.substring(7) === secret;
}

export async function POST(request: NextRequest) {
  if (!verifyWebhook(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  // Also handle QR scan via GET query param (customers scan QR code with phone)
  const { searchParams } = new URL(request.url);
  const qrParam = searchParams.get('qr');

  let body: Record<string, unknown> = {};
  try { body = await request.json(); } catch { /* body-less QR GET */ }

  const qrToken = (body.qrToken as string) ?? qrParam ?? undefined;

  const parsed = DetectSessionSchema.safeParse({ ...body, qrToken });
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  let vehicleId: string | undefined;
  let customerId: string | undefined;
  let customer = null;

  // LPR: look up vehicle → customer
  if (data.detectedPlate && data.method === 'LPR') {
    const vehicle = await prisma.vehicle.findUnique({
      where: { licensePlate: data.detectedPlate.toUpperCase() },
      include: { customer: { include: { vehicles: true } } },
    });
    if (vehicle) {
      vehicleId = vehicle.id;
      customerId = vehicle.customerId;
      customer = vehicle.customer;
    }
  }

  // QR: look up customer by qrToken
  if (qrToken && !customerId) {
    const found = await prisma.customer.findUnique({
      where: { qrToken },
      include: { vehicles: true },
    });
    if (found) {
      customerId = found.id;
      customer = found;
    }
  }

  // Face: compare incoming embedding against enrolled customers
  if (data.faceEmbedding && data.faceEmbedding.length > 0 && !customerId) {
    const threshold = parseFloat(process.env.FACE_DISTANCE_THRESHOLD ?? '0.40');
    const enrolled = await prisma.customer.findMany({
      where: { faceEnrolled: true, faceEmbedding: { not: null } },
      include: { vehicles: true },
    });
    let bestDist = Infinity;
    let bestCustomer = null;
    for (const c of enrolled) {
      try {
        const stored: number[] = JSON.parse(c.faceEmbedding!);
        const dist = cosineDistance(data.faceEmbedding, stored);
        if (dist < bestDist) { bestDist = dist; bestCustomer = c; }
      } catch { /* skip corrupt embeddings */ }
    }
    if (bestCustomer && bestDist <= threshold) {
      customerId = bestCustomer.id;
      customer = bestCustomer;
    }
  }

  // Create session record
  const session = await prisma.driveThruSession.create({
    data: {
      vehicleId: vehicleId ?? null,
      customerId: customerId ?? null,
      detectedPlate: data.detectedPlate ?? null,
      confidence: data.confidence ?? null,
      method: data.method,
      rawPayload: data.rawPayload ?? null,
    },
  });

  // If customer found, update visit tracking
  if (customerId) {
    await prisma.customer.update({
      where: { id: customerId },
      data: { lastVisitAt: new Date() },
    });
  }

  // Broadcast to operator browsers
  broadcast({
    type: 'detection',
    sessionId: session.id,
    detectedPlate: data.detectedPlate,
    customerId,
    customer: customer ? {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      photoUrl: customer.photoUrl,
      rewardPoints: customer.rewardPoints,
      tier: customer.tier,
      preferences: customer.preferences ? JSON.parse(customer.preferences) : [],
      allergies: customer.allergies ? JSON.parse(customer.allergies) : [],
      notes: customer.notes,
      visitCount: customer.visitCount,
      qrToken: customer.qrToken,
    } : null,
    confidence: data.confidence,
    method: data.method,
    ts: Date.now(),
  });

  return NextResponse.json({
    success: true,
    data: { sessionId: session.id, customerId: customerId ?? null, customerFound: !!customer },
  });
}

export async function GET(request: NextRequest) {
  // QR scan redirect — customer scanned their QR code
  const { searchParams } = new URL(request.url);
  const qrToken = searchParams.get('qr');
  if (!qrToken) return NextResponse.json({ success: false, error: 'Missing qr param' }, { status: 400 });

  // Trigger detection
  const customer = await prisma.customer.findUnique({ where: { qrToken } });
  if (customer) {
    const session = await prisma.driveThruSession.create({
      data: { customerId: customer.id, method: 'QR', confidence: 1.0 },
    });
    await prisma.customer.update({ where: { id: customer.id }, data: { lastVisitAt: new Date() } });
    broadcast({
      type: 'detection',
      sessionId: session.id,
      customerId: customer.id,
      customer: { id: customer.id, name: customer.name, rewardPoints: customer.rewardPoints, tier: customer.tier },
      method: 'QR',
      confidence: 1.0,
      ts: Date.now(),
    });
  }
  // Redirect to a simple confirmation page
  return NextResponse.redirect(new URL('/?scanned=1', request.url));
}

function cosineDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) return 1;
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const sim = dot / (Math.sqrt(magA) * Math.sqrt(magB) + 1e-10);
  return 1 - sim;
}

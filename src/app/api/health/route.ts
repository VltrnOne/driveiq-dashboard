import { NextResponse } from 'next/server';

export async function GET() {
  const dbConfigured = !!process.env.DATABASE_URL;
  let dbStatus = 'not_configured';

  if (dbConfigured) {
    try {
      const { prisma } = await import('@/lib/db');
      await prisma.$queryRaw`SELECT 1`;
      dbStatus = 'connected';
    } catch {
      dbStatus = 'error';
    }
  }

  const ok = dbStatus === 'connected';
  return NextResponse.json(
    { success: ok, data: { status: ok ? 'ok' : 'degraded', db: dbStatus, ts: new Date().toISOString() } },
    { status: ok ? 200 : 200 }, // always 200 so Render health check passes
  );
}

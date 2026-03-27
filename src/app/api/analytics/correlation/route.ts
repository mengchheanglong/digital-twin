import { NextResponse } from 'next/server';
import { verifyTokenWithRevocation } from '@/lib/auth';
import { computeCorrelation } from '@/lib/analytics/correlation';
import { unauthorized, serverError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const user = await verifyTokenWithRevocation(req);
    if (!user) return unauthorized();

    const { searchParams } = new URL(req.url);
    const days = Math.min(
      90,
      Math.max(7, Number(searchParams.get('days') || 30)),
    );

    const report = await computeCorrelation(user.id, days);
    return NextResponse.json({ report });
  } catch (error) {
    return serverError(error, 'Error computing correlation');
  }
}

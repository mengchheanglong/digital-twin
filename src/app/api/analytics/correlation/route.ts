import { NextResponse } from 'next/server';
import { verifyTokenWithRevocation } from '@/lib/auth';
import { computeCorrelation } from '@/lib/analytics/correlation';
import { unauthorized, serverError } from '@/lib/api-response';
import { parseBoundedInt } from '@/lib/request';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const user = await verifyTokenWithRevocation(req);
    if (!user) return unauthorized();

    const { searchParams } = new URL(req.url);
    const days = parseBoundedInt(searchParams.get('days'), {
      defaultValue: 30,
      min: 7,
      max: 90,
    });

    const report = await computeCorrelation(user.id, days);
    return NextResponse.json({ report });
  } catch (error) {
    return serverError(error, 'Error computing correlation');
  }
}

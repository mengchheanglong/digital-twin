import { NextResponse } from 'next/server';
import { verifyTokenWithRevocation } from '@/lib/auth';
import { computeMoodPatterns } from '@/lib/analytics/mood-patterns';
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

    const patterns = await computeMoodPatterns(user.id, days);
    return NextResponse.json({ patterns });
  } catch (error) {
    return serverError(error, 'Error computing mood patterns');
  }
}

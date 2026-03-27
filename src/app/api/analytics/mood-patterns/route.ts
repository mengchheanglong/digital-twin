import { NextResponse } from 'next/server';
import { verifyTokenWithRevocation } from '@/lib/auth';
import { computeMoodPatterns } from '@/lib/analytics/mood-patterns';
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

    const patterns = await computeMoodPatterns(user.id, days);
    return NextResponse.json({ patterns });
  } catch (error) {
    return serverError(error, 'Error computing mood patterns');
  }
}

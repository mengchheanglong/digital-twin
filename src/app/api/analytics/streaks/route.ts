import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { computeStreaks } from '@/lib/analytics/streaks';
import { unauthorized, serverError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const user = verifyToken(req);
    if (!user) return unauthorized();

    const report = await computeStreaks(user.id);
    return NextResponse.json({ report });
  } catch (error) {
    return serverError(error, 'Error computing streaks');
  }
}

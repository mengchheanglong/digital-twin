import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { verifyTokenWithRevocation } from '@/lib/auth';
import { unauthorized, serverError } from '@/lib/api-response';
import { computeWellnessForecast } from '@/lib/analytics/forecast';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    await dbConnect();

    const user = await verifyTokenWithRevocation(req);
    if (!user) return unauthorized();

    const forecast = await computeWellnessForecast(user.id);

    return NextResponse.json({ success: true, forecast });
  } catch (error) {
    return serverError(error, 'Wellness forecast error');
  }
}

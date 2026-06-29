import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { verifyTokenWithRevocation } from '@/lib/auth';
import { unauthorized, serverError } from '@/lib/api-response';
import { buildTwinContextPack } from '@/lib/twin-core';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    await dbConnect();

    const user = await verifyTokenWithRevocation(req);
    if (!user) return unauthorized();

    const contextPack = await buildTwinContextPack(user.id);
    return NextResponse.json(
      { success: true, contextPack },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    return serverError(error, 'Twin context pack error');
  }
}

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { verifyTokenWithRevocation } from '@/lib/auth';
import { unauthorized, serverError } from '@/lib/api-response';
import { synthesizeUserMemory, getUserMemoryContext } from '@/lib/memory-engine';
import UserMemory from '@/lib/models/UserMemory';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

/** GET: Retrieve the user's current memory model */
export async function GET(req: Request) {
  try {
    await dbConnect();

    const user = await verifyTokenWithRevocation(req);
    if (!user) return unauthorized();

    const uid = new mongoose.Types.ObjectId(user.id);
    const memory = await UserMemory.findOne({ userId: uid }).lean();

    return NextResponse.json({
      success: true,
      memory: memory ?? null,
    });
  } catch (error) {
    return serverError(error, 'Get memory error');
  }
}

/** POST: Trigger a memory synthesis (background-safe) */
export async function POST(req: Request) {
  try {
    await dbConnect();

    const user = await verifyTokenWithRevocation(req);
    if (!user) return unauthorized();

    // Run synthesis asynchronously so the response returns quickly
    synthesizeUserMemory(user.id).catch(console.error);

    return NextResponse.json({
      success: true,
      message: 'Memory synthesis triggered.',
    });
  } catch (error) {
    return serverError(error, 'Synthesize memory error');
  }
}

/** Internal helper: get memory context string for AI prompt injection */
export { getUserMemoryContext };

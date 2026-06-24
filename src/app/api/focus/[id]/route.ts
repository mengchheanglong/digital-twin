import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { verifyTokenWithRevocation } from '@/lib/auth';
import {
  badRequest,
  unauthorized,
  notFound,
  serverError,
} from '@/lib/api-response';
import FocusSession from '@/lib/models/FocusSession';
import dbConnect from '@/lib/db';
import { readJsonBody } from '@/lib/request';

export const dynamic = 'force-dynamic';

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await dbConnect();

    const user = await verifyTokenWithRevocation(req);
    if (!user) return unauthorized();

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return badRequest('Invalid session ID.');

    const session = await FocusSession.findOne({
      _id: id,
      userId: new mongoose.Types.ObjectId(user.id),
    });

    if (!session) return notFound('Focus session not found.');

    const parsed = await readJsonBody<{
      completed?: boolean;
      notes?: string;
      elapsedMinutes?: number;
    }>(req);
    if (parsed.ok === false) return parsed.response;

    const body = parsed.data;

    const now = new Date();
    const elapsedMs = now.getTime() - session.startedAt.getTime();
    let elapsedMinutes = Math.round(elapsedMs / 60000);
    if (body.elapsedMinutes !== undefined) {
      const requestedElapsed = Number(body.elapsedMinutes);
      if (
        !Number.isFinite(requestedElapsed) ||
        requestedElapsed < 0 ||
        requestedElapsed > 1440
      ) {
        return badRequest('Elapsed minutes must be between 0 and 1440.');
      }
      elapsedMinutes = Math.round(requestedElapsed);
    }

    session.endedAt = now;
    session.elapsedMinutes = elapsedMinutes;
    session.completed = body.completed !== false;

    if (body.notes) {
      session.notes = String(body.notes).trim().slice(0, 1000);
    }

    await session.save();

    return NextResponse.json({ session });
  } catch (error) {
    return serverError(error, 'Error ending focus session');
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await dbConnect();

    const user = await verifyTokenWithRevocation(req);
    if (!user) return unauthorized();

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return badRequest('Invalid session ID.');

    const deleted = await FocusSession.findOneAndDelete({
      _id: id,
      userId: new mongoose.Types.ObjectId(user.id),
    });

    if (!deleted) return notFound('Focus session not found.');

    return NextResponse.json({ message: 'Session deleted.' });
  } catch (error) {
    return serverError(error, 'Error deleting focus session');
  }
}

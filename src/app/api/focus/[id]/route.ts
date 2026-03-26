import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { verifyToken } from '@/lib/auth';
import {
  badRequest,
  unauthorized,
  notFound,
  serverError,
} from '@/lib/api-response';
import FocusSession from '@/lib/models/FocusSession';
import dbConnect from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function PUT(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    await dbConnect();

    const user = verifyToken(req);
    if (!user) return unauthorized();

    const { id } = params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return badRequest('Invalid session ID.');

    const session = await FocusSession.findOne({
      _id: id,
      userId: new mongoose.Types.ObjectId(user.id),
    });

    if (!session) return notFound('Focus session not found.');

    const body = (await req.json()) as {
      completed?: boolean;
      notes?: string;
      elapsedMinutes?: number;
    };

    const now = new Date();
    const elapsedMs = now.getTime() - session.startedAt.getTime();
    const elapsedMinutes =
      body.elapsedMinutes !== undefined
        ? Math.max(0, Number(body.elapsedMinutes))
        : Math.round(elapsedMs / 60000);

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
  { params }: { params: { id: string } },
) {
  try {
    await dbConnect();

    const user = verifyToken(req);
    if (!user) return unauthorized();

    const { id } = params;
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

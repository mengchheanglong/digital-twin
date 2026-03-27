import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { verifyTokenWithRevocation } from '@/lib/auth';
import { badRequest, unauthorized, serverError } from '@/lib/api-response';
import FocusSession from '@/lib/models/FocusSession';
import dbConnect from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    await dbConnect();

    const user = await verifyTokenWithRevocation(req);
    if (!user) return unauthorized();

    const { searchParams } = new URL(req.url);
    const limit = Math.min(
      50,
      Math.max(1, Number(searchParams.get('limit') ?? 20)),
    );
    const page = Math.max(1, Number(searchParams.get('page') ?? 1));
    const skip = (page - 1) * limit;

    const uid = new mongoose.Types.ObjectId(user.id);

    const [sessions, total] = await Promise.all([
      FocusSession.find({ userId: uid })
        .sort({ startedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      FocusSession.countDocuments({ userId: uid }),
    ]);

    return NextResponse.json({ sessions, total, page, limit });
  } catch (error) {
    return serverError(error, 'Error fetching focus sessions');
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect();

    const user = await verifyTokenWithRevocation(req);
    if (!user) return unauthorized();

    const body = (await req.json()) as {
      label?: string;
      durationMinutes?: number;
    };

    const label = String(body.label ?? '').trim();
    const durationMinutes = Number(body.durationMinutes ?? 25);

    if (!label) return badRequest('Session label is required.');
    if (label.length > 200)
      return badRequest('Label must be 200 characters or less.');
    if (
      !Number.isFinite(durationMinutes) ||
      durationMinutes < 1 ||
      durationMinutes > 480
    ) {
      return badRequest('Duration must be between 1 and 480 minutes.');
    }

    const session = await FocusSession.create({
      userId: new mongoose.Types.ObjectId(user.id),
      label,
      durationMinutes,
      startedAt: new Date(),
      completed: false,
    });

    return NextResponse.json({ session }, { status: 201 });
  } catch (error) {
    return serverError(error, 'Error starting focus session');
  }
}

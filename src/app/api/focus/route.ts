import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { verifyTokenWithRevocation } from '@/lib/auth';
import { badRequest, unauthorized, serverError } from '@/lib/api-response';
import FocusSession from '@/lib/models/FocusSession';
import dbConnect from '@/lib/db';
import { parseBoundedInt, readJsonBody } from '@/lib/request';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    await dbConnect();

    const user = await verifyTokenWithRevocation(req);
    if (!user) return unauthorized();

    const { searchParams } = new URL(req.url);
    const limit = parseBoundedInt(searchParams.get('limit'), {
      defaultValue: 20,
      min: 1,
      max: 50,
    });
    const page = parseBoundedInt(searchParams.get('page'), {
      defaultValue: 1,
      min: 1,
      max: 10000,
    });
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

    const parsed = await readJsonBody<{
      label?: string;
      durationMinutes?: number;
    }>(req);
    if (parsed.ok === false) return parsed.response;

    const body = parsed.data;

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

import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import { verifyTokenWithRevocation } from '@/lib/auth';
import { unauthorized, serverError, badRequest } from '@/lib/api-response';
import LifeEvent from '@/lib/models/LifeEvent';
import { getDayKey } from '@/lib/progression';

export const dynamic = 'force-dynamic';

type LifeEventCategory = 'career' | 'health' | 'relationship' | 'personal' | 'travel' | 'achievement' | 'challenge' | 'other';
const VALID_CATEGORIES: LifeEventCategory[] = [
  'career', 'health', 'relationship', 'personal', 'travel', 'achievement', 'challenge', 'other',
];

export async function GET(req: Request) {
  try {
    await dbConnect();

    const user = await verifyTokenWithRevocation(req);
    if (!user) return unauthorized();

    const uid = new mongoose.Types.ObjectId(user.id);
    const { searchParams } = new URL(req.url);
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') ?? 50)));
    const page = Math.max(1, Number(searchParams.get('page') ?? 1));

    const [events, total] = await Promise.all([
      LifeEvent.find({ userId: uid })
        .sort({ date: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      LifeEvent.countDocuments({ userId: uid }),
    ]);

    return NextResponse.json({ success: true, events, total, page, limit });
  } catch (error) {
    return serverError(error, 'Fetch life events error');
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect();

    const user = await verifyTokenWithRevocation(req);
    if (!user) return unauthorized();

    const body = (await req.json()) as {
      title?: string;
      category?: string;
      notes?: string;
      date?: string;
    };

    const title = String(body.title ?? '').trim();
    if (!title) return badRequest('title is required.');
    if (title.length > 200) return badRequest('title must be 200 characters or less.');

    const category: LifeEventCategory = VALID_CATEGORIES.includes(body.category as LifeEventCategory)
      ? (body.category as LifeEventCategory)
      : 'other';

    const notes = String(body.notes ?? '').trim().slice(0, 1000);

    const dateRaw = body.date ? new Date(body.date) : new Date();
    if (isNaN(dateRaw.getTime())) return badRequest('Invalid date.');

    const event = await LifeEvent.create({
      userId: new mongoose.Types.ObjectId(user.id),
      title,
      category,
      notes,
      date: dateRaw,
      dayKey: getDayKey(dateRaw),
    });

    return NextResponse.json({ success: true, event }, { status: 201 });
  } catch (error) {
    return serverError(error, 'Create life event error');
  }
}

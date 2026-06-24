import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { verifyTokenWithRevocation } from '@/lib/auth';
import { badRequest, unauthorized, serverError } from '@/lib/api-response';
import JournalEntry from '@/lib/models/JournalEntry';
import dbConnect from '@/lib/db';
import { getDayKey } from '@/lib/progression';
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

    const [entries, total] = await Promise.all([
      JournalEntry.find({ userId: uid })
        .select('title content mood tags date dayKey createdAt')
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      JournalEntry.countDocuments({ userId: uid }),
    ]);

    return NextResponse.json({ entries, total, page, limit });
  } catch (error) {
    return serverError(error, 'Error fetching journal entries');
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect();

    const user = await verifyTokenWithRevocation(req);
    if (!user) return unauthorized();

    const parsed = await readJsonBody<{
      title?: string;
      content?: string;
      mood?: string;
      tags?: unknown[];
    }>(req);
    if (parsed.ok === false) return parsed.response;

    const body = parsed.data;

    const title = String(body.title ?? '').trim();
    const content = String(body.content ?? '').trim();
    const mood = String(body.mood ?? '').trim().slice(0, 50);
    const tags = Array.isArray(body.tags)
      ? body.tags
          .map((t) => String(t).trim())
          .filter(Boolean)
          .slice(0, 10)
      : [];

    if (!title) return badRequest('Title is required.');
    if (title.length > 200)
      return badRequest('Title must be 200 characters or less.');
    if (!content) return badRequest('Content is required.');
    if (content.length > 5000)
      return badRequest('Content must be 5000 characters or less.');

    const now = new Date();
    const entry = await JournalEntry.create({
      userId: new mongoose.Types.ObjectId(user.id),
      title,
      content,
      mood: mood || undefined,
      tags,
      date: now,
      dayKey: getDayKey(now),
    });

    return NextResponse.json({ entry }, { status: 201 });
  } catch (error) {
    return serverError(error, 'Error creating journal entry');
  }
}

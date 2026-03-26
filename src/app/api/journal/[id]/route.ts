import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { verifyToken } from '@/lib/auth';
import {
  badRequest,
  unauthorized,
  notFound,
  serverError,
} from '@/lib/api-response';
import JournalEntry from '@/lib/models/JournalEntry';
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
      return badRequest('Invalid entry ID.');

    const body = (await req.json()) as {
      title?: string;
      content?: string;
      mood?: string;
      tags?: unknown[];
    };

    const updates: Record<string, unknown> = {};

    if (body.title !== undefined) {
      const title = String(body.title).trim();
      if (!title || title.length > 200)
        return badRequest('Title must be 1–200 characters.');
      updates.title = title;
    }

    if (body.content !== undefined) {
      const content = String(body.content).trim();
      if (!content || content.length > 5000)
        return badRequest('Content must be 1–5000 characters.');
      updates.content = content;
    }

    if (body.mood !== undefined) {
      updates.mood =
        String(body.mood).trim().slice(0, 50) || undefined;
    }

    if (body.tags !== undefined) {
      updates.tags = Array.isArray(body.tags)
        ? body.tags
            .map((t) => String(t).trim())
            .filter(Boolean)
            .slice(0, 10)
        : [];
    }

    const updated = await JournalEntry.findOneAndUpdate(
      { _id: id, userId: new mongoose.Types.ObjectId(user.id) },
      { $set: updates },
      { new: true },
    );

    if (!updated) return notFound('Journal entry not found.');

    return NextResponse.json({ entry: updated });
  } catch (error) {
    return serverError(error, 'Error updating journal entry');
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
      return badRequest('Invalid entry ID.');

    const deleted = await JournalEntry.findOneAndDelete({
      _id: id,
      userId: new mongoose.Types.ObjectId(user.id),
    });

    if (!deleted) return notFound('Journal entry not found.');

    return NextResponse.json({ message: 'Entry deleted successfully.' });
  } catch (error) {
    return serverError(error, 'Error deleting journal entry');
  }
}

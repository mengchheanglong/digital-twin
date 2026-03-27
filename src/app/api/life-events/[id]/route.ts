import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import { verifyTokenWithRevocation } from '@/lib/auth';
import { unauthorized, serverError, notFound } from '@/lib/api-response';
import LifeEvent from '@/lib/models/LifeEvent';

export const dynamic = 'force-dynamic';

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await dbConnect();

    const user = await verifyTokenWithRevocation(req);
    if (!user) return unauthorized();

    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return notFound('Life event not found.');

    const deleted = await LifeEvent.findOneAndDelete({
      _id: new mongoose.Types.ObjectId(id),
      userId: new mongoose.Types.ObjectId(user.id),
    });

    if (!deleted) return notFound('Life event not found.');

    return NextResponse.json({ success: true, message: 'Life event deleted.' });
  } catch (error) {
    return serverError(error, 'Delete life event error');
  }
}

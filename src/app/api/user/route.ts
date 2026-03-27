import mongoose from 'mongoose';
import { withAuth } from '@/lib/auth';
import { serverError } from '@/lib/api-response';
import dbConnect from '@/lib/db';
import ChatConversation from '@/lib/models/ChatConversation';
import ChatMessage from '@/lib/models/ChatMessage';
import ChatSignal from '@/lib/models/ChatSignal';
import CheckIn from '@/lib/models/CheckIn';
import FocusSession from '@/lib/models/FocusSession';
import JournalEntry from '@/lib/models/JournalEntry';
import Quest from '@/lib/models/Quest';
import QuestLog from '@/lib/models/QuestLog';
import User from '@/lib/models/User';
import UserEvent from '@/lib/models/UserEvent';
import UserInsightState from '@/lib/models/UserInsightState';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * DELETE /api/user
 *
 * Permanently deletes the authenticated user and all data associated with them
 * across every collection (GDPR right to erasure).
 */
export const DELETE = withAuth(async (_req, _context, user) => {
  try {
    await dbConnect();

    const uid = new mongoose.Types.ObjectId(user.id);

    await Promise.all([
      User.deleteOne({ _id: uid }),
      CheckIn.deleteMany({ userId: uid }),
      Quest.deleteMany({ userId: uid }),
      QuestLog.deleteMany({ userId: uid }),
      JournalEntry.deleteMany({ userId: uid }),
      FocusSession.deleteMany({ userId: uid }),
      ChatMessage.deleteMany({ userId: user.id }),
      ChatConversation.deleteMany({ userId: user.id }),
      ChatSignal.deleteMany({ userId: user.id }),
      UserEvent.deleteMany({ userId: uid }),
      UserInsightState.deleteMany({ userId: uid }),
      // RateLimitEntry rows are keyed by IP, not userId, so no user-specific cleanup needed.
    ]);

    return NextResponse.json({ message: 'Account and all associated data have been deleted.' });
  } catch (error) {
    return serverError(error, 'Error deleting account');
  }
});

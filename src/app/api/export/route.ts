import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { verifyTokenWithRevocation } from '@/lib/auth';
import { unauthorized, serverError } from '@/lib/api-response';
import User from '@/lib/models/User';
import CheckIn from '@/lib/models/CheckIn';
import Quest from '@/lib/models/Quest';
import QuestLog from '@/lib/models/QuestLog';
import JournalEntry from '@/lib/models/JournalEntry';
import FocusSession from '@/lib/models/FocusSession';
import LifeEvent from '@/lib/models/LifeEvent';
import BurnoutHistory from '@/lib/models/BurnoutHistory';
import UserEvent from '@/lib/models/UserEvent';
import UserInsightState from '@/lib/models/UserInsightState';
import UserMemory from '@/lib/models/UserMemory';
import ChatConversation from '@/lib/models/ChatConversation';
import ChatMessage from '@/lib/models/ChatMessage';
import ChatSignal from '@/lib/models/ChatSignal';
import dbConnect from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    await dbConnect();

    const user = await verifyTokenWithRevocation(req);
    if (!user) return unauthorized();

    const uid = new mongoose.Types.ObjectId(user.id);

    const [
      profile,
      checkIns,
      quests,
      questLogs,
      journals,
      focusSessions,
      lifeEvents,
      burnoutHistory,
      userEvents,
      insightState,
      userMemory,
      chatConversations,
      chatMessages,
      chatSignals,
    ] = await Promise.all([
      User.findById(uid)
        .select(
          '-password -resetPasswordToken -resetPasswordExpires -passwordChangedAt',
        )
        .lean(),
      CheckIn.find({ userId: uid }).sort({ date: -1 }).lean(),
      Quest.find({ userId: uid }).sort({ date: -1 }).lean(),
      QuestLog.find({ userId: uid })
        .sort({ completedDate: -1 })
        .lean(),
      JournalEntry.find({ userId: uid }).sort({ date: -1 }).lean(),
      FocusSession.find({ userId: uid })
        .sort({ startedAt: -1 })
        .lean(),
      LifeEvent.find({ userId: uid }).sort({ date: -1 }).lean(),
      BurnoutHistory.find({ userId: uid }).sort({ recordedAt: -1 }).lean(),
      UserEvent.find({ userId: uid }).sort({ createdAt: -1 }).lean(),
      UserInsightState.findOne({ userId: uid }).lean(),
      UserMemory.findOne({ userId: uid }).lean(),
      ChatConversation.find({ userId: user.id }).sort({ updatedAt: -1 }).lean(),
      ChatMessage.find({ userId: user.id }).sort({ createdAt: -1 }).lean(),
      ChatSignal.find({ userId: user.id }).sort({ createdAt: -1 }).lean(),
    ]);

    const exportData = {
      exportedAt: new Date().toISOString(),
      profile,
      checkIns,
      quests,
      questLogs,
      journals,
      focusSessions,
      lifeEvents,
      burnoutHistory,
      userEvents,
      insightState,
      userMemory,
      chatConversations,
      chatMessages,
      chatSignals,
    };

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="digital-twin-export-${new Date().toISOString().split('T')[0]}.json"`,
      },
    });
  } catch (error) {
    return serverError(error, 'Error exporting data');
  }
}

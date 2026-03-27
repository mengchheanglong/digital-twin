import mongoose from 'mongoose';
import { NextResponse } from 'next/server';
import { verifyTokenWithRevocation } from '@/lib/auth';
import { clamp } from '@/lib/math';
import dbConnect from '@/lib/db';
import ChatConversation from '@/lib/models/ChatConversation';
import ChatMessage from '@/lib/models/ChatMessage';
import ChatSignal from '@/lib/models/ChatSignal';

export const dynamic = 'force-dynamic';

function isObjectId(value: string): boolean {
  return mongoose.Types.ObjectId.isValid(value);
}

function shorten(text: string, maxLength: number): string {
  const normalized = String(text || '').trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, Math.max(0, maxLength - 1)).trim()}...`;
}

export async function GET(req: Request) {
  try {
    await dbConnect();

    const user = await verifyTokenWithRevocation(req);
    if (!user) {
      return NextResponse.json({ msg: 'No token, authorization denied.' }, { status: 401 });
    }

    const url = new URL(req.url);
    const chatId = String(url.searchParams.get('chatId') || '').trim();

    if (chatId) {
      if (!isObjectId(chatId)) {
        return NextResponse.json({ msg: 'Invalid chat id.' }, { status: 400 });
      }

      const conversation = await ChatConversation.findOne({ _id: chatId, userId: user.id })
        .select('_id title lastMessagePreview updatedAt messageCount')
        .lean();

      if (!conversation) {
        return NextResponse.json({ msg: 'Chat not found.' }, { status: 404 });
      }

      const limitParam = parseInt(url.searchParams.get('limit') || '50', 10);
      const limit = clamp(limitParam, 1, 100);
      const cursor = url.searchParams.get('cursor'); // timestamp string

      const query: any = { chatId, userId: user.id };
      if (cursor) {
        const cursorDate = new Date(cursor);
        if (!isNaN(cursorDate.getTime())) {
          query.createdAt = { $lt: cursorDate };
        }
      }

      const messagesRaw = await ChatMessage.find(query)
        .select('_id role content createdAt')
        .sort({ createdAt: -1 }) // Newest first
        .limit(limit + 1) // Fetch one extra to check for more
        .lean();

      const hasMore = messagesRaw.length > limit;
      const messagesSlice = hasMore ? messagesRaw.slice(0, limit) : messagesRaw;
      const nextCursor = messagesSlice.length > 0 ? messagesSlice[messagesSlice.length - 1].createdAt : null;

      // Reverse to return in chronological order
      const messages = messagesSlice.reverse();

      return NextResponse.json({
        chat: {
          id: String(conversation._id),
          title: String(conversation.title || 'New Conversation'),
          preview: String(conversation.lastMessagePreview || ''),
          updatedAt: new Date(conversation.updatedAt || Date.now()).toISOString(),
          messageCount: Number(conversation.messageCount || 0),
        },
        pagination: {
          nextCursor: nextCursor ? new Date(nextCursor).toISOString() : null,
          hasMore,
        },
        messages: messages
          .filter((message) => message.role === 'user' || message.role === 'ai')
          .map((message) => ({
            id: String(message._id),
            role: message.role,
            content: message.content,
            timestamp: new Date(message.createdAt || Date.now()).toISOString(),
          })),
      });
    }

    const conversations = await ChatConversation.find({ userId: user.id })
      .select('_id title lastMessagePreview updatedAt messageCount')
      .sort({ updatedAt: -1 })
      .limit(60)
      .lean();

    return NextResponse.json({
      chats: conversations.map((row) => ({
        id: String(row._id),
        title: shorten(String(row.title || 'New Conversation'), 44) || 'New Conversation',
        preview: shorten(String(row.lastMessagePreview || 'No messages yet.'), 88) || 'No messages yet.',
        updatedAt: new Date(row.updatedAt || Date.now()).toISOString(),
        messageCount: Number(row.messageCount || 0),
      })),
    });
  } catch (error) {
    console.error('Error fetching history:', error);
    return NextResponse.json({ msg: 'Server error.' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    await dbConnect();

    const user = await verifyTokenWithRevocation(req);
    if (!user) {
      return NextResponse.json({ msg: 'No token, authorization denied.' }, { status: 401 });
    }

    await Promise.all([
      ChatSignal.deleteMany({ userId: user.id }),
      ChatMessage.deleteMany({ userId: user.id }),
      ChatConversation.deleteMany({ userId: user.id }),
    ]);

    return NextResponse.json({ msg: 'Chat history cleared.' });
  } catch (error) {
    console.error('Error clearing history:', error);
    return NextResponse.json({ msg: 'Server error.' }, { status: 500 });
  }
}

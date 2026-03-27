import mongoose from 'mongoose';
import { NextResponse } from 'next/server';
import { verifyTokenWithRevocation } from '@/lib/auth';
import { CHAT_SIGNAL_TYPES, parseSignalResponseText } from '@/lib/chat-signals';
import dbConnect from '@/lib/db';
import { updateUserInsight } from '@/lib/insight-engine';
import ChatConversation from '@/lib/models/ChatConversation';
import ChatMessage from '@/lib/models/ChatMessage';
import ChatSignal from '@/lib/models/ChatSignal';
import UserInsightState from '@/lib/models/UserInsightState';
import UserEvent from '@/lib/models/UserEvent';
import { badRequest, unauthorized, notFound, serverError, errorResponse } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

interface SendPayload {
  message?: string;
  chatId?: string;
}

interface GeminiPart {
  text?: string;
}

interface GeminiContent {
  role?: 'user' | 'model';
  parts?: GeminiPart[];
}

interface GeminiResponse {
  candidates?: Array<{
    content?: GeminiContent;
    finishReason?: string;
  }>;
}

interface ConversationEntry {
  role: 'user' | 'ai';
  content: string;
}

interface GeminiGenerationResult {
  text: string;
  model: string;
  finishReason?: string;
}

function isObjectId(value: string): boolean {
  return mongoose.Types.ObjectId.isValid(value);
}

function shorten(value: string, maxLength: number): string {
  const normalized = String(value || '').trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, Math.max(0, maxLength - 1)).trim()}...`;
}

function uniqueValues(values: string[]): string[] {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const value of values) {
    const normalized = value.trim();
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    output.push(normalized);
  }
  return output;
}

function resolveModelCandidates(): string[] {
  const primary = String(process.env.GEMINI_MODEL || '').trim();
  const fromEnv = String(process.env.GEMINI_FALLBACK_MODELS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  return uniqueValues([
    primary,
    ...fromEnv,
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-flash-latest',
  ]);
}

function wordCount(text: string): number {
  return String(text || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function hasSentenceEnding(text: string): boolean {
  return /[.!?]["')\]]*$/.test(String(text || '').trim());
}

function isLikelyIncompleteReply(text: string, finishReason?: string): boolean {
  const normalized = String(text || '').trim();
  if (!normalized) {
    return true;
  }

  if (finishReason === 'MAX_TOKENS') {
    return true;
  }

  const words = wordCount(normalized);
  if (words < 8) {
    return true;
  }

  if (!hasSentenceEnding(normalized) && words < 45) {
    return true;
  }

  return false;
}

/**
 * Extract topic keywords from a message.
 * Returns the first 5 meaningful words as a simple topic representation.
 */
function extractTopic(message: string): string {
  const normalized = String(message || '').trim();
  if (!normalized) {
    return '';
  }

  // Remove common stop words
  const stopWords = new Set([
    'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare',
    'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her',
    'us', 'them', 'my', 'your', 'his', 'her', 'its', 'our', 'their',
    'this', 'that', 'these', 'those', 'what', 'which', 'who', 'whom',
    'when', 'where', 'why', 'how', 'all', 'each', 'every', 'both',
    'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not',
    'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'but',
    'and', 'or', 'if', 'because', 'as', 'until', 'while', 'of', 'at',
    'by', 'for', 'with', 'about', 'against', 'between', 'into', 'through',
    'during', 'before', 'after', 'above', 'below', 'to', 'from', 'up',
    'down', 'in', 'out', 'on', 'off', 'over', 'under', 'again', 'further',
    'then', 'once', 'here', 'there', 'all', 'any', 'both', 'each',
  ]);

  const words = normalized
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2 && !stopWords.has(word))
    .slice(0, 5);

  return words.join(' ');
}

async function requestGeminiContent(model: string, payload: unknown): Promise<{ text: string; finishReason?: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set.');
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${response.status} ${errorText}`);
  }

  const data = (await response.json()) as GeminiResponse;
  const primaryCandidate = data.candidates?.[0];
  const parts = data.candidates?.[0]?.content?.parts || [];
  const text = parts
    .map((part) => (typeof part.text === 'string' ? part.text : ''))
    .join('\n')
    .trim();

  if (!text) {
    throw new Error('Gemini API returned an empty response.');
  }

  return {
    text,
    finishReason: primaryCandidate?.finishReason,
  };
}

interface InsightData {
  topInterest: string;
  currentTrend: string;
  entertainmentRatio: number;
  lastReflection: string;
}

function buildCompanionPayload(userMessage: string, history: ConversationEntry[], insight?: InsightData | null) {
  const historyContents: GeminiContent[] = history
    .filter((message) => message.content.trim())
    .slice(-14)
    .map((message) => ({
      role: message.role === 'ai' ? 'model' : 'user',
      parts: [{ text: message.content }],
    }));

  // Build system prompt with optional insight section
  const systemPromptParts: string[] = [
    'You are the user\'s digital twin.',
    'You observe their behavior and give supportive, intelligent feedback.',
  ];

  // Add insight section if available
  if (insight) {
    const entertainmentPercent = Math.round(insight.entertainmentRatio * 100);
    systemPromptParts.push('');
    systemPromptParts.push('Current user insight:');
    systemPromptParts.push(`- Top interest: ${insight.topInterest || 'Not yet identified'}`);
    systemPromptParts.push(`- Productivity trend: ${insight.currentTrend || 'stable'}`);
    systemPromptParts.push(`- Entertainment ratio: ${entertainmentPercent}%`);
    systemPromptParts.push(`- Recent reflection: ${insight.lastReflection || 'None yet'}`);
    systemPromptParts.push('');
    systemPromptParts.push('Respond naturally. Occasionally reference these insights, but do not sound like a report or dashboard.');
  } else {
    // Default prompt without insight
    systemPromptParts.push('Be warm, clear, and action-oriented.');
    systemPromptParts.push('Help with focus, routines, stress regulation, and daily planning.');
  }

  systemPromptParts.push('');
  systemPromptParts.push('Use concrete steps, short checklists, and reflective follow-up questions when useful.');
  systemPromptParts.push('Do not fabricate personal history or claim capabilities you do not have.');
  systemPromptParts.push('Avoid medical diagnosis and legal or financial advice.');
  systemPromptParts.push('If the user sounds in crisis or unsafe, encourage contacting trusted support and local emergency services.');
  systemPromptParts.push('Keep responses concise: 2-5 short sentences unless the user explicitly asks for detail.');

  return {
    systemInstruction: {
      parts: [
        {
          text: systemPromptParts.join(' '),
        },
      ],
    },
    contents: [
      ...historyContents,
      {
        role: 'user',
        parts: [{ text: userMessage }],
      },
    ],
    generationConfig: {
      temperature: 0.7,
      topP: 0.9,
      maxOutputTokens: 560,
    },
  };
}

function buildRepairPayload(userMessage: string, draftReply: string) {
  return {
    systemInstruction: {
      parts: [
        {
          text: [
            'You rewrite an assistant draft so it is complete and readable.',
            'Output a polished response in 2-5 complete sentences.',
            'Do not output sentence fragments.',
            'Keep the meaning practical, calm, and supportive.',
          ].join(' '),
        },
      ],
    },
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: [
              'User message:',
              userMessage,
              '',
              'Draft reply that may be cut off:',
              draftReply,
              '',
              'Rewrite the reply as a complete response.',
            ].join('\n'),
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.35,
      topP: 0.9,
      maxOutputTokens: 360,
    },
  };
}

function buildSignalPayload(userMessage: string) {
  return {
    systemInstruction: {
      parts: [
        {
          text: [
            'Extract behavioral and emotional signals from the user message.',
            'Return only JSON with this exact shape:',
            '[{"signal_type":"stress","intensity":4,"confidence":0.92}]',
            `Allowed signal_type values: ${CHAT_SIGNAL_TYPES.join(', ')}.`,
            'Rules:',
            '1) intensity must be an integer from 1 to 5.',
            '2) confidence must be a number from 0 to 1.',
            '3) include at most 4 signals.',
            '4) return [] if no clear signal exists.',
            'Do not add markdown, explanation, or extra keys.',
          ].join(' '),
        },
      ],
    },
    contents: [
      {
        role: 'user',
        parts: [{ text: userMessage }],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      topP: 0.9,
      maxOutputTokens: 220,
    },
  };
}

async function tryGeminiWithFallback(payload: unknown, preferredModel?: string): Promise<GeminiGenerationResult> {
  const candidates = uniqueValues([preferredModel || '', ...resolveModelCandidates()]);
  const modelErrors: string[] = [];

  for (const model of candidates) {
    try {
      const result = await requestGeminiContent(model, payload);
      return { text: result.text, model, finishReason: result.finishReason };
    } catch (error) {
      const errorText = error instanceof Error ? error.message : String(error);
      modelErrors.push(`[${model}] ${errorText}`);
    }
  }

  throw new Error(`All Gemini model attempts failed. ${modelErrors.join(' | ')}`);
}

async function ensureReplyQuality(userMessage: string, replyResult: GeminiGenerationResult): Promise<GeminiGenerationResult> {
  if (!isLikelyIncompleteReply(replyResult.text, replyResult.finishReason)) {
    return replyResult;
  }

  try {
    const repaired = await tryGeminiWithFallback(buildRepairPayload(userMessage, replyResult.text), replyResult.model);
    if (!isLikelyIncompleteReply(repaired.text, repaired.finishReason)) {
      return repaired;
    }
    if (wordCount(repaired.text) > wordCount(replyResult.text)) {
      return repaired;
    }
    return replyResult;
  } catch {
    return replyResult;
  }
}

async function persistStructuredSignals(
  userId: string,
  messageId: string,
  userMessage: string,
  preferredModel?: string,
) {
  try {
    const extractionPayload = buildSignalPayload(userMessage);
    const extraction = await tryGeminiWithFallback(extractionPayload, preferredModel);
    const signals = parseSignalResponseText(extraction.text);

    if (!signals.length) {
      return [];
    }

    const timestamp = new Date();
    const messageObjectId = new mongoose.Types.ObjectId(messageId);
    await ChatSignal.bulkWrite(
      signals.map((signal) => ({
        updateOne: {
          filter: { messageId, signalType: signal.signalType },
          update: {
            $set: {
              userId,
              intensity: signal.intensity,
              confidence: signal.confidence,
              updatedAt: timestamp,
            },
            $setOnInsert: {
              messageId,
              signalType: signal.signalType,
              createdAt: timestamp,
            },
          },
          upsert: true,
        },
      })),
    );

    return signals;
  } catch (error) {
    console.error('Failed to persist structured chat signals:', error);
    return [];
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect();

    const user = await verifyTokenWithRevocation(req);
    if (!user) {
      return unauthorized('No token, authorization denied.');
    }

    const body = (await req.json()) as SendPayload;
    const message = String(body.message || '').trim();
    const requestedChatId = String(body.chatId || '').trim();

    if (!message) {
      return badRequest('Message is required.');
    }
    if (message.length > 4000) {
      return badRequest('Message is too long.');
    }

    let chatId = requestedChatId;

    if (chatId) {
      if (!isObjectId(chatId)) {
        return badRequest('Invalid chat id.');
      }

      const existingChat = await ChatConversation.findOne({ _id: chatId, userId: user.id }).select('_id').lean();
      if (!existingChat) {
        return notFound('Chat not found.');
      }
    } else {
      const created = await ChatConversation.create({
        userId: user.id,
        title: shorten(message, 44) || 'New Conversation',
        lastMessagePreview: shorten(message, 88),
        messageCount: 0,
      });

      chatId = String(created._id || '');
      if (!chatId) {
        return errorResponse('Unable to create conversation.', 500);
      }
    }

    const historyRows = !requestedChatId
      ? []
      : await ChatMessage.find({ chatId, userId: user.id })
          .select('role content')
          .sort({ createdAt: -1 })
          .limit(24)
          .lean();

    const history: ConversationEntry[] = [...historyRows]
      .reverse()
      .filter((entry) => entry.role === 'user' || entry.role === 'ai')
      .map((entry) => ({
        role: entry.role as 'user' | 'ai',
        content: String(entry.content || ''),
      }));

    // Fetch user's insight state for personalized context
    const insightState = await UserInsightState.findOne({ userId: user._id }).lean();
    const insightData: InsightData | null = insightState
      ? {
          topInterest: insightState.topInterest || '',
          currentTrend: insightState.currentTrend || 'stable',
          entertainmentRatio: insightState.entertainmentRatio || 0,
          lastReflection: insightState.lastReflection || '',
        }
      : null;

    let companionResult: GeminiGenerationResult;
    try {
      companionResult = await tryGeminiWithFallback(buildCompanionPayload(message, history, insightData));
      companionResult = await ensureReplyQuality(message, companionResult);
    } catch (llmError) {
      console.error('Gemini generation failed:', llmError);
      return errorResponse('AI service is temporarily unavailable. Please try again.', 502);
    }

    const userMessageTimestamp = new Date();
    const aiMessageTimestamp = new Date();

    const userMessageObjectId = new mongoose.Types.ObjectId();
    const userMessageId = String(userMessageObjectId);

    // Fire and forget signal extraction — capped at 20 extractions per user per day
    // to prevent runaway Gemini API usage.
    ChatSignal.countDocuments({
      userId: user.id,
      createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
    }).then((dailyCount) => {
      if (dailyCount < 20) {
        persistStructuredSignals(user.id, userMessageId, message, companionResult.model).catch((err) => {
          console.error('Background signal persistence failed:', err);
        });
      }
    }).catch(() => {
      // If count fails, still attempt extraction to avoid silent data loss
      persistStructuredSignals(user.id, userMessageId, message, companionResult.model).catch((err) => {
        console.error('Background signal persistence failed:', err);
      });
    });

    await Promise.all([
      ChatMessage.insertMany([
        {
          _id: userMessageObjectId,
          userId: user.id,
          chatId,
          role: 'user',
          content: message,
          createdAt: userMessageTimestamp,
          updatedAt: userMessageTimestamp,
        },
        {
          userId: user.id,
          chatId,
          role: 'ai',
          content: companionResult.text,
          createdAt: aiMessageTimestamp,
          updatedAt: aiMessageTimestamp,
        },
      ]),
      ChatConversation.findOneAndUpdate(
        { _id: chatId, userId: user.id },
        {
          $set: {
            updatedAt: aiMessageTimestamp,
            lastMessagePreview: shorten(companionResult.text || message, 88),
          },
          $inc: {
            messageCount: 2,
          },
        },
      ),
    ]);

    // Track chat message event (non-blocking)
    UserEvent.create({
      userId: user._id,
      type: 'chat_message',
      metadata: {
        topic: extractTopic(message),
      },
    }).catch((err) => console.error('Failed to create chat event:', err));

    // Update insights with force flag so the new chat message is always visible
    updateUserInsight(user._id.toString(), { force: true }).catch(console.error);

    const userMessage = {
      role: 'user' as const,
      content: message,
      timestamp: userMessageTimestamp,
    };

    const aiMessage = {
      role: 'ai' as const,
      content: companionResult.text,
      timestamp: aiMessageTimestamp,
    };

    return NextResponse.json({
      reply: aiMessage.content,
      messages: [userMessage, aiMessage],
      chatId,
      model: companionResult.model,
      extractedSignals: [],
    });
  } catch (error) {
    return serverError(error, 'Error sending message');
  }
}

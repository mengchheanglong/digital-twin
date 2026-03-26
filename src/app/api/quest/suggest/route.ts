import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { verifyToken } from '@/lib/auth';
import { unauthorized, serverError } from '@/lib/api-response';
import Quest from '@/lib/models/Quest';
import UserInsightState from '@/lib/models/UserInsightState';
import dbConnect from '@/lib/db';

export const dynamic = 'force-dynamic';

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
}

export interface QuestSuggestion {
  goal: string;
  duration: 'daily' | 'weekly' | 'monthly';
  reason: string;
}

const FALLBACK_SUGGESTIONS: QuestSuggestion[] = [
  {
    goal: 'Practice mindfulness for 10 minutes',
    duration: 'daily',
    reason: 'Builds mental clarity and reduces stress',
  },
  {
    goal: 'Read for 30 minutes before bed',
    duration: 'daily',
    reason: 'Improves knowledge and wind-down routine',
  },
  {
    goal: 'Plan and complete one meaningful weekly project',
    duration: 'weekly',
    reason: 'Drives long-term progress and focus',
  },
];

export async function GET(req: Request) {
  try {
    await dbConnect();

    const user = verifyToken(req);
    if (!user) return unauthorized();

    const uid = new mongoose.Types.ObjectId(user.id);

    const [recentQuests, insightState] = await Promise.all([
      Quest.find({ userId: uid })
        .select('goal duration completed')
        .sort({ date: -1 })
        .limit(10)
        .lean(),
      UserInsightState.findOne({ userId: uid })
        .select('topInterest currentTrend checkInDimensions')
        .lean(),
    ]);

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ suggestions: FALLBACK_SUGGESTIONS });
    }

    const questSummary = recentQuests
      .map(
        (q) =>
          `- ${q.goal} (${q.duration}, ${q.completed ? 'completed' : 'in progress'})`,
      )
      .join('\n');

    const weakestDim =
      insightState?.checkInDimensions
        ? Object.entries(
            insightState.checkInDimensions as Record<string, number>,
          ).sort((a, b) => a[1] - b[1])[0]?.[0]
        : null;

    const model = String(
      process.env.GEMINI_MODEL ?? 'gemini-2.0-flash',
    ).trim();

    const prompt = `Suggest 3 personalized quests for a user with these characteristics:
- Top interest: ${insightState?.topInterest ?? 'General'}
- Current trend: ${insightState?.currentTrend ?? 'stable'}
- Weakest wellness dimension: ${weakestDim ?? 'focus'}
- Recent quests:
${questSummary || '(none yet)'}

Return ONLY a JSON array with this exact shape:
[{"goal": "Quest title", "duration": "daily|weekly|monthly", "reason": "Why this helps"}]
Keep goals under 60 characters. Do not suggest quests already listed above.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.8, maxOutputTokens: 400 },
        }),
      },
    );

    if (!response.ok) {
      return NextResponse.json({ suggestions: FALLBACK_SUGGESTIONS });
    }

    const data = (await response.json()) as GeminiResponse;
    const text =
      data.candidates?.[0]?.content?.parts
        ?.map((p) => p.text ?? '')
        .join('')
        .trim() ?? '[]';

    const clean = text
      .replace(/```(?:json)?\n?/g, '')
      .replace(/```/g, '')
      .trim();

    let suggestions: QuestSuggestion[] = [];
    try {
      const parsed: unknown = JSON.parse(clean);
      if (Array.isArray(parsed)) {
        suggestions = parsed
          .filter(
            (s): s is QuestSuggestion =>
              typeof s === 'object' &&
              s !== null &&
              typeof (s as QuestSuggestion).goal === 'string' &&
              typeof (s as QuestSuggestion).duration === 'string',
          )
          .slice(0, 3);
      }
    } catch {
      suggestions = FALLBACK_SUGGESTIONS;
    }

    if (suggestions.length === 0) suggestions = FALLBACK_SUGGESTIONS;

    return NextResponse.json({ suggestions });
  } catch (error) {
    return serverError(error, 'Error generating suggestions');
  }
}

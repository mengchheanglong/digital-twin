import mongoose from 'mongoose';
import CheckIn from './models/CheckIn';
import Quest from './models/Quest';
import UserInsightState from './models/UserInsightState';
import { computeBurnoutRisk } from './analytics/burnout';
import { computeMoodPatterns } from './analytics/mood-patterns';
import dbConnect from './db';

export interface PlannedActivity {
  day: string;
  suggestion: string;
  rationale: string;
  type: 'quest' | 'rest' | 'social' | 'focus' | 'reflection';
}

export interface WeeklyPlan {
  weekStarting: string;
  overallTheme: string;
  burnoutRisk: string;
  topPriorityQuests: string[];
  dailySuggestions: PlannedActivity[];
  recoveryProtocol: string | null;
  narrative: string;
  generatedAt: Date;
}

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function nextMonday(): Date {
  const d = new Date();
  const dow = d.getDay();
  const daysToAdd = dow === 0 ? 1 : 8 - dow;
  d.setDate(d.getDate() + daysToAdd);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

async function generateWithGemini(prompt: string): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  const model = String(process.env.GEMINI_MODEL || 'gemini-2.0-flash').trim();

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: 'You are a caring personal wellness coach. Be concise, specific, and actionable. Always reply with valid JSON only.' }],
          },
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.5, maxOutputTokens: 1200 },
        }),
      },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as GeminiResponse;
    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
    return text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  } catch {
    return null;
  }
}

export async function generateWeeklyPlan(userId: string): Promise<WeeklyPlan> {
  await dbConnect();

  const uid = new mongoose.Types.ObjectId(userId);
  const now = new Date();
  const weekStart = nextMonday();

  const [burnout, moodPatterns, insightState, activeQuests, recentCheckIns] = await Promise.all([
    computeBurnoutRisk(userId),
    computeMoodPatterns(userId, 30),
    UserInsightState.findOne({ userId: uid }).lean(),
    Quest.find({ userId: uid, completed: false })
      .select('goal duration progress')
      .limit(20)
      .lean(),
    CheckIn.find({ userId: uid, date: { $gte: new Date(now.getTime() - 7 * 86400000) }, checkInType: { $ne: 'micro' } })
      .select('percentage date')
      .sort({ date: -1 })
      .lean(),
  ]);

  const avgWellness =
    recentCheckIns.length > 0
      ? Math.round(recentCheckIns.reduce((s, c) => s + (c.percentage as number), 0) / recentCheckIns.length)
      : null;

  const questList = activeQuests
    .map((q) => `"${String(q.goal)}" (${String(q.duration)}, ${q.progress ?? 0}% done)`)
    .join('\n');

  const prompt = `Generate a personalized wellness week plan as JSON.
Schema:
{
  "overallTheme": "one-line theme for the week",
  "topPriorityQuests": ["quest1", "quest2", "quest3"],
  "dailySuggestions": [
    {"day": "Monday", "suggestion": "...", "rationale": "...", "type": "quest|rest|social|focus|reflection"},
    ...7 days...
  ],
  "recoveryProtocol": "string or null if burnout is low",
  "narrative": "2-3 sentence encouraging week overview"
}

User context:
- Week starting: ${formatDate(weekStart)}
- Burnout risk: ${burnout.riskLevel} (${burnout.riskScore}/100)
- Avg wellness this week: ${avgWellness ?? 'no data'}%
- Mood trend (30d): ${moodPatterns.trend}
- Best day of week: ${moodPatterns.bestDay.dayName}
- Weakest dimension: ${moodPatterns.weakestDimension}
- Strongest dimension: ${moodPatterns.strongestDimension}
- Top interest: ${insightState?.topInterest ?? 'General'}
- Current productivity score: ${insightState?.productivityScore ?? 'n/a'}
- Active quests:
${questList || 'No active quests'}

Return ONLY valid JSON, no markdown.`;

  const raw = await generateWithGemini(prompt);
  let parsed: Partial<WeeklyPlan> = {};
  if (raw) {
    try {
      parsed = JSON.parse(raw) as Partial<WeeklyPlan>;
    } catch {
      // Fallback to static plan
    }
  }

  // Fill in any missing fields with sensible defaults
  const fallbackDays = DAY_NAMES.slice(1, 6).concat(['Saturday', 'Sunday']);
  const dailySuggestions: PlannedActivity[] =
    Array.isArray(parsed.dailySuggestions) && parsed.dailySuggestions.length === 7
      ? parsed.dailySuggestions
      : fallbackDays.map((day) => ({
          day,
          suggestion:
            burnout.riskLevel === 'high' || burnout.riskLevel === 'critical'
              ? 'Focus on a single small task and rest.'
              : 'Complete one meaningful quest and do a quick check-in.',
          rationale: 'Maintain consistent daily habits for steady improvement.',
          type: 'quest' as const,
        }));

  return {
    weekStarting: formatDate(weekStart),
    overallTheme: String(parsed.overallTheme || `${burnout.riskLevel === 'high' || burnout.riskLevel === 'critical' ? 'Recovery' : 'Growth'} Week`),
    burnoutRisk: burnout.riskLevel,
    topPriorityQuests: Array.isArray(parsed.topPriorityQuests)
      ? parsed.topPriorityQuests.slice(0, 3)
      : activeQuests.slice(0, 3).map((q) => String(q.goal)),
    dailySuggestions,
    recoveryProtocol:
      burnout.riskLevel === 'high' || burnout.riskLevel === 'critical'
        ? (String(parsed.recoveryProtocol || burnout.recommendations[0] || 'Take meaningful rest this week.'))
        : null,
    narrative: String(parsed.narrative || 'A fresh week is a fresh start. Focus on one thing at a time and trust the process.'),
    generatedAt: new Date(),
  };
}

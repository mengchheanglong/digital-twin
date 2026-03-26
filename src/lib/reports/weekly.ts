import mongoose from 'mongoose';
import CheckIn from '../models/CheckIn';
import Quest from '../models/Quest';
import JournalEntry from '../models/JournalEntry';
import FocusSession from '../models/FocusSession';
import UserInsightState from '../models/UserInsightState';
import dbConnect from '../db';

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
}

export interface WeeklyStats {
  checkInsLogged: number;
  averageWellness: number;
  questsCompleted: number;
  questsTotal: number;
  journalEntriesWritten: number;
  focusSessionsCompleted: number;
  totalFocusMinutes: number;
  mostProductiveDay: string;
  topInterest: string;
  trend: string;
}

export interface WeeklyReport {
  weekStart: Date;
  weekEnd: Date;
  stats: WeeklyStats;
  aiSummary: string;
}

const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

async function generateWeeklySummary(stats: WeeklyStats): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return 'Weekly report generated. Keep building your momentum!';
  }

  const prompt = `Write a 3-sentence weekly summary for a user with these stats:
- Check-ins logged: ${stats.checkInsLogged}/7
- Average wellness: ${stats.averageWellness.toFixed(0)}%
- Quests completed: ${stats.questsCompleted}/${stats.questsTotal}
- Journal entries: ${stats.journalEntriesWritten}
- Focus sessions: ${stats.focusSessionsCompleted} (${stats.totalFocusMinutes} total minutes)
- Most productive day: ${stats.mostProductiveDay || 'Not determined'}
- Top interest: ${stats.topInterest}
- Trend: ${stats.trend}
Be encouraging, specific, and suggest one actionable improvement for next week.`;

  try {
    const model = String(
      process.env.GEMINI_MODEL || 'gemini-2.0-flash',
    ).trim();
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            { role: 'user', parts: [{ text: prompt }] },
          ],
          generationConfig: { temperature: 0.7, maxOutputTokens: 250 },
        }),
      },
    );

    if (!response.ok)
      return 'Weekly report compiled. Review your stats to plan next week!';

    const data = (await response.json()) as GeminiResponse;
    return (
      data.candidates?.[0]?.content?.parts
        ?.map((p) => p.text ?? '')
        .join('\n')
        .trim() || 'Another week tracked. Keep building your momentum!'
    );
  } catch {
    return 'Weekly summary generated. Keep up the great work!';
  }
}

export async function generateWeeklyReport(
  userId: string,
): Promise<WeeklyReport> {
  await dbConnect();

  const now = new Date();
  const weekEnd = new Date(now);
  weekEnd.setHours(23, 59, 59, 999);

  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - 6);
  weekStart.setHours(0, 0, 0, 0);

  const uid = new mongoose.Types.ObjectId(userId);

  const [checkIns, quests, journals, focusSessions, insightState] =
    await Promise.all([
      CheckIn.find({ userId: uid, date: { $gte: weekStart } })
        .select('percentage date')
        .lean(),
      Quest.find({ userId: uid, date: { $gte: weekStart } })
        .select('completed completedDate')
        .lean(),
      JournalEntry.find({ userId: uid, date: { $gte: weekStart } })
        .select('date')
        .lean(),
      FocusSession.find({
        userId: uid,
        startedAt: { $gte: weekStart },
        completed: true,
      })
        .select('durationMinutes elapsedMinutes')
        .lean(),
      UserInsightState.findOne({ userId: uid })
        .select('topInterest currentTrend')
        .lean(),
    ]);

  const averageWellness = checkIns.length
    ? Math.round(
        checkIns.reduce((sum, c) => sum + c.percentage, 0) /
          checkIns.length,
      )
    : 0;

  const questsCompleted = quests.filter((q) => q.completed).length;

  // Find most active day by counting events per day
  const dayActivity: Record<number, number> = {};
  for (const item of [
    ...checkIns,
    ...quests.filter((q) => q.completed),
  ]) {
    const d =
      (item as { date?: Date }).date ??
      (item as { completedDate?: Date }).completedDate;
    if (d) {
      const day = new Date(d).getDay();
      dayActivity[day] = (dayActivity[day] ?? 0) + 1;
    }
  }

  const topDayEntry = Object.entries(dayActivity).sort(
    (a, b) => b[1] - a[1],
  )[0];
  const mostProductiveDay =
    topDayEntry !== undefined ? DAY_NAMES[Number(topDayEntry[0])] : '';

  const totalFocusMinutes = focusSessions.reduce(
    (sum, s) => sum + (s.elapsedMinutes ?? s.durationMinutes),
    0,
  );

  const stats: WeeklyStats = {
    checkInsLogged: checkIns.length,
    averageWellness,
    questsCompleted,
    questsTotal: quests.length,
    journalEntriesWritten: journals.length,
    focusSessionsCompleted: focusSessions.length,
    totalFocusMinutes,
    mostProductiveDay,
    topInterest: insightState?.topInterest ?? 'General',
    trend: insightState?.currentTrend ?? 'stable',
  };

  const aiSummary = await generateWeeklySummary(stats);

  return { weekStart, weekEnd, stats, aiSummary };
}

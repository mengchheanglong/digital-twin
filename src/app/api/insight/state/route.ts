import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { verifyTokenWithRevocation } from '@/lib/auth';
import { unauthorized, serverError } from '@/lib/api-response';
import { getDayKey } from '@/lib/progression';
import CheckIn from '@/lib/models/CheckIn';
import UserEvent from '@/lib/models/UserEvent';
import UserInsightState from '@/lib/models/UserInsightState';
import { updateUserInsight } from '@/lib/insight-engine';

export const dynamic = 'force-dynamic';

interface DailyEventPayload {
  type?: string;
  metadata?: {
    category?: string;
    topic?: string;
  };
}

function normalizeTheme(input: string): string {
  const normalized = String(input || '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');
  if (!normalized) {
    return '';
  }
  return normalized.length > 40 ? normalized.slice(0, 40).trim() : normalized;
}

function toTitleCase(input: string): string {
  return String(input || '')
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function pickMainTheme(events: DailyEventPayload[], fallback: string): string {
  const counts: Record<string, number> = {};

  for (const event of events) {
    const candidates = [event.metadata?.topic, event.metadata?.category];
    for (const candidate of candidates) {
      const normalized = normalizeTheme(String(candidate || ''));
      if (!normalized) {
        continue;
      }
      counts[normalized] = (counts[normalized] || 0) + 1;
    }
  }

  const ranked = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (ranked.length > 0) {
    return toTitleCase(ranked[0][0]);
  }

  const normalizedFallback = normalizeTheme(fallback);
  return normalizedFallback ? toTitleCase(normalizedFallback) : 'General';
}

function buildTodaySummary(input: {
  isComplete: boolean;
  activityCount: number;
  mainTheme: string;
}): string {
  const { isComplete, activityCount, mainTheme } = input;

  if (isComplete) {
    if (activityCount > 0) {
      const activityLabel = activityCount === 1 ? 'activity' : 'activities';
      return `You logged ${activityCount} ${activityLabel} today. Main theme: ${mainTheme}.`;
    }
    return `Your twin has processed today's activity. Main theme: ${mainTheme}.`;
  }
  return "Your twin hasn't seen today's activity yet. Log your day to reveal today's insight.";
}

export async function GET(req: Request) {
  try {
    await dbConnect();

    // Step 1: Authenticate user
    const user = await verifyTokenWithRevocation(req);
    if (!user) {
      return unauthorized();
    }

    // Step 2: Fetch UserInsightState for user
    let insightState = await UserInsightState.findOne({
      userId: user.id,
    }).lean();

    // Step 3: If not found, call updateUserInsight to create initial state
    if (!insightState) {
      await updateUserInsight(user.id);
      
      // Fetch the newly created state
      insightState = await UserInsightState.findOne({
        userId: user.id,
      }).lean();
    }

    const now = new Date();
    const dayKey = getDayKey(now);
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    const [todayCheckIn, rawTodayEvents] = await Promise.all([
      CheckIn.findOne({
        userId: user.id,
        dayKey,
      })
        .select('_id')
        .lean(),
      UserEvent.find({
        userId: user.id,
        createdAt: { $gte: startOfDay, $lt: endOfDay },
      })
        .select('type metadata')
        .lean(),
    ]);

    const todayEvents = (rawTodayEvents as DailyEventPayload[]).filter(
      (event) => event.type !== 'chat_message'
    );
    const mainTheme = pickMainTheme(todayEvents, insightState?.topInterest || '');
    const activityCount = todayEvents.length;
    const isComplete = Boolean(todayCheckIn);
    const today = {
      isComplete,
      activityCount,
      mainTheme,
      summary: buildTodaySummary({
        isComplete,
        activityCount,
        mainTheme,
      }),
    };

    // Step 4: Return insight state
    if (!insightState) {
      // This should not happen, but handle gracefully
      return NextResponse.json({
        success: true,
        insight: {
          topInterest: 'General',
          productivityScore: 0,
          entertainmentRatio: 0,
          currentTrend: 'stable',
          lastReflection: 'Start tracking your activities to get personalized insights!',
          updatedAt: new Date(),
          today,
        },
      });
    }

    return NextResponse.json({
      success: true,
      insight: {
        topInterest: insightState.topInterest,
        productivityScore: insightState.productivityScore,
        entertainmentRatio: insightState.entertainmentRatio,
        currentTrend: insightState.currentTrend,
        lastReflection: insightState.lastReflection,
        updatedAt: insightState.updatedAt,
        today,
      },
    });
  } catch (error) {
    return serverError(error, 'Fetch insight state error');
  }
}

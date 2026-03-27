import mongoose from 'mongoose';
import UserEvent, { IUserEvent } from './models/UserEvent';
import CheckIn from './models/CheckIn';
import UserInsightState from './models/UserInsightState';
import dbConnect from './db';
import { CHECKIN_DIMENSIONS } from './progression';

// Category classifications for productivity calculation
const PRODUCTIVE_CATEGORIES = [
  'work',
  'study',
  'exercise',
  'health',
  'learning',
  'reading',
  'coding',
  'writing',
  'project',
  'career',
  'finance',
  'planning',
  'checkin',
];

const ENTERTAINMENT_CATEGORIES = [
  'entertainment',
  'gaming',
  'social media',
  'streaming',
  'youtube',
  'netflix',
  'movies',
  'tv',
  'music',
  'browsing',
  'leisure',
];

export interface InsightData {
  topInterest: string;
  productivityScore: number;
  entertainmentRatio: number;
  trend: 'rising' | 'stable' | 'dropping';
}

export interface CheckInDimensions {
  energy: number;
  focus: number;
  stressControl: number;
  socialConnection: number;
  optimism: number;
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
}

/**
 * Get events from last N days for a user
 */
async function getRecentEvents(userId: string, days: number): Promise<IUserEvent[]> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  cutoffDate.setHours(0, 0, 0, 0);

  const events = await UserEvent.find({
    userId: new mongoose.Types.ObjectId(userId),
    createdAt: { $gte: cutoffDate },
  })
    .sort({ createdAt: 1 })
    .lean();

  return events as IUserEvent[];
}

/**
 * Calculate productivity score from events.
 *
 * Scoring:
 *   quest_completed            = +2
 *   log_added with productive  = +1
 *   log_added with checkin     = +0.5  (daily self-reflection counts)
 *   log_added with entertain.  = -1
 *
 * The raw score is normalised against the expected max for the window
 * (2 events/day × days) so that an active user scores near 100.
 */
function calculateProductivityScore(events: IUserEvent[], days = 7): number {
  let score = 0;

  for (const event of events) {
    if (event.type === 'quest_completed') {
      score += 2;
    } else if (event.type === 'log_added') {
      const category = (event.metadata?.category || '').toLowerCase();
      if (category === 'checkin') {
        score += 0.5;
      } else if (PRODUCTIVE_CATEGORIES.some((c) => category.includes(c))) {
        score += 1;
      } else if (ENTERTAINMENT_CATEGORIES.some((c) => category.includes(c))) {
        score -= 1;
      }
    }
  }

  // Normalise: expected max ≈ 2 events/day with full productive score
  const expectedMax = days * 2;
  const normalizedScore = Math.max(0, Math.min(100, (score / expectedMax) * 100));
  return Math.round(normalizedScore * 10) / 10;
}

/**
 * Calculate entertainment ratio (entertainment_time / total_time)
 */
function calculateEntertainmentRatio(events: IUserEvent[]): number {
  let entertainmentTime = 0;
  let totalTime = 0;

  for (const event of events) {
    const duration = event.metadata?.duration || 0;
    if (duration > 0) {
      totalTime += duration;
      const category = (event.metadata?.category || '').toLowerCase();
      if (ENTERTAINMENT_CATEGORIES.some((c) => category.includes(c))) {
        entertainmentTime += duration;
      }
    }
  }

  if (totalTime === 0) {
    return 0;
  }

  return Math.round((entertainmentTime / totalTime) * 100) / 100;
}

/**
 * Find most frequent interest from events
 */
function findTopInterest(events: IUserEvent[]): string {
  const interestCounts: Record<string, number> = {};

  for (const event of events) {
    // Collect interests from category and topic
    const interests: string[] = [];
    if (event.metadata?.category && event.metadata.category !== 'checkin') {
      interests.push(event.metadata.category);
    }
    if (event.metadata?.topic) {
      interests.push(event.metadata.topic);
    }

    for (const interest of interests) {
      const normalized = interest.toLowerCase().trim();
      if (normalized) {
        interestCounts[normalized] = (interestCounts[normalized] || 0) + 1;
      }
    }
  }

  // Find the most frequent interest
  let topInterest = '';
  let maxCount = 0;

  for (const [interest, count] of Object.entries(interestCounts)) {
    if (count > maxCount) {
      maxCount = count;
      topInterest = interest;
    }
  }

  // Capitalize first letter for display
  return topInterest ? topInterest.charAt(0).toUpperCase() + topInterest.slice(1) : 'General';
}

/**
 * Calculate productivity score for a specific day
 */
function calculateDailyProductivityScore(events: IUserEvent[], date: Date): number {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const dayEvents = events.filter((e) => {
    const eventDate = new Date(e.createdAt);
    return eventDate >= startOfDay && eventDate <= endOfDay;
  });

  return calculateProductivityScore(dayEvents, 1);
}

/**
 * Determine trend direction by comparing last 2 days' productivity scores
 */
function calculateTrend(events: IUserEvent[]): 'rising' | 'stable' | 'dropping' {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const todayScore = calculateDailyProductivityScore(events, today);
  const yesterdayScore = calculateDailyProductivityScore(events, yesterday);

  // Handle edge cases
  if (yesterdayScore === 0) {
    if (todayScore > 0) {
      return 'rising';
    }
    return 'stable';
  }

  const changeRatio = (todayScore - yesterdayScore) / yesterdayScore;

  if (changeRatio >= 0.2) {
    return 'rising';
  } else if (changeRatio <= -0.2) {
    return 'dropping';
  }

  return 'stable';
}

/**
 * Compute average check-in scores per dimension from the last 7 days.
 * Uses CHECKIN_DIMENSIONS to map indices — never positional guesswork.
 */
async function computeCheckInDimensions(userId: string): Promise<CheckInDimensions | null> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 7);
  cutoffDate.setHours(0, 0, 0, 0);

  const recentCheckIns = await CheckIn.find({
    userId: new mongoose.Types.ObjectId(userId),
    date: { $gte: cutoffDate },
  })
    .select('ratings')
    .lean();

  if (!recentCheckIns.length) {
    return null;
  }

  const sums = [0, 0, 0, 0, 0];
  let count = 0;

  for (const checkIn of recentCheckIns) {
    if (Array.isArray(checkIn.ratings) && checkIn.ratings.length === CHECKIN_DIMENSIONS.length) {
      for (let i = 0; i < CHECKIN_DIMENSIONS.length; i++) {
        sums[i] += checkIn.ratings[i];
      }
      count++;
    }
  }

  if (!count) {
    return null;
  }

  return {
    energy: Math.round((sums[0] / count) * 10) / 10,
    focus: Math.round((sums[1] / count) * 10) / 10,
    stressControl: Math.round((sums[2] / count) * 10) / 10,
    socialConnection: Math.round((sums[3] / count) * 10) / 10,
    optimism: Math.round((sums[4] / count) * 10) / 10,
  };
}

/**
 * Generate reflection using Gemini AI
 */
async function generateReflection(insights: InsightData, dimensions?: CheckInDimensions | null): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return 'Your twin is waiting for more daily signals before sharing a full reflection.';
  }

  const dimensionLines = dimensions
    ? [
        `- Avg energy (7d): ${dimensions.energy}/5`,
        `- Avg focus (7d): ${dimensions.focus}/5`,
        `- Avg stress control (7d): ${dimensions.stressControl}/5`,
        `- Avg social connection (7d): ${dimensions.socialConnection}/5`,
        `- Avg optimism (7d): ${dimensions.optimism}/5`,
      ].join('\n')
    : '';

  const prompt = `Generate a 3-sentence daily reflection based on:
- Top interest: ${insights.topInterest}
- Productivity score: ${insights.productivityScore}/100
- Entertainment ratio: ${Math.round(insights.entertainmentRatio * 100)}%
- Trend: ${insights.trend}
${dimensionLines ? `${dimensionLines}\n` : ''}
Keep it encouraging and personal. Be specific about their interests and progress.`;

  const model = String(process.env.GEMINI_MODEL || 'gemini-2.0-flash').trim();

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [
              {
                text: 'You are a supportive digital twin that provides personalized daily reflections. Keep responses to exactly 3 sentences. Be encouraging but honest.',
              },
            ],
          },
          contents: [
            {
              role: 'user',
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            topP: 0.9,
            maxOutputTokens: 200,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      return "Your twin is processing today's pattern. Reflection will appear shortly.";
    }

    const data = (await response.json()) as GeminiResponse;
    const text = data.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || '')
      .join('\n')
      .trim();

    return text || "Your twin is still tracing today's pattern. Add a little more activity to sharpen the reflection.";
  } catch (error) {
    console.error('Failed to generate reflection:', error);
    return "Your twin couldn't complete today's reflection yet. Check back after your next activity.";
  }
}

export interface UpdateInsightOptions {
  /**
   * When true, bypass the 30-minute cache window and force an immediate
   * update. Use this after a check-in submission or quest completion so the
   * new data is always reflected in the next insight read.
   */
  force?: boolean;
}

/**
 * Main function: Update user insight state
 * 1. Fetch last 7 days of events
 * 2. Compute insights (top interest, productivity score, entertainment ratio, trend)
 * 3. Generate AI reflection
 * 4. Save/update UserInsightState
 *
 * Skips the full update (including the Gemini AI call) if the state was
 * refreshed within the last 30 minutes, unless `force` is true.
 *
 * The cache check is performed atomically: we only proceed if we can
 * claim the update slot, preventing redundant concurrent Gemini calls.
 */
export async function updateUserInsight(
  userId: string,
  options: UpdateInsightOptions = {},
): Promise<InsightData | null> {
  await dbConnect();

  try {
    const CACHE_WINDOW_MS = 30 * 60 * 1000; // 30 minutes
    const now = new Date();
    const cacheThreshold = new Date(now.getTime() - CACHE_WINDOW_MS);

    if (!options.force) {
      // Atomic cache check: only proceed if updatedAt is stale (or missing).
      // We speculatively set updatedAt=now so concurrent callers see the
      // window as taken and skip their update.
      const claimed = await UserInsightState.findOneAndUpdate(
        {
          userId: new mongoose.Types.ObjectId(userId),
          $or: [
            { updatedAt: { $lt: cacheThreshold } },
            { updatedAt: { $exists: false } },
          ],
        },
        { $set: { updatedAt: now } },
        { new: false },
      ).lean();

      // If nothing was found, another process recently updated — skip.
      if (!claimed) {
        // Check if a document exists at all; if not, fall through to create.
        const exists = await UserInsightState.exists({
          userId: new mongoose.Types.ObjectId(userId),
        });
        if (exists) {
          return null;
        }
      }
    }

    // Step 1: Fetch last 7 days of events and check-in dimensions in parallel
    const [events, checkInDimensions] = await Promise.all([
      getRecentEvents(userId, 7),
      computeCheckInDimensions(userId),
    ]);

    // Step 2: Compute insights
    const topInterest = findTopInterest(events);
    const productivityScore = calculateProductivityScore(events, 7);
    const entertainmentRatio = calculateEntertainmentRatio(events);
    const trend = calculateTrend(events);

    const insights: InsightData = {
      topInterest,
      productivityScore,
      entertainmentRatio,
      trend,
    };

    // Step 3: Generate reflection using AI (including check-in dimensions)
    const reflection = await generateReflection(insights, checkInDimensions);

    const reflectionEntry = { text: reflection, date: now };

    // Step 4: Save/update UserInsightState, appending to history (max 30 entries)
    await UserInsightState.findOneAndUpdate(
      { userId: new mongoose.Types.ObjectId(userId) },
      {
        $set: {
          topInterest,
          productivityScore,
          entertainmentRatio,
          currentTrend: trend,
          lastReflection: reflection,
          ...(checkInDimensions ? { checkInDimensions } : {}),
          updatedAt: now,
        },
        $push: {
          reflectionHistory: {
            $each: [reflectionEntry],
            $slice: -30, // keep the most recent 30
          },
        },
      },
      { upsert: true, new: true }
    );

    return insights;
  } catch (error) {
    console.error('Failed to update user insight:', error);
    return null;
  }
}

// Export helper functions for testing and external use
export {
  getRecentEvents,
  calculateProductivityScore,
  calculateEntertainmentRatio,
  findTopInterest,
  calculateTrend,
  generateReflection,
  computeCheckInDimensions,
};

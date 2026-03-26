import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import CheckIn from '@/lib/models/CheckIn';
import { unauthorized, serverError } from '@/lib/api-response';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
}

export interface PatternInsight {
  id: string;
  title: string;
  description: string;
  type: 'strength' | 'opportunity' | 'pattern' | 'warning';
  dimension?: string;
}

export interface TimelineInsightsResponse {
  insights: PatternInsight[];
  generatedAt: string;
}

const DIMENSION_NAMES = ['Energy', 'Focus', 'Stress Control', 'Social Connection', 'Optimism'];

async function generatePatternInsights(
  checkIns: Array<{ date: Date; ratings: number[]; percentage: number; dayKey: string }>
): Promise<PatternInsight[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || checkIns.length < 5) {
    return getFallbackInsights(checkIns);
  }

  // Build a compact summary for the prompt
  const recentCheckIns = checkIns.slice(-30); // last 30 for prompt brevity

  const dimensionAverages = DIMENSION_NAMES.map((name, idx) => {
    const vals = recentCheckIns.map((c) => c.ratings[idx] ?? 0).filter((v) => v > 0);
    const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    return `${name}: ${avg.toFixed(1)}/5`;
  }).join(', ');

  // Day-of-week averages
  const dowTotals: number[] = new Array(7).fill(0);
  const dowCounts: number[] = new Array(7).fill(0);
  for (const c of recentCheckIns) {
    const dow = new Date(c.dayKey).getDay();
    dowTotals[dow] += c.percentage;
    dowCounts[dow]++;
  }
  const dowNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dowSummary = dowNames
    .map((n, i) => `${n}: ${dowCounts[i] ? Math.round(dowTotals[i] / dowCounts[i]) : 'n/a'}%`)
    .join(', ');

  // Trend over last 30 days
  const firstHalf = recentCheckIns.slice(0, 15);
  const secondHalf = recentCheckIns.slice(15);
  const avgFirst = firstHalf.length
    ? firstHalf.reduce((a, c) => a + c.percentage, 0) / firstHalf.length
    : 0;
  const avgSecond = secondHalf.length
    ? secondHalf.reduce((a, c) => a + c.percentage, 0) / secondHalf.length
    : 0;
  const trendStr = avgSecond > avgFirst + 5 ? 'improving' : avgSecond < avgFirst - 5 ? 'declining' : 'stable';

  const prompt = `Analyze this person's wellness check-in data and return exactly 3 pattern insights as JSON.

Data:
- Total check-ins analyzed: ${recentCheckIns.length} (out of last 30 days)
- 30-day averages by dimension: ${dimensionAverages}
- Average wellness by day of week: ${dowSummary}
- Overall 30-day trend: ${trendStr} (first-half avg ${Math.round(avgFirst)}% → second-half avg ${Math.round(avgSecond)}%)

Return a JSON array of exactly 3 objects. Each object must have:
- "id": unique string like "insight-1"
- "title": short title (3-6 words)
- "description": one sentence of actionable observation
- "type": one of "strength", "opportunity", "pattern", "warning"
- "dimension": (optional) one of: Energy, Focus, Stress Control, Social Connection, Optimism

Respond ONLY with valid JSON, no markdown, no explanation.`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.4, maxOutputTokens: 512 },
        }),
      }
    );

    if (!response.ok) return getFallbackInsights(checkIns);

    const data = (await response.json()) as GeminiResponse;
    const raw = data.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('').trim() ?? '';

    // Strip possible ```json ``` wrappers
    const jsonStr = raw.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
    const parsed = JSON.parse(jsonStr) as PatternInsight[];

    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.slice(0, 3).map((p, i) => ({
        id: typeof p.id === 'string' ? p.id : `insight-${i + 1}`,
        title: typeof p.title === 'string' ? p.title : 'Pattern detected',
        description: typeof p.description === 'string' ? p.description : '',
        type: (['strength', 'opportunity', 'pattern', 'warning'] as const).includes(p.type as never)
          ? p.type
          : 'pattern',
        ...(typeof p.dimension === 'string' ? { dimension: p.dimension } : {}),
      }));
    }

    return getFallbackInsights(checkIns);
  } catch {
    return getFallbackInsights(checkIns);
  }
}

function getFallbackInsights(
  checkIns: Array<{ ratings: number[]; percentage: number; dayKey: string }>
): PatternInsight[] {
  const insights: PatternInsight[] = [];

  if (checkIns.length === 0) {
    return [
      {
        id: 'insight-1',
        title: 'Start your journey',
        description: 'Complete your first check-in to unlock personalized pattern insights.',
        type: 'opportunity',
      },
    ];
  }

  // Find strongest dimension
  const dimSums = [0, 0, 0, 0, 0];
  let count = 0;
  for (const c of checkIns) {
    if (c.ratings.length === 5) {
      for (let i = 0; i < 5; i++) dimSums[i] += c.ratings[i];
      count++;
    }
  }
  if (count > 0) {
    const dimAvgs = dimSums.map((s) => s / count);
    const maxIdx = dimAvgs.indexOf(Math.max(...dimAvgs));
    const minIdx = dimAvgs.indexOf(Math.min(...dimAvgs));
    insights.push({
      id: 'insight-1',
      title: `Strong ${DIMENSION_NAMES[maxIdx]}`,
      description: `Your ${DIMENSION_NAMES[maxIdx].toLowerCase()} scores are consistently your highest dimension—keep leveraging this strength.`,
      type: 'strength',
      dimension: DIMENSION_NAMES[maxIdx],
    });
    insights.push({
      id: 'insight-2',
      title: `Grow your ${DIMENSION_NAMES[minIdx]}`,
      description: `${DIMENSION_NAMES[minIdx]} is your lowest dimension—small daily habits here could boost your overall wellness score significantly.`,
      type: 'opportunity',
      dimension: DIMENSION_NAMES[minIdx],
    });
  }

  // Day of week pattern
  const dowTotals: number[] = new Array(7).fill(0);
  const dowCounts: number[] = new Array(7).fill(0);
  for (const c of checkIns) {
    const dow = new Date(c.dayKey).getDay();
    dowTotals[dow] += c.percentage;
    dowCounts[dow]++;
  }
  const dowAvgs = dowTotals.map((t, i) => (dowCounts[i] ? t / dowCounts[i] : null));
  const validDows = dowAvgs.map((v, i) => ({ i, v })).filter((x) => x.v !== null);
  if (validDows.length >= 2) {
    const best = validDows.reduce((a, b) => ((a.v ?? 0) > (b.v ?? 0) ? a : b));
    const dowNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    insights.push({
      id: 'insight-3',
      title: `${dowNames[best.i]} is your peak`,
      description: `You tend to score highest on ${dowNames[best.i]}s—consider scheduling your most demanding work then.`,
      type: 'pattern',
    });
  }

  return insights.slice(0, 3);
}

export async function GET(req: Request) {
  try {
    await dbConnect();

    const user = verifyToken(req);
    if (!user) return unauthorized();

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 89);
    cutoff.setHours(0, 0, 0, 0);

    const checkIns = await CheckIn.find({
      userId: new mongoose.Types.ObjectId(user.id),
      date: { $gte: cutoff },
    })
      .sort({ date: 1 })
      .lean();

    const shaped = checkIns.map((c) => ({
      date: c.date,
      ratings: Array.isArray(c.ratings) ? c.ratings : [],
      percentage: c.percentage,
      dayKey: c.dayKey,
    }));

    const insights = await generatePatternInsights(shaped);

    return NextResponse.json({
      insights,
      generatedAt: new Date().toISOString(),
    } satisfies TimelineInsightsResponse);
  } catch (error) {
    return serverError(error, 'Error generating timeline insights');
  }
}

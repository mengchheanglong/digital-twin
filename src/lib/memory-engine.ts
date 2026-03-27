import mongoose from 'mongoose';
import CheckIn from './models/CheckIn';
import Quest from './models/Quest';
import JournalEntry from './models/JournalEntry';
import UserInsightState from './models/UserInsightState';
import UserMemory from './models/UserMemory';
import dbConnect from './db';

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
}

interface MemorySynthesis {
  summary: string;
  recurringStruggles: string[];
  breakthroughTriggers: string[];
  seasonalPatterns: string[];
  effectiveInterventions: string[];
  keyPersonalityTraits: string[];
}

async function buildUserContext(userId: string): Promise<string> {
  const uid = new mongoose.Types.ObjectId(userId);
  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - 90);

  const [checkIns, quests, journals, insightState] = await Promise.all([
    CheckIn.find({ userId: uid, date: { $gte: cutoff }, checkInType: { $ne: 'micro' } })
      .select('percentage date ratings')
      .sort({ date: -1 })
      .limit(90)
      .lean(),
    Quest.find({ userId: uid, completed: true, completedDate: { $gte: cutoff } })
      .select('goal duration completedDate')
      .sort({ completedDate: -1 })
      .limit(100)
      .lean(),
    JournalEntry.find({ userId: uid, date: { $gte: cutoff } })
      .select('title content mood tags date')
      .sort({ date: -1 })
      .limit(30)
      .lean(),
    UserInsightState.findOne({ userId: uid }).select('topInterest productivityScore currentTrend checkInDimensions').lean(),
  ]);

  const avgWellness =
    checkIns.length > 0
      ? Math.round(checkIns.reduce((s, c) => s + (c.percentage as number), 0) / checkIns.length)
      : null;

  const goalFrequency: Record<string, number> = {};
  for (const q of quests) {
    const goal = String(q.goal).toLowerCase().trim();
    goalFrequency[goal] = (goalFrequency[goal] || 0) + 1;
  }
  const topGoals = Object.entries(goalFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([g, count]) => `"${g}" (×${count})`);

  const journalExcerpts = journals
    .slice(0, 10)
    .map((j) => `[${new Date(j.date as Date).toLocaleDateString()}] ${String(j.title)}: ${String(j.content).slice(0, 200)}`)
    .join('\n');

  const moodSamples = journals
    .filter((j) => j.mood)
    .slice(0, 10)
    .map((j) => String(j.mood))
    .join(', ');

  const tagFreq: Record<string, number> = {};
  for (const j of journals) {
    for (const t of (j.tags || []) as string[]) {
      tagFreq[t] = (tagFreq[t] || 0) + 1;
    }
  }
  const topTags = Object.entries(tagFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([t]) => t)
    .join(', ');

  return `=== USER BEHAVIORAL DATA SUMMARY (last 90 days) ===
Check-ins: ${checkIns.length} total, avg wellness: ${avgWellness ?? 'n/a'}%
Current trend: ${insightState?.currentTrend ?? 'unknown'}
Productivity score: ${insightState?.productivityScore ?? 'n/a'}
Top interest: ${insightState?.topInterest ?? 'n/a'}
Avg dimensions (7d): energy=${insightState?.checkInDimensions?.energy ?? 'n/a'}, focus=${insightState?.checkInDimensions?.focus ?? 'n/a'}, stress=${insightState?.checkInDimensions?.stressControl ?? 'n/a'}, social=${insightState?.checkInDimensions?.socialConnection ?? 'n/a'}, optimism=${insightState?.checkInDimensions?.optimism ?? 'n/a'}

Top recurring habits/goals:
${topGoals.join('\n') || 'None yet'}

Journal moods: ${moodSamples || 'None recorded'}
Frequent journal tags: ${topTags || 'None'}

Recent journal excerpts:
${journalExcerpts || 'No journal entries'}`;
}

async function synthesizeWithGemini(context: string, existing: string): Promise<MemorySynthesis | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const model = String(process.env.GEMINI_MODEL || 'gemini-2.0-flash').trim();
  const prompt = `Based on the following behavioral data for a user, extract a compressed psychological and behavioral model.
Provide your analysis as VALID JSON matching exactly this schema:
{
  "summary": "2-3 sentence profile summary",
  "recurringStruggles": ["struggle1", "struggle2"],
  "breakthroughTriggers": ["trigger1", "trigger2"],
  "seasonalPatterns": ["pattern1"],
  "effectiveInterventions": ["intervention1", "intervention2"],
  "keyPersonalityTraits": ["trait1", "trait2"]
}

EXISTING MEMORY (update/refine if needed):
${existing || 'No previous memory.'}

NEW BEHAVIORAL DATA:
${context}

Return ONLY valid JSON, no markdown, no explanation.`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 800 },
        }),
      },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as GeminiResponse;
    const raw = data.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
    // Strip any markdown code fences
    const cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    return JSON.parse(cleaned) as MemorySynthesis;
  } catch {
    return null;
  }
}

/**
 * Synthesizes a compressed user memory model from recent behavioral data.
 * Should be called no more than once per week per user.
 */
export async function synthesizeUserMemory(userId: string): Promise<void> {
  await dbConnect();

  const uid = new mongoose.Types.ObjectId(userId);

  // Check if we've synthesized in the last 7 days
  const existing = await UserMemory.findOne({ userId: uid }).lean();
  if (existing?.lastSynthesizedAt) {
    const daysSince = (Date.now() - new Date(existing.lastSynthesizedAt).getTime()) / 86400000;
    if (daysSince < 6.5) return; // Skip if synthesized recently
  }

  const context = await buildUserContext(userId);
  const existingSummary = existing?.summary || '';
  const synthesis = await synthesizeWithGemini(context, existingSummary);

  if (!synthesis) {
    // Save a basic record so we don't retry immediately
    await UserMemory.findOneAndUpdate(
      { userId: uid },
      { $set: { lastSynthesizedAt: new Date(), weeksCovered: (existing?.weeksCovered || 0) + 1 } },
      { upsert: true, new: true },
    );
    return;
  }

  await UserMemory.findOneAndUpdate(
    { userId: uid },
    {
      $set: {
        summary: synthesis.summary || '',
        recurringStruggles: (synthesis.recurringStruggles || []).slice(0, 10),
        breakthroughTriggers: (synthesis.breakthroughTriggers || []).slice(0, 10),
        seasonalPatterns: (synthesis.seasonalPatterns || []).slice(0, 5),
        effectiveInterventions: (synthesis.effectiveInterventions || []).slice(0, 10),
        keyPersonalityTraits: (synthesis.keyPersonalityTraits || []).slice(0, 10),
        lastSynthesizedAt: new Date(),
        weeksCovered: (existing?.weeksCovered || 0) + 1,
      },
    },
    { upsert: true, new: true },
  );
}

/**
 * Returns a compact memory string suitable for injection into an AI system prompt.
 */
export async function getUserMemoryContext(userId: string): Promise<string> {
  await dbConnect();
  const uid = new mongoose.Types.ObjectId(userId);
  const memory = await UserMemory.findOne({ userId: uid }).lean();
  if (!memory || !memory.summary) return '';

  const parts: string[] = [`User profile: ${memory.summary}`];
  if (memory.recurringStruggles?.length)
    parts.push(`Recurring struggles: ${memory.recurringStruggles.join('; ')}`);
  if (memory.effectiveInterventions?.length)
    parts.push(`What has helped them: ${memory.effectiveInterventions.join('; ')}`);
  if (memory.breakthroughTriggers?.length)
    parts.push(`Breakthrough triggers: ${memory.breakthroughTriggers.join('; ')}`);
  if (memory.keyPersonalityTraits?.length)
    parts.push(`Key traits: ${memory.keyPersonalityTraits.join(', ')}`);

  return parts.join('\n');
}

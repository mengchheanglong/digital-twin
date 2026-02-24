import { normalizeSignalType } from '@/lib/chat-signals';
import { clamp } from '@/lib/math';

export type NodeType = 'Mood' | 'Signal' | 'Habit' | 'Routine' | 'Quest';
export type NodeState = 'low' | 'medium' | 'high';
export type EdgeStrength = 'weak' | 'medium' | 'strong';
export type Polarity = 'negative' | 'positive';

export type InsightNode = {
  id: string;
  label: string;
  type: NodeType;
  color: string;
  state: NodeState;
  score: number;
  occurrences: number;
  summary: string;
  details: string[];
  suggestion: string;
};

export type InsightEdge = {
  id: string;
  source: string;
  target: string;
  strength: EdgeStrength;
  score: number;
  reason: string;
};

export type UnifiedSignal = {
  signalType: string;
  intensity: number;
  confidence: number;
  source: string;
  createdAt: Date;
};

export type SignalMeta = {
  label: string;
  nodeType: Exclude<NodeType, 'Mood' | 'Quest'>;
  polarity: Polarity;
  mood: 'low' | 'high';
  suggestion: string;
};

export type SignalStats = {
  signalType: string;
  label: string;
  nodeType: Exclude<NodeType, 'Mood' | 'Quest'>;
  polarity: Polarity;
  suggestion: string;
  recentAvg: number;
  trendAvg: number;
  blendedAvg: number;
  currentWeekAvg: number;
  previousWeekAvg: number;
  delta: number;
  strength: number;
  dominantScore: number;
  occ24: number;
  occ7: number;
  occPrev7: number;
  sourceCounts7: Record<string, number>;
  highDays7: Set<string>;
};

export type InsightResult = {
  center: { id: string; label: string; level: number };
  nodes: InsightNode[];
  edges: InsightEdge[];
  highlight: { edgeId?: string; message: string };
  mapUpdate: { changed: boolean; changeType: string; message: string };
  growthPath: { fromNodeId: string; toNodeId: string; label: string } | null;
  weeklyEvolution: { moodDelta: number; stressDelta: number; focusDelta: number };
  weeklyReflection: { title: string; dominantPattern: string; improvement: string; narrative: string };
  dataWindow: { signals24h: number; signals7d: number; signals30d: number };
  suggestions: string[];
  generatedAt: string;
};

const DAY_MS = 86400000;
const DECAY_FACTOR = 4.5;

const SIGNAL_META: Record<string, SignalMeta> = {
  stress: { label: 'Stress', nodeType: 'Signal', polarity: 'negative', mood: 'low', suggestion: 'Try a 5-minute breathing reset before high-load tasks.' },
  anxiety: { label: 'Anxiety', nodeType: 'Signal', polarity: 'negative', mood: 'low', suggestion: 'Add one grounding note and one slow breathing cycle.' },
  fatigue: { label: 'Fatigue', nodeType: 'Signal', polarity: 'negative', mood: 'low', suggestion: 'Protect sleep consistency and reduce late-day cognitive load.' },
  procrastination: { label: 'Procrastination', nodeType: 'Signal', polarity: 'negative', mood: 'low', suggestion: 'Use a 10-minute starter task to break inertia.' },
  focus: { label: 'Focus Routine', nodeType: 'Routine', polarity: 'positive', mood: 'high', suggestion: 'Protect one uninterrupted deep-work block daily.' },
  productivity: { label: 'Productivity', nodeType: 'Routine', polarity: 'positive', mood: 'high', suggestion: 'Batch similar tasks to keep momentum high.' },
  motivation: { label: 'Motivation', nodeType: 'Routine', polarity: 'positive', mood: 'high', suggestion: 'Convert motivation into one concrete next action.' },
  confidence: { label: 'Confidence', nodeType: 'Habit', polarity: 'positive', mood: 'high', suggestion: 'Record one daily win to reinforce progress.' },
  breathing: { label: 'Breathing Habit', nodeType: 'Habit', polarity: 'positive', mood: 'high', suggestion: 'Continue short breathing sessions around stress spikes.' },
  mindfulness: { label: 'Mindfulness', nodeType: 'Habit', polarity: 'positive', mood: 'high', suggestion: 'Add one short evening reflection.' },
};

const SOURCE_WEIGHT: Record<string, number> = {
  chat: 0.6,
  companion: 0.6,
  daily_pulse: 1.0,
  quest_create: 0.8,
  quest_progress: 0.7,
  quest_completion: 0.9,
  quest_log: 0.8,
};

const SOURCE_LABEL: Record<string, string> = {
  chat: 'Companion',
  companion: 'Companion',
  daily_pulse: 'Daily Pulse',
  quest_create: 'Quest Create',
  quest_progress: 'Quest Progress',
  quest_completion: 'Quest Completion',
  quest_log: 'Quest Log',
};

const NODE_PALETTE: Record<NodeType, Record<NodeState, string>> = {
  Mood: { low: '#fca5a5', medium: '#f59e0b', high: '#34d399' },
  Signal: { low: '#fdba74', medium: '#fb923c', high: '#f97316' },
  Habit: { low: '#9ae6b4', medium: '#34d399', high: '#10b981' },
  Routine: { low: '#93c5fd', medium: '#60a5fa', high: '#3b82f6' },
  Quest: { low: '#c4b5fd', medium: '#a78bfa', high: '#8b5cf6' },
};

const clamp100 = (v: number) => clamp(Math.round(v), 0, 100);
const avg = (arr: number[]) => (arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0);
const startDay = (d: Date) => { const n = new Date(d); n.setHours(0, 0, 0, 0); return n; };
const shiftDays = (d: Date, days: number) => { const n = new Date(d); n.setDate(n.getDate() + days); return n; };
const toDayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const state = (score: number): NodeState => (score >= 70 ? 'high' : score >= 45 ? 'medium' : 'low');
const edgeStrength = (weight: number): EdgeStrength => (weight >= 70 ? 'strong' : weight >= 40 ? 'medium' : 'weak');
const interSize = (a: Set<string>, b: Set<string>) => { let n = 0; a.forEach((v) => { if (b.has(v)) n += 1; }); return n; };

function sourceWeight(source: string): number { return SOURCE_WEIGHT[source] ?? 0.65; }
function decay(createdAt: Date, now: Date): number { return Math.exp(-Math.max(0, (now.getTime() - createdAt.getTime()) / DAY_MS) / DECAY_FACTOR); }

function weightedAvg(rows: UnifiedSignal[], now: Date, useDecay: boolean): number {
  let sum = 0;
  let weight = 0;
  for (const r of rows) {
    const w = sourceWeight(r.source) * Math.max(0.35, clamp(r.confidence, 0, 1)) * (useDecay ? decay(r.createdAt, now) : 1);
    sum += r.intensity * w;
    weight += w;
  }
  return weight > 0 ? sum / weight : 0;
}

function highDays(rows: UnifiedSignal[], now: Date): Set<string> {
  const bucket = new Map<string, { sum: number; w: number }>();
  for (const r of rows) {
    const k = toDayKey(r.createdAt);
    const w = sourceWeight(r.source) * Math.max(0.35, clamp(r.confidence, 0, 1)) * decay(r.createdAt, now);
    const prev = bucket.get(k) || { sum: 0, w: 0 };
    prev.sum += r.intensity * w;
    prev.w += w;
    bucket.set(k, prev);
  }
  const out = new Set<string>();
  bucket.forEach((v, k) => {
    if (v.w > 0 && v.sum / v.w >= 3) {
      out.add(k);
    }
  });
  return out;
}

function sourceBreakdown(map: Record<string, number>): string {
  const entries = Object.entries(map).filter(([, c]) => c > 0).sort((a, b) => b[1] - a[1]);
  return entries.length ? entries.map(([s, c]) => `${SOURCE_LABEL[s] || s}: ${c}`).join(', ') : 'No source breakdown available.';
}

function connectionWeight(support: number, sourceDays: number, targetDays: number): number {
  const sourceCoverage = support / Math.max(1, sourceDays);
  const targetCoverage = support / Math.max(1, targetDays);
  const recurrence = support / 7;
  return clamp100(support * 22 + sourceCoverage * 30 + targetCoverage * 18 + recurrence * 30);
}

function mapUpdate(
  prevNodes: Array<{ nodeKey: string; label: string; strength: number; occurrences: number }>,
  prevEdges: Array<{ fromNodeKey: string; toNodeKey: string; weight: number }>,
  nextNodes: InsightNode[],
  nextEdges: InsightEdge[],
) {
  if (!prevNodes.length && !prevEdges.length) {
    return { changed: true, changeType: 'initialized' as const, message: 'Behavior map created from your recent activity.' };
  }
  const prevNode = new Map(prevNodes.map((n) => [n.nodeKey, n]));
  const prevEdge = new Map(prevEdges.map((e) => [`${e.fromNodeKey}->${e.toNodeKey}`, e]));
  const addedNode = nextNodes.find((n) => !prevNode.has(n.id));
  if (addedNode) return { changed: true, changeType: 'new_pattern' as const, message: `New pattern detected: ${addedNode.label}.` };
  const shifted = nextNodes.find((n) => { const p = prevNode.get(n.id); return p ? Math.abs(p.strength - n.score) >= 10 || Math.abs(p.occurrences - n.occurrences) >= 3 : false; });
  const prevTop = [...prevEdges].sort((a, b) => b.weight - a.weight)[0];
  const nextTop = [...nextEdges].sort((a, b) => b.score - a.score)[0];
  const prevTopKey = prevTop ? `${prevTop.fromNodeKey}->${prevTop.toNodeKey}` : '';
  const nextTopKey = nextTop ? `${nextTop.source}->${nextTop.target}` : '';
  if (nextTop && nextTopKey !== prevTopKey) return { changed: true, changeType: 'connection_shift' as const, message: 'New primary connection detected.' };
  const addedEdge = nextEdges.find((e) => !prevEdge.has(`${e.source}->${e.target}`));
  if (addedEdge) return { changed: true, changeType: 'new_pattern' as const, message: 'New connection detected in your behavior web.' };
  if (shifted) return { changed: true, changeType: 'rebalanced' as const, message: 'Your behavior map updated based on recent activity.' };
  return { changed: false, changeType: 'stable' as const, message: 'No major behavior pattern shift detected since last update.' };
}

export function generateInsightMap(
  user: { level?: number },
  checkInsRaw: any[],
  questsRaw: any[],
  chatRaw: any[],
  featureRaw: any[],
  now: Date
): InsightResult {
  const today = startDay(now);
  const start24h = new Date(now.getTime() - DAY_MS);
  const start7d = shiftDays(today, -6);
  const startPrev7d = shiftDays(today, -13);

  // Mock missing data for previous update comparison
  const prevNodes: any[] = [];
  const prevEdges: any[] = [];

  const checkIns = checkInsRaw.map((entry) => {
    const date = new Date(entry.date);
    return {
      date,
      dayKey: String(entry.dayKey || toDayKey(date)),
      ratings: Array.isArray(entry.ratings) ? entry.ratings.map((v: number) => Number(v)) : [],
      percentage: clamp(Number(entry.percentage || 0), 0, 100),
    };
  });

  const weekCheckIns = checkIns.filter((c) => c.date >= start7d);
  const prevWeekCheckIns = checkIns.filter((c) => c.date >= startPrev7d && c.date < start7d);
  const moodWeek = avg(weekCheckIns.map((c) => c.percentage));
  const moodPrevWeek = avg(prevWeekCheckIns.map((c) => c.percentage));
  const mood30 = avg(checkIns.map((c) => c.percentage));
  const moodDelta = moodWeek - moodPrevWeek;

  const lowMoodDays = new Set(weekCheckIns.filter((c) => c.percentage < 55).map((c) => c.dayKey));
  const highMoodDays = new Set(weekCheckIns.filter((c) => c.percentage >= 70).map((c) => c.dayKey));
  const focusCheckInDays = new Set(weekCheckIns.filter((c) => Number(c.ratings[1] || 0) >= 4).map((c) => c.dayKey));
  const focusPrevCheckInDays = new Set(prevWeekCheckIns.filter((c) => Number(c.ratings[1] || 0) >= 4).map((c) => c.dayKey));

  const signals: UnifiedSignal[] = [];
  for (const row of chatRaw) {
    const t = normalizeSignalType(row.signalType);
    if (!t) continue;
    signals.push({
      signalType: t,
      intensity: clamp(Number(row.intensity || 0), 1, 5),
      confidence: clamp(Number(row.confidence || 0), 0, 1),
      source: 'chat',
      createdAt: new Date(row.createdAt || now),
    });
  }

  for (const row of featureRaw) {
    const t = normalizeSignalType(row.signalType);
    if (!t) continue;
    signals.push({
      signalType: t,
      intensity: clamp(Number(row.intensity || 0), 1, 5),
      confidence: clamp(Number(row.confidence || 0), 0, 1),
      source: String(row.source || 'daily_pulse').trim() || 'daily_pulse',
      createdAt: new Date(row.createdAt || now),
    });
  }

  const signals24 = signals.filter((s) => s.createdAt >= start24h);
  const signals7 = signals.filter((s) => s.createdAt >= start7d);
  const signalsPrev7 = signals.filter((s) => s.createdAt >= startPrev7d && s.createdAt < start7d);

  const stats: SignalStats[] = [];
  for (const signalType of Object.keys(SIGNAL_META)) {
    const meta = SIGNAL_META[signalType];
    const rows30 = signals.filter((s) => s.signalType === signalType);
    const rows7 = signals7.filter((s) => s.signalType === signalType);
    const rows24 = signals24.filter((s) => s.signalType === signalType);
    const rowsPrev = signalsPrev7.filter((s) => s.signalType === signalType);
    if (!rows30.length && !rows7.length && !rowsPrev.length) continue;

    const recentAvg = weightedAvg(rows7, now, true);
    const trendAvg = weightedAvg(rows30, now, true);
    const blendedAvg = recentAvg * 0.7 + trendAvg * 0.3;
    const strength = clamp100((blendedAvg / 5) * 100 * (0.85 + Math.min(0.3, rows7.length / 14)));
    const currentWeekAvg = weightedAvg(rows7, now, false);
    const previousWeekAvg = weightedAvg(rowsPrev, now, false);
    const delta = currentWeekAvg - previousWeekAvg;

    const sourceCounts7: Record<string, number> = {};
    for (const r of rows7) sourceCounts7[r.source] = (sourceCounts7[r.source] || 0) + 1;

    stats.push({
      signalType,
      label: meta.label,
      nodeType: meta.nodeType,
      polarity: meta.polarity,
      suggestion: meta.suggestion,
      recentAvg,
      trendAvg,
      blendedAvg,
      currentWeekAvg,
      previousWeekAvg,
      delta,
      strength,
      dominantScore: blendedAvg * (1 + rows7.length / 7),
      occ24: rows24.length,
      occ7: rows7.length,
      occPrev7: rowsPrev.length,
      sourceCounts7,
      highDays7: highDays(rows7, now),
    });
  }

  const statsMap = new Map(stats.map((s) => [s.signalType, s]));

  const moodBlend = (moodWeek || mood30 || 50) * 0.7 + (mood30 || moodWeek || 50) * 0.3;
  const moodScore = clamp100(moodBlend);
  const moodNode: InsightNode = {
    id: 'node-mood',
    label: 'Mood',
    type: 'Mood',
    color: NODE_PALETTE.Mood[state(moodScore)],
    state: state(moodScore),
    score: moodScore,
    occurrences: weekCheckIns.length,
    summary: `Weekly mood average is ${Math.round(moodWeek || 0)}% (${Math.round(moodDelta) >= 0 ? '+' : ''}${Math.round(moodDelta)} vs last week).`,
    details: [
      `Daily Pulse entries this week: ${weekCheckIns.length}`,
      `Low mood days: ${lowMoodDays.size}, high mood days: ${highMoodDays.size}`,
      `30-day mood baseline: ${Math.round(mood30 || 0)}%`,
    ],
    suggestion: moodScore < 55 ? 'Protect one recovery block before your hardest task each day.' : 'Keep reinforcing routines that stabilize your baseline.',
  };

  const questDays = new Set<string>();
  for (const row of featureRaw) {
    const src = String(row.source || '').trim();
    if (!src.startsWith('quest') && src !== 'quest_log') continue;
    const dt = new Date(row.createdAt || now);
    if (dt >= start7d) questDays.add(toDayKey(dt));
  }
  for (const q of questsRaw) {
    const created = new Date(q.date);
    if (created >= start7d) questDays.add(toDayKey(created));
    if (q.completedDate) {
      const done = new Date(q.completedDate);
      if (done >= start7d) questDays.add(toDayKey(done));
    }
  }

  const nodes: InsightNode[] = [moodNode];
  const activeQuest = questsRaw.find((q: any) => !q.completed) || null;
  const latestQuest = activeQuest || questsRaw[0] || null;
  const doneCount = questsRaw.filter((q: any) => q.completed).length;
  const completionRate = questsRaw.length ? doneCount / questsRaw.length : 0;

  if (latestQuest) {
    const progress = clamp(Number(latestQuest.progress ?? latestQuest.ratings?.[0] ?? 0), 0, 100);
    const questScore = latestQuest.completed ? 100 : clamp100(progress * 0.8 + completionRate * 20);
    const labelRaw = String(latestQuest.goal || 'Quest').trim() || 'Quest';
    nodes.push({
      id: 'quest-active',
      label: labelRaw.length > 24 ? `${labelRaw.slice(0, 21)}...` : labelRaw,
      type: 'Quest',
      color: NODE_PALETTE.Quest[state(questScore)],
      state: state(questScore),
      score: questScore,
      occurrences: questDays.size || 1,
      summary: latestQuest.completed ? 'Most recent quest is completed.' : `Current quest progress is ${Math.round(progress)}%.`,
      details: [
        `Quest activities in last 7 days: ${questDays.size}`,
        `Completion rate: ${Math.round(completionRate * 100)}%`,
        `Duration: ${String(latestQuest.duration || 'daily')}`,
      ],
      suggestion: latestQuest.completed ? 'Use this momentum to start the next focused quest.' : 'Align this quest with your strongest focus window.',
    });
  }

  const ranked = [...stats].sort((a, b) => b.dominantScore - a.dominantScore).filter((s) => s.occ7 > 0 || s.strength >= 45);
  for (const s of ranked) {
    if (nodes.length >= 5) break;
    const st = state(s.strength);
    const details = [
      `Detected in ${s.occ7} signal(s) this week`,
      `Sources: ${sourceBreakdown(s.sourceCounts7)}`,
      `Average intensity: ${s.currentWeekAvg.toFixed(1)}/5`,
    ];
    if (s.previousWeekAvg > 0) details.push(`Week-over-week change: ${s.delta > 0 ? '+' : ''}${s.delta.toFixed(1)}`);
    nodes.push({
      id: `signal-${s.signalType}`,
      label: s.label,
      type: s.nodeType,
      color: NODE_PALETTE[s.nodeType][st],
      state: st,
      score: s.strength,
      occurrences: s.occ7,
      summary: `${s.label} appears ${s.occ7} time(s) this week with blended intensity ${s.blendedAvg.toFixed(1)}/5.`,
      details,
      suggestion: s.suggestion,
    });
  }

  if (nodes.length < 3) {
    const score = clamp100(weekCheckIns.length * 18);
    nodes.push({
      id: 'routine-consistency',
      label: 'Consistency Routine',
      type: 'Routine',
      color: NODE_PALETTE.Routine[state(score)],
      state: state(score),
      score,
      occurrences: weekCheckIns.length,
      summary: `You logged ${weekCheckIns.length} Daily Pulse entries this week.`,
      details: ['More recurring data will increase map accuracy and connection quality.'],
      suggestion: 'Keep daily check-ins consistent to strengthen behavior intelligence.',
    });
  }

  const selected = new Set(nodes.map((n) => n.id));
  const edges: InsightEdge[] = [];
  const signalNodes = nodes
    .filter((n) => n.id.startsWith('signal-'))
    .map((n) => ({ n, t: n.id.replace(/^signal-/, ''), s: statsMap.get(n.id.replace(/^signal-/, '')) }))
    .filter((x) => Boolean(x.s)) as Array<{ n: InsightNode; t: string; s: SignalStats }>;

  for (const x of signalNodes) {
    const meta = SIGNAL_META[x.t];
    const moodDays = meta.mood === 'low' ? lowMoodDays : highMoodDays;
    const supportMood = interSize(x.s.highDays7, moodDays);
    if (supportMood > 0 && selected.has('node-mood')) {
      const w = connectionWeight(supportMood, x.s.highDays7.size, moodDays.size);
      edges.push({
        id: `${x.n.id}-to-node-mood`,
        source: x.n.id,
        target: 'node-mood',
        strength: edgeStrength(w),
        score: w,
        reason: meta.mood === 'low'
          ? `${x.n.label} co-occurred with lower mood on ${supportMood} day(s) this week.`
          : `${x.n.label} co-occurred with higher mood on ${supportMood} day(s) this week.`,
      });
    }

    if (selected.has('quest-active') && ['focus', 'productivity', 'motivation', 'confidence', 'procrastination'].includes(x.t)) {
      const supportQuest = interSize(x.s.highDays7, questDays);
      if (supportQuest > 0) {
        const w = connectionWeight(supportQuest, x.s.highDays7.size, questDays.size);
        edges.push({
          id: `${x.n.id}-to-quest-active`,
          source: x.n.id,
          target: 'quest-active',
          strength: edgeStrength(w),
          score: w,
          reason: x.t === 'procrastination'
            ? `Procrastination aligned with quest friction on ${supportQuest} day(s) this week.`
            : `${x.n.label} supported quest activity on ${supportQuest} day(s) this week.`,
        });
      }
    }
  }

  if (selected.has('quest-active') && selected.has('node-mood')) {
    const support = interSize(questDays, highMoodDays);
    if (support > 0) {
      const w = connectionWeight(support, questDays.size, highMoodDays.size);
      edges.push({
        id: 'quest-active-to-node-mood',
        source: 'quest-active',
        target: 'node-mood',
        strength: edgeStrength(w),
        score: w,
        reason: `Quest activity aligned with higher mood on ${support} day(s) this week.`,
      });
    }
  }

  if (!edges.length && nodes.length > 1) {
    const fallback = nodes.find((n) => n.id !== 'node-mood');
    if (fallback) {
      edges.push({
        id: `${fallback.id}-to-node-mood`,
        source: fallback.id,
        target: 'node-mood',
        strength: 'weak',
        score: 24,
        reason: 'More recurring data is needed to strengthen behavior connections.',
      });
    }
  }

  const filteredEdges = edges.filter((e) => selected.has(e.source) && selected.has(e.target));
  const bestEdge = [...filteredEdges].sort((a, b) => b.score - a.score)[0];
  const dominant = [...stats].sort((a, b) => b.dominantScore - a.dominantScore)[0];
  const improvement = stats
    .map((s) => ({ s, score: s.polarity === 'negative' ? -s.delta : s.delta, ok: s.polarity === 'negative' ? s.delta <= -0.3 : s.delta >= 0.3 }))
    .filter((x) => x.ok)
    .sort((a, b) => b.score - a.score)[0];

  const dominantText = dominant
    ? `${dominant.label} is the strongest influence this week (${dominant.currentWeekAvg.toFixed(1)}/5).`
    : 'Not enough recurring signal data yet to determine a dominant pattern.';

  const improvementText = improvement
    ? improvement.s.polarity === 'negative'
      ? `${improvement.s.label} is improving (${improvement.s.delta > 0 ? '+' : ''}${improvement.s.delta.toFixed(1)} week over week).`
      : `${improvement.s.label} is strengthening (${improvement.s.delta > 0 ? '+' : ''}${improvement.s.delta.toFixed(1)} week over week).`
    : moodDelta >= 4
      ? 'Mood trend improved compared with last week.'
      : 'No major improvement trend detected yet this week.';

  const narrative = dominant
    ? `${dominant.label} is currently driving most behavior signals. ${bestEdge ? bestEdge.reason : 'Connection confidence is still building.'} ${improvement ? 'A positive trend is also visible in recent data.' : 'Keep feeding Daily Pulse, Quest Log, and Companion for better recommendations.'}`
    : 'Your map is building history. Continue daily pulse entries, quest updates, and companion messages to unlock higher-confidence insights.';

  let growthPath: { fromNodeId: string; toNodeId: string; label: string } | null = null;
  const neg = signalNodes.filter((x) => x.s.polarity === 'negative').sort((a, b) => b.s.dominantScore - a.s.dominantScore)[0];
  const pos = signalNodes.filter((x) => ['breathing', 'mindfulness', 'focus'].includes(x.t)).sort((a, b) => b.s.dominantScore - a.s.dominantScore)[0];
  if (neg && pos && neg.n.id !== pos.n.id) {
    growthPath = {
      fromNodeId: neg.n.id,
      toNodeId: pos.n.id,
      label: `Growth direction: redirect ${neg.n.label.toLowerCase()} into ${pos.n.label.toLowerCase()}.`,
    };
  } else if (selected.has('quest-active')) {
    const focus = signalNodes.find((x) => x.t === 'focus');
    if (focus) growthPath = { fromNodeId: focus.n.id, toNodeId: 'quest-active', label: 'Growth direction: use focus windows to accelerate quest execution.' };
  }

  const update = mapUpdate(
    prevNodes.map((n) => ({ nodeKey: n.nodeKey, label: n.label, strength: Number(n.strength || 0), occurrences: Number(n.occurrences || 0) })),
    prevEdges.map((e) => ({ fromNodeKey: e.fromNodeKey, toNodeKey: e.toNodeKey, weight: Number(e.weight || 0) })),
    nodes,
    filteredEdges,
  );

  const suggestions = nodes.map((n) => n.suggestion).filter((v, i, arr) => v && arr.indexOf(v) === i).slice(0, 4);
  const stress = statsMap.get('stress');
  const focus = statsMap.get('focus');

  return {
    center: { id: 'you', label: 'You', level: Math.max(1, Number(user.level || 1)) },
    nodes: nodes.slice(0, 5),
    edges: filteredEdges,
    highlight: { edgeId: bestEdge?.id, message: bestEdge?.reason || dominantText },
    mapUpdate: update,
    growthPath,
    weeklyEvolution: {
      moodDelta: Math.round(moodDelta),
      stressDelta: (stress?.occ7 || 0) - (stress?.occPrev7 || 0),
      focusDelta: focusCheckInDays.size - focusPrevCheckInDays.size + ((focus?.occ7 || 0) - (focus?.occPrev7 || 0)),
    },
    weeklyReflection: {
      title: 'Weekly Reflection',
      dominantPattern: dominantText,
      improvement: improvementText,
      narrative,
    },
    dataWindow: {
      signals24h: signals24.length,
      signals7d: signals7.length,
      signals30d: signals.length,
    },
    suggestions,
    generatedAt: now.toISOString(),
  };
}

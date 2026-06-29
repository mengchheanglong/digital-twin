import type { TwinContextPack } from '@/lib/twin-core';
import { sanitizeText } from '@/lib/twin-core/sanitize';

export interface ReflectionInsightData {
  topInterest: string;
  currentTrend: string;
  entertainmentRatio: number;
  lastReflection: string;
}

const MAX_TWIN_CONTEXT_LENGTH = 2500;
const MAX_LEGACY_MEMORY_LENGTH = 1200;
const LEGACY_MEMORY_TRUNCATION_NOTE = '\n- Note: legacy memory truncated for prompt budget.';

function cleanText(value: unknown): string {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function formatPercent(value: number | null | undefined): string {
  return typeof value === 'number' && Number.isFinite(value) ? `${value}%` : 'not enough data';
}

function joinLimited(values: string[] | undefined, maxItems: number): string {
  const items = (values || []).map(cleanText).filter(Boolean).slice(0, maxItems);
  return items.length ? items.join(', ') : 'none yet';
}

function pushIfValue(lines: string[], label: string, value: unknown) {
  const text = cleanText(value);
  if (text) {
    lines.push(`- ${label}: ${text}`);
  }
}

function truncateContext(text: string): string {
  if (text.length <= MAX_TWIN_CONTEXT_LENGTH) {
    return text;
  }

  return `${text.slice(0, MAX_TWIN_CONTEXT_LENGTH - 38).trimEnd()}\n- Note: context truncated for prompt budget.`;
}

export function formatTwinContextForReflection(pack: TwinContextPack | null | undefined): string {
  if (!pack) {
    return '';
  }

  const lines: string[] = [
    'Twin Context Pack',
    `- Generated: ${pack.generatedAt}`,
    `- Source windows: check-ins ${pack.sourceWindows.checkInsDays}d, quests ${pack.sourceWindows.questsDays}d, journals ${pack.sourceWindows.journalsDays}d, focus ${pack.sourceWindows.focusDays}d, chat signals ${pack.sourceWindows.chatSignalsDays}d.`,
    `- Privacy: summarized context only; excludes ${joinLimited(pack.privacy.excludes, 8)}; raw sensitive data included: ${pack.privacy.rawSensitiveDataIncluded ? 'yes' : 'no'}.`,
    '',
    'Identity and progression',
    `- Display name: ${pack.identity.displayName || 'Adventurer'}`,
    `- Avatar stage: ${pack.avatar.avatarStage}; level ${pack.avatar.level}; XP ${pack.avatar.currentXP}/${pack.avatar.requiredXP}; streak ${pack.avatar.dailyStreak}.`,
    `- Current mood: ${pack.avatar.currentMood.emoji} ${pack.avatar.currentMood.label}`,
  ];

  pushIfValue(lines, 'Timezone', pack.identity.timezone);
  pushIfValue(lines, 'Profile bio', pack.identity.profileBio);

  lines.push(
    '',
    'Current state',
    `- Wellness trend: ${pack.currentState.trend}; latest ${formatPercent(pack.currentState.wellness.latestPercentage)}; 30d average ${formatPercent(pack.currentState.wellness.average30d)}; check-ins ${pack.currentState.wellness.checkInCount30d}.`,
    `- Focus: ${pack.currentState.focus.completedSessions30d}/${pack.currentState.focus.sessions30d} sessions completed in 30d; ${pack.currentState.focus.totalMinutes30d} total minutes.`,
  );

  if (pack.currentState.dimensions) {
    const dimensions = pack.currentState.dimensions;
    lines.push(
      `- Dimensions: energy ${dimensions.energy}, focus ${dimensions.focus}, stress control ${dimensions.stressControl}, social connection ${dimensions.socialConnection}, optimism ${dimensions.optimism}.`,
    );
  }

  lines.push('', 'Goals');
  const activeQuests = pack.goals.activeQuests.slice(0, 5);
  if (activeQuests.length) {
    activeQuests.forEach((quest) => {
      const progress = quest.progress === null ? 'progress unknown' : `${quest.progress}%`;
      lines.push(`- Active quest: ${quest.goal} (${quest.duration || 'ongoing'}, ${progress})`);
    });
  } else {
    lines.push('- Active quests: none yet');
  }
  lines.push(
    `- Completed quest themes: ${joinLimited(pack.goals.completedQuestThemes90d, 5)} (${pack.goals.completedQuestCount90d} completions in 90d).`,
  );

  lines.push(
    '',
    'Patterns',
    `- Top journal tags: ${joinLimited(pack.patterns.topJournalTags90d, 6)}`,
    `- Mood samples: ${joinLimited(pack.patterns.journalMoodSamples90d, 5)}`,
  );

  const chatSignals = pack.patterns.chatSignals90d.slice(0, 5);
  if (chatSignals.length) {
    chatSignals.forEach((signal) => {
      lines.push(
        `- Chat signal: ${signal.signalType} intensity ${signal.averageIntensity}/5, confidence ${signal.averageConfidence}, count ${signal.count}`,
      );
    });
  } else {
    lines.push('- Chat signals: none yet');
  }

  lines.push('', 'Memory');
  pushIfValue(lines, 'Summary', pack.memory.summary);
  lines.push(`- Recurring struggles: ${joinLimited(pack.memory.recurringStruggles, 5)}`);
  lines.push(`- Breakthrough triggers: ${joinLimited(pack.memory.breakthroughTriggers, 5)}`);
  lines.push(`- Effective interventions: ${joinLimited(pack.memory.effectiveInterventions, 5)}`);
  lines.push(`- Personality traits: ${joinLimited(pack.memory.keyPersonalityTraits, 5)}`);
  pushIfValue(lines, 'Last synthesized', pack.memory.lastSynthesizedAt);

  return truncateContext(lines.join('\n').trim());
}

export function formatLegacyMemoryForReflection(memoryContext: string | null | undefined): string {
  const sanitized = sanitizeText(memoryContext, Number.MAX_SAFE_INTEGER);
  if (!sanitized) {
    return '';
  }

  if (sanitized.length <= MAX_LEGACY_MEMORY_LENGTH) {
    return sanitized;
  }

  const budget = MAX_LEGACY_MEMORY_LENGTH - LEGACY_MEMORY_TRUNCATION_NOTE.length;
  return `${sanitized.slice(0, Math.max(0, budget)).trimEnd()}${LEGACY_MEMORY_TRUNCATION_NOTE}`;
}

export function buildReflectionSystemPrompt(input: {
  twinContext?: string;
  memoryContext?: string;
  insight?: ReflectionInsightData | null;
}): string {
  const legacyMemory = formatLegacyMemoryForReflection(input.memoryContext);
  const parts: string[] = [
    'You are the user\'s reflection companion inside Digital Twin.',
    'Use a warm, grounded, practical tone. Help with focus, routines, stress regulation, daily planning, and reflective self-understanding.',
    'Personalize only from the supplied context and the current conversation.',
  ];

  if (input.twinContext?.trim()) {
    parts.push(
      '',
      '=== TWIN CONTEXT ===',
      input.twinContext.trim(),
      'Use this as private personalization context. Do not recite it as a dashboard, audit log, data export, or profile summary.',
    );
  }

  if (legacyMemory) {
    parts.push(
      '',
      '=== LEGACY MEMORY ===',
      legacyMemory,
      'Reference this memory naturally when relevant, without stating it was from a file.',
    );
  }

  if (input.insight) {
    const entertainmentPercent = Math.round(input.insight.entertainmentRatio * 100);
    parts.push(
      '',
      '=== INSIGHT CONTEXT ===',
      `- Top interest: ${input.insight.topInterest || 'Not yet identified'}`,
      `- Productivity trend: ${input.insight.currentTrend || 'stable'}`,
      `- Entertainment ratio: ${entertainmentPercent}%`,
      `- Recent reflection: ${input.insight.lastReflection || 'None yet'}`,
      'Use insights lightly and naturally.',
    );
  }

  parts.push(
    '',
    'Do not fabricate personal history, preferences, relationships, events, diagnoses, or achievements.',
    'Do not provide medical diagnosis, legal advice, or financial advice; suggest qualified professional help for those topics.',
    'If the user may be in crisis, unsafe, or at risk of self-harm, encourage immediate trusted support and local emergency or crisis services.',
    'Keep responses concise: 2-5 short sentences unless the user explicitly asks for detail.',
    'Use concrete next steps or one reflective follow-up question when useful.',
  );

  return parts.join('\n');
}

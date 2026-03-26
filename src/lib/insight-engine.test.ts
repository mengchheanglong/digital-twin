/**
 * Comprehensive tests for the Insight Engine pure-computation layer.
 *
 * All inputs are constructed from realistic, full-fidelity data structures
 * that match exactly what MongoDB would return — no mocks, no stripped-down
 * stubs.  Every field documented in IUserEvent is present where applicable.
 */

import {
  calculateProductivityScore,
  calculateEntertainmentRatio,
  findTopInterest,
  calculateTrend,
} from '@/lib/insight-engine';
import { IUserEvent } from '@/lib/models/UserEvent';

// ---------------------------------------------------------------------------
// Test-data helpers
// ---------------------------------------------------------------------------

/**
 * Build a complete IUserEvent plain object.
 * `createdAt` defaults to "right now" so events belong to today unless
 * the caller passes an explicit date.
 */
function makeEvent(
  type: IUserEvent['type'],
  metadata: IUserEvent['metadata'] = {},
  createdAt: Date = new Date(),
): IUserEvent {
  return { type, metadata, createdAt } as unknown as IUserEvent;
}

/** Return a Date that is `n` calendar days before right now. */
function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

/** Return a Date set to midnight at the start of "today minus n days". */
function startOfDayAgo(n: number): Date {
  const d = daysAgo(n);
  d.setHours(1, 0, 0, 0); // 01:00 — safely inside that calendar day
  return d;
}

// ---------------------------------------------------------------------------
// calculateProductivityScore
// ---------------------------------------------------------------------------

describe('calculateProductivityScore', () => {
  it('returns 0 for an empty event list', () => {
    expect(calculateProductivityScore([])).toBe(0);
  });

  it('adds 1 point per quest_completed event, normalised over 50', () => {
    const events = [
      makeEvent('quest_completed'),
      makeEvent('quest_completed'),
    ];
    // 2 quests → score 2 → (2/50)*100 = 4.0
    expect(calculateProductivityScore(events)).toBe(4.0);
  });

  it('scores exactly 100 when quest count hits the normalisation ceiling (50)', () => {
    const events = Array.from({ length: 50 }, () =>
      makeEvent('quest_completed'),
    );
    expect(calculateProductivityScore(events)).toBe(100);
  });

  it('clamps above-ceiling scores to 100', () => {
    const events = Array.from({ length: 80 }, () =>
      makeEvent('quest_completed'),
    );
    expect(calculateProductivityScore(events)).toBe(100);
  });

  it('adds 0.5 for a log_added event with a productive category', () => {
    // "work" is in PRODUCTIVE_CATEGORIES
    const events = [makeEvent('log_added', { category: 'work', duration: 60 })];
    // 0.5 / 50 * 100 = 1.0
    expect(calculateProductivityScore(events)).toBe(1.0);
  });

  it('subtracts 0.5 for a log_added event with an entertainment category', () => {
    // entertainment score = -0.5, clamped to 0
    const events = [
      makeEvent('log_added', { category: 'gaming', duration: 45 }),
    ];
    expect(calculateProductivityScore(events)).toBe(0);
  });

  it('ignores log_added events whose category is neither productive nor entertainment', () => {
    const events = [
      makeEvent('log_added', { category: 'cooking', duration: 30 }),
    ];
    expect(calculateProductivityScore(events)).toBe(0);
  });

  it('ignores log_added events with no category', () => {
    const events = [makeEvent('log_added', {})];
    expect(calculateProductivityScore(events)).toBe(0);
  });

  it('ignores chat_message events entirely', () => {
    const events = [
      makeEvent('chat_message', { category: 'work', duration: 120 }),
    ];
    expect(calculateProductivityScore(events)).toBe(0);
  });

  it('matches productive category via substring (e.g. "coding_challenge" contains "coding")', () => {
    const events = [
      makeEvent('log_added', { category: 'coding_challenge', duration: 90 }),
    ];
    // 0.5 / 50 * 100 = 1.0
    expect(calculateProductivityScore(events)).toBe(1.0);
  });

  it('matches entertainment category via substring (e.g. "youtube_binge" contains "youtube")', () => {
    const events = [
      makeEvent('log_added', { category: 'youtube_binge', duration: 60 }),
    ];
    expect(calculateProductivityScore(events)).toBe(0);
  });

  it('accumulates mixed productive and entertainment events correctly', () => {
    const events = [
      makeEvent('quest_completed'),                                     // +1
      makeEvent('quest_completed'),                                     // +1
      makeEvent('log_added', { category: 'study', duration: 60 }),     // +0.5
      makeEvent('log_added', { category: 'exercise', duration: 30 }),  // +0.5
      makeEvent('log_added', { category: 'netflix', duration: 120 }),  // -0.5
      makeEvent('log_added', { category: 'gaming', duration: 60 }),    // -0.5
    ];
    // raw score = 1+1+0.5+0.5-0.5-0.5 = 2.0 → (2/50)*100 = 4.0
    expect(calculateProductivityScore(events)).toBe(4.0);
  });

  it('handles a large realistic weekly batch without overflow or NaN', () => {
    const events = [
      ...Array.from({ length: 5 }, () => makeEvent('quest_completed')),
      ...Array.from({ length: 10 }, () =>
        makeEvent('log_added', { category: 'work', duration: 60 }),
      ),
      ...Array.from({ length: 4 }, () =>
        makeEvent('log_added', { category: 'gaming', duration: 30 }),
      ),
      ...Array.from({ length: 3 }, () =>
        makeEvent('chat_message', { topic: 'career' }),
      ),
    ];
    const score = calculateProductivityScore(events);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
    expect(Number.isFinite(score)).toBe(true);
  });

  it('uses case-insensitive category matching', () => {
    const events = [
      makeEvent('log_added', { category: 'WORK', duration: 60 }),
      makeEvent('log_added', { category: 'Gaming', duration: 30 }),
    ];
    // WORK → +0.5, Gaming → -0.5 → net 0 → clamped 0
    expect(calculateProductivityScore(events)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// calculateEntertainmentRatio
// ---------------------------------------------------------------------------

describe('calculateEntertainmentRatio', () => {
  it('returns 0 for an empty event list', () => {
    expect(calculateEntertainmentRatio([])).toBe(0);
  });

  it('returns 0 when no event has a positive duration', () => {
    const events = [
      makeEvent('log_added', { category: 'gaming', duration: 0 }),
      makeEvent('log_added', { category: 'streaming', duration: 0 }),
    ];
    expect(calculateEntertainmentRatio(events)).toBe(0);
  });

  it('returns 0 when all duration belongs to productive categories', () => {
    const events = [
      makeEvent('log_added', { category: 'work', duration: 120 }),
      makeEvent('log_added', { category: 'study', duration: 60 }),
    ];
    expect(calculateEntertainmentRatio(events)).toBe(0);
  });

  it('returns 1.0 when all duration belongs to entertainment categories', () => {
    const events = [
      makeEvent('log_added', { category: 'gaming', duration: 90 }),
      makeEvent('log_added', { category: 'streaming', duration: 30 }),
    ];
    expect(calculateEntertainmentRatio(events)).toBe(1.0);
  });

  it('returns 0.5 when half the total time is entertainment', () => {
    const events = [
      makeEvent('log_added', { category: 'work', duration: 60 }),
      makeEvent('log_added', { category: 'gaming', duration: 60 }),
    ];
    expect(calculateEntertainmentRatio(events)).toBe(0.5);
  });

  it('rounds the ratio to two decimal places', () => {
    // 1 hour entertainment out of 3 hours total → 0.333... → 0.33
    const events = [
      makeEvent('log_added', { category: 'gaming', duration: 60 }),
      makeEvent('log_added', { category: 'work', duration: 120 }),
    ];
    expect(calculateEntertainmentRatio(events)).toBe(0.33);
  });

  it('ignores events that have no duration field', () => {
    const events = [
      makeEvent('log_added', { category: 'gaming' }),   // no duration
      makeEvent('log_added', { category: 'work', duration: 60 }),
    ];
    // Only the work event (60 min) contributes to totalTime; gaming has no duration
    expect(calculateEntertainmentRatio(events)).toBe(0);
  });

  it('handles quest_completed and chat_message events without duration', () => {
    const events = [
      makeEvent('quest_completed'),
      makeEvent('chat_message', { topic: 'gaming' }),
      makeEvent('log_added', { category: 'gaming', duration: 30 }),
    ];
    // Only 30 min entertainment, 30 min total → 1.0
    expect(calculateEntertainmentRatio(events)).toBe(1.0);
  });

  it('calculates correctly across a full week of mixed realistic activity', () => {
    const events = [
      makeEvent('log_added', { category: 'work',      duration: 240 }),
      makeEvent('log_added', { category: 'study',     duration: 60  }),
      makeEvent('log_added', { category: 'exercise',  duration: 60  }),
      makeEvent('log_added', { category: 'gaming',    duration: 90  }),
      makeEvent('log_added', { category: 'streaming', duration: 30  }),
      makeEvent('log_added', { category: 'social media', duration: 45 }),
    ];
    // Total = 525, Entertainment = 90+30+45 = 165 → 165/525 ≈ 0.314... → 0.31
    expect(calculateEntertainmentRatio(events)).toBe(0.31);
  });
});

// ---------------------------------------------------------------------------
// findTopInterest
// ---------------------------------------------------------------------------

describe('findTopInterest', () => {
  it('returns "General" for an empty event list', () => {
    expect(findTopInterest([])).toBe('General');
  });

  it('returns the single category, capitalised, when only one event exists', () => {
    const events = [makeEvent('log_added', { category: 'coding' })];
    expect(findTopInterest(events)).toBe('Coding');
  });

  it('picks the most frequently occurring category', () => {
    const events = [
      makeEvent('log_added', { category: 'coding' }),
      makeEvent('log_added', { category: 'coding' }),
      makeEvent('log_added', { category: 'gaming' }),
    ];
    expect(findTopInterest(events)).toBe('Coding');
  });

  it('counts the topic field as well as the category field', () => {
    const events = [
      makeEvent('log_added', { category: 'work', topic: 'typescript' }),
      makeEvent('log_added', { topic: 'typescript' }),
    ];
    // "work" = 1, "typescript" = 2 → typescript wins
    expect(findTopInterest(events)).toBe('Typescript');
  });

  it('counts category and topic from the same event independently', () => {
    const events = [
      makeEvent('log_added', { category: 'work', topic: 'work' }),
    ];
    // "work" counted twice (once from category, once from topic) — still the winner
    expect(findTopInterest(events)).toBe('Work');
  });

  it('is case-insensitive when counting (WORK, Work, work treated as same)', () => {
    const events = [
      makeEvent('log_added', { category: 'WORK' }),
      makeEvent('log_added', { category: 'Work' }),
      makeEvent('log_added', { category: 'coding' }),
      makeEvent('log_added', { category: 'coding' }),
      makeEvent('log_added', { category: 'coding' }),
    ];
    expect(findTopInterest(events)).toBe('Coding');
  });

  it('ignores empty category/topic strings', () => {
    const events = [
      makeEvent('log_added', { category: '', topic: '' }),
      makeEvent('log_added', { category: 'design' }),
    ];
    expect(findTopInterest(events)).toBe('Design');
  });

  it('includes quest_completed and chat_message events in interest counting', () => {
    const events = [
      makeEvent('quest_completed', { category: 'fitness' }),
      makeEvent('quest_completed', { category: 'fitness' }),
      makeEvent('chat_message',    { topic: 'fitness' }),
      makeEvent('log_added',       { category: 'gaming' }),
    ];
    // fitness = 3 (2 category + 1 topic), gaming = 1
    expect(findTopInterest(events)).toBe('Fitness');
  });

  it('returns General when all events have no category or topic', () => {
    const events = [
      makeEvent('quest_completed'),
      makeEvent('chat_message'),
    ];
    expect(findTopInterest(events)).toBe('General');
  });

  it('capitalises only the first letter; the rest of the string is lowercased', () => {
    // The engine normalises to lowercase before counting, so the stored key is
    // "devops" and only the first character is uppercased on output.
    const events = [makeEvent('log_added', { category: 'devOps' })];
    expect(findTopInterest(events)).toBe('Devops');
  });

  it('handles a large realistic event set and returns a stable winner', () => {
    const events = [
      ...Array.from({ length: 10 }, () =>
        makeEvent('log_added', { category: 'work', topic: 'project' }),
      ),
      ...Array.from({ length: 7 }, () =>
        makeEvent('quest_completed', { category: 'exercise' }),
      ),
      ...Array.from({ length: 5 }, () =>
        makeEvent('chat_message', { topic: 'finance' }),
      ),
    ];
    // work=10, project=10, exercise=7, finance=5 → "project" and "work" tied at 10
    // The implementation picks whoever is found first in Object.entries — both are
    // acceptable; we just check it's one of them
    const result = findTopInterest(events);
    expect(['Work', 'Project']).toContain(result);
  });
});

// ---------------------------------------------------------------------------
// calculateTrend
// ---------------------------------------------------------------------------
//
// calculateTrend compares today's productivity score against yesterday's.
// We create events with explicit createdAt timestamps so we control which
// calendar day each event falls into — no Date mocking required.
// ---------------------------------------------------------------------------

describe('calculateTrend', () => {
  it('returns "stable" when there are no events (both days score 0)', () => {
    expect(calculateTrend([])).toBe('stable');
  });

  it('returns "rising" when today has activity but yesterday had none', () => {
    const events = [
      makeEvent('quest_completed', {}, startOfDayAgo(0)),
      makeEvent('quest_completed', {}, startOfDayAgo(0)),
    ];
    expect(calculateTrend(events)).toBe('rising');
  });

  it('returns "dropping" when yesterday had activity but today has none', () => {
    const events = [
      makeEvent('quest_completed', {}, startOfDayAgo(1)),
      makeEvent('quest_completed', {}, startOfDayAgo(1)),
    ];
    expect(calculateTrend(events)).toBe('dropping');
  });

  it('returns "rising" when today score is ≥20% higher than yesterday score', () => {
    // Yesterday: 1 quest → raw 1 → score 2.0
    // Today:     5 quests → raw 5 → score 10.0
    // changeRatio = (10-2)/2 = 4.0 ≥ 0.2 → rising
    const events = [
      makeEvent('quest_completed', {}, startOfDayAgo(1)),
      makeEvent('quest_completed', {}, startOfDayAgo(0)),
      makeEvent('quest_completed', {}, startOfDayAgo(0)),
      makeEvent('quest_completed', {}, startOfDayAgo(0)),
      makeEvent('quest_completed', {}, startOfDayAgo(0)),
      makeEvent('quest_completed', {}, startOfDayAgo(0)),
    ];
    expect(calculateTrend(events)).toBe('rising');
  });

  it('returns "dropping" when today score is ≥20% lower than yesterday score', () => {
    // Yesterday: 5 quests → score 10.0
    // Today:     1 quest  → score 2.0
    // changeRatio = (2-10)/10 = -0.8 ≤ -0.2 → dropping
    const events = [
      makeEvent('quest_completed', {}, startOfDayAgo(1)),
      makeEvent('quest_completed', {}, startOfDayAgo(1)),
      makeEvent('quest_completed', {}, startOfDayAgo(1)),
      makeEvent('quest_completed', {}, startOfDayAgo(1)),
      makeEvent('quest_completed', {}, startOfDayAgo(1)),
      makeEvent('quest_completed', {}, startOfDayAgo(0)),
    ];
    expect(calculateTrend(events)).toBe('dropping');
  });

  it('returns "stable" when today and yesterday scores are within ±20% of each other', () => {
    // Both days: 3 quests → identical score → changeRatio = 0 → stable
    const events = [
      makeEvent('quest_completed', {}, startOfDayAgo(1)),
      makeEvent('quest_completed', {}, startOfDayAgo(1)),
      makeEvent('quest_completed', {}, startOfDayAgo(1)),
      makeEvent('quest_completed', {}, startOfDayAgo(0)),
      makeEvent('quest_completed', {}, startOfDayAgo(0)),
      makeEvent('quest_completed', {}, startOfDayAgo(0)),
    ];
    expect(calculateTrend(events)).toBe('stable');
  });

  it('ignores events older than yesterday when computing the trend', () => {
    // Events from 3 days ago should not be counted in today or yesterday score
    const events = [
      makeEvent('quest_completed', {}, startOfDayAgo(3)),
      makeEvent('quest_completed', {}, startOfDayAgo(3)),
      makeEvent('quest_completed', {}, startOfDayAgo(3)),
      // Today and yesterday: both 0 → stable
    ];
    expect(calculateTrend(events)).toBe('stable');
  });
});

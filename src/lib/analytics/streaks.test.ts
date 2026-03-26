/**
 * Comprehensive tests for the streak analytics helper `computeBestStreak`.
 *
 * `computeBestStreak` accepts an array of Date objects and returns the length
 * of the longest sequence of consecutive calendar days present in that array.
 * It deduplicates same-day entries and handles out-of-order input.
 *
 * All inputs use realistic Date values derived from the current wall clock —
 * no mocks, no time-travel utilities, no stubs.
 */

import { computeBestStreak } from '@/lib/analytics/streaks';

// ---------------------------------------------------------------------------
// Test-data helpers
// ---------------------------------------------------------------------------

/** Return a Date set to 01:00 on the calendar day that is `n` days ago. */
function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(1, 0, 0, 0);
  return d;
}

// ---------------------------------------------------------------------------
// computeBestStreak
// ---------------------------------------------------------------------------

describe('computeBestStreak', () => {
  // ---- empty / trivial inputs --------------------------------------------

  it('returns 0 for an empty array', () => {
    expect(computeBestStreak([])).toBe(0);
  });

  it('returns 1 for a single date', () => {
    expect(computeBestStreak([daysAgo(0)])).toBe(1);
  });

  it('returns 1 for a single date in the distant past', () => {
    expect(computeBestStreak([daysAgo(60)])).toBe(1);
  });

  // ---- consecutive sequences ---------------------------------------------

  it('returns 2 for two consecutive days', () => {
    expect(computeBestStreak([daysAgo(0), daysAgo(1)])).toBe(2);
  });

  it('returns 3 for three consecutive days', () => {
    expect(computeBestStreak([daysAgo(0), daysAgo(1), daysAgo(2)])).toBe(3);
  });

  it('returns 7 for a full week of consecutive days', () => {
    const week = Array.from({ length: 7 }, (_, i) => daysAgo(i));
    expect(computeBestStreak(week)).toBe(7);
  });

  it('returns 14 for two consecutive weeks (14 days in a row)', () => {
    const fortnight = Array.from({ length: 14 }, (_, i) => daysAgo(i));
    expect(computeBestStreak(fortnight)).toBe(14);
  });

  // ---- gaps in the sequence ----------------------------------------------

  it('returns the length of the longer segment when there is a single gap', () => {
    // Days: 0, 1, 2, [gap on day 3], 4, 5
    // Segments: 3-day streak and a 2-day streak → best = 3
    const dates = [daysAgo(0), daysAgo(1), daysAgo(2), daysAgo(4), daysAgo(5)];
    expect(computeBestStreak(dates)).toBe(3);
  });

  it('returns 1 when every pair of dates has a gap between them', () => {
    // 0, 2, 4, 6 — every adjacent pair has a gap of 2 days
    const dates = [daysAgo(0), daysAgo(2), daysAgo(4), daysAgo(6)];
    expect(computeBestStreak(dates)).toBe(1);
  });

  it('picks the longest segment across multiple gaps', () => {
    // Segment A: days 0,1,2,3 → length 4
    // Segment B: days 6,7     → length 2
    // Segment C: days 10      → length 1
    const dates = [
      daysAgo(0), daysAgo(1), daysAgo(2), daysAgo(3),
      daysAgo(6), daysAgo(7),
      daysAgo(10),
    ];
    expect(computeBestStreak(dates)).toBe(4);
  });

  // ---- duplicate entries on the same day ---------------------------------

  it('deduplicates entries on the same calendar day', () => {
    // Two entries today, two entries yesterday → should still be streak of 2
    const dates = [
      daysAgo(0), daysAgo(0), // duplicate today
      daysAgo(1), daysAgo(1), // duplicate yesterday
    ];
    expect(computeBestStreak(dates)).toBe(2);
  });

  it('returns 1 even when all entries land on the same day', () => {
    const today = new Date();
    const sameDay = Array.from({ length: 5 }, () => new Date(today));
    expect(computeBestStreak(sameDay)).toBe(1);
  });

  // ---- out-of-order input ------------------------------------------------

  it('handles dates provided in reverse chronological order', () => {
    const dates = [daysAgo(2), daysAgo(1), daysAgo(0)];
    expect(computeBestStreak(dates)).toBe(3);
  });

  it('handles completely unsorted input and still finds the best streak', () => {
    // 5-day streak (3,4,5,6,7 days ago) mixed with isolated dates (0, 10)
    const dates = [
      daysAgo(10),
      daysAgo(4),
      daysAgo(7),
      daysAgo(3),
      daysAgo(0),
      daysAgo(6),
      daysAgo(5),
    ];
    expect(computeBestStreak(dates)).toBe(5);
  });

  // ---- realistic usage scenarios -----------------------------------------

  it('computes the best check-in streak from a realistic 30-day log with gaps', () => {
    // User checked in every day for 2 weeks, then missed a week, then 5 more days
    const streak1 = Array.from({ length: 14 }, (_, i) => daysAgo(i + 9));  // days 9-22
    const streak2 = Array.from({ length: 5 },  (_, i) => daysAgo(i));       // days 0-4
    const dates = [...streak1, ...streak2];
    expect(computeBestStreak(dates)).toBe(14);
  });

  it('correctly handles a mix of journal, focus, and check-in dates', () => {
    // In production computeStreaks passes mixed date arrays; verify best streak
    // is returned correctly even when activity types share some dates
    const activityDates = [
      daysAgo(0), daysAgo(0), // journal + check-in on the same day
      daysAgo(1), daysAgo(1),
      daysAgo(2),
      daysAgo(4), daysAgo(4),
      daysAgo(5),
    ];
    // After dedup: 0,1,2,4,5 → segments [0,1,2] (len 3) and [4,5] (len 2)
    expect(computeBestStreak(activityDates)).toBe(3);
  });
});

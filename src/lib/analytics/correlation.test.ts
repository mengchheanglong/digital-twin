/**
 * Comprehensive tests for the Correlation analytics module.
 *
 * Two pure helper functions are exercised:
 *
 *  • pearsonCorrelation(x, y)  – computes Pearson's r for two equal-length
 *    arrays, rounded to 3 decimal places.
 *
 *  • interpretCorrelation(r)  – converts r to a human-readable label using
 *    the thresholds defined in the module.
 *
 * All inputs are real numeric arrays that mirror what the system would derive
 * from MongoDB check-in ratings and quest-completion counts — no mocks.
 */

import {
  pearsonCorrelation,
  interpretCorrelation,
} from '@/lib/analytics/correlation';

// ---------------------------------------------------------------------------
// pearsonCorrelation
// ---------------------------------------------------------------------------

describe('pearsonCorrelation', () => {
  // ---- minimum sample size guard -----------------------------------------

  it('returns 0 when both arrays are empty (n < 3)', () => {
    expect(pearsonCorrelation([], [])).toBe(0);
  });

  it('returns 0 when arrays have one element (n < 3)', () => {
    expect(pearsonCorrelation([3], [1])).toBe(0);
  });

  it('returns 0 when arrays have exactly two elements (n < 3)', () => {
    expect(pearsonCorrelation([1, 4], [2, 5])).toBe(0);
  });

  // ---- perfect correlations ----------------------------------------------

  it('returns 1.0 for a perfect positive correlation ([1,2,3] vs [1,2,3])', () => {
    expect(pearsonCorrelation([1, 2, 3], [1, 2, 3])).toBe(1.0);
  });

  it('returns 1.0 for a perfect positive correlation with a larger dataset', () => {
    const x = [1, 2, 3, 4, 5];
    const y = [2, 4, 6, 8, 10]; // y = 2x
    expect(pearsonCorrelation(x, y)).toBe(1.0);
  });

  it('returns -1.0 for a perfect negative correlation ([1,2,3] vs [3,2,1])', () => {
    expect(pearsonCorrelation([1, 2, 3], [3, 2, 1])).toBe(-1.0);
  });

  it('returns -1.0 for a perfect negative correlation with more points', () => {
    const x = [10, 8, 6, 4, 2];
    const y = [1,  3, 5, 7, 9];
    expect(pearsonCorrelation(x, y)).toBe(-1.0);
  });

  // ---- zero correlation --------------------------------------------------

  it('returns 0 when x is constant (zero variance in x)', () => {
    expect(pearsonCorrelation([5, 5, 5], [1, 3, 5])).toBe(0);
  });

  it('returns 0 when y is constant (zero variance in y)', () => {
    expect(pearsonCorrelation([1, 3, 5], [4, 4, 4])).toBe(0);
  });

  it('returns a value close to 0 for data with no linear relationship', () => {
    // A symmetric V-shape: y increases then decreases while x is monotone.
    // There is no net linear trend so r should be close to 0.
    const x = [1, 2, 3, 4, 5, 6, 7];
    const y = [3, 2, 1, 0, 1, 2, 3]; // symmetric about midpoint
    const r = pearsonCorrelation(x, y);
    expect(Math.abs(r)).toBeLessThan(0.1);
  });

  // ---- rounding & precision ----------------------------------------------

  it('rounds the result to exactly 3 decimal places', () => {
    // x = check-in energy ratings over 5 days, y = quest completions
    const energy = [3, 4, 2, 5, 3];
    const quests = [1, 2, 0, 3, 1];
    const r = pearsonCorrelation(energy, quests);
    // Re-rounding to 3 dp must produce the identical value
    expect(r).toBe(Math.round(r * 1000) / 1000);
  });

  // ---- realistic check-in vs quest-completion data ----------------------

  it('correctly computes positive correlation between energy and quest completions', () => {
    // Higher energy days → more quests completed
    const energy  = [2, 3, 4, 3, 5, 4, 5];
    const quests  = [0, 1, 2, 1, 3, 2, 3];
    const r = pearsonCorrelation(energy, quests);
    expect(r).toBeGreaterThan(0.9); // very strong positive
  });

  it('correctly computes negative correlation between stress and quest completions', () => {
    // Higher stress (lower stressControl rating) → fewer quests
    // stressControl: 1=very stressed, 5=very calm
    const stressControl = [2, 1, 3, 1, 4, 5, 4];
    const quests        = [3, 4, 2, 4, 1, 0, 1]; // inverted relationship
    const r = pearsonCorrelation(stressControl, quests);
    expect(r).toBeLessThan(-0.8); // strong negative
  });

  it('returns a value strictly between -1 and 1 for partial correlations', () => {
    const focus  = [3, 4, 2, 5, 3, 4, 2];
    const quests = [2, 3, 1, 2, 3, 2, 1];
    const r = pearsonCorrelation(focus, quests);
    expect(r).toBeGreaterThan(-1);
    expect(r).toBeLessThan(1);
  });

  it('handles a 30-day realistic dataset without NaN or Infinity', () => {
    // Simulate 30 days of energy ratings (1-5) and quest counts (0-3)
    const energyData = [
      3, 4, 2, 5, 3, 4, 5, 2, 3, 4,
      1, 3, 4, 5, 3, 2, 4, 3, 5, 4,
      3, 2, 4, 3, 5, 4, 3, 2, 4, 5,
    ];
    const questData = [
      1, 2, 0, 3, 1, 2, 3, 0, 1, 2,
      0, 1, 2, 3, 1, 0, 2, 1, 3, 2,
      1, 0, 2, 1, 3, 2, 1, 0, 2, 3,
    ];
    const r = pearsonCorrelation(energyData, questData);
    expect(Number.isFinite(r)).toBe(true);
    expect(r).toBeGreaterThanOrEqual(-1);
    expect(r).toBeLessThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// interpretCorrelation
// ---------------------------------------------------------------------------

describe('interpretCorrelation', () => {
  // ---- no meaningful correlation (|r| < 0.2) -----------------------------

  it('returns "No meaningful correlation" for r = 0', () => {
    expect(interpretCorrelation(0)).toBe('No meaningful correlation');
  });

  it('returns "No meaningful correlation" for r = 0.1', () => {
    expect(interpretCorrelation(0.1)).toBe('No meaningful correlation');
  });

  it('returns "No meaningful correlation" for r = -0.19 (just below weak threshold)', () => {
    expect(interpretCorrelation(-0.19)).toBe('No meaningful correlation');
  });

  // ---- weak correlation (0.2 ≤ |r| < 0.4) --------------------------------

  it('returns "Weak positive correlation" for r = 0.2 (exact boundary)', () => {
    expect(interpretCorrelation(0.2)).toBe('Weak positive correlation');
  });

  it('returns "Weak positive correlation" for r = 0.3', () => {
    expect(interpretCorrelation(0.3)).toBe('Weak positive correlation');
  });

  it('returns "Weak positive correlation" for r = 0.399 (just below moderate threshold)', () => {
    expect(interpretCorrelation(0.399)).toBe('Weak positive correlation');
  });

  it('returns "Weak negative correlation" for r = -0.25', () => {
    expect(interpretCorrelation(-0.25)).toBe('Weak negative correlation');
  });

  // ---- moderate correlation (0.4 ≤ |r| < 0.7) ----------------------------

  it('returns "Moderate positive correlation" for r = 0.4 (exact boundary)', () => {
    expect(interpretCorrelation(0.4)).toBe('Moderate positive correlation');
  });

  it('returns "Moderate positive correlation" for r = 0.55', () => {
    expect(interpretCorrelation(0.55)).toBe('Moderate positive correlation');
  });

  it('returns "Moderate positive correlation" for r = 0.699', () => {
    expect(interpretCorrelation(0.699)).toBe('Moderate positive correlation');
  });

  it('returns "Moderate negative correlation" for r = -0.5', () => {
    expect(interpretCorrelation(-0.5)).toBe('Moderate negative correlation');
  });

  // ---- strong correlation (|r| ≥ 0.7) ------------------------------------

  it('returns "Strong positive correlation" for r = 0.7 (exact boundary)', () => {
    expect(interpretCorrelation(0.7)).toBe('Strong positive correlation');
  });

  it('returns "Strong positive correlation" for r = 0.85', () => {
    expect(interpretCorrelation(0.85)).toBe('Strong positive correlation');
  });

  it('returns "Strong positive correlation" for r = 1.0 (perfect)', () => {
    expect(interpretCorrelation(1.0)).toBe('Strong positive correlation');
  });

  it('returns "Strong negative correlation" for r = -0.7 (exact boundary)', () => {
    expect(interpretCorrelation(-0.7)).toBe('Strong negative correlation');
  });

  it('returns "Strong negative correlation" for r = -0.95', () => {
    expect(interpretCorrelation(-0.95)).toBe('Strong negative correlation');
  });

  it('returns "Strong negative correlation" for r = -1.0 (perfect negative)', () => {
    expect(interpretCorrelation(-1.0)).toBe('Strong negative correlation');
  });

  // ---- round-trip with pearsonCorrelation output --------------------------

  it('interprets a real positive Pearson r consistently', () => {
    const { pearsonCorrelation: pc } = require('@/lib/analytics/correlation');
    const energy = [2, 3, 4, 3, 5, 4, 5];
    const quests = [0, 1, 2, 1, 3, 2, 3];
    const r = pc(energy, quests);
    const label = interpretCorrelation(r);
    expect(label).toMatch(/Strong positive/);
  });

  it('interprets a real negative Pearson r consistently', () => {
    const { pearsonCorrelation: pc } = require('@/lib/analytics/correlation');
    const stressControl = [2, 1, 3, 1, 4, 5, 4];
    const quests        = [3, 4, 2, 4, 1, 0, 1];
    const r = pc(stressControl, quests);
    const label = interpretCorrelation(r);
    expect(label).toMatch(/Strong negative/);
  });
});

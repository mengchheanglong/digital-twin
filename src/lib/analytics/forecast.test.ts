import { linearRegression } from './forecast';

describe('linearRegression', () => {
  it('handles empty array by returning default intercept 50 and slope 0', () => {
    const result = linearRegression([]);
    expect(result).toEqual({ slope: 0, intercept: 50 });
  });

  it('handles single element by returning it as intercept and slope 0', () => {
    const result = linearRegression([75]);
    expect(result).toEqual({ slope: 0, intercept: 75 });
  });

  it('handles two identical elements', () => {
    const result = linearRegression([60, 60]);
    expect(result).toEqual({ slope: 0, intercept: 60 });
  });

  it('calculates basic linear progression correctly', () => {
    // x = [0, 1, 2], y = [10, 20, 30]
    // slope should be 10, intercept should be 10
    const result = linearRegression([10, 20, 30]);
    expect(result.slope).toBeCloseTo(10);
    expect(result.intercept).toBeCloseTo(10);
  });

  it('calculates negative slope correctly', () => {
    // x = [0, 1, 2], y = [30, 20, 10]
    // slope should be -10, intercept should be 30
    const result = linearRegression([30, 20, 10]);
    expect(result.slope).toBeCloseTo(-10);
    expect(result.intercept).toBeCloseTo(30);
  });

  it('handles constant values', () => {
    const result = linearRegression([40, 40, 40, 40]);
    expect(result.slope).toBe(0);
    expect(result.intercept).toBe(40);
  });

  it('handles all zeros', () => {
    const result = linearRegression([0, 0, 0]);
    expect(result.slope).toBe(0);
    expect(result.intercept).toBe(0);
  });

  it('handles a large dataset', () => {
    const n = 100;
    const data = Array.from({ length: n }, (_, i) => i * 2 + 5); // y = 2x + 5
    const result = linearRegression(data);
    expect(result.slope).toBeCloseTo(2);
    expect(result.intercept).toBeCloseTo(5);
  });

  it('handles non-perfectly linear data', () => {
    // x = [0, 1, 2, 3], y = [10, 12, 11, 13]
    // xMean = 1.5, yMean = 11.5
    // num = (0-1.5)*(10-11.5) + (1-1.5)*(12-11.5) + (2-1.5)*(11-11.5) + (3-1.5)*(13-11.5)
    // num = (-1.5)*(-1.5) + (-0.5)*(0.5) + (0.5)*(-0.5) + (1.5)*(1.5)
    // num = 2.25 - 0.25 - 0.25 + 2.25 = 4
    // den = (-1.5)^2 + (-0.5)^2 + (0.5)^2 + (1.5)^2 = 2.25 + 0.25 + 0.25 + 2.25 = 5
    // slope = 4/5 = 0.8
    // intercept = 11.5 - 0.8 * 1.5 = 11.5 - 1.2 = 10.3
    const result = linearRegression([10, 12, 11, 13]);
    expect(result.slope).toBeCloseTo(0.8);
    expect(result.intercept).toBeCloseTo(10.3);
  });
});

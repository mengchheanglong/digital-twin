import { randomInt } from "crypto";

describe("OTP Generation Security", () => {
  it("should generate a 6-digit OTP string", () => {
    for (let i = 0; i < 1000; i++) {
      const otp = randomInt(100000, 1000000).toString();
      expect(otp.length).toBe(6);
      const otpInt = parseInt(otp, 10);
      expect(otpInt).toBeGreaterThanOrEqual(100000);
      expect(otpInt).toBeLessThan(1000000);
    }
  });

  it("should generate different OTPs (basic check for randomness)", () => {
    const otps = new Set();
    for (let i = 0; i < 100; i++) {
      otps.add(randomInt(100000, 1000000).toString());
    }
    // High probability that 100 random 6-digit numbers are unique, but we check for at least 95 to be safe from rare collisions
    expect(otps.size).toBeGreaterThan(95);
  });
});

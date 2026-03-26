import { validatePassword, validateEmail } from "@/lib/validation";

describe("validatePassword", () => {
  it("rejects passwords shorter than 6 characters", () => {
    const result = validatePassword("abc");
    expect(result.isValid).toBe(false);
    expect(result.message).toMatch(/6 characters/i);
  });

  it("accepts a password of exactly 6 characters", () => {
    const result = validatePassword("abc123");
    expect(result.isValid).toBe(true);
    expect(result.message).toBe("");
  });

  it("accepts a long password", () => {
    const result = validatePassword("correctHorseBatteryStaple99!");
    expect(result.isValid).toBe(true);
  });

  it("rejects an empty string", () => {
    const result = validatePassword("");
    expect(result.isValid).toBe(false);
  });
});

describe("validateEmail", () => {
  it("accepts a standard email", () => {
    const result = validateEmail("user@example.com");
    expect(result.isValid).toBe(true);
    expect(result.message).toBe("");
  });

  it("accepts email with subdomains", () => {
    const result = validateEmail("user@mail.example.co.uk");
    expect(result.isValid).toBe(true);
  });

  it("rejects an email without @", () => {
    const result = validateEmail("userexample.com");
    expect(result.isValid).toBe(false);
    expect(result.message).toMatch(/invalid email/i);
  });

  it("rejects an email without a domain", () => {
    const result = validateEmail("user@");
    expect(result.isValid).toBe(false);
  });

  it("rejects an empty string", () => {
    const result = validateEmail("");
    expect(result.isValid).toBe(false);
  });

  it("rejects spaces in email", () => {
    const result = validateEmail("user @example.com");
    expect(result.isValid).toBe(false);
  });
});

import { validatePassword, validateEmail } from "@/lib/validation";

describe("validatePassword", () => {
  it("rejects passwords shorter than 6 characters", () => {
    const result = validatePassword("abc");
    expect(result.isValid).toBe(false);
    expect(result.message).toMatch(/6 characters/i);
  });

  it("rejects a password without uppercase", () => {
    const result = validatePassword("abc123!");
    expect(result.isValid).toBe(false);
    expect(result.message).toMatch(/include uppercase/i);
  });

  it("rejects a password without lowercase", () => {
    const result = validatePassword("ABC123!");
    expect(result.isValid).toBe(false);
    expect(result.message).toMatch(/include.*lowercase/i);
  });

  it("rejects a password without a number", () => {
    const result = validatePassword("abcABC!");
    expect(result.isValid).toBe(false);
    expect(result.message).toMatch(/include.*number/i);
  });

  it("rejects a password without a special character", () => {
    const result = validatePassword("abcABC123");
    expect(result.isValid).toBe(false);
    expect(result.message).toMatch(/include.*special character/i);
  });

  it("accepts a password meeting all requirements", () => {
    const result = validatePassword("Abc123!");
    expect(result.isValid).toBe(true);
    expect(result.message).toBe("");
  });

  it("accepts a long secure password", () => {
    const result = validatePassword("CorrectHorseBatteryStaple99!");
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

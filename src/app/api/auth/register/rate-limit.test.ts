import { expect, test, describe, mock, beforeEach } from "bun:test";

// Mock dependencies before importing the route
mock.module("@/lib/db", () => ({
  default: mock(() => Promise.resolve()),
}));

mock.module("@/lib/api-response", () => ({
  badRequest: (msg: string) => new Response(JSON.stringify({ msg }), { status: 400 }),
  tooManyRequests: (msg: string) => new Response(JSON.stringify({ msg }), { status: 429 }),
  serverError: (err: any, msg: string) => new Response(JSON.stringify({ msg }), { status: 500 }),
  conflict: (msg: string) => new Response(JSON.stringify({ msg }), { status: 409 }),
}));

mock.module("@/lib/models/User", () => ({
  default: {
    findOne: mock(() => Promise.resolve(null)),
    prototype: {
      save: mock(() => Promise.resolve()),
    },
  },
}));

mock.module("@/lib/auth", () => ({
  signToken: () => "mock-token",
}));

mock.module("@/lib/validation", () => ({
  validateEmail: () => ({ isValid: true }),
  validatePassword: () => ({ isValid: true }),
}));

mock.module("@/lib/progression", () => ({
  getRequiredXP: () => 100,
}));

import { POST } from "./route";

describe("Registration Rate Limiting", () => {
  const createRequest = (ip: string) => {
    return new Request("http://localhost/api/auth/register", {
      method: "POST",
      headers: {
        "x-forwarded-for": ip,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: "test@example.com", password: "password123" }),
    });
  };

  test("should allow up to 5 requests and then block the 6th", async () => {
    const ip = "1.2.3.4";

    // First 5 requests should pass (or at least not fail due to rate limiting)
    for (let i = 0; i < 5; i++) {
      const req = createRequest(ip);
      const res = await POST(req);
      expect(res.status).not.toBe(429);
    }

    // 6th request should be rate limited
    const req6 = createRequest(ip);
    const res6 = await POST(req6);
    expect(res6.status).toBe(429);
    const data = await res6.json();
    expect(data.msg).toBe("Too many registration attempts. Please try again later.");
  });

  test("should allow requests from different IPs", async () => {
    const ip2 = "5.6.7.8";
    const req = createRequest(ip2);
    const res = await POST(req);
    expect(res.status).not.toBe(429);
  });
});

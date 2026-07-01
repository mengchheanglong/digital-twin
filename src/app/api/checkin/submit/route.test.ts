import { verifyTokenWithRevocation } from "@/lib/auth";
import { adjustUserXP } from "@/lib/user-progress";
import CheckIn from "@/lib/models/CheckIn";
import User from "@/lib/models/User";
import UserEvent from "@/lib/models/UserEvent";
import { updateUserInsight } from "@/lib/insight-engine";
import { POST } from "./route";

jest.mock("@/lib/db", () => ({
  __esModule: true,
  default: jest.fn(() => Promise.resolve()),
}));

jest.mock("@/lib/auth", () => ({
  verifyTokenWithRevocation: jest.fn(),
}));

jest.mock("@/lib/user-progress", () => ({
  adjustUserXP: jest.fn(() =>
    Promise.resolve({ level: 1, currentXP: 8, requiredXP: 100 }),
  ),
}));

jest.mock("@/lib/insight-engine", () => ({
  updateUserInsight: jest.fn(() => Promise.resolve(null)),
}));

jest.mock("@/lib/rate-limit", () => ({
  MongoRateLimiter: jest.fn().mockImplementation(() => ({
    check: jest.fn(() => Promise.resolve(true)),
  })),
}));

jest.mock("@/lib/progression", () => {
  const actual = jest.requireActual("@/lib/progression");
  return {
    ...actual,
    getDayKeyTz: jest.fn(() => "2026-07-01"),
  };
});

jest.mock("@/lib/models/CheckIn", () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
    create: jest.fn(),
  },
}));

jest.mock("@/lib/models/User", () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
  },
}));

jest.mock("@/lib/models/UserEvent", () => ({
  __esModule: true,
  default: {
    create: jest.fn(() => Promise.resolve(null)),
  },
}));

describe("check-in submit route", () => {
  const user = { id: "user-id", _id: "user-id" };

  function createRequest(ratings: unknown) {
    return new Request("http://localhost/api/checkin/submit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "1.2.3.4",
      },
      body: JSON.stringify({ ratings }),
    });
  }

  beforeEach(() => {
    jest.clearAllMocks();
    (verifyTokenWithRevocation as jest.Mock).mockResolvedValue(user);
    (User.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({ timezone: "UTC" }),
      }),
    });
    (CheckIn.findOne as jest.Mock).mockResolvedValue(null);
    (CheckIn.create as jest.Mock).mockResolvedValue({});
    (UserEvent.create as jest.Mock).mockResolvedValue(null);
    (updateUserInsight as jest.Mock).mockResolvedValue(null);
    (adjustUserXP as jest.Mock).mockResolvedValue({
      level: 1,
      currentXP: 8,
      requiredXP: 100,
    });
  });

  it("awards scaled XP based on wellness percentage", async () => {
    const res = await POST(createRequest([4, 4, 4, 4, 4]));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(CheckIn.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-id",
        ratings: [4, 4, 4, 4, 4],
        overallScore: 20,
        percentage: 80,
        dayKey: "2026-07-01",
      }),
    );
    expect(adjustUserXP).toHaveBeenCalledWith("user-id", 8);
    expect(body).toMatchObject({
      msg: "Check-in submitted.",
      result: {
        totalScore: 20,
        maxScore: 25,
        percentage: 80,
        xpAwarded: 8,
      },
      progression: { level: 1, currentXP: 8, requiredXP: 100 },
    });
  });

  it("rejects malformed ratings without changing XP", async () => {
    const res = await POST(createRequest([4, 4, 4]));

    expect(res.status).toBe(400);
    expect(CheckIn.create).not.toHaveBeenCalled();
    expect(adjustUserXP).not.toHaveBeenCalled();
    await expect(res.json()).resolves.toEqual({
      msg: "Must provide exactly 5 ratings from 1 to 5.",
    });
  });

  it("rejects duplicate daily check-ins without changing XP", async () => {
    (CheckIn.findOne as jest.Mock).mockResolvedValue({ _id: "existing" });

    const res = await POST(createRequest([4, 4, 4, 4, 4]));

    expect(res.status).toBe(400);
    expect(CheckIn.create).not.toHaveBeenCalled();
    expect(adjustUserXP).not.toHaveBeenCalled();
    await expect(res.json()).resolves.toEqual({
      msg: "Daily check-in already completed.",
    });
  });
});

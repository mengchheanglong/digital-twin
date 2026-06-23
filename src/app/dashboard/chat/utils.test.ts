import { toUiMessage } from "./utils";
import { ServerMessage } from "./types";

describe("toUiMessage", () => {
  const fallbackId = "fallback-id";

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2023-01-01T00:00:00Z"));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it("should convert a valid user message correctly", () => {
    const message: ServerMessage = {
      id: "msg-1",
      role: "user",
      content: "Hello AI",
      timestamp: "2023-01-01T12:00:00Z",
    };

    const result = toUiMessage(message, fallbackId);

    expect(result).toEqual({
      id: "msg-1",
      text: "Hello AI",
      sender: "user",
      timestamp: new Date("2023-01-01T12:00:00Z"),
    });
  });

  it("should convert a valid AI message correctly", () => {
    const message: ServerMessage = {
      id: "msg-2",
      role: "ai",
      content: "Hello Human",
      timestamp: "2023-01-01T12:01:00Z",
    };

    const result = toUiMessage(message, fallbackId);

    expect(result).toEqual({
      id: "msg-2",
      text: "Hello Human",
      sender: "ai",
      timestamp: new Date("2023-01-01T12:01:00Z"),
    });
  });

  it("should use fallbackId if message id is missing", () => {
    const message: ServerMessage = {
      role: "user",
      content: "Hello",
      timestamp: "2023-01-01T12:00:00Z",
    };

    const result = toUiMessage(message, fallbackId);

    expect(result?.id).toBe(fallbackId);
  });

  it("should return null for system messages", () => {
    const message: ServerMessage = {
      id: "msg-3",
      role: "system",
      content: "System prompt",
      timestamp: "2023-01-01T12:00:00Z",
    };

    const result = toUiMessage(message, fallbackId);

    expect(result).toBeNull();
  });

  it("should return null for invalid roles", () => {
    const message: any = {
      id: "msg-4",
      role: "invalid",
      content: "Invalid",
      timestamp: "2023-01-01T12:00:00Z",
    };

    const result = toUiMessage(message, fallbackId);

    expect(result).toBeNull();
  });

  it("should use empty string if content is missing", () => {
    const message: any = {
      id: "msg-5",
      role: "user",
      timestamp: "2023-01-01T12:00:00Z",
    };

    const result = toUiMessage(message, fallbackId);

    expect(result?.text).toBe("");
  });

  it("should use current date if timestamp is missing", () => {
    const message: ServerMessage = {
      id: "msg-6",
      role: "ai",
      content: "No timestamp",
      timestamp: "",
    };

    const result = toUiMessage(message, fallbackId);

    expect(result?.timestamp).toEqual(new Date("2023-01-01T00:00:00Z"));
  });

  it("should use current date if timestamp is completely missing (undefined)", () => {
    const message: any = {
      id: "msg-7",
      role: "ai",
      content: "No timestamp field",
    };

    const result = toUiMessage(message, fallbackId);

    expect(result?.timestamp).toEqual(new Date("2023-01-01T00:00:00Z"));
  });
});

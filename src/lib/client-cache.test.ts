import {
  clearClientCacheByPrefix,
  getClientCache,
  makeUserScopedCacheKey,
  removeClientCache,
  setClientCache,
} from "./client-cache";

function createStorage() {
  const values = new Map<string, string>();

  return {
    get length() {
      return values.size;
    },
    clear: jest.fn(() => values.clear()),
    getItem: jest.fn((key: string) => values.get(key) ?? null),
    key: jest.fn((index: number) => Array.from(values.keys())[index] ?? null),
    removeItem: jest.fn((key: string) => {
      values.delete(key);
    }),
    setItem: jest.fn((key: string, value: string) => {
      values.set(key, value);
    }),
  };
}

function setWindow(value: unknown) {
  Object.defineProperty(global, "window", {
    value,
    configurable: true,
    writable: true,
  });
}

describe("client cache", () => {
  afterEach(() => {
    jest.useRealTimers();
    clearClientCacheByPrefix("test");
    removeClientCache("corrupt");
    delete (global as typeof global & { window?: unknown }).window;
  });

  it("returns null with no window/sessionStorage", () => {
    delete (global as typeof global & { window?: unknown }).window;

    expect(getClientCache("missing")).toBeNull();
  });

  it("round trips through sessionStorage", () => {
    const sessionStorage = createStorage();
    setWindow({ sessionStorage });

    setClientCache("test:round-trip", { count: 1 }, 1000);

    expect(getClientCache("test:round-trip")).toEqual({ count: 1 });
    expect(sessionStorage.setItem).toHaveBeenCalled();
  });

  it("returns null for expired values and removes them", () => {
    jest.useFakeTimers();
    const sessionStorage = createStorage();
    setWindow({ sessionStorage });

    setClientCache("test:expired", "value", 1000);
    jest.advanceTimersByTime(1001);

    expect(getClientCache("test:expired")).toBeNull();
    expect(sessionStorage.removeItem).toHaveBeenCalledWith(
      "digital-twin:client-cache:test:expired",
    );
  });

  it("returns null for corrupted storage entries and removes them", () => {
    const sessionStorage = createStorage();
    setWindow({ sessionStorage });
    sessionStorage.setItem("digital-twin:client-cache:corrupt", "{not json");

    expect(getClientCache("corrupt")).toBeNull();
    expect(sessionStorage.removeItem).toHaveBeenCalledWith(
      "digital-twin:client-cache:corrupt",
    );
  });

  it("refuses to clear with an empty prefix", () => {
    const sessionStorage = createStorage();
    setWindow({ sessionStorage });
    setClientCache("test:prefix-guard", "value", 1000);

    expect(() => clearClientCacheByPrefix("")).toThrow("Client cache prefix is required.");
    expect(getClientCache("test:prefix-guard")).toBe("value");
  });

  it("does not include the raw JWT token in user scoped keys", () => {
    const sessionStorage = createStorage();
    const localStorage = createStorage();
    const payload = Buffer.from(JSON.stringify({ sub: "user-123" })).toString("base64url");
    const token = `header.${payload}.signature`;
    localStorage.setItem("token", token);
    setWindow({
      atob: (value: string) => Buffer.from(value, "base64").toString("binary"),
      localStorage,
      sessionStorage,
    });

    const key = makeUserScopedCacheKey("timeline-days", "90");

    expect(key).toContain("user-123");
    expect(key).not.toContain(token);
  });
});

import {
  errorResponse,
  successResponse,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  serverError,
  tooManyRequests
} from "@/lib/api-response";

describe("api-response", () => {
  describe("errorResponse", () => {
    it("returns 400 by default", async () => {
      const res = errorResponse("Error");
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data).toEqual({ msg: "Error" });
    });

    it("returns custom status", async () => {
      const res = errorResponse("Error", 418);
      expect(res.status).toBe(418);
    });
  });

  describe("successResponse", () => {
    it("returns 200 by default", async () => {
      const res = successResponse("Success");
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual({ msg: "Success", data: null });
    });

    it("includes data payload", async () => {
      const res = successResponse("Success", { id: 1 });
      const data = await res.json();
      expect(data.data).toEqual({ id: 1 });
    });

    it("returns custom status", async () => {
      const res = successResponse("Success", null, 201);
      expect(res.status).toBe(201);
    });
  });

  describe("badRequest", () => {
    it("returns 400 status", async () => {
      const res = badRequest("Bad Request");
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.msg).toBe("Bad Request");
    });
  });

  describe("unauthorized", () => {
    it("returns 401 status and default message", async () => {
      const res = unauthorized();
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.msg).toBe("No token, authorization denied.");
    });

    it("returns custom message", async () => {
      const res = unauthorized("Custom message");
      const data = await res.json();
      expect(data.msg).toBe("Custom message");
    });
  });

  describe("forbidden", () => {
    it("returns 403 status and default message", async () => {
      const res = forbidden();
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.msg).toBe("Forbidden.");
    });

    it("returns custom message", async () => {
      const res = forbidden("Custom message");
      const data = await res.json();
      expect(data.msg).toBe("Custom message");
    });
  });

  describe("notFound", () => {
    it("returns 404 status and default message", async () => {
      const res = notFound();
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.msg).toBe("Not found.");
    });
  });

  describe("conflict", () => {
    it("returns 409 status and default message", async () => {
      const res = conflict();
      expect(res.status).toBe(409);
      const data = await res.json();
      expect(data.msg).toBe("Conflict.");
    });
  });

  describe("serverError", () => {
    it("returns 500 status and logs error", async () => {
      const spy = jest.spyOn(console, "error").mockImplementation(() => {});
      const error = new Error("Test error");
      const res = serverError(error, "Context", "User message");

      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.msg).toBe("User message");
      expect(spy).toHaveBeenCalledWith("Context:", error);

      spy.mockRestore();
    });

    it("uses default messages", async () => {
      const spy = jest.spyOn(console, "error").mockImplementation(() => {});
      const error = "simple error";
      const res = serverError(error);

      const data = await res.json();
      expect(data.msg).toBe("Server error.");
      expect(spy).toHaveBeenCalledWith("Server error:", error);

      spy.mockRestore();
    });
  });

  describe("tooManyRequests", () => {
    it("returns 429 status and default message", async () => {
      const res = tooManyRequests();
      expect(res.status).toBe(429);
      const data = await res.json();
      expect(data.msg).toBe("Too many requests.");
    });
  });
});

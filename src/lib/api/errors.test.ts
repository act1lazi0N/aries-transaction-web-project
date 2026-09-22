import { describe, expect, it } from "vitest";
import { ApiError, financialMutationErrorMessage, normalizeApiError, parseRetryAfterSeconds, userFacingErrorMessage } from "@/lib/api/errors";

describe("userFacingErrorMessage", () => {
  it("does not expose a server-provided message", () => {
    const error = new ApiError("internal stack trace", { kind: "server", status: 500 });
    expect(userFacingErrorMessage(error)).toBe("The service is unavailable. Try again when it is responding.");
    expect(userFacingErrorMessage(error)).not.toContain("internal stack trace");
  });

  it("maps non-api errors to the supplied fallback", () => {
    expect(userFacingErrorMessage(new Error("internal detail"), "Sign in failed. Try again.")).toBe("Sign in failed. Try again.");
  });

  it("keeps ambiguous financial mutation outcomes explicit", () => {
    const error = new ApiError("upstream failure", { kind: "server", status: 503 });
    expect(financialMutationErrorMessage(error)).toContain("did not confirm the operation");
    expect(financialMutationErrorMessage(error)).not.toContain("No financial state was changed");
  });
});

describe("normalizeApiError", () => {
  it("retains code, safe field errors, request ID, and Retry-After", async () => {
    const response = new Response(JSON.stringify({
      status: 429,
      message: "internal throttling detail",
      errors: { amount: "must be valid", ignored: 42 },
      code: "RATE_LIMITED",
      requestId: "request-123",
    }), { status: 429, headers: { "Content-Type": "application/json", "Retry-After": "17" } });

    const error = await normalizeApiError(response);

    expect(error).toMatchObject({
      kind: "rate_limited",
      status: 429,
      code: "RATE_LIMITED",
      errors: { amount: "must be valid" },
      requestId: "request-123",
      retryAfterSeconds: 17,
    });
    expect(userFacingErrorMessage(error)).not.toContain("internal throttling detail");
  });

  it("parses an HTTP-date Retry-After value without returning a negative delay", () => {
    expect(parseRetryAfterSeconds("Wed, 21 Oct 2026 07:28:00 GMT", Date.parse("Wed, 21 Oct 2026 07:27:55 GMT"))).toBe(5);
    expect(parseRetryAfterSeconds("invalid")).toBeNull();
  });
});

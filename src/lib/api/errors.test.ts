import { describe, expect, it } from "vitest";
import { ApiError, userFacingErrorMessage } from "@/lib/api/errors";

describe("userFacingErrorMessage", () => {
  it("does not expose a server-provided message", () => {
    const error = new ApiError("internal stack trace", { kind: "server", status: 500 });
    expect(userFacingErrorMessage(error)).toBe("The service is unavailable. No financial state was changed.");
    expect(userFacingErrorMessage(error)).not.toContain("internal stack trace");
  });

  it("maps non-api errors to the supplied fallback", () => {
    expect(userFacingErrorMessage(new Error("internal detail"), "Sign in failed. Try again.")).toBe("Sign in failed. Try again.");
  });
});

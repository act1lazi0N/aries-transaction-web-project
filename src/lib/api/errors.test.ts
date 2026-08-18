import { describe, expect, it } from "vitest";
import { ApiError, financialMutationErrorMessage, userFacingErrorMessage } from "@/lib/api/errors";

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

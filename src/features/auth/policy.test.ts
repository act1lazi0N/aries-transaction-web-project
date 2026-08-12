import { describe, expect, it } from "vitest";
import { mayRefreshAfterUnauthorized } from "@/features/auth/policy";

describe("mayRefreshAfterUnauthorized", () => {
  it("allows one session refresh for safe reads", () => {
    expect(mayRefreshAfterUnauthorized("GET")).toBe(true);
    expect(mayRefreshAfterUnauthorized("HEAD")).toBe(true);
  });

  it("never replays financial mutations", () => {
    expect(mayRefreshAfterUnauthorized("POST", true)).toBe(false);
    expect(mayRefreshAfterUnauthorized("PUT", true)).toBe(false);
  });

  it("does not refresh arbitrary writes", () => {
    expect(mayRefreshAfterUnauthorized("POST")).toBe(false);
  });
});

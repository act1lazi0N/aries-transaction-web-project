import { describe, expect, it } from "vitest";
import { advanceAuthEpoch, canReuseRefreshPromise, isCurrentAuthEpoch, type AuthEpochRef } from "@/features/auth/session-epoch";

describe("authentication session epochs", () => {
  it("invalidates a late refresh when a newer session starts", () => {
    const epoch: AuthEpochRef = { current: 0 };
    const oldEpoch = epoch.current;
    advanceAuthEpoch(epoch);
    expect(isCurrentAuthEpoch(epoch, oldEpoch)).toBe(false);
    expect(canReuseRefreshPromise(oldEpoch, epoch.current)).toBe(false);
  });

  it("reuses only a refresh promise from the current session epoch", () => {
    expect(canReuseRefreshPromise(3, 3)).toBe(true);
    expect(canReuseRefreshPromise(2, 3)).toBe(false);
    expect(canReuseRefreshPromise(undefined, 3)).toBe(false);
  });
});

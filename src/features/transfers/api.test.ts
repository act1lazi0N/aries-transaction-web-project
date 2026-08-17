import { describe, expect, it } from "vitest";
import { transferPath } from "@/features/transfers/api";

describe("transfer API", () => {
  it("uses the backend transfer endpoint", () => {
    expect(transferPath()).toBe("/api/v1/transfers");
  });
});

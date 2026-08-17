import { describe, expect, it } from "vitest";
import { parseControlSearchParams } from "@/features/controls/search-params";

describe("parseControlSearchParams", () => {
  it("preserves a restorable run id", () => {
    expect(parseControlSearchParams(new URLSearchParams("runId=run-1"))).toEqual({ runId: "run-1" });
  });

  it("drops missing or oversized ids", () => {
    expect(parseControlSearchParams({ runId: " " })).toEqual({});
    expect(parseControlSearchParams({ runId: "x".repeat(101) })).toEqual({});
  });
});

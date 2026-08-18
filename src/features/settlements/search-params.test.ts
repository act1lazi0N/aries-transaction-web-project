import { describe, expect, it } from "vitest";
import { parseSettlementSearchParams } from "@/features/settlements/search-params";

describe("parseSettlementSearchParams", () => {
  it("keeps a single batch id and trims it", () => {
    expect(parseSettlementSearchParams({ batchId: "  batch-1 " })).toEqual({ batchId: "batch-1" });
  });

  it("ignores missing or empty ids", () => {
    expect(parseSettlementSearchParams({ batchId: "  " })).toEqual({ batchId: undefined });
    expect(parseSettlementSearchParams({})).toEqual({ batchId: undefined });
  });

  it("rejects oversized ids before they reach the detail endpoint", () => {
    expect(parseSettlementSearchParams({ batchId: "x".repeat(101) })).toEqual({});
  });
});

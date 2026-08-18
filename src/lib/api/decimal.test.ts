import { describe, expect, it } from "vitest";
import { exactDecimalString } from "@/lib/api/decimal";

describe("exactDecimalString", () => {
  it("preserves scale-sensitive decimal strings", () => {
    expect(exactDecimalString("9007199254740993.000000000000000001")).toBe("9007199254740993.000000000000000001");
  });

  it("rejects unsafe numeric values instead of silently rounding them", () => {
    expect(exactDecimalString(Number.MAX_SAFE_INTEGER + 2)).toBeNull();
    expect(exactDecimalString(Number.POSITIVE_INFINITY)).toBeNull();
    expect(exactDecimalString("1.2.3")).toBeNull();
  });
});

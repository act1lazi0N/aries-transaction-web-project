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

  it("normalizes numeric exponent notation for the temporary compatibility path", () => {
    expect(exactDecimalString(1e-7)).toBe("0.0000001");
    expect(exactDecimalString(1.25e3)).toBe("1250");
    expect(exactDecimalString(-2.5e-4)).toBe("-0.00025");
  });
});

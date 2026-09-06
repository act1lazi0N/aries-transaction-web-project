import { describe, expect, it } from "vitest";
import { parseMerchantOverview } from "@/features/overview/merchant-api";

describe("merchant overview contract", () => {
  it("keeps exact money in separate currency buckets", () => {
    const result = parseMerchantOverview({ range: "7d", timezone: "Asia/Ho_Chi_Minh", generatedAt: "2026-09-01T00:00:00Z", currencies: [{ currency: "USD", balance: "100.25", inflow: "10.00", outflow: "3.00", refunds: "1.00", pending: "2.00", pendingCount: 1, settlementNet: "6.00", trend: [{ date: "2026-09-01", inflow: "10.00", outflow: "3.00" }] }, { currency: "VND", balance: "1000000.00", inflow: "500000.00", outflow: "0.00", refunds: "0.00", pending: "0.00", pendingCount: 0, settlementNet: "490000.00", trend: [{ date: "2026-09-01", inflow: "500000.00", outflow: "0.00" }] }] });
    expect(result.currencies.map(bucket => bucket.currency)).toEqual(["USD", "VND"]);
    expect(result.currencies[1].balance).toBe("1000000.00");
    expect(result).not.toHaveProperty("totalBalance");
  });
});

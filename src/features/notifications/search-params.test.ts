import { describe, expect, it } from "vitest";
import { parseEmailDeliverySearchParams, parseNotificationSearchParams } from "@/features/notifications/search-params";

describe("notification search parameters", () => {
  it("accepts bounded notification filters", () => {
    expect(parseNotificationSearchParams(new URLSearchParams("status=UNREAD&page=2&size=50"))).toEqual({ status: "UNREAD", page: 2, size: 50 });
  });

  it("falls back safely for invalid notification filters", () => {
    expect(parseNotificationSearchParams({ status: "MISSING", page: "-1", size: "500" })).toEqual({ status: "ALL", page: 0, size: 20 });
  });

  it("defaults operations to the dead-letter queue", () => {
    expect(parseEmailDeliverySearchParams({})).toEqual({ status: "DEAD_LETTERED", page: 0, size: 20 });
    expect(parseEmailDeliverySearchParams(new URLSearchParams("status=PROCESSING&page=1&size=10"))).toEqual({ status: "PROCESSING", page: 1, size: 10 });
  });
});

import { describe, expect, it } from "vitest";
import { emailDeliveryKeys, notificationKeys } from "@/features/notifications/queries";

describe("notification query keys", () => {
  it("isolates user and operational notification data by authenticated user", () => {
    expect(notificationKeys.unread("user-1")).not.toEqual(notificationKeys.unread("user-2"));
    expect(emailDeliveryKeys.list("operator-1", { status: "DEAD_LETTERED", page: 0, size: 20 }))
      .not.toEqual(emailDeliveryKeys.list("operator-2", { status: "DEAD_LETTERED", page: 0, size: 20 }));
  });
});

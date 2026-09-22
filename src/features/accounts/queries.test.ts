import { describe, expect, it } from "vitest";
import { accountKeys } from "@/features/accounts/queries";

describe("account query keys", () => {
  it("separates authenticated users so owned accounts cannot leak through cache reuse", () => {
    expect(accountKeys.mine("user-1")).not.toEqual(accountKeys.mine("user-2"));
  });
});

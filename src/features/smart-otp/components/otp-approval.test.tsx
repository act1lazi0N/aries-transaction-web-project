import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider, onlineManager } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OtpApproval } from "./otp-approval";
import { ApiError } from "@/lib/api/errors";
import type { TransferPreview } from "@/features/transfers/types";
const mocks = vi.hoisted(() => ({ create: vi.fn(), verify: vi.fn(), read: vi.fn(), confirm: vi.fn() }));
vi.mock("@/features/auth/components/auth-session-provider", () => ({ useAuthSession: () => ({ user: { id: "owner" }, request: vi.fn() }) }));
vi.mock("@/features/qr/components/qr-image", () => ({ QrImage: ({ payload }: { payload: string }) => <div>{payload}</div> }));
vi.mock("../api", async original => ({ ...await original<typeof import("../api")>(), createAuthorization: mocks.create, verifyAuthorization: mocks.verify, readAuthorization: mocks.read }));
const authorization = { id: "authorization-id", state: "PENDING", deviceId: "device", purpose: "TRANSFER", suite: "OCRA-1:HOTP-SHA256-8:QH64", expiresAt: "2099-01-01T00:00:00Z" };
const preview: TransferPreview = { previewId: "preview-id", authorizationRequirement: "SMART_OTP", enrollmentState: "ACTIVE", expiresAt: authorization.expiresAt, source: { displayName: "Mine", accountNumberMasked: "***1" }, recipient: { displayName: "Receiver", accountNumberMasked: "***2" }, amount: "1500.00", fee: "0.00", debitTotal: "1500.00", currency: "VND", warnings: [] };
function setup() { const cache = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } }); render(<QueryClientProvider client={cache}><OtpApproval preview={preview} idempotencyKey="stable-key-000001" onConfirm={mocks.confirm} /></QueryClientProvider>); return cache; }
describe("Smart OTP approval", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.create.mockResolvedValue(authorization); mocks.verify.mockResolvedValue({ ...authorization, state: "VERIFIED" }); });
  afterEach(() => { cleanup(); onlineManager.setOnline(true); });
  it("binds the authorization to the preview/key and sends only after verification", async () => {
    const user = userEvent.setup(); const cache = setup();
    await user.click(screen.getByRole("button", { name: "Continue to Smart OTP" }));
    expect(mocks.create).toHaveBeenCalledWith(expect.any(Function), "preview-id", "stable-key-000001");
    expect(mocks.confirm).not.toHaveBeenCalled();
    await user.type(await screen.findByLabelText("Eight-digit Smart OTP"), "00123456");
    await user.dblClick(screen.getByRole("button", { name: "Verify and transfer" }));
    expect(mocks.verify).toHaveBeenCalledTimes(1);
    expect(mocks.verify).toHaveBeenCalledWith(expect.any(Function), "authorization-id", "00123456");
    expect(mocks.confirm).toHaveBeenCalledWith("authorization-id");
    expect(JSON.stringify(cache.getMutationCache().getAll().map(m => m.state.variables))).not.toContain("00123456");
  });
  it("reads uncertain verification and requires explicit continuation", async () => {
    mocks.verify.mockRejectedValue(new ApiError("timeout", { kind: "network" })); mocks.read.mockResolvedValue({ ...authorization, state: "VERIFIED" });
    const user = userEvent.setup(); setup();
    await user.click(screen.getByRole("button", { name: "Continue to Smart OTP" }));
    await user.type(await screen.findByLabelText("Eight-digit Smart OTP"), "00123456");
    await user.click(screen.getByRole("button", { name: "Verify and transfer" }));
    expect(mocks.confirm).not.toHaveBeenCalled();
    await user.click(await screen.findByRole("button", { name: "Check verification status" }));
    expect(mocks.confirm).not.toHaveBeenCalled();
    await user.click(await screen.findByRole("button", { name: "Continue verified transfer" }));
    expect(mocks.verify).toHaveBeenCalledTimes(1); expect(mocks.confirm).toHaveBeenCalledTimes(1);
  });
  it("does not queue an offline code for later verification", async () => {
    const user = userEvent.setup(); setup();
    await user.click(screen.getByRole("button", { name: "Continue to Smart OTP" }));
    await user.type(await screen.findByLabelText("Eight-digit Smart OTP"), "00123456");
    onlineManager.setOnline(false); mocks.verify.mockRejectedValue(new ApiError("offline", { kind: "network" }));
    await user.click(screen.getByRole("button", { name: "Verify and transfer" }));
    expect(await screen.findByRole("button", { name: "Check verification status" })).toBeVisible();
    onlineManager.setOnline(true); expect(mocks.verify).toHaveBeenCalledTimes(1); expect(mocks.confirm).not.toHaveBeenCalled();
  });
  it("blocks a locked proof without inventing remaining attempts", async () => {
    const user = userEvent.setup(); setup(); mocks.verify.mockRejectedValue(new ApiError("locked", { kind: "conflict", code: "SMART_OTP_LOCKED" }));
    await user.click(screen.getByRole("button", { name: "Continue to Smart OTP" }));
    await user.type(await screen.findByLabelText("Eight-digit Smart OTP"), "00123456"); await user.click(screen.getByRole("button", { name: "Verify and transfer" }));
    expect(await screen.findByText(/Verification is locked/)).toBeVisible(); expect(screen.queryByRole("button", { name: "Verify and transfer" })).not.toBeInTheDocument(); expect(mocks.confirm).not.toHaveBeenCalled();
  });
});

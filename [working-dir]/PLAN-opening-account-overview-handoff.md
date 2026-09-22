# Plan: Sửa lỗi kẹt ở màn hình "Opening your account overview"

## Context

Sau khi người dùng (USER/MERCHANT) hoàn tất tạo tài khoản tài chính đầu tiên qua `AccountCreationWorkspace`, gate `AccountRequiredGate` đặt `isEnteringWorkspace = true`, hiển thị spinner **"Opening your account overview"**, và gọi `router.replace("/overview?accountId=...")`.

Tuy nhiên UI có thể bị **kẹt vĩnh viễn ở spinner** trong một số tình huống thực tế:

1. **Suspense chưa resolve**: `/overview` là server component, dùng `await searchParams` ở [src/app/overview/page.tsx:8](src/app/overview/page.tsx#L8). Nếu Next.js cần render lại, có thể mất vài giây hoặc thất bại nếu session/role bị mất trong lúc chuyển trang.
2. **`AccountRequiredGate` bọc lại `/overview`**: `ProtectedWorkspace` ([src/features/auth/components/protected-workspace.tsx:26](src/features/auth/components/protected-workspace.tsx#L26)) gọi `AccountRequiredGate` không điều kiện theo path. Khi gate mount ở route mới với `isEnteringWorkspace` đã được set true bởi instance cũ (React state không persist qua navigation, nên state mới là `false`), nó có thể return `<AccountCreationWorkspace mode="onboarding" />` nếu `accountsQuery.data` rỗng trong khoảnh khắc query đang refetch → người dùng bị đẩy ngược về form tạo tài khoản.
3. **Router.replace thất bại âm thần**: Không có cơ chế theo dõi `router.replace` có hoàn tất hay không, không có timeout, không có fallback.

## Mục tiêu

Đảm bảo người dùng **không bao giờ bị kẹt** ở spinner. Nếu navigation hoàn tất → tự nhiên unmount gate. Nếu không hoàn tất trong 6 giây → tự retry một lần, nếu vẫn fail thì hiển thị nút **"Open your workspace"** để người dùng chủ động click.

Đồng thời, `/overview` phải **không bị gate bọc lại** trong trạng thái "Opening…" — nếu account vừa tạo chưa xuất hiện trong cache, `/overview` vẫn phải tự chọn account đầu tiên từ `accountsQuery.data` thay vì hiển thị rỗng.

## Approach

### Phần A — Sửa `AccountRequiredGate` ([src/features/accounts/components/account-required-gate.tsx](src/features/accounts/components/account-required-gate.tsx))

1. **Đo lường "Opening…" đã bao lâu**: dùng `useEffect` với `setTimeout` 6000ms để đánh dấu `hasTimedOut` khi `isEnteringWorkspace === true`. Cleanup khi unmount hoặc khi `isEnteringWorkspace` chuyển về `false`.

2. **Tự retry navigation một lần**: trong effect, nếu `hasTimedOut` và chưa retry, gọi lại `router.replace(...)`. Theo dõi `retried` flag để chỉ retry đúng một lần.

3. **Fallback UI khi timeout thật sự**: render nhánh "Opening…" với thêm `<Button variant="secondary">Open your workspace</Button>` bên dưới spinner, click sẽ gọi `router.replace` thẳng (không qua `replace` đã flag retry) và có thể dùng `router.push` để tạo entry mới trong history. Thêm `aria-live="polite"` cho region này.

4. **Giữ hành vi test đang có**: `mocks.replace` vẫn nhận đúng `/overview?accountId=...`, test "opens the new account overview without revealing the previous workspace" vẫn pass.

Cấu trúc lại đoạn render hiện tại (dòng 24) thành function `OpeningWorkspaceFrame({ account, onOpenManually })` để test được riêng.

### Phần B — Đảm bảo `/overview` xử lý tốt khi account vừa tạo ([src/features/overview/components/overview-workspace.tsx](src/features/overview/components/overview-workspace.tsx))

Vị trí cần xem: dòng 24 — `selectedAccount = useMemo(...)`. Hiện tại logic đã OK (fallback `accountsQuery.data?.[0]`), nhưng cần:

1. **Cache optimistic từ `AccountCreationWorkspace` phải được nhìn thấy ở `/overview`**: Hiện tại `AccountCreationWorkspace` đã gọi `queryClient.setQueryData(accountKeys.mine(userId), [...current, account])` trước khi navigate — điều này tốt, không cần thay đổi.
2. **Thêm cơ chế retry nhẹ khi `accountsQuery` vẫn pending sau 3s**: hiển thị thông điệp "Account list is taking longer than expected. Retrying…" và gọi `accountsQuery.refetch()` một lần. Đặt `hasRetried` flag để không loop.

### Phần C — Test

Mở rộng [src/features/accounts/components/account-required-gate.test.tsx](src/features/accounts/components/account-required-gate.test.tsx):

1. Thêm test "shows manual open button after timeout" — dùng `vi.useFakeTimers()`, advance 6000ms, expect nút `Open your workspace` xuất hiện.
2. Thêm test "retries navigation once before showing manual button" — advance 6000ms (retry), advance thêm 6000ms (manual button).
3. Thêm test "manual button calls router.replace with the same target".
4. Thêm test "no timeout surfaces when navigation succeeds" — advance 4000ms (chưa tới 6000), assert nút manual chưa có.

Thêm test cho `overview-workspace`:
1. "shows retry notice when account query is slow" — fake timer + slow query.
2. "falls back to first account when initialAccountId is not in the list" — đã được cover một phần bởi dòng 24, nhưng thêm test rõ ràng.

## Critical files

- [src/features/accounts/components/account-required-gate.tsx](src/features/accounts/components/account-required-gate.tsx) — thêm timeout/retry/manual fallback cho nhánh "Opening…".
- [src/features/accounts/components/account-required-gate.test.tsx](src/features/accounts/components/account-required-gate.test.tsx) — thêm test mới.
- [src/features/overview/components/overview-workspace.tsx](src/features/overview/components/overview-workspace.tsx) — thêm retry nhẹ khi pending quá lâu.

## Files không cần đụng

- [src/features/accounts/components/account-creation-workspace.tsx](src/features/accounts/components/account-creation-workspace.tsx) — đã làm tốt phần optimistic cache, không thay đổi.
- [src/features/auth/components/protected-workspace.tsx](src/features/auth/components/protected-workspace.tsx) — gate bọc overview đã được xử lý bằng cách gate tự xử lý timeout/retry.
- [src/app/overview/page.tsx](src/app/overview/page.tsx) — đơn giản, đúng pattern.

## Verification

1. **Unit test**: `npm run test -- src/features/accounts/components/account-required-gate.test.tsx` — toàn bộ test cũ + mới pass.
2. **Unit test**: `npm run test -- src/features/overview/components/overview-workspace.test.tsx` (nếu có) hoặc tạo test mới.
3. **Type check**: `npm run typecheck`.
4. **Lint**: `npm run lint`.
5. **E2E thủ công** (nếu có môi trường):
   - Tạo account mới với role USER → xác nhận spinner "Opening your account overview" không kẹt quá 6s.
   - Mô phỏng navigation chậm (DevTools throttle) → xác nhận nút "Open your workspace" xuất hiện.
   - Reload trang khi đang ở spinner → xác nhận gate vẫn dẫn đến overview đúng.
6. **Regression**: chạy lại `e2e/account-onboarding-and-transaction-read.spec.ts` và `e2e/transfer-workflow.spec.ts` (đang có diff).

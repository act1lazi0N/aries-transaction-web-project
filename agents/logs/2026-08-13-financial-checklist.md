# Aries financial checklist checkpoint

Date: 2026-08-13
Branch: `features/auth-lifecycle`

## Confirmed in the frontend

- [x] Dashboard route exists and uses safe empty/unauthoritative copy.
- [x] Transfer form.
- [x] Recipient/account confirmation.
- [x] Transfer review screen before execution.
- [x] Final confirmation with duplicate-submit prevention.
- [x] Processing/submitted state.
- [x] Completed state only from backend transaction status.
- [x] Failed and unknown transaction states.
- [x] Recent activity through transaction history.
- [x] Transaction history with refresh, pagination, empty, denied, and stale-data states.
- [x] Transaction detail with authoritative refresh.
- [x] Reversal UI for authorized `OPERATOR`/`ADMIN` roles; backend remains the authority.
- [x] Refund UI for authorized `OPERATOR`/`ADMIN` roles; exact decimal amount, explicit confirmation, stable idempotency key, and no automatic retry.
- [x] Human-readable operation reference is shown in the transfer result and transaction identifier flow.

## Blocked by backend contract

- [ ] Account list.
- [ ] Available balance.

The backend has account application services and an `AccountResponse`, but the inspected backend checkout does not expose an account controller/read endpoint. The frontend does not invent accounts or balances. These two items require an authenticated backend endpoint and contract before implementation.

## Verification

- TypeScript: passed.
- Vitest: passed, 7 files / 17 tests.
- ESLint: 0 errors; one pre-existing TanStack Table compiler warning remains at `transaction-workspace.tsx:79`.
- Live authorized refund: not run because no test credentials were supplied. Unauthenticated backend probing must not be treated as a financial-flow test.

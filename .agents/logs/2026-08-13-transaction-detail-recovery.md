# Aries transaction detail and recovery implementation

Date: 2026-08-13
Branch: `features/auth-lifecycle`
Base commit: `70ee54e`

## Scope

- Continued the contract-first authenticated transaction slice.
- Implemented the backend-authoritative transaction detail and recovery path.
- Kept account selection deferred because the backend currently has no account controller or `GET /api/v1/accounts` endpoint.
- No Zustand state or persistence was introduced.

## Implemented

- Added `GET /api/v1/transfers/{id}` client contract and `parseTransaction()` boundary validation.
- Added TanStack Query detail key/hook with `retry: false` and 30-second stale time.
- Added `transactionId` to URL search state so detail survives reload and back/forward navigation.
- Added an accessible transaction detail panel from the transaction ID action.
- Detail reads the latest backend transaction status after navigation/reload; it does not infer success from local mutation state.
- Reversal success invalidates both transaction history and the selected transaction detail query.
- Added a search-parameter regression test for restorable transaction IDs.
- Stabilized `updateUrl` with `useCallback` so the detail action does not introduce hook dependency warnings.

## State ownership

- URL: `accountId`, `transactionId`, page, size, and sort.
- TanStack Query: transaction history, transaction detail, mutation transport, and invalidation.
- React: dialog focus, selected reversal draft, and disclosure state.
- Backend: authorization, amounts, lifecycle status, and final reversal outcome.
- Zustand: intentionally unused.

## Deferred

- Account selector is deferred until the backend exposes an authorized account-list contract. The current backend has account service code but no account API controller/endpoint, so the frontend must not invent one.
- Authenticated browser visual verification and frontend-to-backend integration remain pending.

## Verification

- Vitest: 6 files, 16 tests passed.
- TypeScript: passed with `tsc --noEmit`.
- ESLint: 0 errors; one pre-existing `react-hooks/incompatible-library` warning at TanStack Table `useReactTable()`.
- Production build: passed with `next build`.
- Browser visual/runtime verification: not run.

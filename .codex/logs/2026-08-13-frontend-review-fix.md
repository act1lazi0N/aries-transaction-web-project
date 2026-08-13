# Aries frontend review fixes

Date: 2026-08-13
Branch: `features/auth-lifecycle`
Base commit: `20cc098`

## Scope

- Implemented the reviewed P1 exact-decimal boundary remediation.
- Implemented the reviewed P2 stale background-refresh remediation.
- Added regression tests.
- No backend source was changed.

## Changes

### P1 - Transaction response boundary

- Added `parseTransactionPage()` and transaction field validation in `src/features/transactions/api.ts`.
- Kept valid decimal strings unchanged so precision and scale survive into the UI.
- Normalized finite legacy JSON numeric amounts to strings to prevent the previous formatter crash.
- Rejected malformed money and malformed transaction fields with a safe `ApiError` instead of rendering unsafe data.
- Added tests for exact decimal preservation, legacy numeric compatibility, and malformed money rejection.

Note: the backend should still evolve `BigDecimal` response serialization to JSON decimal strings. Numeric compatibility is a transitional boundary safeguard; it cannot recover precision already lost by JSON number serialization.

### P2 - Background refresh failure

- Initial load failures still use the full error state.
- When cached transaction data exists, a refetch failure keeps the last confirmed rows visible.
- Added an accessible alert explaining that stale data is shown and a user-initiated retry action.

## Verification

- Vitest: 6 files, 15 tests passed.
- TypeScript: passed with `tsc --noEmit`.
- ESLint: 0 errors; one existing `react-hooks/incompatible-library` warning at the TanStack Table `useReactTable()` call.
- Production build: passed with `next build`.
- Browser visual/runtime verification: not run.
- Authenticated frontend-to-backend verification: not run.

## Commit boundary

This checkpoint includes only the P1/P2 source fixes, tests, and this log. The pre-existing staged deletion of `.codex/logs/2026-08-12-p2-review-fix.md` is intentionally excluded.

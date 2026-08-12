# Aries frontend P2 review fixes

Date: 2026-08-12

## Scope

- Added route-aware active navigation with `aria-current`.
- Added accessible transaction ID copy affordance.
- Replaced raw API error rendering in sign-in with safe user-facing messages.
- Standardized the repository on pnpm and removed the tracked npm lockfile.
- Added regression coverage for API error message sanitization.

## Verification

- ESLint: passed with one existing `react-hooks/incompatible-library` warning for TanStack Table.
- Vitest: 5 files, 12 tests passed.
- TypeScript: passed.
- Next.js production build: passed.
- `git diff --check`: passed.
- Browser visual verification: not run.

## Commit boundary

This checkpoint is intended to be committed with the P2 fixes and pnpm lockfiles.

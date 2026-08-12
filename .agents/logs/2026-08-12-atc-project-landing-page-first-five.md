# ATC Project Landing Page: First Five Parts

- Date: 2026-08-12
- Branch: `features/auth-lifecycle`
- Status: Completed, verified, and committed

## Implemented

1. Moved the authenticated overview from `/` to `/overview`.
2. Updated the authenticated application navigation and branding to `ATC project`.
3. Added a public marketing header and footer with Platform, Safety, Access, Sign in, and Open workspace paths.
4. Added the ATC project hero section with primary/secondary CTAs and a static workspace preview.
5. Added clarity, truthful state, controlled access, and closing CTA sections.

## Product and safety decisions

- `/` is public and contains no live balance, transaction, KPI, or backend outcome.
- `/overview`, `/transactions`, `/controls`, and `/settings` remain protected by `AuthGate`.
- Landing copy describes system principles without claiming backend capabilities beyond the established contract.
- Accent styling uses the shared Aries token while status semantics remain separate.
- The preview is static and explicitly communicates that pending is not completed.

## Verification

- `npm run lint`: passed with one existing TanStack Table `react-hooks/incompatible-library` warning; no errors.
- `npm test`: passed, 4 files / 10 tests.
- `npm run typecheck`: passed.
- `npm run build`: passed.
- Generated routes: `/`, `/controls`, `/login`, `/overview`, `/settings`, `/transactions`.

## Remaining limits

- Browser visual verification was not run in this environment.
- Auth provider remains mounted globally; a later route-group refactor can avoid the initial refresh attempt on public pages.
- Existing `.gitignore` working-tree modification was intentionally excluded from this commit.

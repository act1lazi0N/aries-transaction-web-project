# Aries Transaction Web

Starter workspace for the Aries financial transaction frontend.

## Local development

Requires Node.js 20.9+ and pnpm. After dependencies are available:

```bash
pnpm install
pnpm dev
```

The initial workspace is intentionally backend-neutral. It does not display invented balances or transaction outcomes. Add the authenticated API contract before rendering financial state, and model pending, succeeded, rejected, failed, and unknown outcomes explicitly.

## Structure

- `src/app`: App Router routes and global styles
- `src/components`: application shell and provider boundaries
- `src/lib`: shared utilities and future API adapters
- `.agents/skills`: Aries frontend implementation guidance

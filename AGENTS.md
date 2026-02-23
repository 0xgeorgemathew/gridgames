# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Build Commands

```bash
# Frontend (from frontend/)
bun run dev          # Uses custom server.ts (NOT next dev)
bun run types        # Type checking (tsc --noEmit)
bun run format       # Prettier with semicolons disabled




- No semicolons (Prettier enforced)
- Path alias: `@/*` maps to `./` in frontend
- TypeScript `strict: false` - be explicit with type checks


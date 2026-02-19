# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Build Commands

```bash
# Frontend (from frontend/)
bun run dev          # Uses custom server.ts (NOT next dev)
bun run types        # Type checking (tsc --noEmit)
bun run format       # Prettier with semicolons disabled

# Contracts (from contracts/)
forge test           # Run Solidity tests
forge test -vvv      # Verbose output with traces
```

## Critical Architecture Patterns

- **Socket.IO embedded in Next.js**: Server at [`frontend/app/api/socket/route.ts`](frontend/app/api/socket/route.ts) - NOT a separate backend
- **React-Phaser bridge**: Use [`window.phaserEvents`](frontend/game/stores/trading-store.ts) EventEmitter for React→Phaser communication (separate DOMs)
- **Game logic in Zustand stores**: Components are visual only; all state in [`frontend/game/stores/`](frontend/game/stores/)

## Multiplayer Reliability (Non-Negotiable)

- **Timer tracking**: All `setTimeout`/`setInterval` MUST be tracked in GameRoom for cleanup (memory leak prevention)
- **SettlementGuard**: RAII pattern prevents duplicate order settlement race conditions - see [`game-events.ts`](frontend/app/api/socket/game-events.ts)
- **Seeded RNG**: Deterministic coin sequences via `SeededRandom` class - both players see identical coin types
- **State caching**: Cache player IDs at order creation time, NOT settlement (positions change during async)

## Code Style

- No semicolons (Prettier enforced)
- Path alias: `@/*` maps to `./` in frontend
- TypeScript `strict: false` - be explicit with type checks

## Known Issues

- [`GridScanBackground.tsx`](frontend/components/GridScanBackground.tsx): Three.js runs at 60fps (no throttling)
- CORS wildcard in production Socket.IO - needs restriction
  /

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
- **React-Phaser bridge**: Use [`window.phaserEvents`](frontend/games/hyper-swiper/game/stores/trading-store-modules/index.ts) EventEmitter for React→Phaser communication (separate DOMs)
- **Game logic in Zustand stores**: Components are visual only; all state in [`frontend/games/hyper-swiper/game/stores/`](frontend/games/hyper-swiper/game/stores/)
- **Perp-style positions**: Positions stay OPEN until game end (no 5-second settlement)

## Game Mechanics (Hyper Swiper)

| Aspect | Value |
|--------|-------|
| Game duration | 2.5 minutes (150,000ms) |
| Starting cash | $100 per player |
| Position collateral | $10 per position |
| Leverage | Fixed at 500X |
| Position style | Perp-style (open until game end) |
| Liquidation threshold | 80% collateral health ratio |
| Coin types | Long (▲) and Short (▼) only |

## Multiplayer Reliability (Non-Negotiable)

- **Timer tracking**: All `setTimeout`/`setInterval` MUST be tracked in GameRoom for cleanup (memory leak prevention)
- **SettlementGuard**: RAII pattern prevents duplicate settlement race conditions - see [`game-events-modules/index.ts`](frontend/app/api/socket/game-events-modules/index.ts)
- **Seeded RNG**: Deterministic coin sequences via `SeededRandom` class - both players see identical coin types
- **State caching**: Cache player IDs at order creation time, NOT settlement (positions change during async)
- **Liquidation monitoring**: Real-time collateral health checks on every price update

## Code Style

- No semicolons (Prettier enforced)
- Path alias: `@/*` maps to `./` in frontend
- TypeScript `strict: false` - be explicit with type checks

## Known Issues

- [`GridScanBackground.tsx`](frontend/components/GridScanBackground.tsx): Three.js runs at 60fps (no throttling)
- CORS uses origin reflection for Mini App iframe compatibility

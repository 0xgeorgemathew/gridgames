# Code Mode Rules

## Critical Coding Patterns

- **Timer tracking**: All `setTimeout`/`setInterval` in game code MUST be tracked via `room.trackTimeout()`/`room.trackInterval()` for cleanup
- **Liquidation guard**: Check position exists before liquidating - see [`game-events-modules/index.ts`](frontend/app/api/socket/game-events-modules/index.ts)
- **State caching**: Cache player IDs at position creation time, NOT in async settlement callbacks

## React-Phaser Bridge

```typescript
// React → Phaser (in store)
window.phaserEvents?.emit('event_name', data)

// Phaser → React (in scene)
window.phaserEvents?.on('event_name', callback)
```

## Import Conventions

- Path alias: `@/*` maps to `./` in frontend (e.g., `@/games/hyper-swiper/game/stores/trading-store`)
- No semicolons (Prettier enforced)
- TypeScript `strict: false` - add explicit type checks for nullable values

## Game Mechanics (Hyper Swiper)

| Aspect | Value |
|--------|-------|
| Game duration | 2.5 minutes (150,000ms) |
| Starting cash | $100 per player |
| Position collateral | $10 per position |
| Leverage | Fixed at 100X |
| Position style | Perp-style (open until game end) |
| Liquidation threshold | 80% collateral health ratio |
| Coin types | Long (▲) and Short (▼) only |

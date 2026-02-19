# Code Mode Rules

## Critical Coding Patterns

- **Timer tracking**: All `setTimeout`/`setInterval` in game code MUST be tracked via `room.trackTimeout()`/`room.trackInterval()` for cleanup
- **SettlementGuard**: Use RAII pattern for any operation that must execute exactly once - see [`game-events.ts:33-72`](frontend/app/api/socket/game-events.ts)
- **State caching**: Cache player IDs at order creation time, NOT in async settlement callbacks

## React-Phaser Bridge

```typescript
// React → Phaser (in store)
window.phaserEvents?.emit('event_name', data)

// Phaser → React (in scene)
window.phaserEvents?.on('event_name', callback)
```

## Import Conventions

- Path alias: `@/*` maps to `./` in frontend (e.g., `@/game/stores/trading-store`)
- No semicolons (Prettier enforced)
- TypeScript `strict: false` - add explicit type checks for nullable values

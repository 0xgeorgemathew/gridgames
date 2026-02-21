# Ask Mode Rules

## Architecture Context

- **Single-monolith**: Socket.IO server embedded in Next.js at [`/api/socket/route.ts`](frontend/app/api/socket/route.ts), NOT a separate backend
- **Separate DOMs**: Phaser canvas and React UI run in isolated DOMs - communicate via [`window.phaserEvents`](frontend/games/hyper-swiper/game/stores/trading-store-modules/index.ts) EventEmitter
- **State location**: All game logic in Zustand stores at [`frontend/games/hyper-swiper/game/stores/`](frontend/games/hyper-swiper/game/stores/), components are visual only

## Key File Locations

| Purpose              | Location                                                                                       |
| -------------------- | ---------------------------------------------------------------------------------------------- |
| Socket.IO server     | [`frontend/app/api/socket/route.ts`](frontend/app/api/socket/route.ts)                         |
| Game logic           | [`frontend/app/api/socket/game-events-modules/index.ts`](frontend/app/api/socket/game-events-modules/index.ts) |
| Trading store        | [`frontend/games/hyper-swiper/game/stores/trading-store-modules/index.ts`](frontend/games/hyper-swiper/game/stores/trading-store-modules/index.ts) |
| Game constants       | [`frontend/games/hyper-swiper/game/constants.ts`](frontend/games/hyper-swiper/game/constants.ts) |
| Base Name resolver   | [`frontend/hooks/useBaseName.ts`](frontend/hooks/useBaseName.ts)                               |
| Multiplayer patterns | [`.claude/rules/multiplayer-patterns.md`](.claude/rules/multiplayer-patterns.md)               |

## Player Identity

- **Base Mini App users**: Base Name resolved via [`useBaseName.ts`](frontend/hooks/useBaseName.ts) (read-only)
- **Web users**: Privy names for matchmaking

## Game Mechanics (Hyper Swiper)

| Aspect | Value |
|--------|-------|
| Game duration | 2.5 minutes (150,000ms) |
| Starting cash | $10 per player |
| Position collateral | $1 per position |
| Leverage | Fixed at 100X |
| Position style | Perp-style (open until game end) |
| Liquidation threshold | 80% collateral health ratio |
| Coin types | Long (▲) and Short (▼) only |

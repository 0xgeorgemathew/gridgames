# Architect Mode Rules

## Architecture Constraints

- **Socket.IO embedded**: Server at [`/api/socket/route.ts`](frontend/app/api/socket/route.ts) - cannot be deployed separately from Next.js
- **In-memory state**: No external DB for multiplayer - all room state lost on server restart
- **Separate DOMs**: Phaser and React cannot share DOM - use [`window.phaserEvents`](frontend/games/hyper-swiper/game/stores/trading-store-modules/index.ts) bridge only

## Multiplayer Reliability Patterns

| Pattern              | Purpose                      | Location                                                                           |
| -------------------- | ---------------------------- | ---------------------------------------------------------------------------------- |
| Liquidation guard    | RAII duplicate prevention    | [`game-events-modules/index.ts`](frontend/app/api/socket/game-events-modules/index.ts) |
| Timer tracking       | Memory leak prevention       | `GameRoom.timeouts`/`GameRoom.intervals`                                           |
| Seeded RNG           | Deterministic coin sequences | [`SeededRandom.ts`](frontend/app/api/socket/game-events-modules/SeededRandom.ts)   |
| State caching        | Async stability              | Cache at position creation, not settlement                                          |
| Liquidation monitor  | Real-time position checks    | `checkLiquidations()` on every price update                                         |

## Game Mechanics (Hyper Swiper)

| Aspect               | Value                              |
| -------------------- | ---------------------------------- |
| Game duration        | 2.5 minutes (150,000ms)            |
| Starting cash        | $10 per player                     |
| Position collateral  | $1 per position                    |
| Leverage             | Fixed at 100X                      |
| Position style       | Perp-style (open until game end)   |
| Liquidation          | 80% collateral health ratio        |
| Coin types           | Long (▲) and Short (▼) only        |

## Scaling Considerations

- Single-server Socket.IO limits horizontal scaling
- CORS uses origin reflection for Mini App iframe compatibility
- Three.js background at 60fps impacts mobile performance

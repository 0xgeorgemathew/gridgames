# Architect Mode Rules

## Architecture Constraints

- **Socket.IO embedded**: Server at [`/api/socket/route.ts`](frontend/app/api/socket/route.ts) - cannot be deployed separately from Next.js
- **In-memory state**: No external DB for multiplayer - all room state lost on server restart
- **Separate DOMs**: Phaser and React cannot share DOM - use [`window.phaserEvents`](frontend/game/stores/trading-store.ts) bridge only

## Multiplayer Reliability Patterns

| Pattern         | Purpose                      | Location                                                         |
| --------------- | ---------------------------- | ---------------------------------------------------------------- |
| SettlementGuard | RAII duplicate prevention    | [`game-events.ts:33-72`](frontend/app/api/socket/game-events.ts) |
| Timer tracking  | Memory leak prevention       | `GameRoom.timeouts`/`GameRoom.intervals`                         |
| Seeded RNG      | Deterministic coin sequences | [`game-events.ts:81-96`](frontend/app/api/socket/game-events.ts) |
| State caching   | Async stability              | Cache at order creation, not settlement                          |

## Scaling Considerations

- Single-server Socket.IO limits horizontal scaling
- CORS wildcard (`*`) needs restriction for production
- Three.js background at 60fps impacts mobile performance

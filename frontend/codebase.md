# Codebase Reference

Minimal context for working in `frontend/`. Read this before making changes.

## What This App Is

Two multiplayer mini-games with shared match infrastructure:

- **hyper-swiper**: Slice falling long/short coins
- **tap-dancer**: Tap directional buttons in rhythm sequences

Both are head-to-head matches where players start with fixed balances, and the server is authoritative for prices, room state, and settlement.

## Runtime Flow

```
Next.js route → Game Client (Zustand + Socket.IO) → Phaser Scene → Game Systems
                                    ↓
              Server: app/api/socket/multiplayer/ (room registry, game loop, settlement)
```

## Folder Structure

| Folder                        | Purpose                                                      |
| ----------------------------- | ------------------------------------------------------------ |
| `domains/hyper-swiper/`       | Hyper Swiper game logic, state, Phaser systems               |
| `domains/tap-dancer/`         | Tap Dancer game logic, state, Phaser systems                 |
| `domains/match/`              | Shared match rules, position UX, events (used by both games) |
| `platform/ui/`                | Shared UI: canvas bootstrapping, toasts, backgrounds         |
| `platform/game-engine/`       | Game registration, runtime bootstrap                         |
| `platform/auth/`              | Privy/Mini App auth                                          |
| `platform/utils/`             | Helpers (`cn()`, formatting)                                 |
| `app/api/socket/multiplayer/` | Authoritative server: matchmaking, rooms, settlement         |

**Placement rule**: Game/match logic → `domains/`. Reusable infrastructure → `platform/`.

## Key Files by Task

| Task                    | Start Here                                                                                               |
| ----------------------- | -------------------------------------------------------------------------------------------------------- |
| Matchmaking/lobby       | [`app/api/socket/multiplayer/index.ts`](app/api/socket/multiplayer/index.ts)                             |
| Room state              | [`app/api/socket/multiplayer/room.manager.ts`](app/api/socket/multiplayer/room.manager.ts)               |
| Game-end/settlement     | [`app/api/socket/multiplayer/settlement.server.ts`](app/api/socket/multiplayer/settlement.server.ts)     |
| Position opening limits | [`domains/match/position-opening.ts`](domains/match/position-opening.ts)                                 |
| Shared position cards   | [`domains/match/client/phaser/positions/`](domains/match/client/phaser/positions/)                       |
| Hyper Swiper gameplay   | [`domains/hyper-swiper/client/state/slices/index.ts`](domains/hyper-swiper/client/state/slices/index.ts) |
| Tap Dancer gameplay     | [`domains/tap-dancer/client/state/slices/index.ts`](domains/tap-dancer/client/state/slices/index.ts)     |
| Add new game            | [`platform/game-engine/register-core-games.ts`](platform/game-engine/register-core-games.ts)             |
| Phaser bootstrap        | [`platform/ui/GameCanvasClient.tsx`](platform/ui/GameCanvasClient.tsx)                                   |

## Game Structure Pattern

Each game follows this pattern:

```
domains/<game>/
├── client/
│   ├── state/slices/index.ts     # Zustand store (start here for client state)
│   ├── phaser/
│   │   ├── scenes/TradingScene.ts      # Phaser entry point
│   │   └── systems/TradingSceneServices.ts  # System coordinator
│   └── components/*Client.tsx    # Page-level React component
└── plugin/definition.ts          # Game registration metadata
```

## Critical Contracts

Change carefully - check both sides:

- Socket payloads: [`app/api/socket/multiplayer/events.types.ts`](app/api/socket/multiplayer/events.types.ts)
- Match events: [`domains/match/events.ts`](domains/match/events.ts)
- Game definitions: [`platform/game-engine/core/types.ts`](platform/game-engine/core/types.ts)

## Working Rules

- Don't run dev server (assume it's running)
- Commands: `bun run types`, `bun run format`
- Use `@/` imports
- TypeScript strict is off → add explicit null checks

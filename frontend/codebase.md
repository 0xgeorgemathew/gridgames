# Codebase Reference

Minimal context for working in `frontend/`. Read this before making changes.

## What This App Is

Multiplayer arcade games with shared match infrastructure:

- **hyper-swiper**: Slice falling long/short coins
- **tap-dancer**: Tap directional buttons in rhythm sequences

**stock-arcade** is Stock Ninja, a simulated stock-collection prototype with adjustable bets per caught token at `/stock-arcade`; it uses local React disc motion and the same native transport, lobby, and per-match DO wrapper.

The original games are head-to-head matches where players start with fixed balances, and the server is authoritative for prices, room state, and settlement.

## Runtime Flow

```
TanStack Start route → Game Client (Zustand + native WebSocket) → Phaser Scene → Game Systems
                                    ↓
              Server: app/api/socket/multiplayer/ (room registry, game loop, settlement)
```

## Folder Structure

| Folder                        | Purpose                                                            |
| ----------------------------- | ------------------------------------------------------------------ |
| `domains/hyper-swiper/`       | Hyper Swiper game logic, state, Phaser systems                     |
| `domains/tap-dancer/`         | Tap Dancer game logic, state, Phaser systems                       |
| `domains/match/`              | Shared match rules, position UX, events (used by both games)       |
| `platform/ui/`                | Shared legacy matchmaking/HUD/results, canvas, toasts, backgrounds |
| `platform/game-engine/`       | Game registration, runtime bootstrap                               |
| `platform/auth/`              | Privy/Mini App auth                                                |
| `platform/utils/`             | Helpers (`cn()`, formatting)                                       |
| `app/api/socket/multiplayer/` | Authoritative server: matchmaking, rooms, settlement               |

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
- TypeScript strict is on → maintain typed payloads and null checks

## Deployment Runtime

TanStack Start/Router and Vite build the Workers frontend. `worker/index.ts` delegates `/api/socket`
to the hibernating `Lobby` Durable Object and room paths to per-match `GameRoom` objects; `platform/multiplayer/` owns the event transport.
See `../docs/cloudflare-migration.md` for deployment and restart limitations.

## Stock Ninja

The stock mode contains twenty verified canonical stocks and direct USDG scoring pools. `shared/sequence.ts` creates the per-room shared shuffle; `server/match.ts` owns three-disc scheduling, unique claims, adjustable bets and dollars spent/reserved against the $10 budget. There is no stock position-slot inventory. The stable route/game slug is `stock-arcade`.

The left floating bet pill selects $0.25/$0.50/$1/$2 per caught token through `set_catch_cost`; `arcade_bet` acknowledges the request after publishing the authoritative bag. The right wallet pill shows available simulated USDG. Each catch captures its cost before awaiting its quote; request input, validation, reservation, debit and failure release use that captured amount. Older bag snapshots default to $1. Client catches carry the expected confirmed cost and pause during bet confirmation. Local `client/claim-budget.ts` reserves individual costs until the ordered server ledger/ack takes over.

Stock keeps untinted SVG company logos and original segmented TRON rims, 88–112px responsive diameters and diagonal ballistic tosses. The server randomizes heights, spin, common direction/drift and bounded release offsets; horizontally separated lanes remain readable at 320px. Flight speed is another 25% slower than the prior version (4977.78ms full flight, 4800ms batches). Late-round cutoff clips the arc without accelerating it. `client/StockGrid.tsx` owns the brighter navy/cyan field: compositor-only vertical travel, junction dots, scan illumination and sparse sparks pause hidden, reduced-motion and outside live play. Both measured HUD boundaries reserve arena space; expanded bet/bag/settings panels overlay without resizing it.

`client/music.ts` and `use-stock-music.ts` retain the original looping track with gesture, mute, visibility and cleanup handling. A local 520ms progressive de-rez fragments the original disc logo/rim, while quote outcomes remain HUD-only (`client/contact-feedback.ts`, `contact-sound.ts`, `howler-audio.ts`). The playfield has no financial graph. See `../docs/stock-ninja-ui-motion-2026-10-10.md` for the current UI/motion change and multiplier discussion, `../docs/stock-ninja-contact.md` for contact design and `../docs/stock-ninja-assets.md` for canonical-pool evidence.

Stock gameplay rendering lives in `client/StockArena.tsx`: one RAF writes disc transforms using cached geometry and a monotonic presentation clock (`client/presentation-clock.ts`), while the page/HUD receive whole-second and authoritative-event updates. Contacts retain their bounded monotonic de-rez clock. `client/interrupted-match.ts` cancels interrupted active matches locally; completed results keep the original `MatchPlayer` identity across reconnect. Phaser rendering follows native refresh with fixed 60Hz physics and elapsed-time effects. See `../docs/gameplay-performance-audit-2026-10-10.md` for evidence and validation limits.

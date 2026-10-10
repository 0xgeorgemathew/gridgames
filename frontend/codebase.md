# Codebase Reference

Minimal context for working in `frontend/`. Read this before making changes.

## What This App Is

Multiplayer arcade games with shared match infrastructure:

- **hyper-swiper**: Slice falling long/short coins
- **tap-dancer**: Tap directional buttons in rhythm sequences

**stock-arcade** is Stock Ninja, a simulated $1 stock-collection prototype at `/stock-arcade`; it uses local React disc motion and the same native transport, lobby, and per-match DO wrapper.

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

The stock mode contains twenty verified canonical stocks and direct USDG scoring pools. `shared/sequence.ts` creates the per-room shared shuffle; `server/match.ts` owns three-coin drop scheduling, unique claims and dollars spent/reserved against the $10 budget. There is no stock position-slot inventory. The stable route/game slug is still `stock-arcade`. Stock coins keep local toss motion and use the original segmented TRON rim; `platform/game-engine/visuals/tron-ribbon.ts` is shared with the original Phaser laser. `client/music.ts` and `use-stock-music.ts` reuse the original looping track with gesture, mute, visibility and cleanup handling. `client/claim-budget.ts` covers unacknowledged local claims without replacing server dollar reservations. Stock uses an explicit `MatchScoreRow` variant, separate lower available simulated balance/fixed per-catch cost pills and a top opponent pill, a raised central timer and a separately scrollable confirmed bag/pending indicator; both measured HUD boundaries reserve arena space. Coins use sourced SVG company logos (see `../docs/stock-ninja-logos.md`), 88–112px responsive diameters, constant-gravity diagonal tosses at 75% of the prior speed (3733⅓ms flight/3600ms batches), and a local 520ms progressive de-rez through the original disc logo/rim into successively smaller digital fragments and HUD-only quote outcomes (`client/contact-feedback.ts`, `contact-sound.ts`, `howler-audio.ts`; current event/audio design in `../docs/stock-ninja-contact.md`). The stock playfield has no financial graph. See `../docs/stock-ninja-assets.md` for canonical-pool evidence.

Stock gameplay rendering lives in `client/StockArena.tsx`: one RAF writes disc transforms using cached geometry and a monotonic presentation clock (`client/presentation-clock.ts`), while the page/HUD receive whole-second and authoritative-event updates. Contacts retain their bounded monotonic de-rez clock. `client/interrupted-match.ts` cancels interrupted active matches locally; completed results keep the original `MatchPlayer` identity across reconnect. Phaser rendering follows native refresh with fixed 60Hz physics and elapsed-time effects. See `../docs/gameplay-performance-audit-2026-10-10.md` for evidence and validation limits.

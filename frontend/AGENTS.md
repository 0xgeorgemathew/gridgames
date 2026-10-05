# AGENTS.md
Path-scoped memory for `frontend/`.

## Read First

- `codebase.md`: canonical map of runtime flow, folder ownership, and key files
- `app/api/socket/multiplayer/AGENTS.md`: load this as well for server work
- Ignore `README.md` for project behavior; it is generic scaffold text

## Commands

Run commands from `frontend/`:

```bash
bun run types
bun run format
```

- Never run `bun run dev`; always assume the dev server is already running
- `bun run types` is the default validation step
- Use `bun run format` when your edits need formatting
- `bun run test` runs native transport and terminal lifecycle checks

## Mental Model

- Stack: Bun, Next.js App Router, React 19, Phaser, Zustand, vinext/Vite, native WebSockets, Cloudflare Workers/Durable Objects
- Product: two multiplayer games, `hyper-swiper` and `tap-dancer`, sharing match infrastructure
- Runtime flow: Next.js route -> React/Zustand client -> Phaser scene/systems -> native WebSocket multiplayer Durable Object
- The multiplayer server is authoritative for matchmaking, room state, prices, and settlement

## Placement Rules

- `domains/`: game logic and shared match logic
- `platform/`: reusable infrastructure
- `app/api/socket/multiplayer/`: authoritative multiplayer server

## Start Here

- Matchmaking and room flow: `app/api/socket/multiplayer/index.ts`
- Settlement and room state: `app/api/socket/multiplayer/settlement.server.ts`, `app/api/socket/multiplayer/room.manager.ts`
- Client game state: `domains/hyper-swiper/client/state/slices/index.ts`, `domains/tap-dancer/client/state/slices/index.ts`
- Game registration and canvas bootstrap: `platform/game-engine/register-core-games.ts`, `platform/ui/GameCanvasClient.tsx`
- Shared match behavior: `domains/match/`

## Change Rules

- Semicolons are off
- Prefer `@/` imports
- TypeScript `strict` is off, so add explicit null/undefined/shape checks
- When changing socket payloads or match events, verify both client and server contracts:
  - `app/api/socket/multiplayer/events.types.ts`
  - `domains/match/events.ts`
- When adding or wiring a game, check:
  - `platform/game-engine/core/types.ts`
  - `platform/game-engine/register-core-games.ts`

## Cloudflare Runtime

- Worker entry: `worker/index.ts`; lobby DO: `worker/lobby.ts`; room DO: `worker/game-room.ts`
- Transport adapters: `platform/multiplayer/`; same event names as game contracts
- Build: `bun run build`; focused tests: `bun run test`; binding types: `bun run cf:types`
- Deploy built config `dist/server/wrangler.json`; source config is `wrangler.jsonc`
- Deployment/limits/roadmap: `../docs/cloudflare-migration.md`
- Lobby sockets can hibernate. Active rooms use standard sockets and game timers.
- Intentional handoff preserves identity; transport failure creates a fresh session.
- Match resumption is out of scope. A restarted active room is interrupted.

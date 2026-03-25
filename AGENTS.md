# AGENTS.md
This is base mini app focused. Everything should be aligned.
Short operational guide for AI coding agents. Most work happens in `frontend/`.

## Read First

- `frontend/codebase.md`: canonical map of runtime flow, folder ownership, and key files
- `.kilocode/rules/dev-server-rule.md`: dev server rule
- Ignore `frontend/README.md` for project behavior; it is generic scaffold text

## Commands

Run commands from `frontend/`:

```bash
bun run types
bun run format
```

- Never run `bun run dev`; always assume the dev server is already running
- `bun run types` is the default validation step
- Use `bun run format` when your edits need formatting
- There is no obvious dedicated test script in `frontend/package.json`

## Mental Model

- Stack: Bun, Next.js App Router, React 19, Phaser, Zustand, Socket.IO
- Product: two multiplayer games, `hyper-swiper` and `tap-dancer`, sharing match infrastructure
- Runtime flow: Next.js route -> React/Zustand client -> Phaser scene/systems -> Socket.IO multiplayer server
- Server is authoritative for matchmaking, room state, prices, and settlement
- Placement rule:
  - `frontend/domains/`: game logic and shared match logic
  - `frontend/platform/`: reusable infrastructure
  - `frontend/app/api/socket/multiplayer/`: authoritative multiplayer server

## Start Here

- Matchmaking and room flow: `frontend/app/api/socket/multiplayer/index.ts`
- Settlement and room state: `frontend/app/api/socket/multiplayer/settlement.server.ts`, `frontend/app/api/socket/multiplayer/room.manager.ts`
- Client game state: `frontend/domains/hyper-swiper/client/state/slices/index.ts`, `frontend/domains/tap-dancer/client/state/slices/index.ts`
- Game registration and canvas bootstrap: `frontend/platform/game-engine/register-core-games.ts`, `frontend/platform/ui/GameCanvasClient.tsx`
- Shared match behavior: `frontend/domains/match/`

## Change Rules

- Semicolons are off
- Prefer `@/` imports
- TypeScript `strict` is off, so add explicit null/undefined/shape checks
- When changing socket payloads or match events, verify both client and server contracts:
  - `frontend/app/api/socket/multiplayer/events.types.ts`
  - `frontend/domains/match/events.ts`
- When adding or wiring a game, check:
  - `frontend/platform/game-engine/core/types.ts`
  - `frontend/platform/game-engine/register-core-games.ts`

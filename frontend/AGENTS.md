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

- Stack: Bun, TanStack Start/Router, React 19, Phaser, Zustand, Vite, native WebSockets, Cloudflare Workers/Durable Objects
- Product: original `hyper-swiper` and `tap-dancer` Phaser games plus the isolated simulated `stock-arcade`, sharing lobby and per-match DO transport
- Runtime flow: TanStack Start route -> React/Zustand client -> Phaser scene/systems -> native WebSocket multiplayer Durable Object
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
- TypeScript `strict` is on; preserve typed payloads and explicit shape checks
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

## Pivot preview

- `src/routes/` owns TanStack page and HTTP routes; `app/` retains reusable clients and server implementations.
- `domains/stock-arcade/` owns Stock Ninja (stable `stock-arcade` URL/slug), shared clock/drop contracts, dollar budget ledger, fixed-block pricing and local motion.
- Stock has twenty verified assets, one server-shuffled deck shared by both players, three independent opportunities per launch and no position-slot state. Reserve pending dollar cost before quoting; never exceed the $10 budget.
- `platform/ui/MatchmakingAuthPanel`, `MatchScoreRow`, `MatchResultOverlay` are the original game presenters shared with stock. Preserve their established layout.
- `platform/game-engine/visuals/` owns the shared original TRON disc palette and glass-ribbon geometry. Stock keeps diagonal ballistic tosses, genuine SVG brand marks, segmented energy rims, a local 180ms slice and no financial graph. Stock music reuses the original loop, stops outside play/hidden tabs, and retains a per-game mute preference.
- `worker/quote-gate.ts` owns one aggregate API-key admission gate across all match objects.
- Source `wrangler.jsonc` targets `grid-games-pivot` at `pivot.gridgames.space`; its namespaces are separate from `grid-games`.
- No guest/auth bypass is enabled. Privy/Farcaster clients are retained.
- Stock fills and USDG settlement are simulated. Never add signing, swaps, approvals, deposits or production writes under prototype authorization.
- Quote key is a server-only Worker secret named `UNISWAP_API_KEY`; missing quotes fail without debit/credit.
- Do not push/merge main or change its production route as part of Pivot.

## Idle visual workload

- `GridScanBackground` caches at most four shader rasters for idle viewport/theme combinations and releases the renderer/context after capture. Active scans own one renderer/composer per mounted canvas; update primitive uniforms rather than recreating resources for inline arrays.
- A hidden scan renders the grid on demand. Active scans pause offscreen, in hidden tabs and for reduced motion; dispose timers, observers and GPU resources on unmount.
- Stock lobby/results use static TRON glow and no animation-clock or audio loop; live stock matches retain local animation. Measure both HUD boundaries; keep the bag touch-scrollable. Local unacknowledged claim reservations prevent optimistic budget over-catching, while the ordered server ledger/ack remains authoritative. Verify authenticated idle routes as well as public landing pages before claiming idle load is resolved.

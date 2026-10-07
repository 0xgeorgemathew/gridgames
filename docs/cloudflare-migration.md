# Cloudflare migration

## Pivot: TanStack Start and simulated Stock Ninja (7 October 2026)

The current `Pivot` branch uses TanStack Start/Router and the official Cloudflare Vite plugin. Next/Vinext/RSC dependencies and obsolete Railway build scripts are removed. Existing React/Zustand clients, Phaser engines, swipe handling, Tron styling, Privy and Farcaster integrations remain. The standalone advisory agent and Solidity contracts are unchanged; no advisory HTTP service existed, so none is invented.

The verified deployed version is `306d610d-cdb9-4edd-94e4-046f0f2de8e8`. The isolated preview is https://pivot.gridgames.space, Worker `grid-games-pivot`, account `a22fe9411b81705409eb7cdf9be367e3` (George Mathew). Source config routes only that custom hostname. Its Lobby, GameRoom and QuoteGate bindings are local to that separate Worker: no production namespace IDs, D1, R2, Queues, data migration or live funds. Main production remains `grid-games` at `gridgames.space`. No main/remote branch push is part of this work.

`src/routes/` owns page and HTTP routing, including the hidden `/.well-known/farcaster.json` route. `worker/index.ts` intercepts native WebSocket endpoints and delegates other requests to TanStack Start. Browser-only lazy loaders prevent Phaser/WebGL hydration on the server. Fonts are bundled as local static assets. TypeScript is strict.

`/stock-arcade` is an additive prototype alongside both retained games. A room DO hosts `StockMatch`, with common readiness/start/cutoff and server-shuffled shared stock opportunities. The client renders readable tossed discs and swipe trails locally, snaps a caught disc toward the bag immediately, then shows a pending marker until the live quote returns. One attempt per player/drop; each player may catch the same shared opportunity. Every successful estimate credits simulated output units and spends $1 against a $10 player budget. In-flight quotes reserve dollars in `reservedSpend` before awaiting; credit moves those dollars into `spent`, and failure releases the reservation without debit or credit. There is no stock position-slot state or independent catch-count cap. IDs and timing come from the server, not client position/price claims.

All matches use one `QuoteGate` DO for this API key. It admits at most six requests in a sliding second, persists request deduplication, backs off on 429/server errors, and strips permit/transaction payloads. It calls only `/v1/quote`, never `/swap`, `/order`, approvals or signing. API quotes may select alternate, split or multi-hop routes between the canonical USDG and stock endpoints. Route continuity, chain, protocol, amounts and complete V4 keys are validated. Actual quote pools are retained separately from the designated scoring pool, which alone sets cutoff marks. The response uses the official ClassicQuote `slippage` field; malformed estimates fail without spend. V3 and V4 protocols are selected per designated pool, not all forced through V3. The API's `autoSlippage: DEFAULT` is an estimate-only API requirement, not an agreed live-money slippage policy.

Read-only pool calls are batched through verified Multicall3 at one fixed block. Valuation has a twenty-second read budget, bounded retries and respects Retry-After without changing that block. Public RPC capacity can still cancel valuation; no quote/fill or mark is fabricated on failure. Robinhood explicitly rate-limits its public endpoint and recommends a provider for production. The preview now uses the documented credential-free public endpoint `https://robinhood.drpc.org` after the official public RPC returned 429 during ten-asset valuation. This is one configured provider, not an automatic provider switch: selected-block reads and retries remain on the same block. No new provider account, credentials or paid plan are created. Diagnostics record the RPC hostname and selected block; distinct terminal reasons identify `tie`, `empty_bags` and `valuation_unavailable`, with bounded error messages. Bag marks use integer base-unit arithmetic from designated V3 `slot0` or V4 `StateView.getSlot0` at one chain block at or before the common cutoff. V4 pool IDs are hashes of verified full keys (currencies, fee, tick spacing, zero hooks), not contract addresses. Unspent wallet cash is excluded. The winner is fixed before a simulated USDG prize record is emitted. That record is the summed mark value; it is not a claim of executable exit proceeds after fees/slippage. There are no actual swaps, custody deposits, signer keys, contract deployment or payouts. Contract custody and a Privy-managed settlement signer remain future adapters.

Demo-only conservative outcomes: quotes must finish before cutoff; a pending quote at cutoff cancels settlement, as do disconnect/leave, ties/empty bags or unavailable/stale pool reads. Real acquired-bag disposition and pending-fill eligibility are unresolved. A restarted active object is interrupted rather than resumed; intentional room/lobby handoff preserves session identity, transport failure creates a fresh one.

The twenty curated assets are META, NVDA, CRCL, SPCX, MSTR, MU, HIMS, RDDT, GOOGL, TSLA, AMZN, COIN, AAPL, COST, PLTR, GME, AMD, AMC, INTC and LLY. The first ten are retained; additions are verified against the official registry and initialized direct USDG pools at block 82349532. [Additional-pool evidence](stock-ninja-assets.md) records canonical addresses, complete V4 keys, fees and the bounded liquidity sample. Canonical addresses were checked against the official Robinhood registry; the original ten designated pools come from a bounded first-120 direct-USDG-pool ranking at 2026-10-07 01:27:59 UTC. This is not an exhaustive chain-wide top-ten claim. No venue-wide latency benchmark was run. Sources: [issuer registry](https://api.robinhood.com/rhj/assets), [issuer contract guidance](https://docs.robinhood.com/chain/contracts/), [pool dataset](https://api.geckoterminal.com/api/v2/networks/robinhood/tokens/0x5fc5360d0400a0fd4f2af552add042d716f1d168/pools), [Uniswap deployed contracts](https://github.com/Uniswap/contracts/blob/main/deployments/4663.md).

### Idle rendering and verification

Pre-game waiting and result screens retain the TRON layout/glow with static title and profile styles. Stock animation clocks run only during play; lobby and results have no RAF loop. GridScan draws its actual shader once for each viewport/theme, caches at most four rasters, then disposes and releases WebGL. Active scans use a capped 24fps renderer and unmount while hidden/offscreen or under reduced motion. Graphics failure has a static grid fallback rather than breaking navigation/authentication.

The final deployed stock lobby and landing each measured zero GL draws, zero RAF callbacks and zero mounted canvases over five seconds at 1200×900 DPR2. The harness checked active animation, unchanged renderer count on rerender, reduced motion, hidden tabs, unmount cleanup, missing WebGL and context loss. These are route-specific measurements, not a guarantee of device temperature or total Chrome GPU usage.

Validation includes strict types, lint, 39 frontend tests/24359 assertions and the unchanged advisory package's 41 tests/125 assertions. Native Workers local preview served all page routes without hydration exceptions or 390×844 horizontal overflow. Live protocol checks cover both retained games, room isolation, rejected/replayed tickets, partial handoff timeout, disconnect and fresh rematch. Existing Privy sessions stay authenticated through routing and reload. The current Stock Ninja verification is recorded below; fresh OTP/login and signed Farcaster publication remain untested.

### Stock Ninja revision and final validation

App source `8de54fd9625d67bb394dd464a7a85b58ecc44cf7` (core Stock Ninja implementation `cd16671121b0908d9855ea3d6a7b3b7f0f303556`) is deployed as version `306d610d-cdb9-4edd-94e4-046f0f2de8e8` (100% preview traffic). UI names and the document title say Stock Ninja. The stable `/stock-arcade` URL and game slug remain for existing links and transport compatibility. Selection menus contain no stock names; active discs and acquired-bag entries retain identifying tickers.

One server-owned Fisher–Yates deck contains all twenty stocks once per cycle and reshuffles each cycle. Both players receive the same drop IDs, timestamps and shuffled opportunities. Paired spawns every 1500 ms with 2800 ms windows sustain two to four uncaught readable choices; four separated columns prevent overlap down to 320 CSS pixels. Catches do not trigger refills. Toss arcs, $1 quotes, the $10 budget, replay prevention and common cutoff remain authoritative.

`MatchmakingAuthPanel`, `MatchScoreRow` and `MatchResultOverlay` are extracted from the original games and consumed by both old and stock presenters. Stock keeps the original bottom player/timer dock, floating pill/settings, opponent selection and bottom-anchored results. `platform/game-engine/visuals/tron-ribbon.ts` is the actual older Hyper Swiper ribbon geometry: glass body, tapered cyan glow, white edge cores and head light. Phaser and stock SVG renderers consume that same implementation. `tron-disc.ts` shares the original rim palette/dark core; stock rims reproduce its eight separated energy cells around white ticker cores. A bounded 350 ms cyan triangle/voxel de-resolution marks the local catch; a separate marker stays pending until the quote resolves. The financial graph remains absent from stock play.

The stock state/protocol has no obsolete slot inventory or position-slot limit. It reserves and spends dollar amounts; UI shows budget remaining and invested/pending dollars. The retained older games keep their own position rules. Uniswap `slot0`/`getSlot0` are read-only pool-pricing ABI methods, not game slot concepts.

Final live verification quoted all twenty assets across two independent $10 bags, replayed every claim without duplicate debit, observed two to four shared opportunities across 527 samples, and completed common-cutoff settlement at block **82356588**. Values were 10.000898 and 9.991379 USDG; the winner was fixed before the **19.992277 USDG simulated** prize record. No quote failures occurred in that run. Disconnect cancelled without payout. Both retained-game protocol suites passed matching, prices, positions, settlement, isolated rooms, reconnect, fresh rematch, wrong/replayed tickets and partial handoff timeout.

Native Workers preview served all routes without hydration errors or 390×844 overflow. Standalone browser fixtures using the actual new presenters/effects at 1200, 390 and 320 px verified four readable discs, six shared ribbon polygons/eight de-resolution shards, budget wording, no stock slot language, Exit cancellation and fresh budget after Play Again. These fixtures are synthetic component coverage, not authenticated game sessions. The published menu name and absence of stock names were checked in the deployed browser. The deployed stock idle route measured zero GL draws/RAF callbacks/mounted canvases during five seconds after its cached raster loaded.

Authenticated native Chrome profiles verified the themed coins, shared laser and de-resolution during actual swipes on desktop and at a 390 CSS-pixel narrow viewport. Desktop caught ten assets/$10 and completed at block **82363278**, with the two result views agreeing on 9.9884 USDG simulated prize. A full narrow-screen match caught five assets/$5 and completed at block **82365272**, with both views agreeing on Monica as winner and 5.0010 USDG simulated prize. Play Again reset budgets/bags; the next narrow-screen round accepted real quotes and Exit cancelled both views without payout. The original-panel manual opponent selection and Back flows also passed. A full narrow-screen match on the exact final pending-chip version completed four quoted catches/$4 at block **82370017**, with both views agreeing on Monica and 4.0064 USDG simulated prize; Play Again again returned both players to an empty-bag/$10-budget lobby. Both authenticated idle tabs showed **0.0–0.1% CPU** over four one-second Chrome Task Manager samples; this is not a device-temperature guarantee. Fresh OTP/login and signed Farcaster publication remain untested. Real quotes and fills remain separate: a provider timeout must fail without spend, and no live funds or signing are implemented.

### Preview operations

From `frontend/`:

```sh
bun install --frozen-lockfile
bun run cf:types
bun run types
bun run lint
bun run test
bun run build
bunx wrangler deploy --dry-run --config dist/server/wrangler.json
bunx wrangler deploy --config dist/server/wrangler.json
```

User enters the existing key through Wrangler's stdin prompt, never chat or command arguments:

```sh
bunx wrangler secret put UNISWAP_API_KEY --name grid-games-pivot --config wrangler.jsonc
```

Only public `NEXT_PUBLIC_` settings are compiled into the client. `.env.local`, `.dev.vars`, local profiles and generated assets stay ignored. No unused Privy/Gelato credentials are uploaded. Original Privy/Farcaster auth remains. Guest-mode exploration was removed; testing uses George and Monica’s existing authenticated Chrome profiles. A preview Farcaster signed account association is separately needed if registering the preview as a published Mini App; the apex's signed association is not reused for the different hostname.

Official integration references: [Cloudflare TanStack Start guide](https://developers.cloudflare.com/workers/framework-guides/web-apps/tanstack-start/), [TanStack server routes](https://tanstack.com/start/latest/docs/framework/react/guide/server-routes), [Uniswap quote API](https://developers.uniswap.org/docs/api-reference/aggregator_quote), [Robinhood RPC settings](https://docs.robinhood.com/chain/connecting/), [dRPC public Robinhood endpoint](https://drpc.org/chainlist/robinhood-mainnet-rpc).

## Earlier production history (preserved; not the Pivot deployment target)

The frontend runs on Cloudflare Workers with vinext, Vite and a native WebSocket
multiplayer Durable Object. The worker is `grid-games` in the George Mathew account
(`a22fe9411b81705409eb7cdf9be367e3`). Contracts and the standalone `ai-agent`
library are unchanged. No advisory HTTP service existed in the app, so this
migration does not create one or change its OpenAI provider.

## Current rollback baseline (2026-10-05)

Both games use their restored Tron interface. The per-room Cloudflare runtime is
unchanged. Source baseline: `30925b596ee4d5babf66314ba4bc8a0b6ec04f2e`.
Known-good Worker version: `e6feed7b-5594-45ca-a194-8b05eb5d7503`.

A GitHub `main` push starts the existing Cloudflare production build. Its build
command is `cd frontend && bun install --frozen-lockfile && bun run build`.
Its deploy command is `npx wrangler deploy --config frontend/dist/server/wrangler.json`.
Public frontend variables are set in the Cloudflare build environment. Private
local files remain excluded. Do not start a second deployment while its job runs.

## Earlier deployment record

Deployed on 2026-10-03 UTC:

- Primary application: https://gridgames.space
- Worker URL: https://grid-games.mathew.workers.dev
- Worker version: `623825eb-e91b-4464-86eb-1bc58477edfe`
- Apex route: `gridgames.space/*` → `grid-games`
- Route ID: `b1fde60963b147d1b81a15e5d3105aa5`
- Lobby SQLite namespace: `8c2223173aef4f239d1e6417a4ec6058`
- Room SQLite namespace: `bb6f3df9b66a42e4a74283f727990e2b`
- Retained old SQLite namespace: `254fa817a7f349188d991344886809fc`
- Previous Worker version: `d6fa9926-9d1b-4293-bebb-ff8c2bb480c6`

The real browser adapter passed two-client checks for both games: lobby, manual
and automatic matching, start, live BTC prices, positions, results, abort and fresh
connection identity. Concurrent rooms passed action and terminal isolation checks.
Seat-ticket rejection, partial join timeout, return identity and a new match after
timeout were checked. No blockchain transaction was sent.

The production build, types, binding type generation and Wrangler dry run passed.
Sixteen tests passed with 83 assertions. These include cold lobby reconstruction,
reservation races, timer/feed cleanup and both actual game stores. Idle runtime
created zero game timers. Abort cleared active timers and closed its feed.

The apex browser showed both cards and the Privy login modal. A fresh browser run
reported no page exceptions or failed app assets. Both normal game routes redirect
an unauthenticated player to login. There is no normal guest game flow, so visible
match entry and results were not tested with a signed-in identity. Store and adapter
tests cover the timeout and return behavior without an external login.

A read-only production SQLite query confirmed a new room's completed marker and
its game-over payload. The old namespace still holds eight completed and four
aborted records. Cold active-room interruption was tested in the object constructor
test, not by forcing a production restart. Physical hibernation and billing savings
were not measured. No private values appeared in the final 644 JavaScript files.
FC association values were empty locally, so the
existing signed fallback was retained. No unused Privy/Gelato credentials were
uploaded. `api/auth` uses Farcaster's public JWT verifier and needs no Privy private
key: missing authorization returns 401. Its existing malformed-token generic-error
branch returns 500; a valid signed identity was not submitted during verification.

## Build and deploy

From `frontend/`:

```sh
bun install --frozen-lockfile
bun run cf:types
bun run types
bun run test
NEXT_PUBLIC_URL=https://gridgames.space bun run build
bunx wrangler deploy --dry-run --config dist/server/wrangler.json
bunx wrangler deploy --config dist/server/wrangler.json
bun scripts/verify-multiplayer.ts https://grid-games.mathew.workers.dev
```

Use the generated `dist/server/wrangler.json` for deployment. Edit source
`wrangler.jsonc` and `vite.config.ts`, never generated output. Public variables
(`NEXT_PUBLIC_PRIVY_APP_ID`, Base RPC URLs) must be available at build time.
Only `NEXT_PUBLIC_` variables enter the client build. Private `.env.local`,
`.dev.vars`, `dist/` and local `.wrangler/` data must remain ignored.

The application does not currently use its old Privy server private keys or
Gelato key. Do not upload unused credentials. The Farcaster account association
can use `FC_HEADER`, `FC_PAYLOAD`, `FC_SIGNATURE` Workers secrets; these are public
signed association values, not an instruction to expose other secrets. Optional
`NEYNAR_API_KEY` preserves the existing webhook verifier choice; without it the
existing public hub verifier remains in use.

The default scripts no longer invoke a Node HTTP/Socket.IO server. Do not run
`bun run dev` during agent work. A scoped production-build Wrangler local preview
is allowed for verification; stop it after the checks. It uses local DO storage,
not production storage.

## Transport and state

`/api/socket` accepts standard WebSocket upgrades. Frames are JSON objects with
`event` and `args` fields. The adapter retains existing game event names and
payloads, direct socket-id messages, room broadcasts, and lobby broadcasts.
Envelopes are limited to 64 KiB. Reserved transport events cannot be spoofed by
clients. The server also limits messages per connection and validates browser
origins against the request origin and `ALLOWED_ORIGINS`.

Both games connect to the current origin. The browser adapter establishes identity
from the server handshake, cleans up old connections/listeners, and reconnects
with a **new** player identity. It never replays game actions from an interrupted
match. Disconnection clears local match state and returns the player to matchmaking.

`Lobby:global-v1` owns the waiting pool. Its WebSockets use the Cloudflare
hibernation API. Waiting metadata lives in socket attachments. The lobby has no
repeating JavaScript timer and no market connection. Healthy waiting clients can
stay connected while the object sleeps. A new instance reads those attachments.

Each match gets a new `GameRoom` object. The lobby saves a seat reservation before
it calls that object. The room stores two single-use seat tickets and a 15-second
join deadline. The browser adapter moves its socket directly to the room. Both
seats must connect before the room emits `match_found` and starts the price feed.
Game actions do not pass through the lobby. Each room owns one manager, one price
feed and its game timers. Binance BTC aggTrade remains the market source.

On completion or abort, the room records the terminal event, stops its game timers,
closes the market socket, and sends clients back to the lobby. A one-use return
credential keeps the same player ID during this intentional move. It does not
trigger the app's reconnect handler or clear the result screen. Ordinary transport
failure clears the match and reconnects with a fresh ID. Lost game actions are
never replayed. A failed or partial handoff expires and aborts the pending room.

Each room retains one lifecycle row and its terminal event payloads in SQLite.
An active room restart changes its marker to `interrupted` and rejects seat joins.
There is no match restoration or match resumption. The old `Multiplayer` namespace
retains its prior history. Its retired class starts no timers or game runtime.

## Idle behavior and services

The app uses one Worker, static Worker assets, a SQLite lobby namespace, and a
SQLite room namespace. The old SQLite namespace remains for history. There is no
D1, R2, KV, Queue or Workflow resource for this app.

HTTP requests start Worker execution. The lobby can sleep between socket events.
A future storage alarm wakes an object when needed; it does not act as a repeating
JavaScript timer. Active rooms use standard WebSockets and game timers, so they
remain active during play. Terminal rooms release those sockets and timers.
SQLite records remain in storage. These are lifecycle rules, not measured billing
savings or proof that a specific idle instance has physically hibernated.

The Railway project and service still exist. The production service reports zero
active deployments. Its custom domain and the apex CNAME remain configured. No
Railway service was deleted or scaled during this work. The retained DNS origin
is not a running fallback. On 2026-10-05 its GitHub source was disconnected to
stop legacy Git deployments. The service, variables, config and DNS remain.
The former source was `0xgeorgemathew/gridgames`, with root `/frontend`.

The live product uses synthetic game balances. It does not escrow, transfer or
settle actual tokens. Funding-readiness and result-handoff modules contain unfinished
non-live economic scaffolding and remain dormant. Notification webhook tokens also
retain their existing temporary in-memory behavior; no notification sender exists.

Vinext compatibility scanning passes, but runtime verification remains necessary.
Its RSC build requires aligned React/React DOM/react-server-dom-webpack versions
(currently 19.3.0). Privy's transitive `rpc-websockets` package only exports browser
and Node conditions, so the Vite alias selects its browser entry for the wallet
client graph; both Worker SSR responses and browser hydration must be checked.
Phaser ESM namespace imports preserve its client-only canvas loading.

## Safe rollback commands

Run from the repository root. These commands make a plan by default:

```sh
bun run rollback:plan
bun run rollback:source <reviewed-release-commit>
bun run rollback:worker e6feed7b-5594-45ca-a194-8b05eb5d7503
```

For source rollback, inspect the listed diff. Use a self-contained release commit.
Do not revert the combined migration/redesign commit `06ee095`: that would remove
the Cloudflare runtime. If the tree is clean, a forward revert can then be made:

```sh
bun run rollback:source <reviewed-release-commit> --execute
# Review the new commit, then use a normal git push origin main.
```

The source command refuses dirty trees and merge commits. It never resets history,
force-pushes or drops uncommitted changes. On a conflict, inspect `git status` and
resolve it or use `git revert --abort`. The normal pre-commit hook remains enabled.

Worker rollback is separate from source rollback. First install dependencies and
build the compiled config in `frontend/`; a fresh clone has no `dist/server/wrangler.json`.
Check target version bindings and DO migrations. Then explicitly execute:

```sh
bun run rollback:worker e6feed7b-5594-45ca-a194-8b05eb5d7503 --execute
```

This immediately changes production. It does not change Git or restore SQLite data.
A later main push can publish newer source again. This baseline uses the current
Lobby/GameRoom classes. Do not cross a DO class or storage lifecycle migration.
Use a forward fix if compatibility is unclear. Never remove a DO namespace or the
apex route to undo a release. The retained Railway service is not a live fallback.

References: [Wrangler rollback](https://developers.cloudflare.com/workers/wrangler/commands/workers/#rollback),
[rollback bindings](https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/#bindings).

## Domain cutover and rollback

First verify `https://grid-games.mathew.workers.dev`. The owned `gridgames.space`
apex currently uses a proxied Railway CNAME. The Worker route `gridgames.space/*`
directs traffic to `grid-games` while retaining that DNS origin. Do not replace
mail/DKIM/TXT records or the existing `dev.gridgames.space` tunnel.

Prefer a forward corrective deployment that keeps all current DO classes and
bindings. A previous-version rollback is not automatic after a new SQLite class
migration. Check provider rollback support and test the target version first. Do not remove the apex route
as a rollback step: Railway has no active deployment. The old version expects its
`MULTIPLAYER` binding. Check version bindings and additive DO migrations before any
previous-version rollback. Keep the old namespace and its records. Never delete a DO namespace to
undo a code release. Clients must reload after a runtime change. Deployments can
interrupt active matches.
Privy's allowed-domain configuration already includes `gridgames.space`; a new
workers.dev or local preview host can be blocked by Privy's iframe CSP until added.

## Native roadmap

1. Add lobby shards only when actual queue load requires them.
2. Keep active rooms independent. Match resumption is outside the product scope.
3. Add real funding and settlement only as a separate reviewed economic feature.
4. If the advisory library becomes an active product feature, add an OpenAI-backed
   Worker route or an Agents SDK object. Workers AI is a separate provider choice.

There are no Cron triggers. No D1, R2, Queues or Workflows resources are needed by the current live behavior.

References: [vinext migration skill](https://github.com/cloudflare/vinext/blob/main/.agents/skills/migrate-to-vinext/SKILL.md),
[Next.js on Workers](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/),
[WebSocket API](https://developers.cloudflare.com/workers/runtime-apis/websockets/),
[Durable Object lifecycle](https://developers.cloudflare.com/durable-objects/concepts/durable-object-lifecycle/),
[DO rules](https://developers.cloudflare.com/durable-objects/best-practices/rules-of-durable-objects/),
[DO alarms](https://developers.cloudflare.com/durable-objects/api/alarms/),
[Wrangler configuration](https://developers.cloudflare.com/workers/wrangler/configuration/),
[Vite SSR conditions](https://vite.dev/config/ssr-options.html#ssr-resolve-conditions).

### Visual continuity on Pivot

The existing TRON theme, original game cards, grid background, lobby headings, profile/back controls, full-screen arena, and bottom HUD remain the presentation baseline. Stock Ninja uses those same patterns with stock identifiers, quote-pending feedback, bags and dollar budgets. The final stock mode reuses the actual legacy matchmaking panel, score row and result overlay rather than only their fonts and colors. Legacy Hyper Swiper and Tap Dancer visuals and Phaser engines are retained.

Quote execution routes and scoring pools are distinct. Real CLASSIC quotes may use other pools or multi-hop routes, with exact canonical endpoints, chain 4663, allowed V3/V4 protocols, route continuity, bounded raw output and auto-slippage estimates validated. Scoring still reads the designated pools at one common cutoff block. No transaction payloads are retained. Fixed-block valuation aggregates public RPC reads through the verified Multicall3 deployment to avoid per-call request bursts. The preview rejects quote slippage estimates above 5%; this technical guard is not an agreed live-trading default. A missing quote, stale/unavailable cutoff price, tie or unresolved pending claim cancels the prototype payout.

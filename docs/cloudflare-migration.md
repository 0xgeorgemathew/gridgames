# Cloudflare migration

## Pivot: TanStack Start and simulated Stock Ninja (7 October 2026)

The current `Pivot` branch uses TanStack Start/Router and the official Cloudflare Vite plugin. Next/Vinext/RSC dependencies and obsolete Railway build scripts are removed. Existing React/Zustand clients, Phaser engines, swipe handling, Tron styling, Privy and Farcaster integrations remain. The standalone advisory agent and Solidity contracts are unchanged; no advisory HTTP service existed, so none is invented.

The verified deployed version is `79cca9b0-84b0-4d3e-b265-2ce797f38ac3` (app source `78327ffd8e65a6afa96b8aa020a20a9cd1f60646`). The current contact effects and audio verification are recorded at the end of this document; earlier visual iterations below are historical. The isolated preview is https://pivot.gridgames.space, Worker `grid-games-pivot`, account `a22fe9411b81705409eb7cdf9be367e3` (George Mathew). Source config routes only that custom hostname. Its Lobby, GameRoom and QuoteGate bindings are local to that separate Worker: no production namespace IDs, D1, R2, Queues, data migration or live funds. Main production remains `grid-games` at `gridgames.space`. No main/remote branch push is part of this work.

`src/routes/` owns page and HTTP routing, including the hidden `/.well-known/farcaster.json` route. `worker/index.ts` intercepts native WebSocket endpoints and delegates other requests to TanStack Start. Browser-only lazy loaders prevent Phaser/WebGL hydration on the server. Fonts are bundled as local static assets. TypeScript is strict.

`/stock-arcade` is an additive prototype alongside both retained games. A room DO hosts `StockMatch`, with common readiness/start/cutoff and server-shuffled shared stock opportunities. The client renders readable tossed discs and swipe trails locally. A short slice effect stays at the catch point; pending quote dollars remain in a fixed HUD indicator until the live quote returns. One attempt per player/drop; each player may catch the same shared opportunity. Every successful estimate credits simulated output units and spends $1 against a $10 player budget. In-flight quotes reserve dollars in `reservedSpend` before awaiting; credit moves those dollars into `spent`, and failure releases the reservation without debit or credit. There is no stock position-slot state or independent catch-count cap. IDs and timing come from the server, not client position/price claims.

All matches use one `QuoteGate` DO for this API key. It admits at most six requests in a sliding second, persists request deduplication, backs off on 429/server errors, and strips permit/transaction payloads. It calls only `/v1/quote`, never `/swap`, `/order`, approvals or signing. API quotes may select alternate, split or multi-hop routes between the canonical USDG and stock endpoints. Route continuity, chain, protocol, amounts and complete V4 keys are validated. Actual quote pools are retained separately from the designated scoring pool, which alone sets cutoff marks. The response uses the official ClassicQuote `slippage` field; malformed estimates fail without spend. V3 and V4 protocols are selected per designated pool, not all forced through V3. The API's `autoSlippage: DEFAULT` is an estimate-only API requirement, not an agreed live-money slippage policy.

Read-only pool calls are batched through verified Multicall3 at one fixed block. Valuation has a twenty-second read budget, bounded retries and respects Retry-After without changing that block. Public RPC capacity can still cancel valuation; no quote/fill or mark is fabricated on failure. Robinhood explicitly rate-limits its public endpoint and recommends a provider for production. The preview now uses the documented credential-free public endpoint `https://robinhood.drpc.org` after the official public RPC returned 429 during ten-asset valuation. This is one configured provider, not an automatic provider switch: selected-block reads and retries remain on the same block. No new provider account, credentials or paid plan are created. Diagnostics record the RPC hostname and selected block; distinct terminal reasons identify `tie`, `empty_bags` and `valuation_unavailable`, with bounded error messages. Bag marks use integer base-unit arithmetic from designated V3 `slot0` or V4 `StateView.getSlot0` at one chain block at or before the common cutoff. V4 pool IDs are hashes of verified full keys (currencies, fee, tick spacing, zero hooks), not contract addresses. Unspent wallet cash is excluded. The winner is fixed before a simulated USDG prize record is emitted. That record is the summed mark value; it is not a claim of executable exit proceeds after fees/slippage. There are no actual swaps, custody deposits, signer keys, contract deployment or payouts. Contract custody and a Privy-managed settlement signer remain future adapters.

Demo-only conservative outcomes: quotes must finish before cutoff; a pending quote at cutoff cancels settlement, as do disconnect/leave, ties/empty bags or unavailable/stale pool reads. Real acquired-bag disposition and pending-fill eligibility are unresolved. A restarted active object is interrupted rather than resumed; intentional room/lobby handoff preserves session identity, transport failure creates a fresh one.

The twenty curated assets are META, NVDA, CRCL, SPCX, MSTR, MU, HIMS, RDDT, GOOGL, TSLA, AMZN, COIN, AAPL, COST, PLTR, GME, AMD, AMC, INTC and LLY. The first ten are retained; additions are verified against the official registry and initialized direct USDG pools at block 82349532. [Additional-pool evidence](stock-ninja-assets.md) records canonical addresses, complete V4 keys, fees and the bounded liquidity sample. Canonical addresses were checked against the official Robinhood registry; the original ten designated pools come from a bounded first-120 direct-USDG-pool ranking at 2026-10-07 01:27:59 UTC. This is not an exhaustive chain-wide top-ten claim. No venue-wide latency benchmark was run. Sources: [issuer registry](https://api.robinhood.com/rhj/assets), [issuer contract guidance](https://docs.robinhood.com/chain/contracts/), [pool dataset](https://api.geckoterminal.com/api/v2/networks/robinhood/tokens/0x5fc5360d0400a0fd4f2af552add042d716f1d168/pools), [Uniswap deployed contracts](https://github.com/Uniswap/contracts/blob/main/deployments/4663.md).

### Idle rendering and verification

Pre-game waiting and result screens retain the TRON layout/glow with static title and profile styles. Stock animation clocks run only during play; lobby and results have no RAF loop. GridScan draws its actual shader once for each viewport/theme, caches at most four rasters, then disposes and releases WebGL. Active scans use a capped 24fps renderer and unmount while hidden/offscreen or under reduced motion. Graphics failure has a static grid fallback rather than breaking navigation/authentication.

The final deployed stock lobby and landing each measured zero GL draws, zero RAF callbacks and zero mounted canvases over five seconds at 1200×900 DPR2. The harness checked active animation, unchanged renderer count on rerender, reduced motion, hidden tabs, unmount cleanup, missing WebGL and context loss. These are route-specific measurements, not a guarantee of device temperature or total Chrome GPU usage.

Validation includes strict types, lint, 45 frontend tests/16245 assertions and the unchanged advisory package's 41 tests/125 assertions. Native Workers local preview served all page routes without hydration exceptions or 390×844 horizontal overflow. Live protocol checks cover both retained games, room isolation, rejected/replayed tickets, partial handoff timeout, disconnect and fresh rematch. Existing Privy sessions stay authenticated through routing and reload. The current Stock Ninja verification is recorded below; fresh OTP/login and signed Farcaster publication remain untested.

### Earlier approved coin, music and HUD corrections

App commit `6f3d27e1732fac34d9ea773e1ab156d3b047a6d7` is deployed as version
`80788e4f-4505-42aa-aff6-bd963abdaa20`, verified at 100% isolated preview traffic.
The published `StockArcadeClient-B3_3RlZO.js` checksum matches the built app;
all twenty published brand SVGs match the checked-in source assets and the
original `/audio/digital_dividend.mp3` is available. Production is unchanged.

Each server launch contains three independent opportunities every 2700ms, with
unchanged 2800ms catch windows. Larger 88–112px coins follow diagonal paths with
constant gravity and continuous angular momentum; the higher central toss and
separated lanes remain readable down to 320px. A final-round cutoff clips the
flight without accelerating it. Catches still do not trigger a refill, and both
players receive identical shuffled drop IDs, symbols, geometry and timestamps.
The new [company vector provenance](stock-ninja-logos.md) replaces approximated
marks and generic issuer thumbnails. A restrained 180ms local de-resolution
replaces the flying pending marker. The actual shared TRON blade remains.

The user-approved HUD applies the reference's floating rounded layout only to
top/bottom controls: budget/opponent pills, settings, and a rounded bottom dock
retaining you/timer/opponent with a raised central circular timer readout. Confirmed
assets scroll horizontally, pending quote dollars occupy a distinct fixed area,
and status text has a stable height. Both HUD boundaries are measured to reserve
arena space. The stock-specific `MatchScoreRow` variant leaves older-game defaults
unchanged. A synchronous local guard covers unacknowledged claims; ordered server
ledger/claim acknowledgement transfers reservation ownership, so a multi-disc
swipe cannot temporarily imply more accepted catches than the remaining budget.

Stock music reuses the original loop at volume 0.3. It primes only from matchmaking
gestures, persists its own mute preference, pauses outside play and when hidden,
and releases media/listeners on unmount. Native Mute/Unmute toggled correctly;
the Chrome tab audio indicator disappeared when a temporary blank tab hid the
game and returned when the game became visible. Browser component tests verified
actual media decoding/playback, mute persistence and unmount cleanup without an
idle audio or animation loop.

Types, lint, 45 focused tests/16245 assertions, production build and deployment
dry-run passed. Actual presenter/effect/music browser fixtures at 320/390/1200px
verified larger coins, all twenty vectors, HUD bounds, long names, touch bag
scrolling, no flying marker, six ribbon layers/eight restrained shards, Exit and
fresh reset. These fixtures are synthetic component coverage. Published mobile
routes had no hydration/page errors or horizontal overflow; the idle stock route
measured zero GL draws, RAF callbacks and mounted canvases over five seconds.

Live stock protocol verification quoted all twenty stocks across independent
$10/$10 bags, with replay-safe ledgers and identical three-coin batches across
531 samples. At common cutoff block **82455430**, values 10.009796 and 9.995517 USDG
produced a **20.005313 USDG simulated** prize with the winner already fixed.
One quote timed out without spend; a later shared opportunity fulfilled that
asset. Disconnect cancelled without payout. Complete retained-game regression
runs passed prices/positions/settlement, independent parallel rooms, disconnect,
fresh identity/rematch, wrong/replayed tickets and partial-handoff timeout.
Initial concurrent protocol attempts timed out during matching; full sequential
reruns passed. A follow-up started three concurrent independent stock rooms in
4302 ms with identical three-coin contracts and no errors, then cancelled all
without payout.

Authenticated native desktop swipes confirmed ten catches/$10; both views agreed
at block **82457064** on the **10.0136 USDG simulated** prize. The actual 390 CSS-pixel
mobile run confirmed six catches/$6; both views agreed at block **82458554** on
**5.9949 USDG simulated**. Native capture recorded the actual three-coin trajectory
and local slice. Rematch/reset, active music menu controls, hidden/visible audio,
Exit cancellation and Back routing passed. Fresh OTP/login and signed Farcaster
publication remain untested; existing authenticated Privy profiles were reused
through normal UI without copying authentication state. No transaction signing,
live fills or financial rules were added. Fresh authenticated CPU sampling was
inconclusive after the QA windows changed layout and entered another live match
during measurement; no new per-tab CPU result is claimed. The published idle
render-work counters above and media lifecycle checks are the verified scope.

### Earlier Stock Ninja revision and validation

Previous app source `8de54fd9625d67bb394dd464a7a85b58ecc44cf7` (core Stock Ninja implementation `cd16671121b0908d9855ea3d6a7b3b7f0f303556`) was deployed as version `306d610d-cdb9-4edd-94e4-046f0f2de8e8` (100% preview traffic). UI names and the document title say Stock Ninja. The stable `/stock-arcade` URL and game slug remain for existing links and transport compatibility. Selection menus contain no stock names; active discs and acquired-bag entries retain identifying tickers.

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

## Slower tosses and original artwork refinement

The approved follow-up keeps the shared three-stock batches, $1 simulated catches,
$10 per-player cap, scoring cutoff, HUD and original music. Toss speed is now 75%
of the previous speed: full flight 2800→3733⅓ms; launch interval 2700→3600ms.
The same shared duration drives client trajectory and server expiry. The arc,
launch height, angular travel and lane separation are unchanged. A late cutoff
clips the flight rather than compressing its motion.

Stock logos no longer pass through the CSS brightness/invert filter that made
every mark white. The original source colors and gradients are retained in
scalable SVG artwork; genuine black marks sit on a neutral pale chamber. NVIDIA
uses a viewBox crop of its original green symbol for readability. See
[artwork provenance](stock-ninja-logos.md) for all twenty sources.

The slice now lasts at most 360ms rather than180ms and fractures the actual disc
core, segmented rim and original logo into32 bounded angular prism fragments.
Edges briefly illuminate, fragments separate locally (under14CSSpx even on a
112px disc), and staggered shrink/dissolve removes them. No debris travels through
the arena; no separate idle animation or GPU renderer is introduced. The original
Phaser glass blade and disc palette remain shared.

Visual references inspected: the film's disc-arena disintegration frame (the blue
program breaks into hard geometric fragments, with bright cut edges and dark
reflective interiors), [Digital Domain's original film frames and credits](https://digitaldomain.com/work/tron-legacy/),
and Disney's [2010 official trailer](https://www.youtube.com/watch?v=Wxjtr5dfl3Q).
The [reference frame](https://images3.alphacoders.com/967/thumb-1920-96795.jpg)
is film imagery used for visual review only; it is not included in the game.
This is an original lightweight2D interpretation for coin feedback, not copied
film animation.

### Earlier verified refinement deployment

App source `38541e248ffd922c6ab0e8583a3249a71aea0459` is deployed as
`99855924-8eaa-42e0-b902-1ac44f90ad1d` at 100% traffic on `grid-games-pivot`.
Published `StockArcadeClient-DDcXRkSu.js` and all 20 SVG files match the final build
byte-for-byte. No production/main/remote-Git or real-money changes were made.

Strict types, lint, build and deployment dry-run pass;47 tests / 16,543 assertions
pass, including exact 75% arc preservation and an authoritative catch during the
extended flight followed by rejection at exact expiry. Existing budget, local
reservation, duplicate, pending/late cutoff and cancellation coverage passes.
Built local Worker/DO protocol verifies the same three-coin contracts, all 20
shared stocks, dedup and disconnect cancellation. Without the local quote secret,
quotes correctly fail with no simulated debit/credit. The final preview was
restarted against the final build for page/asset checks after an earlier running
preview retained stale chunk names across a rebuild.

Live quote-backed protocol verification completed with 10 catches / $10 per player,
all 20stocks acquired across both bags, identical shared drops and at most 3
visible choices across 532 samples. Both results used block 82490462, with a
**19.994084USDG simulated** prize. Disconnect cancellation and the full retained
Hyper/Tap live suite (prices, positions, settlement, independent rooms, tickets,
reconnect and fresh rematch) pass.

Actual authenticated native Chrome UI verified 9 mobile catches / $9, with both
clients agreeing on block 82491493 and an **8.9972USDG simulated** prize. Mobile
content width was measured390 native/CSS px at 100% zoom; no profile-wide zoom was
changed. Desktop then confirmed 10 catches / $10 and refused further swipe debit,
with both clients agreeing on block 82492647 and a **9.9947USDG simulated** prize.
Fresh rematch resets, Exit cancellation for both players and lobby Back passed.
Actual screenshots show the original-color logos, larger discs and localized
fracture on desktop/mobile. A 6.04-second native mobile toss video uses measured
frame timestamp intervals (27 frames captured over 6.119 seconds), not accelerated
playback. Its low capture frame rate is an evidence limitation, not game FPS.

Actual-component synthetic fixtures at 1200/390/320px verified measured HUD
boundaries, three separated readable discs, all 20untinted logos, touch bag
scrolling, original audio loop/mute and terminal reset cleanup. Public Stock
lobby 5-second counters remained0 GL draws / 0 RAF callbacks / 0 canvases after its cached
raster. Fresh OTP/Farcaster publication and native Task Manager CPU measurements
were not repeated; do not treat those as passes. Evidence is saved in the task's
`evidence/refinement/` directory.


### Current arcade contact feedback and verification

The film de-resolution was superseded at the user's request. App commit
`bdb89916457093f251bee910af25bcd69cb5485f` replaces its renderer with a contained
180ms neon contact snap, a 220ms credited check and bag pulse, a 160ms amber
failed-quote cross, and a non-destructive budget rejection pulse. Pending contact
means an accepted local attempt, never a completed quote or acquired asset.
Failed quotes release the $1 reservation without spending or crediting. Misses,
duplicates, restored acknowledgements and stale-room events stay silent. Original
circular untinted logos, all twenty stocks, the 75% toss speed, three shared
choices, lower-left simulated balance and lower-right fixed catch-cost pill remain.
See [contact specification](stock-ninja-contact.md).

Howler 2.2.4 plays one preloaded original six-cue WAV sprite with distinct pending,
credit, failure and rejection sounds. Three pending timbres vary without implying
combos. The controller limits actual concurrent voices to three and coalesces
rapid contacts. Locked, loading, muted, hidden and inactive cues are discarded,
not replayed later. The original music retains its proven native HTMLAudioElement
backend under the same lifecycle controller: a trial of Howler streaming music
exposed an unmute/visibility play-lock race and was removed. Mute persists; hidden
and terminal states pause music, and unmount unloads owned sound resources.

Native QA exposed an older completed result losing its player lookup after a
transport reconnect assigned a new session ID. Commit
`78327ffd8e65a6afa96b8aa020a20a9cd1f60646` remembers the original player ID for that
match; new matches still capture their own ID. This is a client display correction,
not a change to server scoring or disconnect rules.

The final isolated Worker serves 100% version
`79cca9b0-84b0-4d3e-b265-2ce797f38ac3`. Published
`StockArcadeClient-BPTV-pxl.js`, twenty SVGs and original music match the build.
The original contact WAV is 48,554 bytes with SHA-256
`4376722df9fd916e3fc0839d8975fe2933c7c4f179dc7823f37c7a3eae0d0ca9`.
No production, remote Git, live-fund or namespace changes were made.

Strict types, lint, production build and Worker dry-run pass. The final suite has
53 tests / 16,595 assertions, including stable completed-match ownership, unique
local claims, silent replay/unknown acknowledgements, voice limits, stale-cue
suppression, mute/visibility/unmount and authoritative timing/budget coverage.
Actual component fixtures at 1200/390/320px verify measured HUD bounds, readable
original logos, all twenty loaded assets, touch bag scrolling and original music.
Contact frame captures verify pending/credited/failed/rejected states, reduced
motion and three-contact cleanup. Instrumented WebAudio nodes verify distinct
sprite offsets and durations; slow/failed sound loads do not block the game,
and unmount leaves zero owned Howls/effects with music paused.

Final built local Workers serve page routes and assets without hydration errors,
including the intentional canvas-only `/Test` route. Local room checks preserve
shared three-drop batches, all twenty assets, deduplication and disconnect
cancellation. Missing local quote credentials correctly produce no spend/credit;
successful quote behavior is verified on the authorized preview instead.

On the exact final version, live stock protocol checks acquired all twenty assets
across both bags, ten catches / $10 per player, identical shared opportunities
and at most three visible choices across 527 samples. Both results use block
82601020: values 9.979436 and 9.987479 USDG, with a **19.966915 USDG simulated**
prize after the winner is fixed. One timed-out quote released its reservation;
a later opportunity filled the bag. Disconnect cancellation passes. The complete
retained Hyper/Tap live suite passed on the preceding contact deployment with
unchanged server logic: prices, positions, settlement, independent rooms,
reconnect identity, intentional handoff, rematch, tickets and partial-handoff timeout.

Authenticated native Chrome on that preceding contact deployment verified desktop
ten catches / $10 with further debit refused, and unmuted mobile eight / $8.
Both agree at block 82594606 on a **17.9690 USDG simulated** prize. The exact final
version then confirmed six native catches / $6, Settings and Instructions Close,
Exit cancellation on both clients without payout, Play Again reset and Back to the
real home route. The existing mobile mute preference was restored. Full native
cap completion was not repeated after the small ownership display correction.
Normal UI sessions were reused without copying credentials or authentication state.

The final public stock lobby measured zero GL draws, RAF callbacks and canvases
over five seconds after its cached raster. Fresh OTP/Farcaster publication,
iOS Safari, native hardware sound capture and per-tab Task Manager CPU were not
verified. Component audio-node evidence does not claim a native microphone recording.
Evidence is retained under the task workspace's `evidence/contact/` directory.
The two fresh owned QA windows were closed and both owned preview/fixture processes
were stopped; externally used or unrelated windows were preserved.

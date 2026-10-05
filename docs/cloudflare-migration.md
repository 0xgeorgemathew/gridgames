# Cloudflare migration

The frontend runs on Cloudflare Workers with vinext, Vite and a native WebSocket
multiplayer Durable Object. The worker is `grid-games` in the George Mathew account
(`a22fe9411b81705409eb7cdf9be367e3`). Contracts and the standalone `ai-agent`
library are unchanged. No advisory HTTP service existed in the app, so this
migration does not create one or change its OpenAI provider.

## Release on 2026-10-05

The release includes the Cloudflare room migration and both game visual designs.
The GitHub `main` push starts the existing Cloudflare production build. The build
command stays `npm run build`. The deploy command is now
`npx wrangler deploy --config frontend/dist/server/wrangler.json`.
Public frontend variables are set in the Cloudflare build environment. Private
local files are excluded. Tests, types, lint, browser checks and visual review were
not run for this design release, at the user's request. The deployment record below
is the earlier runtime release, not a new check of the redesigned screens.

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

# Learning Memory

Use this file for durable lessons that were discovered through work rather than
written upfront as policy.

## Promotion Bar

- Add an entry only after the fact has repeated, unblocked multiple tasks, or corrected a recurring mistake
- Move stable team rules into an `AGENTS.md` file instead of storing them here
- Keep entries short, factual, and easy to verify

## Current Entries

- No promoted learning entries yet

## Cloudflare native multiplayer migration

- Native event transport is in `frontend/platform/multiplayer/`; game event payloads
  remain owned by their existing contracts. Client sockets use the current origin.
- `setupGameEvents` and market-feed state must remain per runtime instance.
- DO session reset is intentional: standard WebSockets/timers do not establish
  crash recovery. Active restarts interrupt matches. Resumption is out of scope.
- Freeze terminal rooms before cleanup/broadcast. Late client end/position/ready
  actions must not change an aborted result into a completed result.
- Deploy the generated Vite Worker config, after updating source Wrangler config;
  stale generated routing config can diverge from a dashboard/API cutover.
- Operational details and native roadmap live in `docs/cloudflare-migration.md`.

- Lobby handoff must keep the logical player ID and suppress app reconnect events.
- Hibernating lobby queue state lives in socket attachments. Future storage alarms
  do not create a repeating JavaScript timer. Terminal room cleanup closes the feed.
- Railway production has zero active deployments. Removing the Worker route does
  not provide a live rollback. Check previous Worker version bindings instead.

## Authoritative live gameplay controls

- Hyper Swiper disc IDs are shared server claims. Validate the active record,
  direction, five-second lifetime, player and capacity before consuming a disc.
  A rejected capacity check leaves it available. The existing spawn cadence owns
  expiry in both maps; a client cannot delete another player's live opportunity.
- Tap recovery starts only after a successful local-player position acknowledgement.
  Server deadlines use epoch milliseconds. Client deadlines use performance.now()
  plus the returned duration; do not compare those clock domains.
- Game balances are simulated. Opening deducts nothing; a favorable close transfers
  up to one game dollar. Remaining positions expire without transfer at round end.
- Rollback commands plan by default. Source rollback is a forward Git revert;
  Worker rollback changes production only and never restores SQLite records.
  Keep DO classes and bindings compatible. See docs/cloudflare-migration.md.

### TanStack Pivot migration

- App route discovery must include hidden `.well-known` directories; `rg --files` without `--hidden` misses Farcaster's manifest route.
- TanStack Router requires strict null checks. Pivot enables full strict TypeScript and retains explicit runtime validation.
- Use Cloudflare's Vite `ssr` environment with TanStack Start and a custom Worker entry for DO exports. Deploy the generated server config to the separate preview Worker.
- Do not feed V4 bytes32 pool IDs to V3 contract calls. Verify full key hashes and read through the chain's deployed StateView at the same cutoff block used for every bag.
- Prototype quote latency and immediate local feedback are distinct: pending art cannot imply quote-backed credit or actual executed tokens.

- Idle GPU work and idle DOM repaint work require separate checks. Zero shader draw calls do not prove a complete idle route is cheap: repeated title/profile text-shadow animation can still drive paint/compositing. Preserve the visual glow with static styles in idle screens and reserve animation loops for live gameplay. Verify a newly deployed build in the real authenticated tabs; a normal reload may not reproduce a fresh-browser result.

- Idle decorative WebGL can be cached as its real shader raster and have its context released. Keep viewport/theme cache bounded, retain active scan animation separately, and handle absent/lost WebGL without breaking page interaction. Match clocks must stop on lobby/results, not only when the background stops.
- Uniswap ClassicQuote uses `slippage`, not `slippageTolerance`. Validate against the official schema and a real preview quote before accepting compile/test success. Quote routes may differ from the designated common-cutoff scoring pool; keep those records separate.

- A successful ten-asset quote path does not prove the cutoff RPC path. Batch designated-pool reads at one selected block, honor Retry-After within a finite read budget, and require completed common-block settlement in live validation. Public provider capacity remains an external dependency. Distinguish tie and empty-acquisition outcomes from infrastructure failure.
- Protocol replay checks must await the actual room handshake before replaying its consumed ticket. A fixed 200 ms sleep can test a still-active lobby WebSocket instead, giving a false acceptance result.

- Visual continuity requires the actual established panel, HUD geometry, controls and result shell, not only typography and colors. Extract reusable presenters/visual geometry from the retained game rather than rebuilding parallel lookalikes.
- Validate multiple-choice spawn dynamics over the real room stream and the whole motion window. A screenshot with several records does not prove sustained readable choices; check concurrent visible count, unique IDs, shared timestamps and narrow-screen separation.
- Stock Ninja uses dollar reservations and spending rather than inherited position slots. Keep financial budget limits independent from how many different stocks the catalog offers; simulated quotes may fail and must release reserved dollars without credit/debit.

- Stock issuer `logoUrl` may point to a generic issuer icon. For identifiable stock discs, source real scalable brand geometry, retain provenance, and keep a ticker alongside wide wordmarks.
- Local optimistic claim guards should count only unacknowledged local cost. The authoritative server ledger publishes reservations/releases before claim acknowledgement; counting local pending and server reserved dollars together after acknowledgement would double-count.
- Prime stock media only from matchmaking gestures. Priming on every document gesture can briefly start a silent loop in lobby/results; lifecycle cleanup and stored mute behavior need real browser checks as well as media-unit coverage.

- A white stock logo can be caused by presentation filters even when its SVG is
  colored. Inspect both source artwork and CSS before replacing it. Preserve
  original colors/gradients; put genuine black marks on a neutral chamber rather
  than tinting them. Crop a verified symbol through the SVG viewBox when a wide
  corporate wordmark becomes unreadable. Keep source provenance for each asset.
- Scale both stock toss duration and launch interval together when changing speed,
  and use the same shared duration for client motion and authoritative expiry.
  Cutoff clips motion; it must not compress a late toss into a faster trajectory.

- Contact feedback must follow event ownership: local pending attempts may animate
  immediately, but credit/failure needs a unique current-room acknowledgement for
  an initiated claim. Restored ledgers and duplicate acknowledgements are silent.
  Budget rejection must preserve the still-catchable opportunity.
- Howler's pool size is a reuse pool, not an audible voice cap. Bound active sound
  IDs explicitly, discard unavailable cues rather than queuing historical sounds,
  and test actual WebAudio start offsets plus mute/visibility/unmount behavior.
- Streaming audio can enter a play-lock race when visibility changes after unmute.
  Test the browser lifecycle before replacing a proven music backend; one controller
  can own native music and Howler effects without sharing global mute/unload state.
- Completed-match UI must retain its original player identity. A transport reconnect
  may create a new session ID while the old terminal result remains visible; looking
  up that result by the new ID can lose the bag and display NaN values.

- Stock contact animation must visibly alter the original logo and rim. An intact
  fade plus an abstract mark can satisfy event assertions yet fail game feel.
  A two-half split/fade is not proper de-rez: preserve original artwork through
  successively smaller digital fragments, then collapse the pixels locally. Keep
  authoritative outcomes in the HUD; inspect timed phases and normal-speed playback
  at desktop/mobile sizes as well as ownership/accounting tests.

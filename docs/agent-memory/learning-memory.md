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

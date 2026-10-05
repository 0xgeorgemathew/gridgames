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

### Matchmaking waiting state (2026-10-05)

Both matchmaking screens derive their waiting view from the store's `isMatching`.
A local entering flag can survive request failure, room abort or disconnect and
hide retry controls. Keep only lobby navigation in local state. An authenticated
player waits for another real player in the same game with the same round length.
There is no bot or solo start. Queue cancellation currently has no acknowledgement
and cannot safely distinguish queue waiting from a reserved room handoff. Do not
show successful cancellation until the transport exposes a safe phase/ack.
The focused screen/store regression is `platform/multiplayer/matchmaking-ui.test.tsx`.

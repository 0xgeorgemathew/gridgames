# AGENTS.md

Path-scoped memory for the authoritative multiplayer server.

## Scope

This directory owns matchmaking, room lifecycle, price updates, settlement, and
result handoff. Keep authoritative game decisions here, not in the client.

## Read First

- `index.ts`: event bootstrap and matchmaking flow
- `room.manager.ts`: room state transitions and orchestration
- `settlement.server.ts`: match-end settlement
- `events.types.ts`: server payload contract
- `@/domains/match/events.ts`: mirrored client-side event contract

## Invariants

- The server is authoritative for room state, pricing, and settlement
- Event-name and payload changes must stay in sync across server and client
- Preserve explicit null/undefined checks; frontend TypeScript strict mode is on
- Prefer additive changes to room state over ad hoc flags spread across files

## Change Checklist

- If you change emitted payloads, update both `events.types.ts` and `@/domains/match/events.ts`
- If you change settlement rules, inspect `settlement.server.ts`, `room.manager.ts`, and any result handoff/store files touched by the flow
- If you change game loop timing or room progression, verify `game-loop.server.ts`, `match-state.server.ts`, and `game-rules.server.ts`
- Run `cd frontend && bun run types` after changes

## Native Runtime

- `setupGameEvents` receives a transport facade and an outbound market socket connector.
- Manager and price-feed state are per runtime instance, never module singletons.
- The DO wrapper persists lifecycle/result events before broadcasting them.
- Disconnect aborts an active match; completed rooms must not be aborted again.

- The worker allowlist blocks matchmaking events in a game room. Each room runtime
  can start one match only. Lobby matching uses durable reservations before awaits.
- No permanent cleanup interval. Terminal cleanup clears all tracked game timers
  and the outbound price feed. Active restart is interruption, never restoration.

- Stock arcade uses `domains/stock-arcade/server/match.ts` within the same room DO wrapper. It does not use the legacy leveraged-position reducer or BTC feed.
- Acquired stock units are simulated quote estimates, not tokens held onchain. Pending/failure never credits a bag.
- Persist authoritative ledger snapshots before broadcasting credits. Reject actions after common cutoff. Ambiguous pending cutoff, ties and disconnects cancel demo settlement.

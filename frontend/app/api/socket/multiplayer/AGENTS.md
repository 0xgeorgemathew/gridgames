# AGENTS.md
Path-scoped memory for the authoritative multiplayer server.

## Scope

This directory owns matchmaking, room lifecycle, price updates, settlement, and
result handoff. Keep authoritative game decisions here, not in the client.

## Read First

- `index.ts`: socket bootstrap and matchmaking flow
- `room.manager.ts`: room state transitions and orchestration
- `settlement.server.ts`: match-end settlement
- `events.types.ts`: server payload contract
- `@/domains/match/events.ts`: mirrored client-side event contract

## Invariants

- The server is authoritative for room state, pricing, and settlement
- Event-name and payload changes must stay in sync across server and client
- Preserve explicit null/undefined checks; frontend TypeScript strict mode is off
- Prefer additive changes to room state over ad hoc flags spread across files

## Change Checklist

- If you change emitted payloads, update both `events.types.ts` and `@/domains/match/events.ts`
- If you change settlement rules, inspect `settlement.server.ts`, `room.manager.ts`, and any result handoff/store files touched by the flow
- If you change game loop timing or room progression, verify `game-loop.server.ts`, `match-state.server.ts`, and `game-rules.server.ts`
- Run `cd frontend && bun run types` after changes

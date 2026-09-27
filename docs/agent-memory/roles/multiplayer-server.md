# Multiplayer Server Role Memory

Use this guide for tasks in `frontend/app/api/socket/multiplayer/` and any
shared match contract changes that affect both client and server.

## Focus

- Keep authority on the server
- Change room, event, and settlement flows deliberately
- Prefer explicit state transitions over loosely coordinated flags

## Checks

- Read `frontend/AGENTS.md` and `frontend/app/api/socket/multiplayer/AGENTS.md`
- Verify both `frontend/app/api/socket/multiplayer/events.types.ts` and `frontend/domains/match/events.ts`
- Run `cd frontend && bun run types`

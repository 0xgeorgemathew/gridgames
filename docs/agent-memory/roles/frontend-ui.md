# Frontend UI Role Memory

Use this guide for tasks in `frontend/app/`, `frontend/platform/ui/`, or client
components under `frontend/domains/*/client/`.

## Focus

- Preserve the established visual language unless the task is explicitly a redesign
- Keep reusable UI concerns in `platform/`; keep game-specific behavior in `domains/`
- Watch for client/server contract changes that silently leak into UI state

## Checks

- Read `frontend/AGENTS.md` and `frontend/codebase.md`
- Run `cd frontend && bun run types`
- Run `cd frontend && bun run format` if formatting drift was introduced

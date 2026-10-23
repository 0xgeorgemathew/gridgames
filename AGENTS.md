# AGENTS.md

Shared project memory for Grid Games. Keep this file global. Load the nearest
path-scoped `AGENTS.md` for area-specific rules before editing code there.

## Repo Shape

- `frontend/`: TanStack Start + Phaser multiplayer mini app (Pivot). Most product work happens here.
- `ai-agent/`: Bun + LangChain package for the in-game advisory agent.
- `contracts/`: Solidity / Foundry code.
- `docs/`: plans plus committed agent-memory docs for this repo.

## Read First

- `docs/agent-memory/README.md`: how memory is layered in this repo
- `frontend/codebase.md`: canonical frontend runtime map
- `.kilocode/rules/dev-server-rule.md`: dev-server rule
- Ignore `frontend/README.md` for product behavior; it is scaffold text

## Path-Scoped Memory

- `frontend/AGENTS.md`: frontend runtime, placement rules, validation
- `frontend/app/api/socket/multiplayer/AGENTS.md`: authoritative server and event-contract rules
- `ai-agent/AGENTS.md`: advisory agent package rules

## Global Rules

- Never run `bun run dev`; always assume the dev server is already running
- Prefer `rg` / `rg --files` for search
- Keep stable shared rules in `AGENTS.md` files
- Keep durable cross-task learnings in `docs/agent-memory/learning-memory.md`
- Keep machine-specific or personal notes under `docs/agent-memory/local/*.md`
  and do not commit them

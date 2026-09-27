# Agent Memory

This repo uses a layered memory structure based on the Z.AI memory guidance, but
trimmed to what is actually useful for Grid Games.

## Layers

- Session memory: the current conversation, open files, tool output, and active plan
- Project memory: committed `AGENTS.md` files plus `frontend/codebase.md`
- Semantic memory: source-of-truth reference files and external docs loaded only when needed
- Learning memory: durable lessons promoted into `learning-memory.md`
- Local memory: machine-specific notes under `local/`, intentionally gitignored
- Role memory: focused guides under `roles/` for repeat task types

## Retrieval Order

1. Read the root `AGENTS.md`
2. Read the nearest path-scoped `AGENTS.md`
3. Read `frontend/codebase.md` for frontend runtime context
4. Pull a role guide from `roles/` when the task clearly matches
5. Browse external docs only when the facts are external, unstable, or tool-specific

## Update Rules

- Put stable team rules in the appropriate `AGENTS.md`
- Put repeated, validated discoveries in `learning-memory.md`
- Put personal preferences, temp accounts, ports, and machine notes in `local/*.md`
- Do not mix private local notes into committed project memory
- Do not promote one-off debugging notes into long-term memory unless they keep recurring

## Repo Mapping

- Global shared memory: `/AGENTS.md`
- Frontend shared memory: `/frontend/AGENTS.md`
- Multiplayer server memory: `/frontend/app/api/socket/multiplayer/AGENTS.md`
- Advisory agent memory: `/ai-agent/AGENTS.md`
- Role guides: `/docs/agent-memory/roles/`

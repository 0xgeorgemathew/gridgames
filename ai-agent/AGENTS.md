# AGENTS.md
Path-scoped memory for `ai-agent/`.

## Scope

This package is the in-game advisory agent. It reads structured match state and
returns suggestions. It must not execute trades or mutate live game state.

## Commands

Run commands from `ai-agent/`:

```bash
bun run types
bun test
```

## Key Files

- `src/agent/clippy-agent.ts`: agent factory, model wiring, and thread memory
- `src/prompts/system-prompt.ts`: behavior and output constraints
- `src/context/state-mapper.ts`: raw game snapshot -> LLM-friendly context
- `src/__tests__/`: contract and mapper coverage

## Change Rules

- Preserve advisory-only behavior unless the product intentionally changes
- Keep `GameContext` JSON-serializable; the model consumes serialized state
- If you change mapper shape or prompt assumptions, update tests in `src/__tests__/`
- The current thread memory is `MemorySaver`; if you add longer-lived memory, document the boundary between short-term thread state and durable memory in `docs/agent-memory/`

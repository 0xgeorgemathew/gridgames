# AGENTS.md

Instructions for AI coding agents working on this repository.

## Commands

From `frontend/` directory:

```bash
bun run dev    #  Do not run the dev server always assume its running
bun run types  # Run type checking
bun run format # Format code
```

## Code Rules

- Semicolons: disabled (enforced by Prettier)
- Imports: use `@/*` path alias (maps to `./`)
- TypeScript: `strict` mode is off - add explicit type checks

## Architecture

Read [codebase.md](./frontend/codebase.md) first for the semantic and functional map of the app. It explains the runtime flow, folder responsibilities, and the main files to inspect for each kind of task.
See [architecture.md](./frontend/architecture.md) for the short folder-placement guide.
See [dev-server-rules.md](.kilocode/rules/dev-server-rule.md) for quick reference on dev server rules.

# AGENTS.md

Instructions for AI coding agents working on this repository.

## Commands

From `frontend/` directory:

```bash
bun run dev    # Start custom server (use this, NOT 'next dev')
bun run types  # Run type checking
bun run format # Format code
```

## Code Rules

- Semicolons: disabled (enforced by Prettier)
- Imports: use `@/*` path alias (maps to `./`)
- TypeScript: `strict` mode is off - add explicit type checks

## Architecture

See [codebase.md](./frontend/codebase.md) for a quick reference of important files.

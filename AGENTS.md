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

See [codebase.md](./frontend/codebase.md) for a quick reference of important files In the Codebase
See [dev-server-rules.md](.kilocode/rules/dev-server-rule.md) For quikc reference to important Rules when you run the dev server
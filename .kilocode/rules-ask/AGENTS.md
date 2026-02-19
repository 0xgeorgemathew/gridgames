# Ask Mode Rules

## Architecture Context

- **Single-monolith**: Socket.IO server embedded in Next.js at [`/api/socket/route.ts`](frontend/app/api/socket/route.ts), NOT a separate backend
- **Separate DOMs**: Phaser canvas and React UI run in isolated DOMs - communicate via [`window.phaserEvents`](frontend/game/stores/trading-store.ts) EventEmitter
- **State location**: All game logic in Zustand stores at [`frontend/game/stores/`](frontend/game/stores/), components are visual only

## Key File Locations

| Purpose              | Location                                                                           |
| -------------------- | ---------------------------------------------------------------------------------- |
| Socket.IO server     | [`frontend/app/api/socket/route.ts`](frontend/app/api/socket/route.ts)             |
| Game logic           | [`frontend/app/api/socket/game-events.ts`](frontend/app/api/socket/game-events.ts) |
| Trading store        | [`frontend/game/stores/trading-store.ts`](frontend/game/stores/trading-store.ts)   |
| Base Name resolver   | [`frontend/hooks/useBaseName.ts`](frontend/hooks/useBaseName.ts)                   |
| Multiplayer patterns | [`.claude/rules/multiplayer-patterns.md`](.claude/rules/multiplayer-patterns.md)   |

## Player Identity

- **Base Mini App users**: Base Name resolved via [`useBaseName.ts`](frontend/hooks/useBaseName.ts) (read-only)
- **Web users**: Privy names for matchmaking
- **Leverage**: Manual HUD selector in [`LeverageSelector.tsx`](frontend/components/GameHUD-modules/LeverageSelector.tsx)

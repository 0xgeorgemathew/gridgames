# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## CRITICAL ISSUES

### Known Issues

- **Performance**: [`GridScanBackground.tsx`](frontend/components/GridScanBackground.tsx) runs Three.js at 60fps continuously (no frame throttling)
- **Security**: CORS uses origin reflection in production (Mini App iframe compatible)
- **Missing**: Rate limiting on Socket.IO endpoints

## Project Overview

Grid Games is a monorepo containing a web-based game with real-time multiplayer. The project consists of:

- **frontend/**: Next.js web app with Phaser game engine, embedded Socket.IO server (port 3000)
- **contracts/**: Foundry smart contracts for USDC faucet (Base Sepolia testnet)

## Master Directives

1. **Tone**: Concise, direct, engineering-focused. No conversational filler.
2. **Code Output**: Snippets only. No test files (`.spec.ts`, `.test.tsx`, `.t.sol`) or full boilerplate unless requested.
3. **Architecture**:
   - Frontend logic in `stores/` (Zustand); components are visual only
   - Phaser handles physics, React handles UI overlays. Never mix the two DOMs
4. **Problem Solving**: Default to simplest, fastest solution. Complexity requires justification.

## Development Commands

### Frontend (Next.js + Phaser)

```bash
bun install           # Install dependencies
bun run dev           # Start development server on localhost:3000 (uses server.ts)
bun run types         # TypeScript type checking
bun run format        # Format code with Prettier
bun run build         # Production build
bun run start         # Start production server
bun run lint          # Run ESLint
```

### Contracts (Foundry)

```bash
cd contracts
forge build          # Compile contracts
forge test           # Run tests
forge fmt            # Format Solidity code
forge snapshot       # Capture gas snapshots
anvil                # Start local Ethereum node
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Frontend (Next.js:3000)                                     │
│  - React UI with SHADCN (dark/cyberpunk themes)            │
│  - Phaser game canvas (client-side arcade physics)          │
│  - Three.js background (GridScanBackground - 60fps)         │
│  - Socket.IO server at /api/socket (embedded)               │
│  - Privy authentication                                      │
│  - viem + wagmi for wallet interaction                      │
│  - TanStack Query for data fetching                         │
│  - window.phaserEvents bridge (React ↔ Phaser)              │
└────────────────────┬────────────────────────────────────────┘
                     │ viem/ethers.js
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  Smart Contracts & L2                                       │
│  - USDCFaucet.sol (Base Sepolia USDC faucet)               │
└─────────────────────────────────────────────────────────────┘
```

### Current Game Mode: Hyper Swiper

Hyper Swiper is a 2-player competitive trading game with perp-style positions:

- **Game Duration**: 2.5 minutes (150 seconds)
- **Starting Cash**: $10 per player
- **Position Collateral**: $1 per position
- **Leverage**: Fixed at 500X
- **Position Style**: Perp-style - positions stay OPEN until game end
- **Liquidation**: 80% collateral health ratio threshold
- **Coin Types**: Long (▲) and Short (▼) only

See [`.claude/rules/game-design.md`](.claude/rules/game-design.md) for complete mechanics.

### Key Architectural Patterns

1. **Hyper Swiper**: Single-monolith architecture - Next.js App Router hosts both frontend and Socket.IO server at `/api/socket`
2. **Data Persistence**: In-memory room state (no external DB for multiplayer)
3. **Perp-Style Positions**: Positions remain open until game end, then all settle at once
4. **Liquidation System**: Real-time monitoring of collateral health ratio with 80% threshold

### Multiplayer Game Patterns

- **RoomManager class**: Centralized room and player management with cleanup
- **GameRoom class**: Encapsulates room state with timer tracking (prevents memory leaks)
- **SettlementGuard class**: RAII pattern preventing duplicate settlement (race condition guard)
- **Input validation**: Player name sanitization, coin type guards
- **Timer cleanup**: Track intervals/timeouts in GameRoom for proper disposal
- **React-Phaser bridge**: `window.phaserEvents` event emitter for cross-DOM communication
  - Server events → React store → `window.phaserEvents` → Phaser scene
  - Phaser input → Socket emit → Server
  - Pattern documented in [`.claude/rules/multiplayer-patterns.md`](.claude/rules/multiplayer-patterns.md)

## Technology Stack

| Layer     | Technology                                                                                                                              |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend  | Next.js 16.1.6, React 19.2.3, Tailwind CSS v4, SHADCN, Phaser 3.90.0, Socket.IO, viem, wagmi, TanStack Query, Framer Motion, Privy auth |
| Contracts | Foundry, Solidity ^0.8.20, OpenZeppelin v5.5                                                                                            |

## Important File Locations

### Game Code (Hyper Swiper)

- [`frontend/games/hyper-swiper/`](frontend/games/hyper-swiper/) - Main game module
- [`frontend/games/hyper-swiper/game/scenes/TradingScene.ts`](frontend/games/hyper-swiper/game/scenes/TradingScene.ts) - Main Phaser scene
- [`frontend/games/hyper-swiper/game/stores/trading-store-modules/`](frontend/games/hyper-swiper/game/stores/trading-store-modules/) - Zustand store
- [`frontend/games/hyper-swiper/game/constants.ts`](frontend/games/hyper-swiper/game/constants.ts) - Game economy constants
- [`frontend/games/hyper-swiper/game/types/trading.ts`](frontend/games/hyper-swiper/game/types/trading.ts) - TypeScript types

### Server Code

- [`frontend/app/api/socket/route.ts`](frontend/app/api/socket/route.ts) - Socket.IO server initialization
- [`frontend/app/api/socket/game-events-modules/index.ts`](frontend/app/api/socket/game-events-modules/index.ts) - Main game event handlers
- [`frontend/app/api/socket/game-events-modules/GameRoom.ts`](frontend/app/api/socket/game-events-modules/GameRoom.ts) - Room state management
- [`frontend/app/api/socket/game-events-modules/RoomManager.ts`](frontend/app/api/socket/game-events-modules/RoomManager.ts) - Room/player tracking

### Components

- [`frontend/games/hyper-swiper/components/MatchmakingScreen.tsx`](frontend/games/hyper-swiper/components/MatchmakingScreen.tsx) - Lobby and matchmaking
- [`frontend/games/hyper-swiper/components/GameHUD.tsx`](frontend/games/hyper-swiper/components/GameHUD.tsx) - In-game UI
- [`frontend/games/hyper-swiper/components/GameOverModal.tsx`](frontend/games/hyper-swiper/components/GameOverModal.tsx) - End game results
- [`frontend/components/GameCanvas.tsx`](frontend/components/GameCanvas.tsx) - Phaser game wrapper
- [`frontend/components/GridScanBackground.tsx`](frontend/components/GridScanBackground.tsx) - Three.js background

### Hooks

- [`frontend/hooks/useBaseName.ts`](frontend/hooks/useBaseName.ts) - Base Name resolution
- [`frontend/hooks/useBaseMiniAppAuth.ts`](frontend/hooks/useBaseMiniAppAuth.ts) - Base Mini App authentication

### Contracts

- [`contracts/src/USDCFaucet.sol`](contracts/src/USDCFaucet.sol) - Base Sepolia USDC faucet

## Configuration Notes

- **Frontend**: Path alias `@/*` maps to `./` in tsconfig.json
- **Contracts**: Foundry optimizer at 200 runs; OpenZeppelin and forge-std are git submodules
- **Infrastructure**: Cloudflare tunnels expose dev environment (config in `cloudflared/config.yml`, excluded from git)

## Performance Considerations

### Known Performance Issues

1. **Three.js Background (GridScanBackground)**: Runs at 60fps continuously with no frame throttling
   - File: [`frontend/components/GridScanBackground.tsx`](frontend/components/GridScanBackground.tsx)
   - Impact: High CPU usage on mobile devices
   - Mitigation: Consider requestAnimationFrame throttling or conditional rendering

2. **CORS Configuration**: Production uses origin reflection (`true`) for Socket.IO
   - Purpose: Mini App iframe compatibility
   - Configuration: Set via `ALLOWED_ORIGINS` env var or `RAILWAY_PUBLIC_DOMAIN`

## Smart Contract Status

**USDCFaucet.sol** - Base Sepolia USDC faucet for testnet gameplay.

| Function                  | Purpose                                             |
| ------------------------- | --------------------------------------------------- |
| `claim()`                 | Claim 0.1 USDC to caller                            |
| `claimTo(address)`        | Gas-sponsored claiming (for sponsored transactions) |
| `setClaimAmount(uint256)` | Owner sets claim amount                             |
| `withdraw(uint256)`       | Owner withdraw USDC                                 |

**Contract Address:** `0x036CbD53842c5426634e7929541eC2318f3dCF7e` (Base Sepolia USDC)
**File:** [`contracts/src/USDCFaucet.sol`](contracts/src/USDCFaucet.sol)

## Claude Code Automations

### MCP Servers

- **GitHub MCP**: Issue/PR management, CI workflow integration
- **context7**: Live documentation for Phaser, Socket.IO, ethers.js, Foundry

### Custom Skills

- `game-component`: Scaffold Phaser scenes with React integration

### Specialized Agents

- `game-logic-reviewer`: Multiplayer reliability (race conditions, memory leaks, performance)
- `web3-auditor`: Smart contract security (reentrancy, access control, gas optimization)

### Automation Hooks

- Auto-format: Prettier on every file edit
- Type-check: TypeScript validation after edits
- Security blocks: Prevent .env and lock file edits

### Workflow Integration

- All automations follow patterns from [`.claude/rules/workflows.md`](.claude/rules/workflows.md)
- Agents use superpowers framework from [`.claude/rules/skills.md`](.claude/rules/skills.md)
- Frontend patterns follow conventions from [`.claude/rules/frontend.md`](.claude/rules/frontend.md)

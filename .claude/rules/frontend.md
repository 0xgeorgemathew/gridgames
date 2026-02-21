# Frontend Conventions

## Architecture

- **Single-monolith**: Next.js App Router hosts both frontend and Socket.IO server
- **Phaser**: Game canvas (client-side physics only)
- **React/ShadCN**: UI overlays only - never mix with Phaser DOM
- **Zustand**: State management in `stores/`
- **Socket.IO**: Real-time multiplayer at `/api/socket`
- **Player Identity**: Base Name for mini app users, Privy names for web users

## File Structure

```
frontend/
├── app/
│   ├── api/
│   │   ├── socket/
│   │   │   ├── route.ts              # Socket.IO server initialization
│   │   │   └── game-events-modules/  # Server-side game logic
│   │   └── health/route.ts           # Health check endpoint
│   ├── hyper-swiper/                 # Hyper Swiper game page
│   ├── grid/                         # Grid game page
│   └── providers.tsx                 # App providers (Privy, wagmi, Query)
├── components/                       # Shared React UI components
│   ├── ui/                           # UI primitives (ShadCN)
│   ├── ens/                          # ENS-related components
│   ├── GameCanvas.tsx                # Phaser game wrapper
│   └── GridScanBackground.tsx        # Three.js background
├── games/                            # Game modules
│   └── hyper-swiper/
│       ├── components/               # Game-specific React components
│       │   ├── GameHUD.tsx           # In-game UI
│       │   ├── GameOverModal.tsx     # End game results
│       │   ├── MatchmakingScreen.tsx # Lobby and matchmaking
│       │   └── PositionIndicator.tsx # Position display
│       └── game/                     # Phaser game code
│           ├── scenes/               # Phaser scenes
│           ├── systems/              # Game systems (rendering, audio)
│           ├── stores/               # Zustand stores
│           ├── types/                # TypeScript types
│           ├── config.ts             # Phaser configuration
│           └── constants.ts          # Game economy constants
├── hooks/                            # React hooks
│   ├── useBaseName.ts               # Base Name resolution
│   └── useBaseMiniAppAuth.ts        # Base Mini App authentication
├── lib/                              # Utilities
├── privy/                            # Privy auth configuration
└── server.ts                         # Custom Next.js server with Socket.IO
```

## Patterns

- **Game scenes**: Extend `Phaser.Scene`, use `window.phaserEvents` for React bridge
- **API routes**: Export GET/POST handlers; Socket.IO attaches via custom server
- **State**: Logic in stores; components are visual only
- **Game systems**: Extracted rendering/particle/audio logic to `systems/`
- **Leverage**: Fixed at 500X (no HUD selector)

## Import Conventions

- Path alias: `@/*` maps to `./` in frontend
- Example: `import { useTradingStore } from '@/games/hyper-swiper/game/stores/trading-store'`

## Code Style

- No semicolons (Prettier enforced)
- TypeScript `strict: false` - add explicit type checks for nullable values

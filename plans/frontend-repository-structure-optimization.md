# Frontend Repository Structure Optimization Plan

## Executive Summary

This plan outlines a comprehensive restructuring of the frontend repository for maximum readability and semantic clarity. The goal is to make the codebase **self-documenting** through clear folder and file naming that immediately communicates purpose.

---

## Current Structural Issues

### Issue 1: Ambiguous `-modules` Suffix

| Current Path | Problem |
|--------------|---------|
| `app/api/socket/game-events-modules/` | What are these modules FOR? Unclear. |
| `games/hyper-swiper/game/stores/trading-store-modules/` | Generic "modules" name doesn't explain purpose |
| `games/hyper-swiper/components/GameHUD-modules/` | HUD sub-components hidden behind vague name |

### Issue 2: "Game" Naming Collision

| File/Folder | Ambiguity |
|-------------|-----------|
| `games/` | Top-level game registry |
| `games/hyper-swiper/game/` | Phaser engine code |
| `game-events-modules/` | Server-side multiplayer logic |
| `game/config.ts` | Phaser scene config |
| `game/constants.ts` | Game constants (also has "game" concepts) |

A developer sees "game" everywhere and can't distinguish:
- Game **registry/metadata** (available games list)
- Game **engine** (Phaser scenes, systems)
- Game **server** (Socket.IO multiplayer logic)
- Game **configuration** (constants, settings)

### Issue 3: Inconsistent Naming Conventions

| Current | Issue |
|---------|-------|
| `Test/` (PascalCase) | Routes should be kebab-case |
| `trading-store-modules/` | Kebab-case but unclear purpose |
| `GameHUD-modules/` | Mixed PascalCase-kebab naming |
| `GameRoom.ts` | PascalCase file, but what layer? |
| `game-events-modules/index.ts` | ~33K bytes, monolithic handler |

### Issue 4: Duplicate Type Definitions (Server ↔ Client)

The following types are **defined in both** `app/api/socket/game-events-modules/types.ts` (server) and `games/hyper-swiper/game/types/trading.ts` (client):

| Interface | Server `types.ts` | Client `trading.ts` |
|-----------|-------------------|---------------------|
| `PositionSettlementResult` | ✅ lines 44-56 | ✅ lines 237-249 |
| `PlayerSettlementResult` | ✅ lines 59-66 | ✅ lines 254-259 |
| `LiquidationEvent` | ✅ lines 91-102 | ✅ lines 267-278 |
| `GameSettlementData` / `GameSettlementEvent` | ✅ lines 69-78 | ✅ lines 261-270 (slightly different name) |

Additionally, `GameRoom.ts` imports `Player` from `@/games/hyper-swiper/game/types/trading`, creating **cross-layer coupling** where server-side code depends on client-side type definitions.

> [!CAUTION]
> This duplication means changes to these types must be made in two places today. The restructuring should **deduplicate** by placing shared types in one canonical location.

## Current File Inventory

> [!IMPORTANT]
> This is the actual current structure as audited. The proposed structure below accounts for **every** file listed here.

```
frontend/
├── server.ts                          # Custom HTTP server (Socket.IO bootstrap)
├── next.config.ts
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.mjs
├── eslint.config.mjs
├── package.json
├── bunfig.toml
├── components.json                    # SHADCN config
├── railpack.json                      # Railway build config
├── railway.json                       # Railway deploy config
├── .prettierignore                    # Prettier ignore rules
├── .env.example                       # Environment variable template
├── README.md                          # Project documentation
├── next-env.d.ts                      # Auto-generated Next.js types
│
├── app/
│   ├── page.tsx                       # Home: Game Selection
│   ├── layout.tsx
│   ├── providers.tsx
│   ├── globals.css
│   ├── icon.svg                       # App favicon
│   ├── HomeClient.tsx                 # Client wrapper for home page
│   │
│   ├── hyper-swiper/
│   │   ├── page.tsx
│   │   └── HyperSwiperClient.tsx
│   │
│   ├── Test/                          # ⚠ PascalCase route
│   │   └── page.tsx
│   │
│   ├── grid/                          # Grid test route
│   │   └── page.tsx
│   │
│   ├── .well-known/
│   │   └── farcaster.json/            # Farcaster manifest (directory route)
│   │
│   └── api/
│       ├── auth/
│       │   └── route.ts
│       ├── health/
│       │   └── route.ts
│       ├── webhook/
│       │   └── route.ts
│       └── socket/
│           ├── route.ts
│           ├── game-events.ts         # Event handler barrel export
│           └── game-events-modules/
│               ├── index.ts           # Main event handler (~33K bytes)
│               ├── GameRoom.ts
│               ├── RoomManager.ts
│               ├── PriceFeedManager.ts
│               ├── CoinSequence.ts
│               ├── SeededRandom.ts
│               ├── types.ts
│               └── validation.ts
│
├── components/
│   ├── GameSelectionScreen.tsx         # Game picker screen
│   ├── GameCanvas.tsx
│   ├── GameCanvasClient.tsx
│   ├── GameCanvasBackground.tsx
│   ├── GridScanBackground.tsx         # Three.js animated background
│   ├── TestGridBackground.tsx         # Grid test background
│   ├── CountUp.tsx
│   ├── MotionProvider.tsx
│   ├── ToastNotifications.tsx
│   ├── animations.css
│   ├── ui/
│   │   └── ActionButton.tsx
│   └── ens/
│       └── PlayerName.tsx
│
├── games/
│   ├── index.ts                       # Game registry
│   ├── types.ts                       # Game registry types
│   └── hyper-swiper/
│       ├── index.ts                   # Public exports
│       ├── config.ts                  # Game metadata
│       ├── components/
│       │   ├── MatchmakingScreen.tsx
│       │   ├── GameHUD.tsx
│       │   ├── GameOverModal.tsx
│       │   ├── GameSettingsSelector.tsx
│       │   ├── HowToPlayModal.tsx
│       │   ├── OnboardingModal.tsx
│       │   ├── PositionIndicator.tsx
│       │   ├── RoundEndFlash.tsx
│       │   └── GameHUD-modules/
│       │       ├── index.ts
│       │       ├── types.ts
│       │       ├── CompactPriceRow.tsx
│       │       ├── ConnectionStatusDot.tsx
│       │       ├── PlayerHealthBar.tsx
│       │       └── PriceLoadingState.tsx
│       └── game/
│           ├── config.ts              # Phaser config
│           ├── constants.ts           # Game constants
│           ├── scenes/
│           │   ├── TradingScene.ts
│           │   └── GridScene.ts
│           ├── objects/
│           │   └── Token.ts
│           ├── systems/
│           │   ├── AudioManager.ts
│           │   ├── BladeRenderer.ts
│           │   ├── BladeRenderer.ts.patch
│           │   ├── CoinLifecycleSystem.ts
│           │   ├── CoinRenderer.ts
│           │   ├── CollisionSystem.ts
│           │   ├── GridBackgroundSystem.ts
│           │   ├── InputAudioSystem.ts
│           │   ├── ParticleSystem.ts
│           │   ├── PriceGraphSystem.ts
│           │   ├── SnakePriceGraph.ts
│           │   ├── SpatialGrid.ts
│           │   ├── TradingSceneServices.ts
│           │   └── VisualEffects.ts
│           ├── stores/
│           │   ├── trading-store.ts
│           │   └── trading-store-modules/
│           │       ├── index.ts       # Store module entry (~17K bytes)
│           │       └── types.ts       # Store types
│           └── types/
│               └── trading.ts
│
├── hooks/
│   └── useBaseMiniAppAuth.ts
│
├── lib/
│   ├── formatPrice.ts
│   └── utils.ts                       # cn() helper
│
├── privy/
│   └── config.ts
│
└── public/
    ├── audio/                         # 3 audio files
    ├── screenshots/                   # Empty
    ├── hero.png
    ├── icon.png
    ├── icon.svg
    ├── og.png
    └── splash.png
```

---

## Semantic Naming Strategy

### Layer Suffixes (Make Purpose Explicit)

| Layer | Suffix | Example |
|-------|--------|---------|
| Server-side logic | `.server.ts` | `matchmaking.server.ts` |
| Client-side state | `.store.ts` | `trading.store.ts` |
| Type definitions | `.types.ts` | `position.types.ts` |
| React components | `.tsx` (no change) | `GameHUD.tsx` |
| Phaser systems | `.system.ts` | `audio.system.ts` |
| Utilities | `.utils.ts` | `price.utils.ts` |
| Constants | `.constants.ts` | `game.constants.ts` |
| Configuration | `.config.ts` | `hyper-swiper.config.ts` |

### Directory Naming Convention

| Type | Convention | Rationale |
|------|------------|-----------|
| Routes (Next.js) | `kebab-case` | Standard Next.js convention |
| Components | `PascalCase/` | Matches component naming |
| Domain modules | `kebab-case/` | Readable, URL-friendly |
| Feature folders | `descriptive-noun/` | Self-documenting |

---

## Proposed Structure

### Detailed Structure

```
frontend/
├── server.ts                                # Custom HTTP server (unchanged)
├── next.config.ts
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.mjs
├── eslint.config.mjs
├── package.json
├── bunfig.toml
├── components.json
├── railpack.json
├── railway.json
├── .prettierignore                          # (unchanged)
├── .env.example                             # (unchanged)
├── README.md                                # Update paths after migration
│
├── app/
│   ├── page.tsx                             # Home: Game Selection
│   ├── layout.tsx
│   ├── providers.tsx
│   ├── globals.css
│   ├── icon.svg
│   ├── HomeClient.tsx
│   │
│   ├── hyper-swiper/                        # Route: /hyper-swiper
│   │   ├── page.tsx
│   │   └── HyperSwiperClient.tsx
│   │
│   ├── test/                                # RENAMED: was "Test/"
│   │   └── page.tsx
│   │
│   ├── grid/                                # Grid test route (unchanged)
│   │   └── page.tsx
│   │
│   ├── .well-known/                         # Farcaster manifest (unchanged)
│   │   └── farcaster.json/
│   │
│   └── api/
│       ├── auth/
│       │   └── route.ts
│       ├── health/
│       │   └── route.ts
│       ├── webhook/
│       │   └── route.ts
│       └── socket/
│           ├── route.ts                     # Socket.IO initialization
│           ├── game-events.ts               # Event handler barrel (unchanged)
│           └── multiplayer/                 # RENAMED: was "game-events-modules"
│               ├── index.ts                 # Main event handler (split target)
│               ├── room.manager.ts          # RENAMED: was GameRoom.ts
│               ├── room-registry.server.ts  # RENAMED: was RoomManager.ts
│               ├── matchmaking.server.ts    # SPLIT from index.ts
│               ├── settlement.server.ts     # SPLIT from index.ts
│               ├── liquidation.server.ts    # SPLIT from index.ts
│               ├── game-loop.server.ts      # SPLIT from index.ts (spawning, game loop, endGame)
│               ├── price-feed.server.ts     # RENAMED: was PriceFeedManager.ts
│               ├── coin-sequence.server.ts  # RENAMED: was CoinSequence.ts
│               ├── seeded-random.utils.ts   # RENAMED: was SeededRandom.ts
│               ├── events.types.ts          # RENAMED: was types.ts (server-side handler types, room/match state)
│               └── validation.utils.ts      # RENAMED: was validation.ts
│
├── domains/                                 # NEW: Domain modules
│   ├── index.ts                             # Domain registry (was games/index.ts)
│   ├── types.ts                             # Shared domain types (was games/types.ts)
│   │
│   └── hyper-swiper/                        # Hyper Swiper domain
│       ├── index.ts                         # Public exports
│       ├── meta.config.ts                   # RENAMED: was config.ts
│       │
│       ├── client/                          # Client-side only
│       │   ├── components/                  # React components
│       │   │   ├── screens/
│       │   │   │   ├── MatchmakingScreen.tsx
│       │   │   │   └── GameOverModal.tsx
│       │   │   ├── hud/
│       │   │   │   ├── GameHUD.tsx
│       │   │   │   ├── CompactPriceRow.tsx   # was in GameHUD-modules/
│       │   │   │   ├── ConnectionStatusDot.tsx
│       │   │   │   ├── PlayerHealthBar.tsx
│       │   │   │   ├── PriceLoadingState.tsx
│       │   │   │   ├── hud.types.ts          # was GameHUD-modules/types.ts
│       │   │   │   └── index.ts
│       │   │   ├── effects/
│       │   │   │   ├── PositionIndicator.tsx
│       │   │   │   └── RoundEndFlash.tsx
│       │   │   ├── modals/
│       │   │   │   ├── OnboardingModal.tsx
│       │   │   │   └── HowToPlayModal.tsx
│       │   │   └── settings/
│       │   │       └── GameSettingsSelector.tsx
│       │   │
│       │   ├── phaser/                      # RENAMED: was "game/"
│       │   │   ├── scenes/
│       │   │   │   ├── TradingScene.ts
│       │   │   │   └── GridScene.ts
│       │   │   ├── objects/                 # Kept as "objects/" (actual name)
│       │   │   │   └── Token.ts
│       │   │   ├── systems/
│       │   │   │   ├── AudioManager.ts
│       │   │   │   ├── BladeRenderer.ts
│       │   │   │   ├── [DELETE] BladeRenderer.ts.patch  # Remove obsolete patch file
│       │   │   │   ├── CoinLifecycleSystem.ts
│       │   │   │   ├── CoinRenderer.ts
│       │   │   │   ├── CollisionSystem.ts
│       │   │   │   ├── GridBackgroundSystem.ts
│       │   │   │   ├── InputAudioSystem.ts
│       │   │   │   ├── ParticleSystem.ts
│       │   │   │   ├── PriceGraphSystem.ts
│       │   │   │   ├── SnakePriceGraph.ts
│       │   │   │   ├── SpatialGrid.ts
│       │   │   │   ├── TradingSceneServices.ts
│       │   │   │   └── VisualEffects.ts
│       │   │   ├── config.ts                # Phaser config
│       │   │   └── constants.ts             # Game constants
│       │   │
│       │   └── state/                       # RENAMED: was "stores/"
│       │       ├── trading.store.ts         # RENAMED: was trading-store.ts
│       │       ├── trading.types.ts         # was trading-store-modules/types.ts
│       │       └── slices/                  # RENAMED: was "trading-store-modules/"
│       │           └── index.ts             # was trading-store-modules/index.ts
│       │
│       └── shared/                          # Shared client/server
│           ├── [NEW] position.types.ts      # SPLIT from types/trading.ts
│           ├── [NEW] player.types.ts        # SPLIT from types/trading.ts
│           ├── [NEW] coin.types.ts          # SPLIT from types/trading.ts
│           └── [DELETE] types/trading.ts    # Original removed after split above
│
├── platform/                                # NEW: Cross-cutting
│   ├── auth/
│   │   ├── privy.config.ts                  # was privy/config.ts
│   │   ├── mini-app.hook.ts                 # RENAMED: was useBaseMiniAppAuth.ts
│   │   └── [NEW] auth.types.ts              # New file: auth-related type definitions
│   │
│   ├── ui/                                  # Shared UI components
│   │   ├── GameSelectionScreen.tsx           # was components/GameSelectionScreen.tsx
│   │   ├── ActionButton.tsx                 # was components/ui/ActionButton.tsx
│   │   ├── PlayerName.tsx                   # was components/ens/PlayerName.tsx
│   │   ├── CountUp.tsx
│   │   ├── GameCanvas.tsx
│   │   ├── GameCanvasClient.tsx
│   │   ├── GameCanvasBackground.tsx
│   │   ├── GridScanBackground.tsx
│   │   ├── TestGridBackground.tsx
│   │   ├── ToastNotifications.tsx
│   │   ├── MotionProvider.tsx
│   │   └── animations.css
│   │
│   ├── hooks/
│   │   └── [NEW] usePlatform.ts             # New file: platform detection utility
│   │
│   └── utils/
│       ├── classNames.utils.ts              # RENAMED: was lib/utils.ts (cn() helper)
│       └── price.utils.ts                   # RENAMED: was lib/formatPrice.ts
│
└── public/
    ├── audio/                               # 3 audio files
    ├── screenshots/
    ├── hero.png
    ├── icon.png
    ├── icon.svg
    ├── og.png
    └── splash.png
```

---

## Key Naming Improvements

### Before vs After

| Before | After | Rationale |
|--------|-------|-----------|
| `game-events-modules/` | `multiplayer/` | Clear purpose: multiplayer server logic |
| `trading-store-modules/` | `slices/` | Zustand slices pattern, clearer intent |
| `GameHUD-modules/` | `hud/` (inside `components/`) | Flat component grouping by feature |
| `game/` (inside hyper-swiper) | `phaser/` | Explicit: Phaser engine code |
| `stores/` | `state/` | Broader term for state management |
| `objects/` | `objects/` (kept) | Actual current name — plan wrongly renamed to `entities/` |
| `GameRoom.ts` | `room.manager.ts` | Layer + purpose clear |
| `RoomManager.ts` | `room-registry.server.ts` | Distinguishes from `room.manager.ts` |
| `PriceFeedManager.ts` | `price-feed.server.ts` | Layer + purpose clear |
| `CoinSequence.ts` | `coin-sequence.server.ts` | Layer suffix added |
| `SeededRandom.ts` | `seeded-random.utils.ts` | Layer suffix added |
| `useBaseMiniAppAuth.ts` | `mini-app.hook.ts` | Convention: feature.hook.ts |
| `Test/` | `test/` | Route naming convention |

### File Naming Patterns

```
# Server-side files (Socket.IO handlers)
matchmaking.server.ts      # Match creation logic
settlement.server.ts       # Position settlement
liquidation.server.ts      # Liquidation checks
game-loop.server.ts        # Coin spawning, game loop, endGame
price-feed.server.ts       # Binance WebSocket
coin-sequence.server.ts    # Coin spawn sequencing
room-registry.server.ts    # Room/player tracking
seeded-random.utils.ts     # Deterministic RNG

# Client-side state (Zustand)
trading.store.ts           # Main store
slices/index.ts            # Store slices (single module currently)
trading.types.ts           # Store types

# Phaser engine
TradingScene.ts            # Scene class
GridScene.ts               # Grid scene
Token.ts                   # Game object (in objects/)
AudioManager.ts            # Audio management
BladeRenderer.ts           # Blade rendering
CoinLifecycleSystem.ts     # Coin spawn/despawn
CoinRenderer.ts            # Coin rendering
CollisionSystem.ts         # Collision detection
GridBackgroundSystem.ts    # Grid background
InputAudioSystem.ts        # Input audio feedback
ParticleSystem.ts          # Particle effects
PriceGraphSystem.ts        # Price graph overlay
SnakePriceGraph.ts         # Snake-style price graph
SpatialGrid.ts             # Spatial partitioning
TradingSceneServices.ts    # Scene service locator
VisualEffects.ts           # VFX manager

# React components (PascalCase)
MatchmakingScreen.tsx      # Full screen component
GameHUD.tsx                # HUD component
GameOverModal.tsx          # Game over screen
GameSettingsSelector.tsx   # Settings (leverage, duration)
PositionIndicator.tsx      # Position UI element
RoundEndFlash.tsx          # Round end VFX
OnboardingModal.tsx        # First-time user onboarding
HowToPlayModal.tsx         # Tutorial modal

# HUD sub-components (was GameHUD-modules/)
CompactPriceRow.tsx        # Price display row
ConnectionStatusDot.tsx    # Socket connection indicator
PlayerHealthBar.tsx        # Collateral health bar
PriceLoadingState.tsx      # Price loading skeleton

# Type definitions
position.types.ts          # Position-related types
events.types.ts            # Event payloads
trading.types.ts           # Trading domain types
hud.types.ts               # HUD component types

# Configuration
meta.config.ts             # Game metadata
config.ts                  # Phaser configuration
constants.ts               # Game constants
```

---

## Migration Phases

### Phase 1: Create New Structure (Low Risk)

**Estimated Time: 1-2 hours**

1. Create new directory structure:
   - `domains/`
   - `platform/`
   - `app/api/socket/multiplayer/`

2. Create placeholder files with re-exports:
   ```typescript
   // domains/hyper-swiper/index.ts
   export { hyperSwiperConfig } from './meta.config'
   export * from './shared/position.types'
   ```

### Phase 2: Move Server-Side Code

**Estimated Time: 2-3 hours**

> [!WARNING]
> This is the **highest-risk phase**. The `index.ts` split requires understanding the full event handler flow. Test Socket.IO connections thoroughly after this phase.

1. Rename `game-events-modules/` → `multiplayer/`
2. Split `index.ts` (1,060 lines, 32,964 bytes) using its existing section delimiters:

   **`liquidation.server.ts`** — Liquidation logic (lines 68–190):
   - `checkLiquidations()` — checks all open positions across active rooms
   - `liquidatePosition()` — force-closes position, emits `position_liquidated`
   - `calculatePositionPnl()` — computes PnL for a position
   - `calculateCollateralHealthRatio()` — health ratio calculation
   - `shouldLiquidate()` — threshold check (≤ 80%)

   **`settlement.server.ts`** — Game-end settlement (lines 192–293):
   - `settleAllPositions()` — settles all open + closed positions at game end
   - `calculatePlayerResults()` — aggregates per-player PnL totals
   - `determineWinner()` — picks winner by total PnL

   **`matchmaking.server.ts`** — Match creation & lobby (lines 429–512, 646–1058):
   - `createMatch()` — creates room, assigns players, emits `match_found`
   - All socket event handlers inside `setupGameEvents()` that relate to matchmaking:
     `find_match`, `join_waiting_pool`, `leave_waiting_pool`, `get_lobby_players`, `select_opponent`

   **`game-loop.server.ts`** — Game lifecycle (lines 294–428):
   - `spawnCoin()` — deterministic coin spawning
   - `startGameLoop()` — main game loop with heartbeat scheduler
   - `startGameWhenClientsReady()` — client readiness gate
   - `endGame()` — ends game with settlement + cleanup

   **`index.ts`** — Barrel/orchestrator (remains):
   - `setupGameEvents()` — creates `RoomManager`, sets up cleanup/emergency, wires Socket.IO events
   - Price feed management: `ensurePriceFeedConnected()`, `disconnectPriceFeedIfIdle()`
   - Remaining inline event handlers: `scene_ready`, `slice_coin`, `close_position`, `end_game`, `set_leverage`, `disconnect`

   > [!NOTE]
   > The `setupGameEvents()` function (L607–L1058) contains all Socket.IO event handlers **inline** as `socket.on(...)` callbacks. These handlers call into the split files but the handler wiring itself stays in `index.ts` as the orchestrator.

3. Rename files with layer suffixes:
   - `GameRoom.ts` → `room.manager.ts`
   - `RoomManager.ts` → `room-registry.server.ts`
   - `PriceFeedManager.ts` → `price-feed.server.ts`
   - `CoinSequence.ts` → `coin-sequence.server.ts`
   - `SeededRandom.ts` → `seeded-random.utils.ts`
   - `types.ts` → `events.types.ts` (server-side handler types: room state, match state, etc.)
   - `validation.ts` → `validation.utils.ts`
4. Update `game-events.ts` barrel to import from `multiplayer/`
5. **Fix cross-layer coupling**: `room.manager.ts` (was `GameRoom.ts`) imports `Player` from `@/games/hyper-swiper/game/types/trading`. After the restructuring, update this to import from `@/domains/hyper-swiper/shared/player.types`
6. **Deduplicate types**: The 4 duplicate interfaces (`PositionSettlementResult`, `PlayerSettlementResult`, `LiquidationEvent`, `GameSettlementData`) should live in one place. Move them to `domains/hyper-swiper/shared/` and have `multiplayer/events.types.ts` re-export or import from there

### Phase 3: Move Client-Side Code

**Estimated Time: 3-4 hours**

1. Move `games/hyper-swiper/` → `domains/hyper-swiper/`
2. Move `games/index.ts` → `domains/index.ts`
3. Move `games/types.ts` → `domains/types.ts`
4. Rename subdirectories:
   - `game/` → `client/phaser/`
   - `stores/` → `client/state/`
   - `components/` → `client/components/`
5. Flatten `GameHUD-modules/` into `client/components/hud/`
6. Move `GameSettingsSelector.tsx` → `client/components/settings/`
7. Move `trading-store-modules/` into `client/state/slices/` (rename dir, no content split needed — currently just `index.ts` + `types.ts`)
8. Split `types/trading.ts` (7,505 bytes) into 3 new files under `shared/`:
   - `position.types.ts` — position/trade-related types
   - `player.types.ts` — player state types
   - `coin.types.ts` — coin/token types
   - Then **delete** the original `types/trading.ts`

### Phase 4: Move Shared Code

**Estimated Time: 1-2 hours**

1. Move `components/` → `platform/ui/`
   - Flatten `ui/ActionButton.tsx` → `platform/ui/ActionButton.tsx`
   - Flatten `ens/PlayerName.tsx` → `platform/ui/PlayerName.tsx`
2. Move `hooks/` → `platform/hooks/` (rename `useBaseMiniAppAuth.ts` → `platform/auth/mini-app.hook.ts`)
3. Move `lib/` → `platform/utils/`
   - `utils.ts` → `classNames.utils.ts`
   - `formatPrice.ts` → `price.utils.ts`
4. Move `privy/config.ts` → `platform/auth/privy.config.ts`

### Phase 5: Update Imports

**Estimated Time: 2-3 hours**

1. Update all import paths
2. Update `tsconfig.json` path aliases:
   ```json
   {
     "compilerOptions": {
       "paths": {
         "@/*": ["./*"],
         "@domains/*": ["./domains/*"],
         "@platform/*": ["./platform/*"]
       }
     }
   }
   ```
3. Update `game-events.ts` to re-export from new `multiplayer/` path
4. Delete `BladeRenderer.ts.patch` (obsolete patch file)
5. Create new files:
   - `platform/auth/auth.types.ts` — auth-related type definitions
   - `platform/hooks/usePlatform.ts` — platform detection utility
6. Update `README.md` with new directory structure

### Phase 6: Cleanup

**Estimated Time: 1 hour**

1. Remove empty directories (`games/`, `hooks/`, `lib/`, `privy/`, `components/ui/`, `components/ens/`)
2. Remove `Test/` route or rename to `test/`
3. Update `GEMINI.md` file paths
4. Update `.prettierignore` if any paths changed
5. Update documentation (`README.md`)
6. Verify all tests pass

---

## Import Path Examples

### Before

```typescript
// Component importing store
import { useTradingStore } from '@/games/hyper-swiper/game/stores/trading-store'

// Server importing types
import { Position } from '@/app/api/socket/game-events-modules/types'

// Component importing shared UI
import { ActionButton } from '@/components/ui/ActionButton'

// Using PlayerName
import { PlayerName } from '@/components/ens/PlayerName'
```

### After

```typescript
// Component importing store (same domain)
import { useTradingStore } from '../state/trading.store'

// Server importing types (shared domain types)
import { Position } from '@domains/hyper-swiper/shared/position.types'

// Component importing shared UI (platform)
import { ActionButton } from '@platform/ui/ActionButton'

// Using PlayerName (flattened)
import { PlayerName } from '@platform/ui/PlayerName'
```

---

## Benefits Summary

| Aspect | Before | After |
|--------|--------|-------|
| **Discoverability** | "game" everywhere | Clear domain separation |
| **Layer Clarity** | Mixed conventions | Explicit `.server.ts`, `.store.ts` suffixes |
| **Import Paths** | Deep nesting | Flat, domain-scoped |
| **Cognitive Load** | Must read file to understand purpose | Name tells the story |
| **Scalability** | Tightly coupled | Domain-driven, loosely coupled |

---

## Risk Mitigation

### Import Breaking Changes

- Use `tsconfig.json` path aliases for gradual migration
- Create re-export files during transition period
- Use IDE refactoring tools for bulk renames

### Merge Conflicts

- Complete migration in a single sprint
- Communicate changes to team
- Create feature branch for restructuring

### Testing

- Run `bun run types` after each phase
- Run `bun run dev` and verify startup
- Manual smoke test of game flow
- Verify Socket.IO connections work

---

## Open Questions

1. **Path Aliases**: Should we use `@domains/` and `@platform/` or keep flat `@/`?
   - Recommendation: Use `@/` pointing to root, imports remain relative within domains

2. **Component Organization**: Group by feature or by type?
   - Recommendation: Group by feature (`screens/`, `hud/`, `modals/`, `settings/`)

3. **Slice Granularity**: How fine-grained should Zustand slices be?
   - Recommendation: One slice per major feature (connection, positions, matchmaking)
   - Note: Currently store modules contain a single `index.ts` (~17K) + `types.ts` — splitting is deferred until the store grows

4. **Test/Grid Routes**: Keep `test/` and `grid/` routes or remove?
   - Recommendation: Keep during development, gate behind `NODE_ENV === 'development'`

5. **Type Deduplication Strategy**: Where should the 4 duplicated interfaces (`PositionSettlementResult`, `PlayerSettlementResult`, `LiquidationEvent`, `GameSettlementData`) live?
   - Recommendation: Single source of truth in `domains/hyper-swiper/shared/`. Server-side `multiplayer/events.types.ts` re-exports from there.
   - Alternative: Keep server types separate if they diverge from client types (e.g., server adds fields for internal tracking)

6. **`setupGameEvents` inline handlers**: The `setupGameEvents` function contains all Socket.IO event handlers as inline callbacks (L646–L1056). Should these be extracted further?
   - Recommendation: Keep inline for now. The handlers are thin wrappers that call into the split files. Extracting them would add indirection without much benefit.
   - Reconsider if a second game is added (at that point, per-game handler registrations would be needed)

---

## Verification Checklist

After migration, verify:

- [ ] All imports resolve correctly
- [ ] `bun run types` passes
- [ ] `bun run dev` starts without errors
- [ ] Game loads and plays correctly
- [ ] Socket.IO multiplayer works
- [ ] No console errors
- [ ] `GEMINI.md` file paths updated

---

## Timeline Estimate

| Phase | Time | Risk |
|-------|------|------|
| Phase 1: Create Structure | 1-2 hrs | Low |
| Phase 2: Move Server Code | 2-3 hrs | Medium |
| Phase 3: Move Client Code | 3-4 hrs | Medium |
| Phase 4: Move Shared Code | 1-2 hrs | Low |
| Phase 5: Update Imports | 2-3 hrs | High |
| Phase 6: Cleanup | 1 hr | Low |
| **Total** | **10-15 hrs** | Medium |

---

## Conclusion

This restructuring eliminates naming ambiguity by:

1. **Explicit layer suffixes** (`.server.ts`, `.store.ts`, `.types.ts`)
2. **Domain-scoped organization** (`domains/hyper-swiper/`)
3. **Clear purpose in names** (`multiplayer/` not `game-events-modules/`)
4. **Consistent conventions** (kebab-case routes, PascalCase components)

The result is a self-documenting codebase where a developer can immediately understand:
- Where to find server-side multiplayer logic (`app/api/socket/multiplayer/`)
- Where to find client-side state (`domains/hyper-swiper/client/state/`)
- Where to find shared UI components (`platform/ui/`)
- What a file does based on its suffix (`.server.ts` = server logic)

# Codebase Overview

Quick reference for important files in the codebase.

## App Routes (`app/`)

| File                                 | Purpose                                            |
| ------------------------------------ | -------------------------------------------------- |
| `page.tsx`                           | Home page - game selection screen                  |
| `HomeClient.tsx`                     | Client wrapper for home page with Farcaster SDK    |
| `hyper-swiper/page.tsx`              | Hyper Swiper game route                            |
| `hyper-swiper/HyperSwiperClient.tsx` | Game client - connects socket, renders HUD/canvas  |
| `providers.tsx`                      | Root providers (Privy, Wagmi, QueryClient, Motion) |
| `layout.tsx`                         | Root layout with fonts and metadata                |
| `grid/page.tsx`                      | Grid scene test page                               |
| `test/page.tsx`                      | Grid background test page                          |

## API Routes (`app/api/`)

| File                    | Purpose                              |
| ----------------------- | ------------------------------------ |
| `socket/route.ts`       | Socket.IO initialization endpoint    |
| `socket/game-events.ts` | Barrel export for multiplayer module |
| `auth/route.ts`         | Farcaster QuickAuth verification     |
| `health/route.ts`       | Health check endpoint                |
| `webhook/route.ts`      | Webhook handler                      |

## Multiplayer Server (`app/api/socket/multiplayer/`)

| File                      | Purpose                                                    |
| ------------------------- | ---------------------------------------------------------- |
| `index.ts`                | Main Socket.IO event handler - wires all multiplayer logic |
| `room.manager.ts`         | GameRoom class - manages players, coins, positions, timers |
| `room-registry.server.ts` | RoomManager - tracks rooms, waiting players, matchmaking   |
| `game-loop.server.ts`     | Coin spawning, game loop, match creation                   |
| `liquidation.server.ts`   | Position liquidation when collateral health <= 80%         |
| `settlement.server.ts`    | Game-end settlement, PnL calculation, winner determination |
| `price-feed.server.ts`    | Binance WebSocket for real-time BTC prices                 |
| `coin-sequence.server.ts` | Deterministic coin spawn sequence for fair play            |
| `events.types.ts`         | Server-side types (positions, settlements, events)         |
| `validation.utils.ts`     | Input validation (player names, coin types)                |
| `seeded-random.utils.ts`  | Deterministic RNG for reproducible coin sequences          |

## Domain: Hyper Swiper (`domains/hyper-swiper/`)

### Config & Types

| File                      | Purpose                                               |
| ------------------------- | ----------------------------------------------------- |
| `meta.config.ts`          | Game metadata (name, description, icon, status)       |
| `shared/trading.types.ts` | Shared types (Player, Position, CoinSpawnEvent, etc.) |
| `index.ts`                | Public exports                                        |

### Client Components (`client/components/`)

| File                                | Purpose                                               |
| ----------------------------------- | ----------------------------------------------------- |
| `screens/MatchmakingScreen.tsx`     | Lobby UI, player selection, game settings             |
| `screens/GameOverModal.tsx`         | Victory/defeat screen with final balances             |
| `hud/GameHUD.tsx`                   | Bottom navigation HUD - price, timer, health, actions |
| `hud/CompactPriceRow.tsx`           | Price display, timer, sound/end buttons               |
| `hud/PlayerHealthBar.tsx`           | Balance/health bar visualization                      |
| `effects/PositionIndicator.tsx`     | Active positions display with PnL                     |
| `effects/RoundEndFlash.tsx`         | Round end visual effect                               |
| `modals/OnboardingModal.tsx`        | First-time user tutorial                              |
| `modals/HowToPlayModal.tsx`         | Game instructions overlay                             |
| `settings/GameSettingsSelector.tsx` | Game duration selector                                |

### Phaser Engine (`client/phaser/`)

| File                              | Purpose                                                          |
| --------------------------------- | ---------------------------------------------------------------- |
| `config.ts`                       | Phaser game config factories                                     |
| `constants.ts`                    | Game economy constants (STARTING_CASH, LIQUIDATION_HEALTH_RATIO) |
| `scenes/TradingScene.ts`          | Main game scene - coordinates all systems                        |
| `scenes/GridScene.ts`             | Grid test scene                                                  |
| `objects/Token.ts`                | Coin game object with physics and rendering                      |
| `systems/TradingSceneServices.ts` | Service locator - initializes all game systems                   |
| `systems/CoinLifecycleSystem.ts`  | Coin pooling, spawning, lifecycle management                     |
| `systems/CollisionSystem.ts`      | Blade-coin collision detection and handling                      |
| `systems/BladeRenderer.ts`        | Swipe trail rendering with glow effects                          |
| `systems/CoinRenderer.ts`         | Coin visual rendering with cached textures                       |
| `systems/AudioManager.ts`         | Sound effects and mobile audio unlock                            |
| `systems/ParticleSystem.ts`       | Slice particle effects                                           |
| `systems/VisualEffects.ts`        | Explosion effects, screen shake                                  |
| `systems/GridBackgroundSystem.ts` | Scrolling grid background                                        |
| `systems/PriceGraphSystem.ts`     | Price graph overlay                                              |
| `systems/InputAudioSystem.ts`     | Input handling with audio feedback                               |

### State (`client/state/`)

| File               | Purpose                                                 |
| ------------------ | ------------------------------------------------------- |
| `trading.store.ts` | Zustand store barrel export                             |
| `slices/index.ts`  | Main store implementation - socket, game state, actions |
| `trading.types.ts` | Store types (TradingState, PhaserEventBridge)           |

## Platform (`platform/`)

### UI Components (`ui/`)

| File                       | Purpose                                |
| -------------------------- | -------------------------------------- |
| `GameSelectionScreen.tsx`  | Home page game selection UI            |
| `GameCanvas.tsx`           | Phaser canvas wrapper (dynamic import) |
| `GameCanvasClient.tsx`     | Phaser game initialization             |
| `GameCanvasBackground.tsx` | Gradient background component          |
| `GridScanBackground.tsx`   | Three.js animated grid background      |
| `ToastNotifications.tsx`   | Toast message display                  |
| `CountUp.tsx`              | Animated price counter                 |
| `ActionButton.tsx`         | Styled button component                |
| `PlayerName.tsx`           | Player name display with truncation    |
| `MotionProvider.tsx`       | Framer Motion provider                 |

### Auth (`auth/`)

| File               | Purpose                            |
| ------------------ | ---------------------------------- |
| `privy.config.ts`  | Privy authentication configuration |
| `mini-app.hook.ts` | Farcaster Mini App auth hook       |

### Utils (`utils/`)

| File                  | Purpose                               |
| --------------------- | ------------------------------------- |
| `classNames.utils.ts` | `cn()` helper for conditional classes |
| `price.utils.ts`      | Price formatting utilities            |

## Domain Registry (`domains/`)

| File       | Purpose                                     |
| ---------- | ------------------------------------------- |
| `index.ts` | Game registry - exports all available games |
| `types.ts` | GameConfig type definition                  |

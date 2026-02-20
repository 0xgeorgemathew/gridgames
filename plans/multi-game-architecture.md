# Multi-Game Architecture Plan: Grid Games

## Executive Summary

Re-architect the Grid Games entry flow to support multiple games. The existing trading game will be renamed to **Hyper Swiper** and moved to a dedicated module. Users will first see a Game Selection screen before entering game-specific matchmaking.

**Key Decisions:**
- URL Structure: `/hyper-swiper` (shorter, cleaner URLs)
- Game Selection UI: Minimal list style
- Future games: User has specific games planned

---

## Current State Analysis

### Entry Flow (Current)

```
/ → MatchmakingScreen → [AutoMatch | SelectOpponent] → Gameplay
```

### Key Files to Migrate

| File | Current Location | Issue |
|------|-----------------|-------|
| MatchmakingScreen.tsx | components/ | Hyper Swiper-specific, not generic |
| GameHUD.tsx | components/ | Uses trading store directly |
| GameOverModal.tsx | components/ | Uses trading store directly |
| PositionIndicator.tsx | components/ | Uses trading store directly |
| trading-store.ts | game/stores/ | Hyper Swiper-specific state |
| TradingScene.ts | game/scenes/ | Hyper Swiper-specific Phaser scene |
| game-events.ts | app/api/socket/ | Hyper Swiper-specific socket events |

---

## Target Architecture

### Directory Structure

```
frontend/
├── app/
│   ├── page.tsx                       # Game Selection Screen (NEW)
│   ├── layout.tsx                     # Root layout (unchanged)
│   ├── hyper-swiper/
│   │   └── page.tsx                   # Hyper Swiper entry (NEW)
│   └── api/
│       └── socket/                    # Socket.IO (update for game namespacing)
│
├── games/                             # NEW: Per-game modules
│   ├── index.ts                       # Game registry
│   ├── types.ts                       # Shared game types
│   └── hyper-swiper/                  # Hyper Swiper game module
│       ├── index.ts                   # Game config export
│       ├── config.ts                  # Metadata: name, description, icon
│       ├── components/
│       │   ├── MatchmakingScreen.tsx  # Moved from components/
│       │   ├── GameHUD.tsx            # Moved from components/
│       │   ├── GameOverModal.tsx      # Moved from components/
│       │   ├── PositionIndicator.tsx  # Moved from components/
│       │   ├── HowToPlayModal.tsx     # Moved from components/
│       │   ├── SettlementFlash.tsx    # Moved from components/
│       │   ├── RoundEndFlash.tsx      # Moved from components/
│       │   └── GameHUD-modules/       # Moved from components/
│       ├── game/                      # Moved from game/
│       │   ├── scenes/
│       │   │   ├── TradingScene.ts
│       │   │   └── GridScene.ts
│       │   ├── objects/
│       │   │   └── Token.ts
│       │   ├── systems/
│       │   │   ├── AudioManager.ts
│       │   │   ├── BladeRenderer.ts
│       │   │   ├── CoinRenderer.ts
│       │   │   ├── ParticleSystem.ts
│       │   │   ├── SpatialGrid.ts
│       │   │   └── VisualEffects.ts
│       │   ├── stores/
│       │   │   ├── trading-store.ts
│       │   │   └── trading-store-modules/
│       │   ├── types/
│       │   │   └── trading.ts
│       │   ├── config.ts
│       │   ├── constants.ts
│       │   └── lib/
│       │       └── utils.ts
│       └── hooks/                     # Hyper Swiper-specific hooks (if any)
│
├── components/                        # Shared/generic components ONLY
│   ├── ui/                            # Generic UI primitives (unchanged)
│   ├── GameCanvas.tsx                 # Generic Phaser wrapper
│   ├── GameCanvasClient.tsx           # Client component for Phaser
│   ├── GameCanvasBackground.tsx       # Generic background
│   ├── GridScanBackground.tsx         # Shared visual effect
│   ├── ToastNotifications.tsx         # Generic notifications
│   ├── CountUp.tsx                    # Generic animation
│   ├── animations.css                 # Shared animations
│   └── ens/                           # Shared ENS components
│
├── hooks/                             # Shared hooks
│   ├── useBaseMiniAppAuth.ts
│   ├── useBaseName.ts
│   └── ... (other shared hooks)
│
└── lib/                               # Shared utilities
    ├── utils.ts
    ├── formatPrice.ts
    └── ...
```

### Routing Structure

```
/                    → Game Selection Screen (NEW)
/hyper-swiper        → Hyper Swiper Matchmaking & Gameplay
/[future-game]       → Future games follow same pattern
```

### URL Flow (Target)

```
/ → GameSelectionScreen → /hyper-swiper → MatchmakingScreen → Gameplay
```

---

## Component Classification

### Move to games/hyper-swiper/components/

These components are tightly coupled to Hyper Swiper game logic:

- `MatchmakingScreen.tsx` - Uses `useTradingStore` for matchmaking
- `GameHUD.tsx` - Uses `useTradingStore` for game state
- `GameOverModal.tsx` - Uses `useTradingStore` for results
- `PositionIndicator.tsx` - Uses `useTradingStore` for positions
- `HowToPlayModal.tsx` - Hyper Swiper tutorial content
- `SettlementFlash.tsx` - Hyper Swiper settlement visual
- `RoundEndFlash.tsx` - Hyper Swiper round end visual
- `GameHUD-modules/` - HUD sub-components

### Keep in components/ (Shared)

These components are generic and reusable:

- `GameCanvas.tsx` - Generic Phaser canvas wrapper
- `GameCanvasClient.tsx` - Client-side Phaser initialization
- `GameCanvasBackground.tsx` - Generic game background
- `GridScanBackground.tsx` - Reusable cyber grid effect
- `ToastNotifications.tsx` - Generic notification system
- `CountUp.tsx` - Generic number animation
- `animations.css` - Shared CSS animations
- `ui/` - UI primitives (ActionButton, etc.)
- `ens/` - ENS name resolution components

---

## Implementation Steps

### Phase 1: Create Game Registry Foundation

1. **Create games/types.ts**
   - Define `GameConfig` interface
   - Define `GameStatus` type

2. **Create games/index.ts**
   - Export game registry array
   - Export `getGameBySlug()` helper

3. **Create games/hyper-swiper/config.ts**
   - Define Hyper Swiper metadata
   - Export `GameConfig` for Hyper Swiper

### Phase 2: Create Hyper Swiper Module Structure

4. **Create games/hyper-swiper/ directory structure**
   - Create `components/` subdirectory
   - Create `game/` subdirectory

5. **Move game logic to games/hyper-swiper/game/**
   - Move `game/scenes/` → `games/hyper-swiper/game/scenes/`
   - Move `game/objects/` → `games/hyper-swiper/game/objects/`
   - Move `game/systems/` → `games/hyper-swiper/game/systems/`
   - Move `game/stores/` → `games/hyper-swiper/game/stores/`
   - Move `game/types/` → `games/hyper-swiper/game/types/`
   - Move `game/config.ts` → `games/hyper-swiper/game/config.ts`
   - Move `game/constants.ts` → `games/hyper-swiper/game/constants.ts`
   - Move `game/lib/` → `games/hyper-swiper/game/lib/`

6. **Move Hyper Swiper components**
   - Move `components/MatchmakingScreen.tsx` → `games/hyper-swiper/components/`
   - Move `components/GameHUD.tsx` → `games/hyper-swiper/components/`
   - Move `components/GameOverModal.tsx` → `games/hyper-swiper/components/`
   - Move `components/PositionIndicator.tsx` → `games/hyper-swiper/components/`
   - Move `components/HowToPlayModal.tsx` → `games/hyper-swiper/components/`
   - Move `components/SettlementFlash.tsx` → `games/hyper-swiper/components/`
   - Move `components/RoundEndFlash.tsx` → `games/hyper-swiper/components/`
   - Move `components/GameHUD-modules/` → `games/hyper-swiper/components/`

### Phase 3: Update Imports

7. **Update all import paths in moved files**
   - Update `@/game/stores/trading-store` → `@/games/hyper-swiper/game/stores/trading-store`
   - Update `@/game/types/trading` → `@/games/hyper-swiper/game/types/trading`
   - Update component imports to use relative paths within module
   - Update shared component imports to use `@/components/`

8. **Create games/hyper-swiper/index.ts**
   - Export game config
   - Export key components (for potential sharing)

### Phase 4: Create New Routing Structure

9. **Create app/hyper-swiper/page.tsx**
   - Move game logic from `app/page.tsx`
   - Import from `games/hyper-swiper/`

10. **Create Game Selection Screen**
    - Create `components/GameSelectionScreen.tsx`
    - Implement minimal list style UI
    - Display available games from registry

11. **Update app/page.tsx**
    - Replace MatchmakingScreen with GameSelectionScreen
    - Keep auth providers and layout

### Phase 5: Update Socket.IO (Optional Future)

12. **Consider game namespacing for Socket.IO**
    - Current: Single namespace for all events
    - Future: Per-game rooms or namespaces if needed

---

## Game Registry Design

### types.ts

```typescript
// frontend/games/types.ts

export type GameStatus = 'available' | 'coming-soon' | 'maintenance'

export interface GameConfig {
  /** URL slug for the game */
  slug: string
  /** Display name */
  name: string
  /** Short description for selection screen */
  description: string
  /** Icon path (relative to public/ or URL) */
  icon: string
  /** Background image for selection card (optional) */
  backgroundImage?: string
  /** Current availability status */
  status: GameStatus
  /** Player count range */
  players: {
    min: number
    max: number
  }
  /** Estimated match duration (for UI display) */
  duration?: string
}
```

### hyper-swiper/config.ts

```typescript
// frontend/games/hyper-swiper/config.ts

import type { GameConfig } from '../types'

export const hyperSwiperConfig: GameConfig = {
  slug: 'hyper-swiper',
  name: 'Hyper Swiper',
  description: 'Real-time crypto trading battle. Swipe to trade, outsmart your opponent.',
  icon: '/games/hyper-swiper/icon.svg',
  backgroundImage: '/games/hyper-swiper/bg.jpg',
  status: 'available',
  players: {
    min: 2,
    max: 2,
  },
  duration: '2-3 min',
}
```

### index.ts

```typescript
// frontend/games/index.ts

import type { GameConfig } from './types'
import { hyperSwiperConfig } from './hyper-swiper'

export const games: GameConfig[] = [
  hyperSwiperConfig,
  // Future games added here
]

export function getGameBySlug(slug: string): GameConfig | undefined {
  return games.find((g) => g.slug === slug)
}

export { type GameConfig, type GameStatus } from './types'
```

---

## Game Selection Screen Design

### Minimal List Style

```
┌─────────────────────────────────────────────┐
│                                             │
│           G R I D   G A M E S               │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ ⚡  HYPER SWiper                    │   │
│  │     Real-time crypto trading battle │   │
│  │     2 players • 2-3 min             │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ 🔮  COMING SOON                      │   │
│  │     [Future game placeholder]        │   │
│  └─────────────────────────────────────┘   │
│                                             │
└─────────────────────────────────────────────┘
```

### Component Structure

```typescript
// frontend/components/GameSelectionScreen.tsx

export function GameSelectionScreen() {
  const games = useGames() // From registry
  
  return (
    <div className="min-h-screen">
      <GridScanBackground />
      
      <header>
        <h1>GRID GAMES</h1>
      </header>
      
      <main>
        <GameList games={games} />
      </main>
    </div>
  )
}

function GameList({ games }: { games: GameConfig[] }) {
  return (
    <div className="flex flex-col gap-4">
      {games.map((game) => (
        <GameCard key={game.slug} game={game} />
      ))}
    </div>
  )
}

function GameCard({ game }: { game: GameConfig }) {
  const router = useRouter()
  
  return (
    <button
      onClick={() => router.push(`/${game.slug}`)}
      disabled={game.status !== 'available'}
    >
      <div className="flex items-center gap-4">
        <GameIcon src={game.icon} />
        <div>
          <h2>{game.name}</h2>
          <p>{game.description}</p>
          <span>{game.players.min}-{game.players.max} players</span>
        </div>
      </div>
    </button>
  )
}
```

---

## Import Path Updates

### Before

```typescript
// In MatchmakingScreen.tsx
import { useTradingStore } from '@/game/stores/trading-store'

// In GameHUD.tsx
import { useTradingStore } from '@/game/stores/trading-store'

// In app/page.tsx
import { MatchmakingScreen } from '@/components/MatchmakingScreen'
import { GameHUD } from '@/components/GameHUD'
```

### After

```typescript
// In games/hyper-swiper/components/MatchmakingScreen.tsx
import { useTradingStore } from '../game/stores/trading-store'

// In games/hyper-swiper/components/GameHUD.tsx
import { useTradingStore } from '../game/stores/trading-store'

// In app/hyper-swiper/page.tsx
import { MatchmakingScreen } from '@/games/hyper-swiper/components/MatchmakingScreen'
import { GameHUD } from '@/games/hyper-swiper/components/GameHUD'
```

---

## Migration Checklist

### Files to Create

- [ ] `frontend/games/types.ts`
- [ ] `frontend/games/index.ts`
- [ ] `frontend/games/hyper-swiper/index.ts`
- [ ] `frontend/games/hyper-swiper/config.ts`
- [ ] `frontend/app/hyper-swiper/page.tsx`
- [ ] `frontend/components/GameSelectionScreen.tsx`

### Files to Move

- [ ] `game/` → `games/hyper-swiper/game/`
- [ ] `components/MatchmakingScreen.tsx` → `games/hyper-swiper/components/`
- [ ] `components/GameHUD.tsx` → `games/hyper-swiper/components/`
- [ ] `components/GameOverModal.tsx` → `games/hyper-swiper/components/`
- [ ] `components/PositionIndicator.tsx` → `games/hyper-swiper/components/`
- [ ] `components/HowToPlayModal.tsx` → `games/hyper-swiper/components/`
- [ ] `components/SettlementFlash.tsx` → `games/hyper-swiper/components/`
- [ ] `components/RoundEndFlash.tsx` → `games/hyper-swiper/components/`
- [ ] `components/GameHUD-modules/` → `games/hyper-swiper/components/`

### Files to Update

- [ ] `frontend/app/page.tsx` - Replace with Game Selection
- [ ] All moved files - Update import paths
- [ ] `frontend/components/GameCanvas.tsx` - Update scene imports
- [ ] `frontend/app/api/socket/` - Update game type references (if needed)

### Files to Keep (Shared)

- [ ] `frontend/components/ui/` - All UI primitives
- [ ] `frontend/components/ens/` - ENS components
- [ ] `frontend/components/GameCanvas.tsx`
- [ ] `frontend/components/GameCanvasClient.tsx`
- [ ] `frontend/components/GameCanvasBackground.tsx`
- [ ] `frontend/components/GridScanBackground.tsx`
- [ ] `frontend/components/ToastNotifications.tsx`
- [ ] `frontend/components/CountUp.tsx`
- [ ] `frontend/components/animations.css`
- [ ] `frontend/hooks/` - All shared hooks
- [ ] `frontend/lib/` - All shared utilities

---

## Future Game Template

When adding a new game, follow this structure:

```
games/
└── [game-slug]/
    ├── index.ts           # Export game config
    ├── config.ts          # GameConfig definition
    ├── components/        # Game-specific React components
    │   ├── MatchmakingScreen.tsx
    │   ├── GameHUD.tsx
    │   └── ...
    ├── game/              # Game logic (Phaser, state, etc.)
    │   ├── scenes/
    │   ├── stores/
    │   └── ...
    └── hooks/             # Game-specific hooks
```

Then register in `games/index.ts`:

```typescript
import { newGameConfig } from './new-game'

export const games: GameConfig[] = [
  hyperSwiperConfig,
  newGameConfig, // Add here
]
```

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Breaking existing deployed game | Test thoroughly in staging; use gradual rollout |
| Import path errors after migration | Use TypeScript compiler to catch errors; run `bun run types` |
| Socket.IO event conflicts between games | Current architecture uses rooms; add game-type to room IDs if needed |
| Performance impact from re-architecture | No runtime changes; only file organization |
| Future games need different matchmaking | Keep matchmaking in game module; shared socket infrastructure |

---

## Success Criteria

1. ✅ Root URL (`/`) shows Game Selection screen
2. ✅ Clicking Hyper Swiper navigates to `/hyper-swiper`
3. ✅ `/hyper-swiper` shows existing matchmaking flow
4. ✅ All existing functionality preserved (AutoMatch, SelectOpponent)
5. ✅ Clear separation between shared and game-specific code
6. ✅ Easy to add new games by following the template
7. ✅ TypeScript compiles without errors
8. ✅ No runtime regressions

---

## Next Steps

1. **Review this plan** and approve or request changes
2. **Switch to Code mode** to implement the migration
3. **Test thoroughly** on staging before deploying
4. **Update documentation** (AGENTS.md, README) after migration

# Codebase Simplification Plan

> **Generated:** 2026-02-23
> **Status:** Draft - Pending Verification
> **Estimated Impact:** ~1,500+ lines removed (25-30% reduction)

## Executive Summary

Deep codebase scan identified **32 simplification opportunities** across 4 domains:

| Domain | Issues Found | Lines Impacted | Priority |
|--------|--------------|----------------|----------|
| Server Code | 12 | ~610 | HIGH |
| Game Logic | 8 | ~850 | HIGH |
| Frontend UI | 8 | ~300 | MEDIUM |
| Config/Infra | 4 | ~100 | MEDIUM |

---

## 1. Server Code Simplification (HIGH PRIORITY)

### 1.1 Remove Over-Engineered Classes

#### SeededRandom.ts → Simple Functions
**File:** `frontend/app/api/socket/game-events-modules/SeededRandom.ts` (23 lines)

**Current:**
```typescript
export class SeededRandom {
  private seed: number
  next(): number { ... }
  nextInt(min, max): number { ... }
}
```

**Simplified:**
```typescript
// Inline in CoinSequence.ts or utils
let seed = 0
function seededNext(): number {
  seed = (seed * 1664525 + 1013904223) % 4294967296
  return seed / 4294967296
}
```

**Impact:** -23 lines, -1 file, -1 class

---

#### CoinSequence.ts → Generator Function
**File:** `frontend/app/api/socket/game-events-modules/CoinSequence.ts` (57 lines)

**Current:** Pre-generates entire 50-coin sequence in memory

**Simplified:** On-demand generator with yield
```typescript
function* coinGenerator(durationMs: number, seed: number): Generator<CoinData> {
  // Generate coins on-demand instead of pre-allocating
}
```

**Impact:** -30 lines, reduced memory usage

---

#### PriceFeedManager.ts → Simplified WebSocket Wrapper
**File:** `frontend/app/api/socket/game-events-modules/PriceFeedManager.ts` (152 lines)

**Issues:**
- Dual subscription patterns (subscribers + callback) - redundant
- Complex shutdown logic with multiple flags
- 152 lines for WebSocket wrapper

**Simplified:**
```typescript
let price = DEFAULT_BTC_PRICE
let ws: WebSocket | null = null

function connectPriceFeed(onPrice: (price: number) => void): void {
  ws = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@aggTrade')
  ws.onmessage = (msg) => { price = parsePrice(msg); onPrice(price) }
}
```

**Impact:** -70 lines, simpler API

---

### 1.2 Consolidate RoomManager + GameRoom

**Files:**
- `RoomManager.ts` (190 lines)
- `GameRoom.ts` (270 lines)

**Issues:**
- 4 Maps for simple room tracking
- `playerLeverage` Map duplicates `Player.leverage`
- `lastGameMeta` rarely used (rematch only)
- Timer tracking overhead for ephemeral rooms

**Simplifications:**
1. Remove `playerLeverage` Map (use `player.leverage` directly)
2. Remove `lastGameMeta` or simplify to single field
3. Remove timer tracking (Node.js cleans up on process exit)
4. Merge `playerToRoom` into RoomManager

**Impact:** -80 lines, 1 fewer Map

---

### 1.3 Extract Duplicate Lobby Transformations

**File:** `frontend/app/api/socket/game-events-modules/index.ts`

**Issue:** 6+ copies of same lobby player transformation (lines 511-520, 698-706, 814-833, 960-975)

**Simplified:**
```typescript
function formatLobbyPlayers(players: Map<string, WaitingPlayer>): LobbyPlayer[] {
  return Array.from(players.entries()).map(([id, player]) => ({
    socketId: id,
    name: player.name,
    joinedAt: player.joinedAt,
    leverage: player.leverage,
    gameDuration: player.gameDuration,
  }))
}
```

**Impact:** -50 lines, DRY compliance

---

### 1.4 Simplify Event Handler Boilerplate

**File:** `frontend/app/api/socket/game-events-modules/index.ts` (1070 lines)

**Issue:** Repeated error handling pattern

**Simplified:**
```typescript
function withErrorHandling<T>(handler: (data: T) => void): (data: T) => void {
  return (data) => {
    try { handler(data) }
    catch (e) { socket.emit('error', { message: 'Operation failed' }) }
  }
}

socket.on('slice_coin', withErrorHandling(handleSlice))
```

**Impact:** -30 lines, cleaner handlers

---

### 1.5 Consolidate Module Files

**Current structure (10 files, ~1800 lines):**
```
game-events-modules/
├── index.ts (1070)
├── types.ts (102)
├── GameRoom.ts (270)
├── RoomManager.ts (190)
├── validation.ts (15)
├── SeededRandom.ts (23)
├── CoinSequence.ts (57)
└── PriceFeedManager.ts (152)
```

**Simplified structure (4-5 files):**
```
game-events-modules/
├── index.ts (main logic + event handlers)
├── types.ts (type definitions)
├── game-engine.ts (GameRoom, RoomManager, coin generation)
└── price-feed.ts (simplified WebSocket)
```

**Impact:** 5-6 fewer files, clearer organization

---

## 2. Game Logic Simplification (HIGH PRIORITY)

### 2.1 Remove InputAudioSystem Abstraction

**File:** `frontend/games/hyper-swiper/game/systems/InputAudioSystem.ts` (97 lines)

**Issue:** Unnecessary layer between Input and Audio
```
Current: Input → InputAudioSystem → BladeRenderer → AudioManager
Target:  Input → BladeRenderer → AudioManager
```

**Simplified:** Move swipe detection to BladeRenderer, call audio directly

**Impact:** -97 lines, -1 layer of indirection

---

### 2.2 Consolidate Zustand Store Slices

**File:** `frontend/games/hyper-swiper/game/stores/trading-store-modules/index.ts` (587 lines)

**Issues:**
- 131-line `connect()` method with 20+ event handlers
- Duplicate position handling (opened/closed/liquidated)
- Repeated `if (!socket) return` pattern

**Simplifications:**
1. Extract event handlers to separate methods
2. Create `safeEmit` helper for socket null checks
3. Consolidate duplicate position logic

```typescript
// Helper
const safeEmit = (event: string, data?: unknown) => {
  const { socket } = get()
  if (!socket) return
  socket.emit(event, data)
}

// Extract handlers
handleMatchFound(data: MatchFoundEvent) { ... }
handleCoinSpawn(coin: CoinSpawnEvent) { ... }
handlePositionOpened(position: Position) { ... }
```

**Impact:** -100 lines, better organization

---

### 2.3 Inline PriceGraphSystem

**File:** `frontend/games/hyper-swiper/game/systems/PriceGraphSystem.ts` (40 lines)

**Issue:** Single method wrapper around SnakePriceGraph

**Simplified:** Call SnakePriceGraph.update() directly in TradingScene

**Impact:** -40 lines, -1 file

---

### 2.4 Simplify TradingSceneServices

**File:** `frontend/games/hyper-swiper/game/systems/TradingSceneServices.ts` (108 lines)

**Issue:** Over-engineered dependency injection for simple orchestration

**Simplified:** Direct instantiation in TradingScene

**Impact:** -50 lines, -1 file

---

### 2.5 Simplify Position Interface

**File:** `frontend/games/hyper-swiper/game/types/trading.ts` (284 lines)

**Current:**
```typescript
interface Position {
  id, playerId, playerName, isLong, leverage, collateral,
  openPrice, closePrice, realizedPnl, openedAt, settledAt, status
} // 12 properties
```

**Issues:**
- `isLong: boolean` should be `coinType: CoinType`
- `openedAt`/`settledAt` redundant with `status`
- `leverage`/`collateral` are fixed (500X/$1)

**Simplified:**
```typescript
interface Position {
  id: string
  playerId: string
  playerName: string
  coinType: CoinType  // 'long' | 'short'
  openPrice: number
  closePrice: number | null
  realizedPnl: number
  status: PositionStatus
} // 8 properties
```

**Impact:** -4 properties, clearer semantics

---

### 2.6 Unify BladeRenderer Ribbon Rendering

**File:** `frontend/games/hyper-swiper/game/systems/BladeRenderer.ts` (317 lines)

**Issue:** 4x duplicate code for ribbon edge construction (lines 170-176)

**Simplified:** Extract geometry helper

```typescript
function buildRibbonEdges(points: Point[], width: number): RibbonEdges {
  // Unified edge construction
}
```

**Impact:** -30 lines

---

### 2.7 Consolidate ParticleSystem Drawing Methods

**File:** `frontend/games/hyper-swiper/game/systems/ParticleSystem.ts` (312 lines)

**Issue:** Three drawing methods with duplicate patterns
- `drawTriangle` (46 lines)
- `drawVoxel` (44 lines)
- `drawCube` (14 lines)

**Simplified:** Unified drawing with config parameter

**Impact:** -50 lines

---

## 3. Frontend UI Simplification (MEDIUM PRIORITY)

### 3.1 Remove Module-Level Singletons

**Files:**
- `frontend/components/GameCanvasClient.tsx` (global game instance)
- `frontend/hooks/useBaseMiniAppAuth.ts` (cached auth state)

**Issue:** Module-level state that survives React remounts

**Simplified:**
- Use React key prop for remount control
- Pass auth state as props or context

**Impact:** -20 lines, clearer state management

---

### 3.2 Extract Reusable Animation Config

**Files:** Multiple components with duplicate Framer Motion animations

**Issue:** Same glow animation defined 3+ times

**Simplified:**
```typescript
// lib/animations.ts
export const GLOW_ANIMATION = {
  textShadow: ['0 0 10px rgba(0,243,255,0.3)', '0 0 20px rgba(0,243,255,0.5)', '0 0 10px rgba(0,243,255,0.3)'],
  transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' }
}
```

**Impact:** -30 lines, DRY compliance

---

### 3.3 Remove Redundant CountUp Component

**File:** `frontend/components/CountUp.tsx` (21 lines)

**Issue:** Wrapper around `formatPrice` with no added functionality

**Simplified:** Use `formatPrice(value)` directly

**Impact:** -21 lines, -1 file

---

### 3.4 Simplify Nested Conditional Rendering

**File:** `frontend/games/hyper-swiper/components/MatchmakingScreen.tsx` (lines 152-220)

**Issue:** 4 levels of nested conditions for lobby state

**Simplified:** Extract to LobbyPanel component with early returns

**Impact:** -40 lines, better readability

---

### 3.5 Simplify AudioManager Setup

**File:** `frontend/games/hyper-swiper/game/systems/AudioManager.ts` (lines 64-105)

**Issue:** 3 separate setup functions for audio unlock

**Simplified:** Single unified setup function

```typescript
setupAudioListeners() {
  const unlock = () => this.ctx?.resume()
  document.addEventListener('touchstart', unlock, { passive: true })
  document.addEventListener('click', unlock)
  document.addEventListener('visibilitychange', unlock)
}
```

**Impact:** -20 lines

---

### 3.6 Move Inline Styles to CSS

**File:** `frontend/components/GameCanvas.tsx` (lines 61-67)

**Issue:** Inline styles for touch behavior

**Simplified:** CSS class `.phaser-container` with touch properties

**Impact:** Better maintainability

---

### 3.7 Consolidate GameHUD Module Types

**File:** `frontend/games/hyper-swiper/components/GameHUD-modules/types.ts` (44 lines)

**Issue:** Utility functions mixed with types, duplicate `formatTime`

**Simplified:**
- Move utilities to `lib/time-utils.ts`
- Keep only types in types file

**Impact:** -20 lines, better organization

---

### 3.8 Simplify PlayerName Type Guard

**File:** `frontend/components/ens/PlayerName.tsx` (lines 28-32)

**Issue:** Redundant `if (parsedName)` check (always true after username check)

**Simplified:** Remove redundant check

**Impact:** -5 lines

---

## 4. Config/Infrastructure Simplification (MEDIUM PRIORITY)

### 4.1 Consolidate FIXED_LEVERAGE Constant

**Issue:** Defined in TWO places:
- `frontend/app/api/socket/game-events-modules/index.ts:22`
- `frontend/games/hyper-swiper/game/stores/trading-store-modules/index.ts:34`

**Simplified:** Export from `constants.ts`, import everywhere

**Impact:** DRY compliance, sync risk eliminated

---

### 4.2 Unify Config Objects

**Issue:** 6+ config objects scattered across codebase

**Simplified:**
```typescript
// games/hyper-swiper/game/config.ts - SINGLE SOURCE
export const GAME_CONFIG = {
  FIXED_LEVERAGE: 500,
  LIQUIDATION_HEALTH_RATIO: 0.80,
  TIE_EPSILON: 1e-9,
  DURATION: { MIN: 30000, MAX: 150000, DEFAULT: 60000 },
  GRID: { DEFAULT: { rows: 15, cols: 15 }, MAX: { rows: 25, cols: 25 } },
  // ... all game constants
} as const
```

**Impact:** Single source of truth, easier navigation

---

### 4.3 Remove Scene Dimensions Global State

**Issue:** `window.sceneDimensions` used for Phaser → React communication

**Simplified:** Pass dimensions via event bridge props or context

**Impact:** No global state pollution

---

### 4.4 Add Typed Environment Variables

**Issue:** No centralized env validation

**Simplified:**
```typescript
// lib/env.ts
export const env = {
  NEXT_PUBLIC_PRIVY_APP_ID: process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  NEXT_PUBLIC_BASE_SEPOLIA_RPC: process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC!,
} as const

// Validate at startup
Object.entries(env).forEach(([key, value]) => {
  if (!value) throw new Error(`Missing env: ${key}`)
})
```

**Impact:** Type safety, early failure

---

## 5. Implementation Order

### Phase 1: High Impact, Low Risk (Week 1)
1. Consolidate FIXED_LEVERAGE constant
2. Extract lobby player transformation
3. Create safeEmit helper for Zustand
4. Extract reusable animation config
5. Remove redundant CountUp component

### Phase 2: Server Consolidation (Week 2)
1. Simplify SeededRandom → functions
2. Simplify CoinSequence → generator
3. Extract error handling wrapper
4. Remove playerLeverage Map

### Phase 3: Game Logic Cleanup (Week 3)
1. Remove InputAudioSystem layer
2. Inline PriceGraphSystem
3. Simplify TradingSceneServices
4. Consolidate Zustand handlers

### Phase 4: File Consolidation (Week 4)
1. Merge server modules (10 → 4 files)
2. Simplify Position interface
3. Unify config objects
4. Add typed env validation

---

## 6. Metrics & Success Criteria

| Metric | Before | After | Target |
|--------|--------|-------|--------|
| Server modules | 10 files | 4-5 files | 50% reduction |
| Total lines | ~7,500 | ~5,900 | 20-25% reduction |
| Duplicate code blocks | 12+ | 0 | DRY compliance |
| Config objects | 6+ | 1 | Single source |
| Abstraction layers | 8+ | 4 | Simpler architecture |

---

## 7. Verification Checklist

Before marking complete:
- [ ] All tests pass
- [ ] TypeScript compiles with no errors
- [ ] ESLint passes
- [ ] Manual game playthrough works
- [ ] No console errors
- [ ] Performance unchanged or improved

---

## 8. Risks & Mitigations

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Breaking game logic | Medium | Comprehensive testing after each phase |
| Missing edge cases | Low | Verify all game scenarios (match, play, settle) |
| Performance regression | Low | Profile before/after key changes |
| Sync issues with constants | Low | Single source of truth for all shared values |

---

## Appendix: Files to Modify/Delete

### Files to Delete (estimated)
- `frontend/app/api/socket/game-events-modules/SeededRandom.ts`
- `frontend/app/api/socket/game-events-modules/validation.ts` (inline)
- `frontend/games/hyper-swiper/game/systems/InputAudioSystem.ts`
- `frontend/games/hyper-swiper/game/systems/PriceGraphSystem.ts`
- `frontend/games/hyper-swiper/game/systems/TradingSceneServices.ts`
- `frontend/components/CountUp.tsx`

### Files to Consolidate
- Merge `GameRoom.ts` + `RoomManager.ts` into `game-engine.ts`
- Merge `SeededRandom.ts` + `CoinSequence.ts` into `game-engine.ts`
- Merge all config objects into `games/hyper-swiper/game/config.ts`

### Files to Simplify
- `frontend/games/hyper-swiper/game/stores/trading-store-modules/index.ts` (587 → 480 lines)
- `frontend/games/hyper-swiper/game/systems/BladeRenderer.ts` (317 → 280 lines)
- `frontend/games/hyper-swiper/game/systems/ParticleSystem.ts` (312 → 260 lines)
- `frontend/app/api/socket/game-events-modules/index.ts` (1070 → 950 lines)

---

**Next Steps:**
1. Have verification agents review this plan
2. Adjust priorities based on verification findings
3. Begin Phase 1 implementation

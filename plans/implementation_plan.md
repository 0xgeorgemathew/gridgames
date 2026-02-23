# Game Improvements: Coin Sync, Chevron Fix, Spawn Redesign

Three targeted improvements to the Hyper Swiper game loop and rendering.

---

## Proposed Changes

### 1. Coin Synchronization Enforcement

**Problem:** Both players should see the exact same coin at the exact same time. Currently, coin *types and positions* are deterministic via [CoinSequence.ts](file:///Users/george/Workspace/grid-games/frontend/app/api/socket/game-events-modules/CoinSequence.ts) (seeded RNG), but coin *spawn timing* uses `Math.random()` in [index.ts](file:///Users/george/Workspace/grid-games/frontend/app/api/socket/game-events-modules/index.ts#L346-L385) for:
- Spawn interval selection (random between `spawnConfig.minMs` and `spawnConfig.maxMs`)
- Burst chance and burst count decisions

Since the server emits `coin_spawn` to the **entire room** (`io.to(room.id).emit`), both clients already receive the same event at effectively the same time over Socket.IO. The coin data (type, position, velocity) is already deterministic via [CoinSequence](file:///Users/george/Workspace/grid-games/frontend/app/api/socket/game-events-modules/CoinSequence.ts#9-57).

**Assessment:** The sync is already architecturally sound — the server is the single source of truth and broadcasts to both players simultaneously. The `Math.random()` for timing doesn't break sync because the server decides when to spawn and tells both clients at once.

**Hardening changes:**

#### [MODIFY] [index.ts](file:///Users/george/Workspace/grid-games/frontend/app/api/socket/game-events-modules/index.ts)
- Add a **sequence index** to each `coin_spawn` event so clients can detect dropped/reordered events
- Add server-side logging if a coin is spawned while the sequence is exhausted

#### [MODIFY] [CoinSequence.ts](file:///Users/george/Workspace/grid-games/frontend/app/api/socket/game-events-modules/CoinSequence.ts)
- Expose a `getIndex()` method so the server can include the current sequence position in the spawn event

#### [MODIFY] [CoinLifecycleSystem.ts](file:///Users/george/Workspace/grid-games/frontend/games/hyper-swiper/game/systems/CoinLifecycleSystem.ts)
- Add client-side validation: log warning if received coin sequence index is non-monotonic (indicates a dropped event)

#### [MODIFY] [trading.ts](file:///Users/george/Workspace/grid-games/frontend/games/hyper-swiper/game/types/trading.ts)
- Add `sequenceIndex: number` to [CoinSpawnEvent](file:///Users/george/Workspace/grid-games/frontend/games/hyper-swiper/game/types/trading.ts#34-41) type

---

### 2. Chevron Positioning Fix

**Problem:** The price graph chevron (leading indicator in [SnakePriceGraph.ts](file:///Users/george/Workspace/grid-games/frontend/games/hyper-swiper/game/systems/SnakePriceGraph.ts)) can drift into the top portion of the screen or below the grid area during volatile price moves. The `currentY` value is computed as:

```typescript
const hudHeight = 128  // hardcoded top margin
const graphHeight = height - hudHeight
const centerY = graphHeight / 2
const currentY = centerY - (currentPct - this.currentCenterPct) * this.currentZoom
```

There's no clamping, so extreme zoom × price-deviation products can push the chevron outside the visible graph area. The HUD is at the **bottom** of the screen (`fixed bottom-0`), so the `hudHeight=128` acts as a top margin for the graph to avoid the very top of the viewport.

**Fix:**

#### [MODIFY] [SnakePriceGraph.ts](file:///Users/george/Workspace/grid-games/frontend/games/hyper-swiper/game/systems/SnakePriceGraph.ts)
- Clamp `currentY` to stay within `[topPadding, graphHeight - bottomPadding]` where `topPadding ≈ 30px` (avoid absolute top) and `bottomPadding ≈ 80px` (stay above coin spawn zone)
- Apply the same clamp to all `curvePoints[i].y` values so the trail doesn't draw outside the graph area either
- Make `hudHeight` configurable (accept as parameter) instead of hardcoded, for future flexibility

#### [MODIFY] [PriceGraphSystem.ts](file:///Users/george/Workspace/grid-games/frontend/games/hyper-swiper/game/systems/PriceGraphSystem.ts)
- No changes needed — it already passes `height` from `cameras.main.height`

---

### 3. Coin Spawning Redesign — Arcade-Style

**Problem:** Current spawning feels chaotic: bursts can overload the screen, long gaps leave no coins, there's no cap on active coins, and no guarantee of long/short balance.

**Design Goals:**
1. **Max 3 coins** on screen at any time
2. **Always at least 1 long + 1 short** available (guaranteed variety)
3. **Slower, smoother** coin trajectories (easier to swipe in the middle of the arc)
4. **Rhythmic "heartbeat" spawning** — fixed-interval spawns synced to a predictable cadence
5. **No dead zones** — if a coin falls off screen, immediately schedule a replacement
6. **More total spawns** over the game, but calmer moment-to-moment density

**Changes:**

#### [MODIFY] [index.ts](file:///Users/george/Workspace/grid-games/frontend/app/api/socket/game-events-modules/index.ts)
Rewrite [scheduleNextSpawn()](file:///Users/george/Workspace/grid-games/frontend/app/api/socket/game-events-modules/index.ts#346-386):
- Track active coin count on the server (increment on spawn, decrement on `coin_sliced` and when coins are expected to have fallen off — ~2.5s lifetime)
- Enforce max 3 active coins
- Use fixed heartbeat interval (e.g., 1200ms base, scaling down to 900ms in late game)
- On each heartbeat: if active coins < 3, spawn one. If no long or no short is active, force the next coin to fill the gap
- Remove burst logic entirely (bursts conflict with "calm but steady")

#### [MODIFY] [CoinSequence.ts](file:///Users/george/Workspace/grid-games/frontend/app/api/socket/game-events-modules/CoinSequence.ts)
- Add type-biased generation: accept an optional `forceType` parameter on [next()](file:///Users/george/Workspace/grid-games/frontend/app/api/socket/game-events-modules/CoinSequence.ts#33-42) so the server can force a long or short when balance requires it
- Slow down default velocities: change `velocityY` range from `[-600, -400]` to `[-400, -280]` (lower arc, more hang time in the middle)
- Reduce `velocityX` drift: `[-30, 30]` instead of `[-50, 50]`

#### [MODIFY] [GameRoom.ts](file:///Users/george/Workspace/grid-games/frontend/app/api/socket/game-events-modules/GameRoom.ts)
- Add `activeCoins` map with TTL tracking for auto-expiry
- Simplify [getSpawnInterval()](file:///Users/george/Workspace/grid-games/frontend/app/api/socket/game-events-modules/GameRoom.ts#203-226) to return a single heartbeat interval (no min/max range, no burst chance)
- Add methods: `getActiveCoinCount()`, `getActiveLongCount()`, `getActiveShortCount()`, `expireOldCoins()`

#### [MODIFY] [Token.ts](file:///Users/george/Workspace/grid-games/frontend/games/hyper-swiper/game/objects/Token.ts)
- Adjust gravity from `180` to `120` for smoother, longer arcs
- Increase coin lifetime before cleanup (coins linger longer on screen for easier swiping)

> [!NOTE]
> The heartbeat interval approach is inspired by rhythm games — predictability helps players develop muscle memory. The fixed cadence also feels "fair" since both players can anticipate spawns.

> [!IMPORTANT]
> Instead of changing `velocityX/Y` in [CoinSequence.ts](file:///Users/george/Workspace/grid-games/frontend/app/api/socket/game-events-modules/CoinSequence.ts) AND gravity in [Token.ts](file:///Users/george/Workspace/grid-games/frontend/games/hyper-swiper/game/objects/Token.ts), we could alternatively only adjust gravity and keep velocities as-is. The combined effect of both changes needs tuning in-game. Recommend starting with both changes and adjusting if coins feel too floaty.

---

## Verification Plan

### Manual Verification

1. **Coin Sync (Issue 1):**
   - Open two browser windows/tabs to the same game
   - Start a match between them
   - Watch both screens — coins should appear at the same time with the same type (long/short) and similar position
   - Open browser console on both tabs, check for any `[CoinSync]` sequence warnings

2. **Chevron Positioning (Issue 2):**
   - Play a game during a volatile BTC price period (or simulate by modifying `PriceFeedManager` to inject exaggerated price swings)
   - Observe the chevron — it should never go above approximately 30px from the top of the screen, and should not overlap with coins in the lower portion
   - The ribbon trail should also stay within the graph area

3. **Coin Spawning (Issue 3):**
   - Play a full 2.5-minute game
   - Count max simultaneous coins on screen — should never exceed 3
   - Verify there's always at least 1 long (green) and 1 short (red) visible when 2+ coins are present
   - Coins should arc smoothly and slowly enough to be easily swipeable at the peak
   - No long stretches (>2s) with zero coins visible
   - Spawning should feel rhythmic and predictable

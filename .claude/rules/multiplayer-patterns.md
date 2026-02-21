# Multiplayer Reliability Patterns

Phaser + Socket.IO patterns for preventing race conditions, memory leaks, and silent failures in real-time multiplayer games.

## 1. Race Condition Prevention

Use double-check guards to prevent duplicate operations when async callbacks execute after state changes.

```typescript
const timeoutId = setTimeout(() => {
  if (manager.hasRoom(room.id) && room.openPositions.has(position.id)) {
    settlePosition(io, room, position)
    checkGameOver(io, manager, room)
  }
}, 10000)

room.trackTimeout(timeoutId)
```

**Use with:** `setTimeout`/`setInterval`, async callbacks, event handlers that may fire after cleanup.

---

## 2. Memory Leak Prevention

Track all timers in GameRoom for cleanup. Never use global timers.

```typescript
class GameRoom {
  private intervals = new Set<NodeJS.Timeout>()
  private timeouts = new Set<NodeJS.Timeout>()

  trackTimeout(timeout: NodeJS.Timeout): void {
    this.timeouts.add(timeout)
  }

  trackInterval(interval: NodeJS.Timeout): void {
    this.intervals.add(interval)
  }

  cleanup(): void {
    this.intervals.forEach(clearInterval)
    this.timeouts.forEach(clearTimeout)
    this.intervals.clear()
    this.timeouts.clear()
  }
}

// In RoomManager.deleteRoom
deleteRoom(roomId: string): void {
  const room = this.rooms.get(roomId)
  if (!room) return
  room.cleanup()
  this.rooms.delete(roomId)
}
```

**Use with:** Game loops, spawning timers, settlement timers, any room-scoped `setInterval`/`setTimeout`.

---

## 3. Room Lifecycle Management

Settle all open positions before room deletion to prevent data loss. Delay deletion to ensure events are sent.

```typescript
function endGame(
  io: SocketIOServer,
  manager: RoomManager,
  room: GameRoom,
  reason: 'time_limit' | 'knockout' | 'forfeit'
): void {
  if (room.getIsClosing()) return
  room.setClosing()

  // CRITICAL: Settle all positions before deleting room
  const settlementData = settleAllPositions(io, room)

  io.to(room.id).emit('game_over', {
    winnerId: settlementData.winner?.playerId ?? null,
    winnerName: settlementData.winner?.playerName ?? null,
    reason,
    playerResults: settlementData.playerResults,
  })

  setTimeout(() => manager.deleteRoom(room.id), 1000)
}
```

**Use with:** Game over conditions (time limit, knockout), player disconnect, any state transition ending gameplay.

---

## 4. State Caching

Cache state at creation time, not during async operations. Player positions may change between order creation and settlement.

```typescript
function openPosition(io: SocketIOServer, room: GameRoom, sliceData: SliceData): void {
  const playerIds = room.getPlayerIds()

  // Cached at position creation, not settlement
  const isPlayer1 = sliceData.playerId === playerIds[0]

  // ... position creation logic
}
```

**Use with:** Position creation (player ID, position, timestamp), event emission, any async operation needing stable state.

---

## 5. Client-Side Fallbacks

Clean up orphaned state when server events are missed. Use cleanup intervals to handle network issues gracefully.

**Implementation (trading-store.ts):**

```typescript
cleanupOrphanedPositions: () => {
  const { openPositions, gameSettlement } = get()
  
  // If game has settled, clear all open positions
  if (gameSettlement) {
    set({ openPositions: new Map() })
  }
}
```

**Usage:** Called periodically from client-side effect or after connection events.

**Use with:** Open positions, room state, connection state handling.

---

## 6. Liquidation Guard Pattern

Prevent duplicate liquidation race conditions using guard checks. Ensures each position liquidates exactly once.

**Implementation (game-events-modules/index.ts):**

```typescript
function liquidatePosition(
  io: SocketIOServer,
  room: GameRoom,
  position: OpenPosition,
  currentPrice: number
): void {
  // Double-check position still exists
  if (!room.openPositions.has(position.id)) return

  const { pnl, isProfitable } = calculatePositionPnl(position, currentPrice)
  const healthRatio = calculateCollateralHealthRatio(position, currentPrice)

  // Record liquidation
  room.addClosedPosition({
    positionId: position.id,
    playerId: position.playerId,
    playerName: position.playerName,
    isLong: position.isLong,
    leverage: position.leverage,
    collateral: position.collateral,
    openPrice: position.openPrice,
    closePrice: currentPrice,
    realizedPnl: pnl,
    isProfitable,
    isLiquidated: true,
  })

  // Remove from open positions
  room.removeOpenPosition(position.id)

  // Emit liquidation event
  io.to(room.id).emit('position_liquidated', {
    positionId: position.id,
    playerId: position.playerId,
    // ... other fields
  })
}
```

**Use with:** Position liquidation, any operation that must execute exactly once per entity.

---

## 7. Price Feed Reconnection Pattern

WebSocket connections fail and recover gracefully. Pattern ensures continuous price feed with automatic reconnection.

**Implementation (PriceFeedManager.ts):**

```typescript
class PriceFeedManager {
  private ws: WebSocket | null = null
  private reconnectTimeout: NodeJS.Timeout | null = null
  private isShutdown = false

  connect(symbol: string = 'btcusdt'): void {
    if (this.isShutdown) return

    // Clear pending reconnect
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }

    if (this.ws) this.ws.close()

    const url = `wss://stream.binance.com:9443/ws/${symbol}@aggTrade`
    this.ws = new WebSocket(url)

    this.ws.onclose = () => {
      if (this.isShutdown) return

      // Auto-reconnect after 5s
      this.reconnectTimeout = setTimeout(() => {
        if (!this.isShutdown) {
          this.connect(this.symbol)
        }
      }, 5000)
    }
  }

  disconnect(): void {
    this.isShutdown = true

    // Clear reconnect timeout to prevent reconnection
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }

    // Close WebSocket without triggering onclose
    if (this.ws) {
      this.ws.onclose = null
      this.ws.close()
    }
  }
}
```

**Use with:** WebSocket connections, external APIs, any long-lived connection. Key: shutdown flag prevents reconnection loops.

---

## 8. React-Phaser Bridge Pattern

Communicate between React UI and Phaser game canvas across separate DOMs. Uses global event emitter for cross-DOM messaging.

**Implementation:**

```typescript
// Declare global event bridge (trading-store.ts)
declare global {
  interface Window {
    phaserEvents?: EventEmitter
  }
}

// Server → React → Phaser
socket.on('position_liquidated', (data) => {
  // Update React state
  removeOpenPosition(data.positionId)

  // Bridge to Phaser
  if (window.phaserEvents) {
    window.phaserEvents.emit('position_liquidated', data)
  }
})

// Phaser receives bridge events
TradingScene.ts: create() {
  window.phaserEvents?.on('position_liquidated', (data) => {
    // Phaser visual effects
  })
}

// Phaser → Socket (direct)
handleCoinSlice(coinId: string) {
  socket.emit('slice_coin', { coinId })
}
```

**Architecture:**

```
┌─────────────┐     socket.io      ┌─────────────┐
│   React     │ ←────────────────→ │   Server    │
│   (Zustand) │                    │ (GameRoom)  │
└──────┬──────┘                    └─────────────┘
       │
       │ window.phaserEvents
       │ (EventEmitter bridge)
       ▼
┌─────────────┐
│   Phaser    │ (Game canvas, separate DOM)
│  (Scene)    │
└─────────────┘
```

**Use with:** Cross-DOM communication, React-Phaser integration, visual effects triggered by server events. Never mix React UI rendering with Phaser canvas.

---

## 9. Phaser Initialization Pattern

Singleton Phaser instance with React integration. Prevents multiple Phaser instances and ensures proper cleanup.

**Implementation (GameCanvasClient.tsx):**

```typescript
export default function GameCanvasClient({ scene = 'GridScene' }: GameCanvasClientProps) {
  const gameRef = useRef<Phaser.Game | null>(null)

  useEffect(() => {
    // Prevent duplicate initialization
    if (gameRef.current) return

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: 'phaser-container',
      // ... config
    }

    gameRef.current = new Phaser.Game(config)

    // Cleanup on unmount
    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true)
        gameRef.current = null
      }
    }
  }, [])

  return <div id="phaser-container" />
}
```

**Pattern:** Dynamic import with React lazy loading prevents SSR issues.

```typescript
// GameCanvas.tsx (wrapper)
const GameCanvasClient = dynamic(
  () import('./GameCanvasClient').then((mod) => mod.default),
  { ssr: false }
)
```

**Use with:** Phaser integration, canvas-based games, any library requiring DOM access after mount.

---

## 10. Seeded RNG Pattern

Deterministic random number generation ensures all players see identical coin sequences regardless of device. Only screen positions differ.

**Implementation (SeededRandom.ts):**

```typescript
class SeededRandom {
  private seed: number

  constructor(seed: number) {
    this.seed = seed
  }

  next(): number {
    this.seed = (this.seed * 1664525 + 1013904223) % 4294967296
    return this.seed / 4294967296
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min
  }
}
```

**Usage:**
```typescript
const seed = hashCode(roomId)
const rng = new SeededRandom(seed)
const coinType = COIN_TYPES[rng.nextInt(0, COIN_TYPES.length - 1)]
```

**Use with:** Coin spawning, any game-randomness that must be identical across clients.

---

## 11. Wave-Based Spawn Configuration

Progressive difficulty through pre-configured spawn waves. Ensures fair gameplay with increasing intensity.

**Configuration (CoinSequence.ts):**

```typescript
const SPAWN_WAVES = [
  { duration: 5000, spawnRate: 3000, burstChance: 0.10 },  // Warmup
  { duration: 10000, spawnRate: 2500, burstChance: 0.15 }, // Ramp
  { duration: 10000, spawnRate: 2000, burstChance: 0.25 }, // Intensity
  { duration: 5000, spawnRate: 1500, burstChance: 0.40 },  // Climax
]
```

**Features:**
- Time-based wave progression (5s warmup → 10s ramp → 10s intensity → 5s climax)
- Spawn rate decreases (intensity increases) over time
- Burst spawning: 1-3 coins with 100ms stagger (Fruit Ninja feel)
- Ensures both players face identical difficulty curves

**Use with:** Game loop spawning, progressive difficulty.

---

## 12. Liquidation Monitoring Pattern

Real-time position monitoring on every price update. Checks collateral health ratio for all open positions.

**Implementation (game-events-modules/index.ts):**

```typescript
function checkLiquidations(io: SocketIOServer, manager: RoomManager, currentPrice: number): void {
  for (const room of manager.getAllRooms()) {
    // Skip rooms that are closing or shutdown
    if (room.getIsClosing() || room.isShutdown) continue

    // Check each open position in the room
    for (const [, position] of room.openPositions) {
      if (shouldLiquidate(position, currentPrice)) {
        liquidatePosition(io, room, position, currentPrice)
      }
    }
  }
}

// Called on every price update
priceFeed.setBroadcastCallback((data) => {
  io.emit('btc_price', data)

  // Check all active rooms for liquidations
  if (roomManagerRef) {
    checkLiquidations(io, roomManagerRef, data.price)
  }
})
```

**Use with:** Real-time position monitoring, price-based triggers.

---

## Key Principles

1. **Track everything:** Timers, positions, rooms for cleanup
2. **Double-check guards:** Verify state before async operations
3. **Cache at creation:** Store state when events occur
4. **Clean up first:** Settle pending operations before deleting
5. **Graceful degradation:** Show errors instead of crashing
6. **Shutdown flags:** Prevent reconnection loops during cleanup
7. **Bridge carefully:** Use event emitters for cross-DOM communication

## Pattern Quick Reference

| Pattern | Purpose | File |
|---------|---------|------|
| Double-check guards | Race condition prevention | [`game-events-modules/index.ts`](frontend/app/api/socket/game-events-modules/index.ts) |
| Timer tracking | Memory leak prevention | `GameRoom.timeouts`/`GameRoom.intervals` |
| Room lifecycle | Data loss prevention | [`game-events-modules/index.ts`](frontend/app/api/socket/game-events-modules/index.ts) |
| State caching | Async stability | [`game-events-modules/index.ts`](frontend/app/api/socket/game-events-modules/index.ts) |
| Client fallbacks | Network resilience | [`trading-store-modules/index.ts`](frontend/games/hyper-swiper/game/stores/trading-store-modules/index.ts) |
| Liquidation guard | RAII duplicate prevention | [`game-events-modules/index.ts`](frontend/app/api/socket/game-events-modules/index.ts) |
| Price feed reconnect | WebSocket resilience | [`PriceFeedManager.ts`](frontend/app/api/socket/game-events-modules/PriceFeedManager.ts) |
| React-Phaser bridge | Cross-DOM communication | [`trading-store-modules/index.ts`](frontend/games/hyper-swiper/game/stores/trading-store-modules/index.ts) |
| Phaser singleton | Instance management | [`GameCanvasClient.tsx`](frontend/components/GameCanvasClient.tsx) |
| Seeded RNG | Deterministic coin sequences | [`SeededRandom.ts`](frontend/app/api/socket/game-events-modules/SeededRandom.ts) |
| Wave-based spawning | Progressive difficulty | [`CoinSequence.ts`](frontend/app/api/socket/game-events-modules/CoinSequence.ts) |
| Liquidation monitoring | Real-time position checks | [`game-events-modules/index.ts`](frontend/app/api/socket/game-events-modules/index.ts) |

## See Also

- [`.claude/rules/game-design.md`](.claude/rules/game-design.md) - Game mechanics and architecture

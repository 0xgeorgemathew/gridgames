# HFT Battle Game Design

2-player competitive trading game. Slice coins to predict BTC price movement. **2-minute game. Most dollars wins.**

## Overview

**Objective:** Predict BTC price movement by slicing coins. Correct predictions transfer funds from opponent.

**Starting Conditions:**
- Each player: $10
- Total economy: $20 (zero-sum, $0 floor)
- **Game Duration**: 2 minutes (120 seconds)
- Coin spawn rate: Progressive (warmup → climax)

## Game Structure

| Aspect | Value |
|--------|-------|
| Duration | 2 minutes (120,000ms) |
| Starting cash | $10 each |
| Game end condition | Time limit OR knockout ($0) |

### Deterministic Spawning

All players see the **same coin types in the same sequence** regardless of device. Only screen positions differ.

- **Method**: Pre-generated sequence using seeded RNG (room ID as seed)
- **Tokens per game**: ~60-80 tokens (2 min with progressive spawn rate)
- **Fairness**: Identical opportunities for both players

### Wave-Based Spawning

Progressive difficulty through 4 waves:

| Wave | Duration | Spawn Rate | Burst Chance |
|------|----------|------------|--------------|
| Warmup | 0-30s | 1200-1800ms | 10% |
| Ramp | 30-60s | 1400-1800ms | 15% |
| Intensity | 60-100s | 1000-1400ms | 25% |
| Climax | 100-120s | 700-1100ms | 40% |

## Coin Types

| Type | Spawn Rate | Symbol | Effect | Transfer |
|------|------------|--------|--------|----------|
| Call | 33% (2/6) | ▲ | BTC price goes UP | $1 (×leverage) |
| Put | 33% (2/6) | ▼ | BTC price goes DOWN | $1 (×leverage) |
| Gas | 17% (1/6) | ⚡ | Immediate penalty | $1 (slicer to opponent) |
| Whale | 17% (1/6) | ★ | Leverage power-up (×player's ENS leverage) | No transfer |

## Mechanics

### Settlement

Orders settle 5 seconds after slicing using the latest BTC price from Binance WebSocket feed. Gas and Whale coins settle immediately (Gas applies penalty, Whale activates player's leverage multiplier).

```typescript
const priceChange = (finalPrice - order.priceAtOrder) / order.priceAtOrder

const isCorrect = order.coinType === 'call' ? priceChange > 0
  : order.coinType === 'put' ? priceChange < 0
  : false

const baseImpact = 1
const multiplier = room.getLeverageForPlayer(order.playerId) // From ENS: 1, 2, 5, 10, or 20
const impact = baseImpact * multiplier
```

**Note:** Multiplier fetched from player's ENS text record (`games.grid.leverage`). Default is 1x if not set. Whale coin activates player's leverage multiplier for the next settlement.

### Zero-Sum Transfer

Winner gains transfer amount, loser loses same amount (floor at $0).

```typescript
const winnerId = isCorrect ? order.playerId : playerIds.find((id) => id !== order.playerId)
const loserId = isCorrect ? playerIds.find((id) => id !== order.playerId) : order.playerId

const winner = room.players.get(winnerId)
const loser = room.players.get(loserId)

if (winner) winner.dollars += transfer
if (loser) loser.dollars = Math.max(0, loser.dollars - transfer)
```

### Tug-of-War

Visual indicator of game state balance. Range: -100 to +100.

- Player 1: Positive = losing, Negative = winning
- Player 2: Positive = winning, Negative = losing
- Standard coins shift by ±1, Whale by ±2

```typescript
function calculateTugOfWarDelta(isPlayer1: boolean, isCorrect: boolean, transfer: number): number {
  const delta = isCorrect ? -transfer : transfer
  return isPlayer1 ? delta : -delta
}
```

### Special Coins

**Gas (⚡):** Settles immediately on slice. Slicer pays $1 to opponent.

```typescript
if (data.coinType === 'gas') {
  const player = room.players.get(playerId)
  const opponent = room.players.get(room.getPlayerIds().find((id) => id !== playerId) || '')

  if (player) player.dollars = Math.max(0, player.dollars - 1)
  if (opponent) opponent.dollars += 1
  room.tugOfWar += playerId === playerIds[0] ? 1 : -1
}
```

**Whale (★):** Activates player's leverage multiplier based on their ENS text record. Multiplier applies to next call/put settlement (not time-based). Does not create a pending order - activates immediately.

```typescript
if (data.coinType === 'whale') {
  const leverage = room.getLeverageForPlayer(playerId) // From ENS: 2, 5, 10, or 20
  room.activateWhaleMultiplier(playerId, leverage)

  io.to(room.id).emit('whale_multiplier_activated', {
    playerId,
    playerName: room.players.get(playerId)?.name || 'Unknown',
    multiplier: leverage,
  })

  return // Whale doesn't create an order
}
```

**Leverage Options:** 1x (default), 2x, 5x, 10x, 20x - set by player via ENS text record (`games.grid.leverage`).

## Game Flow

1. Two players queue → RoomManager creates room → Both join Socket.IO room
2. Wait for both clients to signal ready → `game_start` event emitted
3. Coins spawn with progressive spawn rate (wave-based)
4. Player slices coin:
   - **Call/Put**: Order created with 5s countdown
   - **Gas**: Immediate penalty ($1 from slicer to opponent)
   - **Whale**: Leverage multiplier activated for slicing player
5. After 5s, price checked → Winner/loser determined → Funds transferred
6. Game ends after 2 minutes OR knockout ($0)

## Win Conditions

1. **Knockout (Instant):** Opponent reaches $0
2. **Time Limit:** 2 minutes expire, highest dollar amount wins

```typescript
function endGame(io: SocketIOServer, manager: RoomManager, room: GameRoom): void {
  // Settle all pending orders
  for (const [orderId, order] of room.pendingOrders) {
    settleOrder(io, room, order)
  }

  const winner = room.getWinner()
  const playerIds = room.getPlayerIds()
  const p1 = room.players.get(playerIds[0])
  const p2 = room.players.get(playerIds[1])

  io.to(room.id).emit('game_over', {
    winnerId: winner?.id,
    winnerName: winner?.name,
    reason: 'time_limit',
    player1Dollars: p1?.dollars ?? GAME_CONFIG.STARTING_CASH,
    player2Dollars: p2?.dollars ?? GAME_CONFIG.STARTING_CASH,
  })

  setTimeout(() => manager.deleteRoom(room.id), 1000)
}
```

## Implementation Files

- `frontend/app/api/socket/game-events.ts` - Server-side logic (settlement, spawning, game loop)
- `frontend/game/stores/trading-store.ts` - Client state (orders, settlements, tug-of-war)
- `frontend/game/scenes/TradingScene.ts` - Phaser scene (rendering, input)
- `frontend/game/systems/` - Extracted game systems (CoinRenderer, BladeRenderer, ParticleSystem, VisualEffects, AudioManager)
- `frontend/lib/ens.ts` - ENS integration (leverage fetching, stats)
- `frontend/game/constants.ts` - Game configuration (GAME_DURATION_MS: 120000)

## See Also

- `.claude/rules/multiplayer-patterns.md` - Reliability patterns
- `frontend/PRICE_SETTLEMENT_ARCHITECTURE.md` - Price feed details

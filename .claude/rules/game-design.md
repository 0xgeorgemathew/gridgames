# Hyper Swiper Game Design

2-player competitive trading game. Slice coins to open positions on BTC price movement. **Perp-style positions with real-time PnL and liquidation.**

## Overview

**Objective:** Open LONG or SHORT positions on BTC price. Highest PnL at game end wins.

**Starting Conditions:**

- Each player: $10
- Total economy: $20 (zero-sum, $0 floor)
- **Game Mode**: Single 2.5-minute round
- **Game Duration**: 150 seconds (150,000ms)
- Coin spawn rate: Variable by wave (1.5s - 3s)

## Game Structure

### Single Round Format

| Aspect              | Value                              |
| ------------------- | ---------------------------------- |
| Game duration       | 2.5 minutes (150,000ms)            |
| Starting cash       | $10 each                           |
| Position collateral | $1 per position                    |
| Leverage            | Fixed 500X                         |
| Max positions       | 10 per player (limited by balance) |
| Game end            | Time limit or double knockout      |

### Deterministic Spawning

All players see the **same coin types in the same sequence** regardless of device. Only screen positions differ.

- **Method**: Pre-generated sequence using seeded RNG (room ID as seed)
- **Tokens per game**: ~50-80 tokens (150s with variable spawn rate)
- **Fairness**: Identical opportunities for both players

## Coin Types

| Type | Spawn Rate | Symbol | Effect                            |
| ---- | ---------- | ------ | --------------------------------- |
| Long | 50%        | ▲      | Opens LONG position (profit up)   |
| Short| 50%        | ▼      | Opens SHORT position (profit down)|

**Note:** Gas (⚡) and Whale (★) coins have been removed. Only Long and Short coins exist.

## Mechanics

### Perp-Style Positions

Positions stay **OPEN** until game end. No 5-second settlement timer.

```typescript
// Position structure
interface Position {
  id: string
  playerId: string
  playerName: string
  isLong: boolean           // Direction
  leverage: number          // Fixed at 100
  collateral: number        // Fixed at $1
  openPrice: number         // Entry price
  closePrice: number | null // Set at game end
  realizedPnl: number       // 0 until settled
  status: 'open' | 'settled'
}
```

### PnL Calculation

```typescript
// Real-time PnL calculation
function calculatePnl(position: Position, currentPrice: number): number {
  const priceChange = (currentPrice - position.openPrice) / position.openPrice
  const directionMultiplier = position.isLong ? 1 : -1
  return position.collateral * position.leverage * priceChange * directionMultiplier
}
```

### Liquidation System

Positions are liquidated when collateral health ratio ≤ 80%.

```typescript
// Collateral Health Ratio = (Net Collateral + PnL) / Net Collateral
function calculateHealthRatio(position: Position, currentPrice: number): number {
  const pnl = calculatePnl(position, currentPrice)
  const netCollateral = position.collateral
  return (netCollateral + pnl) / netCollateral
}

function shouldLiquidate(position: Position, currentPrice: number): boolean {
  return calculateHealthRatio(position, currentPrice) <= 0.80
}
```

**Liquidation Flow:**
1. Price feed updates on every trade
2. Check all open positions for liquidation
3. If health ratio ≤ 80%, force-close position
4. Emit `position_liquidated` event to room
5. Record realized PnL at liquidation price

### Game End Settlement

All open positions are settled at game end using the final BTC price.

```typescript
function settleAllPositions(io: SocketIOServer, room: GameRoom): GameSettlementData {
  const closePrice = priceFeed.getLatestPrice()
  const settlements: PositionSettlementResult[] = []

  // Include already-liquidated positions
  settlements.push(...room.closedPositions)

  // Settle all open positions
  for (const [positionId, position] of room.openPositions) {
    const { pnl, isProfitable } = calculatePositionPnl(position, closePrice)
    settlements.push({
      positionId,
      playerId: position.playerId,
      playerName: position.playerName,
      isLong: position.isLong,
      leverage: position.leverage,
      collateral: position.collateral,
      openPrice: position.openPrice,
      closePrice,
      realizedPnl: pnl,
      isProfitable,
      isLiquidated: false,
    })
  }

  // Calculate player totals and determine winner
  const playerResults = calculatePlayerResults(room, settlements)
  const winner = determineWinner(playerResults)

  return { closePrice, positions: settlements, playerResults, winner }
}
```

### Winner Determination

Winner is determined by total PnL (not balance).

```typescript
function determineWinner(playerResults: PlayerSettlementResult[]): Winner | null {
  const sorted = [...playerResults].sort((a, b) => b.totalPnl - a.totalPnl)
  
  // Tie check (within epsilon)
  if (sorted.length > 1 && Math.abs(sorted[0].totalPnl - sorted[1].totalPnl) <= 1e-9) {
    return null
  }
  
  return {
    playerId: sorted[0].playerId,
    playerName: sorted[0].playerName,
    winningBalance: sorted[0].finalBalance,
  }
}
```

## Game Flow

### Match Creation

1. Two players queue → RoomManager creates room → Both join Socket.IO room
2. `match_found` event emitted with player data
3. Wait for both clients to signal ready (`client_ready`)
4. 10-second timeout if clients don't signal ready

### Gameplay

1. `game_start` event emitted with duration (150,000ms)
2. Coins spawn with variable rates (wave-based difficulty)
3. Player slices coin:
   - **Long/Short**: Opens position with $1 collateral, 500X leverage
   - Balance deducted by $1 collateral
4. Real-time liquidation monitoring on every price update
5. Timer counts down from 150 seconds

### Game End

1. Time expires OR both players knockout
2. `settleAllPositions()` called
3. `game_over` event emitted with settlement data:
   ```typescript
   {
     winnerId: string | null,
     winnerName: string | null,
     reason: 'time_limit' | 'knockout' | 'forfeit',
     playerResults: PlayerSettlementResult[]
   }
   ```
4. Room deleted after 1-second delay

## Win Conditions

1. **Time Limit**: 150 seconds expire, highest total PnL wins
2. **Knockout**: Both positions liquidated (rare with $10 balance)
3. **Forfeit**: Opponent disconnects
4. **Tie**: Equal total PnL (within epsilon)

## Implementation Files

- [`frontend/app/api/socket/game-events-modules/index.ts`](frontend/app/api/socket/game-events-modules/index.ts) - Server-side logic (settlement, spawning, game loop)
- [`frontend/app/api/socket/game-events-modules/GameRoom.ts`](frontend/app/api/socket/game-events-modules/GameRoom.ts) - Room state management
- [`frontend/app/api/socket/game-events-modules/CoinSequence.ts`](frontend/app/api/socket/game-events-modules/CoinSequence.ts) - Deterministic coin generation
- [`frontend/games/hyper-swiper/game/stores/trading-store-modules/index.ts`](frontend/games/hyper-swiper/game/stores/trading-store-modules/index.ts) - Client state (positions, settlements)
- [`frontend/games/hyper-swiper/game/scenes/TradingScene.ts`](frontend/games/hyper-swiper/game/scenes/TradingScene.ts) - Phaser scene (rendering, input)
- [`frontend/games/hyper-swiper/game/systems/`](frontend/games/hyper-swiper/game/systems/) - Extracted game systems (CoinRenderer, BladeRenderer, ParticleSystem, VisualEffects, AudioManager)
- [`frontend/games/hyper-swiper/game/constants.ts`](frontend/games/hyper-swiper/game/constants.ts) - Game economy constants

## See Also

- [`.claude/rules/multiplayer-patterns.md`](.claude/rules/multiplayer-patterns.md) - Reliability patterns

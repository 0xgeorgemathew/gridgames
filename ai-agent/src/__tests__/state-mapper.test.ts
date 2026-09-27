// =============================================================================
// STATE MAPPER TESTS
// Unit tests for the pure mapTradingStateToGameContext function.
// =============================================================================
import { describe, expect, it } from 'bun:test'
import { mapTradingStateToGameContext } from '../context/state-mapper.ts'
import type { RawTradingStateSnapshot, RawPosition, PriceTick, RecentAction } from '../context/state-mapper.types.ts'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const NOW = Date.now()
const TEN_SECONDS_AGO = NOW - 10_000

function createBaseSnapshot(overrides: Partial<RawTradingStateSnapshot> = {}): RawTradingStateSnapshot {
  return {
    isConnected: true,
    isMatching: false,
    isPlaying: true,
    isGameOver: false,
    localPlayerId: 'player-1',
    isPlayer1: true,
    players: [
      { id: 'player-1', name: 'Alice', dollars: 10, score: 0 },
      { id: 'player-2', name: 'Bob', dollars: 10, score: 0 },
    ],
    gameTimeRemaining: 60,
    selectedGameDuration: 60000,
    openPositions: [],
    priceData: { symbol: 'BTC', price: 67000, change: 500, changePercent: 0.75 },
    firstPrice: 66500,
    isPriceConnected: true,
    leverage: 500,
    stakeAmount: 1,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('mapTradingStateToGameContext', () => {
  describe('empty state', () => {
    it('returns null localPlayer/opponent when no players match', () => {
      const ctx = mapTradingStateToGameContext(
        createBaseSnapshot({ localPlayerId: 'unknown', players: [] }),
      )
      expect(ctx.localPlayer).toBeNull()
      expect(ctx.opponent).toBeNull()
    })

    it('returns empty positions array when no positions exist', () => {
      const ctx = mapTradingStateToGameContext(createBaseSnapshot())
      expect(ctx.positions).toHaveLength(0)
      expect(ctx.ownPositions).toHaveLength(0)
      expect(ctx.opponentPositions).toHaveLength(0)
    })

    it('returns null capacity when localPlayer or opponent is missing', () => {
      const ctx = mapTradingStateToGameContext(
        createBaseSnapshot({ localPlayerId: 'unknown', players: [] }),
      )
      expect(ctx.capacity).toBeNull()
    })
  })

  describe('price context', () => {
    it('maps price data correctly', () => {
      const ctx = mapTradingStateToGameContext(createBaseSnapshot())
      expect(ctx.price.symbol).toBe('BTC')
      expect(ctx.price.currentPrice).toBe(67000)
      expect(ctx.price.firstPrice).toBe(66500)
      expect(ctx.price.changeFromStartPercent).toBe(0.75)
      expect(ctx.price.isPriceConnected).toBe(true)
    })

    it('handles null price data', () => {
      const ctx = mapTradingStateToGameContext(
        createBaseSnapshot({ priceData: null, firstPrice: null }),
      )
      expect(ctx.price.currentPrice).toBeNull()
      expect(ctx.price.firstPrice).toBeNull()
      expect(ctx.price.changeFromStartPercent).toBeNull()
    })

    it('defaults symbol to BTC when no price data', () => {
      const ctx = mapTradingStateToGameContext(
        createBaseSnapshot({ priceData: null }),
      )
      expect(ctx.price.symbol).toBe('BTC')
    })
  })

  describe('match context', () => {
    it('maps match fields correctly', () => {
      const ctx = mapTradingStateToGameContext(createBaseSnapshot())
      expect(ctx.match.isPlaying).toBe(true)
      expect(ctx.match.timeRemainingSeconds).toBe(60)
      expect(ctx.match.matchDurationSeconds).toBe(60) // 60000ms → 60s
      expect(ctx.match.stakeAmount).toBe(1)
      expect(ctx.match.fixedLeverage).toBe(500)
    })
  })

  describe('player context', () => {
    it('partitions local player and opponent correctly', () => {
      const ctx = mapTradingStateToGameContext(createBaseSnapshot())
      expect(ctx.localPlayer).toEqual({ name: 'Alice', balance: 10, score: 0, initialBalance: undefined, balanceDelta: undefined })
      expect(ctx.opponent).toEqual({ name: 'Bob', balance: 10, score: 0, initialBalance: undefined, balanceDelta: undefined })
    })
  })

  describe('position mapping', () => {
    it('partitions own and opponent positions', () => {
      const ctx = mapTradingStateToGameContext({
        ...createBaseSnapshot(),
        openPositions: [
          ['pos-1', {
            id: 'pos-1', playerId: 'player-1', playerName: 'Alice',
            isUp: true, leverage: 500, collateral: 10, openPrice: 66500,
            closePrice: null, realizedPnl: 0, openedAt: TEN_SECONDS_AGO, status: 'open',
          }],
          ['pos-2', {
            id: 'pos-2', playerId: 'player-2', playerName: 'Bob',
            isUp: false, leverage: 500, collateral: 10, openPrice: 67500,
            closePrice: null, realizedPnl: 0, openedAt: TEN_SECONDS_AGO, status: 'open',
          }],
        ],
      })

      expect(ctx.ownPositions).toHaveLength(1)
      expect(ctx.ownPositions[0].owner).toBe('you')
      expect(ctx.ownPositions[0].direction).toBe('long')

      expect(ctx.opponentPositions).toHaveLength(1)
      expect(ctx.opponentPositions[0].owner).toBe('opponent')
      expect(ctx.opponentPositions[0].direction).toBe('short')
    })

    it('filters out settled positions', () => {
      const ctx = mapTradingStateToGameContext({
        ...createBaseSnapshot(),
        openPositions: [
          ['pos-1', {
            id: 'pos-1', playerId: 'player-1', playerName: 'Alice',
            isUp: true, leverage: 500, collateral: 10, openPrice: 66500,
            closePrice: 67000, realizedPnl: 5, openedAt: TEN_SECONDS_AGO, status: 'settled',
          }],
        ],
      })
      expect(ctx.positions).toHaveLength(0)
    })

    it('computes canClose correctly for own positions', () => {
      const ctx = mapTradingStateToGameContext({
        ...createBaseSnapshot(),
        openPositions: [
          // LONG with price above open → can close
          ['pos-1', {
            id: 'pos-1', playerId: 'player-1', playerName: 'Alice',
            isUp: true, leverage: 500, collateral: 10, openPrice: 66000,
            closePrice: null, realizedPnl: 0, openedAt: TEN_SECONDS_AGO, status: 'open',
          }],
          // LONG with price below open → cannot close
          ['pos-2', {
            id: 'pos-2', playerId: 'player-1', playerName: 'Alice',
            isUp: true, leverage: 500, collateral: 10, openPrice: 68000,
            closePrice: null, realizedPnl: 0, openedAt: TEN_SECONDS_AGO, status: 'open',
          }],
          // SHORT with price below open → can close
          ['pos-3', {
            id: 'pos-3', playerId: 'player-1', playerName: 'Alice',
            isUp: false, leverage: 500, collateral: 10, openPrice: 68000,
            closePrice: null, realizedPnl: 0, openedAt: TEN_SECONDS_AGO, status: 'open',
          }],
          // SHORT with price above open → cannot close
          ['pos-4', {
            id: 'pos-4', playerId: 'player-1', playerName: 'Alice',
            isUp: false, leverage: 500, collateral: 10, openPrice: 66000,
            closePrice: null, realizedPnl: 0, openedAt: TEN_SECONDS_AGO, status: 'open',
          }],
        ],
      })

      // LONG profitable (67000 > 66000)
      expect(ctx.ownPositions.find((p) => p.id === 'pos-1')?.canClose).toBe(true)
      // LONG underwater (67000 < 68000)
      expect(ctx.ownPositions.find((p) => p.id === 'pos-2')?.canClose).toBe(false)
      // SHORT profitable (67000 < 68000)
      expect(ctx.ownPositions.find((p) => p.id === 'pos-3')?.canClose).toBe(true)
      // SHORT underwater (67000 > 66000)
      expect(ctx.ownPositions.find((p) => p.id === 'pos-4')?.canClose).toBe(false)
    })

    it('opponent positions always have canClose=false', () => {
      const ctx = mapTradingStateToGameContext({
        ...createBaseSnapshot(),
        openPositions: [
          ['pos-1', {
            id: 'pos-1', playerId: 'player-2', playerName: 'Bob',
            isUp: true, leverage: 500, collateral: 10, openPrice: 66000,
            closePrice: null, realizedPnl: 0, openedAt: TEN_SECONDS_AGO, status: 'open',
          }],
        ],
      })
      expect(ctx.opponentPositions[0].canClose).toBe(false)
    })

    it('computes priceDistancePercent correctly', () => {
      const ctx = mapTradingStateToGameContext({
        ...createBaseSnapshot(),
        openPositions: [
          // LONG: price went up 500 from 66500 → +0.75%
          ['pos-long', {
            id: 'pos-long', playerId: 'player-1', playerName: 'Alice',
            isUp: true, leverage: 500, collateral: 10, openPrice: 66500,
            closePrice: null, realizedPnl: 0, openedAt: TEN_SECONDS_AGO, status: 'open',
          }],
          // SHORT: price went up 500 from 67500 → should be negative for short (underwater)
          ['pos-short', {
            id: 'pos-short', playerId: 'player-1', playerName: 'Alice',
            isUp: false, leverage: 500, collateral: 10, openPrice: 67500,
            closePrice: null, realizedPnl: 0, openedAt: TEN_SECONDS_AGO, status: 'open',
          }],
        ],
      })

      const longPos = ctx.ownPositions.find((p) => p.id === 'pos-long')!
      // (67000 - 66500) / 66500 * 100 ≈ 0.75%
      expect(longPos.priceDistancePercent).not.toBeNull()
      expect(longPos.priceDistancePercent!).toBeGreaterThan(0)

      const shortPos = ctx.ownPositions.find((p) => p.id === 'pos-short')!
      // Short at 67500, price now 67000 → in-the-money → positive
      // For short: isUp=false, so sign is flipped: -((67000-67500)/67500)*100 = -(-0.74%) = +0.74%
      expect(shortPos.priceDistancePercent).not.toBeNull()
      expect(shortPos.priceDistancePercent!).toBeGreaterThan(0)
    })

    it('returns null priceDistancePercent when no price data', () => {
      const ctx = mapTradingStateToGameContext({
        ...createBaseSnapshot(),
        priceData: null,
        openPositions: [
          ['pos-1', {
            id: 'pos-1', playerId: 'player-1', playerName: 'Alice',
            isUp: true, leverage: 500, collateral: 10, openPrice: 66500,
            closePrice: null, realizedPnl: 0, openedAt: TEN_SECONDS_AGO, status: 'open',
          }],
        ],
      })
      expect(ctx.ownPositions[0].priceDistancePercent).toBeNull()
    })
  })

  describe('capacity calculation', () => {
    it('computes correct capacity with equal balances', () => {
      const ctx = mapTradingStateToGameContext(createBaseSnapshot())
      // Both players have $10, stake is $1, 0 open positions each
      expect(ctx.capacity).not.toBeNull()
      expect(ctx.capacity!.maxOpenPositions).toBe(10)
      expect(ctx.capacity!.remainingOpenSlots).toBe(10)
      expect(ctx.capacity!.limitingReason).toBe('player_balance') // first constraint found (not actually binding)
    })

    it('limits by player balance when player has less', () => {
      const ctx = mapTradingStateToGameContext({
        ...createBaseSnapshot(),
        players: [
          { id: 'player-1', name: 'Alice', dollars: 3, score: 0 },
          { id: 'player-2', name: 'Bob', dollars: 10, score: 0 },
        ],
      })
      expect(ctx.capacity!.maxOpenPositions).toBe(3)
      expect(ctx.capacity!.limitingReason).toBe('player_balance')
    })

    it('limits by opponent funding when opponent has less', () => {
      const ctx = mapTradingStateToGameContext({
        ...createBaseSnapshot(),
        players: [
          { id: 'player-1', name: 'Alice', dollars: 10, score: 0 },
          { id: 'player-2', name: 'Bob', dollars: 4, score: 0 },
        ],
      })
      expect(ctx.capacity!.maxOpenPositions).toBe(4)
      expect(ctx.capacity!.limitingReason).toBe('opponent_funding')
    })

    it('limits by risk reserve when opponent has many open positions', () => {
      const ctx = mapTradingStateToGameContext({
        ...createBaseSnapshot(),
        players: [
          { id: 'player-1', name: 'Alice', dollars: 10, score: 0 },
          { id: 'player-2', name: 'Bob', dollars: 10, score: 0 },
        ],
        openPositions: Array.from({ length: 7 }, (_, i): [string, RawPosition] => [
          `opp-pos-${i}`,
          {
            id: `opp-pos-${i}`, playerId: 'player-2', playerName: 'Bob',
            isUp: true, leverage: 500, collateral: 10, openPrice: 66500,
            closePrice: null, realizedPnl: 0, openedAt: TEN_SECONDS_AGO, status: 'open',
          },
        ]),
      })
      // playerBalanceCapacity = 10, opponentFundingCapacity = 3 (10 - 7 already open)
      // riskReserveCapacity = 10 - 7 = 3
      expect(ctx.capacity!.maxOpenPositions).toBe(3)
      expect(ctx.capacity!.limitingReason).toBe('risk_reserve')
    })

    it('returns zero capacity with zero balance', () => {
      const ctx = mapTradingStateToGameContext({
        ...createBaseSnapshot(),
        players: [
          { id: 'player-1', name: 'Alice', dollars: 0, score: 0 },
          { id: 'player-2', name: 'Bob', dollars: 10, score: 0 },
        ],
      })
      expect(ctx.capacity!.maxOpenPositions).toBe(0)
      expect(ctx.capacity!.remainingOpenSlots).toBe(0)
      expect(ctx.capacity!.limitingReason).toBe('player_balance')
    })

    it('accounts for already-open positions in remaining slots', () => {
      const ctx = mapTradingStateToGameContext({
        ...createBaseSnapshot(),
        openPositions: [
          ['pos-1', {
            id: 'pos-1', playerId: 'player-1', playerName: 'Alice',
            isUp: true, leverage: 500, collateral: 10, openPrice: 66500,
            closePrice: null, realizedPnl: 0, openedAt: TEN_SECONDS_AGO, status: 'open',
          }],
          ['pos-2', {
            id: 'pos-2', playerId: 'player-1', playerName: 'Alice',
            isUp: false, leverage: 500, collateral: 10, openPrice: 67500,
            closePrice: null, realizedPnl: 0, openedAt: TEN_SECONDS_AGO, status: 'open',
          }],
        ],
      })
      // Max 10, already 2 open → 8 remaining
      expect(ctx.capacity!.remainingOpenSlots).toBe(8)
    })
  })

  describe('summary', () => {
    it('computes correct summary for mixed positions', () => {
      const ctx = mapTradingStateToGameContext({
        ...createBaseSnapshot(),
        openPositions: [
          ['pos-1', {
            id: 'pos-1', playerId: 'player-1', playerName: 'Alice',
            isUp: true, leverage: 500, collateral: 10, openPrice: 66500,
            closePrice: null, realizedPnl: 0, openedAt: TEN_SECONDS_AGO, status: 'open',
          }],
          ['pos-2', {
            id: 'pos-2', playerId: 'player-1', playerName: 'Alice',
            isUp: true, leverage: 500, collateral: 10, openPrice: 66800,
            closePrice: null, realizedPnl: 0, openedAt: TEN_SECONDS_AGO, status: 'open',
          }],
          ['pos-3', {
            id: 'pos-3', playerId: 'player-1', playerName: 'Alice',
            isUp: false, leverage: 500, collateral: 10, openPrice: 67500,
            closePrice: null, realizedPnl: 0, openedAt: TEN_SECONDS_AGO, status: 'open',
          }],
          ['pos-4', {
            id: 'pos-4', playerId: 'player-2', playerName: 'Bob',
            isUp: true, leverage: 500, collateral: 10, openPrice: 66200,
            closePrice: null, realizedPnl: 0, openedAt: TEN_SECONDS_AGO, status: 'open',
          }],
        ],
      })

      expect(ctx.summary.totalOpenPositions).toBe(4)
      expect(ctx.summary.ownOpenCount).toBe(3)
      expect(ctx.summary.opponentOpenCount).toBe(1)
      expect(ctx.summary.ownLongCount).toBe(2)
      expect(ctx.summary.ownShortCount).toBe(1)
      expect(ctx.summary.opponentLongCount).toBe(1)
      expect(ctx.summary.opponentShortCount).toBe(0)
      // 2 long - 1 short = net long
      expect(ctx.summary.netExposureDirection).toBe('net_long')
      // All own positions should have positive priceDistancePercent (in-the-money at 67000)
      expect(ctx.summary.aggregatePriceDistance).toBeGreaterThan(0)
    })

    it('detects net_short exposure', () => {
      const ctx = mapTradingStateToGameContext({
        ...createBaseSnapshot(),
        openPositions: [
          ['pos-1', {
            id: 'pos-1', playerId: 'player-1', playerName: 'Alice',
            isUp: false, leverage: 500, collateral: 10, openPrice: 68000,
            closePrice: null, realizedPnl: 0, openedAt: TEN_SECONDS_AGO, status: 'open',
          }],
        ],
      })
      expect(ctx.summary.netExposureDirection).toBe('net_short')
    })

    it('detects neutral exposure when no own positions', () => {
      const ctx = mapTradingStateToGameContext(createBaseSnapshot())
      expect(ctx.summary.netExposureDirection).toBe('neutral')
    })
  })

  // ---------------------------------------------------------------------------
  // NEW: Short-window price action tests
  // ---------------------------------------------------------------------------

  describe('short-window price action', () => {
    it('computes price deltas correctly', () => {
      const now = Date.now()
      const ctx = mapTradingStateToGameContext({
        ...createBaseSnapshot(),
        priceHistory: [
          { price: 66900, timestamp: now - 1000 },
          { price: 66800, timestamp: now - 5000 },
          { price: 66700, timestamp: now - 15000 },
          { price: 67200, timestamp: now - 30000 },
          { price: 66500, timestamp: now - 25000 },
        ],
        lastPriceUpdate: now - 100,
      })

      // Price delta calculations use the first (oldest) price within the window
      // priceDelta1s: 67000 - 66900 = +0.15%
      expect(ctx.price.priceDelta1s).toBeCloseTo(0.15, 1)
      // priceDelta5s: 67000 - 66800 = +0.30%
      expect(ctx.price.priceDelta5s).toBeCloseTo(0.30, 1)
      expect(ctx.price.recentHigh).toBe(67200)
      expect(ctx.price.recentLow).toBe(66500)
    })

    it('returns null values when no price history', () => {
      const ctx = mapTradingStateToGameContext(createBaseSnapshot())
      expect(ctx.price.priceDelta1s).toBeNull()
      expect(ctx.price.priceDelta5s).toBeNull()
      expect(ctx.price.recentHigh).toBeNull()
      expect(ctx.price.recentLow).toBeNull()
    })
  })

  // ---------------------------------------------------------------------------
  // NEW: Action flow tracking tests
  // ---------------------------------------------------------------------------

  describe('action flow tracking', () => {
    it('counts recent actions per player', () => {
      const now = Date.now()
      const ctx = mapTradingStateToGameContext({
        ...createBaseSnapshot(),
        recentActions: [
          { type: 'open', playerId: 'player-1', timestamp: now - 5000 },
          { type: 'open', playerId: 'player-1', timestamp: now - 15000 },
          { type: 'close', playerId: 'player-1', timestamp: now - 20000 },
          { type: 'open', playerId: 'player-2', timestamp: now - 8000 },
          { type: 'liquidation', playerId: 'player-2', timestamp: now - 25000 },
        ],
      })

      expect(ctx.actionFlow.ownOpensLast10s).toBe(1)
      expect(ctx.actionFlow.ownOpensLast30s).toBe(2)
      expect(ctx.actionFlow.opponentOpensLast10s).toBe(1)
      expect(ctx.actionFlow.opponentLiquidationsLast30s).toBe(1)
    })

    it('returns zeros when no recent actions', () => {
      const ctx = mapTradingStateToGameContext(createBaseSnapshot())
      expect(ctx.actionFlow.ownOpensLast10s).toBe(0)
      expect(ctx.actionFlow.opponentOpensLast30s).toBe(0)
    })
  })

  // ---------------------------------------------------------------------------
  // NEW: Capacity breakdown tests
  // ---------------------------------------------------------------------------

  describe('capacity breakdown', () => {
    it('includes full capacity details', () => {
      const ctx = mapTradingStateToGameContext(createBaseSnapshot())
      expect(ctx.capacity?.canOpen).toBe(true)
      expect(ctx.capacity?.playerBalanceCapacity).toBe(10)
      expect(ctx.capacity?.opponentFundingCapacity).toBe(10)
      expect(ctx.capacity?.riskReserveCapacity).toBe(10)
    })

    it('shows canOpen=false when no slots', () => {
      const ctx = mapTradingStateToGameContext({
        ...createBaseSnapshot(),
        players: [
          { id: 'player-1', name: 'Alice', dollars: 0, score: 0 },
          { id: 'player-2', name: 'Bob', dollars: 10, score: 0 },
        ],
      })
      expect(ctx.capacity?.canOpen).toBe(false)
    })
  })

  // ---------------------------------------------------------------------------
  // NEW: Exposure quality tests
  // ---------------------------------------------------------------------------

  describe('exposure quality', () => {
    it('computes weighted average prices', () => {
      const ctx = mapTradingStateToGameContext({
        ...createBaseSnapshot(),
        openPositions: [
          ['pos-1', {
            id: 'pos-1', playerId: 'player-1', playerName: 'Alice',
            isUp: true, leverage: 500, collateral: 10, openPrice: 66000,
            closePrice: null, realizedPnl: 0, openedAt: TEN_SECONDS_AGO, status: 'open',
          }],
          ['pos-2', {
            id: 'pos-2', playerId: 'player-1', playerName: 'Alice',
            isUp: false, leverage: 500, collateral: 20, openPrice: 68000,
            closePrice: null, realizedPnl: 0, openedAt: TEN_SECONDS_AGO, status: 'open',
          }],
        ],
      })

      expect(ctx.exposureQuality.weightedAvgLongOpenPrice).toBe(66000)
      // Weighted avg short: (68000 * 20) / 20 = 68000
      expect(ctx.exposureQuality.weightedAvgShortOpenPrice).toBe(68000)
      expect(ctx.exposureQuality.totalOwnCollateral).toBe(30)
      // Long notional: 10 * 500 = 5000, Short notional: 20 * 500 = 10000
      // 10000 > 5000 * 1.5 (7500), so net short
      expect(ctx.exposureQuality.netDirectionalBias).toBe('short')
    })

    it('returns neutral when balanced', () => {
      const ctx = mapTradingStateToGameContext({
        ...createBaseSnapshot(),
        openPositions: [
          ['pos-1', {
            id: 'pos-1', playerId: 'player-1', playerName: 'Alice',
            isUp: true, leverage: 500, collateral: 10, openPrice: 66000,
            closePrice: null, realizedPnl: 0, openedAt: TEN_SECONDS_AGO, status: 'open',
          }],
          ['pos-2', {
            id: 'pos-2', playerId: 'player-1', playerName: 'Alice',
            isUp: false, leverage: 500, collateral: 10, openPrice: 68000,
            closePrice: null, realizedPnl: 0, openedAt: TEN_SECONDS_AGO, status: 'open',
          }],
        ],
      })

      expect(ctx.exposureQuality.netDirectionalBias).toBe('neutral')
    })

    it('returns null averages when no positions', () => {
      const ctx = mapTradingStateToGameContext(createBaseSnapshot())
      expect(ctx.exposureQuality.weightedAvgLongOpenPrice).toBeNull()
      expect(ctx.exposureQuality.weightedAvgShortOpenPrice).toBeNull()
      expect(ctx.exposureQuality.totalOwnCollateral).toBe(0)
    })
  })

  // ---------------------------------------------------------------------------
  // NEW: Position danger signals tests
  // ---------------------------------------------------------------------------

  describe('position danger signals', () => {
    it('computes liquidation distance for underwater positions', () => {
      const ctx = mapTradingStateToGameContext({
        ...createBaseSnapshot(),
        priceData: { symbol: 'BTC', price: 66800, change: 300, changePercent: 0.45 },
        openPositions: [
          ['pos-1', {
            id: 'pos-1', playerId: 'player-1', playerName: 'Alice',
            isUp: true, leverage: 500, collateral: 10, openPrice: 67000,
            closePrice: null, realizedPnl: 0, openedAt: TEN_SECONDS_AGO, status: 'open',
          }],
        ],
      })

      const pos = ctx.ownPositions.find((p) => p.id === 'pos-1')
      // Long at 67000, price 66800 = -0.30% underwater
      // liquidationDistance = -0.30 + 0.2 = -0.10 (close to liquidation)
      expect(pos?.liquidationDistance).toBeLessThan(0)
      expect(pos?.healthRatio).toBeLessThan(1)
    })

    it('computes positive liquidation distance for in-the-money positions', () => {
      const ctx = mapTradingStateToGameContext({
        ...createBaseSnapshot(),
        priceData: { symbol: 'BTC', price: 67500, change: 1000, changePercent: 1.5 },
        openPositions: [
          ['pos-1', {
            id: 'pos-1', playerId: 'player-1', playerName: 'Alice',
            isUp: true, leverage: 500, collateral: 10, openPrice: 66500,
            closePrice: null, realizedPnl: 0, openedAt: TEN_SECONDS_AGO, status: 'open',
          }],
        ],
      })

      const pos = ctx.ownPositions.find((p) => p.id === 'pos-1')
      // Long at 66500, price 67500 = +1.5% in-the-money
      // liquidationDistance = 1.5 + 0.2 = 1.7 (safe)
      expect(pos?.liquidationDistance).toBeGreaterThan(0)
      expect(pos?.healthRatio).toBeGreaterThan(1)
    })

    it('returns null when no price data', () => {
      const ctx = mapTradingStateToGameContext({
        ...createBaseSnapshot(),
        priceData: null,
        openPositions: [
          ['pos-1', {
            id: 'pos-1', playerId: 'player-1', playerName: 'Alice',
            isUp: true, leverage: 500, collateral: 10, openPrice: 67000,
            closePrice: null, realizedPnl: 0, openedAt: TEN_SECONDS_AGO, status: 'open',
          }],
        ],
      })

      const pos = ctx.ownPositions[0]
      expect(pos.liquidationDistance).toBeNull()
      expect(pos.healthRatio).toBeNull()
    })
  })

  // ---------------------------------------------------------------------------
  // NEW: Balance momentum tests
  // ---------------------------------------------------------------------------

  describe('balance momentum', () => {
    it('computes balance delta from match start', () => {
      const ctx = mapTradingStateToGameContext({
        ...createBaseSnapshot(),
        initialBalances: [['player-1', 10], ['player-2', 10]],
        players: [
          { id: 'player-1', name: 'Alice', dollars: 12, score: 0 },
          { id: 'player-2', name: 'Bob', dollars: 8, score: 0 },
        ],
      })

      expect(ctx.localPlayer?.balanceDelta).toBe(2)
      expect(ctx.opponent?.balanceDelta).toBe(-2)
    })

    it('returns undefined when no initial balance', () => {
      const ctx = mapTradingStateToGameContext(createBaseSnapshot())
      expect(ctx.localPlayer?.balanceDelta).toBeUndefined()
      expect(ctx.localPlayer?.initialBalance).toBeUndefined()
    })
  })
})

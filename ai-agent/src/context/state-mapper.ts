// =============================================================================
// STATE MAPPER
// Pure function: RawTradingStateSnapshot → GameContext
// =============================================================================
import type {
  GameContext,
  PositionContext,
  CapacityContext,
  PriceContext,
  MatchContext,
  PlayerContext,
  GameContextSummary,
  ExposureDirection,
  CapacityLimitReason,
  ActionFlowContext,
  ExposureQualityContext,
} from './game-context.types.ts'
import type { RawTradingStateSnapshot, RawPosition, PriceTick, RecentAction } from './state-mapper.types.ts'

// -----------------------------------------------------------------------------
// Short-window price action helpers
// -----------------------------------------------------------------------------

function computeShortWindowPriceAction(
  priceHistory: PriceTick[],
  currentPrice: number | null,
  lastPriceUpdate: number,
): Pick<
  PriceContext,
  | 'priceDelta1s'
  | 'priceDelta5s'
  | 'priceDelta15s'
  | 'recentHigh'
  | 'recentLow'
  | 'recentRangePercent'
  | 'shortWindowVolatility'
  | 'tickFreshnessMs'
> {
  const now = Date.now()

  if (priceHistory.length === 0) {
    return {
      priceDelta1s: null,
      priceDelta5s: null,
      priceDelta15s: null,
      recentHigh: null,
      recentLow: null,
      recentRangePercent: null,
      shortWindowVolatility: null,
      tickFreshnessMs: lastPriceUpdate > 0 ? now - lastPriceUpdate : null,
    }
  }

  // Find the OLDEST price within each time window by reversing the search
  const findOldestInWindow = (windowMs: number): number | null => {
    let oldest: PriceTick | null = null
    for (const tick of priceHistory) {
      if (now - tick.timestamp <= windowMs) {
        oldest = tick
      }
    }
    return oldest?.price ?? null
  }

  const price1sAgo = findOldestInWindow(1000)
  const price5sAgo = findOldestInWindow(5000)
  const price15sAgo = findOldestInWindow(15000)

  // 30-second window for high/low
  const recentWindow = priceHistory.filter((p) => now - p.timestamp <= 30000)
  const recentPrices = recentWindow.map((p) => p.price)
  const recentHigh = recentPrices.length > 0 ? Math.max(...recentPrices) : null
  const recentLow = recentPrices.length > 0 ? Math.min(...recentPrices) : null

  let recentRangePercent = null
  if (recentHigh !== null && recentLow !== null && currentPrice !== null && currentPrice > 0) {
    recentRangePercent = ((recentHigh - recentLow) / currentPrice) * 100
  }

  // Volatility from last 10 ticks
  let shortWindowVolatility = null
  const last10Ticks = priceHistory.slice(-10)
  if (last10Ticks.length >= 2) {
    const mean = last10Ticks.reduce((sum, p) => sum + p.price, 0) / last10Ticks.length
    const variance = last10Ticks.reduce((sum, p) => sum + Math.pow(p.price - mean, 2), 0) / last10Ticks.length
    shortWindowVolatility = Math.sqrt(variance)
  }

  const priceDelta1s = price1sAgo && currentPrice !== null ? ((currentPrice - price1sAgo) / price1sAgo) * 100 : null
  const priceDelta5s = price5sAgo && currentPrice !== null ? ((currentPrice - price5sAgo) / price5sAgo) * 100 : null
  const priceDelta15s = price15sAgo && currentPrice !== null ? ((currentPrice - price15sAgo) / price15sAgo) * 100 : null

  return {
    priceDelta1s,
    priceDelta5s,
    priceDelta15s,
    recentHigh,
    recentLow,
    recentRangePercent,
    shortWindowVolatility,
    tickFreshnessMs: lastPriceUpdate > 0 ? now - lastPriceUpdate : null,
  }
}

// -----------------------------------------------------------------------------
// Action flow helpers
// -----------------------------------------------------------------------------

function computeActionFlow(
  recentActions: RecentAction[],
  localPlayerId: string | null,
  opponentId: string | null,
): ActionFlowContext {
  const now = Date.now()
  const ownActions = recentActions.filter((a) => a.playerId === localPlayerId)
  const opponentActions = recentActions.filter((a) => a.playerId === opponentId)

  const countActions = (actions: RecentAction[], type: string, windowMs: number) =>
    actions.filter((a) => a.type === type && now - a.timestamp <= windowMs).length

  return {
    ownOpensLast10s: countActions(ownActions, 'open', 10000),
    ownOpensLast30s: countActions(ownActions, 'open', 30000),
    ownClosesLast10s: countActions(ownActions, 'close', 10000),
    ownClosesLast30s: countActions(ownActions, 'close', 30000),
    ownLiquidationsLast10s: countActions(ownActions, 'liquidation', 10000),
    ownLiquidationsLast30s: countActions(ownActions, 'liquidation', 30000),
    ownCloseRejectionsLast10s: countActions(ownActions, 'close_rejected', 10000),
    opponentOpensLast10s: countActions(opponentActions, 'open', 10000),
    opponentOpensLast30s: countActions(opponentActions, 'open', 30000),
    opponentClosesLast10s: countActions(opponentActions, 'close', 10000),
    opponentClosesLast30s: countActions(opponentActions, 'close', 30000),
    opponentLiquidationsLast10s: countActions(opponentActions, 'liquidation', 10000),
    opponentLiquidationsLast30s: countActions(opponentActions, 'liquidation', 30000),
  }
}

// -----------------------------------------------------------------------------
// Exposure quality helpers
// -----------------------------------------------------------------------------

function computeExposureQuality(
  ownPositions: PositionContext[],
  opponentPositions: PositionContext[],
): ExposureQualityContext {
  const ownLongs = ownPositions.filter((p) => p.direction === 'long')
  const ownShorts = ownPositions.filter((p) => p.direction === 'short')

  const weightedAvgLongOpenPrice =
    ownLongs.length > 0
      ? ownLongs.reduce((sum, p) => sum + p.openPrice * p.collateral, 0) /
        ownLongs.reduce((sum, p) => sum + p.collateral, 0)
      : null

  const weightedAvgShortOpenPrice =
    ownShorts.length > 0
      ? ownShorts.reduce((sum, p) => sum + p.openPrice * p.collateral, 0) /
        ownShorts.reduce((sum, p) => sum + p.collateral, 0)
      : null

  const totalOwnCollateral = ownPositions.reduce((sum, p) => sum + p.collateral, 0)
  const totalOpponentCollateral = opponentPositions.reduce((sum, p) => sum + p.collateral, 0)

  // Leverage is always 500x in this game
  const leverage = 500
  const longNotional = ownLongs.reduce((sum, p) => sum + p.collateral * leverage, 0)
  const shortNotional = ownShorts.reduce((sum, p) => sum + p.collateral * leverage, 0)

  let netDirectionalBias: 'long' | 'short' | 'neutral' = 'neutral'
  if (longNotional > shortNotional * 1.5) netDirectionalBias = 'long'
  else if (shortNotional > longNotional * 1.5) netDirectionalBias = 'short'

  return {
    weightedAvgLongOpenPrice,
    weightedAvgShortOpenPrice,
    totalOwnCollateral,
    totalOpponentCollateral,
    netDirectionalBias,
  }
}

// -----------------------------------------------------------------------------
// Position danger helpers
// -----------------------------------------------------------------------------

function computePositionDanger(
  position: RawPosition,
  currentPrice: number | null,
): Pick<PositionContext, 'liquidationDistance' | 'healthRatio'> {
  if (currentPrice === null) {
    return { liquidationDistance: null, healthRatio: null }
  }

  // At 500x leverage, 0.2% move = liquidation
  const liquidationThreshold = 0.002

  if (position.isUp) {
    // Long position
    const distancePercent = ((currentPrice - position.openPrice) / position.openPrice) * 100
    const liquidationDistance = distancePercent + liquidationThreshold * 100
    const healthRatio = (currentPrice / position.openPrice) * (1 + liquidationThreshold)
    return { liquidationDistance, healthRatio }
  } else {
    // Short position
    const distancePercent = ((position.openPrice - currentPrice) / position.openPrice) * 100
    const liquidationDistance = distancePercent + liquidationThreshold * 100
    const healthRatio = (position.openPrice / currentPrice) * (1 + liquidationThreshold)
    return { liquidationDistance, healthRatio }
  }
}

// -----------------------------------------------------------------------------
// Capacity constraint logic
// Replicates the three-way constraint from match/position-opening.ts
// -----------------------------------------------------------------------------

function getPositionOpeningCapacity(
  playerBalance: number,
  opponentBalance: number,
  playerOpenPositions: number,
  opponentOpenPositions: number,
  stakeAmount: number,
): CapacityContext {
  if (stakeAmount <= 0) {
    return {
      remainingOpenSlots: 0,
      maxOpenPositions: 0,
      limitingReason: 'player_balance',
      canOpen: false,
      playerBalanceCapacity: 0,
      opponentFundingCapacity: 0,
      riskReserveCapacity: 0,
    }
  }

  const playerBalanceCapacity = Math.max(0, Math.floor(playerBalance / stakeAmount))
  const opponentFundingCapacity = Math.max(0, Math.floor(opponentBalance / stakeAmount))
  const riskReserveCapacity = Math.max(0, playerBalanceCapacity - opponentOpenPositions)

  const capacities: Array<[CapacityLimitReason, number]> = [
    ['player_balance', playerBalanceCapacity],
    ['opponent_funding', opponentFundingCapacity],
    ['risk_reserve', riskReserveCapacity],
  ]

  let limitingReason: CapacityLimitReason = 'none'
  let maxOpenPositions = Infinity

  for (const [reason, capacity] of capacities) {
    if (capacity < maxOpenPositions) {
      maxOpenPositions = capacity
      limitingReason = reason
    }
  }

  if (maxOpenPositions === Infinity) {
    maxOpenPositions = 0
  }

  const remainingOpenSlots = Math.max(0, maxOpenPositions - playerOpenPositions)

  return {
    remainingOpenSlots,
    maxOpenPositions,
    limitingReason,
    canOpen: remainingOpenSlots > 0,
    playerBalanceCapacity,
    opponentFundingCapacity,
    riskReserveCapacity,
  }
}

// -----------------------------------------------------------------------------
// Position helpers
// -----------------------------------------------------------------------------

function canPositionClose(isUp: boolean, openPrice: number, currentPrice: number | null): boolean {
  if (currentPrice === null) return false
  return isUp ? currentPrice > openPrice : currentPrice < openPrice
}

function computePriceDistancePercent(
  openPrice: number,
  currentPrice: number | null,
  isUp: boolean,
): number | null {
  if (currentPrice === null || openPrice === 0) return null
  const pct = ((currentPrice - openPrice) / openPrice) * 100
  // For shorts, flip the sign so positive = in-the-money
  return isUp ? pct : -pct
}

function computeAgeSeconds(openedAt: number): number {
  return (Date.now() - openedAt) / 1000
}

// -----------------------------------------------------------------------------
// Summary builder
// -----------------------------------------------------------------------------

function buildSummary(
  ownPositions: PositionContext[],
  opponentPositions: PositionContext[],
): GameContextSummary {
  const ownLongCount = ownPositions.filter((p) => p.direction === 'long').length
  const ownShortCount = ownPositions.filter((p) => p.direction === 'short').length
  const opponentLongCount = opponentPositions.filter((p) => p.direction === 'long').length
  const opponentShortCount = opponentPositions.filter((p) => p.direction === 'short').length

  // Net exposure: compare own long vs short counts
  const ownNet = ownLongCount - ownShortCount
  let netExposureDirection: ExposureDirection = 'neutral'
  if (ownNet > 0) netExposureDirection = 'net_long'
  else if (ownNet < 0) netExposureDirection = 'net_short'

  // Aggregate unrealized PnL across own positions
  const aggregatePriceDistance = ownPositions.reduce((sum, p) => {
    return sum + (p.priceDistancePercent ?? 0)
  }, 0)

  return {
    totalOpenPositions: ownPositions.length + opponentPositions.length,
    ownOpenCount: ownPositions.length,
    opponentOpenCount: opponentPositions.length,
    ownLongCount,
    ownShortCount,
    opponentLongCount,
    opponentShortCount,
    netExposureDirection,
    aggregatePriceDistance,
  }
}

// -----------------------------------------------------------------------------
// Main mapper
// -----------------------------------------------------------------------------

/**
 * Maps raw Zustand trading state into a structured GameContext for the AI agent.
 *
 * This is a pure function with no side effects. The caller is responsible for
 * serializing the Zustand store (converting Maps to arrays, etc.) before calling.
 */
export function mapTradingStateToGameContext(raw: RawTradingStateSnapshot): GameContext {
  // Extract new fields with backward compatibility
  const priceHistory = raw.priceHistory ?? []
  const lastPriceUpdate = raw.lastPriceUpdate ?? 0
  const recentActions = raw.recentActions ?? []
  const initialBalances = new Map(raw.initialBalances ?? [])

  // --- Extended Price context ---
  const currentPrice = raw.priceData?.price ?? null
  const priceAction = computeShortWindowPriceAction(priceHistory, currentPrice, lastPriceUpdate)
  const price: PriceContext = {
    symbol: raw.priceData?.symbol ?? 'BTC',
    currentPrice,
    firstPrice: raw.firstPrice,
    changeFromStartPercent: raw.priceData?.changePercent ?? null,
    isPriceConnected: raw.isPriceConnected,
    ...priceAction,
  }

  // --- Match context ---
  const match: MatchContext = {
    isPlaying: raw.isPlaying,
    timeRemainingSeconds: raw.gameTimeRemaining,
    matchDurationSeconds: raw.selectedGameDuration / 1000, // ms → seconds
    stakeAmount: raw.stakeAmount,
    fixedLeverage: raw.leverage,
  }

  // --- Player context ---
  const localPlayerData = raw.players.find((p) => p.id === raw.localPlayerId)
  const opponentData = raw.players.find((p) => p.id !== raw.localPlayerId)

  const localPlayerInitialBalance = initialBalances.get(raw.localPlayerId ?? '')
  const opponentInitialBalance = opponentData ? initialBalances.get(opponentData.id) : undefined

  const localPlayer: PlayerContext | null = localPlayerData
    ? {
        name: localPlayerData.name,
        balance: localPlayerData.dollars,
        score: localPlayerData.score,
        initialBalance: localPlayerInitialBalance,
        balanceDelta:
          localPlayerInitialBalance !== undefined
            ? localPlayerData.dollars - localPlayerInitialBalance
            : undefined,
      }
    : null

  const opponent: PlayerContext | null = opponentData
    ? {
        name: opponentData.name,
        balance: opponentData.dollars,
        score: opponentData.score,
        initialBalance: opponentInitialBalance,
        balanceDelta:
          opponentInitialBalance !== undefined
            ? opponentData.dollars - opponentInitialBalance
            : undefined,
      }
    : null

  // --- Position contexts ---
  const allPositions: PositionContext[] = raw.openPositions
    .filter(([, pos]) => pos.status === 'open')
    .map(([, pos]) => {
      const isOwn = pos.playerId === raw.localPlayerId
      const danger = computePositionDanger(pos, currentPrice)
      return {
        id: pos.id,
        owner: isOwn ? ('you' as const) : ('opponent' as const),
        playerName: pos.playerName,
        direction: pos.isUp ? ('long' as const) : ('short' as const),
        leverage: pos.leverage,
        collateral: pos.collateral,
        openPrice: pos.openPrice,
        priceDistancePercent: computePriceDistancePercent(pos.openPrice, currentPrice, pos.isUp),
        ageSeconds: computeAgeSeconds(pos.openedAt),
        // canClose is only meaningful for own positions
        canClose: isOwn && canPositionClose(pos.isUp, pos.openPrice, currentPrice),
        ...danger,
      }
    })

  const ownPositions = allPositions.filter((p) => p.owner === 'you')
  const opponentPositions = allPositions.filter((p) => p.owner === 'opponent')

  // --- Capacity ---
  const capacity: CapacityContext | null =
    localPlayer && opponent
      ? getPositionOpeningCapacity(
          localPlayer.balance,
          opponent.balance,
          ownPositions.length,
          opponentPositions.length,
          raw.stakeAmount,
        )
      : null

  // --- Action Flow ---
  const actionFlow = computeActionFlow(recentActions, raw.localPlayerId, opponentData?.id ?? null)

  // --- Exposure Quality ---
  const exposureQuality = computeExposureQuality(ownPositions, opponentPositions)

  // --- Summary ---
  const summary = buildSummary(ownPositions, opponentPositions)

  return {
    match,
    price,
    localPlayer,
    opponent,
    positions: allPositions,
    ownPositions,
    opponentPositions,
    capacity,
    summary,
    actionFlow,
    exposureQuality,
  }
}

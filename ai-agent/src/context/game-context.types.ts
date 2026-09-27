// =============================================================================
// GAME CONTEXT TYPES
// Structured context fed to the LangChain agent.
// All fields are plain JSON-serializable values.
// =============================================================================

// --- Position ---

export interface PositionContext {
  id: string
  /** Whether this position belongs to the local player or the opponent */
  owner: 'you' | 'opponent'
  playerName: string
  /** 'long' (isUp=true) or 'short' (isUp=false) */
  direction: 'long' | 'short'
  leverage: number
  collateral: number
  openPrice: number
  /**
   * Price distance from open price as a percentage.
   * Positive means the position is in-the-money.
   * Negative means underwater.
   */
  priceDistancePercent: number | null
  /** How many seconds ago this position was opened */
  ageSeconds: number
  /**
   * Whether this position CAN be closed profitably right now.
   * Only meaningful for own positions (opponent positions are always false).
   * LONG: canClose = currentPrice > openPrice
   * SHORT: canClose = currentPrice < openPrice
   */
  canClose: boolean
  /** NEW: Risk signals - % change to liquidation (negative = close to liquidation) */
  liquidationDistance: number | null
  /** NEW: Health ratio - >1 = safe, <1 = danger */
  healthRatio: number | null
}

// --- Capacity ---

export type CapacityLimitReason = 'player_balance' | 'opponent_funding' | 'risk_reserve' | 'none'

export interface CapacityContext {
  /** How many more positions the player can open */
  remainingOpenSlots: number
  /** Maximum positions the player can have open simultaneously */
  maxOpenPositions: number
  /** Which constraint is the bottleneck */
  limitingReason: CapacityLimitReason
  /** NEW: Full breakdown - derived from remainingOpenSlots > 0 */
  canOpen: boolean
  /** NEW: Player balance capacity in slots */
  playerBalanceCapacity: number
  /** NEW: Opponent funding capacity in slots */
  opponentFundingCapacity: number
  /** NEW: Risk reserve capacity in slots */
  riskReserveCapacity: number
}

// --- Price ---

export interface PriceContext {
  symbol: string
  currentPrice: number | null
  /** Baseline price from session start */
  firstPrice: number | null
  /** Percent change from session baseline */
  changeFromStartPercent: number | null
  isPriceConnected: boolean
  /** NEW: Short-window price deltas */
  priceDelta1s: number | null
  priceDelta5s: number | null
  priceDelta15s: number | null
  /** NEW: Recent range */
  recentHigh: number | null
  recentLow: number | null
  recentRangePercent: number | null
  /** NEW: Short-window volatility (stddev of last 10 ticks) */
  shortWindowVolatility: number | null
  /** NEW: How fresh the price tick is in ms */
  tickFreshnessMs: number | null
}

// --- Match ---

export interface MatchContext {
  isPlaying: boolean
  timeRemainingSeconds: number
  matchDurationSeconds: number
  stakeAmount: number
  fixedLeverage: number
}

// --- Player ---

export interface PlayerContext {
  name: string
  balance: number
  score: number
  /** NEW: Initial balance at match start */
  initialBalance?: number
  /** NEW: Balance change from match start */
  balanceDelta?: number
}

// --- Action Flow (NEW) ---

export interface ActionFlowContext {
  ownOpensLast10s: number
  ownOpensLast30s: number
  ownClosesLast10s: number
  ownClosesLast30s: number
  ownLiquidationsLast10s: number
  ownLiquidationsLast30s: number
  ownCloseRejectionsLast10s: number
  opponentOpensLast10s: number
  opponentOpensLast30s: number
  opponentClosesLast10s: number
  opponentClosesLast30s: number
  opponentLiquidationsLast10s: number
  opponentLiquidationsLast30s: number
}

// --- Exposure Quality (NEW) ---

export interface ExposureQualityContext {
  weightedAvgLongOpenPrice: number | null
  weightedAvgShortOpenPrice: number | null
  totalOwnCollateral: number
  totalOpponentCollateral: number
  netDirectionalBias: 'long' | 'short' | 'neutral'
}

// --- Summary ---

export type ExposureDirection = 'net_long' | 'net_short' | 'neutral'

export interface GameContextSummary {
  totalOpenPositions: number
  ownOpenCount: number
  opponentOpenCount: number
  ownLongCount: number
  ownShortCount: number
  opponentLongCount: number
  opponentShortCount: number
  netExposureDirection: ExposureDirection
  /** Sum of unrealized PnL percentages across own positions */
  aggregatePriceDistance: number
}

// --- Full Game Context ---

export interface GameContext {
  match: MatchContext
  price: PriceContext
  localPlayer: PlayerContext | null
  opponent: PlayerContext | null
  /** All open positions (both players) */
  positions: PositionContext[]
  /** Positions opened by the local player only */
  ownPositions: PositionContext[]
  /** Positions opened by the opponent only */
  opponentPositions: PositionContext[]
  capacity: CapacityContext | null
  /** Quick-reference stats for the LLM */
  summary: GameContextSummary
  /** NEW: Action flow tracking */
  actionFlow: ActionFlowContext
  /** NEW: Exposure quality metrics */
  exposureQuality: ExposureQualityContext
}

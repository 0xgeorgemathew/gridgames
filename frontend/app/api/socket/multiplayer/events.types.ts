// =============================================================================
// SERVER-SIDE EVENT TYPES
// Types used internally by the multiplayer server
// =============================================================================

// =============================================================================
// ERROR TYPES
// =============================================================================

export type SocketErrorCode =
  | 'INSUFFICIENT_BALANCE'
  | 'FIND_MATCH_FAILED'
  | 'JOIN_POOL_FAILED'
  | 'SLICE_FAILED'
  | 'POSITION_NOT_FOUND'
  | 'UNAUTHORIZED_POSITION'
  | 'CLOSE_POSITION_FAILED'
  | 'CLOSE_REJECTED_PREDICTION_WRONG' // Zero-sum: close rejected because prediction not correct
  | 'OPPONENT_UNAVAILABLE'
  | 'NOT_IN_WAITING_POOL'
  | 'DURATION_MISMATCH'
  | 'OPPONENT_DISCONNECTED'
  | 'MATCH_START_FAILED'
  | 'ACTION_REJECTED'

export interface SocketErrorEvent {
  code: SocketErrorCode
  message: string
  details?: Record<string, unknown>
}

// =============================================================================
// ZERO-SUM EVENT TYPES
// =============================================================================

/**
 * Zero-sum position close rejection reason
 */
export type CloseRejectionReason = 'price_not_above_open' | 'price_not_below_open'

/**
 * Zero-sum position close rejected event
 * Emitted when a player tries to close but prediction is not correct
 */
export interface PositionCloseRejectedEvent {
  positionId: string
  playerId: string
  openPrice: number
  currentPrice: number
  isUp: boolean
  reason: CloseRejectionReason
  isPredictionCorrect: false
}

/**
 * Zero-sum position closed event
 * Emitted when a position is successfully closed with a transfer
 */
export interface ZeroSumPositionClosedEvent {
  positionId: string
  playerId: string
  closePrice: number
  openPrice: number
  isPredictionCorrect: true
  isUp: boolean
  amountTransferred: number
  winnerId: string
  loserId: string
}

// =============================================================================
// COIN TYPES (HYPER SWIPER)
// =============================================================================

export type CoinType = 'long' | 'short'

/**
 * Coin visual and physics configuration
 */
export type CoinConfig = {
  color: number
  edgeColor: number
  radius: number
  hitboxMultiplier?: number
  rotationSpeed?: number
}

/**
 * Server-side coin state
 */
export interface Coin {
  id: string
  type: CoinType
  x: number
  y: number
}

/**
 * Spawned coin for network sync
 */
export interface SpawnedCoin {
  id: string
  type: CoinType
  xNormalized: number
  velocityX: number
  velocityY: number
  sequenceIndex: number
}

// =============================================================================
// WAITING PLAYER TYPES
// =============================================================================

/**
 * Player in waiting pool
 */
export interface WaitingPlayer {
  name: string
  socketId: string
  joinedAt: number
  sceneWidth?: number
  sceneHeight?: number
  walletAddress?: string
  /** @deprecated Not used in zero-sum matches */
  leverage: number
  gameDuration: number
}

// =============================================================================
// PRICE FEED TYPES
// =============================================================================

/**
 * Price broadcast data (visual only, not for outcome)
 */
export interface PriceBroadcastData {
  price: number
  change: number
  changePercent: number
  timestamp: number
}

// =============================================================================
// LEGACY PLAYER TYPES (deprecated - will be removed in Phase 6)
// =============================================================================

/**
 * @deprecated Use MatchPlayer from match domain instead
 */
export type Player = {
  id: string
  name: string
  dollars: number
  score: number
  sceneWidth: number
  sceneHeight: number
  leverage: number
}

// =============================================================================
// LEGACY POSITION TYPES (deprecated - will be removed in Phase 6)
// =============================================================================

/** @deprecated Not used in zero-sum matches */
export interface OpenPosition {
  id: string
  playerId: string
  playerName: string
  coinType: 'long' | 'short'
  priceAtOrder: number
  leverage: number
  collateral: number
  openedAt: number
  isPlayer1: boolean
}

/** @deprecated Not used in zero-sum matches */
export interface PositionSettlementResult {
  positionId: string
  playerId: string
  playerName: string
  isUp: boolean
  leverage: number
  collateral: number
  openPrice: number
  closePrice: number
  realizedPnl: number
  isProfitable: boolean
  isLiquidated: boolean
}

/** @deprecated Not used in zero-sum matches */
export interface PlayerSettlementResult {
  playerId: string
  playerName: string
  totalPnl: number
  positionCount: number
  winningPositions: number
  finalBalance: number
}

/** @deprecated Not used in zero-sum matches */
export interface GameSettlementData {
  closePrice: number
  positions: PositionSettlementResult[]
  playerResults: PlayerSettlementResult[]
  winner: {
    playerId: string
    playerName: string
    winningBalance: number
  }
}

/** @deprecated Not used in zero-sum matches */
export interface LiquidationEvent {
  positionId: string
  playerId: string
  playerName: string
  isUp: boolean
  leverage: number
  collateral: number
  openPrice: number
  liquidationPrice: number
  healthRatio: number
  pnlAtLiquidation: number
}

// =============================================================================
// HYPER SWIPER SHARED TYPES
// Game-specific types built on shared match domain
// =============================================================================

import type { MatchPlayer, AuthoritativeAction } from '@/domains/match/types'

// Re-export match types for convenience
export type { MatchPlayer, AuthoritativeAction }

// =============================================================================
// COIN TYPES
// =============================================================================

export type CoinType = 'long' | 'short'

/**
 * Coin spawn event from server
 * Emitted when a new coin appears in the game
 */
export type CoinSpawnEvent = {
  coinId: string
  coinType: CoinType
  xNormalized: number // 0.0 to 1.0 (relative screen position)
  velocityX: number
  velocityY: number
  sequenceIndex: number // Monotonic index for sync
}

/**
 * Spawned coin with physics state
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
// HYPER SWIPER GAMEPLAY ACTIONS (NEW)
// =============================================================================

/**
 * Slice action - player swipes a coin
 */
export interface SliceAction {
  type: 'slice'
  coinId: string
  coinType: CoinType
  timestamp: number
}

/**
 * Hyper Swiper authoritative action
 */
export type HyperSwiperAction = AuthoritativeAction<SliceAction>

// =============================================================================
// HYPER SWIPER GAME STATE (NEW)
// =============================================================================

/**
 * Player score in Hyper Swiper
 */
export interface HyperSwiperPlayerScore {
  playerId: string
  playerName: string
  slices: number // Total coins sliced
  upSlices: number
  downSlices: number
}

/**
 * Hyper Swiper game state (for reducer)
 */
export interface HyperSwiperGameState {
  matchId: string
  players: [HyperSwiperPlayerScore, HyperSwiperPlayerScore]
  activeCoins: Map<string, SpawnedCoin>
  startedAt: number
  endedAt: number | null
}

// =============================================================================
// LEGACY TYPES (deprecated - will be removed in Phase 6)
// Kept for backward compatibility during migration
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

/**
 * @deprecated Use MatchFoundEvent from match domain instead
 */
export type MatchFoundEvent = {
  roomId: string
  players: Player[]
}

/**
 * @deprecated Use MatchStartedPayload from match domain instead
 */
export type GameStartEvent = {
  durationMs: number
}

/**
 * @deprecated Use MatchResultReadyPayload from match domain instead
 */
export type GameOverEvent = {
  winnerId: string | null
  winnerName: string | null
  reason?: 'time_limit' | 'knockout' | 'forfeit'
  playerResults?: PlayerSettlementResult[]
}

/**
 * @deprecated Server event for slice
 */
export type SliceEvent = {
  playerId: string
  playerName: string
  coinType: CoinType
  coinId: string
}

/**
 * @deprecated For visual display only, not for outcome
 */
export type PriceData = {
  symbol: string
  price: number
  change: number
  changePercent: number
  tradeSize?: number
  tradeSide?: 'BUY' | 'SELL'
  tradeTime?: number
}

/**
 * @deprecated Use match-based matchmaking instead
 */
export type LobbyPlayer = {
  socketId: string
  name: string
  joinedAt: number
  leverage: number
  gameDuration: number
}

/** @deprecated */
export type LobbyPlayersEvent = LobbyPlayer[]

/** @deprecated */
export type LobbyUpdatedEvent = {
  players: LobbyPlayer[]
}

// =============================================================================
// LEGACY POSITION TYPES (deprecated)
// =============================================================================

/** @deprecated Not used in zero-sum matches */
export type PositionStatus = 'open' | 'settled'

/** @deprecated Not used in zero-sum matches */
export interface Position {
  id: string
  playerId: string
  playerName: string
  isUp: boolean
  leverage: number
  collateral: number
  openPrice: number
  closePrice: number | null
  realizedPnl: number
  openedAt: number
  settledAt: number | null
  status: PositionStatus
}

/** @deprecated Not used in zero-sum matches */
export interface PositionOpenedEvent {
  positionId: string
  playerId: string
  playerName: string
  isUp: boolean
  leverage: number
  collateral: number
  openPrice: number
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
  finalBalance: number
  positionCount: number
}

/** @deprecated Not used in zero-sum matches */
export interface GameSettlementEvent {
  closePrice: number
  positions: PositionSettlementResult[]
  playerResults: PlayerSettlementResult[]
  winner: {
    playerId: string
    playerName: string
    winningBalance: number
  } | null
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

/** @deprecated Not used in zero-sum matches */
export type BalanceUpdatedEvent = {
  playerId: string
  newBalance: number
  reason: 'position_opened' | 'position_closed' | 'position_won' | 'position_lost'
  positionId?: string
  collateral?: number
  amountTransferred?: number // Zero-sum: amount transferred on close
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

/** @deprecated Use SocketErrorEvent from events.types instead */
export type SocketErrorCode =
  | 'INSUFFICIENT_BALANCE'
  | 'FIND_MATCH_FAILED'
  | 'JOIN_POOL_FAILED'
  | 'SLICE_FAILED'
  | 'POSITION_NOT_FOUND'
  | 'UNAUTHORIZED_POSITION'
  | 'CLOSE_POSITION_FAILED'
  | 'OPPONENT_UNAVAILABLE'
  | 'NOT_IN_WAITING_POOL'
  | 'DURATION_MISMATCH'
  | 'OPPONENT_DISCONNECTED'
  | 'MATCH_START_FAILED'

/** @deprecated Use SocketErrorEvent from events.types instead */
export interface SocketErrorEvent {
  code: SocketErrorCode
  message: string
  details?: Record<string, unknown>
}

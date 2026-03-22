// =============================================================================
// TAP DANCER SHARED TYPES
// Game-specific types built on shared match domain
// =============================================================================

import type { MatchPlayer, AuthoritativeAction } from '@/domains/match/types'

// Re-export match types for convenience
export type { MatchPlayer, AuthoritativeAction }

// =============================================================================
// TAP DANCER GAMEPLAY ACTIONS (NEW)
// =============================================================================

/**
 * Direction for tap action
 */
export type Direction = 'up' | 'down'

/**
 * Tap action - player taps a direction button
 */
export interface TapAction {
  type: 'tap'
  direction: Direction
  timestamp: number
}

/**
 * Tap Dancer authoritative action
 */
export type TapDancerAction = AuthoritativeAction<TapAction>

// =============================================================================
// TAP DANCER GAME STATE (NEW)
// =============================================================================

/**
 * Player score in Tap Dancer
 */
export interface TapDancerPlayerScore {
  playerId: string
  playerName: string
  score: number // Tap score
  taps: number // Total taps
  upTaps: number
  downTaps: number
}

/**
 * Tap Dancer game state (for reducer)
 */
export interface TapDancerGameState {
  matchId: string
  players: [TapDancerPlayerScore, TapDancerPlayerScore]
  startedAt: number
  endedAt: number | null
}

// =============================================================================
// LEGACY TYPES (deprecated - will be removed in Phase 6)
// Kept for backward compatibility during migration
// =============================================================================

/** @deprecated Use MatchPlayer from match domain instead */
export type Player = {
  id: string
  name: string
  dollars: number
  score: number
  sceneWidth: number
  sceneHeight: number
  leverage: number
}

/** @deprecated Use MatchFoundEvent from match domain instead */
export type MatchFoundEvent = {
  roomId: string
  players: Player[]
}

/** @deprecated Use MatchStartedPayload from match domain instead */
export type GameStartEvent = {
  durationMs: number
}

/** @deprecated Use MatchResultReadyPayload from match domain instead */
export type GameOverEvent = {
  winnerId: string
  winnerName: string
  reason?: 'time_limit' | 'knockout' | 'forfeit' | 'server_shutdown'
  playerResults?: PlayerSettlementResult[]
}

/** @deprecated For visual display only, not for outcome */
export type PriceData = {
  symbol: string
  price: number
  change: number
  changePercent: number
  tradeSize?: number
  tradeSide?: 'BUY' | 'SELL'
  tradeTime?: number
}

/** @deprecated Use match-based matchmaking instead */
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

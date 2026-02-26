// =============================================================================
// TAPDANCER TRADING TYPES
// Simplified types for the tap-to-trade game (no coins, no swiping)
// =============================================================================

/**
 * Position direction - tap LONG or SHORT to open
 */
export type Direction = 'long' | 'short'

/**
 * Player state in a game room
 * Tracks dollars (health), score, and scene dimensions
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
 * Match found event from server
 */
export type MatchFoundEvent = {
  roomId: string
  players: Player[]
}

/**
 * Game start event from server
 */
export type GameStartEvent = {
  durationMs: number
}

/**
 * Game over event from server
 */
export type GameOverEvent = {
  winnerId: string | null
  winnerName: string | null
  reason?: 'time_limit' | 'knockout' | 'forfeit'
  playerResults?: PlayerSettlementResult[]
}

/**
 * Balance updated event from server
 */
export type BalanceUpdatedEvent = {
  playerId: string
  newBalance: number
  reason: 'position_opened' | 'position_closed'
  positionId?: string
  collateral?: number
}

/**
 * Binance price data
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
 * Lobby player for matchmaking selection
 */
export type LobbyPlayer = {
  socketId: string
  name: string
  joinedAt: number
  leverage: number
  gameDuration: number
}

export type LobbyPlayersEvent = LobbyPlayer[]

export type LobbyUpdatedEvent = {
  players: LobbyPlayer[]
}

// =============================================================================
// POSITION TYPES
// =============================================================================

export type PositionStatus = 'open' | 'settled'

/**
 * Position - opened by tapping LONG/SHORT buttons
 * Stays OPEN until game end, then settled at once
 */
export interface Position {
  id: string
  playerId: string
  playerName: string
  isLong: boolean
  leverage: number
  collateral: number
  openPrice: number
  closePrice: number | null
  realizedPnl: number
  openedAt: number
  settledAt: number | null
  status: PositionStatus
}

/**
 * Position opened event - emitted when player taps LONG/SHORT
 */
export interface PositionOpenedEvent {
  positionId: string
  playerId: string
  playerName: string
  isLong: boolean
  leverage: number
  collateral: number
  openPrice: number
}

/**
 * Individual position result at game settlement
 */
export interface PositionSettlementResult {
  positionId: string
  playerId: string
  playerName: string
  isLong: boolean
  leverage: number
  collateral: number
  openPrice: number
  closePrice: number
  realizedPnl: number
  isProfitable: boolean
  isLiquidated: boolean
}

/**
 * Player result at game settlement
 */
export interface PlayerSettlementResult {
  playerId: string
  playerName: string
  totalPnl: number
  finalBalance: number
  positionCount: number
}

/**
 * Game settlement event - emitted at game end
 */
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

/**
 * Liquidation event - emitted when position is force-closed
 */
export interface LiquidationEvent {
  positionId: string
  playerId: string
  playerName: string
  isLong: boolean
  leverage: number
  collateral: number
  openPrice: number
  liquidationPrice: number
  healthRatio: number
  pnlAtLiquidation: number
}

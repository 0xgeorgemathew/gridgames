export type CoinType = 'call' | 'put'

/**
 * Coin visual and physics configuration
 * Used for rendering and hitbox calculation
 */
export type CoinConfig = {
  color: number // Main coin color
  edgeColor: number // Darker shade for milled edge/rim
  radius: number // Visual radius in pixels
  hitboxMultiplier?: number // Hitbox size multiplier (default 1.0)
  rotationSpeed?: number // Radians per second (unused in config, set dynamically)
}

/**
 * Player state in a game room
 * Tracks dollars (health), score, and scene dimensions for spawning
 */
export type Player = {
  id: string
  name: string
  dollars: number
  score: number
  sceneWidth: number // Player's device width for coin spawning
  sceneHeight: number // Player's device height for coin spawning
  leverage: number // ENS leverage multiplier (2, 5, 10, 20) - cached at match time
}

/**
 * Coin spawn event from server
 * Emitted when a new coin appears in the game
 * Uses normalized X position (0.0-1.0) for deterministic sync between players
 */
export type CoinSpawnEvent = {
  coinId: string
  coinType: CoinType
  xNormalized: number // 0.0 to 1.0 (relative screen position, synced between players)
}

/**
 * Slice event from server
 * Emitted when a player slices a coin
 */
export type SliceEvent = {
  playerId: string
  playerName: string
  coinType: CoinType
}

/**
 * Active order with 5-second countdown timer
 * Emitted by server in 'order_placed' event
 */
export type OrderPlacedEvent = {
  orderId: string
  playerId: string
  playerName: string
  coinType: CoinType
  priceAtOrder: number
  settlesAt: number
}

/**
 * Settlement result after 5-second timer expires
 * Emitted by server in 'order_settled' event
 */
export type SettlementEvent = {
  orderId: string
  playerId: string
  playerName: string
  coinType: CoinType
  isCorrect: boolean
  priceAtOrder: number
  finalPrice: number
  amountTransferred: number // Actual amount transferred (1 or 2 with 2x multiplier)
}

/**
 * Match found event from server
 * Emitted when two players are matched
 */
export type MatchFoundEvent = {
  roomId: string
  players: Player[]
}

/**
 * Game start event from server
 * Emitted when the game begins
 */
export type GameStartEvent = {
  durationMs: number // 150000 (2.5 minutes)
}

/**
 * Game over event from server
 * Emitted when game ends (time limit, knockout, or forfeit)
 */
export type GameOverEvent = {
  winnerId: string
  winnerName: string
  reason?: 'time_limit' | 'knockout' | 'forfeit'
  // Add player results for final balances
  playerResults?: PlayerSettlementResult[]
}

/**
 * Balance updated event from server
 * Emitted when a player's balance changes during gameplay (e.g., collateral deduction)
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
 * Real-time cryptocurrency price from Binance WebSocket
 */
export type PriceData = {
  symbol: string
  price: number
  change: number
  changePercent: number
  tradeSize?: number // Quantity traded (BTC)
  tradeSide?: 'BUY' | 'SELL' // Trade direction
  tradeTime?: number // Trade timestamp (ms)
}

/**
 * Lobby player for matchmaking selection
 * Represents a waiting player available for challenge
 */
export type LobbyPlayer = {
  socketId: string
  name: string
  joinedAt: number
  leverage: number // ENS leverage multiplier for fair matchmaking
}

/**
 * Lobby players event from server
 * Emitted when requesting the current list of waiting players
 */
export type LobbyPlayersEvent = LobbyPlayer[]

/**
 * Lobby updated event from server
 * Broadcast when players join/leave the waiting pool
 */
export type LobbyUpdatedEvent = {
  players: LobbyPlayer[]
}

// =============================================================================
// AVANTIS-ALIGNED TYPES
// These types align with Avantis Protocol SDK for future integration
// =============================================================================

/**
 * Position direction - aligned with Avantis is_long
 * true = LONG (profit when price goes up)
 * false = SHORT (profit when price goes down)
 */
export type PositionDirection = boolean // isLong

/**
 * Position status
 * - OPEN: Position is active, waiting for game end
 * - SETTLED: Position closed at game end with realized PnL
 */
export type PositionStatus = 'open' | 'settled'

/**
 * Position - Aligned with Avantis TradeInput/TradeExtendedResponse
 * Represents a single trading position opened by slicing a coin
 *
 * Positions stay OPEN until game end, then all are settled at once.
 */
export interface Position {
  // Identity
  id: string // Unique position ID
  playerId: string // Player who opened the position
  playerName: string // Display name

  // Avantis-aligned fields
  pairIndex: number // Trading pair index (0 = BTC/USD)
  isLong: boolean // Direction: true=LONG, false=SHORT
  leverage: number // Leverage multiplier (2, 5, 10, 20)
  collateral: number // Fixed at $1 per position

  // Price tracking
  openPrice: number // Entry price (was priceAtOrder)
  closePrice: number | null // Exit price (set at game end)

  // PnL tracking (calculated at game end)
  realizedPnl: number // Realized PnL (0 until settled)

  // Timing
  openedAt: number // Timestamp when position opened
  settledAt: number | null // Game end timestamp
  status: PositionStatus // 'open' | 'settled'
}

/**
 * Position opened event - emitted when player slices a coin
 * Position stays open until game end
 */
export interface PositionOpenedEvent {
  positionId: string
  playerId: string
  playerName: string
  pairIndex: number
  isLong: boolean
  leverage: number
  collateral: number // Fixed at $1
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
  realizedPnl: number // Calculated PnL
  isProfitable: boolean
}

/**
 * Player result at game settlement
 */
export interface PlayerSettlementResult {
  playerId: string
  playerName: string
  totalPnl: number // Sum of all position PnLs
  finalBalance: number // Starting balance + totalPnl (floored at 0)
  positionCount: number
}

/**
 * Game settlement event - emitted at game end with all position results
 * ALL positions are settled at game end (no 5-second rule)
 */
export interface GameSettlementEvent {
  closePrice: number // Final BTC price at game end
  positions: PositionSettlementResult[]
  playerResults: PlayerSettlementResult[]
  winner: {
    playerId: string
    playerName: string
    winningBalance: number
  }
}

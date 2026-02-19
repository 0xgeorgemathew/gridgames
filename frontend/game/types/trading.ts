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

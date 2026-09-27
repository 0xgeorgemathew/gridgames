// =============================================================================
// RAW STATE SNAPSHOT TYPES
// What the frontend serializes from Zustand before passing to the mapper.
// =============================================================================

/** A single position serialized from the Zustand Map<string, Position> */
export interface RawPosition {
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
  status: 'open' | 'settled'
}

/** Raw price data from the Zustand store */
export interface RawPriceData {
  symbol: string
  price: number
  change: number
  changePercent: number
}

/** A single price tick for short-window price action */
export interface PriceTick {
  price: number
  timestamp: number
}

/** A single action for action flow tracking */
export interface RecentAction {
  type: 'open' | 'close' | 'liquidation' | 'close_rejected'
  playerId: string
  positionId?: string
  isUp?: boolean
  timestamp: number
}

/**
 * Raw state snapshot extracted from the Zustand trading store.
 *
 * The frontend caller serializes TradingState into this shape
 * before passing it to the state mapper. All fields are plain
 * JSON-serializable values (no Map, no Socket, no functions).
 */
export interface RawTradingStateSnapshot {
  // Connection & lifecycle
  isConnected: boolean
  isMatching: boolean
  isPlaying: boolean
  isGameOver: boolean

  // Players
  localPlayerId: string | null
  isPlayer1: boolean
  players: Array<{
    id: string
    name: string
    dollars: number
    score: number
  }>

  // Timer
  gameTimeRemaining: number
  selectedGameDuration: number

  // Positions (Map serialized to array of [key, value] tuples)
  openPositions: Array<[string, RawPosition]>

  // Price feed
  priceData: RawPriceData | null
  firstPrice: number | null
  isPriceConnected: boolean

  // Game config
  leverage: number
  stakeAmount: number

  // NEW: Short-window price action (frontend must populate)
  priceHistory?: PriceTick[]
  lastPriceUpdate?: number

  // NEW: Recent action flow (frontend must populate)
  recentActions?: RecentAction[]

  // NEW: Initial balance for momentum calculation (serialized as array of tuples)
  initialBalances?: Array<[string, number]>
}

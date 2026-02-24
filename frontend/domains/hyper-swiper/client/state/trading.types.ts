import type { Socket } from 'socket.io-client'
import type {
  Player,
  CoinSpawnEvent,
  SliceEvent,
  PositionOpenedEvent,
  GameOverEvent,
  GameStartEvent,
  CoinType,
  PriceData,
  LobbyPlayer,
  Position,
  GameSettlementEvent,
  LiquidationEvent,
} from '@/domains/hyper-swiper/shared/trading.types'
import type { Toast } from '@/platform/ui/ToastNotifications'

// Extend window interface for Phaser event bridge
declare global {
  interface Window {
    phaserEvents?: PhaserEventBridge
    sceneDimensions?: { width: number; height: number }
  }
}

// CryptoSymbol type for price feed
export type CryptoSymbol = 'btcusdt'

// Event bridge interface for React ↔ Phaser communication
export interface PhaserEventBridge {
  emit(event: string, ...args: unknown[]): void
  on(event: string, listener: (...args: unknown[]) => void): void
  off(event: string, listener: (...args: unknown[]) => void): void
  destroy?(): void
}

// Connection state slice
interface ConnectionState {
  socket: Socket | null
  isConnected: boolean
  isMatching: boolean
  isPlaying: boolean
  isGameOver: boolean
  gameOverData: GameOverEvent | null
  isSceneReady: boolean
  socketCleanupFunctions: Array<() => void>
}

// Lobby state slice
interface LobbyState {
  lobbyPlayers: LobbyPlayer[]
  isRefreshingLobby: boolean
}

// Room/Players state slice
interface RoomState {
  roomId: string | null
  localPlayerId: string | null
  isPlayer1: boolean
  players: Player[]
}

// Timer state slice
interface TimerState {
  gameTimeRemaining: number
  gameTimerInterval: number | null
}

// Position closing state for animated notifications
export type PositionCloseReason = 'manual' | 'liquidated'

export interface PositionClosingState {
  positionId: string
  reason: PositionCloseReason
  realizedPnl: number
  timestamp: number
}

// Game state slice - Perp-style positions
interface GameState {
  openPositions: Map<string, Position> // Open positions (no settlement timer)
  gameSettlement: GameSettlementEvent | null // Settlement data at game end
  toasts: Toast[]
  leverage: number // In-game leverage (fixed at 500X)
  closingPositions: Map<string, PositionClosingState> // Positions being animated
  positionCloseTimeouts: Map<string, NodeJS.Timeout> // Tracked timeouts for cleanup
}

// Matchmaking settings slice
interface MatchmakingSettingsState {
  selectedGameDuration: number // Game duration in ms (60000, 120000, 180000)
  selectedLeverage: number // Leverage for matchmaking (fixed at 500X)
}

// Audio state slice
interface AudioState {
  isSoundMuted: boolean
}

// Price feed state slice
interface PriceFeedState {
  priceSocket: WebSocket | null
  priceReconnectTimer: NodeJS.Timeout | null
  priceData: PriceData | null
  isPriceConnected: boolean
  selectedCrypto: CryptoSymbol
  reconnectAttempts: number
  maxReconnectAttempts: number
  reconnectDelay: number
  priceError: string | null
  lastPriceUpdate: number
  firstPrice: number | null
}

// Combined state type
export interface TradingState
  extends
    ConnectionState,
    LobbyState,
    RoomState,
    TimerState,
    GameState,
    AudioState,
    PriceFeedState,
    MatchmakingSettingsState {
  // Actions
  connect: () => void
  disconnect: () => void
  findMatch: (playerName: string, walletAddress?: string) => void
  spawnCoin: (coin: CoinSpawnEvent) => void
  sliceCoin: (coinId: string, coinType: CoinType) => void
  expireCoin: (coinId: string) => void
  setLeverage: (leverage: number) => void
  setSelectedGameDuration: (duration: number) => void
  setSelectedLeverage: (leverage: number) => void
  handleSlice: (slice: SliceEvent) => void
  handlePositionOpened: (position: PositionOpenedEvent) => void
  handleGameSettlement: (settlement: GameSettlementEvent) => void
  handlePositionLiquidated: (liquidation: LiquidationEvent) => void
  handleGameStart: (data: GameStartEvent) => void
  handleGameOver: (data: GameOverEvent) => void
  connectPriceFeed: (symbol: CryptoSymbol) => void
  disconnectPriceFeed: () => void
  manualReconnect: () => void
  resetGame: () => void
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
  clearToasts: () => void
  playAgain: () => void
  endGame: () => void
  toggleSound: () => void
  getLobbyPlayers: () => void
  joinWaitingPool: (playerName: string, walletAddress?: string) => void
  leaveWaitingPool: () => void
  selectOpponent: (opponentSocketId: string) => void
  closePosition: (positionId: string) => void
  handlePositionClosed: (data: {
    positionId: string
    closePrice: number
    realizedPnl: number
    playerId: string
  }) => void
}

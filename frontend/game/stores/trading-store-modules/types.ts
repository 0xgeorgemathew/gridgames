import type { Socket } from 'socket.io-client'
import type {
  Player,
  CoinSpawnEvent,
  SliceEvent,
  OrderPlacedEvent,
  SettlementEvent,
  MatchFoundEvent,
  GameOverEvent,
  GameStartEvent,
  CoinType,
  PriceData,
  LobbyPlayer,
  LobbyPlayersEvent,
  LobbyUpdatedEvent,
} from '../../types/trading'
import type { Toast } from '@/components/ToastNotifications'

// CryptoSymbol type for price feed
export type CryptoSymbol = 'btcusdt'

// Event bridge interface for React ↔ Phaser communication
export interface PhaserEventBridge {
  emit(event: string, ...args: unknown[]): void
  on(event: string, listener: (...args: unknown[]) => void): void
  off(event: string, listener: (...args: unknown[]) => void): void
  destroy?(): void
}

// Game constants
export const STANDARD_DAMAGE = 1
export const WHALE_DAMAGE = 2
export const TUG_OF_WAR_MIN = -100
export const TUG_OF_WAR_MAX = 100

// Connection state slice
export interface ConnectionState {
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
export interface LobbyState {
  lobbyPlayers: LobbyPlayer[]
  isRefreshingLobby: boolean
}

// Room/Players state slice
export interface RoomState {
  roomId: string | null
  localPlayerId: string | null
  isPlayer1: boolean
  players: Player[]
}

// Timer state slice
export interface TimerState {
  gameTimeRemaining: number
  gameTimerInterval: number | null
}

// Game state slice
export interface GameState {
  tugOfWar: number
  activeOrders: Map<string, OrderPlacedEvent>
  pendingOrders: Map<string, SettlementEvent>
  latestSettlement: SettlementEvent | null
  toasts: Toast[]
  whale2XActivatedAt: number | null
  whale2XExpiresAt: number | null
  whaleMultiplier: number
}

// Audio state slice
export interface AudioState {
  isSoundMuted: boolean
}

// Price feed state slice
export interface PriceFeedState {
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
    PriceFeedState {
  // Actions
  connect: () => void
  disconnect: () => void
  findMatch: (playerName: string, walletAddress?: string) => void
  spawnCoin: (coin: CoinSpawnEvent) => void
  sliceCoin: (coinId: string, coinType: CoinType) => void
  handleSlice: (slice: SliceEvent) => void
  handleOrderPlaced: (order: OrderPlacedEvent) => void
  handleSettlement: (settlement: SettlementEvent) => void
  handleGameStart: (data: GameStartEvent) => void
  handleGameOver: (data: GameOverEvent) => void
  handlePlayerHit: (data: { playerId: string; damage: number; reason: string }) => void
  removeActiveOrder: (orderId: string) => void
  cleanupOrphanedOrders: () => void
  connectPriceFeed: (symbol: CryptoSymbol) => void
  disconnectPriceFeed: () => void
  manualReconnect: () => void
  resetGame: () => void
  clearLatestSettlement: () => void
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
}

// Re-export types for convenience
export type {
  Player,
  CoinSpawnEvent,
  SliceEvent,
  OrderPlacedEvent,
  SettlementEvent,
  MatchFoundEvent,
  GameOverEvent,
  GameStartEvent,
  CoinType,
  PriceData,
  LobbyPlayer,
  LobbyPlayersEvent,
  LobbyUpdatedEvent,
}

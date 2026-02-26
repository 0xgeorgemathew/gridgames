import type { Socket } from 'socket.io-client'
import type {
  Player,
  PositionOpenedEvent,
  GameOverEvent,
  GameStartEvent,
  PriceData,
  LobbyPlayer,
  Position,
  GameSettlementEvent,
  LiquidationEvent,
  Direction,
} from '@/domains/tap-dancer/shared/trading.types'
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

// Event bridge interface for React <-> Phaser communication
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

// Game state slice - Perp-style positions (no coins in TapDancer)
interface GameState {
  openPositions: Map<string, Position>
  gameSettlement: GameSettlementEvent | null
  toasts: Toast[]
  leverage: number
  closingPositions: Map<string, PositionClosingState>
  positionCloseTimeouts: Map<string, NodeJS.Timeout>
}

// Matchmaking settings slice
interface MatchmakingSettingsState {
  selectedGameDuration: number
  selectedLeverage: number
}

// Audio state slice
interface AudioState {
  isSoundMuted: boolean
  beatActive: boolean // True when a beat pulse should animate
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

// Combined state type for TapDancer (no coin-related actions)
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
  openPosition: (direction: Direction) => void // NEW: Direct position opening
  closePosition: (positionId: string) => void
  setLeverage: (leverage: number) => void
  setSelectedGameDuration: (duration: number) => void
  setSelectedLeverage: (leverage: number) => void
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
  triggerBeat: () => void // Trigger a beat pulse animation
  getLobbyPlayers: () => void
  joinWaitingPool: (playerName: string, walletAddress?: string) => void
  leaveWaitingPool: () => void
  selectOpponent: (opponentSocketId: string) => void
  handlePositionClosed: (data: {
    positionId: string
    closePrice: number
    realizedPnl: number
    playerId: string
  }) => void
}

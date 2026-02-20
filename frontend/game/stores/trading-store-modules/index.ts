/**
 * Trading Store - Main Zustand store for HFT Battle game state.
 *
 * Uses the Slices Pattern for modularity while maintaining
 * inter-slice communication via the get() function.
 *
 * Perp-Style Positions: Positions stay open until game end with real-time PnL
 *
 * @see https://github.com/pmndrs/zustand/blob/main/docs/guides/slices-pattern.md
 */

import { create } from 'zustand'
import { io } from 'socket.io-client'
import type { TradingState, CryptoSymbol } from './types'
import type {
  Player,
  CoinSpawnEvent,
  SliceEvent,
  PositionOpenedEvent,
  MatchFoundEvent,
  GameOverEvent,
  GameStartEvent,
  CoinType,
  LobbyPlayersEvent,
  LobbyUpdatedEvent,
  BalanceUpdatedEvent,
  Position,
  GameSettlementEvent,
} from '../../types/trading'

// Re-export types
export * from './types'

export const useTradingStore = create<TradingState>((set, get) => ({
  // Connection state
  socket: null,
  isConnected: false,
  isMatching: false,
  isPlaying: false,
  isGameOver: false,
  gameOverData: null,
  isSceneReady: false,
  socketCleanupFunctions: [],

  // Lobby state
  lobbyPlayers: [],
  isRefreshingLobby: false,

  // Room/Players state
  roomId: null,
  localPlayerId: null,
  isPlayer1: false,
  players: [],

  // Timer state
  gameTimeRemaining: 0,
  gameTimerInterval: null,

  // Game state - Perp-style positions
  openPositions: new Map<string, Position>(), // Open positions (no settlement timer)
  gameSettlement: null, // Settlement data at game end
  toasts: [],
  leverage: 2, // Manual leverage selector (1, 2, 5, 10)

  // Audio state
  isSoundMuted: false,

  // Price feed state
  priceSocket: null,
  priceReconnectTimer: null,
  priceData: null,
  isPriceConnected: false,
  selectedCrypto: 'btcusdt' as CryptoSymbol,
  reconnectAttempts: 0,
  maxReconnectAttempts: 10,
  reconnectDelay: 1000,
  priceError: null,
  lastPriceUpdate: 0,
  firstPrice: null,

  // ==========================================================================
  // Connection Actions
  // ==========================================================================

  connect: () => {
    const { socketCleanupFunctions } = get()
    socketCleanupFunctions.forEach((fn) => fn())

    const socketUrl = process.env.NEXT_PUBLIC_URL || ''
    const socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
    })

    const newCleanupFunctions: Array<() => void> = []

    socket.on('connect', () => {
      set({ isConnected: true, localPlayerId: socket.id })
      // No cleanup interval needed for perp-style positions
    })

    socket.on(
      'btc_price',
      (data: { price: number; change: number; changePercent: number; timestamp: number }) => {
        const { firstPrice: currentFirstPrice } = get()

        if (!currentFirstPrice && data.price > 0) {
          set({ firstPrice: data.price, isPriceConnected: true, priceError: null })
          return
        }

        if (!currentFirstPrice) return

        set({
          priceData: {
            symbol: 'BTC',
            price: data.price,
            change: data.change,
            changePercent: data.changePercent,
            tradeSize: 0,
            tradeSide: 'BUY',
            tradeTime: data.timestamp,
          },
          lastPriceUpdate: data.timestamp,
          isPriceConnected: true,
          priceError: null,
        })
      }
    )

    socket.on('disconnect', () => {
      set({ isConnected: false })
      const { socketCleanupFunctions } = get()
      socketCleanupFunctions.forEach((fn) => fn())
      set({ socketCleanupFunctions: [] })
    })

    socket.on('waiting_for_match', () => set({ isMatching: true }))

    socket.on('match_found', (data: MatchFoundEvent) => {
      const isPlayer1 = data.players[0]?.id === socket.id || false
      set({
        isMatching: false,
        isPlaying: true,
        roomId: data.roomId,
        players: data.players,
        isPlayer1,
      })
    })

    socket.on('coin_spawn', (coin: CoinSpawnEvent) => get().spawnCoin(coin))
    socket.on('coin_sliced', (slice: SliceEvent) => get().handleSlice(slice))
    // Perp-style position events
    socket.on('position_opened', (position: PositionOpenedEvent) => {
      console.log('[Socket] position_opened event received:', position)
      get().handlePositionOpened(position)
    })
    socket.on('game_settlement', (settlement: GameSettlementEvent) => get().handleGameSettlement(settlement))
    socket.on('game_start', (data: GameStartEvent) => get().handleGameStart(data))
    socket.on('game_over', (data: GameOverEvent) => get().handleGameOver(data))

    // Balance updates during gameplay (collateral deduction)
    socket.on('balance_updated', (data: BalanceUpdatedEvent) => {
      const { players } = get()
      const newPlayers = players.map((p) =>
        p.id === data.playerId ? { ...p, dollars: data.newBalance } : p
      )
      set({ players: newPlayers })
    })

    socket.on('opponent_disconnected', () => {
      get().addToast({ message: 'Opponent disconnected.', type: 'warning', duration: 5000 })
      get().resetGame()
    })

    socket.on('player_leverage_changed', (data: { playerId: string; leverage: number }) => {
      const { players } = get()
      const newPlayers = players.map((p) =>
        p.id === data.playerId ? { ...p, leverage: data.leverage } : p
      )
      set({ players: newPlayers })
    })

    socket.on('lobby_players', (players: LobbyPlayersEvent) => {
      set({ lobbyPlayers: players, isRefreshingLobby: false })
    })

    socket.on('lobby_updated', (data: LobbyUpdatedEvent) => {
      const { localPlayerId } = get()
      const filteredPlayers = data.players.filter((p) => p.socketId !== localPlayerId)
      set({ lobbyPlayers: filteredPlayers })
    })

    socket.on('joined_waiting_pool', () => {})
    socket.on('already_in_pool', () => {})

    socket.on('error', (error: { message: string }) => {
      console.error('[Socket] Server error:', error.message)
      get().addToast({ message: error.message, type: 'error', duration: 5000 })
      set({ isMatching: false })
    })

    set({ socket, socketCleanupFunctions: newCleanupFunctions })
  },

  disconnect: () => {
    const { socket, socketCleanupFunctions } = get()

    socketCleanupFunctions.forEach((fn) => fn())
    set({ socketCleanupFunctions: [] })

    if (socket) {
      socket.removeAllListeners()
      socket.disconnect()
    }
    get().resetGame()
    set({ socket: null, isConnected: false })
  },

  // ==========================================================================
  // Game Actions
  // ==========================================================================

  findMatch: (playerName: string, walletAddress?: string) => {
    const { socket } = get()
    const sceneWidth = window.sceneDimensions?.width || window.innerWidth
    const sceneHeight = window.sceneDimensions?.height || window.innerHeight

    socket?.emit('find_match', {
      playerName,
      sceneWidth,
      sceneHeight,
      walletAddress,
      leverage: 2,
    })
    set({ isMatching: true })
  },

  spawnCoin: (coin) => {
    if (get().isSceneReady && window.phaserEvents) {
      window.phaserEvents.emit('coin_spawn', coin)
    }
  },

  sliceCoin: (coinId, coinType) => {
    const { socket, localPlayerId } = get()
    if (!socket || !localPlayerId) return
    socket.emit('slice_coin', { coinId, coinType })
  },

  setLeverage: (leverage: number) => {
    const { socket, localPlayerId, players } = get()
    if (!socket || !localPlayerId) return

    // Update local state immediately
    set({ leverage })
    const newPlayers = players.map((p) => (p.id === localPlayerId ? { ...p, leverage } : p))
    set({ players: newPlayers })

    // Emit to server for opponent sync
    socket.emit('set_leverage', { leverage })
  },

  handleSlice: (slice) => {
    const { localPlayerId } = get()
    if (slice.playerId === localPlayerId) return
    window.phaserEvents?.emit('opponent_slice', slice)
  },

  // Perp-style position opened - no settlement timer
  handlePositionOpened: (positionEvent) => {
    console.log('[Store] position_opened received:', positionEvent)
    console.log('[Store] localPlayerId:', get().localPlayerId)

    const { openPositions } = get()
    const newPosition: Position = {
      id: positionEvent.positionId,
      playerId: positionEvent.playerId,
      playerName: positionEvent.playerName,
      isLong: positionEvent.isLong,
      leverage: positionEvent.leverage,
      collateral: positionEvent.collateral,
      openPrice: positionEvent.openPrice,
      closePrice: null,
      realizedPnl: 0,
      openedAt: Date.now(),
      settledAt: null,
      status: 'open',
    }

    console.log('[Store] New position:', newPosition)
    console.log('[Store] playerId match:', newPosition.playerId === get().localPlayerId)

    const newPositions = new Map(openPositions)
    newPositions.set(positionEvent.positionId, newPosition)
    set({ openPositions: newPositions })

    console.log('[Store] openPositions size after update:', newPositions.size)
  },

  // Game settlement - all positions settled at game end
  handleGameSettlement: (settlement) => {
    const { openPositions } = get()

    // Update all positions with settlement data
    const newPositions = new Map(openPositions)
    for (const settledPos of settlement.positions) {
      const position = newPositions.get(settledPos.positionId)
      if (position) {
        position.closePrice = settledPos.closePrice
        position.realizedPnl = settledPos.realizedPnl
        position.settledAt = Date.now()
        position.status = 'settled'
      }
    }

    set({
      openPositions: newPositions,
      gameSettlement: settlement,
    })
  },

  handleGameStart: (data) => {
    const { gameTimerInterval } = get()

    if (gameTimerInterval) clearInterval(gameTimerInterval)

    set({
      gameTimeRemaining: data.durationMs,
    })

    const interval = setInterval(() => {
      const { gameTimeRemaining: remaining } = get()
      const newRemaining = Math.max(0, remaining - 100)
      if (newRemaining === 0) {
        clearInterval(get().gameTimerInterval as unknown as number)
        set({ gameTimerInterval: null })
      }
      set({ gameTimeRemaining: newRemaining })
    }, 100) as unknown as number

    set({ gameTimerInterval: interval })
  },

  handleGameOver: (data) => {
    window.phaserEvents?.emit('clear_coins')

    const { localPlayerId } = get()
    const isWinner = data.winnerId === localPlayerId
    get().addToast({
      message: isWinner ? '🎉 You WIN!' : `😢 ${data.winnerName} wins!`,
      type: isWinner ? 'success' : 'error',
      duration: 0,
    })

    set({ isGameOver: true, gameOverData: data })
  },

  // No-op: Perp-style positions don't use player hits
  handlePlayerHit: () => {},

  connectPriceFeed: (symbol: CryptoSymbol) => {
    set({ selectedCrypto: symbol })
  },

  disconnectPriceFeed: () => {
    set({ priceData: null, isPriceConnected: false, firstPrice: null })
  },

  resetGame: () => {
    const { gameTimerInterval } = get()
    if (gameTimerInterval) clearInterval(gameTimerInterval)

    set({
      roomId: null,
      players: [],
      openPositions: new Map(),
      gameSettlement: null,
      isPlaying: false,
      isMatching: false,
      leverage: 2, // Reset to default leverage
      gameTimeRemaining: 0,
      gameTimerInterval: null,
      // Reset price state for clean reconnection in next game
      priceData: null,
      isPriceConnected: false,
      firstPrice: null,
      priceError: null,
      lastPriceUpdate: 0,
    })
  },

  manualReconnect: () => {
    const { selectedCrypto } = get()
    set({ reconnectAttempts: 0, priceError: null })
    get().connectPriceFeed(selectedCrypto)
  },

  addToast: (toast) => {
    const id = Math.random().toString(36).substring(7)
    const newToast = { ...toast, id }
    set({ toasts: [...get().toasts, newToast] })

    const duration = toast.duration ?? 3000
    setTimeout(() => get().removeToast(id), duration)
  },

  removeToast: (id) => {
    const { toasts } = get()
    set({ toasts: toasts.filter((t) => t.id !== id) })
  },

  clearToasts: () => set({ toasts: [] }),

  playAgain: () => {
    set({ toasts: [] })
    get().resetGame()
    set({ isGameOver: false, gameOverData: null })
  },

  endGame: () => {
    const { socket } = get()
    if (!socket || !socket.connected) return
    socket.emit('end_game')
  },

  // ==========================================================================
  // Lobby Actions
  // ==========================================================================

  getLobbyPlayers: () => {
    const { socket } = get()
    if (!socket) return
    set({ isRefreshingLobby: true })
    socket.emit('get_lobby_players')
    setTimeout(() => set({ isRefreshingLobby: false }), 5000)
  },

  joinWaitingPool: (playerName: string, walletAddress?: string) => {
    const { socket } = get()
    if (!socket) return

    const sceneWidth = window.sceneDimensions?.width || window.innerWidth
    const sceneHeight = window.sceneDimensions?.height || window.innerHeight

    socket.emit('join_waiting_pool', {
      playerName,
      sceneWidth,
      sceneHeight,
      walletAddress,
      leverage: 2,
    })
  },

  leaveWaitingPool: () => {
    const { socket } = get()
    if (!socket) return
    socket.emit('leave_waiting_pool')
  },

  selectOpponent: (opponentSocketId: string) => {
    const { socket } = get()
    if (!socket) return
    socket.emit('select_opponent', { opponentSocketId })
    set({ isMatching: true })
  },

  toggleSound: () => {
    const { isSoundMuted } = get()
    const newMutedState = !isSoundMuted
    set({ isSoundMuted: newMutedState })
    window.phaserEvents?.emit('sound_muted', newMutedState)
  },
}))

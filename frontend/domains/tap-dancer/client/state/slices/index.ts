/**
 * TapDancer Trading Store - Simplified Zustand store for tap-to-trade game.
 *
 * No coins, no swiping - just tap UP/DOWN buttons to open positions.
 * Uses the Slices Pattern for modularity.
 *
 * @see https://github.com/pmndrs/zustand/blob/main/docs/guides/slices-pattern.md
 */

import { create } from 'zustand'
import { io } from 'socket.io-client'
import { CLIENT_GAME_CONFIG as CFG } from '../../game.config'
import type { TradingState, CryptoSymbol } from '../trading.types'
import {
  getPositionOpeningCapacity,
  getPositionOpeningLimitMessage,
} from '@/domains/match/position-opening'
import type {
  Player,
  PositionOpenedEvent,
  MatchFoundEvent,
  GameOverEvent,
  GameStartEvent,
  LobbyPlayersEvent,
  LobbyUpdatedEvent,
  BalanceUpdatedEvent,
  Position,
  GameSettlementEvent,
  LiquidationEvent,
  Direction,
  PositionCloseRejectedEvent,
  ZeroSumPositionClosedEvent,
} from '@/domains/tap-dancer/shared/trading.types'

export * from '../trading.types'

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

  // Game state
  openPositions: new Map<string, Position>(),
  gameSettlement: null,
  toasts: [],
  leverage: CFG.FIXED_LEVERAGE,
  closingPositions: new Map(),
  positionCloseTimeouts: new Map(),

  // Matchmaking settings
  selectedGameDuration: CFG.DURATION_OPTIONS_MS[0],
  selectedLeverage: CFG.FIXED_LEVERAGE,

  // Audio state
  isSoundMuted:
    typeof window !== 'undefined' ? localStorage.getItem('tapDancer_soundMuted') === 'true' : false,
  beatActive: false,

  // Price feed state
  priceSocket: null,
  priceReconnectTimer: null,
  priceData: null,
  isPriceConnected: false,
  selectedCrypto: 'btcusdt' as CryptoSymbol,
  reconnectAttempts: 0,
  maxReconnectAttempts: CFG.MAX_RECONNECT_ATTEMPTS,
  reconnectDelay: CFG.RECONNECT_DELAY_MS,
  priceError: null,
  lastPriceUpdate: 0,
  firstPrice: null,

  // ==========================================================================
  // Connection Actions
  // ==========================================================================

  connect: () => {
    const { socket, socketCleanupFunctions } = get()
    socketCleanupFunctions.forEach((fn) => fn())
    set({ socketCleanupFunctions: [] })

    if (socket) {
      socket.removeAllListeners()
      socket.disconnect()
    }

    const socketUrl = process.env.NEXT_PUBLIC_URL || ''
    const nextSocket = io(socketUrl, {
      transports: ['websocket', 'polling'],
    })

    const newCleanupFunctions: Array<() => void> = []

    // Price throttling for smoother UI (prevents microstutter on position indicator)
    let lastPriceUpdateTime = 0
    let lastPrice = 0
    const PRICE_THROTTLE_MS = 100 // ~10fps for normal updates
    const MEANINGFUL_CHANGE_THRESHOLD = 0.005 // 0.5% = bypass throttle

    nextSocket.on('connect', () => {
      set({ isConnected: true, localPlayerId: nextSocket.id })
    })

    nextSocket.on(
      'btc_price',
      (data: { price: number; change: number; changePercent: number; timestamp: number }) => {
        // Always update timestamp for connection health monitoring
        set({ lastPriceUpdate: data.timestamp, isPriceConnected: true, priceError: null })

        // Smart throttling: throttle small changes, bypass for meaningful moves
        const now = Date.now()
        const priceChangePercent =
          lastPrice > 0 ? Math.abs((data.price - lastPrice) / lastPrice) : 0
        const isMeaningfulChange = priceChangePercent >= MEANINGFUL_CHANGE_THRESHOLD
        const throttleExpired = now - lastPriceUpdateTime >= PRICE_THROTTLE_MS

        if (!isMeaningfulChange && !throttleExpired) {
          return // Skip this update - not meaningful and throttle not expired
        }

        // Calculate firstPrice: current price minus change from baseline
        const expectedFirstPrice = data.price - data.change

        // Validate the calculation to avoid NaN
        if (!Number.isFinite(expectedFirstPrice)) {
          console.warn('[btc_price] Invalid firstPrice calculation, skipping update')
          return
        }

        lastPriceUpdateTime = now
        lastPrice = data.price

        set({
          firstPrice: expectedFirstPrice,
          priceData: {
            symbol: 'BTC',
            price: data.price,
            change: data.change,
            changePercent: data.changePercent,
            tradeSize: 0,
            tradeSide: 'BUY',
            tradeTime: data.timestamp,
          },
        })
      }
    )

    nextSocket.on('disconnect', () => {
      set({ isConnected: false })
      const { socketCleanupFunctions } = get()
      socketCleanupFunctions.forEach((fn) => fn())
      set({ socketCleanupFunctions: [] })
    })

    nextSocket.on('waiting_for_match', () => set({ isMatching: true }))

    nextSocket.on('match_found', (data: MatchFoundEvent) => {
      const isPlayer1 = data.players[0]?.id === nextSocket.id || false
      set({
        isMatching: false,
        isPlaying: true,
        roomId: data.roomId,
        players: data.players,
        isPlayer1,
      })
    })

    // Position events (no coin events in TapDancer)
    nextSocket.on('position_opened', (position: PositionOpenedEvent) => {
      get().handlePositionOpened(position)
    })
    // Zero-sum: Handle new position_closed event with transfer data
    nextSocket.on('position_closed', (data: ZeroSumPositionClosedEvent) => {
      get().handlePositionClosed(data)
    })
    // Zero-sum: Handle position close rejection (prediction not correct)
    nextSocket.on('position_close_rejected', (data: PositionCloseRejectedEvent) => {
      get().handlePositionCloseRejected(data)
    })
    nextSocket.on('game_settlement', (settlement: GameSettlementEvent) =>
      get().handleGameSettlement(settlement)
    )
    nextSocket.on('position_liquidated', (data: LiquidationEvent) => {
      get().handlePositionLiquidated(data)
    })
    nextSocket.on('game_start', (data: GameStartEvent) => get().handleGameStart(data))
    nextSocket.on('game_over', (data: GameOverEvent) => get().handleGameOver(data))

    // Balance updates
    nextSocket.on('balance_updated', (data: BalanceUpdatedEvent) => {
      const { players } = get()
      const newPlayers = players.map((p) =>
        p.id === data.playerId ? { ...p, dollars: data.newBalance } : p
      )
      set({ players: newPlayers })
    })

    nextSocket.on('opponent_disconnected', () => {
      get().addToast({ message: 'Opponent disconnected.', type: 'warning', duration: 5000 })
      get().resetGame()
    })

    nextSocket.on('player_leverage_changed', (data: { playerId: string; leverage: number }) => {
      const { players } = get()
      const newPlayers = players.map((p) =>
        p.id === data.playerId ? { ...p, leverage: data.leverage } : p
      )
      set({ players: newPlayers })
    })

    nextSocket.on('lobby_players', (players: LobbyPlayersEvent) => {
      const filteredPlayers = players.filter((p) => !p.gameSlug || p.gameSlug === CFG.SLUG)
      set({ lobbyPlayers: filteredPlayers, isRefreshingLobby: false })
    })

    nextSocket.on('lobby_updated', (data: LobbyUpdatedEvent) => {
      const { localPlayerId } = get()
      const filteredPlayers = data.players.filter(
        (p) => p.socketId !== localPlayerId && (!p.gameSlug || p.gameSlug === CFG.SLUG)
      )
      set({ lobbyPlayers: filteredPlayers })
    })

    nextSocket.on('joined_waiting_pool', () => {})
    nextSocket.on('already_in_pool', () => {})

    nextSocket.on('error', (error: { message: string }) => {
      console.error('[Socket] Server error:', error.message)
      get().addToast({ message: error.message, type: 'error', duration: 5000 })
      set({ isMatching: false })
    })

    set({ socket: nextSocket, socketCleanupFunctions: newCleanupFunctions })
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
    const { socket, selectedGameDuration } = get()
    const sceneWidth = window.sceneDimensions?.width || window.innerWidth
    const sceneHeight = window.sceneDimensions?.height || window.innerHeight

    set({ leverage: CFG.FIXED_LEVERAGE })

    socket?.emit('find_match', {
      playerName,
      gameSlug: CFG.SLUG,
      sceneWidth,
      sceneHeight,
      walletAddress,
      leverage: CFG.FIXED_LEVERAGE,
      gameDuration: selectedGameDuration,
    })
    set({ isMatching: true })
  },

  // NEW: Direct position opening via UP/DOWN buttons
  openPosition: (direction: Direction) => {
    const { socket, localPlayerId, players, openPositions } = get()
    if (!socket || !localPlayerId) return

    const player = players.find((entry) => entry.id === localPlayerId)
    const opponent = players.find((entry) => entry.id !== localPlayerId)
    if (!player || !opponent) return

    const playerOpenPositions = Array.from(openPositions.values()).filter(
      (position) => position.playerId === localPlayerId && position.status === 'open'
    ).length
    const opponentOpenPositions = Array.from(openPositions.values()).filter(
      (position) => position.playerId !== localPlayerId && position.status === 'open'
    ).length

    const openingCapacity = getPositionOpeningCapacity({
      playerBalance: player.dollars,
      opponentBalance: opponent.dollars,
      playerOpenPositions,
      opponentOpenPositions,
      stakeAmount: CFG.STAKE_AMOUNT,
    })

    if (!openingCapacity.canOpen) {
      get().addToast({
        message: getPositionOpeningLimitMessage(openingCapacity),
        type: 'warning',
        duration: 3000,
      })
      return
    }

    socket.emit('open_position', { direction })
  },

  closePosition: (positionId: string) => {
    const { socket, localPlayerId } = get()
    if (!socket || !localPlayerId) return
    socket.emit('close_position', { positionId })
  },

  setLeverage: (leverage: number) => {
    const { socket, localPlayerId, players } = get()
    if (!socket || !localPlayerId) return

    const nextLeverage = CFG.FIXED_LEVERAGE
    if (leverage !== CFG.FIXED_LEVERAGE) {
      console.warn(
        `[Store] Ignoring requested leverage ${leverage}x, fixed at ${CFG.FIXED_LEVERAGE}x`
      )
    }

    set({ leverage: nextLeverage })
    const newPlayers = players.map((p) =>
      p.id === localPlayerId ? { ...p, leverage: nextLeverage } : p
    )
    set({ players: newPlayers })

    socket.emit('set_leverage', { leverage: nextLeverage })
  },

  setSelectedGameDuration: (duration: number) => {
    set({ selectedGameDuration: duration })
    if (typeof window !== 'undefined') {
      localStorage.setItem('tapDancer_gameDuration', String(duration))
    }
  },

  setSelectedLeverage: (leverage: number) => {
    const nextLeverage = CFG.FIXED_LEVERAGE
    if (leverage !== CFG.FIXED_LEVERAGE) {
      console.warn(
        `[Store] Ignoring selected leverage ${leverage}x, fixed at ${CFG.FIXED_LEVERAGE}x`
      )
    }
    set({ selectedLeverage: nextLeverage })
    if (typeof window !== 'undefined') {
      localStorage.setItem('tapDancer_leverage', String(nextLeverage))
    }
  },

  handlePositionOpened: (positionEvent) => {
    const { openPositions } = get()
    const newPosition: Position = {
      id: positionEvent.positionId,
      playerId: positionEvent.playerId,
      playerName: positionEvent.playerName,
      isUp: positionEvent.isUp,
      leverage: positionEvent.leverage,
      collateral: positionEvent.collateral,
      openPrice: positionEvent.openPrice,
      closePrice: null,
      realizedPnl: 0,
      openedAt: Date.now(),
      settledAt: null,
      status: 'open',
    }

    const newPositions = new Map(openPositions)
    newPositions.set(positionEvent.positionId, newPosition)
    set({ openPositions: newPositions })
  },

  handlePositionClosed: (data: ZeroSumPositionClosedEvent) => {
    const { openPositions, localPlayerId, closingPositions, positionCloseTimeouts } = get()

    const position = openPositions.get(data.positionId)

    if (position) {
      const isOwnPosition = data.playerId === localPlayerId
      const newClosingPositions = new Map(closingPositions)

      if (isOwnPosition) {
        newClosingPositions.set(data.positionId, {
          positionId: data.positionId,
          reason: 'manual',
          realizedPnl: data.amountTransferred, // Zero-sum: use transfer amount
          timestamp: Date.now(),
        })

        // Emit event for graph animation
        window.phaserEvents?.emit('position_closed', {
          positionId: data.positionId,
          amountTransferred: data.amountTransferred,
          isUp: data.isUp,
          isWinner: data.winnerId === localPlayerId,
        })

        const timeoutId = setTimeout(() => {
          const currentClosing = get().closingPositions
          const currentOpen = get().openPositions
          const currentTimeouts = get().positionCloseTimeouts
          const updatedClosing = new Map(currentClosing)
          const updatedOpen = new Map(currentOpen)
          const updatedTimeouts = new Map(currentTimeouts)
          updatedClosing.delete(data.positionId)
          updatedOpen.delete(data.positionId)
          updatedTimeouts.delete(data.positionId)
          set({
            closingPositions: updatedClosing,
            openPositions: updatedOpen,
            positionCloseTimeouts: updatedTimeouts,
          })
        }, 1200)

        const newTimeouts = new Map(positionCloseTimeouts)
        newTimeouts.set(data.positionId, timeoutId)

        set({ closingPositions: newClosingPositions, positionCloseTimeouts: newTimeouts })
      } else {
        const newPositions = new Map(openPositions)
        newPositions.delete(data.positionId)
        set({ openPositions: newPositions })
      }
    }
  },

  // Zero-sum: Handle close rejection when prediction is not correct
  handlePositionCloseRejected: (data: PositionCloseRejectedEvent) => {
    const { localPlayerId } = get()

    // Only show toast for own position
    if (data.playerId === localPlayerId) {
      const direction = data.isUp ? 'UP' : 'DOWN'
      const reason = data.isUp ? 'price must be above entry' : 'price must be below entry'
      get().addToast({
        message: `Cannot close ${direction}: ${reason}`,
        type: 'warning',
        duration: 3000,
      })
    }

    // Emit event for Phaser to update UI
    window.phaserEvents?.emit('position_close_rejected', data)
  },

  handleGameSettlement: (settlement) => {
    const { positionCloseTimeouts } = get()

    positionCloseTimeouts.forEach((timeoutId) => clearTimeout(timeoutId))

    set({
      openPositions: new Map(),
      closingPositions: new Map(),
      positionCloseTimeouts: new Map(),
      gameSettlement: settlement,
    })
  },

  handlePositionLiquidated: (liquidationEvent) => {
    const { openPositions, localPlayerId, closingPositions, positionCloseTimeouts } = get()

    const position = openPositions.get(liquidationEvent.positionId)

    if (position) {
      const isOwnPosition = liquidationEvent.playerId === localPlayerId
      const newClosingPositions = new Map(closingPositions)

      if (isOwnPosition) {
        newClosingPositions.set(liquidationEvent.positionId, {
          positionId: liquidationEvent.positionId,
          reason: 'liquidated',
          realizedPnl: liquidationEvent.pnlAtLiquidation,
          timestamp: Date.now(),
        })

        const timeoutId = setTimeout(() => {
          const currentClosing = get().closingPositions
          const currentOpen = get().openPositions
          const currentTimeouts = get().positionCloseTimeouts
          const updatedClosing = new Map(currentClosing)
          const updatedOpen = new Map(currentOpen)
          const updatedTimeouts = new Map(currentTimeouts)
          updatedClosing.delete(liquidationEvent.positionId)
          updatedOpen.delete(liquidationEvent.positionId)
          updatedTimeouts.delete(liquidationEvent.positionId)
          set({
            closingPositions: updatedClosing,
            openPositions: updatedOpen,
            positionCloseTimeouts: updatedTimeouts,
          })
        }, 1200)

        const newTimeouts = new Map(positionCloseTimeouts)
        newTimeouts.set(liquidationEvent.positionId, timeoutId)

        set({ closingPositions: newClosingPositions, positionCloseTimeouts: newTimeouts })
      } else {
        const newPositions = new Map(openPositions)
        newPositions.delete(liquidationEvent.positionId)
        set({ openPositions: newPositions })
      }
    }

    window.phaserEvents?.emit('position_liquidated', liquidationEvent)
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
    const { localPlayerId } = get()
    const isWinner = data.winnerId === localPlayerId
    get().addToast({
      message: isWinner ? '🎉 You WIN!' : `😢 ${data.winnerName} wins!`,
      type: isWinner ? 'success' : 'error',
      duration: 0,
    })

    set({ isGameOver: true, gameOverData: data })
  },

  connectPriceFeed: (symbol: CryptoSymbol) => {
    set({ selectedCrypto: symbol })
  },

  disconnectPriceFeed: () => {
    set({ priceData: null, isPriceConnected: false, firstPrice: null })
  },

  resetGame: () => {
    const { gameTimerInterval, positionCloseTimeouts } = get()
    if (gameTimerInterval) clearInterval(gameTimerInterval)

    positionCloseTimeouts.forEach((timeoutId) => clearTimeout(timeoutId))

    set({
      roomId: null,
      players: [],
      openPositions: new Map(),
      gameSettlement: null,
      isPlaying: false,
      isMatching: false,
      leverage: CFG.FIXED_LEVERAGE,
      selectedLeverage: CFG.FIXED_LEVERAGE,
      gameTimeRemaining: 0,
      gameTimerInterval: null,
      priceData: null,
      isPriceConnected: false,
      firstPrice: null,
      priceError: null,
      lastPriceUpdate: 0,
      positionCloseTimeouts: new Map(),
      closingPositions: new Map(),
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
    socket.emit('get_lobby_players', { gameSlug: CFG.SLUG })
    setTimeout(() => set({ isRefreshingLobby: false }), 5000)
  },

  joinWaitingPool: (playerName: string, walletAddress?: string) => {
    const { socket, selectedGameDuration } = get()
    if (!socket) return

    const sceneWidth = window.sceneDimensions?.width || window.innerWidth
    const sceneHeight = window.sceneDimensions?.height || window.innerHeight

    set({ leverage: CFG.FIXED_LEVERAGE })

    socket.emit('join_waiting_pool', {
      playerName,
      gameSlug: CFG.SLUG,
      sceneWidth,
      sceneHeight,
      walletAddress,
      leverage: CFG.FIXED_LEVERAGE,
      gameDuration: selectedGameDuration,
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
    if (typeof window !== 'undefined') {
      localStorage.setItem('tapDancer_soundMuted', String(newMutedState))
    }
    window.phaserEvents?.emit('sound_muted', newMutedState)
  },

  triggerBeat: () => {
    set({ beatActive: true })
    // Reset beat state after a longer duration for smooth, atmospheric pulse
    setTimeout(() => set({ beatActive: false }), 400)
  },
}))

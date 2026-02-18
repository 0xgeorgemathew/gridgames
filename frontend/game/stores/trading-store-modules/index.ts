/**
 * Trading Store - Main Zustand store for HFT Battle game state.
 *
 * Uses the Slices Pattern for modularity while maintaining
 * inter-slice communication via the get() function.
 *
 * @see https://github.com/pmndrs/zustand/blob/main/docs/guides/slices-pattern.md
 */

import { create } from 'zustand'
import { io } from 'socket.io-client'
import type { TradingState, CryptoSymbol } from './types'
import {
  getDamageForCoinType,
  calculateTugOfWarDelta,
  transferFunds,
  clampTugOfWar,
  logFundTransfer,
} from './helpers'
import type {
  Player,
  CoinSpawnEvent,
  SliceEvent,
  OrderPlacedEvent,
  SettlementEvent,
  MatchFoundEvent,
  GameOverEvent,
  RoundStartEvent,
  RoundEndEvent,
  RoundSummary,
  CoinType,
  LobbyPlayersEvent,
  LobbyUpdatedEvent,
} from '../../types/trading'

// Re-export types and helpers
export * from './types'
export * from './helpers'

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

  // Round state
  currentRound: 0,
  player1Wins: 0,
  player2Wins: 0,
  isSuddenDeath: false,
  roundTimeRemaining: 0,
  roundTimerInterval: null,
  hasEmittedReady: false,
  roundHistory: [],

  // Game state
  tugOfWar: 0,
  activeOrders: new Map(),
  pendingOrders: new Map(),
  latestSettlement: null,
  toasts: [],
  whale2XActivatedAt: null,
  whale2XExpiresAt: null,
  whaleMultiplier: 2,

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

      const cleanupInterval = setInterval(() => {
        get().cleanupOrphanedOrders()
      }, 5000)

      newCleanupFunctions.push(() => clearInterval(cleanupInterval))
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
    socket.on('order_placed', (order: OrderPlacedEvent) => get().handleOrderPlaced(order))
    socket.on('order_settled', (settlement: SettlementEvent) => get().handleSettlement(settlement))
    socket.on('round_start', (data: RoundStartEvent) => get().handleRoundStart(data))
    socket.on('round_end', (data: RoundEndEvent) => get().handleRoundEnd(data))
    socket.on('game_over', (data: GameOverEvent) => get().handleGameOver(data))
    socket.on('player_hit', (data) => get().handlePlayerHit(data))

    socket.on('opponent_disconnected', () => {
      get().addToast({ message: 'Opponent disconnected.', type: 'warning', duration: 5000 })
      get().resetGame()
    })

    socket.on(
      'whale_2x_activated',
      (data: { playerId: string; playerName: string; durationMs: number; multiplier: number }) => {
        const { localPlayerId } = get()
        const isLocalPlayer = data.playerId === localPlayerId

        if (isLocalPlayer) {
          const now = Date.now()
          set({
            whale2XActivatedAt: now,
            whale2XExpiresAt: now + data.durationMs,
            whaleMultiplier: data.multiplier,
          })
        }

        if (window.phaserEvents) {
          window.phaserEvents.emit('whale_2x_activated', { ...data, isLocalPlayer })
        }
      }
    )

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

  handleSlice: (slice) => {
    const { localPlayerId } = get()
    if (slice.playerId === localPlayerId) return
    window.phaserEvents?.emit('opponent_slice', slice)
  },

  handleOrderPlaced: (order) => {
    const { activeOrders } = get()
    const newActiveOrders = new Map(activeOrders)
    newActiveOrders.set(order.orderId, order)
    set({ activeOrders: newActiveOrders })
  },

  handleSettlement: (settlement) => {
    const { isPlayer1, players, pendingOrders, tugOfWar, activeOrders } = get()
    const amount = settlement.amountTransferred ?? getDamageForCoinType(settlement.coinType)

    const winnerId = settlement.isCorrect
      ? settlement.playerId
      : players.find((p) => p.id !== settlement.playerId)?.id
    const loserId = settlement.isCorrect
      ? players.find((p) => p.id !== settlement.playerId)?.id
      : settlement.playerId

    const newPlayers =
      winnerId && loserId ? transferFunds(players, winnerId, loserId, amount) : players

    if (winnerId && loserId) {
      logFundTransfer(
        players,
        newPlayers,
        winnerId,
        loserId,
        amount,
        'Settlement',
        `${settlement.coinType.toUpperCase()} ${settlement.playerName} ${settlement.isCorrect ? 'WON' : 'LOST'}`
      )
    }

    const tugOfWarDelta = calculateTugOfWarDelta(isPlayer1, settlement.isCorrect, amount)

    const newActiveOrders = new Map(activeOrders)
    const newPendingOrders = new Map(pendingOrders)
    newActiveOrders.delete(settlement.orderId)
    newPendingOrders.set(settlement.orderId, settlement)

    const MAX_SETTLEMENT_HISTORY = 50
    if (newPendingOrders.size > MAX_SETTLEMENT_HISTORY) {
      newPendingOrders.delete(newPendingOrders.keys().next().value)
    }

    set({
      activeOrders: newActiveOrders,
      pendingOrders: newPendingOrders,
      tugOfWar: clampTugOfWar(tugOfWar + tugOfWarDelta),
      players: newPlayers,
      latestSettlement: settlement,
    })
  },

  handlePlayerHit: (data) => {
    const { isPlayer1, players, tugOfWar } = get()

    const loserId = data.playerId
    const winnerId = players.find((p) => p.id !== data.playerId)?.id

    const newPlayers =
      winnerId && loserId ? transferFunds(players, winnerId, loserId, data.damage) : players

    if (winnerId && loserId) {
      const loser = newPlayers.find((p) => p.id === loserId)
      logFundTransfer(
        players,
        newPlayers,
        winnerId,
        loserId,
        data.damage,
        'PlayerHit',
        `${loser?.name || 'Unknown'} hit by ${data.reason}: $${data.damage} penalty`
      )
    }

    const tugOfWarDelta = calculateTugOfWarDelta(isPlayer1, false, data.damage)

    set({
      players: newPlayers,
      tugOfWar: clampTugOfWar(tugOfWar + tugOfWarDelta),
    })
  },

  handleRoundStart: (data) => {
    const { roundTimerInterval } = get()

    if (roundTimerInterval) clearInterval(roundTimerInterval)

    set({
      currentRound: data.roundNumber,
      isSuddenDeath: data.isSuddenDeath,
      roundTimeRemaining: data.durationMs,
    })

    const interval = setInterval(() => {
      const { roundTimeRemaining: remaining } = get()
      const newRemaining = Math.max(0, remaining - 100)
      if (newRemaining === 0) {
        clearInterval(get().roundTimerInterval as unknown as number)
        set({ roundTimerInterval: null })
      }
      set({ roundTimeRemaining: newRemaining })
    }, 100) as unknown as number

    set({ roundTimerInterval: interval })
  },

  handleRoundEnd: (data) => {
    const { roundTimerInterval, roundHistory } = get()

    if (roundTimerInterval) {
      clearInterval(roundTimerInterval)
      set({ roundTimerInterval: null })
    }

    const p1Gained = data.player1Gained
    const p2Gained = data.player2Gained
    const winnerGained = data.isTie ? 0 : Math.max(p1Gained, p2Gained)

    const roundSummary: RoundSummary = {
      roundNumber: data.roundNumber,
      winnerId: data.winnerId,
      isTie: data.isTie,
      player1Dollars: data.player1Dollars,
      player2Dollars: data.player2Dollars,
      player1Gained: p1Gained,
      player2Gained: p2Gained,
      playerLost: winnerGained,
    }

    set({
      player1Wins: data.player1Wins,
      player2Wins: data.player2Wins,
      activeOrders: new Map(),
      pendingOrders: new Map(),
      roundHistory: [...roundHistory, roundSummary],
    })

    if (!data.isFinalRound) {
      window.dispatchEvent(
        new CustomEvent('round_end_flash', {
          detail: {
            roundNumber: data.roundNumber,
            winnerId: data.winnerId,
            isTie: data.isTie,
            player1Gained: data.player1Gained,
            player2Gained: data.player2Gained,
          },
        })
      )
    }

    window.phaserEvents?.emit('clear_coins')

    const { players } = get()
    const playerIds = players.map((p) => p.id)

    const newPlayers = players.map((p) => {
      if (p.id === playerIds[0]) return { ...p, dollars: data.player1Dollars }
      if (p.id === playerIds[1]) return { ...p, dollars: data.player2Dollars }
      return p
    })

    set({ players: newPlayers })

    if (!data.isFinalRound) {
      const { socket } = get()
      if (socket && socket.connected) {
        socket.emit('round_ready')
      }
    }
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

  removeActiveOrder: (orderId) => {
    const { activeOrders } = get()
    const newActiveOrders = new Map(activeOrders)
    newActiveOrders.delete(orderId)
    set({ activeOrders: newActiveOrders })
  },

  cleanupOrphanedOrders: () => {
    const { activeOrders } = get()
    const now = Date.now()

    const newActiveOrders = new Map(activeOrders)
    for (const [orderId, order] of newActiveOrders) {
      if (now - order.settlesAt > 3000) {
        newActiveOrders.delete(orderId)
      }
    }

    if (newActiveOrders.size !== activeOrders.size) {
      set({ activeOrders: newActiveOrders })
    }
  },

  connectPriceFeed: (symbol: CryptoSymbol) => {
    set({ selectedCrypto: symbol })
  },

  disconnectPriceFeed: () => {
    set({ priceData: null, isPriceConnected: false, firstPrice: null })
  },

  resetGame: () => {
    const { roundTimerInterval } = get()
    if (roundTimerInterval) clearInterval(roundTimerInterval)

    set({
      roomId: null,
      players: [],
      tugOfWar: 0,
      activeOrders: new Map(),
      pendingOrders: new Map(),
      isPlaying: false,
      isMatching: false,
      latestSettlement: null,
      whale2XActivatedAt: null,
      whale2XExpiresAt: null,
      whaleMultiplier: 2,
      currentRound: 0,
      player1Wins: 0,
      player2Wins: 0,
      isSuddenDeath: false,
      roundTimeRemaining: 0,
      roundTimerInterval: null,
      hasEmittedReady: false,
      roundHistory: [],
    })
  },

  clearLatestSettlement: () => set({ latestSettlement: null }),

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

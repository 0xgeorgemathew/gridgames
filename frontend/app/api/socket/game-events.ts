import { Server as SocketIOServer } from 'socket.io'
import { Socket } from 'socket.io'
import { Player } from '@/game/types/trading'
import { DEFAULT_BTC_PRICE } from '@/lib/formatPrice'
import { GAME_CONFIG } from '@/game/constants'
import { getLeverageForAddress } from '@/lib/ens'

// Order settlement duration - time between slice and settlement (5 seconds)
export const ORDER_SETTLEMENT_DURATION_MS = GAME_CONFIG.ORDER_SETTLEMENT_DURATION_MS

// Price broadcast data for clients
interface PriceBroadcastData {
  price: number
  change: number
  changePercent: number
  timestamp: number
}

// Debug logging control - set DEBUG_FUNDS=true in .env.local to enable
const DEBUG_FUNDS = process.env.DEBUG_FUNDS === 'true'

// =============================================================================
// SettlementGuard - Prevent duplicate settlement race conditions
// =============================================================================

class SettlementGuard {
  private inProgress = new Set<string>()
  private timestamps = new Map<string, number>()
  private cleanupInterval: NodeJS.Timeout | null = null
  private readonly STALE_THRESHOLD_MS = 30000
  private readonly CLEANUP_INTERVAL_MS = 60000

  start(): void {
    if (this.cleanupInterval) return

    this.cleanupInterval = setInterval(() => {
      const now = Date.now()
      for (const [orderId, timestamp] of this.timestamps) {
        if (now - timestamp > this.STALE_THRESHOLD_MS) {
          this.inProgress.delete(orderId)
          this.timestamps.delete(orderId)
        }
      }
    }, this.CLEANUP_INTERVAL_MS)
  }

  stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
  }

  tryAcquire(orderId: string): boolean {
    if (this.inProgress.has(orderId)) return false
    this.inProgress.add(orderId)
    this.timestamps.set(orderId, Date.now())
    return true
  }

  release(orderId: string): void {
    this.inProgress.delete(orderId)
    this.timestamps.delete(orderId)
  }
}

const settlementGuard = new SettlementGuard()

// =============================================================================
// Seeded RNG - Deterministic coin sequences for fair play
// =============================================================================

// Seeded random number generator for deterministic sequences
class SeededRandom {
  private seed: number

  constructor(seed: number) {
    this.seed = seed
  }

  next(): number {
    this.seed = (this.seed * 1664525 + 1013904223) % 4294967296
    return this.seed / 4294967296
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min
  }
}

// Pre-generated coin sequence per round (deterministic for both players)
class CoinSequence {
  private sequence: Array<{ type: 'call' | 'put' | 'gas' | 'whale'; xNormalized: number }> = []
  private index = 0

  constructor(durationMs: number, minIntervalMs: number, maxIntervalMs: number, seed: number) {
    const rng = new SeededRandom(seed)
    const types: Array<'call' | 'put' | 'gas' | 'whale'> = [
      'call',
      'call',
      'put',
      'put',
      'gas',
      'whale',
    ]

    const estimatedSpawns = Math.ceil(durationMs / minIntervalMs) + 10 // Extra for burst spawns
    for (let i = 0; i < estimatedSpawns; i++) {
      this.sequence.push({
        type: types[rng.nextInt(0, types.length - 1)],
        xNormalized: 0.15 + rng.next() * 0.7, // 15%-85% screen width (avoid edges)
      })
    }
  }

  next(): { type: 'call' | 'put' | 'gas' | 'whale'; xNormalized: number } | null {
    if (this.index >= this.sequence.length) return null
    return this.sequence[this.index++]
  }

  hasNext(): boolean {
    return this.index < this.sequence.length
  }

  peek(): { type: 'call' | 'put' | 'gas' | 'whale'; xNormalized: number } | null {
    if (this.index >= this.sequence.length) return null
    return this.sequence[this.index]
  }
}

// =============================================================================
// Price Feed Manager - Real-time Binance WebSocket
// =============================================================================

class PriceFeedManager {
  private ws: WebSocket | null = null
  private latestPrice: number = DEFAULT_BTC_PRICE
  private firstPrice: number = DEFAULT_BTC_PRICE
  private subscribers: Set<(price: number) => void> = new Set()
  private reconnectTimeout: NodeJS.Timeout | null = null
  private symbol: string = 'btcusdt'
  private isShutdown = false
  private broadcastCallback: ((data: PriceBroadcastData) => void) | null = null

  // Price broadcast data for clients
  private lastBroadcastTime = 0
  private readonly BROADCAST_THROTTLE_MS = 500

  connect(symbol: string = 'btcusdt'): void {
    // Exit if shutdown
    if (this.isShutdown) return

    this.symbol = symbol

    // Clear any pending reconnect timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }

    if (this.ws) {
      this.ws.close()
    }

    const url = `wss://stream.binance.com:9443/ws/${symbol}@aggTrade`
    this.ws = new WebSocket(url)

    this.ws.onmessage = (event) => {
      if (this.isShutdown) return
      const raw = JSON.parse(event.data.toString())
      const price = parseFloat(raw.p)

      // Initialize firstPrice on first message
      if (this.firstPrice === DEFAULT_BTC_PRICE) {
        this.firstPrice = price
      }

      // Update latest price
      this.latestPrice = price
      this.subscribers.forEach((cb) => cb(price))

      // Throttled broadcast to clients (500ms)
      const now = Date.now()
      if (this.broadcastCallback && now - this.lastBroadcastTime >= this.BROADCAST_THROTTLE_MS) {
        this.lastBroadcastTime = now
        const change = price - this.firstPrice
        const changePercent = (change / this.firstPrice) * 100

        this.broadcastCallback({
          price,
          change,
          changePercent,
          timestamp: now,
        })
      }
    }

    this.ws.onerror = (error) => {
      if (this.isShutdown) return
      // console.error('[PriceFeed] Server WebSocket error:', error)
    }

    this.ws.onclose = () => {
      // Exit if shutdown
      if (this.isShutdown) return

      // Auto-reconnect after 5s
      this.reconnectTimeout = setTimeout(() => {
        if (!this.isShutdown) {
          this.connect(this.symbol)
        }
      }, 5000)
    }
  }

  disconnect(): void {
    this.isShutdown = true

    // Clear reconnect timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }

    // Close WebSocket
    if (this.ws) {
      this.ws.onclose = null // Prevent reconnect trigger
      this.ws.onerror = null
      this.ws.onmessage = null
      this.ws.close()
      this.ws = null
    }

    // Clear subscribers
    this.subscribers.clear()
    this.broadcastCallback = null
  }

  getLatestPrice(): number {
    return this.latestPrice
  }

  getFirstPrice(): number {
    return this.firstPrice
  }

  subscribe(callback: (price: number) => void): () => void {
    this.subscribers.add(callback)
    return () => this.subscribers.delete(callback)
  }

  // Set broadcast callback for Socket.IO price broadcasts to clients
  setBroadcastCallback(callback: (data: PriceBroadcastData) => void): void {
    this.broadcastCallback = callback
  }
}

const priceFeed = new PriceFeedManager()

// =============================================================================
// Lazy Price Feed Management - Connect only when games are active
// =============================================================================

let priceFeedConnected = false

function ensurePriceFeedConnected(io: SocketIOServer): void {
  if (priceFeedConnected) return

  // Set up price broadcast to all clients via Socket.IO (single source of truth)
  priceFeed.setBroadcastCallback((data) => {
    io.emit('btc_price', data)
  })

  priceFeed.connect('btcusdt')
  priceFeedConnected = true
}

function disconnectPriceFeedIfIdle(manager: RoomManager): void {
  if (manager.getRoomCount() === 0 && priceFeedConnected) {
    priceFeed.disconnect()
    priceFeedConnected = false
  }
}

// =============================================================================
// Type Definitions
// =============================================================================

interface WaitingPlayer {
  name: string
  socketId: string
  joinedAt: number
  sceneWidth?: number
  sceneHeight?: number
  walletAddress?: string
  leverage: number // ENS leverage for matchmaking (2, 5, 10, 20)
}

interface Coin {
  id: string
  type: 'call' | 'put' | 'gas' | 'whale'
  x: number
  y: number
}

// Server-side order type (same structure as client OrderPlacedEvent)
interface PendingOrder {
  id: string
  playerId: string
  playerName: string
  coinType: 'call' | 'put' | 'whale'
  priceAtOrder: number
  settlesAt: number
  isPlayer1: boolean // Stored at order creation to avoid lookup issues at settlement
  multiplier: number // Stored at order creation - 2 if 2x was active when placed, 1 otherwise
}

// =============================================================================
// GameRoom Class - Encapsulates room state and lifecycle
// =============================================================================

class GameRoom {
  readonly id: string
  readonly players: Map<string, Player>
  readonly coins: Map<string, Coin>
  readonly pendingOrders: Map<string, PendingOrder>
  tugOfWar = 0
  private isClosing = false
  isShutdown = false // Prevents settlement timeouts from operating on deleted rooms

  private intervals = new Set<NodeJS.Timeout>()
  private timeouts = new Set<NodeJS.Timeout>()

  // Game duration (2 minutes)
  readonly gameStartTime: number
  readonly GAME_DURATION = GAME_CONFIG.GAME_DURATION_MS // 2 minutes

  // Deterministic coin sequence
  private coinSequence: CoinSequence | null = null

  // Per-player 2X mode tracking (whale power-up)
  // Now stores multiplier data: { expiresAt: timestamp, multiplier: number }
  private whale2XData = new Map<string, { expiresAt: number; multiplier: number }>()
  readonly WHALE_2X_DURATION = 10000 // 10 seconds

  // Cache player leverage from ENS (for whale power-up)
  private playerLeverageCache = new Map<string, number>() // playerId -> leverage

  // Wallet addresses for ENS leverage lookups
  player1Address: `0x${string}` | null = null
  player2Address: `0x${string}` | null = null
  // Track which socket ID corresponds to which wallet address
  addressToSocketId: Map<string, string> = new Map()

  // Client ready tracking - both clients must be ready before game starts
  clientsReady = new Set<string>()

  // Track if game loop is active (prevents duplicate startGameLoop calls)
  gameLoopActive = false

  // Game timeout tracker (for cleanup)
  gameTimeout: NodeJS.Timeout | null = null

  constructor(roomId: string) {
    this.id = roomId
    this.players = new Map()
    this.coins = new Map()
    this.pendingOrders = new Map()
    this.gameStartTime = Date.now()
  }

  // Check if player has active 2X mode
  hasWhale2X(playerId: string): boolean {
    const data = this.whale2XData.get(playerId)
    if (!data) return false
    if (Date.now() > data.expiresAt) {
      this.whale2XData.delete(playerId)
      return false
    }
    return true
  }

  // Activate whale mode for a player with their ENS leverage multiplier
  activateWhale2X(playerId: string, multiplier: number): void {
    const expiresAt = Date.now() + this.WHALE_2X_DURATION
    this.whale2XData.set(playerId, { expiresAt, multiplier })
  }

  // Get multiplier for a player (leverage from ENS if whale active, 1 if not)
  get2XMultiplier(playerId: string): number {
    const data = this.whale2XData.get(playerId)
    if (!data) return 1 // No whale active = 1x base
    if (Date.now() > data.expiresAt) {
      this.whale2XData.delete(playerId)
      return 1
    }
    return data.multiplier // Return ENS leverage (2, 5, 10, 20)
  }

  // Get player's leverage from ENS (with caching)
  async getPlayerLeverage(playerId: string): Promise<number> {
    // Check cache first
    if (this.playerLeverageCache.has(playerId)) {
      const cached = this.playerLeverageCache.get(playerId)!
      // console.log(
      //   `[GameRoom] Using cached leverage: playerId=${playerId.slice(0, 8)}, leverage=${cached}x`
      // )
      return cached
    }

    // Get wallet address from room
    const walletAddress = this.getWalletAddress(playerId)
    if (!walletAddress) {
      // console.log(
      //   `[GameRoom] No wallet address for player (using default 2x): playerId=${playerId.slice(0, 8)}`
      // )
      return 2 // Default to 2x
    }

    // Load from ENS
    const leverage = await getLeverageForAddress(walletAddress)
    const finalLeverage = leverage || 2 // Default to 2x

    // console.log(
    //   `[GameRoom] Loaded leverage from ENS: playerId=${playerId.slice(0, 8)}, address=${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}, leverage=${finalLeverage}x`
    // )

    // Cache for future use
    this.playerLeverageCache.set(playerId, finalLeverage)
    return finalLeverage
  }

  // Helper to get wallet address for player
  private getWalletAddress(playerId: string): string | undefined {
    if (
      this.player1Address &&
      this.addressToSocketId.get(this.player1Address.toLowerCase()) === playerId
    ) {
      return this.player1Address
    }
    if (
      this.player2Address &&
      this.addressToSocketId.get(this.player2Address.toLowerCase()) === playerId
    ) {
      return this.player2Address
    }
    return undefined
  }

  addPlayer(
    id: string,
    name: string,
    sceneWidth: number,
    sceneHeight: number,
    leverage: number = 2
  ): void {
    this.players.set(id, {
      id,
      name,
      dollars: GAME_CONFIG.STARTING_CASH,
      score: 0,
      sceneWidth,
      sceneHeight,
      leverage,
    })
  }

  removePlayer(id: string): void {
    this.players.delete(id)
  }

  hasPlayer(id: string): boolean {
    return this.players.has(id)
  }

  getPlayerIds(): string[] {
    return Array.from(this.players.keys())
  }

  isEmpty(): boolean {
    return this.players.size === 0
  }

  addCoin(coin: Coin): void {
    this.coins.set(coin.id, coin)
  }

  removeCoin(coinId: string): void {
    this.coins.delete(coinId)
  }

  addPendingOrder(order: PendingOrder): void {
    this.pendingOrders.set(order.id, order)
  }

  removePendingOrder(orderId: string): void {
    this.pendingOrders.delete(orderId)
  }

  // Track intervals/timeout for cleanup
  trackTimeout(timeout: NodeJS.Timeout): void {
    this.timeouts.add(timeout)
  }

  trackInterval(interval: NodeJS.Timeout): void {
    this.intervals.add(interval)
  }

  // Clear all tracked timers
  cleanup(): void {
    this.intervals.forEach(clearInterval)
    this.timeouts.forEach(clearTimeout)
    this.intervals.clear()
    this.timeouts.clear()

    // Clear game timeout
    if (this.gameTimeout) {
      clearTimeout(this.gameTimeout)
      this.gameTimeout = null
    }
  }

  // Mark client as ready and return if both clients are ready
  markClientReady(socketId: string): boolean {
    // Prevent duplicate entries from same socket (defense in depth)
    if (this.clientsReady.has(socketId)) {
      return this.clientsReady.size === 2
    }

    this.clientsReady.add(socketId)
    return this.clientsReady.size === 2
  }

  // Reset client ready state
  resetClientsReady(): void {
    this.clientsReady.clear()
  }

  // Find winner (highest dollars, or first if tied)
  getWinner(): Player | undefined {
    const players = Array.from(this.players.values())
    if (players.length === 0) {
      return undefined
    }
    return players.reduce((a, b) => (a.dollars > b.dollars ? a : b), players[0])
  }

  // Check if any player is dead
  hasDeadPlayer(): boolean {
    return Array.from(this.players.values()).some((p) => p.dollars <= 0)
  }

  // Closing state management
  getIsClosing(): boolean {
    return this.isClosing
  }

  setClosing(): void {
    this.isClosing = true
  }

  // Wave-based spawn intensity (Fruit Ninja escalation)
  // Returns spawn interval and burst chance based on elapsed time in game
  getSpawnInterval(elapsedMs: number = 0): { minMs: number; maxMs: number; burstChance: number } {
    // Wave configuration: warmup → ramp → intensity → climax (scaled for 2 minutes)
    const waves = [
      { endMs: 30000, intervalMs: { min: 1200, max: 1800 }, burstChance: 0.1 }, // Warmup
      { endMs: 60000, intervalMs: { min: 1400, max: 1800 }, burstChance: 0.15 }, // Ramp
      { endMs: 100000, intervalMs: { min: 1000, max: 1400 }, burstChance: 0.25 }, // Intensity
      { endMs: 120000, intervalMs: { min: 700, max: 1100 }, burstChance: 0.4 }, // Climax
    ]

    for (const wave of waves) {
      if (elapsedMs < wave.endMs) {
        return {
          minMs: wave.intervalMs.min,
          maxMs: wave.intervalMs.max,
          burstChance: wave.burstChance,
        }
      }
    }

    // Final wave fallback
    const last = waves[waves.length - 1]
    return { minMs: last.intervalMs.min, maxMs: last.intervalMs.max, burstChance: last.burstChance }
  }

  // Initialize deterministic coin sequence for this game
  initCoinSequence(): void {
    const seed = this.hashString(this.id)
    const spawnConfig = this.getSpawnInterval(0) // Use initial spawn config for estimation
    this.coinSequence = new CoinSequence(
      this.GAME_DURATION,
      spawnConfig.minMs,
      spawnConfig.maxMs,
      seed
    )
  }

  // Hash string to number for seeding
  private hashString(str: string): number {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash
    }
    return Math.abs(hash)
  }

  // Get next coin from deterministic sequence (includes type + xNormalized)
  getNextCoinData(): { type: 'call' | 'put' | 'gas' | 'whale'; xNormalized: number } | null {
    return this.coinSequence?.next() ?? null
  }

  // Peek at next coin without consuming it from the sequence
  peekNextCoinData(): { type: 'call' | 'put' | 'gas' | 'whale'; xNormalized: number } | null {
    return this.coinSequence?.peek() ?? null
  }
}

// =============================================================================
// RoomManager - Manages all rooms and waiting players
// =============================================================================

class RoomManager {
  private rooms = new Map<string, GameRoom>()
  private waitingPlayers = new Map<string, WaitingPlayer>()
  private playerToRoom = new Map<string, string>()

  // Room operations
  createRoom(roomId: string): GameRoom {
    const room = new GameRoom(roomId)
    this.rooms.set(roomId, room)
    return room
  }

  getRoom(roomId: string): GameRoom | undefined {
    return this.rooms.get(roomId)
  }

  hasRoom(roomId: string): boolean {
    return this.rooms.has(roomId)
  }

  getRoomCount(): number {
    return this.rooms.size
  }

  deleteRoom(roomId: string): void {
    const room = this.rooms.get(roomId)
    if (!room) return

    // Mark room as shutdown BEFORE cleanup (prevents settlement timeouts from operating)
    room.isShutdown = true

    // Clear player mappings
    for (const playerId of room.getPlayerIds()) {
      this.playerToRoom.delete(playerId)
    }

    // Cleanup room timers
    room.cleanup()

    // Delete room
    this.rooms.delete(roomId)
  }

  // Player-to-room lookup
  setPlayerRoom(playerId: string, roomId: string): void {
    this.playerToRoom.set(playerId, roomId)
  }

  getPlayerRoomId(playerId: string): string | undefined {
    return this.playerToRoom.get(playerId)
  }

  removePlayerFromRoom(playerId: string): void {
    const roomId = this.playerToRoom.get(playerId)
    if (roomId) {
      const room = this.rooms.get(roomId)
      room?.removePlayer(playerId)
      if (room?.isEmpty()) {
        this.deleteRoom(roomId)
      }
    }
    this.playerToRoom.delete(playerId)
  }

  // Waiting players
  addWaitingPlayer(socketId: string, name: string, leverage: number = 2): void {
    const existing = this.waitingPlayers.get(socketId)
    if (existing) {
      // Update existing player, preserve sceneWidth/Height and walletAddress
      existing.name = name
      existing.leverage = leverage
      // Don't update joinedAt - preserve original join time
    } else {
      // Create new player
      this.waitingPlayers.set(socketId, {
        name,
        socketId,
        joinedAt: Date.now(),
        leverage,
      })
    }
  }

  getWaitingPlayer(socketId: string): WaitingPlayer | undefined {
    return this.waitingPlayers.get(socketId)
  }

  removeWaitingPlayer(socketId: string): void {
    this.waitingPlayers.delete(socketId)
  }

  getWaitingPlayers(): Map<string, WaitingPlayer> {
    return this.waitingPlayers
  }

  // Cleanup stale waiting players (older than 30s)
  cleanupStaleWaitingPlayers(): void {
    const now = Date.now()
    for (const [id, player] of this.waitingPlayers) {
      if (now - player.joinedAt > 30000) {
        this.waitingPlayers.delete(id)
      }
    }
  }

  // Emergency shutdown - settles all pending orders and clears all state
  emergencyShutdown(io: SocketIOServer): void {
    // Settle all pending orders in all rooms
    for (const [roomId, room] of this.rooms) {
      // Mark room as shutdown to prevent new events
      room.isShutdown = true

      // Settle all pending orders immediately
      for (const [orderId, order] of room.pendingOrders) {
        settleOrder(io, room, order)
      }

      // Notify players of shutdown
      const winner = room.getWinner()
      const playerIds = room.getPlayerIds()
      const p1 = room.players.get(playerIds[0])
      const p2 = room.players.get(playerIds[1])

      io.to(roomId).emit('game_over', {
        winnerId: winner?.id,
        winnerName: winner?.name,
        reason: 'server_shutdown',
        player1Dollars: p1?.dollars ?? GAME_CONFIG.STARTING_CASH,
        player2Dollars: p2?.dollars ?? GAME_CONFIG.STARTING_CASH,
      })

      // Cleanup room timers
      room.cleanup()
    }

    // Clear manager state
    this.rooms.clear()
    this.waitingPlayers.clear()
    this.playerToRoom.clear()
  }
}

// =============================================================================
// Input Validation
// =============================================================================

function validatePlayerName(name: unknown): string {
  if (typeof name !== 'string' || name.length < 1 || name.length > 20) {
    throw new Error('Invalid player name')
  }
  return name.replace(/[^a-zA-Z0-9_-]/g, '')
}

function validateCoinType(coinType: string): coinType is 'call' | 'put' | 'whale' {
  return coinType === 'call' || coinType === 'put' || coinType === 'whale'
}

// =============================================================================
// Game Logic - Order Settlement
// =============================================================================

function settleOrder(io: SocketIOServer, room: GameRoom, order: PendingOrder): void {
  if (!settlementGuard.tryAcquire(order.id)) return
  if (!room.pendingOrders.has(order.id)) {
    settlementGuard.release(order.id)
    return
  }

  try {
    if (room.players.size === 0) return
    const playerIds = room.getPlayerIds()
    if (playerIds.length < 2) return

    const finalPrice = priceFeed.getLatestPrice()
    const priceChange = (finalPrice - order.priceAtOrder) / order.priceAtOrder

    const isCorrect = order.coinType === 'call' ? priceChange > 0 : priceChange < 0
    // Use the multiplier stored at order creation time (not current 2x state)
    // This ensures orders placed during 2x window get 2x even if they settle after 2x expires
    const impact = order.multiplier

    const actualTransfer = transferFunds(
      room,
      isCorrect ? order.playerId : playerIds.find((id) => id !== order.playerId)!,
      isCorrect ? playerIds.find((id) => id !== order.playerId)! : order.playerId,
      impact
    )

    room.tugOfWar += order.isPlayer1 ? -impact : impact
    room.removePendingOrder(order.id)

    io.to(room.id).emit('order_settled', {
      orderId: order.id,
      playerId: order.playerId,
      playerName: order.playerName,
      coinType: order.coinType,
      isCorrect,
      priceAtOrder: order.priceAtOrder,
      finalPrice: finalPrice,
      amountTransferred: actualTransfer,
    })
  } finally {
    settlementGuard.release(order.id)
  }
}

// =============================================================================
// Game Logic - Coin Spawning
// =============================================================================

interface SpawnedCoin {
  id: string
  type: 'call' | 'put' | 'gas' | 'whale'
  xNormalized: number
}

function spawnCoin(room: GameRoom): SpawnedCoin | null {
  const coinData = room.getNextCoinData()
  if (!coinData) return null

  const coinId = `coin-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`

  const coin: SpawnedCoin = {
    id: coinId,
    type: coinData.type,
    xNormalized: coinData.xNormalized,
  }

  // Add to room's coin tracking (legacy compat - x/y not used)
  room.addCoin({ id: coinId, type: coinData.type, x: 0, y: 0 })
  return coin
}

// =============================================================================
// Game Logic - Game Loop
// =============================================================================

function startGameLoop(io: SocketIOServer, manager: RoomManager, room: GameRoom): void {
  // CRITICAL: Don't start game loop if room is closing or shut down
  if (room.isShutdown || room.getIsClosing()) {
    return
  }

  // Prevent duplicate game loops
  if (room.gameLoopActive) {
    return
  }

  room.gameLoopActive = true

  // Initialize deterministic coin sequence
  room.initCoinSequence()
  const gameStartTime = Date.now()

  // Emit game_start event
  io.to(room.id).emit('game_start', {
    durationMs: room.GAME_DURATION,
  })

  // Room broadcast (single emit, not per-player) - both players get same xNormalized
  const emitCoinSpawn = (coin: SpawnedCoin) => {
    io.to(room.id).emit('coin_spawn', {
      coinId: coin.id,
      coinType: coin.type,
      xNormalized: coin.xNormalized,
    })
  }

  // Helper function to spawn coin with wave-based delay and burst spawns
  const scheduleNextSpawn = () => {
    // Stop if room no longer exists, has fewer than 2 players, or is shutting down
    if (!manager.hasRoom(room.id) || room.players.size < 2 || room.isShutdown) {
      return
    }

    const elapsedMs = Date.now() - gameStartTime
    const spawnConfig = room.getSpawnInterval(elapsedMs)

    // Determine burst count (1-3 coins) based on wave's burstChance
    const rng = Math.random()
    let burstCount = 1
    if (rng < spawnConfig.burstChance) {
      burstCount = rng < spawnConfig.burstChance * 0.3 ? 3 : 2 // 30% of bursts are triples
    }

    // CRITICAL: Pre-check sequence has enough coins for the full burst
    // Use peek() to check without consuming from the sequence
    let actualBurstCount = burstCount
    for (let i = 0; i < burstCount; i++) {
      if (!room.peekNextCoinData()) {
        actualBurstCount = i
        break
      }
    }

    // Spawn burst with 100ms stagger for Fruit Ninja feel
    for (let i = 0; i < actualBurstCount; i++) {
      const coin = spawnCoin(room)
      if (!coin) return // Should never happen due to pre-check above

      // Stagger burst spawns by 100ms each
      if (i === 0) {
        emitCoinSpawn(coin)
      } else {
        const staggerTimeout = setTimeout(() => {
          // Double-check room state before delayed emit (prevents race conditions)
          // Pattern: Guards prevent operations on deleted rooms during async callbacks
          if (room.isShutdown || !manager.hasRoom(room.id)) return
          emitCoinSpawn(coin)
        }, i * 100)
        room.trackTimeout(staggerTimeout)
      }
    }

    // Schedule next spawn based on wave config
    const nextDelay =
      Math.floor(Math.random() * (spawnConfig.maxMs - spawnConfig.minMs + 1)) + spawnConfig.minMs
    const timeoutId = setTimeout(scheduleNextSpawn, nextDelay)
    room.trackTimeout(timeoutId)
  }

  // Start first spawn immediately
  scheduleNextSpawn()

  // Clear any existing game timeout (defensive)
  if (room.gameTimeout) {
    clearTimeout(room.gameTimeout)
  }

  // End game after GAME_DURATION (2 minutes)
  room.gameTimeout = setTimeout(() => {
    endGame(io, manager, room)
  }, room.GAME_DURATION)

  room.trackTimeout(room.gameTimeout)
}

// End game (time limit reached)
function endGame(io: SocketIOServer, manager: RoomManager, room: GameRoom): void {
  // Mark game loop as no longer active
  room.gameLoopActive = false

  // CRITICAL: Settle all pending orders before game ends
  for (const [orderId, order] of room.pendingOrders) {
    settleOrder(io, room, order)
  }

  // Mark room as closing
  room.setClosing()

  // Determine winner
  const winner = room.getWinner()
  const playerIds = room.getPlayerIds()
  const p1 = room.players.get(playerIds[0])
  const p2 = room.players.get(playerIds[1])

  // Emit game_over event
  io.to(room.id).emit('game_over', {
    winnerId: winner?.id,
    winnerName: winner?.name,
    reason: 'time_limit' as const,
    player1Dollars: p1?.dollars ?? GAME_CONFIG.STARTING_CASH,
    player2Dollars: p2?.dollars ?? GAME_CONFIG.STARTING_CASH,
  })

  // Clear clientsReady
  room.resetClientsReady()

  setTimeout(() => manager.deleteRoom(room.id), 1000)
  setTimeout(() => disconnectPriceFeedIfIdle(manager), 1100)
}

// =============================================================================
// Helper Functions
// =============================================================================

// Fund transfer helper - zero-sum with $0 floor
// Returns the actual amount transferred (capped at loser's balance)
function transferFunds(room: GameRoom, winnerId: string, loserId: string, amount: number): number {
  const winner = room.players.get(winnerId)
  const loser = room.players.get(loserId)

  // Cap transfer at loser's available balance (zero-sum: total always = 20)
  const actualTransfer = Math.min(amount, loser?.dollars || 0)

  if (winner) winner.dollars += actualTransfer
  if (loser) loser.dollars -= actualTransfer // Goes to 0, never negative

  return actualTransfer
}

async function createMatch(
  io: SocketIOServer,
  manager: RoomManager,
  playerId1: string,
  playerId2: string,
  name1: string,
  name2: string,
  wallet1: string | undefined,
  wallet2: string | undefined,
  sceneWidth1: number,
  sceneHeight1: number,
  sceneWidth2: number,
  sceneHeight2: number,
  leverage1: number,
  leverage2: number
): Promise<void> {
  // Lazy-load price feed - connect only when first game starts
  ensurePriceFeedConnected(io)

  const roomId = `room-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
  const room = manager.createRoom(roomId)

  // Add players with leverage from matchmaking (no ENS lookup needed)
  room.addPlayer(playerId1, name1, sceneWidth1, sceneHeight1, leverage1)
  room.addPlayer(playerId2, name2, sceneWidth2, sceneHeight2, leverage2)

  // Store wallet addresses for ENS leverage lookups AND create address → socket ID mapping
  if (wallet1 && wallet1.startsWith('0x')) {
    room.player1Address = wallet1 as `0x${string}`
    room.addressToSocketId.set(wallet1.toLowerCase(), playerId1)
  }
  if (wallet2 && wallet2.startsWith('0x')) {
    room.player2Address = wallet2 as `0x${string}`
    room.addressToSocketId.set(wallet2.toLowerCase(), playerId2)
  }

  manager.setPlayerRoom(playerId1, roomId)
  manager.setPlayerRoom(playerId2, roomId)

  io.of('/').sockets.get(playerId1)?.join(roomId)
  io.of('/').sockets.get(playerId2)?.join(roomId)

  io.to(roomId).emit('match_found', {
    roomId,
    players: [
      {
        id: playerId1,
        name: name1,
        dollars: GAME_CONFIG.STARTING_CASH,
        score: 0,
        sceneWidth: sceneWidth1,
        sceneHeight: sceneHeight1,
        leverage: leverage1,
      },
      {
        id: playerId2,
        name: name2,
        dollars: GAME_CONFIG.STARTING_CASH,
        score: 0,
        sceneWidth: sceneWidth2,
        sceneHeight: sceneHeight2,
        leverage: leverage2,
      },
    ],
  })

  manager.removeWaitingPlayer(playerId2)

  // Broadcast lobby update after match is created (include leverage)
  const allWaitingPlayers = Array.from(manager.getWaitingPlayers().entries()).map(
    ([_id, player]) => ({
      socketId: player.socketId,
      name: player.name,
      joinedAt: player.joinedAt,
      leverage: player.leverage,
    })
  )
  io.emit('lobby_updated', { players: allWaitingPlayers })

  // Wait for both clients to be ready before starting (syncs timer)
  // This ensures both players see the full 2-minute countdown
  if (room.clientsReady.size === 2) {
    startGameLoop(io, manager, room)
  } else {
    // Wait up to 10 seconds for clients (fallback: start anyway)
    const timeoutId = setTimeout(() => {
      startGameLoop(io, manager, room)
    }, 10000)
    room.trackTimeout(timeoutId)
  }
}

async function handleSlice(
  io: SocketIOServer,
  manager: RoomManager,
  room: GameRoom,
  playerId: string,
  data: { coinId: string; coinType: string; priceAtSlice: number }
): Promise<void> {
  room.removeCoin(data.coinId)

  // Handle gas immediately (penalty to slicer)
  if (data.coinType === 'gas') {
    const playerIds = room.getPlayerIds()
    const actualTransfer = transferFunds(
      room,
      playerIds.find((id) => id !== playerId)!,
      playerId,
      1
    )
    room.tugOfWar += playerId === playerIds[0] ? 1 : -1
    io.to(room.id).emit('player_hit', { playerId, damage: actualTransfer, reason: 'gas' })

    // CRITICAL: Check knockout immediately after gas penalty
    if (room.hasDeadPlayer()) {
      await checkGameOver(io, manager, room)
    }
    return
  }

  if (data.coinType === 'whale') {
    // Use pre-loaded leverage from Player object (synchronous - no race condition!)
    // Leverage is looked up once at match time, not per whale slice
    const player = room.players.get(playerId)
    const leverage = player?.leverage ?? 2

    room.activateWhale2X(playerId, leverage)
    io.to(room.id).emit('whale_2x_activated', {
      playerId,
      playerName: room.players.get(playerId)?.name || 'Unknown',
      durationMs: room.WHALE_2X_DURATION,
      multiplier: leverage, // Send actual leverage (2, 5, 10, 20)
    })
    io.to(room.id).emit('coin_sliced', {
      playerId,
      playerName: room.players.get(playerId)?.name,
      coinType: data.coinType,
    })
    return
  }

  if (!validateCoinType(data.coinType)) {
    return
  }

  // Determine if this player is player 1 (for tug-of-war calculation at settlement)
  const playerIds = room.getPlayerIds()
  const isPlayer1 = playerId === playerIds[0]

  // Store the 2x multiplier at order creation time (not settlement time)
  // This ensures orders placed during 2x window get 2x even if they settle after 2x expires
  const multiplier = room.get2XMultiplier(playerId)

  // CRITICAL: Use server price for order creation, ignore client value
  // This prevents price manipulation and ensures single source of truth
  const serverPrice = priceFeed.getLatestPrice()

  const order: PendingOrder = {
    id: `order-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
    playerId,
    playerName: room.players.get(playerId)?.name || 'Unknown',
    coinType: data.coinType,
    priceAtOrder: serverPrice, // Server price, not client-provided value
    settlesAt: Date.now() + ORDER_SETTLEMENT_DURATION_MS, // 5 seconds
    isPlayer1, // Stored at creation to avoid lookup issues at settlement
    multiplier, // Stored at creation - 2 if 2x was active when placed
  }

  room.addPendingOrder(order)

  // Emit order_placed event for client-side pending orders tracking
  io.to(room.id).emit('order_placed', {
    orderId: order.id,
    playerId: order.playerId,
    playerName: order.playerName,
    coinType: order.coinType,
    priceAtOrder: order.priceAtOrder,
    settlesAt: order.settlesAt,
  })

  io.to(room.id).emit('coin_sliced', {
    playerId,
    playerName: room.players.get(playerId)?.name,
    coinType: data.coinType,
  })

  const timeoutId = setTimeout(() => {
    if (room.isShutdown || room.getIsClosing()) return
    if (manager.hasRoom(room.id) && room.pendingOrders.has(order.id)) {
      settleOrder(io, room, order)
      checkGameOver(io, manager, room)
    }
  }, ORDER_SETTLEMENT_DURATION_MS)

  room.trackTimeout(timeoutId)
}

async function checkGameOver(
  io: SocketIOServer,
  manager: RoomManager,
  room: GameRoom
): Promise<void> {
  // Knockout ends the game immediately
  if (room.hasDeadPlayer()) {
    room.setClosing()

    // CRITICAL: Settle all pending orders first
    for (const [_orderId, order] of room.pendingOrders) {
      settleOrder(io, room, order)
    }

    // Get player IDs and references AFTER all settlements complete
    const playerIds = room.getPlayerIds()
    const p1 = room.players.get(playerIds[0])
    const p2 = room.players.get(playerIds[1])

    // Determine winner (player with more dollars)
    const winner = room.getWinner()

    // Emit game_over with knockout reason
    io.to(room.id).emit('game_over', {
      winnerId: winner?.id,
      winnerName: winner?.name,
      reason: 'knockout' as const,
      player1Dollars: p1?.dollars ?? GAME_CONFIG.STARTING_CASH,
      player2Dollars: p2?.dollars ?? GAME_CONFIG.STARTING_CASH,
    })

    // Clear clientsReady
    room.resetClientsReady()

    setTimeout(() => manager.deleteRoom(room.id), 1000)
    setTimeout(() => disconnectPriceFeedIfIdle(manager), 1100)
  }
}

// =============================================================================
// Main Export - Setup Game Events
// =============================================================================

export function setupGameEvents(io: SocketIOServer): {
  cleanup: () => void
  emergencyShutdown: () => void
} {
  // NOTE: Price feed is now lazy-loaded - connects when first game starts
  // See ensurePriceFeedConnected() and disconnectPriceFeedIfIdle()

  // Start settlement guard cleanup
  settlementGuard.start()

  const manager = new RoomManager()

  // Periodic cleanup of stale waiting players (tracked for cleanup)
  const cleanupInterval = setInterval(() => manager.cleanupStaleWaitingPlayers(), 30000)

  // Cleanup function for graceful shutdown
  const cleanup = () => {
    clearInterval(cleanupInterval)
    settlementGuard.stop()
    if (priceFeedConnected) {
      priceFeed.disconnect()
      priceFeedConnected = false
    }
  }

  // Emergency shutdown - settles all pending orders before closing
  const emergencyShutdown = () => {
    manager.emergencyShutdown(io)
  }

  io.on('connection', (socket: Socket) => {
    socket.on(
      'find_match',
      ({
        playerName,
        sceneWidth,
        sceneHeight,
        walletAddress,
        leverage,
      }: {
        playerName: string
        sceneWidth?: number
        sceneHeight?: number
        walletAddress?: string
        leverage?: number
      }) => {
        try {
          const validatedName = validatePlayerName(playerName)

          // Default dimensions if not provided
          const p1Width = sceneWidth || 500
          const p1Height = sceneHeight || 800
          const p1Wallet = walletAddress
          const p1Leverage = leverage ?? 2 // Default 2x

          // ADD TO POOL FIRST (before checking for opponents)
          // This ensures AUTO-MATCH players are visible in lobby briefly
          manager.addWaitingPlayer(socket.id, validatedName, p1Leverage)
          const waitingPlayer = manager.getWaitingPlayer(socket.id)
          if (waitingPlayer) {
            if (sceneWidth && sceneHeight) {
              waitingPlayer.sceneWidth = sceneWidth
              waitingPlayer.sceneHeight = sceneHeight
            }
            if (walletAddress) {
              waitingPlayer.walletAddress = walletAddress
            }
          }

          // Broadcast lobby update (now includes self, with leverage)
          const allWaitingPlayers = Array.from(manager.getWaitingPlayers().entries()).map(
            ([_id, player]) => ({
              socketId: player.socketId,
              name: player.name,
              joinedAt: player.joinedAt,
              leverage: player.leverage,
            })
          )
          io.emit('lobby_updated', { players: allWaitingPlayers })

          // NOW CHECK FOR OPPONENT (with SAME leverage)
          for (const [waitingId, waiting] of manager.getWaitingPlayers()) {
            if (waitingId !== socket.id) {
              // Only match players with the same leverage
              if (waiting.leverage !== p1Leverage) {
                continue
              }

              const waitingSocket = io.of('/').sockets.get(waitingId)
              if (waitingSocket?.connected && waitingSocket.id === waitingId) {
                const p2Width = waiting.sceneWidth || 500
                const p2Height = waiting.sceneHeight || 800
                const p2Wallet = waiting.walletAddress
                const p2Leverage = waiting.leverage

                // Await async channel creation
                createMatch(
                  io,
                  manager,
                  socket.id,
                  waitingId,
                  validatedName,
                  waiting.name,
                  p1Wallet,
                  p2Wallet,
                  p1Width,
                  p1Height,
                  p2Width,
                  p2Height,
                  p1Leverage,
                  p2Leverage
                ).catch((error) => {
                  console.error('[Match] Failed to create match:', error)
                })

                // Broadcast lobby update (both players removed after match)
                const remainingPlayers = Array.from(manager.getWaitingPlayers().entries())
                  .filter(([id]) => id !== socket.id && id !== waitingId)
                  .map(([_id, player]) => ({
                    socketId: player.socketId,
                    name: player.name,
                    joinedAt: player.joinedAt,
                    leverage: player.leverage,
                  }))
                io.emit('lobby_updated', { players: remainingPlayers })

                return
              }
            }
          }

          // No opponent found, already in pool from above
          socket.emit('waiting_for_match')
        } catch (error) {
          socket.emit('error', { message: 'Failed to find match' })
        }
      }
    )

    // Join waiting pool without immediately matching (for lobby view)
    socket.on(
      'join_waiting_pool',
      ({
        playerName,
        sceneWidth,
        sceneHeight,
        walletAddress,
        leverage,
      }: {
        playerName: string
        sceneWidth?: number
        sceneHeight?: number
        walletAddress?: string
        leverage?: number
      }) => {
        try {
          const validatedName = validatePlayerName(playerName)

          // Check if already in waiting pool
          if (manager.getWaitingPlayer(socket.id)) {
            socket.emit('already_in_pool')
            return
          }

          // Add player with leverage (default 2x if not provided)
          manager.addWaitingPlayer(socket.id, validatedName, leverage ?? 2)
          const waitingPlayer = manager.getWaitingPlayer(socket.id)
          if (waitingPlayer) {
            if (sceneWidth && sceneHeight) {
              waitingPlayer.sceneWidth = sceneWidth
              waitingPlayer.sceneHeight = sceneHeight
            }
            if (walletAddress) {
              waitingPlayer.walletAddress = walletAddress
            }
          }

          // Broadcast lobby update to all connected clients (include leverage)
          const allWaitingPlayers = Array.from(manager.getWaitingPlayers().entries()).map(
            ([_id, player]) => ({
              socketId: player.socketId,
              name: player.name,
              joinedAt: player.joinedAt,
              leverage: player.leverage,
            })
          )
          io.emit('lobby_updated', { players: allWaitingPlayers })

          socket.emit('joined_waiting_pool')
        } catch (error) {
          socket.emit('error', { message: 'Failed to join waiting pool' })
        }
      }
    )

    // Leave waiting pool (when exiting lobby view)
    socket.on('leave_waiting_pool', () => {
      manager.removeWaitingPlayer(socket.id)

      // Broadcast lobby update to all connected clients (include leverage)
      const allWaitingPlayers = Array.from(manager.getWaitingPlayers().entries()).map(
        ([_id, player]) => ({
          socketId: player.socketId,
          name: player.name,
          joinedAt: player.joinedAt,
          leverage: player.leverage,
        })
      )
      io.emit('lobby_updated', { players: allWaitingPlayers })
    })

    // Client signals Phaser scene is ready (syncs timer for both players)
    socket.on('scene_ready', () => {
      const roomId = manager.getPlayerRoomId(socket.id)
      if (!roomId) return

      const room = manager.getRoom(roomId)
      if (!room) return

      // Mark this client as ready
      const bothReady = room.markClientReady(socket.id)

      // If both clients are ready, start the game loop
      if (bothReady) {
        startGameLoop(io, manager, room)
      }
    })

    socket.on(
      'slice_coin',
      async (data: { coinId: string; coinType: string; priceAtSlice: number }) => {
        try {
          const roomId = manager.getPlayerRoomId(socket.id)
          if (!roomId) return

          const room = manager.getRoom(roomId)
          if (!room) {
            manager.removePlayerFromRoom(socket.id)
            return
          }

          await handleSlice(io, manager, room, socket.id, data)
        } catch (error) {
          socket.emit('error', { message: 'Failed to slice coin' })
        }
      }
    )

    // Get list of waiting players for lobby
    socket.on('get_lobby_players', () => {
      const players = Array.from(manager.getWaitingPlayers().entries())
        .filter(([id]) => id !== socket.id)
        .map(([_id, player]) => ({
          socketId: player.socketId,
          name: player.name,
          joinedAt: player.joinedAt,
          leverage: player.leverage,
        }))
      socket.emit('lobby_players', players)
    })

    // Manually select an opponent
    socket.on('select_opponent', ({ opponentSocketId }: { opponentSocketId: string }) => {
      const opponent = manager.getWaitingPlayer(opponentSocketId)
      if (!opponent) {
        socket.emit('error', { message: 'Opponent no longer available' })
        return
      }

      const localPlayer = manager.getWaitingPlayer(socket.id)
      if (!localPlayer) {
        socket.emit('error', { message: 'You must join waiting pool first' })
        return
      }

      // Only allow selecting opponents with the same leverage
      if (localPlayer.leverage !== opponent.leverage) {
        socket.emit('error', { message: 'Cannot match: different leverage settings' })
        return
      }

      const opponentSocket = io.of('/').sockets.get(opponentSocketId)
      if (!opponentSocket?.connected) {
        socket.emit('error', { message: 'Opponent disconnected' })
        manager.removeWaitingPlayer(opponentSocketId)
        return
      }

      createMatch(
        io,
        manager,
        socket.id,
        opponentSocketId,
        localPlayer.name,
        opponent.name,
        localPlayer.walletAddress,
        opponent.walletAddress,
        localPlayer.sceneWidth || 500,
        localPlayer.sceneHeight || 800,
        opponent.sceneWidth || 500,
        opponent.sceneHeight || 800,
        localPlayer.leverage,
        opponent.leverage
      ).catch((error) => {
        console.error('[Match] Failed to create selected match:', error)
        socket.emit('error', { message: 'Failed to start match' })
      })
    })

    socket.on('disconnect', () => {
      manager.removeWaitingPlayer(socket.id)

      // Broadcast lobby update after player leaves (include leverage)
      const allWaitingPlayers = Array.from(manager.getWaitingPlayers().entries()).map(
        ([_id, player]) => ({
          socketId: player.socketId,
          name: player.name,
          joinedAt: player.joinedAt,
          leverage: player.leverage,
        })
      )
      io.emit('lobby_updated', { players: allWaitingPlayers })

      const roomId = manager.getPlayerRoomId(socket.id)
      if (roomId) {
        const room = manager.getRoom(roomId)
        if (room?.hasPlayer(socket.id)) {
          io.to(roomId).emit('opponent_disconnected')

          if (room.pendingOrders.size === 0) {
            setTimeout(() => manager.deleteRoom(roomId), 5000)
            setTimeout(() => disconnectPriceFeedIfIdle(manager), 5100)
          }
        }
      }
    })
  })

  return { cleanup, emergencyShutdown }
}

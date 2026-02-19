import { Player } from '@/game/types/trading'
import { GAME_CONFIG } from '@/game/constants'
import { CoinSequence } from './CoinSequence'
import type { Coin, PendingOrder } from './types'

/**
 * GameRoom - Encapsulates room state and lifecycle.
 *
 * Manages players, coins, orders, timers, and game state.
 * Includes timer tracking for proper cleanup to prevent memory leaks.
 */
export class GameRoom {
  readonly id: string
  readonly players: Map<string, Player>
  readonly coins: Map<string, Coin>
  readonly pendingOrders: Map<string, PendingOrder>
  tugOfWar = 0
  private isClosing = false
  isShutdown = false // Prevents settlement timeouts from operating on deleted rooms

  private intervals = new Set<NodeJS.Timeout>()
  private timeouts = new Set<NodeJS.Timeout>()

  // Fruit Ninja-style spawn mechanics
  readonly gameStartTime: number
  readonly GAME_DURATION = GAME_CONFIG.GAME_DURATION_MS // 2.5 minutes (150000ms)

  // Deterministic coin sequence
  private coinSequence: CoinSequence | null = null

  // Per-player leverage (manually controlled via HUD)
  private playerLeverage = new Map<string, number>()

  // Wallet addresses for ENS leverage lookups
  player1Address: `0x${string}` | null = null
  player2Address: `0x${string}` | null = null
  addressToSocketId: Map<string, string> = new Map()

  // Client ready tracking
  clientsReady = new Set<string>()

  // Track if game loop is active
  gameLoopActive = false

  // Game timeout tracker
  gameTimeout: NodeJS.Timeout | null = null

  constructor(roomId: string) {
    this.id = roomId
    this.players = new Map()
    this.coins = new Map()
    this.pendingOrders = new Map()
    this.gameStartTime = Date.now()
  }

  // Set player's leverage (called from HUD selector)
  setPlayerLeverage(playerId: string, leverage: number): void {
    this.playerLeverage.set(playerId, leverage)
    // Also update the player object
    const player = this.players.get(playerId)
    if (player) {
      player.leverage = leverage
    }
  }

  // Get player's current leverage (defaults to 2x)
  getLeverageForPlayer(playerId: string): number {
    return this.playerLeverage.get(playerId) ?? 2
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
    // Initialize leverage tracking
    this.playerLeverage.set(id, leverage)
  }

  removePlayer(id: string): void {
    this.players.delete(id)
    this.playerLeverage.delete(id)
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

    if (this.gameTimeout) {
      clearTimeout(this.gameTimeout)
      this.gameTimeout = null
    }
  }

  // Mark client as ready and return if both clients are ready
  markClientReady(socketId: string): boolean {
    if (this.clientsReady.has(socketId)) {
      return this.clientsReady.size === 2
    }
    this.clientsReady.add(socketId)
    return this.clientsReady.size === 2
  }

  // Reset client ready state for next round
  resetClientsReady(): void {
    this.clientsReady.clear()
  }

  // Find winner (highest dollars, or first if tied)
  getWinner(): Player | undefined {
    const players = Array.from(this.players.values())
    if (players.length === 0) return undefined
    return players.reduce((a, b) => (a.dollars > b.dollars ? a : b), players[0])
  }

  // Check if any player is dead
  hasDeadPlayer(): boolean {
    return Array.from(this.players.values()).some((p) => p.dollars <= 0)
  }

  getIsClosing(): boolean {
    return this.isClosing
  }

  setClosing(): void {
    this.isClosing = true
  }

  // Wave-based spawn intensity (scaled for 150s game)
  getSpawnInterval(elapsedMs: number = 0): { minMs: number; maxMs: number; burstChance: number } {
    const waves = [
      { endMs: 30000, intervalMs: { min: 1500, max: 2000 }, burstChance: 0.08 }, // Warmup (0-30s)
      { endMs: 60000, intervalMs: { min: 1400, max: 1800 }, burstChance: 0.12 }, // Early (30-60s)
      { endMs: 90000, intervalMs: { min: 1200, max: 1600 }, burstChance: 0.18 }, // Mid (60-90s)
      { endMs: 120000, intervalMs: { min: 1000, max: 1400 }, burstChance: 0.25 }, // Late (90-120s)
      { endMs: 150000, intervalMs: { min: 800, max: 1200 }, burstChance: 0.35 }, // Climax (120-150s)
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

    const last = waves[waves.length - 1]
    return { minMs: last.intervalMs.min, maxMs: last.intervalMs.max, burstChance: last.burstChance }
  }

  // Initialize deterministic coin sequence for the game
  initCoinSequence(): void {
    const seed = this.hashString(this.id)
    const spawnConfig = this.getSpawnInterval(0)
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

  // Get next coin from deterministic sequence
  getNextCoinData(): { type: 'call' | 'put'; xNormalized: number } | null {
    return this.coinSequence?.next() ?? null
  }

  // Peek at next coin without consuming it
  peekNextCoinData(): { type: 'call' | 'put'; xNormalized: number } | null {
    return this.coinSequence?.peek() ?? null
  }
}

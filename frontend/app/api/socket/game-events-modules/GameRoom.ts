import { Player, RoundSummary } from '@/game/types/trading'
import { GAME_CONFIG } from '@/game/constants'
import { CoinSequence } from './CoinSequence'
import type { Coin, PendingOrder } from './types'

/**
 * GameRoom - Encapsulates room state and lifecycle.
 *
 * Manages players, coins, orders, timers, and round-based game state.
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
  readonly GAME_DURATION = 180000 // 3 minutes (legacy, not used in round-based play)

  // Round-based game state
  currentRound: number = 0 // Starts at 0, startNewRound() increments to 1 before first round
  player1Wins: number = 0
  player2Wins: number = 0
  player1CashAtRoundStart: number = GAME_CONFIG.STARTING_CASH
  player2CashAtRoundStart: number = GAME_CONFIG.STARTING_CASH
  isSuddenDeath: boolean = false
  readonly ROUND_DURATION = GAME_CONFIG.ROUND_DURATION_MS // 30 seconds

  // Deterministic coin sequence
  private coinSequence: CoinSequence | null = null

  // Round history for game over summary
  roundHistory: RoundSummary[] = []

  // Per-player 2X mode tracking (whale power-up)
  private whale2XData = new Map<string, { expiresAt: number; multiplier: number }>()
  readonly WHALE_2X_DURATION = 10000 // 10 seconds

  // Cache player leverage from ENS (for whale power-up)
  private playerLeverageCache = new Map<string, number>()

  // Wallet addresses for ENS leverage lookups
  player1Address: `0x${string}` | null = null
  player2Address: `0x${string}` | null = null
  addressToSocketId: Map<string, string> = new Map()

  // Client ready tracking
  clientsReady = new Set<string>()

  // Track if game loop is active
  gameLoopActive = false

  // Round timeout tracker
  roundTimeout: NodeJS.Timeout | null = null

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
    if (!data) return 1
    if (Date.now() > data.expiresAt) {
      this.whale2XData.delete(playerId)
      return 1
    }
    return data.multiplier
  }

  // Get player's leverage
  async getPlayerLeverage(playerId: string): Promise<number> {
    if (this.playerLeverageCache.has(playerId)) {
      return this.playerLeverageCache.get(playerId)!
    }
    const leverage = 2 // Default to 2x
    this.playerLeverageCache.set(playerId, leverage)
    return leverage
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

    if (this.roundTimeout) {
      clearTimeout(this.roundTimeout)
      this.roundTimeout = null
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

  // =============================================================================
  // Round Management Methods
  // =============================================================================

  startNewRound(): void {
    this.currentRound++
    const playerIds = this.getPlayerIds()
    const p1 = this.players.get(playerIds[0])
    const p2 = this.players.get(playerIds[1])

    if (p1 && p2) {
      const total = p1.dollars + p2.dollars
      if (total !== GAME_CONFIG.STARTING_CASH * 2) {
        console.error('[GameRoom] Cash validation failed:', {
          total,
          expected: GAME_CONFIG.STARTING_CASH * 2,
          p1: p1.dollars,
          p2: p2.dollars,
        })
      }
    }

    this.player1CashAtRoundStart = p1?.dollars || GAME_CONFIG.STARTING_CASH
    this.player2CashAtRoundStart = p2?.dollars || GAME_CONFIG.STARTING_CASH
  }

  getRoundWinner(): { winnerId: string | null; isTie: boolean } {
    const playerIds = this.getPlayerIds()
    const p1 = this.players.get(playerIds[0])
    const p2 = this.players.get(playerIds[1])

    if (!p1 || !p2) return { winnerId: null, isTie: false }

    const p1Gained = p1.dollars - this.player1CashAtRoundStart
    const p2Gained = p2.dollars - this.player2CashAtRoundStart

    if (p1Gained > 0 && p2Gained <= 0) return { winnerId: playerIds[0], isTie: false }
    if (p2Gained > 0 && p1Gained <= 0) return { winnerId: playerIds[1], isTie: false }
    if (p1Gained > p2Gained) return { winnerId: playerIds[0], isTie: false }
    if (p2Gained > p1Gained) return { winnerId: playerIds[1], isTie: false }

    return { winnerId: null, isTie: true }
  }

  checkGameEndCondition(): boolean {
    if (this.isSuddenDeath) {
      return this.player1Wins !== this.player2Wins || this.currentRound >= 3
    }
    return this.currentRound >= 3
  }

  getGameWinner(): { winner: Player | undefined; reason: 'wins' | 'dollars' | 'knockout' } {
    const playerIds = this.getPlayerIds()
    const p1 = this.players.get(playerIds[0])
    const p2 = this.players.get(playerIds[1])

    if (!p1 || !p2) return { winner: undefined, reason: 'wins' }

    if (p1.dollars > p2.dollars) return { winner: p1, reason: 'dollars' }
    if (p2.dollars > p1.dollars) return { winner: p2, reason: 'dollars' }

    if (this.player1Wins > this.player2Wins) return { winner: p1, reason: 'wins' }
    if (this.player2Wins > this.player1Wins) return { winner: p2, reason: 'wins' }

    return { winner: undefined, reason: 'wins' }
  }

  getIsClosing(): boolean {
    return this.isClosing
  }

  setClosing(): void {
    this.isClosing = true
  }

  // Wave-based spawn intensity
  getSpawnInterval(elapsedMs: number = 0): { minMs: number; maxMs: number; burstChance: number } {
    const waves = [
      { endMs: 10000, intervalMs: { min: 1200, max: 1800 }, burstChance: 0.1 },
      { endMs: 20000, intervalMs: { min: 1400, max: 1800 }, burstChance: 0.15 },
      { endMs: 27000, intervalMs: { min: 1000, max: 1400 }, burstChance: 0.25 },
      { endMs: 30000, intervalMs: { min: 700, max: 1100 }, burstChance: 0.4 },
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

  // Initialize deterministic coin sequence for this round
  initCoinSequence(): void {
    const seed = this.hashString(`${this.id}-round${this.currentRound}`)
    const spawnConfig = this.getSpawnInterval(0)
    this.coinSequence = new CoinSequence(
      this.ROUND_DURATION,
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
  getNextCoinData(): { type: 'call' | 'put' | 'gas' | 'whale'; xNormalized: number } | null {
    return this.coinSequence?.next() ?? null
  }

  // Peek at next coin without consuming it
  peekNextCoinData(): { type: 'call' | 'put' | 'gas' | 'whale'; xNormalized: number } | null {
    return this.coinSequence?.peek() ?? null
  }
}

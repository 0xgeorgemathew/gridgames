import { Player } from '@/games/hyper-swiper/game/types/trading'
import { GAME_CONFIG } from '@/games/hyper-swiper/game/constants'
import { CoinSequence } from './CoinSequence'
import type { Coin, OpenPosition, PositionSettlementResult } from './types'

interface ActiveCoinEntry {
  id: string
  type: 'long' | 'short'
  spawnedAt: number
}

const COIN_TTL_MS = 3000
const MAX_ACTIVE_COINS = 3

export class GameRoom {
  readonly id: string
  readonly players: Map<string, Player>
  readonly coins: Map<string, Coin>
  readonly openPositions: Map<string, OpenPosition>
  readonly closedPositions: PositionSettlementResult[]
  private isClosing = false
  isShutdown = false

  private intervals = new Set<NodeJS.Timeout>()
  private timeouts = new Set<NodeJS.Timeout>()

  readonly gameStartTime: number
  readonly GAME_DURATION: number

  private coinSequence: CoinSequence | null = null

  private playerLeverage = new Map<string, number>()

  player1Address: `0x${string}` | null = null
  player2Address: `0x${string}` | null = null
  addressToSocketId: Map<string, string> = new Map()

  clientsReady = new Set<string>()

  gameLoopActive = false

  gameTimeout: NodeJS.Timeout | null = null

  private activeCoins: Map<string, ActiveCoinEntry> = new Map()

  constructor(roomId: string, gameDuration: number = 60000) {
    this.id = roomId
    this.players = new Map()
    this.coins = new Map()
    this.openPositions = new Map()
    this.closedPositions = []
    this.gameStartTime = Date.now()
    this.GAME_DURATION = gameDuration
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

  // Get player's current leverage (defaults to 500x)
  getLeverageForPlayer(playerId: string): number {
    return this.playerLeverage.get(playerId) ?? 500
  }

  // Helper to get wallet address for player
  getWalletAddressPublic(playerId: string): string | undefined {
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
    leverage: number = 500
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

  addOpenPosition(position: OpenPosition): void {
    this.openPositions.set(position.id, position)
  }

  removeOpenPosition(positionId: string): void {
    this.openPositions.delete(positionId)
  }

  addClosedPosition(settlement: PositionSettlementResult): void {
    this.closedPositions.push(settlement)
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

  // Heartbeat interval for rhythmic spawning (scales down over game duration)
  getSpawnInterval(elapsedMs: number = 0): { minMs: number; maxMs: number; burstChance: number } {
    const interval = this.getHeartbeatInterval(elapsedMs)
    return { minMs: interval, maxMs: interval, burstChance: 0 }
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
  getNextCoinData(forceType?: 'long' | 'short'): {
    type: 'long' | 'short'
    xNormalized: number
    velocityX: number
    velocityY: number
  } | null {
    return this.coinSequence?.next(forceType) ?? null
  }

  // Peek at next coin without consuming it
  peekNextCoinData(): {
    type: 'long' | 'short'
    xNormalized: number
    velocityX: number
    velocityY: number
  } | null {
    return this.coinSequence?.peek() ?? null
  }

  // Get current sequence index for coin sync validation
  getCoinSequenceIndex(): number {
    return this.coinSequence?.getIndex() ?? -1
  }

  addActiveCoin(id: string, type: 'long' | 'short'): void {
    this.activeCoins.set(id, {
      id,
      type,
      spawnedAt: Date.now(),
    })
  }

  removeActiveCoin(id: string): void {
    this.activeCoins.delete(id)
  }

  getActiveCoinCount(): number {
    return this.activeCoins.size
  }

  getActiveLongCount(): number {
    let count = 0
    for (const coin of this.activeCoins.values()) {
      if (coin.type === 'long') count++
    }
    return count
  }

  getActiveShortCount(): number {
    let count = 0
    for (const coin of this.activeCoins.values()) {
      if (coin.type === 'short') count++
    }
    return count
  }

  expireOldCoins(): string[] {
    const now = Date.now()
    const expiredIds: string[] = []
    for (const [id, entry] of this.activeCoins) {
      if (now - entry.spawnedAt > COIN_TTL_MS) {
        expiredIds.push(id)
        this.activeCoins.delete(id)
      }
    }
    return expiredIds
  }

  canSpawnCoin(): boolean {
    return this.activeCoins.size < MAX_ACTIVE_COINS
  }

  getRequiredCoinType(): 'long' | 'short' | null {
    const longCount = this.getActiveLongCount()
    const shortCount = this.getActiveShortCount()
    if (longCount === 0 && shortCount > 0) return 'long'
    if (shortCount === 0 && longCount > 0) return 'short'
    return null
  }

  getHeartbeatInterval(elapsedMs: number = 0): number {
    if (elapsedMs < 30000) return 1200
    if (elapsedMs < 60000) return 1100
    if (elapsedMs < 90000) return 1000
    if (elapsedMs < 120000) return 950
    return 900
  }
}

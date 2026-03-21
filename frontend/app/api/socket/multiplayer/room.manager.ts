import type { Player } from './events.types'
import { SERVER_GAME_CONFIG as CFG } from './game.config'
import { CoinSequence } from './coin-sequence.server'
import type { Coin, OpenPosition, PositionSettlementResult } from './events.types'
import type { MatchStatus, MatchPlayer, ReadyState, FundingState } from '@/domains/match/types'
import { MatchStateMachine, createMatchState } from './match-state.server'
import { MatchActionLog, createMatchLog } from './match-log.server'

interface ActiveCoinEntry {
  id: string
  type: 'long' | 'short'
  spawnedAt: number
}

export class GameRoom {
  readonly id: string
  readonly players: Map<string, Player>
  readonly coins: Map<string, Coin>

  // =============================================================================
  // LEGACY TRADING STATE (deprecated - will be removed in Phase 6)
  // =============================================================================
  /** @deprecated Use matchStateMachine instead */
  readonly openPositions: Map<string, OpenPosition>
  /** @deprecated Use matchStateMachine instead */
  readonly closedPositions: PositionSettlementResult[]
  /** @deprecated Not used in zero-sum matches */
  private playerLeverage = new Map<string, number>()

  private isClosing = false
  isShutdown = false

  private intervals = new Set<NodeJS.Timeout>()
  private timeouts = new Set<NodeJS.Timeout>()

  readonly gameStartTime: number
  readonly GAME_DURATION: number

  private coinSequence: CoinSequence | null = null

  player1Address: `0x${string}` | null = null
  player2Address: `0x${string}` | null = null
  addressToSocketId: Map<string, string> = new Map()

  clientsReady = new Set<string>()

  gameLoopActive = false

  gameTimeout: NodeJS.Timeout | null = null

  private activeCoins: Map<string, ActiveCoinEntry> = new Map()

  // =============================================================================
  // NEW MATCH STATE (Phase 2)
  // =============================================================================
  /** Match state machine for lifecycle management */
  readonly matchStateMachine: MatchStateMachine

  /** Action log for authoritative game actions */
  readonly matchActionLog: MatchActionLog

  /** Resolved match outcome (set when match ends) */
  resolvedOutcome: import('@/domains/match/types').ResolvedMatchOutcome | null = null

  /** Result artifact (set when match ends) */
  resultArtifact: import('@/domains/match/types').ResultArtifact | null = null

  constructor(roomId: string, gameDuration: number = 60000) {
    this.id = roomId
    this.players = new Map()
    this.coins = new Map()
    this.openPositions = new Map()
    this.closedPositions = []
    this.gameStartTime = Date.now()
    this.GAME_DURATION = gameDuration

    // Initialize match state machine and action log
    this.matchStateMachine = createMatchState(roomId, gameDuration)
    this.matchActionLog = createMatchLog(roomId)
  }

  setPlayerLeverage(playerId: string, leverage: number): void {
    this.playerLeverage.set(playerId, leverage)
    const player = this.players.get(playerId)
    if (player) {
      player.leverage = leverage
    }
  }

  getLeverageForPlayer(playerId: string): number {
    return this.playerLeverage.get(playerId) ?? CFG.FIXED_LEVERAGE
  }

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
    leverage: number = CFG.FIXED_LEVERAGE
  ): void {
    this.players.set(id, {
      id,
      name,
      dollars: CFG.STARTING_BALANCE,
      score: 0,
      sceneWidth,
      sceneHeight,
      leverage,
    })
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

  trackTimeout(timeout: NodeJS.Timeout): void {
    this.timeouts.add(timeout)
  }

  trackInterval(interval: NodeJS.Timeout): void {
    this.intervals.add(interval)
  }

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

  markClientReady(socketId: string): boolean {
    if (this.clientsReady.has(socketId)) {
      return this.clientsReady.size === 2
    }
    this.clientsReady.add(socketId)
    return this.clientsReady.size === 2
  }

  resetClientsReady(): void {
    this.clientsReady.clear()
  }

  getWinner(): Player | undefined {
    const players = Array.from(this.players.values())
    if (players.length === 0) return undefined
    return players.reduce((a, b) => (a.dollars > b.dollars ? a : b), players[0])
  }

  hasDeadPlayer(): boolean {
    return Array.from(this.players.values()).some((p) => p.dollars <= 0)
  }

  getIsClosing(): boolean {
    return this.isClosing
  }

  setClosing(): void {
    this.isClosing = true
  }

  getSpawnInterval(elapsedMs: number = 0): { minMs: number; maxMs: number; burstChance: number } {
    const interval = this.getHeartbeatInterval(elapsedMs)
    return { minMs: interval, maxMs: interval, burstChance: 0 }
  }

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

  private hashString(str: string): number {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash
    }
    return Math.abs(hash)
  }

  getNextCoinData(forceType?: 'long' | 'short'): {
    type: 'long' | 'short'
    xNormalized: number
    velocityX: number
    velocityY: number
  } | null {
    return this.coinSequence?.next(forceType) ?? null
  }

  peekNextCoinData(): {
    type: 'long' | 'short'
    xNormalized: number
    velocityX: number
    velocityY: number
  } | null {
    return this.coinSequence?.peek() ?? null
  }

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
      if (now - entry.spawnedAt > CFG.COIN_TTL_MS) {
        expiredIds.push(id)
        this.activeCoins.delete(id)
      }
    }
    return expiredIds
  }

  expireCoin(coinId: string): void {
    this.activeCoins.delete(coinId)
  }

  canSpawnCoin(): boolean {
    const totalCoins = this.getActiveCoinCount()
    // Only spawn if total active coins is below max
    return totalCoins < CFG.MAX_ACTIVE_COINS
  }

  getRequiredCoinType(): 'long' | 'short' | null {
    const longCount = this.getActiveLongCount()
    const shortCount = this.getActiveShortCount()

    // If one type is at 2 and the other isn't, prioritize the missing type
    if (longCount < 2 && shortCount >= 2) return 'long'
    if (shortCount < 2 && longCount >= 2) return 'short'

    // If both types under 2, spawn randomly (no force)
    return null
  }

  getHeartbeatInterval(elapsedMs: number = 0): number {
    const intervals = CFG.COIN_SPAWN_INTERVALS_MS
    if (elapsedMs < 30000) return intervals[0]
    if (elapsedMs < 60000) return intervals[1]
    if (elapsedMs < 90000) return intervals[2]
    if (elapsedMs < 120000) return intervals[3]
    return intervals[4]
  }

  // =============================================================================
  // MATCH LIFECYCLE METHODS (Phase 2)
  // =============================================================================

  /**
   * Get current match status
   */
  getMatchStatus(): MatchStatus {
    return this.matchStateMachine.getStatus()
  }

  /**
   * Transition match to a new status
   */
  transitionMatchStatus(
    to: MatchStatus,
    reason?: { abortReason?: 'player_disconnect' | 'timeout' | 'error'; affectedPlayerId?: string }
  ): boolean {
    return this.matchStateMachine.transition(to, reason)
  }

  /**
   * Add a match player (uses new match types)
   */
  addMatchPlayer(player: MatchPlayer): void {
    this.matchStateMachine.addPlayer(player)
  }

  /**
   * Set player ready state
   */
  setPlayerReadyState(playerId: string, readyState: ReadyState): boolean {
    return this.matchStateMachine.setPlayerReadyState(playerId, readyState)
  }

  /**
   * Set player funding state
   */
  setPlayerFundingState(playerId: string, fundingState: FundingState): boolean {
    return this.matchStateMachine.setPlayerFundingState(playerId, fundingState)
  }

  /**
   * Check if all players are ready
   */
  areAllPlayersReady(): boolean {
    return this.matchStateMachine.areAllPlayersReady()
  }

  /**
   * Check if all players have funding confirmed
   */
  areAllPlayersFunded(): boolean {
    return this.matchStateMachine.areAllPlayersFunded()
  }

  /**
   * Append a gameplay action to the action log
   */
  appendMatchAction<GameAction>(playerId: string, action: GameAction): number {
    return this.matchActionLog.append(playerId, action)
  }

  /**
   * Get match state version
   */
  getMatchStateVersion(): number {
    return this.matchStateMachine.getStateVersion()
  }

  /**
   * Check if match is in a terminal state
   */
  isMatchTerminal(): boolean {
    return this.matchStateMachine.isTerminal()
  }

  /**
   * Check if match can accept gameplay actions
   */
  canAcceptMatchActions(): boolean {
    return this.matchStateMachine.canAcceptActions()
  }
}

// =============================================================================
// MATCH STATE MACHINE
// Server-side match lifecycle management
// =============================================================================

import type { MatchStatus, MatchPlayer, ReadyState, FundingState } from '@/domains/match/types'

/**
 * Match state machine states
 * - waiting -> funding (players matched)
 * - funding -> ready (funding confirmed)
 * - ready -> in_progress (game start)
 * - in_progress -> result_ready (game end)
 * - result_ready -> settlement_pending (handoff started)
 * - settlement_pending -> settled (handoff complete)
 * - Any pre-result state -> aborted (disconnect/error)
 */
export type MatchStateTransition =
  | { from: 'waiting'; to: 'funding' }
  | { from: 'funding'; to: 'ready' }
  | { from: 'ready'; to: 'in_progress' }
  | { from: 'in_progress'; to: 'result_ready' }
  | { from: 'result_ready'; to: 'settlement_pending' }
  | { from: 'settlement_pending'; to: 'settled' }
  | { from: 'waiting' | 'funding' | 'ready' | 'in_progress'; to: 'aborted' }

/**
 * Valid transitions for each state
 */
const VALID_TRANSITIONS: Record<MatchStatus, MatchStatus[]> = {
  waiting: ['funding', 'aborted'],
  funding: ['ready', 'aborted'],
  ready: ['in_progress', 'aborted'],
  in_progress: ['result_ready', 'aborted'],
  result_ready: ['settlement_pending', 'aborted'],
  settlement_pending: ['settled', 'aborted'],
  settled: [],
  aborted: [],
}

/**
 * Server-side match state
 */
export interface ServerMatchState {
  matchId: string
  status: MatchStatus
  stateVersion: number
  players: Map<string, MatchPlayer>
  gameDuration: number
  createdAt: number
  updatedAt: number

  // Game-specific state (set by game reducers)
  gameState: unknown

  // Abort tracking
  abortReason?: 'player_disconnect' | 'timeout' | 'error'
  affectedPlayerId?: string
}

/**
 * Match state machine manager
 */
export class MatchStateMachine {
  private state: ServerMatchState
  private transitionLog: Array<{
    from: MatchStatus
    to: MatchStatus
    timestamp: number
    stateVersion: number
  }> = []

  constructor(matchId: string, gameDuration: number) {
    this.state = {
      matchId,
      status: 'waiting',
      stateVersion: 0,
      players: new Map(),
      gameDuration,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      gameState: null,
    }
  }

  /**
   * Get current match state
   */
  getState(): Readonly<ServerMatchState> {
    return this.state
  }

  /**
   * Get current status
   */
  getStatus(): MatchStatus {
    return this.state.status
  }

  /**
   * Get state version (increments on every state change)
   */
  getStateVersion(): number {
    return this.state.stateVersion
  }

  /**
   * Attempt to transition to a new status
   * Returns true if transition was valid and applied
   */
  transition(
    to: MatchStatus,
    reason?: { abortReason?: 'player_disconnect' | 'timeout' | 'error'; affectedPlayerId?: string }
  ): boolean {
    const from = this.state.status

    // Check if transition is valid
    if (!VALID_TRANSITIONS[from].includes(to)) {
      console.warn(`[MatchStateMachine] Invalid transition: ${from} -> ${to}`)
      return false
    }

    // Apply transition
    const previousVersion = this.state.stateVersion
    this.state.status = to
    this.state.stateVersion++
    this.state.updatedAt = Date.now()

    // Track abort info
    if (to === 'aborted' && reason) {
      this.state.abortReason = reason.abortReason
      this.state.affectedPlayerId = reason.affectedPlayerId
    }

    // Log transition
    this.transitionLog.push({
      from,
      to,
      timestamp: this.state.updatedAt,
      stateVersion: this.state.stateVersion,
    })

    console.log(
      `[MatchStateMachine] ${this.state.matchId}: ${from} -> ${to} (v${previousVersion} -> v${this.state.stateVersion})`
    )

    return true
  }

  /**
   * Add a player to the match
   */
  addPlayer(player: MatchPlayer): void {
    this.state.players.set(player.id, player)
    this.state.updatedAt = Date.now()
    this.state.stateVersion++
  }

  /**
   * Update a player's ready state
   */
  setPlayerReadyState(playerId: string, readyState: ReadyState): boolean {
    const player = this.state.players.get(playerId)
    if (!player) return false

    player.readyState = readyState
    this.state.updatedAt = Date.now()
    this.state.stateVersion++
    return true
  }

  /**
   * Update a player's funding state
   */
  setPlayerFundingState(playerId: string, fundingState: FundingState): boolean {
    const player = this.state.players.get(playerId)
    if (!player) return false

    player.fundingState = fundingState
    this.state.updatedAt = Date.now()
    this.state.stateVersion++
    return true
  }

  /**
   * Check if all players are ready
   */
  areAllPlayersReady(): boolean {
    for (const player of this.state.players.values()) {
      if (player.readyState !== 'ready') return false
    }
    return this.state.players.size === 2
  }

  /**
   * Check if all players have funding confirmed
   */
  areAllPlayersFunded(): boolean {
    for (const player of this.state.players.values()) {
      if (player.fundingState !== 'ready') return false
    }
    return this.state.players.size === 2
  }

  /**
   * Update game-specific state
   */
  setGameState(gameState: unknown): void {
    this.state.gameState = gameState
    this.state.updatedAt = Date.now()
    this.state.stateVersion++
  }

  /**
   * Get transition log for debugging
   */
  getTransitionLog(): ReadonlyArray<{
    from: MatchStatus
    to: MatchStatus
    timestamp: number
    stateVersion: number
  }> {
    return this.transitionLog
  }

  /**
   * Check if match is in a terminal state
   */
  isTerminal(): boolean {
    return this.state.status === 'settled' || this.state.status === 'aborted'
  }

  /**
   * Check if match is active (in progress)
   */
  isActive(): boolean {
    return this.state.status === 'in_progress'
  }

  /**
   * Check if match can accept gameplay actions
   */
  canAcceptActions(): boolean {
    return this.state.status === 'in_progress'
  }
}

/**
 * Create a new match state machine
 */
export function createMatchState(matchId: string, gameDuration: number): MatchStateMachine {
  console.log(`[MatchStateMachine] Creating match ${matchId} with duration ${gameDuration}ms`)
  return new MatchStateMachine(matchId, gameDuration)
}

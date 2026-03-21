// =============================================================================
// MATCH DOMAIN TYPES
// Shared types for zero-sum winner-takes-all match lifecycle
// =============================================================================

/**
 * Unique identifier for a match
 */
export type MatchId = string

/**
 * Match lifecycle status
 * State machine: waiting -> funding -> ready -> in_progress -> result_ready -> settlement_pending -> settled
 * Can also go to: aborted from any pre-result state
 */
export type MatchStatus =
  | 'waiting' // Waiting for players to join
  | 'funding' // Checking funding readiness
  | 'ready' // Players ready, waiting for game start
  | 'in_progress' // Game actively being played
  | 'result_ready' // Game finished, outcome determined
  | 'settlement_pending' // Settlement handoff in progress
  | 'settled' // Settlement complete
  | 'aborted' // Match cancelled (disconnect, error, etc.)

/**
 * Player readiness state for match start
 */
export type ReadyState = 'not_ready' | 'ready' | 'disconnected'

/**
 * Player funding state for pre-match checks
 */
export type FundingState = 'not_ready' | 'checking' | 'ready' | 'blocked'

/**
 * Player in a match
 */
export interface MatchPlayer {
  id: string
  name: string
  socketId: string
  walletAddress?: string
  readyState: ReadyState
  fundingState: FundingState
  sceneWidth: number
  sceneHeight: number
}

/**
 * Authoritative action from server
 * All gameplay actions flow through this envelope
 */
export interface AuthoritativeAction<GameAction = unknown> {
  matchId: MatchId
  playerId: string
  sequence: number // Monotonically increasing, contiguous
  timestamp: number
  action: GameAction // Game-specific action payload
}

/**
 * Match state checkpoint for reconnection/resync
 */
export interface MatchCheckpoint<GameState = unknown> {
  matchId: MatchId
  status: MatchStatus
  stateVersion: number // Increments on every state change
  players: MatchPlayer[]
  gameState: GameState // Game-specific state
  lastActionSequence: number
  createdAt: number
}

/**
 * Resolved match outcome - deterministic winner determination
 */
export interface ResolvedMatchOutcome {
  matchId: MatchId
  winnerId: string | null // null for draw/forfeit
  loserId: string | null
  reason: 'points' | 'knockout' | 'forfeit' | 'time_limit' | 'draw'
  stakeAmount: number
  winnerAmount: number // Total pot (stake * 2 in zero-sum)
  timestamp: number
}

/**
 * Result artifact - complete match record for persistence/settlement
 */
export interface ResultArtifact {
  matchId: MatchId
  outcome: ResolvedMatchOutcome
  players: Array<{
    id: string
    name: string
    walletAddress?: string
    stake: number
    result: 'win' | 'loss' | 'draw'
  }>
  actionLogHash: string // Hash of action log for verification
  startedAt: number
  endedAt: number
  stateVersion: number
}

/**
 * Settlement handoff state
 */
export type SettlementHandoffState = 'pending' | 'noop' | 'recorded' | 'failed'

/**
 * Settlement handoff request
 */
export interface SettlementHandoff {
  matchId: MatchId
  artifact: ResultArtifact
  state: SettlementHandoffState
  error?: string
}

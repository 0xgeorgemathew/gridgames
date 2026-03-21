// =============================================================================
// MATCH CLIENT STATE TYPES
// Types for shared match store on the client
// =============================================================================

import type {
  MatchId,
  MatchStatus,
  MatchPlayer,
  ReadyState,
  FundingState,
  AuthoritativeAction,
  ResolvedMatchOutcome,
  ResultArtifact,
} from '@/domains/match/types'

/**
 * Client-side match state
 */
export interface MatchState {
  // Match identification
  matchId: MatchId | null

  // Lifecycle status
  status: MatchStatus
  stateVersion: number

  // Players
  players: MatchPlayer[]
  localPlayerId: string | null

  // Game duration
  gameDuration: number | null
  startedAt: number | null
  endedAt: number | null

  // Result (when match ends)
  outcome: ResolvedMatchOutcome | null
  artifact: ResultArtifact | null

  // Action stream (for real-time updates)
  lastActionSequence: number
  pendingActions: AuthoritativeAction[]

  // Connection state
  isConnected: boolean
  reconnectAttempts: number
}

/**
 * Initial match state
 */
export const initialMatchState: MatchState = {
  matchId: null,
  status: 'waiting',
  stateVersion: 0,
  players: [],
  localPlayerId: null,
  gameDuration: null,
  startedAt: null,
  endedAt: null,
  outcome: null,
  artifact: null,
  lastActionSequence: -1,
  pendingActions: [],
  isConnected: false,
  reconnectAttempts: 0,
}

/**
 * Match store actions
 */
export interface MatchStoreActions {
  // Lifecycle
  resetMatch: () => void

  // Connection
  setConnected: (connected: boolean) => void
  incrementReconnectAttempts: () => void
  resetReconnectAttempts: () => void

  // Match lifecycle events
  handleMatchCreated: (payload: {
    matchId: MatchId
    players: MatchPlayer[]
    gameDuration: number
  }) => void

  handleMatchUpdated: (payload: {
    matchId: MatchId
    status: MatchStatus
    stateVersion: number
    players: MatchPlayer[]
  }) => void

  handleMatchStarted: (payload: {
    matchId: MatchId
    gameDuration: number
    startedAt: number
  }) => void

  handleMatchActionApplied: (payload: {
    matchId: MatchId
    playerId: string
    sequence: number
    stateVersion: number
    action: unknown
  }) => void

  handleMatchResultReady: (payload: {
    matchId: MatchId
    outcome: ResolvedMatchOutcome
    artifact: ResultArtifact
  }) => void

  handleMatchAborted: (payload: {
    matchId: MatchId
    reason: 'player_disconnect' | 'timeout' | 'error'
    affectedPlayerId?: string
  }) => void

  // Player state
  setLocalPlayerId: (playerId: string) => void
  updatePlayerReadyState: (playerId: string, readyState: ReadyState) => void
  updatePlayerFundingState: (playerId: string, fundingState: FundingState) => void
}

/**
 * Full match store type
 */
export type MatchStore = MatchState & MatchStoreActions

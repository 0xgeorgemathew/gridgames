// =============================================================================
// MATCH DOMAIN EVENTS
// Shared socket event payloads for match lifecycle
// =============================================================================

import type {
  MatchId,
  MatchStatus,
  MatchPlayer,
  MatchCheckpoint,
  ResolvedMatchOutcome,
  ResultArtifact,
  FundingState,
  SettlementHandoffState,
} from './types'

// =============================================================================
// CLIENT -> SERVER EVENTS
// =============================================================================

/**
 * Request to find a match
 */
export interface FindMatchPayload {
  playerName: string
  gameDuration: number
  sceneWidth: number
  sceneHeight: number
  walletAddress?: string
}

/**
 * Player reports scene is ready
 */
export interface SceneReadyPayload {
  matchId: MatchId
}

/**
 * Player submits a gameplay action
 */
export interface MatchActionPayload<GameAction = unknown> {
  matchId: MatchId
  action: GameAction
}

// =============================================================================
// SERVER -> CLIENT EVENTS
// =============================================================================

/**
 * Match created - players matched and room created
 */
export interface MatchCreatedPayload {
  matchId: MatchId
  players: MatchPlayer[]
  gameDuration: number
}

/**
 * Match state updated
 */
export interface MatchUpdatedPayload {
  matchId: MatchId
  status: MatchStatus
  stateVersion: number
  players: MatchPlayer[]
}

/**
 * Match started - gameplay begins
 */
export interface MatchStartedPayload {
  matchId: MatchId
  gameDuration: number
  startedAt: number
}

/**
 * Action applied to match state
 */
export interface MatchActionAppliedPayload<GameAction = unknown> {
  matchId: MatchId
  playerId: string
  sequence: number
  stateVersion: number
  action: GameAction
}

/**
 * Match result is ready
 */
export interface MatchResultReadyPayload {
  matchId: MatchId
  outcome: ResolvedMatchOutcome
  artifact: ResultArtifact
}

/**
 * Match aborted
 */
export interface MatchAbortedPayload {
  matchId: MatchId
  reason: 'player_disconnect' | 'timeout' | 'error'
  affectedPlayerId?: string
}

/**
 * Player funding state updated
 */
export interface FundingStateUpdatedPayload {
  matchId: MatchId
  playerId: string
  fundingState: FundingState
}

/**
 * Settlement state updated
 */
export interface SettlementStateUpdatedPayload {
  matchId: MatchId
  state: SettlementHandoffState
}

// =============================================================================
// EVENT NAMES
// =============================================================================

export const MATCH_EVENTS = {
  // Client -> Server
  FIND_MATCH: 'find_match',
  SCENE_READY: 'scene_ready',
  MATCH_ACTION: 'match_action',

  // Server -> Client
  MATCH_CREATED: 'match_created',
  MATCH_UPDATED: 'match_updated',
  MATCH_STARTED: 'match_started',
  MATCH_ACTION_APPLIED: 'match_action_applied',
  MATCH_RESULT_READY: 'match_result_ready',
  MATCH_ABORTED: 'match_aborted',
  FUNDING_STATE_UPDATED: 'funding_state_updated',
  SETTLEMENT_STATE_UPDATED: 'settlement_state_updated',
} as const

export type MatchEventName = (typeof MATCH_EVENTS)[keyof typeof MATCH_EVENTS]

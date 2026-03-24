// =============================================================================
// TAP DANCER GAME DEFINITION
// Engine plugin implementing the GameDefinition contract
// =============================================================================

import type { MatchId, MatchPlayer } from '@/domains/match/types'
import type {
  GameDefinition,
  GameCapabilities,
  ResolvedGameOutcome,
  ActionResult,
} from '@/domains/game-engine/core'
import type { TapAction, Direction } from '../shared/trading.types'

// =============================================================================
// TAP DANCER STATE
// =============================================================================

/**
 * Player score in Tap Dancer
 */
export interface TapDancerPlayerScore {
  playerId: string
  playerName: string
  score: number
  taps: number
  upTaps: number
  downTaps: number
  correctTaps: number
  incorrectTaps: number
}

/**
 * Tap Dancer game state
 */
export interface TapDancerGameState {
  matchId: MatchId
  players: [TapDancerPlayerScore, TapDancerPlayerScore]
  currentPrice: number | null
  startedAt: number
  endedAt: number | null
}

/**
 * Tap Dancer runtime state (server-side only)
 * Minimal - no coin spawning needed
 */
export interface TapDancerRuntimeState {
  /** Last price update time */
  lastPriceUpdate: number
}

/**
 * Price update domain event
 */
export interface PriceUpdateDomainEvent {
  type: 'price_update'
  price: number
  change: number
  changePercent: number
  timestamp: number
}

/**
 * Tap Dancer domain events (minimal - mainly price updates)
 */
export type TapDancerDomainEvent = PriceUpdateDomainEvent

// =============================================================================
// CAPABILITIES
// =============================================================================

export const TAP_DANCER_CAPABILITIES: GameCapabilities = {
  usesGrid: true,
  usesMarketFeed: true,
  usesSnakeGraph: true,
}

// =============================================================================
// METADATA
// =============================================================================

export const TAP_DANCER_METADATA = {
  slug: 'tap-dancer',
  name: 'TapDancer',
  description: 'Tap to trade. Long or short, fast decisions win.',
  icon: '/games/tap-dancer/icon.svg',
  backgroundImage: '/games/tap-dancer/bg.jpg',
  players: {
    min: 2,
    max: 2,
  },
  duration: '2-3 min',
}

// =============================================================================
// GAME DEFINITION IMPLEMENTATION
// =============================================================================

/**
 * Create initial Tap Dancer game state
 */
function createInitialState(matchId: MatchId, players: MatchPlayer[]): TapDancerGameState {
  return {
    matchId,
    players: [
      {
        playerId: players[0]?.id ?? '',
        playerName: players[0]?.name ?? '',
        score: 0,
        taps: 0,
        upTaps: 0,
        downTaps: 0,
        correctTaps: 0,
        incorrectTaps: 0,
      },
      {
        playerId: players[1]?.id ?? '',
        playerName: players[1]?.name ?? '',
        score: 0,
        taps: 0,
        upTaps: 0,
        downTaps: 0,
        correctTaps: 0,
        incorrectTaps: 0,
      },
    ],
    currentPrice: null,
    startedAt: Date.now(),
    endedAt: null,
  }
}

/**
 * Create runtime state for server
 */
function createRuntimeState(matchId: MatchId): TapDancerRuntimeState {
  return {
    lastPriceUpdate: 0,
  }
}

/**
 * Validate a tap action
 */
function validateAction(
  matchId: MatchId,
  gameState: TapDancerGameState,
  playerId: string,
  action: TapAction
): ActionResult {
  // Check action type
  if (action.type !== 'tap') {
    return { valid: false, error: 'Invalid action type' }
  }

  // Check direction is valid
  if (action.direction !== 'up' && action.direction !== 'down') {
    return { valid: false, error: 'Invalid direction' }
  }

  // Check player is in match
  const playerIndex = gameState.players.findIndex((p) => p.playerId === playerId)
  if (playerIndex === -1) {
    return { valid: false, error: 'Player not in match' }
  }

  return { valid: true }
}

/**
 * Apply a tap action to game state
 */
function applyAction(
  matchId: MatchId,
  gameState: TapDancerGameState,
  playerId: string,
  action: TapAction,
  sequence: number
): TapDancerGameState {
  const playerIndex = gameState.players.findIndex((p) => p.playerId === playerId)
  if (playerIndex === -1) return gameState

  // Update player tap count
  const newPlayers = [...gameState.players] as [TapDancerPlayerScore, TapDancerPlayerScore]
  newPlayers[playerIndex] = {
    ...newPlayers[playerIndex],
    taps: newPlayers[playerIndex].taps + 1,
    upTaps: newPlayers[playerIndex].upTaps + (action.direction === 'up' ? 1 : 0),
    downTaps: newPlayers[playerIndex].downTaps + (action.direction === 'down' ? 1 : 0),
  }

  return {
    ...gameState,
    players: newPlayers,
  }
}

/**
 * Resolve match outcome
 */
function resolveOutcome(
  matchId: MatchId,
  gameState: TapDancerGameState,
  players: MatchPlayer[]
): ResolvedGameOutcome {
  const [player1, player2] = gameState.players
  const scores = new Map<string, number>()

  // Score based on correct taps
  scores.set(player1.playerId, player1.score)
  scores.set(player2.playerId, player2.score)

  let winnerId: string | null = null
  let loserId: string | null = null
  let reason: ResolvedGameOutcome['reason'] = 'points'

  if (player1.score > player2.score) {
    winnerId = player1.playerId
    loserId = player2.playerId
  } else if (player2.score > player1.score) {
    winnerId = player2.playerId
    loserId = player1.playerId
  } else {
    // Tie
    reason = 'draw'
  }

  return {
    winnerId,
    loserId,
    reason,
    scores,
    timestamp: Date.now(),
  }
}

// =============================================================================
// GAME DEFINITION EXPORT
// =============================================================================

export const tapDancerDefinition: GameDefinition<
  TapAction,
  TapDancerGameState,
  TapDancerDomainEvent,
  TapDancerRuntimeState
> = {
  metadata: TAP_DANCER_METADATA,
  capabilities: TAP_DANCER_CAPABILITIES,

  createInitialState,
  createRuntimeState,

  validateAction,
  applyAction,

  resolveOutcome,

  hooks: {
    onMatchStart: (matchId: MatchId, players: MatchPlayer[]) => {
      // TODO: Add Tap Dancer runtime initialization here if reducer-owned start state grows.
    },
    onTick: (matchId: MatchId, gameState: TapDancerGameState, deltaMs: number) => {
      // TODO: Move any future beat/combo timers into the engine runtime.
    },
    onMarketTick: (matchId: MatchId, gameState: TapDancerGameState, price: number) => {
      // TODO: Route market ticks through reducer-owned state once the live server path uses plugins.
    },
    generateDomainEvents: (
      matchId: MatchId,
      gameState: TapDancerGameState,
      sequence: number
    ): TapDancerDomainEvent[] => {
      // TODO: Emit authoritative domain events here if Tap Dancer gains server-authored effects.
      return []
    },
  },
}

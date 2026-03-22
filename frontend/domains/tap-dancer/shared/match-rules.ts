// =============================================================================
// TAP DANCER MATCH RULES
// Deterministic zero-sum reducer for Tap Dancer gameplay
//
// ⚠️  NON-LIVE CODE - DO NOT USE FOR PRODUCTION GAMEPLAY ⚠️
//
// This file is part of the match-domain path that is NOT currently wired
// end-to-end. The live product path uses the patched legacy events in
// index.ts and settlement.server.ts instead.
//
// See plans/2026-03-22-zero-sum-regression-fix-plan.md for context.
//
// =============================================================================

import type { AuthoritativeAction } from '@/domains/match/types'

// =============================================================================
// ACTION TYPES
// =============================================================================

/**
 * Tap action - player taps a direction button
 */
export interface TapDancerTapAction {
  type: 'tap'
  direction: 'up' | 'down'
  timestamp: number
}

/**
 * All Tap Dancer game actions
 */
export type TapDancerGameAction = TapDancerTapAction

// =============================================================================
// STATE TYPES
// =============================================================================

/**
 * Player state in Tap Dancer match
 */
export interface TapDancerPlayerState {
  id: string
  name: string
  score: number
  tapsByDirection: {
    up: number
    down: number
  }
}

/**
 * Tap Dancer match state
 */
export interface TapDancerMatchState {
  matchId: string
  players: [TapDancerPlayerState, TapDancerPlayerState]
  startedAt: number
  endedAt: number | null
  totalActions: number
  lastPrice: number
  priceHistory: Array<{ price: number; timestamp: number }>
}

// =============================================================================
// REDUCER RESULT
// =============================================================================

/**
 * Result of applying an action
 */
export interface TapDancerReducerResult {
  /** Updated match state */
  state: TapDancerMatchState
  /** Delta for zero-sum ledger (positive = player 1 gains, negative = loses) */
  delta: number
  /** Whether this action ended the game */
  isTerminal: boolean
  /** Event to emit to clients (if any) */
  event?: {
    name: string
    data: unknown
  }
}

// =============================================================================
// CONSTANTS
// =============================================================================

/** Base points per tap */
const BASE_POINTS_PER_TAP = 1

/** Combo multiplier threshold */
const COMBO_THRESHOLD = 5
const COMBO_MULTIPLIER = 2

// =============================================================================
// REDUCER
// =============================================================================

/**
 * Create initial Tap Dancer match state
 */
export function createInitialTapDancerState(
  matchId: string,
  player1: { id: string; name: string },
  player2: { id: string; name: string },
  initialPrice: number = 0
): TapDancerMatchState {
  return {
    matchId,
    players: [
      { id: player1.id, name: player1.name, score: 0, tapsByDirection: { up: 0, down: 0 } },
      { id: player2.id, name: player2.name, score: 0, tapsByDirection: { up: 0, down: 0 } },
    ],
    startedAt: Date.now(),
    endedAt: null,
    totalActions: 0,
    lastPrice: initialPrice,
    priceHistory: [{ price: initialPrice, timestamp: Date.now() }],
  }
}

/**
 * Apply a Tap Dancer action to the match state
 * Returns updated state and delta for zero-sum ledger
 */
export function applyTapDancerAction(
  state: TapDancerMatchState,
  action: AuthoritativeAction<TapDancerGameAction>,
  gameDuration: number
): TapDancerReducerResult {
  const { action: gameAction, playerId, timestamp } = action

  // Check if match is already ended
  if (state.endedAt !== null) {
    return { state, delta: 0, isTerminal: true }
  }

  // Check if match duration exceeded
  const elapsed = timestamp - state.startedAt
  if (elapsed >= gameDuration) {
    const finalState = { ...state, endedAt: timestamp }
    return { state: finalState, delta: 0, isTerminal: true }
  }

  // Find player index
  const playerIndex = state.players.findIndex((p) => p.id === playerId)
  if (playerIndex === -1) {
    console.warn(`[TapDancer] Unknown player ${playerId}`)
    return { state, delta: 0, isTerminal: false }
  }

  let delta = 0
  let event: TapDancerReducerResult['event']

  switch (gameAction.type) {
    case 'tap': {
      const player = state.players[playerIndex]
      const direction = gameAction.direction

      // Calculate points (base + combo bonus)
      const tapsInDirection = player.tapsByDirection[direction]
      const comboBonus =
        tapsInDirection >= COMBO_THRESHOLD && (tapsInDirection + 1) % COMBO_THRESHOLD === 0 ? 1 : 0
      const pointsEarned = BASE_POINTS_PER_TAP + comboBonus

      // Update player score
      const newPlayers = [...state.players] as [TapDancerPlayerState, TapDancerPlayerState]
      newPlayers[playerIndex] = {
        ...newPlayers[playerIndex],
        score: newPlayers[playerIndex].score + pointsEarned,
        tapsByDirection: {
          ...newPlayers[playerIndex].tapsByDirection,
          [direction]: newPlayers[playerIndex].tapsByDirection[direction] + 1,
        },
      }

      // Calculate delta (positive for player 1, negative for player 2)
      delta = playerIndex === 0 ? pointsEarned : -pointsEarned

      const newState: TapDancerMatchState = {
        ...state,
        players: newPlayers,
        totalActions: state.totalActions + 1,
      }

      event = {
        name: 'tap_applied',
        data: {
          playerId,
          playerName: state.players[playerIndex].name,
          direction,
          pointsEarned,
          comboBonus: comboBonus > 0,
          newScore: newPlayers[playerIndex].score,
        },
      }

      return { state: newState, delta, isTerminal: false, event }
    }

    default:
      return { state, delta: 0, isTerminal: false }
  }
}

/**
 * Update price in state (called when price feed updates)
 */
export function updatePriceInState(
  state: TapDancerMatchState,
  price: number,
  timestamp: number
): TapDancerMatchState {
  return {
    ...state,
    lastPrice: price,
    priceHistory: [...state.priceHistory, { price, timestamp }].slice(-100), // Keep last 100 prices
  }
}

/**
 * Resolve match outcome from final state
 * Winner is determined by score
 */
export function resolveTapDancerOutcome(
  state: TapDancerMatchState,
  stakeAmount: number
): {
  winnerId: string | null
  loserId: string | null
  reason: 'points' | 'draw'
  finalScores: [number, number]
} {
  const [player1, player2] = state.players
  const score1 = player1.score
  const score2 = player2.score

  if (score1 > score2) {
    return {
      winnerId: player1.id,
      loserId: player2.id,
      reason: 'points',
      finalScores: [score1, score2],
    }
  } else if (score2 > score1) {
    return {
      winnerId: player2.id,
      loserId: player1.id,
      reason: 'points',
      finalScores: [score1, score2],
    }
  } else {
    // Frozen tiebreaker: player1 wins exact-score ties
    return {
      winnerId: player1.id,
      loserId: player2.id,
      reason: 'points',
      finalScores: [score1, score2],
    }
  }
}

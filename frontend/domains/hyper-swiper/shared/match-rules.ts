// =============================================================================
// HYPER SWIPER MATCH RULES
// Deterministic zero-sum reducer for Hyper Swiper gameplay
// =============================================================================

import type { AuthoritativeAction } from '@/domains/match/types'

// =============================================================================
// ACTION TYPES
// =============================================================================

/**
 * Slice action - player swipes a coin
 */
export interface HyperSwiperSliceAction {
  type: 'slice'
  coinId: string
  coinType: 'long' | 'short'
  timestamp: number
}

/**
 * All Hyper Swiper game actions
 */
export type HyperSwiperGameAction = HyperSwiperSliceAction

// =============================================================================
// STATE TYPES
// =============================================================================

/**
 * Player state in Hyper Swiper match
 */
export interface HyperSwiperPlayerState {
  id: string
  name: string
  score: number
  slicesByType: {
    long: number
    short: number
  }
}

/**
 * Active coin in the game
 */
export interface ActiveCoin {
  id: string
  type: 'long' | 'short'
  xNormalized: number
  velocityX: number
  velocityY: number
  sequenceIndex: number
  spawnedAt: number
}

/**
 * Hyper Swiper match state
 */
export interface HyperSwiperMatchState {
  matchId: string
  players: [HyperSwiperPlayerState, HyperSwiperPlayerState]
  activeCoins: Map<string, ActiveCoin>
  startedAt: number
  endedAt: number | null
  totalActions: number
}

// =============================================================================
// REDUCER RESULT
// =============================================================================

/**
 * Result of applying an action
 */
export interface HyperSwiperReducerResult {
  /** Updated match state */
  state: HyperSwiperMatchState
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

/** Points per slice */
const POINTS_PER_SLICE = 1

/** Time bonus multiplier (bonus points for fast reactions) */
const TIME_BONUS_THRESHOLD_MS = 1000
const TIME_BONUS_POINTS = 1

// =============================================================================
// REDUCER
// =============================================================================

/**
 * Create initial Hyper Swiper match state
 */
export function createInitialHyperSwiperState(
  matchId: string,
  player1: { id: string; name: string },
  player2: { id: string; name: string }
): HyperSwiperMatchState {
  return {
    matchId,
    players: [
      { id: player1.id, name: player1.name, score: 0, slicesByType: { long: 0, short: 0 } },
      { id: player2.id, name: player2.name, score: 0, slicesByType: { long: 0, short: 0 } },
    ],
    activeCoins: new Map(),
    startedAt: Date.now(),
    endedAt: null,
    totalActions: 0,
  }
}

/**
 * Apply a Hyper Swiper action to the match state
 * Returns updated state and delta for zero-sum ledger
 */
export function applyHyperSwiperAction(
  state: HyperSwiperMatchState,
  action: AuthoritativeAction<HyperSwiperGameAction>,
  gameDuration: number
): HyperSwiperReducerResult {
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
    console.warn(`[HyperSwiper] Unknown player ${playerId}`)
    return { state, delta: 0, isTerminal: false }
  }

  let delta = 0
  let event: HyperSwiperReducerResult['event']

  switch (gameAction.type) {
    case 'slice': {
      // Calculate points (base + time bonus)
      const coinSpawnTime = state.activeCoins.get(gameAction.coinId)?.spawnedAt ?? timestamp
      const reactionTime = timestamp - coinSpawnTime
      const timeBonus = reactionTime < TIME_BONUS_THRESHOLD_MS ? TIME_BONUS_POINTS : 0
      const pointsEarned = POINTS_PER_SLICE + timeBonus

      // Update player score
      const newPlayers = [...state.players] as [HyperSwiperPlayerState, HyperSwiperPlayerState]
      newPlayers[playerIndex] = {
        ...newPlayers[playerIndex],
        score: newPlayers[playerIndex].score + pointsEarned,
        slicesByType: {
          ...newPlayers[playerIndex].slicesByType,
          [gameAction.coinType]: newPlayers[playerIndex].slicesByType[gameAction.coinType] + 1,
        },
      }

      // Remove coin from active coins
      const newActiveCoins = new Map(state.activeCoins)
      newActiveCoins.delete(gameAction.coinId)

      // Calculate delta (positive for player 1, negative for player 2)
      delta = playerIndex === 0 ? pointsEarned : -pointsEarned

      const newState: HyperSwiperMatchState = {
        ...state,
        players: newPlayers,
        activeCoins: newActiveCoins,
        totalActions: state.totalActions + 1,
      }

      event = {
        name: 'slice_applied',
        data: {
          playerId,
          playerName: state.players[playerIndex].name,
          coinId: gameAction.coinId,
          coinType: gameAction.coinType,
          pointsEarned,
          reactionTime,
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
 * Resolve match outcome from final state
 * Winner is determined by score
 */
export function resolveHyperSwiperOutcome(
  state: HyperSwiperMatchState,
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
    return { winnerId: player1.id, loserId: player2.id, reason: 'points', finalScores: [score1, score2] }
  } else if (score2 > score1) {
    return { winnerId: player2.id, loserId: player1.id, reason: 'points', finalScores: [score1, score2] }
  } else {
    // Draw - no winner
    return { winnerId: null, loserId: null, reason: 'draw', finalScores: [score1, score2] }
  }
}

/**
 * Add a spawned coin to the state
 */
export function addCoinToState(
  state: HyperSwiperMatchState,
  coin: ActiveCoin
): HyperSwiperMatchState {
  const newActiveCoins = new Map(state.activeCoins)
  newActiveCoins.set(coin.id, { ...coin, spawnedAt: Date.now() })
  return { ...state, activeCoins: newActiveCoins }
}

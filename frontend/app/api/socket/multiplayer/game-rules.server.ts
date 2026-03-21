// =============================================================================
// GAME RULES DISPATCHER
// Dispatches authoritative actions to the correct game reducer
// =============================================================================

import type { MatchId, AuthoritativeAction } from '@/domains/match/types'
import {
  type HyperSwiperGameAction,
  type HyperSwiperMatchState,
  applyHyperSwiperAction,
  createInitialHyperSwiperState,
  resolveHyperSwiperOutcome,
  addCoinToState,
  type ActiveCoin,
} from '@/domains/hyper-swiper/shared/match-rules'
import {
  type TapDancerGameAction,
  type TapDancerMatchState,
  applyTapDancerAction,
  createInitialTapDancerState,
  resolveTapDancerOutcome,
  updatePriceInState,
} from '@/domains/tap-dancer/shared/match-rules'

/**
 * Game types supported by the platform
 */
export type GameType = 'hyper-swiper' | 'tap-dancer'

/**
 * All game actions
 */
export type GameAction = HyperSwiperGameAction | TapDancerGameAction

/**
 * Game state union type
 */
export type GameState = HyperSwiperMatchState | TapDancerMatchState

/**
 * Game reducer result
 */
export interface GameReducerResult {
  /** Updated game-specific state */
  gameState: GameState
  /** Delta for zero-sum ledger (positive = player 1 gains, negative = player 1 loses) */
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
// STATE FACTORIES
// =============================================================================

/**
 * Create initial game state for a match
 */
export function createInitialGameState(
  gameType: GameType,
  matchId: string,
  player1: { id: string; name: string },
  player2: { id: string; name: string },
  initialPrice: number = 0
): GameState {
  switch (gameType) {
    case 'hyper-swiper':
      return createInitialHyperSwiperState(matchId, player1, player2)
    case 'tap-dancer':
      return createInitialTapDancerState(matchId, player1, player2, initialPrice)
  }
}

// =============================================================================
// DISPATCHER
// =============================================================================

/**
 * Dispatch an action to the appropriate game reducer
 */
export function dispatchGameAction(
  gameType: GameType,
  state: GameState,
  action: AuthoritativeAction<GameAction>,
  gameDuration: number
): GameReducerResult {
  switch (gameType) {
    case 'hyper-swiper': {
      const result = applyHyperSwiperAction(
        state as HyperSwiperMatchState,
        action as AuthoritativeAction<HyperSwiperGameAction>,
        gameDuration
      )
      return {
        gameState: result.state,
        delta: result.delta,
        isTerminal: result.isTerminal,
        event: result.event,
      }
    }
    case 'tap-dancer': {
      const result = applyTapDancerAction(
        state as TapDancerMatchState,
        action as AuthoritativeAction<TapDancerGameAction>,
        gameDuration
      )
      return {
        gameState: result.state,
        delta: result.delta,
        isTerminal: result.isTerminal,
        event: result.event,
      }
    }
  }
}

// =============================================================================
// OUTCOME RESOLVER
// =============================================================================

/**
 * Resolve match outcome from game state
 */
export function resolveMatchOutcomeFromState(
  gameType: GameType,
  state: GameState,
  stakeAmount: number
): {
  winnerId: string | null
  loserId: string | null
  reason: 'points' | 'draw'
  finalScores: [number, number]
} {
  switch (gameType) {
    case 'hyper-swiper':
      return resolveHyperSwiperOutcome(state as HyperSwiperMatchState, stakeAmount)
    case 'tap-dancer':
      return resolveTapDancerOutcome(state as TapDancerMatchState, stakeAmount)
  }
}

// =============================================================================
// GAME-SPECIFIC HELPERS
// =============================================================================

/**
 * Add a coin to Hyper Swiper state
 */
export function addCoinToGameState(
  state: GameState,
  coin: ActiveCoin,
  gameType: GameType
): GameState {
  if (gameType === 'hyper-swiper') {
    return addCoinToState(state as HyperSwiperMatchState, coin)
  }
  return state // Tap Dancer doesn't use coins
}

/**
 * Update price in Tap Dancer state
 */
export function updatePriceInGameState(
  state: GameState,
  price: number,
  timestamp: number,
  gameType: GameType
): GameState {
  if (gameType === 'tap-dancer') {
    return updatePriceInState(state as TapDancerMatchState, price, timestamp)
  }
  return state // Hyper Swiper doesn't use price for outcome
}

/**
 * Assert zero-sum ledger invariant
 * player1_delta + player2_delta must equal 0
 */
export function assertZeroSumInvariant(
  player1Delta: number,
  player2Delta: number,
  matchId: string
): void {
  const sum = player1Delta + player2Delta
  console.assert(
    sum === 0,
    `[ZeroSum] Invariant violated in match ${matchId}: ${player1Delta} + ${player2Delta} = ${sum}`
  )
}

// =============================================================================
// HYPER SWIPER GAME DEFINITION
// Engine plugin implementing the GameDefinition contract
// =============================================================================

import type { MatchId, MatchPlayer } from '@/domains/match/types'
import type {
  GameDefinition,
  GameCapabilities,
  ResolvedGameOutcome,
  ActionResult,
} from '@/domains/game-engine/core'
import type { SliceAction, CoinType, SpawnedCoin } from '../shared/trading.types'

// =============================================================================
// HYPER SWIPER STATE
// =============================================================================

/**
 * Player score in Hyper Swiper
 */
export interface HyperSwiperPlayerScore {
  playerId: string
  playerName: string
  slices: number
  upSlices: number
  downSlices: number
}

/**
 * Hyper Swiper game state
 */
export interface HyperSwiperGameState {
  matchId: MatchId
  players: [HyperSwiperPlayerScore, HyperSwiperPlayerScore]
  activeCoins: Map<string, SpawnedCoin>
  startedAt: number
  endedAt: number | null
}

/**
 * Hyper Swiper runtime state (server-side only)
 */
export interface HyperSwiperRuntimeState {
  /** Coin spawn timers */
  coinSpawnTimers: Map<string, NodeJS.Timeout>
  /** Active coin tracking */
  activeCoins: Map<string, { id: string; type: CoinType; spawnedAt: number }>
  /** Coin sequence index */
  coinSequenceIndex: number
}

/**
 * Coin spawn domain event
 */
export interface CoinSpawnDomainEvent {
  type: 'coin_spawn'
  coinId: string
  coinType: CoinType
  xNormalized: number
  velocityX: number
  velocityY: number
  sequenceIndex: number
}

/**
 * Coin expired domain event
 */
export interface CoinExpiredDomainEvent {
  type: 'coin_expired'
  coinId: string
}

/**
 * Hyper Swiper domain events
 */
export type HyperSwiperDomainEvent = CoinSpawnDomainEvent | CoinExpiredDomainEvent

// =============================================================================
// CAPABILITIES
// =============================================================================

export const HYPER_SWIPER_CAPABILITIES: GameCapabilities = {
  usesGrid: true,
  usesMarketFeed: true,
  usesSnakeGraph: true,
}

// =============================================================================
// METADATA
// =============================================================================

export const HYPER_SWIPER_METADATA = {
  slug: 'hyper-swiper',
  name: 'Hyper Swiper',
  description: 'Real-time crypto trading battle. Swipe to trade, outsmart your opponent.',
  icon: '/games/hyper-swiper/icon.svg',
  backgroundImage: '/games/hyper-swiper/bg.jpg',
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
 * Create initial Hyper Swiper game state
 */
function createInitialState(matchId: MatchId, players: MatchPlayer[]): HyperSwiperGameState {
  return {
    matchId,
    players: [
      {
        playerId: players[0]?.id ?? '',
        playerName: players[0]?.name ?? '',
        slices: 0,
        upSlices: 0,
        downSlices: 0,
      },
      {
        playerId: players[1]?.id ?? '',
        playerName: players[1]?.name ?? '',
        slices: 0,
        upSlices: 0,
        downSlices: 0,
      },
    ],
    activeCoins: new Map(),
    startedAt: Date.now(),
    endedAt: null,
  }
}

/**
 * Create runtime state for server
 */
function createRuntimeState(matchId: MatchId): HyperSwiperRuntimeState {
  return {
    coinSpawnTimers: new Map(),
    activeCoins: new Map(),
    coinSequenceIndex: 0,
  }
}

/**
 * Validate a slice action
 */
function validateAction(
  matchId: MatchId,
  gameState: HyperSwiperGameState,
  playerId: string,
  action: SliceAction
): ActionResult {
  // Check action type
  if (action.type !== 'slice') {
    return { valid: false, error: 'Invalid action type' }
  }

  // Check coin exists
  const coin = gameState.activeCoins.get(action.coinId)
  if (!coin) {
    return { valid: false, error: 'Coin not found or expired' }
  }

  // Check coin type matches
  if (coin.type !== action.coinType) {
    return { valid: false, error: 'Coin type mismatch' }
  }

  // Check player is in match
  const playerIndex = gameState.players.findIndex((p) => p.playerId === playerId)
  if (playerIndex === -1) {
    return { valid: false, error: 'Player not in match' }
  }

  return { valid: true }
}

/**
 * Apply a slice action to game state
 */
function applyAction(
  matchId: MatchId,
  gameState: HyperSwiperGameState,
  playerId: string,
  action: SliceAction,
  sequence: number
): HyperSwiperGameState {
  const playerIndex = gameState.players.findIndex((p) => p.playerId === playerId)
  if (playerIndex === -1) return gameState

  const coin = gameState.activeCoins.get(action.coinId)
  if (!coin) return gameState

  // Remove coin from active
  const newActiveCoins = new Map(gameState.activeCoins)
  newActiveCoins.delete(action.coinId)

  // Update player score
  const newPlayers = [...gameState.players] as [HyperSwiperPlayerScore, HyperSwiperPlayerScore]
  newPlayers[playerIndex] = {
    ...newPlayers[playerIndex],
    slices: newPlayers[playerIndex].slices + 1,
    upSlices: newPlayers[playerIndex].upSlices + (action.coinType === 'long' ? 1 : 0),
    downSlices: newPlayers[playerIndex].downSlices + (action.coinType === 'short' ? 1 : 0),
  }

  return {
    ...gameState,
    players: newPlayers,
    activeCoins: newActiveCoins,
  }
}

/**
 * Resolve match outcome
 */
function resolveOutcome(
  matchId: MatchId,
  gameState: HyperSwiperGameState,
  players: MatchPlayer[]
): ResolvedGameOutcome {
  const [player1, player2] = gameState.players
  const scores = new Map<string, number>()

  // Score based on slices
  scores.set(player1.playerId, player1.slices)
  scores.set(player2.playerId, player2.slices)

  let winnerId: string | null = null
  let loserId: string | null = null
  let reason: ResolvedGameOutcome['reason'] = 'points'

  if (player1.slices > player2.slices) {
    winnerId = player1.playerId
    loserId = player2.playerId
  } else if (player2.slices > player1.slices) {
    winnerId = player2.playerId
    loserId = player1.playerId
  } else {
    // Tie - could use secondary metric or declare draw
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

export const hyperSwiperDefinition: GameDefinition<
  SliceAction,
  HyperSwiperGameState,
  HyperSwiperDomainEvent,
  HyperSwiperRuntimeState
> = {
  metadata: HYPER_SWIPER_METADATA,
  capabilities: HYPER_SWIPER_CAPABILITIES,

  createInitialState,
  createRuntimeState,

  validateAction,
  applyAction,

  resolveOutcome,

  hooks: {
    onMatchStart: (matchId: MatchId, players: MatchPlayer[]) => {
      // TODO: Move legacy coin spawn bootstrap into the engine runtime.
    },
    onTick: (matchId: MatchId, gameState: HyperSwiperGameState, deltaMs: number) => {
      // TODO: Move per-frame coin lifecycle updates into the engine runtime.
    },
    onMarketTick: (matchId: MatchId, gameState: HyperSwiperGameState, price: number) => {
      // TODO: Normalize price-driven effects once Hyper Swiper is fully reducer-driven.
    },
    generateDomainEvents: (
      matchId: MatchId,
      gameState: HyperSwiperGameState,
      sequence: number
    ): HyperSwiperDomainEvent[] => {
      // TODO: Replace legacy `coin_spawn` emits with authoritative domain events.
      return []
    },
  },
}

// =============================================================================
// GAME ENGINE CORE TYPES
// Foundation types for the unified modular game engine
// =============================================================================

import type { MatchId, MatchStatus, MatchPlayer } from '@/domains/match/types'
export type { MatchDomainEventPayload } from '@/domains/match/events'

// =============================================================================
// GAME DEFINITION CONTRACT
// =============================================================================

/**
 * Capabilities a game can declare for engine support
 */
export interface GameCapabilities {
  /** Game uses the grid system for spatial gameplay */
  usesGrid: boolean
  /** Game subscribes to market price feed */
  usesMarketFeed: boolean
  /** Game uses snake graph visualization */
  usesSnakeGraph: boolean
}

/**
 * Display metadata for a game
 */
export interface GameMetadata {
  /** URL-friendly identifier */
  slug: string
  /** Human-readable name */
  name: string
  /** Short description */
  description: string
  /** Icon path */
  icon: string
  /** Background image path */
  backgroundImage?: string
  /** Player count constraints */
  players: {
    min: number
    max: number
  }
  /** Typical match duration */
  duration?: string
}

/**
 * Result of validating a game action
 */
export interface ActionResult {
  valid: boolean
  error?: string
}

/**
 * Runtime hooks for game lifecycle events
 */
export interface GameRuntimeHooks<GameState, GameAction, DomainEvent> {
  /** Called when match starts */
  onMatchStart?: (matchId: MatchId, players: MatchPlayer[]) => void
  /** Called on each game tick */
  onTick?: (matchId: MatchId, gameState: GameState, deltaMs: number) => void
  /** Called when market price updates (if usesMarketFeed) */
  onMarketTick?: (matchId: MatchId, gameState: GameState, price: number) => void
  /** Called to generate domain events (e.g., coin spawns) */
  generateDomainEvents?: (matchId: MatchId, gameState: GameState, sequence: number) => DomainEvent[]
}

/**
 * Complete game definition contract
 * Games must implement this to integrate with the engine
 */
export interface GameDefinition<
  GameAction = unknown,
  GameState = unknown,
  DomainEvent = unknown,
  RuntimeState = unknown,
> {
  // Metadata
  metadata: GameMetadata
  capabilities: GameCapabilities

  // State factories
  /** Create initial game state for a new match */
  createInitialState: (matchId: MatchId, players: MatchPlayer[]) => GameState
  /** Create runtime state (timers, trackers, etc.) */
  createRuntimeState?: (matchId: MatchId) => RuntimeState

  // Action handling
  /** Validate if an action is legal */
  validateAction: (
    matchId: MatchId,
    gameState: GameState,
    playerId: string,
    action: GameAction
  ) => ActionResult
  /** Apply action to state, return new state */
  applyAction: (
    matchId: MatchId,
    gameState: GameState,
    playerId: string,
    action: GameAction,
    sequence: number
  ) => GameState

  // Outcome resolution
  /** Resolve match outcome at end */
  resolveOutcome: (
    matchId: MatchId,
    gameState: GameState,
    players: MatchPlayer[]
  ) => ResolvedGameOutcome

  // Runtime hooks
  hooks?: GameRuntimeHooks<GameState, GameAction, DomainEvent>
}

/**
 * Resolved game outcome
 */
export interface ResolvedGameOutcome {
  winnerId: string | null
  loserId: string | null
  reason: 'points' | 'knockout' | 'forfeit' | 'time_limit' | 'draw'
  scores: Map<string, number>
  timestamp: number
}

// =============================================================================
// ENGINE ROOM STATE
// =============================================================================

/**
 * Engine-managed room state
 * Generic over game-specific types
 */
export interface EngineRoomState<GameState = unknown, RuntimeState = unknown> {
  matchId: MatchId
  gameSlug: string
  status: MatchStatus
  stateVersion: number
  players: MatchPlayer[]
  gameState: GameState
  runtimeState?: RuntimeState
  createdAt: number
  lastActionSequence: number
}

// =============================================================================
// WAITING PLAYER STATE
// =============================================================================

/**
 * Player waiting for a match
 * Extended with gameSlug for per-game queues
 */
export interface EngineWaitingPlayer {
  socketId: string
  name: string
  gameSlug: string
  gameDuration: number
  sceneWidth: number
  sceneHeight: number
  walletAddress?: string
  joinedAt: number
}

// =============================================================================
// FIND MATCH PAYLOAD (EXTENDED)
// =============================================================================

/**
 * Extended find_match payload with gameSlug
 */
export interface EngineFindMatchPayload {
  playerName: string
  gameSlug: string
  gameDuration: number
  sceneWidth: number
  sceneHeight: number
  walletAddress?: string
}

// =============================================================================
// MARKET FEED SERVICE TYPES
// =============================================================================

/**
 * Market price update
 */
export interface MarketPriceUpdate {
  symbol: string
  price: number
  change: number
  changePercent: number
  timestamp: number
}

/**
 * Market feed subscription callback
 */
export type MarketFeedCallback = (update: MarketPriceUpdate) => void

/**
 * Market feed service interface
 */
export interface MarketFeedService {
  isConnected(): boolean
  connect(symbol: string): void
  disconnect(): void
  subscribe(matchId: MatchId, callback: MarketFeedCallback): void
  unsubscribe(matchId: MatchId): void
  getLatestPrice(): number
  setBroadcastCallback(callback: MarketFeedCallback): void
  reset(): void
}

// =============================================================================
// ACTION LOG TYPES
// =============================================================================

/**
 * Logged game action with metadata
 */
export interface LoggedAction<GameAction = unknown> {
  sequence: number
  playerId: string
  timestamp: number
  action: GameAction
}

/**
 * Action log interface
 */
export interface ActionLog<GameAction = unknown> {
  append(playerId: string, action: GameAction): number
  getActions(): LoggedAction<GameAction>[]
  getActionsSince(sequence: number): LoggedAction<GameAction>[]
  getHash(): string
  getSize(): number
}

// =============================================================================
// ENGINE MATCH STORE FACTORY
// Shared Zustand store factory for game-specific match state
// =============================================================================

import { create, StoreApi, UseBoundStore } from 'zustand'
import type { MatchId, MatchPlayer, MatchStatus } from '@/domains/match/types'
import type { ActionLog, LoggedAction, MarketPriceUpdate } from '../core/types'
import type {
  FindMatchPayload,
  MatchActionPayload,
  SceneReadyPayload,
} from '@/domains/match/events'
import { MATCH_EVENTS } from '@/domains/match/events'

export interface GameSocket {
  disconnect(): void
  emit(event: string, data?: unknown): void
}

// =============================================================================
// BASE MATCH STORE STATE
// =============================================================================

/**
 * Base state shared by all game match stores
 */
export interface EngineMatchStoreBase {
  // Connection state
  socket: GameSocket | null
  isConnected: boolean
  isMatching: boolean
  isPlaying: boolean
  isGameOver: boolean
  isSceneReady: boolean

  // Match state
  matchId: MatchId | null
  gameSlug: string | null
  localPlayerId: string | null
  players: MatchPlayer[]
  matchStatus: MatchStatus

  // Timer state
  gameDuration: number
  gameTimeRemaining: number
  gameStartedAt: number | null

  // Price feed state
  priceData: MarketPriceUpdate | null
  isPriceConnected: boolean
  firstPrice: number | null

  // Audio state
  isSoundMuted: boolean
}

/**
 * Base actions shared by all game match stores
 */
export interface EngineMatchStoreActions {
  // Connection actions
  connect: () => void
  disconnect: () => void

  // Match actions
  findMatch: (playerName: string, walletAddress?: string) => void
  cancelMatchmaking: () => void
  sceneReady: () => void

  // Game actions
  submitAction: (action: unknown) => void
  endGame: () => void

  // State updates
  setGameOver: (data: unknown) => void
  resetGame: () => void

  // Audio
  toggleSound: () => void
}

/**
 * Full match store type
 */
export type EngineMatchStore<State = unknown> = EngineMatchStoreBase &
  EngineMatchStoreActions &
  State

// =============================================================================
// DEFAULT STATE FACTORY
// =============================================================================

/**
 * Create default base state for a match store
 */
export function createBaseMatchState(): EngineMatchStoreBase {
  return {
    // Connection state
    socket: null,
    isConnected: false,
    isMatching: false,
    isPlaying: false,
    isGameOver: false,
    isSceneReady: false,

    // Match state
    matchId: null,
    gameSlug: null,
    localPlayerId: null,
    players: [],
    matchStatus: 'waiting',

    // Timer state
    gameDuration: 60000,
    gameTimeRemaining: 60000,
    gameStartedAt: null,

    // Price feed state
    priceData: null,
    isPriceConnected: false,
    firstPrice: null,

    // Audio state
    isSoundMuted:
      typeof window !== 'undefined'
        ? localStorage.getItem('gameEngine_soundMuted') === 'true'
        : false,
  }
}

// =============================================================================
// STORE FACTORY
// =============================================================================

/**
 * Options for creating a game match store
 */
export interface CreateMatchStoreOptions<GameAction, GameState> {
  /** Game slug for identification */
  gameSlug: string
  /** Default game duration in ms */
  defaultDuration?: number
  /** Initial game-specific state */
  initialState: GameState
  /** Game-specific action handler */
  handleGameAction?: (
    state: GameState,
    playerId: string,
    action: GameAction,
    sequence: number
  ) => Partial<GameState>
  /** Socket event handlers */
  socketHandlers?: SocketEventHandlers<GameAction>
}

/**
 * Socket event handlers for game-specific events
 */
export interface SocketEventHandlers<GameAction> {
  onConnect?: (store: StoreApi<unknown>) => void
  onDisconnect?: (store: StoreApi<unknown>) => void
  onMatchCreated?: (store: StoreApi<unknown>, data: unknown) => void
  onMatchStarted?: (store: StoreApi<unknown>, data: unknown) => void
  onMatchAction?: (store: StoreApi<unknown>, action: GameAction) => void
  onDomainEvent?: (store: StoreApi<unknown>, event: unknown) => void
  onPriceUpdate?: (store: StoreApi<unknown>, data: MarketPriceUpdate) => void
  onGameOver?: (store: StoreApi<unknown>, data: unknown) => void
  onError?: (store: StoreApi<unknown>, error: unknown) => void
}

/**
 * Create a game-specific match store
 */
export function createMatchStore<GameAction, GameState extends object>(
  options: CreateMatchStoreOptions<GameAction, GameState>
): UseBoundStore<StoreApi<EngineMatchStoreBase & EngineMatchStoreActions & GameState>> {
  const { gameSlug, defaultDuration = 60000, initialState } = options

  return create<EngineMatchStoreBase & EngineMatchStoreActions & GameState>((set, get) => ({
    ...createBaseMatchState(),
    ...initialState,
    gameSlug,
    gameDuration: defaultDuration,
    gameTimeRemaining: defaultDuration,

    // Connection actions
    connect: () => {
      // Implementation will be game-specific
      set((state) => ({ ...state, isConnected: true }))
    },

    disconnect: () => {
      const state = get()
      state.socket?.disconnect()
      set((s) => ({
        ...s,
        socket: null,
        isConnected: false,
        isMatching: false,
        isPlaying: false,
      }))
    },

    // Match actions
    findMatch: (playerName: string, walletAddress?: string) => {
      const state = get()
      const sceneWidth =
        (window as { sceneDimensions?: { width: number } }).sceneDimensions?.width ||
        window.innerWidth
      const sceneHeight =
        (window as { sceneDimensions?: { height: number } }).sceneDimensions?.height ||
        window.innerHeight

      const payload: FindMatchPayload = {
        playerName,
        gameSlug,
        gameDuration: state.gameDuration,
        sceneWidth,
        sceneHeight,
        walletAddress,
      }

      state.socket?.emit(MATCH_EVENTS.FIND_MATCH, payload)
      set((s) => ({ ...s, isMatching: true }))
    },

    cancelMatchmaking: () => {
      const state = get()
      state.socket?.emit('leave_waiting_pool')
      set((s) => ({ ...s, isMatching: false }))
    },

    sceneReady: () => {
      const state = get()
      const payload: SceneReadyPayload = {
        matchId: state.matchId,
      }

      state.socket?.emit(MATCH_EVENTS.SCENE_READY, payload)
      set((s) => ({ ...s, isSceneReady: true }))
    },

    // Game actions
    submitAction: (action: unknown) => {
      const state = get()
      if (!state.matchId || !state.isPlaying) return
      const payload: MatchActionPayload = {
        matchId: state.matchId,
        action,
      }
      state.socket?.emit(MATCH_EVENTS.MATCH_ACTION, payload)
    },

    endGame: () => {
      const state = get()
      state.socket?.emit('end_game')
    },

    // State updates
    setGameOver: (data: unknown) => {
      set((s) => ({
        ...s,
        isPlaying: false,
        isGameOver: true,
      }))
    },

    resetGame: () => {
      set({
        ...createBaseMatchState(),
        ...initialState,
        gameSlug,
      } as EngineMatchStoreBase & EngineMatchStoreActions & GameState)
    },

    // Audio
    toggleSound: () => {
      const state = get()
      const newMuted = !state.isSoundMuted
      if (typeof window !== 'undefined') {
        localStorage.setItem('gameEngine_soundMuted', String(newMuted))
      }
      set((s) => ({ ...s, isSoundMuted: newMuted }))
    },
  }))
}

// =============================================================================
// STORE SELECTORS
// =============================================================================

/**
 * Common selectors for match stores
 */
export const matchStoreSelectors = {
  isConnected: (state: EngineMatchStoreBase) => state.isConnected,
  isPlaying: (state: EngineMatchStoreBase) => state.isPlaying,
  isMatching: (state: EngineMatchStoreBase) => state.isMatching,
  isGameOver: (state: EngineMatchStoreBase) => state.isGameOver,
  matchId: (state: EngineMatchStoreBase) => state.matchId,
  gameSlug: (state: EngineMatchStoreBase) => state.gameSlug,
  players: (state: EngineMatchStoreBase) => state.players,
  localPlayerId: (state: EngineMatchStoreBase) => state.localPlayerId,
  priceData: (state: EngineMatchStoreBase) => state.priceData,
  gameTimeRemaining: (state: EngineMatchStoreBase) => state.gameTimeRemaining,
}

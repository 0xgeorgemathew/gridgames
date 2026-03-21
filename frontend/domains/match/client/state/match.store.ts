// =============================================================================
// MATCH CLIENT STORE
// Shared Zustand store for match lifecycle state
// =============================================================================

import { create } from 'zustand'
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
import { initialMatchState, type MatchStore, type MatchState } from './match.types'

/**
 * Create a match store for a specific game
 * This factory allows each game to have its own isolated match state
 */
export function createMatchStore(gameId: string) {
  return create<MatchStore>((set, get) => ({
    ...initialMatchState,

    // =========================================================================
    // LIFECYCLE
    // =========================================================================

    resetMatch: () => {
      console.log(`[${gameId}/MatchStore] Resetting match state`)
      set(initialMatchState)
    },

    // =========================================================================
    // CONNECTION
    // =========================================================================

    setConnected: (connected: boolean) => {
      set({ isConnected: connected })
      if (connected) {
        set({ reconnectAttempts: 0 })
      }
    },

    incrementReconnectAttempts: () => {
      const { reconnectAttempts } = get()
      set({ reconnectAttempts: reconnectAttempts + 1 })
    },

    resetReconnectAttempts: () => {
      set({ reconnectAttempts: 0 })
    },

    // =========================================================================
    // MATCH LIFECYCLE EVENTS
    // =========================================================================

    handleMatchCreated: (payload: {
      matchId: MatchId
      players: MatchPlayer[]
      gameDuration: number
    }) => {
      console.log(`[${gameId}/MatchStore] Match created:`, payload.matchId)

      set({
        matchId: payload.matchId,
        status: 'ready',
        stateVersion: 1,
        players: payload.players,
        gameDuration: payload.gameDuration,
        startedAt: null,
        endedAt: null,
        outcome: null,
        artifact: null,
        lastActionSequence: -1,
        pendingActions: [],
      })
    },

    handleMatchUpdated: (payload: {
      matchId: MatchId
      status: MatchStatus
      stateVersion: number
      players: MatchPlayer[]
    }) => {
      const { matchId } = get()

      // Ignore updates for different matches
      if (matchId && matchId !== payload.matchId) return

      console.log(
        `[${gameId}/MatchStore] Match updated: status=${payload.status} v${payload.stateVersion}`
      )

      set({
        status: payload.status,
        stateVersion: payload.stateVersion,
        players: payload.players,
      })
    },

    handleMatchStarted: (payload: {
      matchId: MatchId
      gameDuration: number
      startedAt: number
    }) => {
      const { matchId } = get()

      // Ignore for different matches
      if (matchId && matchId !== payload.matchId) return

      console.log(`[${gameId}/MatchStore] Match started at ${payload.startedAt}`)

      set({
        status: 'in_progress',
        startedAt: payload.startedAt,
        gameDuration: payload.gameDuration,
        stateVersion: get().stateVersion + 1,
      })
    },

    handleMatchActionApplied: (payload: {
      matchId: MatchId
      playerId: string
      sequence: number
      stateVersion: number
      action: unknown
    }) => {
      const { matchId, lastActionSequence } = get()

      // Ignore for different matches
      if (matchId && matchId !== payload.matchId) return

      // Only process if this is a new action
      if (payload.sequence <= lastActionSequence) return

      console.log(
        `[${gameId}/MatchStore] Action applied: seq=${payload.sequence} v${payload.stateVersion}`
      )

      const newAction: AuthoritativeAction = {
        matchId: payload.matchId,
        playerId: payload.playerId,
        sequence: payload.sequence,
        timestamp: Date.now(),
        action: payload.action,
      }

      set({
        lastActionSequence: payload.sequence,
        stateVersion: payload.stateVersion,
        pendingActions: [...get().pendingActions, newAction].slice(-10), // Keep last 10
      })
    },

    handleMatchResultReady: (payload: {
      matchId: MatchId
      outcome: ResolvedMatchOutcome
      artifact: ResultArtifact
    }) => {
      const { matchId } = get()

      // Ignore for different matches
      if (matchId && matchId !== payload.matchId) return

      console.log(`[${gameId}/MatchStore] Match result ready:`, {
        winner: payload.outcome.winnerId,
        reason: payload.outcome.reason,
        amount: payload.outcome.winnerAmount,
      })

      set({
        status: 'result_ready',
        outcome: payload.outcome,
        artifact: payload.artifact,
        endedAt: payload.outcome.timestamp,
        stateVersion: get().stateVersion + 1,
      })
    },

    handleMatchAborted: (payload: {
      matchId: MatchId
      reason: 'player_disconnect' | 'timeout' | 'error'
      affectedPlayerId?: string
    }) => {
      const { matchId } = get()

      // Ignore for different matches
      if (matchId && matchId !== payload.matchId) return

      console.log(`[${gameId}/MatchStore] Match aborted:`, payload.reason)

      set({
        status: 'aborted',
        endedAt: Date.now(),
        stateVersion: get().stateVersion + 1,
      })
    },

    // =========================================================================
    // PLAYER STATE
    // =========================================================================

    setLocalPlayerId: (playerId: string) => {
      set({ localPlayerId: playerId })
    },

    updatePlayerReadyState: (playerId: string, readyState: ReadyState) => {
      const { players } = get()
      const updatedPlayers = players.map((p) =>
        p.id === playerId ? { ...p, readyState } : p
      )
      set({ players: updatedPlayers })
    },

    updatePlayerFundingState: (playerId: string, fundingState: FundingState) => {
      const { players } = get()
      const updatedPlayers = players.map((p) =>
        p.id === playerId ? { ...p, fundingState } : p
      )
      set({ players: updatedPlayers })
    },
  }))
}

/**
 * Type for the match store hook
 */
export type UseMatchStore = ReturnType<typeof createMatchStore>

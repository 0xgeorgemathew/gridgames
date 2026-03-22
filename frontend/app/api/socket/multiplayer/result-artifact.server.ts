// =============================================================================
// RESULT ARTIFACT BUILDER
// Creates verifiable match result artifacts for settlement
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

import type { ResolvedMatchOutcome, ResultArtifact, MatchId } from '@/domains/match/types'
import type { MatchActionLog } from './match-log.server'
import type { ServerMatchState } from './match-state.server'

/**
 * Build a result artifact from match state and action log
 */
export function buildResultArtifact<GameAction>(
  matchState: ServerMatchState,
  actionLog: MatchActionLog<GameAction>,
  outcome: ResolvedMatchOutcome
): ResultArtifact {
  const players = Array.from(matchState.players.values()).map((player) => ({
    id: player.id,
    name: player.name,
    walletAddress: player.walletAddress,
    stake: outcome.stakeAmount,
    result:
      player.id === outcome.winnerId
        ? ('win' as const)
        : player.id === outcome.loserId
          ? ('loss' as const)
          : ('draw' as const),
  }))

  const artifact: ResultArtifact = {
    matchId: outcome.matchId,
    outcome,
    players,
    actionLogHash: actionLog.getLogHash(),
    startedAt: matchState.createdAt,
    endedAt: matchState.updatedAt,
    stateVersion: matchState.stateVersion,
  }

  console.log(`[ResultArtifact] Built artifact for match ${outcome.matchId}:`, {
    winner: outcome.winnerId,
    reason: outcome.reason,
    stakeAmount: outcome.stakeAmount,
    actionCount: actionLog.getLength(),
    actionLogHash: artifact.actionLogHash.slice(0, 8) + '...',
  })

  return artifact
}

/**
 * Resolve match outcome from game state
 * This is a generic resolver - game-specific reducers provide the actual logic
 */
export function resolveMatchOutcome(
  matchId: MatchId,
  winnerId: string | null,
  loserId: string | null,
  reason: ResolvedMatchOutcome['reason'],
  stakeAmount: number
): ResolvedMatchOutcome {
  const outcome: ResolvedMatchOutcome = {
    matchId,
    winnerId,
    loserId,
    reason,
    stakeAmount,
    winnerAmount: winnerId ? stakeAmount * 2 : 0, // Winner takes both stakes
    timestamp: Date.now(),
  }

  console.log(`[ResultArtifact] Resolved outcome for match ${matchId}:`, {
    winner: winnerId,
    loser: loserId,
    reason,
    winnerAmount: outcome.winnerAmount,
  })

  return outcome
}

/**
 * Validate a result artifact
 */
export function validateResultArtifact(artifact: ResultArtifact): boolean {
  // Check required fields
  if (!artifact.matchId || !artifact.outcome || !artifact.players) {
    console.error('[ResultArtifact] Missing required fields')
    return false
  }

  // Check player count
  if (artifact.players.length !== 2) {
    console.error('[ResultArtifact] Expected 2 players, got', artifact.players.length)
    return false
  }

  // Check zero-sum invariant
  const winnerAmount = artifact.outcome.winnerAmount
  const totalStakes = artifact.players.reduce((sum, p) => sum + p.stake, 0)
  if (winnerAmount !== totalStakes && artifact.outcome.winnerId !== null) {
    console.error('[ResultArtifact] Zero-sum invariant violated:', { winnerAmount, totalStakes })
    return false
  }

  return true
}

// =============================================================================
// RESULT ARTIFACT STORE
// Persists ResultArtifact and ResolvedMatchOutcome for matches
// =============================================================================

import type { MatchId, ResultArtifact, ResolvedMatchOutcome } from '@/domains/match/types'

/**
 * Stored match result
 */
export interface StoredMatchResult {
  matchId: MatchId
  outcome: ResolvedMatchOutcome
  artifact: ResultArtifact
  storedAt: number
  settlementStatus: 'pending' | 'processing' | 'settled' | 'failed'
  settlementTxHash?: string
  settlementError?: string
}

/**
 * In-memory result store
 * In production, this would be a database
 */
const resultStore = new Map<MatchId, StoredMatchResult>()

/**
 * Store a result artifact
 */
export function storeMatchResult(artifact: ResultArtifact): void {
  const storedResult: StoredMatchResult = {
    matchId: artifact.matchId,
    outcome: artifact.outcome,
    artifact,
    storedAt: Date.now(),
    settlementStatus: 'pending',
  }

  resultStore.set(artifact.matchId, storedResult)

  console.log(`[ResultStore] Stored result for match ${artifact.matchId}:`, {
    winner: artifact.outcome.winnerId,
    reason: artifact.outcome.reason,
    winnerAmount: artifact.outcome.winnerAmount,
    actionLogHash: artifact.actionLogHash.slice(0, 8) + '...',
  })
}

/**
 * Get a stored result
 */
export function getMatchResult(matchId: MatchId): StoredMatchResult | undefined {
  return resultStore.get(matchId)
}

/**
 * Get just the outcome
 */
export function getMatchOutcome(matchId: MatchId): ResolvedMatchOutcome | undefined {
  return resultStore.get(matchId)?.outcome
}

/**
 * Get just the artifact
 */
export function getMatchArtifact(matchId: MatchId): ResultArtifact | undefined {
  return resultStore.get(matchId)?.artifact
}

/**
 * Update settlement status
 */
export function updateSettlementStatus(
  matchId: MatchId,
  status: StoredMatchResult['settlementStatus'],
  txHash?: string,
  error?: string
): void {
  const result = resultStore.get(matchId)
  if (!result) {
    console.warn(`[ResultStore] Cannot update status: match ${matchId} not found`)
    return
  }

  result.settlementStatus = status
  if (txHash) result.settlementTxHash = txHash
  if (error) result.settlementError = error

  console.log(`[ResultStore] Updated settlement status for ${matchId}: ${status}`)
}

/**
 * Get all pending settlements
 */
export function getPendingSettlements(): StoredMatchResult[] {
  return Array.from(resultStore.values()).filter((r) => r.settlementStatus === 'pending')
}

/**
 * Get recent results (for history/leaderboard)
 */
export function getRecentResults(limit: number = 10): StoredMatchResult[] {
  return Array.from(resultStore.values())
    .sort((a, b) => b.storedAt - a.storedAt)
    .slice(0, limit)
}

/**
 * Check if a result exists for a match
 */
export function hasMatchResult(matchId: MatchId): boolean {
  return resultStore.has(matchId)
}

/**
 * Delete a result (for cleanup)
 */
export function deleteMatchResult(matchId: MatchId): boolean {
  return resultStore.delete(matchId)
}

/**
 * Clear all results (for testing)
 */
export function clearAllResults(): void {
  resultStore.clear()
}

/**
 * Get result statistics
 */
export function getResultStats(): {
  totalResults: number
  pendingSettlements: number
  settledCount: number
  failedCount: number
} {
  const results = Array.from(resultStore.values())
  return {
    totalResults: results.length,
    pendingSettlements: results.filter((r) => r.settlementStatus === 'pending').length,
    settledCount: results.filter((r) => r.settlementStatus === 'settled').length,
    failedCount: results.filter((r) => r.settlementStatus === 'failed').length,
  }
}

// =============================================================================
// SETTLEMENT HANDOFF
// Temporary bridge interface for settlement
// =============================================================================

import type { ResultArtifact, SettlementHandoffState, MatchId } from '@/domains/match/types'

/**
 * Settlement handoff status
 */
export interface SettlementHandoffResult {
  matchId: MatchId
  state: SettlementHandoffState
  error?: string
  timestamp: number
}

/**
 * In-memory store for settlement status
 * In production, this would be a database
 */
const settlementStore = new Map<MatchId, SettlementHandoffResult>()

/**
 * Temporary settlement handoff implementation
 * Currently returns 'noop' or 'recorded' for testing
 */
export async function initiateSettlementHandoff(artifact: ResultArtifact): Promise<SettlementHandoffResult> {
  const matchId = artifact.matchId

  console.log(`[SettlementHandoff] Initiating handoff for match ${matchId}`)

  // Check if already processed
  const existing = settlementStore.get(matchId)
  if (existing) {
    console.log(`[SettlementHandoff] Match ${matchId} already processed:`, existing.state)
    return existing
  }

  // Create pending result
  const result: SettlementHandoffResult = {
    matchId,
    state: 'pending',
    timestamp: Date.now(),
  }

  settlementStore.set(matchId, result)

  try {
    // TODO: In production, this would:
    // 1. Verify the result artifact signature
    // 2. Submit to blockchain/settlement layer
    // 3. Wait for confirmation

    // For now, just record it
    result.state = 'recorded'
    result.timestamp = Date.now()

    console.log(`[SettlementHandoff] Match ${matchId} recorded successfully`)
    return result
  } catch (error) {
    result.state = 'failed'
    result.error = error instanceof Error ? error.message : 'Unknown error'
    result.timestamp = Date.now()

    console.error(`[SettlementHandoff] Match ${matchId} failed:`, result.error)
    return result
  }
}

/**
 * Get settlement status for a match
 */
export function getSettlementStatus(matchId: MatchId): SettlementHandoffResult | undefined {
  return settlementStore.get(matchId)
}

/**
 * Check if settlement is complete
 */
export function isSettlementComplete(matchId: MatchId): boolean {
  const status = settlementStore.get(matchId)
  return status?.state === 'recorded' || status?.state === 'noop'
}

/**
 * Store result artifact for persistence
 * In production, this would save to a database
 */
const resultArtifactStore = new Map<MatchId, ResultArtifact>()

export function storeResultArtifact(artifact: ResultArtifact): void {
  resultArtifactStore.set(artifact.matchId, artifact)
  console.log(`[SettlementHandoff] Stored result artifact for match ${artifact.matchId}`)
}

export function getResultArtifact(matchId: MatchId): ResultArtifact | undefined {
  return resultArtifactStore.get(matchId)
}

/**
 * Clear stores (for testing)
 */
export function clearSettlementStores(): void {
  settlementStore.clear()
  resultArtifactStore.clear()
}

// =============================================================================
// FUNDING READINESS BRIDGE
// Temporary funding status resolver for pre-match checks
// =============================================================================

import type { MatchId, FundingState } from '@/domains/match/types'

/**
 * Funding check result
 */
export interface FundingCheckResult {
  playerId: string
  state: FundingState
  reason?: string
  checkedAt: number
}

/**
 * In-memory funding state store
 * In production, this would check actual wallet balances
 */
const fundingStateStore = new Map<string, FundingState>()

/**
 * Check funding readiness for a player
 * Currently returns 'ready' for all players (placeholder for actual implementation)
 *
 * TODO: In production, this should:
 * 1. Check wallet balance >= STAKE_AMOUNT
 * 2. Verify allowance if needed
 * 3. Return actual funding state
 */
export async function checkFundingReadiness(
  playerId: string,
  walletAddress: string | undefined,
  stakeAmount: number
): Promise<FundingCheckResult> {
  const checkedAt = Date.now()

  // If no wallet address, skip funding check (guest player)
  if (!walletAddress) {
    console.log(`[FundingBridge] Player ${playerId} has no wallet, assuming ready`)
    return {
      playerId,
      state: 'ready',
      reason: 'no_wallet_guest',
      checkedAt,
    }
  }

  // Check cached state first
  const cachedState = fundingStateStore.get(playerId)
  if (cachedState) {
    return {
      playerId,
      state: cachedState,
      checkedAt,
    }
  }

  // TODO: In production, check actual on-chain balance
  // For now, assume funded
  const state: FundingState = 'ready'

  // Cache the result
  fundingStateStore.set(playerId, state)

  console.log(
    `[FundingBridge] Player ${playerId} funding check: ${state} (wallet: ${walletAddress.slice(0, 8)}...)`
  )

  return {
    playerId,
    state,
    checkedAt,
  }
}

/**
 * Update funding state for a player
 */
export function setFundingState(playerId: string, state: FundingState): void {
  fundingStateStore.set(playerId, state)
  console.log(`[FundingBridge] Updated funding state for ${playerId}: ${state}`)
}

/**
 * Get cached funding state for a player
 */
export function getFundingState(playerId: string): FundingState | undefined {
  return fundingStateStore.get(playerId)
}

/**
 * Clear funding state for a player (after match ends)
 */
export function clearFundingState(playerId: string): void {
  fundingStateStore.delete(playerId)
}

/**
 * Check if all players in a match are funded
 */
export async function checkAllPlayersFunded(
  matchId: MatchId,
  players: Array<{ id: string; walletAddress?: string }>,
  stakeAmount: number
): Promise<boolean> {
  console.log(`[FundingBridge] Checking funding for all players in match ${matchId}`)

  for (const player of players) {
    const result = await checkFundingReadiness(player.id, player.walletAddress, stakeAmount)
    if (result.state !== 'ready') {
      console.log(`[FundingBridge] Player ${player.id} not funded: ${result.state}`)
      return false
    }
  }

  console.log(`[FundingBridge] All players in match ${matchId} are funded`)
  return true
}

/**
 * Clear all funding states (for testing)
 */
export function clearAllFundingStates(): void {
  fundingStateStore.clear()
}

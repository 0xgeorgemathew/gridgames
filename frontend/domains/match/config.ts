// =============================================================================
// MATCH DOMAIN CONFIG
// Shared configuration for match lifecycle
// =============================================================================

/**
 * Stake amount for zero-sum winner-takes-all matches
 * Both players stake this amount, winner takes all ($20 total pot)
 */
export const STAKE_AMOUNT = 10

/**
 * Number of players per match (1v1)
 */
export const PLAYER_COUNT = 2

/**
 * Timeout for player ready confirmation
 */
export const READY_TIMEOUT_MS = 10000

/**
 * Delay before deleting room after match ends
 */
export const ROOM_DELETION_DELAY_MS = 1000

/**
 * Stale player timeout for cleanup
 */
export const STALE_PLAYER_TIMEOUT_MS = 30000

/**
 * Interval for cleanup checks
 */
export const CLEANUP_INTERVAL_MS = 30000

/**
 * Assert match configuration invariants at runtime
 */
export function assertMatchConfigInvariants(): void {
  console.assert(STAKE_AMOUNT === 10, 'STAKE_AMOUNT must be $10')
  console.assert(PLAYER_COUNT === 2, 'PLAYER_COUNT must be 2 for 1v1 matches')
}

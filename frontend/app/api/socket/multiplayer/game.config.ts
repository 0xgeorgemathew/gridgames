// =============================================================================
// SERVER GAME CONFIGURATION
// Shared config + server-specific settings
// =============================================================================

import {
  STAKE_AMOUNT,
  PLAYER_COUNT,
  READY_TIMEOUT_MS,
  ROOM_DELETION_DELAY_MS,
  STALE_PLAYER_TIMEOUT_MS,
} from '@/domains/match/config'

export const SERVER_GAME_CONFIG = {
  // Match config from shared domain
  STAKE_AMOUNT,
  PLAYER_COUNT,

  // =============================================================================
  // LEGACY TRADING CONFIG (deprecated - will be removed in Phase 6)
  // Kept for backward compatibility during migration
  // =============================================================================
  /** @deprecated Use STAKE_AMOUNT instead */
  STARTING_BALANCE: 10,
  /** @deprecated Not used in zero-sum matches */
  POSITION_COLLATERAL: 10,
  /** @deprecated Not used in zero-sum matches */
  FIXED_LEVERAGE: 500,
  /** @deprecated Not used in zero-sum matches */
  MAX_POSITIONS: 10,
  /** @deprecated Not used in zero-sum matches */
  LIQUIDATION_THRESHOLD: 0.8,

  // Hyper Swiper coin spawning (game-specific)
  COIN_TTL_MS: 5000,
  MAX_ACTIVE_COINS: 4,
  COIN_SPAWN_INTERVALS_MS: [1200, 1200, 1200, 1200, 1200],

  // Match lifecycle timeouts
  CLIENT_READY_TIMEOUT_MS: READY_TIMEOUT_MS,
  STALE_PLAYER_TIMEOUT_MS,
  ROOM_DELETION_DELAY_MS,
  CLEANUP_INTERVAL_MS: 30000,

  // Price feed (for visual only, not for outcome)
  PRICE_BROADCAST_THROTTLE_MS: 100,
  PRICE_RECONNECT_DELAY_MS: 5000,
  PRICE_RESET_INTERVAL_MS: 60000,

  // Scene dimensions
  DEFAULT_SCENE_WIDTH: 500,
  DEFAULT_SCENE_HEIGHT: 800,
} as const

// Runtime invariant check
if (typeof window !== 'undefined') {
  console.assert(SERVER_GAME_CONFIG.PLAYER_COUNT === 2, 'PLAYER_COUNT must be 2')
  console.assert(SERVER_GAME_CONFIG.STAKE_AMOUNT === 1, 'STAKE_AMOUNT must be $1')
}

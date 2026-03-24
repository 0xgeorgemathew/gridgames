// =============================================================================
// TAP DANCER CLIENT GAME CONFIGURATION
// Gameplay + UI constants
// =============================================================================

import { STAKE_AMOUNT } from '@/domains/match/config'

export const CLIENT_GAME_CONFIG = {
  SLUG: 'tap-dancer',

  // Match config
  STAKE_AMOUNT,

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

  // Game duration options
  DURATION_OPTIONS_MS: [60000, 120000, 180000],

  // Connection
  MAX_RECONNECT_ATTEMPTS: 10,
  RECONNECT_DELAY_MS: 1000,

  // Scene dimensions
  SCENE_WIDTH: 500,
  SCENE_HEIGHT: 800,
} as const

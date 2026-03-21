// =============================================================================
// TAP DANCER SHARED GAME CONFIG TYPES
// Gameplay configuration shared between client and server
// =============================================================================

import { STAKE_AMOUNT } from '@/domains/match/config'

/**
 * Shared game configuration for Tap Dancer
 * Uses match domain constants for stake amount
 */
export interface SharedGameConfig {
  STAKE_AMOUNT: typeof STAKE_AMOUNT // $10 from match domain
  // Note: No MAX_ACTIVE_COINS - Tap Dancer has no coins
}

// =============================================================================
// HYPER SWIPER SHARED GAME CONFIG TYPES
// Gameplay configuration shared between client and server
// =============================================================================

import { STAKE_AMOUNT } from '@/domains/match/config'

/**
 * Shared game configuration for Hyper Swiper
 * Uses match domain constants for stake amount
 */
export interface SharedGameConfig {
  STAKE_AMOUNT: typeof STAKE_AMOUNT // $10 from match domain
  MAX_ACTIVE_COINS: number // Max coins spawned at once
}

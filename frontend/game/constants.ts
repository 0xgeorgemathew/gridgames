// Game economy constants (centralized, no Phaser imports for server-side compatibility)
export const GAME_CONFIG = {
  STARTING_CASH: 10,
  GAME_DURATION_MS: 120000, // 2 minutes
  ORDER_SETTLEMENT_DURATION_MS: 5000,
} as const

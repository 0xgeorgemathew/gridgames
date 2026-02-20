// Game economy constants (centralized, no Phaser imports for server-side compatibility)
export const GAME_CONFIG = {
  STARTING_CASH: 10, // $10 starting balance
  GAME_DURATION_MS: 150000, // 2.5 minutes
  POSITION_COLLATERAL: 1, // $1 per position
  MAX_POSITIONS: 10, // Max positions per player (limited by $10 balance)
  LIQUIDATION_HEALTH_RATIO: 0.80, // 80% threshold - positions liquidated when health ratio <= 80%
} as const
